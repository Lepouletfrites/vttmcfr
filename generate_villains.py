#!/usr/bin/env python3
"""
Génère un BROUILLON d'entrées `villains` pour gamedata.js à partir de cards.js.

Usage :
    python generate_villains.py                  # écrit villains_draft.js
    python generate_villains.py --all            # inclut aussi les scénarios déjà dans gamedata.js
    python generate_villains.py --set ultron     # un seul card_set_code

Rempli automatiquement :
  - stages           : cartes `villain` du set (triées)
  - schemes          : cartes `main_scheme` du set (face de base)
  - default_modulars : "(recommandé : X)" dans le texte de la manigance principale
  - start_on_board   : "Put the X environment/... into play" (si X est retrouvée dans le set)
Tout ce qui n'est pas sûr est écrit en commentaire `// TODO` avec le texte de mise en place.
À relire avant de copier dans gamedata.js (mandatory_modulars, jeton, multi_villains = à la main).
"""

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CARDS = ROOT / "cards.js"
GAMEDATA = ROOT / "gamedata.js"
OUT = ROOT / "villains_draft.js"

TYPE_WORDS = r"(?:environment|support|attachment|minion|treachery|side schemes?|schemes?|obligation)s?"


def load_cards():
    text = CARDS.read_text(encoding="utf-8")
    return json.loads(text[text.find("["): text.rfind("]") + 1])


def known_sets():
    if not GAMEDATA.exists():
        return set()
    return set(re.findall(r'card_set_code:\s*"([^"]+)"', GAMEDATA.read_text(encoding="utf-8")))


def strip_html(s):
    return re.sub(r"<[^>]+>", "", s or "")


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", strip_html(s).lower()).strip()


def base_codes(cards):
    """Garde un code par carte double-face : '01137' si présent, sinon la face 'a'."""
    codes = {c["code"] for c in cards}
    out = []
    for c in sorted(cards, key=lambda c: c["code"]):
        code = c["code"]
        m = re.fullmatch(r"(\d+)([a-z])", code)
        if m and m.group(1) in codes:
            continue  # la version sans lettre existe
        if m and m.group(2) != "a":
            continue  # face b/c d'une carte double-face
        out.append(code)
    return out


def split_names(s):
    s = re.sub(r",|\band\b", ",", s)
    return [p.strip() for p in s.split(",") if p.strip()]


def parse_setup(real_text, set_cards):
    """Retourne (codes trouvés, noms non trouvés)."""
    setup = strip_html(real_text)
    m = re.search(r"Setup\s*:\s*(.*)", setup, re.S)
    if not m:
        return [], []
    found, missing = [], []
    for sentence in re.findall(r"Put (.+?) into play", m.group(1)):
        sentence = re.sub(r"\b" + TYPE_WORDS + r"\b", "", sentence, flags=re.I)
        for name in split_names(sentence):
            name = re.sub(r"^(?:the|a|an)\s+", "", name, flags=re.I).strip()
            if not name:
                continue
            hits = [c for c in set_cards
                    if norm(c.get("real_name")) == norm(name)
                    and c["type_code"] in ("environment", "attachment", "side_scheme", "support", "minion")]
            if hits:
                found.append(sorted(hits, key=lambda c: c["code"])[0]["code"])
            else:
                missing.append(name)
    return found, missing


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="inclut les sets déjà présents dans gamedata.js")
    ap.add_argument("--set", help="un seul card_set_code")
    args = ap.parse_args()

    cards = load_cards()
    modular_by_name = {norm(c["card_set_name"]): c["card_set_code"]
                       for c in cards
                       if c.get("card_set_type_name_code") == "modular" and c.get("card_set_name")}
    already = set() if args.all else known_sets()

    by_set = {}
    for c in cards:
        if c.get("card_set_code"):
            by_set.setdefault(c["card_set_code"], []).append(c)

    entries, count = [], 0
    for code, set_cards in sorted(by_set.items(), key=lambda kv: min(c["code"] for c in kv[1])):
        if args.set and code != args.set:
            continue
        if code in already:
            continue
        villains = [c for c in set_cards if c["type_code"] == "villain"]
        schemes = [c for c in set_cards if c["type_code"] == "main_scheme"]
        if not villains or not schemes:
            continue  # modulaire, héros, etc.

        stages = base_codes(villains)
        scheme_codes = base_codes(schemes)
        first = next((c for c in sorted(schemes, key=lambda c: c["code"]) if c["code"].endswith("a")), schemes[0])
        text_en, text_fr = first.get("real_text", ""), first.get("text", "")

        # modulaire recommandé
        modulars = []
        m = re.search(r"recommand\w*\s*:\s*([^)<]+)", strip_html(text_fr), re.I)
        if m:
            name = norm(m.group(1))
            if name in modular_by_name:
                modulars.append(modular_by_name[name])
            else:
                modulars = None  # inconnu

        start, missing = parse_setup(text_en, set_cards)
        villain_names = sorted({c["real_name"] for c in villains})

        todo = []
        if len(villain_names) > 1:
            todo.append("plusieurs méchants (" + ", ".join(villain_names) + ") -> multi_villains à faire à la main")
        if modulars is None:
            todo.append("modulaire recommandé non reconnu : « %s »" % m.group(1).strip())
            modulars = []
        if missing:
            todo.append("mise en place non résolue : " + ", ".join(missing))
        if re.search(r"Attach|Discard|Shuffle|Set aside|Place|Create", strip_html(text_en)):
            todo.append("vérifier le texte de mise en place")

        lines = []
        lines.append(f'    // {first["pack_name"]} — mise en place : {strip_html(text_fr).split("Mise en place")[-1].strip(" :")[:200]}')
        for t in todo:
            lines.append(f"    // TODO: {t}")
        entry = [f'    id: "{code}",',
                 f'    name: {json.dumps(villains[0]["name"] + " — " + scheme_codes_name(schemes), ensure_ascii=False)},',
                 f'    card_set_code: "{code}",',
                 f"    stages: {json.dumps(stages)},",
                 f"    schemes: {json.dumps(scheme_codes)},",
                 f"    default_modulars: {json.dumps(modulars)}"]
        if start:
            entry[-1] += ","
            entry.append(f"    start_on_board: {json.dumps(start)}")
        lines.append("    {")
        lines.extend("    " + l for l in entry)
        lines.append("    },")
        entries.append("\n".join(lines))
        count += 1

    OUT.write_text("// Brouillon généré par generate_villains.py — à relire puis copier dans MARVEL_DB.villains\n\n"
                   + "\n\n".join(entries) + "\n", encoding="utf-8", newline="\n")
    print(f"{count} scénarios écrits dans {OUT}")


def scheme_codes_name(schemes):
    first = sorted(schemes, key=lambda c: c["code"])[0]
    return first["name"]


if __name__ == "__main__":
    main()
