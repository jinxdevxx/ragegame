// =====================================================================
//  PATCH NOTES – neueste Version immer OBEN eintragen.
//  Bei jedem Update auch version.json auf dieselbe Version setzen,
//  damit laufende Spiele den "Update verfügbar"-Hinweis bekommen.
// =====================================================================

export const PATCH_NOTES = [
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
