#!/usr/bin/env python3
"""
Met à jour cards.js à partir de l'API publique de MarvelCDB (version française).

Usage :
    python update_cards.py                 # met à jour cards.js (sauvegarde cards.js.bak)
    python update_cards.py --lang en       # données anglaises (marvelcdb.com)
    python update_cards.py --dry-run       # affiche seulement le résumé des différences
    python update_cards.py --output autre.js

Aucune dépendance externe (bibliothèque standard uniquement).
Format de sortie identique à l'existant : `const CARDS_DATA = [ ... ];`
(JSON indenté de 4 espaces, UTF-8, accents non échappés).
"""

import argparse
import gzip
import json
import shutil
import sys
import urllib.error
import urllib.request
from pathlib import Path

HOSTS = {"fr": "https://fr.marvelcdb.com", "en": "https://marvelcdb.com"}
API_PATH = "/api/public/cards/?encounter=1"  # sans encounter=1, l'API ne renvoie que les cartes joueur
PREFIX = "const CARDS_DATA = "
DEFAULT_OUTPUT = Path(__file__).resolve().parent / "cards.js"


def fetch_cards(lang: str) -> list:
    url = HOSTS[lang] + API_PATH
    print(f"Téléchargement : {url}")
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "vttmcfr-card-updater/1.0",
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            raw = resp.read()
            if resp.headers.get("Content-Encoding") == "gzip":
                raw = gzip.decompress(raw)
    except (urllib.error.URLError, TimeoutError) as e:
        sys.exit(f"Erreur réseau : {e}")

    data = json.loads(raw.decode("utf-8"))
    if not isinstance(data, list) or not data:
        sys.exit("Réponse inattendue de l'API (liste vide ou format différent).")
    return data


def load_existing(path: Path) -> list:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end == -1:
        return []
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError as e:
        print(f"Avertissement : ancien fichier illisible ({e}), comparaison ignorée.")
        return []


def summarize(old: list, new: list) -> None:
    old_by = {c["code"]: c for c in old}
    new_by = {c["code"]: c for c in new}
    added = [c for c in new_by if c not in old_by]
    removed = [c for c in old_by if c not in new_by]
    changed = [c for c in new_by if c in old_by and new_by[c] != old_by[c]]

    print(f"\nAncien : {len(old)} cartes | Nouveau : {len(new)} cartes")
    print(f"  + ajoutées   : {len(added)}")
    print(f"  - supprimées : {len(removed)}")
    print(f"  ~ modifiées  : {len(changed)}")
    for label, codes in (("Ajoutées", added), ("Supprimées", removed)):
        if codes:
            sample = ", ".join(f"{c} ({(new_by.get(c) or old_by[c]).get('name')})" for c in codes[:15])
            more = f" … (+{len(codes) - 15})" if len(codes) > 15 else ""
            print(f"  {label} : {sample}{more}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Met à jour cards.js depuis MarvelCDB.")
    ap.add_argument("--lang", choices=HOSTS, default="fr", help="langue des textes (défaut : fr)")
    ap.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="fichier de sortie")
    ap.add_argument("--dry-run", action="store_true", help="n'écrit rien, affiche le résumé")
    ap.add_argument("--no-backup", action="store_true", help="ne crée pas de .bak")
    args = ap.parse_args()

    new = fetch_cards(args.lang)
    old = load_existing(args.output)
    summarize(old, new)

    if args.dry_run:
        print("\n--dry-run : aucun fichier modifié.")
        return

    # Garde-fou : refuse d'écraser si l'API renvoie bien moins de cartes qu'avant.
    if old and len(new) < len(old) * 0.9:
        sys.exit("Abandon : le nouveau jeu contient >10 % de cartes en moins. "
                 "Relancez avec --dry-run pour vérifier.")

    if args.output.exists() and not args.no_backup:
        backup = args.output.with_suffix(args.output.suffix + ".bak")
        shutil.copyfile(args.output, backup)
        print(f"\nSauvegarde : {backup}")

    body = json.dumps(new, ensure_ascii=False, indent=4)
    args.output.write_text(f"{PREFIX}{body};\n", encoding="utf-8", newline="\n")
    print(f"Écrit : {args.output} ({len(new)} cartes)")


if __name__ == "__main__":
    main()
