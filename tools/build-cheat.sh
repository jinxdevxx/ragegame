#!/bin/bash
# Baut die Cheat-/Testversion in ../ragegame-cheat (eigenes Repo, eigener Link).
# Das Hauptspiel wird dabei NICHT verändert – es wird nur kopiert und in der Kopie gepatcht.
# Aufruf aus dem Hauptrepo: bash tools/build-cheat.sh
set -e
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DST="${1:-$SRC/../ragegame-cheat}"
[ -d "$DST/.git" ] || { echo "Ziel $DST ist kein Git-Repo"; exit 1; }
find "$DST" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r "$SRC/index.html" "$SRC/version.json" "$SRC/css" "$SRC/js" "$DST/"
cp "$SRC/tools/cheat/cheat.js" "$DST/js/cheat.js"
# 1) eigener Speicher: alle Schlüssel rageverse_* → rageverse_cheat_*
sed -i "s/'rageverse_save_v1'/'rageverse_cheat_save_v1'/; s/'rageverse_meta'/'rageverse_cheat_meta'/; s/\`rageverse_slot_\${i}\`/\`rageverse_cheat_slot_\${i}\`/" "$DST/js/save.js"
grep -q "rageverse_cheat_meta" "$DST/js/save.js" && grep -q "rageverse_cheat_slot_" "$DST/js/save.js" || { echo "FEHLER: Speicher-Schlüssel nicht gepatcht"; exit 1; }
if grep -q "'rageverse_meta'\|\`rageverse_slot_" "$DST/js/save.js"; then echo "FEHLER: alter Schlüssel noch vorhanden"; exit 1; fi
# 2) Cheat-Menü braucht writeSave
sed -i "s/window.__rv = { game, save, C, computeStats,/window.__rv = { game, save, C, computeStats, writeSave,/" "$DST/js/main.js"
grep -q "computeStats, writeSave," "$DST/js/main.js" || { echo "FEHLER: writeSave nicht freigegeben"; exit 1; }
# 3) Skript einbinden, Titel kennzeichnen
sed -i 's|</body>|  <script src="js/cheat.js"></script>\n</body>|' "$DST/index.html"
sed -i 's|<title>\([^<]*\)</title>|<title>🛠 CHEAT · \1</title>|' "$DST/index.html"
grep -q "js/cheat.js" "$DST/index.html" || { echo "FEHLER: cheat.js nicht eingebunden"; exit 1; }
cat > "$DST/README.md" <<'MD'
# RAGEVERSE – Cheat-/Testversion

Testversion des Spiels mit Cheat-Menü (🛠-Knopf links oder Taste ^ / `): unbegrenzt Schrott, Chaos und ◆, alles freischalten, Level 99, Sprung in jede Welt, Unsterblichkeit.

- Spiel (echt): https://jinxdevxx.github.io/ragegame/
- Cheat-Version: https://jinxdevxx.github.io/ragegame-cheat/

Speichert getrennt (`rageverse_cheat_*`), echte Spielstände bleiben unberührt. Wird automatisch aus dem Hauptrepo gebaut (`tools/build-cheat.sh`) – hier nichts von Hand ändern.
MD
echo "Cheat-Version gebaut in $DST ($(grep -o '"version": *"[^"]*"' "$SRC/version.json"))"
