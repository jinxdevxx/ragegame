// =====================================================================
//  PATCH NOTES – neueste Version immer OBEN eintragen.
//  Bei jedem Update auch version.json auf dieselbe Version setzen,
//  damit laufende Spiele den "Update verfügbar"-Hinweis bekommen.
// =====================================================================

export const PATCH_NOTES = [
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
