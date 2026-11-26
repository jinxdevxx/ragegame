// =====================================================================
//  PATCH NOTES – neueste Version immer OBEN eintragen.
//  Bei jedem Update auch version.json auf dieselbe Version setzen,
//  damit laufende Spiele den "Update verfügbar"-Hinweis bekommen.
// =====================================================================

export const PATCH_NOTES = [
  {
    version: '0.3.1',
    date: '2026-11-26',
    title: 'Urknall-Fix',
    summary: 'Der Urknall lohnt sich jetzt von Anfang an – und man sieht, was der Masterplan bringt.',
    changes: [
      'Mehr ◆ Dunkle Materie pro Urknall (z. B. am Kontinent ~11 statt ~4). Vorher konnte man nach dem ersten Urknall weniger Schrott haben als vorher.',
      'Anzeige-Fix: Die Schurkenhöhle zeigt jetzt den Masterplan-Bonus. Vorher stand nach dem Urknall „1,00× Schrott“, obwohl Schwarzgeld aktiv war.',
      'Neue Vorschau im Urknall-Reiter: zeigt, mit wie viel Schrott-Bonus du nach dem Urknall startest.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-11-26',
    title: 'Schurkenhöhle & Urknall',
    summary: 'Spielstände, neue Welten bis zum Multiversum, Prestige-System und komplett neu gezeichnete Landschaften.',
    changes: [
      '💾 Spielstände: 3 Speicherplätze mit Namen, Auswahl beim Start, wechselbar im Menü. Dein bisheriger Fortschritt ist automatisch Spielstand 1.',
      '🦹 Aus der Werkstatt wird die Schurkenhöhle: Upgrades in Kategorien (Körper, Kampf, Beute) und 5 neue Upgrades (Kettenreaktion, Chaos-Rausch, Gold-Riecher, Kistenfinder, Auftragskiller).',
      '💥 Urknall (Prestige): Ab dem Kontinent kannst du Schrott und Upgrades sprengen und bekommst dafür ◆ Dunkle Materie für den Bösen Masterplan mit 8 permanenten Boni.',
      '🌌 3 neue Welten nach der Galaxie: Galaxienhaufen, Universum, Multiversum, dazu 3 neue Evolutionen für Grumpf.',
      '🗺 Neue Landschaften: Vorstadt mit Häuserblöcken, Vorgärten, Pools und Zebrastreifen, Stadt mit Parks, Parkplätzen und Plätzen, Gebirge mit Seen, Wäldern, Felsen und Schnee, Kontinent als Weltkarte mit Wolken. Garten, Prärie, Westernstadt, Canyon, Zuckerland und Weltall sind ebenfalls überarbeitet.',
      'Neu gezeichnet: Tanklaster, Tankstelle, Kugeltank, Ölbohrinsel, Staudamm.',
      'Fix: Magnet und Schwarzes Loch haben dich weggeschubst, wenn du nicht genug Schaden hattest. Sie ziehen jetzt nur noch an, was du sofort fressen kannst.',
      'Fix: Kein Zurückprallen mehr an Objekten, die mehrere Schläge brauchen.',
      'Alle Welten laufen flüssig mit ca. 60 FPS.',
    ],
  },
  {
    version: '0.2.2',
    date: '2026-11-26',
    title: 'Einstellungen',
    summary: 'Neues Einstellungsmenü (Esc) – und die Maus steuert standardmäßig gar nicht mehr.',
    changes: [
      'Neues Einstellungsmenü mit Esc (oder ⚙ im Menü/in der Pause): Steuerung, Soundeffekte, Musik, Bildschirmwackeln, Effekt-Menge, Tipps, Spielstand zurücksetzen.',
      'Steuerung wählbar: ⌨ Tastatur (Standard – die Maus steuert gar nicht), 🖱 Maus (linke Taste halten) oder Beides. Auf dem Handy steuert immer der Finger.',
      'Fix: Die Maus konnte „hängen bleiben“, wenn die Taste außerhalb des Fensters losgelassen wurde – das Monster lief dann weiter zur Maus. Passiert jetzt nicht mehr.',
      'Fix: Browser luden nach einem Update teils noch alten Spielcode. Jede Version hat jetzt eigene Datei-Links, Updates kommen sofort an.',
    ],
  },
  {
    version: '0.2.1',
    date: '2026-11-26',
    title: 'Volle Kontrolle',
    summary: 'Das Monster läuft nicht mehr von allein der Maus hinterher.',
    changes: [
      'Steuerung: Mit der Maus läuft das Monster nur noch, solange du die linke Maustaste gedrückt hältst. Loslassen = stehen bleiben.',
      'WASD/Pfeiltasten reagieren jetzt sofort und direkt, ohne Nachrutschen. Pfeiltasten scrollen die Seite nicht mehr.',
      'Hilfe-Fenster und Tutorial erklären die neue Steuerung.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-11-26',
    title: 'Der große Umbau',
    summary: 'Neuer Look, neues Monster, neue Karten, neue Fähigkeiten – RAGEVERSE fühlt sich jetzt wie ein richtiges Spiel an.',
    changes: [
      'Neuer Held: Statt der Kugel steuerst du jetzt Grumpf, ein Wut-Monster mit Hörnern, Zähnen und Schwanz, das in jeder Welt sichtbar evolviert.',
      '6 spielbare Monster: Grumpf, Stachelkönig, Flitzer, Magma-Golem, Goldzahn und Void, jedes mit eigenem Look und eigenen Stärken.',
      'Neue Währung ☠ Chaos: Du bekommst sie nur durch Zerstörung und schaltest damit neue Monster frei. Dazu kommen Meilensteine wie „Zerstöre 1.500 Objekte“.',
      '3 Karten: Vorstadt, Wilder Westen (Prärie, Westernstadt, Canyon) und Zuckerland (Zuckerwiese, Bonbonstadt, Schokogebirge). Neue Karten sind härter, bringen aber deutlich mehr.',
      'Fähigkeiten-Leiste mit Abklingzeiten: ⚡ Ansturm (Leertaste), 💥 Stampfer (E, neu) und 😡 Berserker (R, neu, wird jetzt selbst gezündet).',
      'Hilfe-Fenster und Tutorial erklären Steuerung, Fähigkeiten und alle Systeme.',
      'Komplett neuer Cartoon-Look: Outlines, Böden (Rasen, Straßen, Wüste, Ozean, Weltall …) und über 80 gezeichnete Objekte.',
      'Mehr Wumms: Objekte zerbrechen in fliegende Trümmer. Dazu Treffer-Stopps, Münzregen mit steigendem Ton und Kombo-Rufe von SMASH! bis GOTTMODUS!',
      'Lebendige Welt: Hühner, Katzen und Passanten fliehen. Hindernisse wie Dornenbusch, Rasenmäher, Polizei oder Panzer ziehen Wut ab. Schrottkisten platzen wie Piñatas.',
      'Mini-Aufträge im Run, z. B. „Zerstöre 8× Gartenzwerg“, mit Belohnung.',
      'Musik: Der Beat wird im Run und im Berserker-Modus intensiver.',
      'Fix: Es gibt keine leeren Stellen ohne Objekte mehr, wenn man wächst.',
      'Fix: Der Magnet zieht jetzt sichtbar Schrott und Krümel an (mit Reichweiten-Ring).',
      'Neues Upgrade „Erdbeben“ für den Stampfer und „Berserker“ für schnelleres Aufladen. Neue Mutationen: Jähzorn und Panzerhaut.',
      'Balancing komplett neu: Galaxie nach etwa 20–30 Runs. Nach der Galaxie wird es endlos immer härter.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-11-26',
    title: 'Erste Wut',
    summary: 'Die Grundversion von RAGEVERSE ist spielbar.',
    changes: [
      'Steuere die Wutkugel mit Maus, Touch oder WASD/Pfeiltasten. Leertaste oder Doppeltipp für den Rammstoß (Dash).',
      'Wut-Leiste: Zerstörung füllt sie auf, Stillstand lässt sie leerlaufen. Ist sie leer, endet der Run.',
      '8 Welten: Garten, Straße, Stadt, Gebirge, Kontinent, Planetar, Sonnensystem und Galaxie. Beim Wachsen zoomt die Kamera raus.',
      'Schrott als Währung und ein Shop mit 10 permanenten Upgrades.',
      '12 Mutationen: Bei jedem Welt-Aufstieg wählst du 1 von 3.',
      'Kombo-Multiplikator, goldene Objekte und explosive Kettenreaktionen.',
      'Zufällige Events: Glaswelt, Goldregen, Wutanfall und Meteorschauer.',
      'Patch-Notes-Button und dezenter Update-Hinweis bei neuen Versionen.',
    ],
  },
];

export const VERSION = PATCH_NOTES[0].version;
