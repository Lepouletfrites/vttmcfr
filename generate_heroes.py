#!/usr/bin/env python3
"""
Remplit automatiquement les héros de gamedata.js (MARVEL_DB.heroes) à partir de cards.js.

Usage :
    python generate_heroes.py --check    # compare l'auto-génération à VOS héros déjà remplis
    python generate_heroes.py            # aperçu, ne modifie rien
    python generate_heroes.py --write    # écrit dans gamedata.js (sauvegarde gamedata.js.bak)

Pour chaque héros :
  hero_code           code de la carte héros (sans lui, le jeu n'applique rien de ce qui suit
                      quand on charge un deck MarvelCDB ou un deck créé dans l'appli)
  start_on_board      « Setup: Put X into play » (griffes de Wolverine, formes de Spectrum…)
                      + les petits sets propres au héros (ex. Engelures d'Iceberg)
  start_set_aside     « Setup: Set X aside » (Lueur Mortelle de Valkyrie, Contact de Malicia…)
  start_in_hand       « Setup: Search your deck for X and add it to your hand » (bouclier de Cap…)
  secondary_set_code  deck à part du héros (Invocations de Strange, Sens de Daredevil, Météo de Tornade…)
Les champs déjà présents ne sont JAMAIS modifiés ; seuls les manquants sont ajoutés.
Les héros absents de gamedata.js sont ajoutés à la fin. Les cas non compris → // TODO.
"""

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

from generate_villains import (GAMEDATA, base_codes, find_array, load_cards, norm, strip_html,
                               top_level_objects)

EXCLUDED_SUFFIXES = ("_nemesis", "_leader", "_modular", "_villain")
FIELD_ORDER = ["id", "name", "hero_code", "secondary_set_code", "secondary_deck",
               "start_on_board", "start_set_aside", "start_in_hand", "deck"]


def flat(s):
    """Clé de comparaison très tolérante : « X-23 » = « x23 », « SP//dr » = « spdr »."""
    return re.sub(r"[^a-z0-9]", "", norm(s))


# ------------------------------------------------------------------ lecture d'un objet JS simple
def parse_simple_object(text):
    """Lit { cle: "texte", cle: ["a", "b"], cle: true } ; None si autre chose (on n'y touche pas)."""
    body = text.strip()[1:-1]
    out, i, n = {}, 0, len(body)
    while i < n:
        m = re.compile(r"\s*,?\s*(//[^\n]*\n\s*)*").match(body, i)
        i = m.end()
        if i >= n:
            break
        m = re.compile(r"([A-Za-z_]\w*)\s*:\s*").match(body, i)
        if not m:
            return None
        key, i = m.group(1), m.end()
        if body[i] in "\"'":
            q = body[i]
            m = re.compile(q + r"((?:[^" + q + r"\\]|\\.)*)" + q).match(body, i)
            out[key], i = m.group(1), m.end()
        elif body[i] == "[":
            j = body.index("]", i)
            inner = body[i + 1:j]
            if re.search(r"[{\[]", inner):
                return None
            items = re.findall(r"\"([^\"]*)\"|'([^']*)'", inner)
            out[key] = [a or b for a, b in items]
            # Sécurité : on refuse de réécrire un tableau qu'on n'aurait pas lu entièrement
            if len(out[key]) != len([x for x in inner.split(",") if x.strip()]):
                return None
            i = j + 1
        else:
            m = re.compile(r"(true|false|-?\d+)").match(body, i)
            if not m:
                return None
            out[key] = json.loads(m.group(1))
            i = m.end()
    return out


def render_hero(h, todos):
    ind = " " * 12
    lines = [f"{ind}// TODO: {t}" for t in todos]
    keys = [k for k in FIELD_ORDER if k in h] + [k for k in h if k not in FIELD_ORDER]
    for k in keys:
        v = h[k]
        if isinstance(v, list):
            val = "[" + ", ".join(json.dumps(x, ensure_ascii=False) for x in v) + "]"
        else:
            val = json.dumps(v, ensure_ascii=False)
        lines.append(f"{ind}{k}: {val}")
    body = [l for l in lines if l.lstrip().startswith("//")]
    fields = [l for l in lines if not l.lstrip().startswith("//")]
    return "{\n" + "\n".join(body + [",\n".join(fields)]) + "\n        }"


# ------------------------------------------------------------------ génération
class HeroGen:
    def __init__(self, cards):
        self.cards = cards
        self.by_set = {}
        for c in cards:
            if c.get("card_set_code"):
                self.by_set.setdefault(c["card_set_code"], []).append(c)
        seen, self.heroes = set(), []
        for c in cards:
            if c["type_code"] == "hero" and c.get("card_set_code") not in seen and not c.get("duplicate_of_code"):
                seen.add(c.get("card_set_code"))
                self.heroes.append(c)

    def keys_for(self, hero):
        alt = hero.get("linked_card") or {}
        return {flat(x) for x in (hero.get("real_name"), hero.get("name"), alt.get("real_name"),
                                  alt.get("name"), hero.get("card_set_code")) if x}

    def match(self, entry):
        """Trouve la carte héros d'une entrée gamedata (par hero_code, puis par id / nom)."""
        code = entry.get("hero_code")
        if code:
            base = code.rstrip("abc")
            for h in self.heroes:
                if h["code"].rstrip("abc") == base:
                    return h
        wanted = {flat(entry.get("id", "")), flat(entry.get("name", ""))}
        wanted |= {flat(p) for p in re.findall(r"\(([^)]+)\)", entry.get("name", ""))}
        wanted |= {flat(re.sub(r"\(.*?\)", "", entry.get("name", "")))}
        wanted.discard("")
        hits = [h for h in self.heroes if self.keys_for(h) & wanted]
        if not hits:
            # « shehulk_core » commence par « shehulk » : on garde la correspondance la plus longue
            scored = [(max((len(k) for k in self.keys_for(h) if len(k) > 3 and any(w.startswith(k) for w in wanted)), default=0), h)
                      for h in self.heroes]
            best = max((s for s, _ in scored), default=0)
            hits = [h for s, h in scored if s and s == best]
        hits.sort(key=lambda h: h["code"])
        return hits[0] if hits else None

    def find_in_set(self, name, set_cards):
        n = flat(name)
        hits = [c for c in set_cards if flat(c.get("real_name")) == n or flat(c.get("name")) == n]
        if not hits:  # « Wolverine's Claws » → « Claws »
            hits = [c for c in set_cards if n.endswith(flat(c.get("real_name"))) and len(flat(c.get("real_name"))) > 3]
        return base_codes(hits)[0] if hits else None

    def generate(self, hero):
        set_code = hero["card_set_code"]
        prefix = hero["code"][:2]
        hero_set = self.by_set.get(set_code, [])
        alt = hero.get("linked_card") or {}
        g, todos = {"hero_code": hero["code"]}, []

        # --- sets propres au héros (même boîte) : deck à part ou cartes posées d'office
        own_sets = sorted(s for s, cs in self.by_set.items()
                          if s != set_code and s.startswith(set_code.split("_")[0])
                          and not s.endswith(EXCLUDED_SUFFIXES)
                          and all(c["code"][:2] == prefix for c in cs))
        decks = [s for s in own_sets if s.endswith("_deck")]
        if decks:
            g["secondary_set_code"] = decks[0]
            if len(decks) > 1:
                todos.append(f"plusieurs decks à part ({', '.join(decks)}) : un seul est géré ({decks[0]})")
        on_board = []
        for s in own_sets:
            if s in decks:
                continue
            for c in self.by_set[s]:
                if c["code"] in base_codes(self.by_set[s]):
                    on_board += [c["code"]] * (c.get("quantity") or 1)

        # --- texte « Setup »
        aside, in_hand = [], []
        for face in (hero, alt):
            txt = strip_html(face.get("real_text"))
            m = re.search(r"Setup\s*(?:—|-|:)?\s*:?\s*(.+?)(?:\n|$)", txt)
            if not m:
                continue
            setup = m.group(1).strip()
            handled = False
            for frag in re.findall(r"Put (?:your |the )?(?:all \d+ |\d+ )?(.+?) into play", setup, re.I):
                frag = re.sub(r"\b(?:upgrades?|supports?)\b", "", frag, flags=re.I).strip(" ,")
                code = self.find_in_set(frag, hero_set)
                if code:
                    on_board.append(code)
                    handled = True
                else:
                    perm = [c for c in hero_set if c.get("permanent")]
                    if perm:
                        for c in perm:
                            if c["code"] in base_codes(perm):
                                on_board += [c["code"]] * (c.get("quantity") or 1)
                        handled = True
                    elif re.search(r"from the \[\[\w+\]\] deck|from the \w+ deck", setup, re.I):
                        todos.append(f"mise en place au choix : « {setup} » (à faire en jeu depuis le deck à part)")
                        handled = True
            for frag in re.findall(r"Set (?:your |the )?(.+?) aside", setup, re.I):
                frag = re.sub(r"\b(?:upgrades?|supports?)\b", "", frag, flags=re.I).strip(" ,")
                code = self.find_in_set(frag, hero_set)
                if code:
                    aside.append(code)
                    handled = True
            m2 = re.search(r"for (?:a copy of |the )?(.+?) (?:upgrade )?and add it to your hand", setup, re.I)
            if m2 and "[[" not in (face.get("real_text") or "").split("Setup")[-1].split("hand")[0]:
                frag = re.sub(r"\b(?:upgrades?|supports?)\b", "", m2.group(1), flags=re.I).strip(" ,")
                code = self.find_in_set(frag, hero_set)
                if code:
                    in_hand.append(code)
                    handled = True
            if not handled:
                todos.append(f"mise en place non automatisée : « {setup} »")
            if re.search(r"counters?|faceup|Discard", setup) and handled:
                todos.append(f"détail de mise en place à faire en jeu : « {setup} »")

        if on_board:
            g["start_on_board"] = on_board
        if aside:
            g["start_set_aside"] = aside
        if in_hand:
            g["start_in_hand"] = in_hand
        return g, todos


# ------------------------------------------------------------------ commandes
def main():
    ap = argparse.ArgumentParser(description="Remplit les héros de gamedata.js depuis cards.js")
    ap.add_argument("--check", action="store_true", help="compare avec vos héros déjà remplis")
    ap.add_argument("--write", action="store_true", help="écrit dans gamedata.js")
    args = ap.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    gen = HeroGen(load_cards())
    text = GAMEDATA.read_text(encoding="utf-8")
    hs, he = find_array(text, "heroes")
    spans = top_level_objects(text, hs, he)

    if args.check:
        ok = total = 0
        for a, b in spans:
            e = parse_simple_object(text[a:b]) or {}
            hero = gen.match(e)
            if not hero:
                print(f"  ? {e.get('id')} : héros introuvable dans cards.js")
                continue
            g, _ = gen.generate(hero)
            for k in ("hero_code", "start_on_board", "secondary_set_code"):
                if not e.get(k):
                    continue
                total += 1
                same = (e[k] == g.get(k)) if k != "hero_code" else e[k].rstrip("abc") == g[k].rstrip("abc")
                ok += same
                print(f"  {'✔' if same else '✘'} {e['id']}.{k}: vous={e[k]} auto={g.get(k)}")
            if e.get("secondary_deck"):
                total += 1
                auto = sorted(c["code"] for c in gen.by_set.get(g.get("secondary_set_code", ""), []))
                same = sorted(e["secondary_deck"]) == auto
                ok += same
                print(f"  {'✔' if same else '✘'} {e['id']}.secondary_deck ≈ secondary_set_code {g.get('secondary_set_code')}")
        print(f"\nIdentiques : {ok}/{total}")
        return

    replacements, report, used = [], [], set()
    for a, b in spans:
        raw = text[a:b]
        e = parse_simple_object(raw)
        if e is None:
            report.append(f"  · {raw[:40]!r}… : format non reconnu, laissé tel quel")
            continue
        hero = gen.match(e)
        if not hero:
            report.append(f"  ✘ {e.get('id')} : héros introuvable dans cards.js")
            continue
        used.add(hero["card_set_code"])
        g, todos = gen.generate(hero)
        added = []
        new = dict(e)
        if not new.get("hero_code"):
            new["hero_code"] = g["hero_code"]
            added.append("hero_code")
        elif new["hero_code"].rstrip("abc") != g["hero_code"].rstrip("abc"):
            todos = [f"hero_code corrigé ({new['hero_code']} n'est pas une carte héros) : vérifier aussi « deck »"] + todos
            new["hero_code"] = g["hero_code"]
            added.append("hero_code corrigé")
        if not new.get("secondary_deck") and not new.get("secondary_set_code") and g.get("secondary_set_code"):
            new["secondary_set_code"] = g["secondary_set_code"]
            added.append("deck à part")
        for k in ("start_on_board", "start_set_aside", "start_in_hand"):
            if k not in new and g.get(k):
                new[k] = g[k]
                added.append(k)
        if added or todos:
            replacements.append((a, b, render_hero(new, todos)))
        report.append(f"  {'⚠' if todos else '✔'} {e['id']}" + (f" : + {', '.join(added)}" if added else " : déjà complet")
                      + (f" ({len(todos)} TODO)" if todos else ""))

    new_heroes = []
    taken = set()
    for a, b in spans:
        e = parse_simple_object(text[a:b]) or {}
        taken.add(e.get("id"))
    for hero in gen.heroes:
        if hero["card_set_code"] in used:
            continue
        g, todos = gen.generate(hero)
        hid = re.sub(r"[^a-z0-9]+", "_", norm(hero["real_name"])).strip("_") or hero["card_set_code"]
        if hid in taken:
            hid = hero["card_set_code"]
        taken.add(hid)
        entry = {"id": hid, "name": f'{hero["name"]} ({hero.get("pack_name")})', **g, "deck": []}
        new_heroes.append(render_hero(entry, ["héros ajouté automatiquement"] + todos))
        report.append(f"  + {hid} ({hero['name']})" + (f" ({len(todos)} TODO)" if todos else ""))

    print("Héros :")
    print("\n".join(report))
    print(f"\n{len(replacements)} héros complétés, {len(new_heroes)} ajoutés.")
    if not args.write:
        print("Aperçu seulement. Relancez avec --write pour modifier gamedata.js.")
        return

    new_text = text
    if new_heroes:
        block = ",\n\n        // --- Ajoutés automatiquement par generate_heroes.py ---\n" + \
                ",\n".join("        " + h for h in new_heroes) + "\n    "
        new_text = new_text[:he].rstrip() + block + new_text[he:]
    for a, b, rep in sorted(replacements, reverse=True):
        new_text = new_text[:a] + rep + new_text[b:]
    shutil.copyfile(GAMEDATA, GAMEDATA.with_suffix(".js.bak"))
    GAMEDATA.write_text(new_text, encoding="utf-8", newline="\n")
    print("gamedata.js mis à jour (sauvegarde : gamedata.js.bak). Cherchez « TODO » pour les points à vérifier.")


if __name__ == "__main__":
    main()
