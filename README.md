# RAGEVERSE

> Du bist ein Wut-Monster. Zerstöre alles. Wachse. Zerstöre größere Dinge.
> Vom Gartenzwerg bis zur Galaxie.

Du steuerst **Grumpf**, ein kleines, gehörntes Wut-Monster. Alles, was kleiner ist als du, wird zertrümmert. Mit jedem Trümmerteil wächst du, und die Kamera zoomt raus. Aus dem Garten wird die Straße, aus der Straße die Stadt, bis am Ende Galaxien fallen. Mit jeder Welt **evolviert** dein Monster sichtbar.

**Spielen:** https://jinxdevxx.github.io/ragegame/
**Live-Devlog:** https://claude.ai/artifact/H44HiDCZvRHvEJNZ74eZ6E
**Aktuelle Version:** v0.2.1 (siehe [Patch Notes](#patch-notes))

---

## Der Loop

1. **Run starten:** stampfen, rammen, zerstören.
2. **🔥 Wut** ist deine Zeit. Sie sinkt ständig und mit der Zeit immer schneller. Jede Zerstörung füllt sie wieder auf.
3. **⚙ Schrott** fällt als Münzen heraus. Einsammeln! Damit kaufst du in der **Werkstatt** permanente Upgrades.
4. **☠ Chaos** bekommst du nur durch Zerstörung. Damit schaltest du neue **Monster** frei.
5. **Wachsen:** Bist du groß genug, steigst du in die nächste Welt auf, wählst eine **Mutation** und evolvierst.
6. **Neue Karten** schalten sich über deinen Fortschritt frei. Sie sind härter, bringen aber viel mehr.

### Fähigkeiten

| Fähigkeit | PC | Handy | Wirkung | Abklingzeit |
|---|---|---|---|---|
| ⚡ Ansturm | Leertaste / Rechtsklick | Doppeltipp oder ⚡ | Stürmt nach vorne, trifft 2,5× so hart | 2 s (Upgrade „Ansturm“) |
| 💥 Stampfer | E | 💥 | Erdbeben im Umkreis von 3,5× deiner Größe, zerstört alles Zerstörbare | 8 s (Upgrade „Erdbeben“) |
| 😡 Berserker | R | 😡 | Lädt sich durch Zerstörung auf. Gezündet: 6 s riesig, unverwundbar, 3× Schaden, keine Wut-Abnahme | lädt sich auf (Upgrade „Berserker“) |

Steuerung: **linke Maustaste gedrückt halten** (das Monster läuft zur Maus), WASD/Pfeiltasten oder Finger. Ohne gedrückte Taste bleibt das Monster stehen. Pause mit P/Esc. Im Spiel erklärt das **❓ Hilfe**-Fenster alles mit den aktuellen Werten.

### Damit es nicht monoton wird
- **3 Karten mit je 8 Welten:**
  - **Vorstadt:** Garten → Straße → Stadt → Gebirge → Kontinent → Planetar → Sonnensystem → Galaxie, danach endlos.
  - **Wilder Westen:** Prärie → Westernstadt → Canyon → … (×6 Schrott, ×2 Chaos, Objekte 2,2× zäher). Freigeschaltet, sobald du das Gebirge erreichst.
  - **Zuckerland:** Zuckerwiese → Bonbonstadt → Schokogebirge → … (×36 Schrott, ×4 Chaos, Objekte 5,5× zäher). Freigeschaltet, sobald du Planetar erreichst.
- **6 Monster:**

  | Monster | Stärken | Freischalten |
  |---|---|---|
  | Grumpf | ausgewogen, evolviert farblich | Start |
  | Stachelkönig | +35 % Schaden, etwas langsamer | ☠ 1.500 + 1.500 Objekte zerstört |
  | Flitzer | +25 % Tempo, Ansturm 35 % schneller, −10 % Wut | ☠ 4.000 + Stadt erreicht |
  | Magma-Golem | Explosionen ×2, Stampfer +40 %, Hindernisse ½ | ☠ 12.000 + 8.000 Objekte zerstört |
  | Goldzahn | +60 % Schrott, goldene ×2,5, Magnet | ☠ 35.000 + Kontinent erreicht |
  | Void | Berserker +70 % Ladung, +3 s, startet 25 % größer | ☠ 90.000 + Planetar erreicht |

- **Lebendige Welt:** Tiere und Passanten fliehen, Autos und Züge fahren. **Hindernisse** (Dornenbusch, Rasenmäher, Polizei, Panzer, Hubschrauber, Tornado, UFO, Sheriff, Zahnarzt …) ziehen Wut ab, solange sie zu groß für dich sind. Erkennbar am roten ⚠.
- **Mini-Aufträge** im Run, z. B. „Zerstöre 8× Gartenzwerg“, bringen Wut, Schrott, Chaos und Berserker-Ladung.
- **14 Mutationen** beim Welt-Aufstieg (1 aus 3).
- **Kombo** bis ×4 mit Ausrufen: SMASH!, KRAWALL!, AMOK!, UNAUFHALTSAM!, WELTUNTERGANG!, GOTTMODUS!
- **Goldene Objekte** (×6 Schrott), **Schrottkisten** (platzen wie Piñatas), **Kettenexplosionen** (⚠-Fässer).
- **5 Events:** Glaswelt, Goldregen, Wutanfall, Meteorschauer, Kistenregen.
- **Juice:** fliegende Trümmer, Treffer-Stopps, Bildschirmwackeln, Münzregen mit steigendem Ton, Beat, der im Berserker-Modus eskaliert.

---

## Projektstruktur

```
index.html            Seite + alle Menüs und das HUD
css/style.css         Aussehen von Menüs, HUD und Fähigkeiten-Leiste
js/config.js          ★ BALANCING & INHALTE: Werte, Welten, Karten, Objekte, Monster, Upgrades, Mutationen, Events
js/game.js            Spiel-Logik (Bewegung, Kollision, Wachstum, Spawning, Fähigkeiten, Aufträge, Wut, Schrott, Chaos)
js/render.js          Zeichnen: Böden, Objekte, Trümmer, Münzen, Effekte
js/sprites.js         Die gezeichneten Objekte (über 80 Formen)
js/monster.js         Die spielbaren Monster inkl. Evolution
js/main.js            Game-Loop, Steuerung, Menüs, Werkstatt, Monster, Karten, Hilfe, Patch Notes, Update-Hinweis
js/audio.js           Sounds und Musik (per WebAudio erzeugt)
js/save.js            Spielstand im Browser (localStorage)
js/patchnotes.js      Patch Notes (neueste oben) + aktuelle Version
version.json          Live-Version für den „Update verfügbar“-Hinweis
tools/balance-sim.js  Bot spielt Runs ohne Grafik → prüft das Balancing
tools/skill-test.js   Prüft automatisch, ob jedes Upgrade, jede Fähigkeit, Mutation und jedes Monster wirkt
```

### Lokal starten
Kein Build-Schritt nötig:

```bash
python3 -m http.server 8080
```

Dann http://localhost:8080 öffnen.

**Test-Parameter in der URL:** `?world=3` (direkt in Welt 3), `?upgrades=10`, `?scrap=100000`, `?chaos=5000`, `?map=west`, `?char=golem`, `?unlock=1` (alles freischalten). Diese Werte gelten nur für die aktuelle Sitzung, gespeichert wird erst nach einem Run oder Kauf.

### Prüfen vor jedem Update

```bash
node tools/skill-test.js
```

```bash
node tools/balance-sim.js 3
```

```bash
node tools/balance-sim.js 2 west
```

Der **Skill-Test** muss mit „0 fehlgeschlagen“ enden. Der **Simulator** zeigt, wie weit ein Bot je Upgrade-Stufe kommt, wie viel Leerlauf es gibt (Zeit ohne zerstörbare Objekte in Sicht, Ziel ≈ 0 %) und eine Progression über 60 Runs.

**Ziel-Kurve Vorstadt (Bot, v0.2.0):**

| Welt | ab Run |
|---|---|
| Straße | 1–3 |
| Stadt | ~4 |
| Gebirge | ~6 |
| Kontinent | ~7 |
| Planetar | ~9 |
| Sonnensystem | ~15 |
| Galaxie | ~20 |

Ein Mensch ist meist langsamer als der Bot, realistisch sind eher 25–40 Runs bis zur Galaxie. Danach wird es endlos immer härter (jede ×4 Größe zählt wie eine neue Welt). Die Monster-Freischaltungen verteilen sich über etwa Run 6 (Stachelkönig) bis Run 50+ (Void).

### Neues Update veröffentlichen
1. Änderungen machen, dann Skill-Test und Simulator laufen lassen.
2. In `js/patchnotes.js` einen neuen Eintrag **oben** einfügen.
3. In `version.json` dieselbe Versionsnummer eintragen.
4. Auf `main` pushen. Wer das Spiel offen hat, bekommt unten links dezent den Hinweis „Update verfügbar“. Beim nächsten Start erscheint kurz „Neu in vX“, und am Patch-Notes-Button leuchtet ein Punkt.
5. Live-Devlog und die Session „ragegame · Live-Updates“ aktualisieren.

---

## Roadmap

- **Prestige „Urknall“:** nach der Galaxie alles zurücksetzen und dafür einen permanenten Bonus bekommen.
- **Boss-Objekte** pro Welt, die sich wehren.
- **Farb-Skins** für jedes Monster (mit Chaos).
- **Erfolge & Statistiken.**
- **Tägliche Herausforderung** mit festem Seed.

---

## Dev-Log

### 2026-11-26: v0.2.1 Volle Kontrolle
- Feedback: Das Monster lief automatisch der Maus hinterher, auch ohne Klick. Jetzt läuft es nur, solange die linke Maustaste gedrückt ist; loslassen = stehen bleiben (auch wenn die Taste außerhalb des Spielfelds losgelassen wird). Rechtsklick bleibt Ansturm.
- WASD/Pfeiltasten direkter: Beschleunigung von 10 auf 18 erhöht (kein träges Nachrutschen mehr), Pfeiltasten und Leertaste scrollen die Seite nicht mehr, gedrückt gehaltene Leertaste löst nicht dauernd Ansturm aus.

### 2026-11-26: v0.2.0 Der große Umbau
Feedback nach dem ersten Anspielen: Der Ball-Look gefällt nicht, das Early Game ist eintönig, es fehlen Dopamin-Momente. Außerdem sind Fähigkeiten nirgends erklärt, der Magnet tut scheinbar nichts, und beim Wachsen entstehen leere Stellen.
- **Neuer Charakter & Look:** Monster statt Kugel, mit Evolution pro Welt. Cartoon-Stil mit Outlines, Objekte stehen aufrecht, echte Böden je Welt. Über 80 Objekt-Grafiken.
- **6 Monster, ☠ Chaos-Währung, 3 Karten** (siehe oben).
- **Fähigkeiten:** Stampfer (E) neu, Berserker wird jetzt selbst gezündet (R). Fähigkeiten-Leiste mit Abklingzeit-Anzeige, Hilfe-Fenster und Tutorial-Hinweise in den ersten Runs.
- **Juice:** Trümmerstücke mit Physik, Treffer-Stopps, Münzen fliegen und klingen höher, Kombo-Ausrufe, Staubwolken, Trümmer am Boden, Flash bei Explosionen, Musik.
- **Bug: leere Stellen.** Objekte entstanden nur außerhalb des Bildschirms. Wenn man wuchs, wurden alle Objekte zu Krümeln, und um einen herum war nichts mehr. Jetzt ploppen Objekte bei Lücken direkt in der Nähe auf. Der Simulator misst „Leerlauf“: vorher deutlich, jetzt ≈ 0 %.
- **Bug: Magnet.** Er zog Münzen nur +0,75 Körpergrößen pro Stufe weiter an (kaum sichtbar) und Krümel gar nicht, obwohl es so beschrieben war. Jetzt +1,2 Körpergrößen pro Stufe, mit sichtbarem Reichweiten-Ring, und Krümel werden eingesaugt.
- **Neuer Skill-Test** (`tools/skill-test.js`, 45 Prüfungen). Er hat zwei weitere Bugs gefunden: Beim Zünden des Berserkers wurde noch einen Frame lang Wut abgezogen, und die Mutation „Explosiv“ war zu schwach, um Nachbarn mitzureißen. Beides ist behoben.
- **Performance-Bug:** Canvas-Filter für „zu große“ Objekte drückten die Bildrate auf 2 FPS. Ersetzt, jetzt 60 FPS.
- **Balancing in 4 Durchläufen mit dem Simulator:**
  1. Ohne Anpassung war es viel zu leicht (ohne Upgrades schon Stadt, Runs endeten nie).
  2. Endlos-Modus: Jede ×4 Größe nach der Galaxie zählt wie eine neue Welt.
  3. Weniger Grundwachstum, Welten zäher (HP ×2,5, Wachstum ×0,62, Wut-Verlust ×1,14 pro Welt), Schrott ×3 pro Welt statt ×4, Upgrades teurer.
  4. Ergebnis: Galaxie nach ~20 Runs beim Bot statt nach 4.
- Browser-Test aller Bildschirme und Karten (Desktop + Handy) ohne Konsolenfehler. Gefixt: Auf dem Handy überlappte die Ecke mit den Patch-Notes-Knöpfen die Fähigkeiten-Leiste, der Roller-Fahrer war riesig, über kleinen Objekten stand „+0“.

### 2026-11-26: v0.1.0 Grundversion
- Grundgerüst gebaut: reines HTML5-Canvas, kein Framework, kein Build. Läuft auf GitHub Pages und dem Handy.
- Erster Balancing-Durchlauf mit Bot-Simulator: von „Galaxie nach 3 Runs“ auf „etwa 23 Runs“ eingestellt.
- Live-Devlog in Claude angelegt (Stand, Patch-Notes-Historie, Roadmap, Ideen-Pool, PLAY-Button).
- Session „ragegame · Live-Updates“ angelegt: Sie bekommt nach jedem Update eine Zusammenfassung.
- Täglicher Qualitäts-Check eingerichtet (20:13 Uhr): Bugs, Balancing und Spielgefühl prüfen, danach README, Patch Notes und Devlog pflegen.
- Grundversion auf `main` gebracht, GitHub Pages ist aktiv.
- Festgelegt: Getestete Änderungen gehen ab jetzt immer direkt auf `main` und damit sofort live.

---

## Patch Notes

Die vollständigen Patch Notes stehen im Spiel (Button unten links) und in `js/patchnotes.js`.

### v0.2.1: Volle Kontrolle (2026-11-26)
- Maus-Steuerung nur noch bei gedrückter linker Maustaste

### v0.2.0: Der große Umbau (2026-11-26)
- Neues Monster statt Kugel, mit Evolution in jeder Welt
- 6 spielbare Monster, neue Währung ☠ Chaos
- 3 Karten: Vorstadt, Wilder Westen, Zuckerland
- Fähigkeiten-Leiste: Ansturm, Stampfer (neu), Berserker (jetzt manuell), Hilfe-Fenster
- Neuer Cartoon-Look mit über 80 Objekten, Trümmer-Physik, Kombo-Ausrufe, Musik
- Fliehende Tiere, Hindernisse, Schrottkisten, Mini-Aufträge
- Fixes: keine leeren Stellen mehr, Magnet funktioniert, 60 FPS
- Neues Balancing

### v0.1.0: Erste Wut (2026-11-26)
- Grundversion mit Wutkugel, Werkstatt, 8 Welten, Mutationen, Events
