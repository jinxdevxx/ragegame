// =====================================================================
//  RAGEVERSE – BALANCING & INHALTE
//  Alle Zahlen, die das Spielgefühl bestimmen, stehen hier.
//  Werte ändern → Seite neu laden → sofort testen.
// =====================================================================

export const GAME_NAME = 'RAGEVERSE';

// ---------------------------------------------------------------------
// Grundwerte des Monsters (vor Upgrades)
// ---------------------------------------------------------------------
export const PLAYER = {
  startRadius: 10,        // Größe beim Start eines Runs (Welt-Einheiten)
  speed: 5.2,             // Tempo in "eigenen Radien pro Sekunde"
  accel: 10,              // wie schnell man auf Zielspeed kommt
  damage: 1.0,            // Schadensfaktor pro Schlag
  breakRatio: 1.05,       // Objekte bis zu (Radius × breakRatio) sind zerstörbar
  crumbRatio: 0.35,       // Objekte unter (Radius × crumbRatio) zerbröseln sofort bei Berührung
  absorb: 0.17,           // Anteil der Objekt-Masse, die man beim Zerstören aufnimmt
  rageMax: 100,
  rageDrain: 8,           // Wut-Verlust pro Sekunde
  rageDrainGrowth: 0.03,  // Drain steigt pro Sekunde Laufzeit um diesen Anteil (Druck steigt)
  ragePerKill: 7,         // Basis-Wut pro Zerstörung (skaliert mit Objektgröße)
  dashCooldown: 2.0,      // Sekunden
  dashPower: 3.2,         // Speed-Multiplikator beim Stampfer-Ansturm
  dashTime: 0.24,
  magnet: 0,              // Schrott-Anziehung (in Radien)
};

// Kombo: Zerstörungen innerhalb von window Sekunden erhöhen den Multiplikator
export const COMBO = {
  window: 1.5,
  perStep: 0.1,   // +10 % Schrott pro Kombo-Stufe
  max: 4.0,       // maximaler Multiplikator
  callouts: [     // Ausrufe bei Kombo-Stufen
    [10, 'SMASH!'], [20, 'KRAWALL!'], [35, 'AMOK!'], [50, 'UNAUFHALTSAM!'], [75, 'WELTUNTERGANG!'], [110, 'GOTTMODUS!'],
  ],
};

// Berserker-Modus: füllt sich durch Zerstörung, dann kurz riesig & unaufhaltsam
export const BERSERK = {
  perKill: 0.02,       // Füllung pro Zerstörung (× Größenfaktor); bei voller Leiste mit R zünden
  duration: 6,         // Sekunden
  sizeBoost: 1.3,      // optisch + Trefferzone größer
  breakBoost: 1.6,     // zerstört bis 160 % der eigenen Größe
  damageMult: 3,
  speedMult: 1.2,
};

export const GOLDEN_CHANCE = 0.025;  // Chance auf goldenes Objekt
export const GOLDEN_MULT = 6;         // Schrott-Multiplikator goldener Objekte
export const CRATE_CHANCE = 0.03;     // Chance, dass statt eines Objekts eine Schrottkiste spawnt
export const CRATE_MULT = 10;         // Schrott-Inhalt einer Kiste (× Objektwert)
export const SCRAP_SCALE = 0.12;      // globaler Schrott-Faktor

// Jede Welt ist härter als die davor (Faktor pro Welt-Stufe):
export const WORLD_SCALING = {
  hp: 2.5,         // Objekte halten mehr aus  → Wucht-Upgrades werden wichtig
  absorb: 0.62,    // man wächst langsamer     → Hunger-Upgrades werden wichtig
  rageDrain: 1.14, // Wut sinkt schneller      → Wut-Upgrades werden wichtig
};

// ☠ Chaos: zweite Währung, nur durch Zerstörung – schaltet Monster frei
export const CHAOS = {
  perKill: 1,          // pro Zerstörung
  bigBonus: 2,         // + pro Objekt, das größer ist als du (× Größenverhältnis)
  questBonus: 25,      // pro erfülltem Auftrag
};

// Evolution des Monsters – eine Stufe pro Welt
export const EVOLUTION = [
  { name: 'Wutzwerg',        body: '#e8432e', belly: '#ffc29a', horn: '#fff1d6', dark: '#7a1410' },
  { name: 'Krawallo',        body: '#e0342f', belly: '#ffc07a', horn: '#fff1d6', dark: '#6e1210' },
  { name: 'Zerstörer',       body: '#c6262e', belly: '#ff9d6a', horn: '#3a2222', dark: '#5a0e12' },
  { name: 'Steinkoloss',     body: '#9a4a34', belly: '#e0b08a', horn: '#3a2a22', dark: '#4a2218' },
  { name: 'Lavatitan',       body: '#4a1c1a', belly: '#ff7a2a', horn: '#1c0f0d', dark: '#1c0806' },
  { name: 'Weltenfresser',   body: '#6a2bd9', belly: '#ff9ae0', horn: '#ffe9ff', dark: '#2a0f5a' },
  { name: 'Sonnenschlinger', body: '#ff6a1f', belly: '#ffe46a', horn: '#fff8d0', dark: '#8a2a00' },
  { name: 'Galaxienfresser', body: '#22155a', belly: '#8a6bff', horn: '#ffffff', dark: '#0a0520' },
];

// ---------------------------------------------------------------------
// Welten
// Objekt-Felder:
//   size       Radius in Welt-Einheiten
//   shape      Zeichen-Funktion in render.js
//   color      Hauptfarbe
//   value      Schrottwert (× Welt-Multiplikator)
//   explosive  explodiert und reißt alles mit
//   move       'flee' (flieht), 'drive' (fährt geradeaus), 'wander' (läuft herum)
//   speed      Tempo in eigenen Größen pro Sekunde
//   hazard     Wut-Schaden (% der Max-Wut), wenn man es berührt, aber (noch) nicht zerstören kann
// ---------------------------------------------------------------------
export const WORLDS = [
  {
    id: 'garden', name: 'Garten', minRadius: 0, scrapMult: 1, ground: 'lawn',
    bg: '#63b34c', bg2: '#5aa644', accent: '#4e9a3d',
    objects: [
      { name: 'Grashalm', size: 3, shape: 'blade', color: '#86d65d', value: 1 },
      { name: 'Gänseblümchen', size: 3.5, shape: 'flower', color: '#ffffff', value: 1 },
      { name: 'Blume', size: 4.5, shape: 'flower', color: '#ff6fa8', value: 2 },
      { name: 'Tulpe', size: 4.5, shape: 'tulip', color: '#ffcf33', value: 2 },
      { name: 'Pilz', size: 5, shape: 'mushroom', color: '#e84a3c', value: 2 },
      { name: 'Schnecke', size: 4.5, shape: 'snail', color: '#d9a35a', value: 2, move: 'wander', speed: 0.3 },
      { name: 'Huhn', size: 7, shape: 'chicken', color: '#ffffff', value: 4, move: 'flee', speed: 3.2 },
      { name: 'Gartenzwerg', size: 7.5, shape: 'gnome', color: '#3b6fd6', value: 4 },
      { name: 'Gießkanne', size: 8.5, shape: 'can', color: '#4fb3a9', value: 4 },
      { name: 'Blumentopf', size: 9, shape: 'pot', color: '#d9743f', value: 5 },
      { name: 'Gasflasche', size: 8.5, shape: 'tank', color: '#e03a3a', value: 6, explosive: true },
      { name: 'Katze', size: 10, shape: 'cat', color: '#f29b38', value: 7, move: 'flee', speed: 3.6 },
      { name: 'Dornenbusch', size: 12, shape: 'bush', color: '#3c8a3a', value: 8, hazard: 12 },
      { name: 'Gartenstuhl', size: 12, shape: 'chair', color: '#f2f2f2', value: 7 },
      { name: 'Rasenmäher', size: 14, shape: 'mower', color: '#e8462e', value: 10, move: 'drive', speed: 1.4, hazard: 16 },
      { name: 'Grill', size: 14, shape: 'grill', color: '#3a3a3a', value: 9, explosive: true },
      { name: 'Hundehütte', size: 20, shape: 'house', color: '#c47f3e', value: 14 },
      { name: 'Gartenhaus', size: 30, shape: 'house', color: '#8a5a2b', value: 22 },
    ],
  },
  {
    id: 'street', name: 'Straße', minRadius: 40, scrapMult: 3, ground: 'street',
    bg: '#c9ccd3', bg2: '#4d5059', accent: '#f5d14a',
    objects: [
      { name: 'Pylon', size: 9, shape: 'cone', color: '#ff8a1f', value: 1 },
      { name: 'Hydrant', size: 11, shape: 'hydrant', color: '#e23b3b', value: 2 },
      { name: 'Passant', size: 12, shape: 'person', color: '#4a7fd9', value: 3, move: 'flee', speed: 2.8 },
      { name: 'Mülltonne', size: 14, shape: 'bin', color: '#2f8a4a', value: 3 },
      { name: 'Briefkasten', size: 14, shape: 'mailbox', color: '#f5c518', value: 3 },
      { name: 'Ampel', size: 20, shape: 'trafficlight', color: '#2b2b2b', value: 4 },
      { name: 'Roller', size: 20, shape: 'scooter', color: '#56c2ff', value: 5, move: 'drive', speed: 2.2 },
      { name: 'Auto', size: 32, shape: 'car', color: '#e84a5f', value: 8, move: 'drive', speed: 1.8 },
      { name: 'Taxi', size: 32, shape: 'car', color: '#ffd23f', value: 9, move: 'drive', speed: 2.0 },
      { name: 'Polizeiauto', size: 40, shape: 'police', color: '#f4f6ff', value: 14, move: 'drive', speed: 2.2, hazard: 15 },
      { name: 'Tankwagen', size: 50, shape: 'tank', color: '#e03a3a', value: 14, explosive: true },
      { name: 'Bushaltestelle', size: 52, shape: 'shelter', color: '#8fb3d9', value: 12 },
      { name: 'Kiosk', size: 70, shape: 'house', color: '#e8a94a', value: 18 },
      { name: 'Bus', size: 95, shape: 'bus', color: '#f2a03d', value: 26, move: 'drive', speed: 1.0 },
    ],
  },
  {
    id: 'city', name: 'Stadt', minRadius: 160, scrapMult: 9, ground: 'city',
    bg: '#a7acba', bg2: '#3c3f4c', accent: '#7fd3ff',
    objects: [
      { name: 'Laterne', size: 36, shape: 'streetlamp', color: '#ffe48a', value: 1 },
      { name: 'Auto', size: 44, shape: 'car', color: '#4bd1a0', value: 2, move: 'drive', speed: 1.8 },
      { name: 'Passanten', size: 50, shape: 'person', color: '#d94a8a', value: 2, move: 'flee', speed: 2.5 },
      { name: 'Wohnhaus', size: 80, shape: 'building', color: '#e0b48a', value: 5 },
      { name: 'Laden', size: 95, shape: 'shop', color: '#e07a5f', value: 6 },
      { name: 'Tankstelle', size: 115, shape: 'tank', color: '#e03a3a', value: 10, explosive: true },
      { name: 'Panzer', size: 120, shape: 'tankmil', color: '#6a8a40', value: 14, move: 'drive', speed: 0.8, hazard: 20 },
      { name: 'Kirche', size: 150, shape: 'church', color: '#e0d6c4', value: 10 },
      { name: 'Bürohaus', size: 190, shape: 'building', color: '#7fa7c9', value: 13 },
      { name: 'Hochhaus', size: 280, shape: 'tower', color: '#5d7fa3', value: 20 },
      { name: 'Kran', size: 320, shape: 'crane', color: '#ffb21f', value: 18 },
      { name: 'Stadion', size: 460, shape: 'stadium', color: '#9bd36b', value: 34 },
    ],
  },
  {
    id: 'mountains', name: 'Gebirge', minRadius: 640, scrapMult: 27, ground: 'alpine',
    bg: '#86a872', bg2: '#77995f', accent: '#eef3f6',
    objects: [
      { name: 'Tanne', size: 140, shape: 'pine', color: '#2f7d4a', value: 1 },
      { name: 'Bergziege', size: 150, shape: 'goat', color: '#f2efe6', value: 2, move: 'flee', speed: 3 },
      { name: 'Felsen', size: 200, shape: 'rock', color: '#a3a3a3', value: 2 },
      { name: 'Berghütte', size: 230, shape: 'house', color: '#8a5a2b', value: 3 },
      { name: 'Hubschrauber', size: 300, shape: 'heli', color: '#d94141', value: 7, move: 'wander', speed: 1.6, hazard: 15 },
      { name: 'Wald', size: 400, shape: 'forest', color: '#2a7a44', value: 5 },
      { name: 'Gasspeicher', size: 460, shape: 'tank', color: '#e03a3a', value: 9, explosive: true },
      { name: 'Staudamm', size: 800, shape: 'dam', color: '#a5afb6', value: 12 },
      { name: 'Berg', size: 1150, shape: 'mountain', color: '#8a96a3', value: 18 },
      { name: 'Vulkan', size: 1350, shape: 'volcano', color: '#5a3b33', value: 24, explosive: true },
    ],
  },
  {
    id: 'continent', name: 'Kontinent', minRadius: 2560, scrapMult: 81, ground: 'ocean',
    bg: '#2f86c9', bg2: '#2a78b6', accent: '#9fdcff',
    objects: [
      { name: 'Schiff', size: 500, shape: 'ship', color: '#ececec', value: 1, move: 'drive', speed: 1 },
      { name: 'Dorf', size: 600, shape: 'village', color: '#e0b48a', value: 1 },
      { name: 'Insel', size: 850, shape: 'island', color: '#f0d58a', value: 2 },
      { name: 'Ölbohrinsel', size: 1000, shape: 'tank', color: '#e03a3a', value: 4, explosive: true },
      { name: 'Tornado', size: 1300, shape: 'tornado', color: '#cfd8e2', value: 8, move: 'wander', speed: 1.4, hazard: 20 },
      { name: 'Großstadt', size: 1600, shape: 'metropolis', color: '#9aa5c9', value: 5 },
      { name: 'Wüste', size: 2400, shape: 'island', color: '#f0c36a', value: 7 },
      { name: 'Gebirgskette', size: 3200, shape: 'mountain', color: '#7d8a76', value: 10 },
      { name: 'Regenwald', size: 4200, shape: 'forest', color: '#1f7a3c', value: 13 },
      { name: 'Supervulkan', size: 5400, shape: 'volcano', color: '#5a2f2a', value: 18, explosive: true },
      { name: 'Kontinent', size: 8000, shape: 'island', color: '#7cc05f', value: 26 },
    ],
  },
  {
    id: 'planet', name: 'Planetar', minRadius: 10240, scrapMult: 243, ground: 'space',
    bg: '#161c40', bg2: '#232a5c', accent: '#7fd3ff',
    objects: [
      { name: 'Satellit', size: 2200, shape: 'satellite', color: '#c9d4e6', value: 1, move: 'drive', speed: 1.2 },
      { name: 'Raumstation', size: 3500, shape: 'station', color: '#d9dde6', value: 2 },
      { name: 'Asteroid', size: 4500, shape: 'rock', color: '#8a7a6a', value: 2, move: 'drive', speed: 0.8 },
      { name: 'UFO', size: 5000, shape: 'ufo', color: '#7fe07f', value: 7, move: 'wander', speed: 1.6, hazard: 15 },
      { name: 'Treibstofflager', size: 5000, shape: 'tank', color: '#e03a3a', value: 4, explosive: true },
      { name: 'Mond', size: 9000, shape: 'planet', color: '#c9c9c9', value: 6 },
      { name: 'Eisplanet', size: 16000, shape: 'planet', color: '#9fe3ff', value: 10 },
      { name: 'Erde 2', size: 21000, shape: 'earth', color: '#3d8bd9', value: 14 },
      { name: 'Lavaplanet', size: 27000, shape: 'planet', color: '#e0642a', value: 18, explosive: true },
    ],
  },
  {
    id: 'solar', name: 'Sonnensystem', minRadius: 40960, scrapMult: 729, ground: 'space',
    bg: '#100d2a', bg2: '#22194a', accent: '#ffd23f',
    objects: [
      { name: 'Komet', size: 9000, shape: 'comet', color: '#bfe8ff', value: 1, move: 'drive', speed: 2 },
      { name: 'Mond', size: 14000, shape: 'planet', color: '#c9c9c9', value: 2 },
      { name: 'Kampfstern', size: 22000, shape: 'ufo', color: '#ff5a5a', value: 8, move: 'wander', speed: 1.4, hazard: 20 },
      { name: 'Felsplanet', size: 27000, shape: 'planet', color: '#c97a4a', value: 4 },
      { name: 'Ringplanet', size: 54000, shape: 'ringplanet', color: '#e6c98a', value: 8 },
      { name: 'Gasriese', size: 80000, shape: 'planet', color: '#d99a6a', value: 12 },
      { name: 'Roter Zwerg', size: 100000, shape: 'star', color: '#ff6a3d', value: 16, explosive: true },
      { name: 'Sonne', size: 135000, shape: 'star', color: '#ffd23f', value: 24, explosive: true },
    ],
  },
  {
    id: 'galaxy', name: 'Galaxie', minRadius: 163840, scrapMult: 2187, ground: 'space',
    bg: '#0b0722', bg2: '#26114f', accent: '#b06bff',
    objects: [
      { name: 'Sonnensystem', size: 36000, shape: 'ringplanet', color: '#ffd23f', value: 1 },
      { name: 'Roter Riese', size: 80000, shape: 'star', color: '#ff5a3d', value: 3, explosive: true },
      { name: 'Nebel', size: 140000, shape: 'nebula', color: '#b06bff', value: 5 },
      { name: 'Sternhaufen', size: 230000, shape: 'cluster', color: '#9fd0ff', value: 8 },
      { name: 'Neutronenstern', size: 270000, shape: 'star', color: '#e6f4ff', value: 12, explosive: true },
      { name: 'Schwarzes Loch', size: 460000, shape: 'blackhole', color: '#000000', value: 22 },
      { name: 'Zwerggalaxie', size: 720000, shape: 'galaxy', color: '#6bd0ff', value: 34 },
    ],
  },
];

// ---------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------
export const SPAWN = {
  density: 85,          // Anzahl relevanter Objekte im Umkreis
  areaViews: 1.5,       // Spawn-Radius in "Bildschirm-Halbdiagonalen"
  despawnViews: 2.6,
  minRel: 0.16,         // kleinste Objekte relativ zum Spieler
  maxRel: 3.2,          // größte Objekte relativ zum Spieler
  nextWorldPeek: 0.25,  // Chance-Gewicht für Objekte aus der nächsten Welt
  sweetSpot: 0.55,      // häufigste Objektgröße relativ zum Spieler
};

// ---------------------------------------------------------------------
// Mini-Aufträge während eines Runs
// ---------------------------------------------------------------------
export const QUESTS = {
  firstAfter: 4,        // Sekunden bis zum ersten Auftrag
  pause: 3,             // Pause zwischen Aufträgen
  rageReward: 0.4,      // Wut-Auffüllung (Anteil)
  berserkReward: 0.35,  // Berserker-Füllung
  scrapReward: 25,      // × Welt-Multiplikator
};

// ---------------------------------------------------------------------
// Permanente Upgrades (Werkstatt zwischen den Runs)
// cost = base × growth^level
// ---------------------------------------------------------------------
export const UPGRADES = [
  { id: 'size',    name: 'Startgröße',  icon: '🦖', desc: 'Du startest größer.',                         base: 75, growth: 2.05, max: 40, per: 0.12 },
  { id: 'rage',    name: 'Wut-Tank',    icon: '🔥', desc: 'Mehr maximale Wut = längere Runs.',             base: 45, growth: 1.95, max: 40, per: 0.12 },
  { id: 'calm',    name: 'Dauerwut',    icon: '⏳', desc: 'Wut sinkt langsamer.',                           base: 90, growth: 2.10,  max: 25, per: 0.05 },
  { id: 'dmg',     name: 'Wucht',       icon: '👊', desc: 'Mehr Schaden pro Schlag.',                       base: 60, growth: 2.00,  max: 40, per: 0.15 },
  { id: 'hard',    name: 'Härte',       icon: '🪨', desc: 'Zerstöre Objekte, die größer sind als du.',     base: 150, growth: 2.20,  max: 15, per: 0.06 },
  { id: 'speed',   name: 'Tempo',       icon: '💨', desc: 'Schneller stampfen.',                            base: 45, growth: 1.95, max: 30, per: 0.06 },
  { id: 'absorb',  name: 'Hunger',      icon: '🍖', desc: 'Wachse schneller durch Zerstörung.',             base: 105, growth: 2.15, max: 30, per: 0.08 },
  { id: 'scrap',   name: 'Schrottgier', icon: '💰', desc: 'Mehr Schrott pro Objekt.',                       base: 90, growth: 2.05, max: 40, per: 0.15 },
  { id: 'magnet',  name: 'Magnet',      icon: '🧲', desc: 'Zieht Schrott und kleine Krümel aus der Ferne an.', base: 105, growth: 2.10,  max: 20, per: 0.6 },
  { id: 'slam',    name: 'Erdbeben',    icon: '💥', desc: 'Stampfer (E): größerer Radius, kürzere Abklingzeit.', base: 120, growth: 2.15, max: 20, per: 0.06 },
  { id: 'dash',    name: 'Ansturm',     icon: '⚡', desc: 'Stampfer-Ansturm lädt schneller auf.',           base: 90, growth: 2.10,  max: 20, per: 0.06 },
  { id: 'berserk', name: 'Berserker',   icon: '😡', desc: 'Berserker-Modus füllt sich schneller.',          base: 135, growth: 2.15, max: 20, per: 0.1 },
];

// ---------------------------------------------------------------------
// Mutationen – bei jedem Welt-Aufstieg 1 aus 3 wählen (nur für diesen Run)
// ---------------------------------------------------------------------
export const MUTATIONS = [
  { id: 'boom',     name: 'Explosiv',       icon: '💣', desc: 'Jede Zerstörung macht eine kleine Explosion.' },
  { id: 'spikes',   name: 'Stacheln',       icon: '🦔', desc: '+60 % Schaden.' },
  { id: 'turbo',    name: 'Turbo',          icon: '💨', desc: '+30 % Tempo.' },
  { id: 'greed',    name: 'Gier',           icon: '💰', desc: '+60 % Schrott.' },
  { id: 'zen',      name: 'Kochende Ruhe',  icon: '🧘', desc: 'Wut sinkt 30 % langsamer.' },
  { id: 'hole',     name: 'Schwarzes Loch', icon: '🌀', desc: 'Saugt kleine Objekte an.' },
  { id: 'shock',    name: 'Schockwelle',    icon: '🔊', desc: 'Alle 4 s eine Druckwelle um dich herum.' },
  { id: 'glutton',  name: 'Vielfraß',       icon: '😋', desc: '+40 % Wachstum.' },
  { id: 'hardhead', name: 'Dickschädel',    icon: '🪖', desc: 'Zerstöre noch größere Objekte (+20 %).' },
  { id: 'frenzy',   name: 'Raserei',        icon: '⏱', desc: 'Kombo-Fenster doppelt so lang.' },
  { id: 'dashmore', name: 'Dauer-Ansturm',  icon: '⚡', desc: 'Ansturm lädt 2× so schnell und trifft 2× so hart.' },
  { id: 'golden',   name: 'Goldrausch',     icon: '✨', desc: 'Goldene Objekte 4× häufiger.' },
  { id: 'rager',    name: 'Jähzorn',        icon: '🤬', desc: 'Berserker-Modus füllt sich doppelt so schnell.' },
  { id: 'armor',    name: 'Panzerhaut',     icon: '🛡', desc: 'Hindernisse tun nur noch halb so weh.' },
];

// ---------------------------------------------------------------------
// Zufällige Events während eines Runs
// ---------------------------------------------------------------------
export const EVENTS = {
  firstAfter: 22,     // Sekunden bis zum ersten möglichen Event
  every: [25, 40],    // Abstand zwischen Events (min, max)
  duration: 10,
  list: [
    { id: 'glass',  name: 'GLASWELT!',      desc: 'Alles zerbricht mit einem Schlag' },
    { id: 'gold',   name: 'GOLDREGEN!',     desc: 'Viele goldene Objekte' },
    { id: 'frenzy', name: 'WUTANFALL!',     desc: 'Wut sinkt nicht' },
    { id: 'meteor', name: 'METEORSCHAUER!', desc: 'Meteore zerschlagen alles um dich' },
    { id: 'crates', name: 'KISTENREGEN!',   desc: 'Überall Schrottkisten' },
  ],
};

// ---------------------------------------------------------------------
// Fähigkeiten (aktiv auslösbar)
// ---------------------------------------------------------------------
export const ABILITIES = {
  dash:    { key: 'Leertaste', short: '␣', name: 'Ansturm',   icon: '⚡', desc: 'Stürmt nach vorne und trifft 2,5× so hart.' },
  slam:    { key: 'E', short: 'E', name: 'Stampfer',  icon: '💥', desc: 'Erdbeben um dich herum – zerlegt alles in der Nähe, was du zerstören kannst.',
             cooldown: 8, radius: 3.5, damage: 2.2 },
  berserk: { key: 'R', short: 'R', name: 'Berserker', icon: '😡', desc: 'Lädt sich durch Zerstörung auf. Voll? Zünden: riesig, unverwundbar, 3× Schaden, keine Wut-Abnahme.' },
};

// ---------------------------------------------------------------------
// Monster (spielbare Charaktere) – freischalten mit ☠ Chaos
//   perks: Multiplikatoren auf die Grundwerte
//   req:   Meilenstein, der zusätzlich erreicht sein muss
// ---------------------------------------------------------------------
export const CHARACTERS = [
  { id: 'grumpf', name: 'Grumpf', type: 'monster', title: 'Der Klassiker',
    desc: 'Ausgewogen, stur und immer schlecht gelaunt. Evolviert mit jeder Welt.',
    colors: null, perks: {}, cost: 0, req: null },
  { id: 'stachel', name: 'Stachelkönig', type: 'spiky', title: 'Zerfetzer',
    desc: '+35 % Schaden. Seine Stacheln reißen alles auf. Etwas langsamer.',
    colors: { body: '#3f8a4f', belly: '#d6f0a8', horn: '#fff6dc', dark: '#14361c' },
    perks: { damage: 1.35, speed: 0.92 }, cost: 1500, req: { kills: 1500, label: 'Zerstöre insgesamt 1.500 Objekte' } },
  { id: 'flitzer', name: 'Flitzer', type: 'lizard', title: 'Sprinter',
    desc: '+25 % Tempo, Ansturm lädt 35 % schneller. Dafür 10 % kleinerer Wut-Tank.',
    colors: { body: '#2fb8d9', belly: '#fff2a8', horn: '#ffffff', dark: '#0b3a4a' },
    perks: { speed: 1.25, dash: 0.65, rage: 0.9 }, cost: 4000, req: { world: 2, label: 'Erreiche die Stadt' } },
  { id: 'golem', name: 'Magma-Golem', type: 'golem', title: 'Wandelnde Katastrophe',
    desc: 'Explosionen doppelt so groß, Stampfer 40 % stärker, Hindernisse tun halb so weh. Wächst 10 % langsamer.',
    colors: { body: '#5a4a48', belly: '#ff8a2a', horn: '#2a1c1a', dark: '#1a1010' },
    perks: { boom: 2, slam: 1.4, hazard: 0.5, absorb: 0.9 }, cost: 12000, req: { kills: 8000, label: 'Zerstöre insgesamt 8.000 Objekte' } },
  { id: 'goldzahn', name: 'Goldzahn', type: 'dragon', title: 'Gieriger Drache',
    desc: '+60 % Schrott, goldene Objekte 2,5× so häufig, Münzen fliegen ihm von selbst zu.',
    colors: { body: '#e8a72a', belly: '#fff0b0', horn: '#fffaf0', dark: '#6a3a00' },
    perks: { scrap: 1.6, golden: 2.5, magnet: 2 }, cost: 35000, req: { world: 4, label: 'Erreiche den Kontinent' } },
  { id: 'void', name: 'Void', type: 'alien', title: 'Wesen aus dem Nichts',
    desc: 'Berserker lädt 70 % schneller und hält 3 s länger. Startet 25 % größer.',
    colors: { body: '#2a1a5a', belly: '#b06bff', horn: '#7fffe0', dark: '#0a0520' },
    perks: { berserk: 1.7, berserkTime: 3, size: 1.25 }, cost: 90000, req: { world: 5, label: 'Erreiche Planetar' } },
];

// ---------------------------------------------------------------------
// Weitere Karten – eigene Welten am Anfang, später geht es ins All
// ---------------------------------------------------------------------
const WEST = [
  {
    id: 'prairie', name: 'Prärie', minRadius: 0, scrapMult: 1, ground: 'sand',
    bg: '#e3c27a', bg2: '#d6b36a', accent: '#b8954a',
    objects: [
      { name: 'Steppengras', size: 3, shape: 'blade', color: '#c9b26a', value: 1 },
      { name: 'Kieselstein', size: 4, shape: 'rock', color: '#b8a58a', value: 1 },
      { name: 'Kaktus-Spross', size: 4.5, shape: 'cactus', color: '#5aa84a', value: 2 },
      { name: 'Schlange', size: 5.5, shape: 'snake', color: '#8ab04a', value: 2, move: 'wander', speed: 0.5 },
      { name: 'Präriehund', size: 6, shape: 'gopher', color: '#c98a4a', value: 3, move: 'flee', speed: 3 },
      { name: 'Steppenläufer', size: 7, shape: 'tumble', color: '#b8904a', value: 3, move: 'drive', speed: 2.5 },
      { name: 'Wasserfass', size: 8.5, shape: 'barrel', color: '#a0662d', value: 4 },
      { name: 'Dynamitkiste', size: 8.5, shape: 'dynamite', color: '#e23b3b', value: 6, explosive: true },
      { name: 'Geier', size: 9, shape: 'bird', color: '#4a3a3a', value: 5, move: 'flee', speed: 3.2 },
      { name: 'Kaktus', size: 12, shape: 'cactus', color: '#4a9a3a', value: 8, hazard: 12 },
      { name: 'Kuh', size: 13, shape: 'cow', color: '#f4f0e6', value: 9, move: 'flee', speed: 2.2 },
      { name: 'Planwagen', size: 18, shape: 'wagon', color: '#f2ead8', value: 12, move: 'drive', speed: 1.2 },
      { name: 'Windrad', size: 24, shape: 'windmill', color: '#d8d8d8', value: 16 },
      { name: 'Scheune', size: 30, shape: 'barn', color: '#c0392b', value: 22 },
    ],
  },
  {
    id: 'town', name: 'Westernstadt', minRadius: 40, scrapMult: 3, ground: 'town',
    bg: '#d9b67a', bg2: '#8a5a2b', accent: '#6a4220',
    objects: [
      { name: 'Fass', size: 10, shape: 'barrel', color: '#a0662d', value: 1 },
      { name: 'Cowboy', size: 12, shape: 'cowboy', color: '#6a8ac9', value: 3, move: 'flee', speed: 2.8 },
      { name: 'Kaktus', size: 14, shape: 'cactus', color: '#4a9a3a', value: 3 },
      { name: 'Pferd', size: 16, shape: 'horse', color: '#8a5a3a', value: 4, move: 'flee', speed: 3 },
      { name: 'Sheriff', size: 18, shape: 'cowboy', color: '#c9a24a', value: 8, move: 'wander', speed: 1.2, hazard: 15 },
      { name: 'Wassertank', size: 28, shape: 'watertower', color: '#b5733a', value: 6 },
      { name: 'Dynamitlager', size: 30, shape: 'dynamite', color: '#e23b3b', value: 9, explosive: true },
      { name: 'Postkutsche', size: 36, shape: 'wagon', color: '#e8d8b0', value: 10, move: 'drive', speed: 1.6 },
      { name: 'Saloon', size: 60, shape: 'saloon', color: '#c98a4a', value: 16 },
      { name: 'Goldmine', size: 75, shape: 'mine', color: '#a0805a', value: 20 },
      { name: 'Bank', size: 85, shape: 'saloon', color: '#c9b28a', value: 24 },
      { name: 'Dampflok', size: 100, shape: 'train', color: '#3a3a4a', value: 26, move: 'drive', speed: 1.0 },
    ],
  },
  {
    id: 'canyon', name: 'Canyon', minRadius: 160, scrapMult: 9, ground: 'canyon',
    bg: '#d9824a', bg2: '#c96f3a', accent: '#a0522a',
    objects: [
      { name: 'Steinbock', size: 50, shape: 'goat', color: '#d9c8a8', value: 2, move: 'flee', speed: 3 },
      { name: 'Riesenkaktus', size: 60, shape: 'cactus', color: '#4a9a3a', value: 3, hazard: 15 },
      { name: 'Felsbrocken', size: 90, shape: 'rock', color: '#c97a4a', value: 4 },
      { name: 'Totempfahl', size: 110, shape: 'totem', color: '#c98a4a', value: 6 },
      { name: 'Wassertank', size: 120, shape: 'watertower', color: '#b5733a', value: 6 },
      { name: 'Güterzug', size: 160, shape: 'train', color: '#5a3a2a', value: 10, move: 'drive', speed: 1.0 },
      { name: 'Dynamitlager', size: 200, shape: 'dynamite', color: '#e23b3b', value: 12, explosive: true },
      { name: 'Goldmine', size: 220, shape: 'mine', color: '#a0805a', value: 14 },
      { name: 'Mesa', size: 350, shape: 'mesa', color: '#d9824a', value: 22 },
      { name: 'Tafelberg', size: 480, shape: 'mesa', color: '#b85a2a', value: 34 },
    ],
  },
];

const CANDY = [
  {
    id: 'sugarmeadow', name: 'Zuckerwiese', minRadius: 0, scrapMult: 1, ground: 'candy',
    bg: '#ffc2dc', bg2: '#ffb0d2', accent: '#ff8ac0',
    objects: [
      { name: 'Streusel', size: 3, shape: 'sprinkle', color: '#7fd3ff', value: 1 },
      { name: 'Bonbon', size: 4.5, shape: 'candy', color: '#7fd3ff', value: 2 },
      { name: 'Gummibärchen', size: 5.5, shape: 'gummy', color: '#ff4a5a', value: 3, move: 'flee', speed: 3 },
      { name: 'Grünes Gummibärchen', size: 5.5, shape: 'gummy', color: '#5ae07a', value: 3, move: 'flee', speed: 3 },
      { name: 'Lolli', size: 7, shape: 'lolly', color: '#ff5aa8', value: 4 },
      { name: 'Cupcake', size: 8.5, shape: 'cupcake', color: '#ffb3d9', value: 5 },
      { name: 'Brausebombe', size: 8.5, shape: 'bottle', color: '#5a2a1a', value: 6, explosive: true },
      { name: 'Saure Schlange', size: 9, shape: 'snake', color: '#a0f04a', value: 6, move: 'wander', speed: 0.6, hazard: 12 },
      { name: 'Donut', size: 11, shape: 'donut', color: '#ff8ad0', value: 7 },
      { name: 'Zuckerwatte', size: 13, shape: 'cotton', color: '#ffc2e8', value: 9 },
      { name: 'Eiswaffel', size: 15, shape: 'icecream', color: '#b8f0ff', value: 10 },
      { name: 'Lebkuchenhaus', size: 28, shape: 'gingerhouse', color: '#c98a4a', value: 22 },
    ],
  },
  {
    id: 'candytown', name: 'Bonbonstadt', minRadius: 40, scrapMult: 3, ground: 'candytown',
    bg: '#fff0f6', bg2: '#ff9ac8', accent: '#ffffff',
    objects: [
      { name: 'Gummi-Bande', size: 12, shape: 'gummy', color: '#ffb13d', value: 2, move: 'flee', speed: 2.8 },
      { name: 'Riesenlolli', size: 18, shape: 'lolly', color: '#7fd3ff', value: 3 },
      { name: 'Cupcake', size: 22, shape: 'cupcake', color: '#c9a0ff', value: 4 },
      { name: 'Colaflasche', size: 28, shape: 'bottle', color: '#5a2a1a', value: 7, explosive: true },
      { name: 'Zahnarzt', size: 30, shape: 'person', color: '#e8f4ff', value: 10, move: 'wander', speed: 1.4, hazard: 15 },
      { name: 'Eiswagen', size: 36, shape: 'car', color: '#ffb3d9', value: 9, move: 'drive', speed: 1.6 },
      { name: 'Donut', size: 40, shape: 'donut', color: '#ffd23f', value: 8 },
      { name: 'Torte', size: 55, shape: 'cake', color: '#ff8ad0', value: 14 },
      { name: 'Lebkuchenhaus', size: 70, shape: 'gingerhouse', color: '#c98a4a', value: 18 },
      { name: 'Schokobrunnen', size: 90, shape: 'fountain', color: '#6a3a1a', value: 22 },
      { name: 'Zuckerturm', size: 130, shape: 'tower', color: '#ff9ad0', value: 30 },
    ],
  },
  {
    id: 'choco', name: 'Schokogebirge', minRadius: 160, scrapMult: 9, ground: 'choco',
    bg: '#8a5a3a', bg2: '#7a4e32', accent: '#a06a44',
    objects: [
      { name: 'Zuckerstange', size: 60, shape: 'candycane', color: '#e23b3b', value: 2 },
      { name: 'Gummibär-Riese', size: 80, shape: 'gummy', color: '#ff4a5a', value: 4, move: 'flee', speed: 2.6 },
      { name: 'Waffelfelsen', size: 100, shape: 'rock', color: '#e8b06a', value: 4 },
      { name: 'Hochzeitstorte', size: 140, shape: 'cake', color: '#fff0f6', value: 8 },
      { name: 'Karamell-Lager', size: 150, shape: 'tank', color: '#c98a3d', value: 9, explosive: true },
      { name: 'Schokobrunnen', size: 200, shape: 'fountain', color: '#6a3a1a', value: 12 },
      { name: 'Lebkuchendorf', size: 260, shape: 'village', color: '#c98a4a', value: 14 },
      { name: 'Schokoberg', size: 400, shape: 'mountain', color: '#6a3a1a', value: 22 },
      { name: 'Karamellvulkan', size: 520, shape: 'volcano', color: '#8a4a1a', value: 30, explosive: true },
    ],
  },
];

export const MAPS = [
  { id: 'suburb', name: 'Vorstadt', icon: '🏡', worlds: WORLDS,
    desc: 'Vom Gartenzwerg bis zur Galaxie. Hier fängt jede Wut an.',
    scrapMult: 1, hpMult: 1, drainMult: 1, chaosMult: 1, req: null },
  { id: 'west', name: 'Wilder Westen', icon: '🌵', worlds: [...WEST, ...WORLDS.slice(3)],
    desc: 'Prärie, Westernstadt, Canyon. Sheriffs und Kakteen wehren sich. Härter, aber viel lukrativer.',
    scrapMult: 6, hpMult: 2.2, drainMult: 1.1, chaosMult: 2, req: { world: 3, label: 'Erreiche das Gebirge' } },
  { id: 'candy', name: 'Zuckerland', icon: '🍭', worlds: [...CANDY, ...WORLDS.slice(3)],
    desc: 'Gummibärchen, Torten, Schokoberge. Süß aussehend, brutal schwer – und extrem viel Beute.',
    scrapMult: 36, hpMult: 5.5, drainMult: 1.2, chaosMult: 4, req: { world: 5, label: 'Erreiche Planetar' } },
];
