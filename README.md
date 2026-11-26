# RAGEVERSE

> Zerstöre alles. Wachse. Zerstöre größere Dinge.
> Vom Gartenzwerg bis zur Galaxie.

Du bist eine kleine, wütende Kugel. Alles, was kleiner ist als du, wird zertrümmert. Mit jedem Trümmerteil wirst du größer, und irgendwann zoomt die Kamera raus: Aus dem Garten wird die Straße, aus der Straße die Stadt, und am Ende fressen sich Galaxien gegenseitig.

**Spielen:** https://jinxdevxx.github.io/ragegame/
**Live-Devlog:** https://claude.ai/artifact/H44HiDCZvRHvEJNZ74eZ6E
**Aktuelle Version:** v0.1.0 (siehe [Patch Notes](#patch-notes))

---

## Der Loop

1. **Run starten:** rollen, rammen, zerstören.
2. **Wut-Leiste:** Sie sinkt ständig und mit der Zeit immer schneller. Zerstörung füllt sie wieder auf. Ist sie leer, ist der Run vorbei.
3. **Schrott sammeln:** Zerstörte Objekte lassen Schrott fallen. Den musst du einsammeln.
4. **Werkstatt:** Mit dem Schrott kaufst du permanente Upgrades.
5. **Weiter kommen:** Jeder Run bringt dich ein Stück weiter in die nächste Welt.

### Damit es nicht monoton wird
- **8 Welten:** Garten → Straße → Stadt → Gebirge → Kontinent → Planetar → Sonnensystem → Galaxie, danach endlos. Jede Welt hat eigene Objekte, Farben und Schwierigkeit.
- **Mutationen:** Bei jedem Welt-Aufstieg wählst du 1 von 3 Kräften für diesen Run, z. B. Explosiv, Schwarzes Loch oder Schockwelle.
- **Kombo:** Schnelle Zerstörungen erhöhen den Schrott-Multiplikator auf bis zu ×4.
- **Kettenreaktionen:** Explosive Objekte (⚠) jagen alles in der Nähe hoch.
- **Goldene Objekte:** bringen 6× Schrott.
- **Events:** Glaswelt, Goldregen, Wutanfall und Meteorschauer tauchen zufällig während eines Runs auf.
- **Zu groß:** Objekte mit gestricheltem Rand sind (noch) zu groß für dich. Die Upgrades *Härte* oder *Dickschädel* helfen dagegen.

## Steuerung

| Aktion | PC | Handy |
|---|---|---|
| Bewegen | Maus zeigt die Richtung, oder WASD / Pfeiltasten | Finger halten und ziehen |
| Rammstoß (Dash) | Leertaste oder Rechtsklick | Doppeltipp oder ⚡-Button |
| Pause | P / Esc | ❚❚-Button |

---

## Projektstruktur

```
index.html          Seite + alle Menüs (HTML)
css/style.css       Aussehen der Menüs und des HUD
js/config.js        ★ BALANCING: alle Zahlen, Welten, Objekte, Upgrades, Mutationen, Events
js/game.js          Spiel-Logik (Bewegung, Kollision, Wachstum, Spawning, Wut, Schrott)
js/render.js        Zeichnen auf dem Canvas (Objekt-Formen, Spieler, Effekte)
js/main.js          Game-Loop, Steuerung, Menüs, Shop, Patch Notes, Update-Hinweis
js/audio.js         Sounds (per WebAudio erzeugt, keine Dateien nötig)
js/save.js          Spielstand im Browser (localStorage)
js/patchnotes.js    Patch Notes (neueste oben) + aktuelle Version
version.json        Live-Version für den "Update verfügbar"-Hinweis
tools/balance-sim.js  Bot spielt Runs ohne Grafik → prüft das Balancing
```

### Lokal starten
Das Spiel braucht keinen Build-Schritt. Es reicht ein einfacher Webserver:

```bash
python3 -m http.server 8080
```

Dann http://localhost:8080 öffnen.

**Test-Parameter in der URL:**
- `?world=3`: Run direkt in Welt 3 (Gebirge) starten
- `?upgrades=10`: alle Upgrades auf Stufe 10 (nur für diese Sitzung)
- `?scrap=100000`: Schrott setzen

### Balancing anpassen
Fast alles steht in `js/config.js`, inklusive Kommentaren. Danach den Simulator laufen lassen:

```bash
node tools/balance-sim.js
```

Er zeigt zwei Dinge: wie weit ein Bot mit bestimmten Upgrade-Stufen kommt, und eine Progression über 100 Runs (der Bot kauft nach jedem Run die günstigsten Upgrades).

**Aktuelle Ziel-Kurve (Bot, v0.1.0):**

| Welt | erreicht ab Run |
|---|---|
| Garten | 1 |
| Straße | ~3 |
| Stadt | ~7 |
| Gebirge | ~12 |
| Kontinent | ~14 |
| Planetar | ~19 |
| Sonnensystem | ~20 |
| Galaxie | ~23 |

Ein Mensch ist meist etwas langsamer als der Bot. Die späten Welten kommen noch etwas zu schnell hintereinander, das wird mit dem Prestige-System (siehe Roadmap) angepasst.

### Neues Update veröffentlichen
1. Änderungen machen.
2. In `js/patchnotes.js` einen neuen Eintrag **oben** einfügen.
3. In `version.json` dieselbe Versionsnummer eintragen.
4. Pushen. Wer das Spiel gerade offen hat, bekommt unten links dezent den Hinweis „Update verfügbar“ und lädt neu, wann er will. Beim nächsten Start erscheint kurz „Neu in vX“, und am Patch-Notes-Button leuchtet ein Punkt.

---

## Roadmap

- **Prestige „Urknall“:** nach der Galaxie alles zurücksetzen und dafür einen permanenten Bonus bekommen.
- **Boss-Objekte** pro Welt, die sich wehren.
- **Mehr Objektvielfalt** und Welt-spezifische Gefahren.
- **Skins** für die Wutkugel.
- **Statistiken / Erfolge.**
- **Musik.**

---

## Dev-Log

Hier steht, was an dem Spiel gemacht wurde und warum.

### 2026-11-26: v0.1.0 Grundversion
- Komplettes Grundgerüst gebaut: reines HTML5-Canvas, kein Framework, kein Build. Läuft auf GitHub Pages und dem Handy.
- **Balancing-Durchlauf 1:** Der erste Entwurf war viel zu leicht. Ab Upgrade-Stufe 6 rollte der Bot bis in die Galaxie, und der Schrott wuchs ins Unendliche.
  - Neu: `WORLD_SCALING`. Jede Welt hat 1,9× zähere Objekte, 0,78× Wachstum und 1,1× Wutverlust.
  - Schrott pro Welt jetzt ×4 statt ×6–7, globaler Faktor 0,12.
  - Upgrade-Kosten steigen steiler (Wachstum +0,25 pro Upgrade).
  - Ergebnis: Garten → Galaxie dauert jetzt etwa 23 Runs statt 3.
- Browser-Test mit Playwright (Desktop + Handy): keine Konsolenfehler; Menü, Run, Mutation, Ergebnis, Werkstatt, Patch Notes und Update-Hinweis funktionieren.
- Gefixt: Die Augenbrauen sahen traurig statt wütend aus. Die Shop-Anzeige „Schrottgier“ zeigte 0,12× statt 1,00×.
- Live-Devlog in Claude angelegt (Stand, Patch-Notes-Historie, Roadmap, Ideen-Pool, PLAY-Button): https://claude.ai/artifact/H44HiDCZvRHvEJNZ74eZ6E
- Täglicher Qualitäts-Check eingerichtet (20:13 Uhr): Bugs, Balancing und Spielgefühl prüfen, danach README, Patch Notes und Devlog pflegen.
- Grundversion auf `main` gebracht, GitHub Pages ist aktiv: https://jinxdevxx.github.io/ragegame/

---

## Patch Notes

Die vollständigen Patch Notes stehen im Spiel (Button unten links) und in `js/patchnotes.js`.

### v0.1.0: Erste Wut (2026-11-26)
- Wutkugel mit Maus, Touch oder Tastatur, dazu der Rammstoß (Dash)
- Wut-Leiste, Schrott, Werkstatt mit 10 Upgrades
- 8 Welten mit Kamera-Zoom
- 12 Mutationen, Kombo-System, goldene Objekte, Kettenexplosionen
- 4 zufällige Events
- Patch Notes im Spiel und dezenter Update-Hinweis
