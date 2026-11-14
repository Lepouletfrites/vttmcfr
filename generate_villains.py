#!/usr/bin/env python3
"""
Remplit automatiquement les méchants de gamedata.js à partir de cards.js.

Usage :
    python generate_villains.py --check     # compare l'auto-génération à VOS entrées déjà remplies
    python generate_villains.py             # aperçu : affiche ce qui serait écrit, ne modifie rien
    python generate_villains.py --write     # écrit dans gamedata.js (sauvegarde gamedata.js.bak)
    python generate_villains.py --no-new    # avec --write : ne remplit que les entrées existantes vides

Ce qui est rempli :
  - les entrées existantes encore vides (stages: [] et schemes: []) ;
  - les scénarios présents dans cards.js mais absents de gamedata.js (ajoutés à la fin) ;
  - les sets modulaires utilisés mais absents de MARVEL_DB.modulars (ajoutés à la fin).
Les entrées déjà remplies à la main ne sont JAMAIS modifiées.

Champs générés (même logique que vos entrées manuelles) :
  stages            cartes `villain` du set, 1 code par carte (face « a » si double face)
  schemes           cartes `main_scheme`, code de base sinon face « a »
  multi_villains    si plusieurs méchants différents au stade I (+ jeton: true)
  default_modulars  « (recommandé : X) » / « modulaire (X) » de la manigance 1A
  mandatory_modulars sets cités dans « Les sets de rencontre … » qui sont des modulaires
  start_on_board    « Put … into play » (cartes retrouvées par leur nom)
  start_set_aside   « Set … aside »
Les cas particuliers non compris sont signalés par des commentaires // TODO dans gamedata.js.
"""

import argparse
import json
import re
import shutil
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CARDS = ROOT / "cards.js"
GAMEDATA = ROOT / "gamedata.js"

ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5}
SETUP_TYPES = r"(?:environments?|supports?|attachments?|minions?|treachery|treacheries|side schemes?|obligations?|upgrades?|allies|ally|cards?)"


# ------------------------------------------------------------------ utilitaires
def strip_html(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    return s.replace("[[", "").replace("]]", "")


def norm(s):
    s = unicodedata.normalize("NFKD", strip_html(s).lower())
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = re.sub(r"[’'`]", "", s)
    s = re.sub(r"^(?:the|les?|la|l)\s+", "", s.strip())
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def loose(s):
    """norm() tolérant au pluriel : « Équipements du Bouffon » = « Équipement du Bouffon »."""
    return " ".join(w[:-1] if len(w) > 3 and w.endswith(("s", "x")) else w for w in norm(s).split())


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", norm(s)).strip("_")


def split_names(s, lang="en"):
    sep = r",|\band\b|\bor\b" if lang == "en" else r",|\bet\b|\bou\b"
    return [p.strip(" .") for p in re.split(sep, s) if p.strip(" .")]


# ------------------------------------------------------------------ cartes
def load_cards():
    text = CARDS.read_text(encoding="utf-8")
    return json.loads(text[text.find("["): text.rfind("]") + 1])


class CardIndex:
    def __init__(self, cards):
        self.cards = cards
        self.by_set = {}
        for c in cards:
            if c.get("card_set_code"):
                self.by_set.setdefault(c["card_set_code"], []).append(c)
        self.codes = {c["code"] for c in cards}
        for c in cards:
            if c.get("linked_card"):
                self.codes.add(c["linked_card"]["code"])
        self.set_names = {}
        for code, cs in self.by_set.items():
            self.set_names[code] = cs[0].get("card_set_name") or code

    def find_by_name(self, name, preferred_sets, pack_code):
        """Cherche une carte de rencontre par nom anglais (puis français)."""
        n = norm(name)
        if not n:
            return None
        pools = [c for s in preferred_sets for c in self.by_set.get(s, [])]
        pools2 = [c for c in self.cards if c.get("pack_code") == pack_code]
        pools3 = [c for c in self.cards if c.get("faction_code") in ("encounter", "campaign")]
        for pool in (pools, pools2, pools3):
            hits = [c for c in pool if norm(c.get("real_name")) == n or norm(c.get("name")) == n]
            if hits:
                hits.sort(key=lambda c: c["code"])
                return hits[0]["code"]
        return None


def base_codes(cards):
    """Un code par carte physique : '01097' si présent, sinon la face 'a'."""
    codes = {c["code"] for c in cards}
    out = []
    for c in sorted(cards, key=lambda c: c["code"]):
        m = re.fullmatch(r"(\d+)([a-z])", c["code"])
        if m and m.group(1) in codes:
            continue
        if m and m.group(2) != "a":
            continue
        out.append(c["code"])
    return out


# ------------------------------------------------------------------ gamedata.js
def find_array(text, key):
    m = re.search(r"\b" + key + r"\s*:\s*\[", text)
    if not m:
        sys.exit(f"Tableau `{key}` introuvable dans gamedata.js")
    start = m.end() - 1
    depth, i, in_str = 0, start, None
    while i < len(text):
        ch = text[i]
        if in_str:
            if ch == "\\":
                i += 1
            elif ch == in_str:
                in_str = None
        elif ch in "\"'":
            in_str = ch
        elif ch == "/" and text[i:i + 2] == "//":
            i = text.index("\n", i)
            continue
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return start, i
        i += 1
    sys.exit(f"Fin du tableau `{key}` introuvable")


def top_level_objects(text, start, end):
    """(début, fin) de chaque objet { … } de premier niveau dans text[start:end]."""
    objs, depth, obj_start, in_str, i = [], 0, None, None, start + 1
    while i < end:
        ch = text[i]
        if in_str:
            if ch == "\\":
                i += 1
            elif ch == in_str:
                in_str = None
        elif ch in "\"'":
            in_str = ch
        elif ch == "/" and text[i:i + 2] == "//":
            i = text.index("\n", i)
            continue
        elif ch == "{":
            if depth == 0:
                obj_start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                objs.append((obj_start, i + 1))
        i += 1
    return objs


def field_str(obj, key):
    m = re.search(r"\b" + key + r"\s*:\s*\"([^\"]*)\"", obj)
    return m.group(1) if m else None


def field_list(obj, key):
    m = re.search(r"\b" + key + r"\s*:\s*\[([^\]]*)\]", obj)
    return re.findall(r"\"([^\"]*)\"", m.group(1)) if m else None


def parse_gamedata():
    text = GAMEDATA.read_text(encoding="utf-8")
    vs, ve = find_array(text, "villains")
    villains = []
    for a, b in top_level_objects(text, vs, ve):
        obj = text[a:b]
        villains.append({
            "span": (a, b), "text": obj,
            "id": field_str(obj, "id"), "name": field_str(obj, "name"),
            "card_set_code": field_str(obj, "card_set_code"),
            "stages": field_list(obj, "stages") or [],
            "schemes": field_list(obj, "schemes") or [],
            "default_modulars": field_list(obj, "default_modulars") or [],
            "mandatory_modulars": field_list(obj, "mandatory_modulars") or [],
            "start_on_board": field_list(obj, "start_on_board") or [],
            "start_set_aside": field_list(obj, "start_set_aside") or [],
            "has_multi": "multi_villains" in obj,
            "has_deck": "villain_deck" in obj,
        })
    ms, me = find_array(text, "modulars")
    modulars = []
    for a, b in top_level_objects(text, ms, me):
        obj = text[a:b]
        modulars.append({"id": field_str(obj, "id"), "name": field_str(obj, "name"),
                         "card_set_code": field_str(obj, "card_set_code")})
    return text, villains, modulars


def is_filled(v):
    return bool(v["stages"] or v["schemes"] or v["has_multi"] or v["has_deck"])


# ------------------------------------------------------------------ génération
class Generator:
    def __init__(self, idx, modulars):
        self.idx = idx
        self.modulars = list(modulars)
        self.new_modulars = []  # modulaires à ajouter à MARVEL_DB.modulars

    def modular_id(self, name, allow_create=True):
        """Nom FR d'un set → id de MARVEL_DB.modulars (créé si le set modulaire existe)."""
        n = loose(name)
        if not n:
            return None
        for m in self.modulars + self.new_modulars:
            if loose(m["name"]) == n or loose(self.idx.set_names.get(m["card_set_code"], "")) == n:
                return m["id"]
        for code, set_name in self.idx.set_names.items():
            cs = self.idx.by_set[code]
            if loose(set_name) == n and cs[0].get("card_set_type_name_code") == "modular":
                existing = next((m for m in self.modulars + self.new_modulars if m["card_set_code"] == code), None)
                if existing:
                    return existing["id"]
                if allow_create:
                    entry = {"id": code, "name": set_name, "card_set_code": code}
                    self.new_modulars.append(entry)
                    return code
        return None

    def generate(self, set_code):
        idx = self.idx
        cards = idx.by_set.get(set_code, [])
        villains = [c for c in cards if c["type_code"] == "villain"]
        schemes = [c for c in cards if c["type_code"] == "main_scheme"]
        out, todos = {}, []
        if not schemes:
            return None, ["aucune manigance principale dans ce set"]

        first = next((c for c in sorted(schemes, key=lambda c: c["code"]) if c["code"].endswith("a")),
                     sorted(schemes, key=lambda c: c["code"])[0])
        fr, en = strip_html(first.get("text")), strip_html(first.get("real_text"))
        pack = first.get("pack_code")
        own_name = norm(idx.set_names.get(set_code, ""))

        # --- méchants
        vbase = [c for c in villains if c["code"] in base_codes(villains)]
        vbase.sort(key=lambda c: (ROMAN.get(str(c.get("stage") or "").upper(), 9), c["code"]))
        stage1_names = []
        for c in vbase:
            if ROMAN.get(str(c.get("stage") or "").upper()) == 1 and c["real_name"] not in stage1_names:
                stage1_names.append(c["real_name"])
        if len(stage1_names) > 1:
            groups = []
            for name in stage1_names:
                cs = [c for c in vbase if c["real_name"] == name]
                groups.append({"id": slug(name), "name": cs[0]["name"], "stages": [c["code"] for c in cs]})
            out["multi_villains"] = groups
            out["jeton"] = True
            todos.append("scénario à plusieurs méchants : vérifier multi_villains et le placement du jeton")
        else:
            out["stages"] = [c["code"] for c in vbase]
            stages_seen = [c.get("stage") for c in vbase]
            if len(stages_seen) != len(set(stages_seen)):
                todos.append("plusieurs cartes méchant au même stade (variantes) : à trier à la main")
        if not villains:
            todos.append("aucune carte méchant dans ce set (méchant dans un autre set / deck de méchants ?)")

        out["schemes"] = base_codes(schemes)

        # --- contenu : modulaires obligatoires et recommandés
        contents = fr.split("Mise en place")[0]
        mandatory = []
        m = re.search(r"sets? de rencontre\s+(.+?)(?:\.|$)", contents, re.I | re.S)
        if m:
            for name in split_names(m.group(1), "fr"):
                n = norm(name)
                if n in ("standard", "expert", own_name) or not n:
                    continue
                mid = self.modular_id(name)
                if mid:
                    mandatory.append(mid)
        defaults = []
        # « Un set de rencontre modulaire (recommandé : X) », « Deux sets … modulaires (X et Y) »,
        # « Un set de rencontre (Acolytes) ». On lit jusqu'à la fin de la phrase pour tolérer
        # les parenthèses mal placées du texte officiel.
        m = re.search(r"(?:modulaires?|rencontre)\s*\(((?:recommand\w*\s*:\s*)?[^.]+?)\)?\s*(?:\.|/|$)", contents, re.I)
        if m:
            names = re.sub(r"recommand\w*\s*:\s*", "", m.group(1)).replace("(", "").replace(")", "")
            for name in split_names(names, "fr"):
                mid = self.modular_id(name)
                if mid:
                    defaults.append(mid)
                else:
                    todos.append(f"modulaire recommandé non reconnu : « {name} »")
        if re.search(r"(?:choisissez|choose)\s+\d|\bau hasard\b|at random", fr + en, re.I):
            todos.append("mise en place avec choix de modulaires (au hasard / au choix) : à vérifier")
        out["mandatory_modulars"] = [x for x in mandatory if x not in defaults]
        out["default_modulars"] = defaults

        # --- mise en place : cartes en jeu / de côté
        raw_en = first.get("real_text") or ""
        raw_setup = raw_en.split("Setup", 1)[1] if "Setup" in raw_en else ""
        raw_setup = re.sub(r"^\s*(?:</b>)?\s*:\s*", "", raw_setup)
        setup = strip_html(raw_setup).lstrip(" :")
        pref_sets = [set_code] + [mm["card_set_code"] for mm in self.modulars + self.new_modulars
                                  if mm["id"] in mandatory]
        pref_cards = [c for s in pref_sets for c in idx.by_set.get(s, [])]
        pack_prefix = first["code"][:2]
        on_board, aside, missing = [], [], []

        def add(bucket, code):
            if code and code not in bucket:
                bucket.append(code)

        def resolve(fragment, bucket):
            # Référence directe à un numéro de carte, ex. « Magneto Ally (172B) »
            for num, side in re.findall(r"\((?:[A-Z]+\s*)?(\d{1,3})([AB])?\)", fragment):
                code = f"{pack_prefix}{int(num):03d}" + (side.lower() if side else "")
                if code in idx.codes:
                    add(bucket, code)
                    fragment = ""
            # « each [[Captive]] ally » → toutes les cartes du set ayant ce trait
            for trait in re.findall(r"each \[\[([\w-]+)\]\]", fragment, re.I):
                for c in sorted(idx.by_set.get(set_code, []), key=lambda c: c["code"]):
                    if c["code"][:2] != pack_prefix:  # ignore les cartes ajoutées au set par une autre boîte
                        continue
                    if trait.lower() in (c.get("real_traits") or "").lower():
                        add(bucket, c["code"])
                fragment = ""
            fragment = strip_html(fragment)
            fragment = re.sub(r"\b(?:main|side)\s+schemes?\b|\b" + SETUP_TYPES + r"\b", "", fragment, flags=re.I)
            fragment = re.sub(r",?\s*\w+ side faceup", "", fragment, flags=re.I)
            for name in split_names(fragment):
                name = re.sub(r"^(?:the|each|a|an|its|his|her|copy of|a copy of)\s+", "", name.strip(), flags=re.I)
                name = re.sub(r"^(?:copy of)\s+", "", name, flags=re.I)
                name = re.sub(r"\(.*?\)", "", name).strip()
                if not name or len(name) < 3 or re.match(r"(?:them|it|this|those|these|other|that)\b", name, re.I):
                    continue
                code = idx.find_by_name(name, pref_sets, pack)
                if code:
                    add(bucket, code)
                else:
                    missing.append(name)

        sentences = [s.strip() for s in re.split(r"(?<=\.)\s+|\n", raw_setup) if s.strip()]
        for s in sentences:
            if re.match(r"(?:Each player )?search(?:es)? .+? for ", strip_html(s), re.I):
                m = re.search(r"for (.+?) and (?:puts?|reveals?)", s, re.I)
                if m:
                    resolve(m.group(1), on_board)
                continue
            for frag in re.findall(r"Put (.+?) into play", s, re.I):
                resolve(frag, on_board)
            for frag in re.findall(r"Set (.+?) aside", s, re.I):
                resolve(frag, aside)
            for frag in re.findall(r"Reveal (.+?)(?:\.|$)", s, re.I):
                resolve(frag, on_board)
            for frag in re.findall(r"Attach (.+?) to ", s, re.I):
                if "discarded" not in frag and "this way" not in frag:
                    resolve(frag, on_board)

        # Manigances principales mises en jeu à la mise en place (ex. Venom-Bouffon) :
        # elles sont sur le plateau, pas dans la suite des manigances.
        out["schemes"] = [s for s in out["schemes"] if s not in on_board]
        if on_board:
            out["start_on_board"] = on_board
        if aside:
            out["start_set_aside"] = aside
        if missing:
            todos.append("cartes de mise en place non retrouvées : " + ", ".join(dict.fromkeys(missing)))
        if re.search(r"\b(Discard|Remove|Create|Flip|Place \d)\b", setup):
            todos.append("étapes de mise en place spéciales (défausser, retirer, jetons…) non automatisées")

        out["_setup_fr"] = (fr.split("Mise en place", 1)[1].strip(" :\n") if "Mise en place" in fr else "")[:300]
        return out, todos


# ------------------------------------------------------------------ rendu JS
def js_list(xs):
    return "[" + ", ".join(json.dumps(x, ensure_ascii=False) for x in xs) + "]"


def render_entry(vid, name, set_code, gen, todos, keep_defaults=None):
    ind = " " * 12
    lines = []
    if gen.get("_setup_fr"):
        lines.append(f"{ind}// Mise en place : {gen['_setup_fr'].replace(chr(10), ' ')}")
    for t in todos:
        lines.append(f"{ind}// TODO: {t}")
    fields = [f'id: {json.dumps(vid, ensure_ascii=False)}',
              f'name: {json.dumps(name, ensure_ascii=False)}',
              f'card_set_code: {json.dumps(set_code)}']
    if "multi_villains" in gen:
        mv = ",\n".join(
            f'{ind}    {{ id: {json.dumps(g["id"])}, name: {json.dumps(g["name"], ensure_ascii=False)}, stages: {js_list(g["stages"])} }}'
            for g in gen["multi_villains"])
        fields.append(f"multi_villains: [\n{mv}\n{ind}]")
    else:
        fields.append(f"stages: {js_list(gen.get('stages', []))}")
    fields.append(f"schemes: {js_list(gen['schemes'])}")
    # Modulaires recommandés lus sur la carte en priorité ; à défaut, ceux déjà saisis.
    defaults = gen["default_modulars"] or keep_defaults or []
    mandatory = [m for m in gen.get("mandatory_modulars", []) if m not in defaults]
    if mandatory:
        fields.append(f"mandatory_modulars: {js_list(mandatory)}")
    fields.append(f"default_modulars: {js_list(defaults)}")
    if gen.get("start_on_board"):
        fields.append(f"start_on_board: {js_list(gen['start_on_board'])}")
    if gen.get("start_set_aside"):
        fields.append(f"start_set_aside: {js_list(gen['start_set_aside'])}")
    if gen.get("jeton"):
        fields.append("jeton: true")
    body = ",\n".join(ind + f for f in fields)
    head = "\n".join(lines)
    return "{\n" + (head + "\n" if head else "") + body + "\n        }"


# ------------------------------------------------------------------ commandes
def real_set_code(idx, v):
    """card_set_code réel d'une entrée : le sien s'il existe dans cards.js, sinon celui
    de sa première carte méchant/manigance (corrige une faute de frappe)."""
    if v["card_set_code"] in idx.by_set:
        return v["card_set_code"]
    by_code = {c["code"]: c for c in idx.cards}
    for code in v["stages"] + v["schemes"] + re.findall(r"\"(\d{5}[a-z]?)\"", v["text"]):
        c = by_code.get(code)
        if c and c.get("card_set_code"):
            return c["card_set_code"]
    return None


def bad_set_codes(idx, villains, modulars):
    """Entrées dont le card_set_code n'existe pas dans cards.js → (type, id, actuel, corrigé)."""
    out = []
    for v in villains:
        if v["card_set_code"] and v["card_set_code"] not in idx.by_set:
            out.append(("villains", v["id"], v["card_set_code"], real_set_code(idx, v)))
    for m in modulars:
        if m["card_set_code"] and m["card_set_code"] not in idx.by_set:
            fix = next((code for code, name in idx.set_names.items()
                        if loose(name) == loose(m["name"]) and idx.by_set[code][0].get("card_set_type_name_code") == "modular"), None)
            out.append(("modulars", m["id"], m["card_set_code"], fix))
    return out


def report_bad_sets(bad):
    if not bad:
        return
    print("\n⚠ card_set_code introuvables dans cards.js (le jeu ne trouve alors AUCUNE carte de ce set) :")
    for kind, eid, cur, fix in bad:
        print(f"  {kind}/{eid} : « {cur} » → " + (f"« {fix} »" if fix else "à corriger à la main"))


def cmd_check(gen, villains, modulars):
    keys = ["stages", "schemes", "mandatory_modulars", "default_modulars", "start_on_board", "start_set_aside"]
    ok_total = field_total = 0
    for v in villains:
        if not is_filled(v) or v["has_multi"] or v["has_deck"] or not v["card_set_code"]:
            continue
        g, todos = gen.generate(real_set_code(gen.idx, v) or v["card_set_code"])
        if g is None:
            print(f"  ? {v['id']}: set {v['card_set_code']} sans manigance dans cards.js")
            continue
        diffs = []
        for k in keys:
            mine, auto = v[k], g.get(k, [])
            same = (mine == auto) if k in ("stages", "schemes") else (set(mine) == set(auto))
            field_total += 1
            ok_total += same
            if not same:
                diffs.append(f"{k}: vous={mine} auto={auto}")
        print(("  ✔ " if not diffs else "  ✘ ") + v["id"])
        for d in diffs:
            print("      " + d)
    pct = 100 * ok_total / field_total if field_total else 0
    print(f"\nChamps identiques à votre saisie : {ok_total}/{field_total} ({pct:.0f} %)")
    report_bad_sets(bad_set_codes(gen.idx, villains, modulars))


def main():
    ap = argparse.ArgumentParser(description="Remplit les méchants de gamedata.js depuis cards.js")
    ap.add_argument("--check", action="store_true", help="compare avec vos entrées déjà remplies")
    ap.add_argument("--write", action="store_true", help="écrit dans gamedata.js")
    ap.add_argument("--no-new", action="store_true", help="n'ajoute pas les scénarios absents de gamedata.js")
    args = ap.parse_args()

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    idx = CardIndex(load_cards())
    text, villains, modulars = parse_gamedata()
    gen = Generator(idx, modulars)

    if args.check:
        cmd_check(gen, villains, modulars)
        return
    bad = bad_set_codes(idx, villains, modulars)

    replacements = []  # (start, end, new_text)
    filled = []
    for v in villains:
        if is_filled(v) or not v["card_set_code"]:
            continue
        g, todos = gen.generate(v["card_set_code"])
        if g is None:
            print(f"  ✘ {v['id']} : {todos[0]} (card_set_code « {v['card_set_code']} » à vérifier)")
            continue
        new = render_entry(v["id"], v["name"], v["card_set_code"], g, todos, keep_defaults=v["default_modulars"])
        replacements.append((v["span"][0], v["span"][1], new))
        filled.append((v["id"], todos))

    added = []
    if not args.no_new:
        known = {v["card_set_code"] for v in villains} | {fix for _, _, _, fix in bad if fix}
        for set_code, cs in sorted(idx.by_set.items(), key=lambda kv: min(c["code"] for c in kv[1])):
            if set_code in known or cs[0].get("card_set_type_name_code") != "villain":
                continue
            if not any(c["type_code"] == "main_scheme" for c in cs):
                continue
            g, todos = gen.generate(set_code)
            if g is None:
                continue
            name = f'{idx.set_names[set_code]} ({cs[0].get("pack_name")})'
            todos = ["scénario ajouté automatiquement : vérifier le nom et la mise en place"] + todos
            added.append((set_code, render_entry(set_code, name, set_code, g, todos), todos))

    # --- rapport
    print(f"Entrées vides remplies : {len(filled)}")
    for vid, todos in filled:
        print(f"  {'✔' if not todos else '⚠'} {vid}" + (f"  ({len(todos)} TODO)" if todos else ""))
    print(f"Scénarios absents ajoutés : {len(added)}")
    for code, _, todos in added:
        print(f"  + {code}" + (f"  ({len(todos)} TODO)" if todos else ""))
    print(f"Modulaires ajoutés : {len(gen.new_modulars)}" +
          (" (" + ", ".join(m["id"] for m in gen.new_modulars) + ")" if gen.new_modulars else ""))
    report_bad_sets(bad)
    if any(fix for *_, fix in bad):
        print("  (corrigés automatiquement avec --write)")

    if not args.write:
        print("\nAperçu seulement. Relancez avec --write pour modifier gamedata.js.")
        if replacements:
            print("\nExemple :\n        " + replacements[0][2])
        return

    # --- écriture (de la fin vers le début pour garder les positions valides)
    new_text = text
    ms, me = find_array(new_text, "modulars")
    if gen.new_modulars:
        block = ",\n\n        // --- Ajoutés automatiquement par generate_villains.py ---\n" + ",\n".join(
            f'        {{ id: {json.dumps(m["id"])}, name: {json.dumps(m["name"], ensure_ascii=False)}, card_set_code: {json.dumps(m["card_set_code"])} }}'
            for m in gen.new_modulars) + "\n    "
        before = new_text[:me].rstrip()
        new_text = before + block + new_text[me:]
    for a, b, rep in sorted(replacements, reverse=True):
        new_text = new_text[:a] + rep + new_text[b:]
    if added:
        vs, ve = find_array(new_text, "villains")
        block = ",\n\n        // --- Ajoutés automatiquement par generate_villains.py ---\n" + ",\n".join(
            "        " + r for _, r, _ in added) + "\n    "
        new_text = new_text[:ve].rstrip() + block + new_text[ve:]
    for _, _, cur, fix in bad:
        if fix:
            new_text = re.sub(r'(card_set_code\s*:\s*)"' + re.escape(cur) + '"', r'\1"' + fix + '"', new_text)

    shutil.copyfile(GAMEDATA, GAMEDATA.with_suffix(".js.bak"))
    GAMEDATA.write_text(new_text, encoding="utf-8", newline="\n")
    print(f"\ngamedata.js mis à jour (sauvegarde : gamedata.js.bak). Cherchez « TODO » pour les points à vérifier.")


if __name__ == "__main__":
    main()
