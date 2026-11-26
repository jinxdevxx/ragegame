// =====================================================================
//  RAGEVERSE – BALANCING & INHALTE
//  Alle Zahlen, die das Spielgefühl bestimmen, stehen hier.
//  Werte ändern → Seite neu laden → sofort testen.
// =====================================================================

export const GAME_NAME = 'RAGEVERSE';

// ---------------------------------------------------------------------
// Grundwerte des Spielers (vor Upgrades)
// ---------------------------------------------------------------------
export const PLAYER = {
  startRadius: 10,        // Größe beim Start eines Runs (Welt-Einheiten)
  speed: 5.0,             // Tempo in "eigenen Radien pro Sekunde"
  accel: 9,               // wie schnell man auf Zielspeed kommt
  damage: 1.0,            // Schadensfaktor pro Treffer
  breakRatio: 1.05,       // Objekte bis zu (Radius × breakRatio) sind zerstörbar
  crumbRatio: 0.35,       // Objekte unter (Radius × crumbRatio) zerbröseln sofort bei Berührung
  absorb: 0.18,           // Anteil der Objekt-Masse, die man beim Zerstören aufnimmt
  rageMax: 100,
  rageDrain: 9,           // Wut-Verlust pro Sekunde
  rageDrainGrowth: 0.035, // Drain steigt pro Sekunde Laufzeit um diesen Anteil (Druck steigt)
  ragePerKill: 7,         // Basis-Wut pro Zerstörung (skaliert mit Objektgröße)
  dashCooldown: 2.2,      // Sekunden
  dashPower: 3.2,         // Speed-Multiplikator beim Dash
  dashTime: 0.22,
  magnet: 0,              // Schrott-Anziehung (in Radien)
};

// Kombo: Zerstörungen innerhalb von comboWindow Sekunden erhöhen den Multiplikator
export const COMBO = {
  window: 1.4,
  perStep: 0.1,   // +10 % Schrott pro Kombo-Stufe
  max: 4.0,       // maximaler Multiplikator
};

export const GOLDEN_CHANCE = 0.025;  // Chance auf goldenes Objekt
export const GOLDEN_MULT = 6;         // Schrott-Multiplikator goldener Objekte
export const SCRAP_SCALE = 0.12;       // globaler Schrott-Faktor

// Jede Welt ist härter als die davor (Faktor pro Welt-Stufe):
export const WORLD_SCALING = {
  hp: 1.9,         // Objekte halten mehr aus  → Wucht-Upgrades werden wichtig
  absorb: 0.78,    // man wächst langsamer     → Hunger-Upgrades werden wichtig
  rageDrain: 1.1,  // Wut sinkt schneller      → Wut-Upgrades werden wichtig
};

// ---------------------------------------------------------------------
// Welten – ab welcher Größe man in die nächste Welt aufsteigt
// Jede Welt ×4 größer. Objekte haben "size" in Welt-Einheiten (Radius).
// shape: wie das Objekt gezeichnet wird (siehe render.js)
// ---------------------------------------------------------------------
export const WORLDS = [
  {
    id: 'garden', name: 'Garten', minRadius: 0, scrapMult: 1,
    bg: '#2f6b3a', bg2: '#2a6034', grid: 'rgba(255,255,255,0.05)',
    objects: [
      { name: 'Grashalm', size: 3, shape: 'blade', color: '#7fd36b', value: 1 },
      { name: 'Gänseblümchen', size: 4, shape: 'flower', color: '#ffffff', value: 1 },
      { name: 'Blume', size: 5, shape: 'flower', color: '#ff6fa8', value: 2 },
      { name: 'Pilz', size: 5, shape: 'mushroom', color: '#e84a3c', value: 2 },
      { name: 'Gartenzwerg', size: 8, shape: 'gnome', color: '#3b6fd6', value: 4 },
      { name: 'Gießkanne', size: 9, shape: 'round', color: '#5aa9a0', value: 4 },
      { name: 'Blumentopf', size: 10, shape: 'pot', color: '#c76a3b', value: 5 },
      { name: 'Gasflasche', size: 9, shape: 'tank', color: '#e03a3a', value: 6, explosive: true },
      { name: 'Gartenstuhl', size: 13, shape: 'box', color: '#f2f2f2', value: 7 },
      { name: 'Grill', size: 15, shape: 'tank', color: '#333333', value: 9, explosive: true },
      { name: 'Hundehütte', size: 22, shape: 'house', color: '#a0662d', value: 14 },
      { name: 'Gartenhaus', size: 34, shape: 'house', color: '#8a5a2b', value: 22 },
    ],
  },
  {
    id: 'street', name: 'Straße', minRadius: 40, scrapMult: 4,
    bg: '#4a4f5a', bg2: '#434853', grid: 'rgba(255,255,255,0.06)',
    objects: [
      { name: 'Pylon', size: 10, shape: 'cone', color: '#ff8a1f', value: 1 },
      { name: 'Hydrant', size: 12, shape: 'round', color: '#d93b3b', value: 2 },
      { name: 'Mülltonne', size: 16, shape: 'box', color: '#2f7d4a', value: 3 },
      { name: 'Briefkasten', size: 16, shape: 'box', color: '#f5c518', value: 3 },
      { name: 'Ampel', size: 22, shape: 'lamp', color: '#2b2b2b', value: 4 },
      { name: 'Roller', size: 24, shape: 'car', color: '#56c2ff', value: 5 },
      { name: 'Auto', size: 38, shape: 'car', color: '#e84a5f', value: 8 },
      { name: 'Taxi', size: 38, shape: 'car', color: '#ffd23f', value: 9 },
      { name: 'Tankwagen', size: 55, shape: 'tank', color: '#e03a3a', value: 14, explosive: true },
      { name: 'Bushaltestelle', size: 60, shape: 'box', color: '#8fb3d9', value: 12 },
      { name: 'Kiosk', size: 80, shape: 'house', color: '#d9a14a', value: 18 },
      { name: 'Bus', size: 110, shape: 'car', color: '#f2a03d', value: 26 },
    ],
  },
  {
    id: 'city', name: 'Stadt', minRadius: 160, scrapMult: 16,
    bg: '#3a3550', bg2: '#342f49', grid: 'rgba(255,255,255,0.05)',
    objects: [
      { name: 'Laterne', size: 40, shape: 'lamp', color: '#ffe48a', value: 1 },
      { name: 'Auto', size: 50, shape: 'car', color: '#4bd1a0', value: 2 },
      { name: 'Wohnhaus', size: 90, shape: 'building', color: '#c9a27e', value: 5 },
      { name: 'Laden', size: 110, shape: 'building', color: '#e07a5f', value: 6 },
      { name: 'Tankstelle', size: 130, shape: 'tank', color: '#e03a3a', value: 10, explosive: true },
      { name: 'Kirche', size: 170, shape: 'house', color: '#bfb7a8', value: 10 },
      { name: 'Bürohaus', size: 220, shape: 'building', color: '#7fa7c9', value: 13 },
      { name: 'Hochhaus', size: 320, shape: 'building', color: '#5d7fa3', value: 20 },
      { name: 'Kran', size: 360, shape: 'lamp', color: '#ffb21f', value: 18 },
      { name: 'Stadion', size: 520, shape: 'round', color: '#9bd36b', value: 34 },
    ],
  },
  {
    id: 'mountains', name: 'Gebirge', minRadius: 640, scrapMult: 64,
    bg: '#3f5a4e', bg2: '#385146', grid: 'rgba(255,255,255,0.05)',
    objects: [
      { name: 'Tanne', size: 160, shape: 'tree', color: '#2f7d4a', value: 1 },
      { name: 'Felsen', size: 230, shape: 'rock', color: '#8c8c8c', value: 2 },
      { name: 'Berghütte', size: 260, shape: 'house', color: '#8a5a2b', value: 3 },
      { name: 'Wald', size: 450, shape: 'tree', color: '#256b3c', value: 5 },
      { name: 'Seilbahn', size: 500, shape: 'lamp', color: '#d94141', value: 6 },
      { name: 'Gasspeicher', size: 520, shape: 'tank', color: '#e03a3a', value: 9, explosive: true },
      { name: 'Staudamm', size: 900, shape: 'box', color: '#9aa5ad', value: 12 },
      { name: 'Berg', size: 1300, shape: 'mountain', color: '#7b8794', value: 18 },
      { name: 'Vulkan', size: 1500, shape: 'mountain', color: '#5a3b33', value: 24, explosive: true },
      { name: 'Gletscher', size: 2000, shape: 'rock', color: '#cfeaf7', value: 30 },
    ],
  },
  {
    id: 'continent', name: 'Kontinent', minRadius: 2560, scrapMult: 256,
    bg: '#2a5d8f', bg2: '#255482', grid: 'rgba(255,255,255,0.05)',
    objects: [
      { name: 'Dorf', size: 600, shape: 'building', color: '#c9a27e', value: 1 },
      { name: 'Insel', size: 900, shape: 'island', color: '#e6c97a', value: 2 },
      { name: 'Ölbohrinsel', size: 1100, shape: 'tank', color: '#e03a3a', value: 4, explosive: true },
      { name: 'Großstadt', size: 1700, shape: 'building', color: '#9aa5c9', value: 5 },
      { name: 'Wüste', size: 2600, shape: 'island', color: '#f0c36a', value: 7 },
      { name: 'Gebirgskette', size: 3600, shape: 'mountain', color: '#6f7d6b', value: 10 },
      { name: 'Regenwald', size: 4600, shape: 'tree', color: '#1f7a3c', value: 13 },
      { name: 'Supervulkan', size: 6000, shape: 'mountain', color: '#5a2f2a', value: 18, explosive: true },
      { name: 'Kontinent', size: 9000, shape: 'island', color: '#6fae5b', value: 26 },
    ],
  },
  {
    id: 'planet', name: 'Planetar', minRadius: 10240, scrapMult: 1024,
    bg: '#10142e', bg2: '#0d1127', grid: 'rgba(255,255,255,0.04)', stars: true,
    objects: [
      { name: 'Satellit', size: 2500, shape: 'lamp', color: '#c9d4e6', value: 1 },
      { name: 'Raumstation', size: 4000, shape: 'box', color: '#d9dde6', value: 2 },
      { name: 'Asteroid', size: 5000, shape: 'rock', color: '#8a7a6a', value: 2 },
      { name: 'Treibstofflager', size: 5500, shape: 'tank', color: '#e03a3a', value: 4, explosive: true },
      { name: 'Mond', size: 10000, shape: 'planet', color: '#bdbdbd', value: 6 },
      { name: 'Eisplanet', size: 18000, shape: 'planet', color: '#9fe3ff', value: 10 },
      { name: 'Erde 2', size: 24000, shape: 'planet', color: '#3d8bd9', value: 14 },
      { name: 'Lavaplanet', size: 30000, shape: 'planet', color: '#e0642a', value: 18, explosive: true },
    ],
  },
  {
    id: 'solar', name: 'Sonnensystem', minRadius: 40960, scrapMult: 4096,
    bg: '#0b0a1c', bg2: '#090818', grid: 'rgba(255,255,255,0.035)', stars: true,
    objects: [
      { name: 'Komet', size: 10000, shape: 'rock', color: '#bfe8ff', value: 1 },
      { name: 'Mond', size: 16000, shape: 'planet', color: '#bdbdbd', value: 2 },
      { name: 'Felsplanet', size: 30000, shape: 'planet', color: '#c97a4a', value: 4 },
      { name: 'Ringplanet', size: 60000, shape: 'ringplanet', color: '#e6c98a', value: 8 },
      { name: 'Gasriese', size: 90000, shape: 'planet', color: '#d99a6a', value: 12 },
      { name: 'Roter Zwerg', size: 110000, shape: 'star', color: '#ff6a3d', value: 16, explosive: true },
      { name: 'Sonne', size: 150000, shape: 'star', color: '#ffd23f', value: 24, explosive: true },
    ],
  },
  {
    id: 'galaxy', name: 'Galaxie', minRadius: 163840, scrapMult: 16384,
    bg: '#07051a', bg2: '#060416', grid: 'rgba(255,255,255,0.03)', stars: true,
    objects: [
      { name: 'Sonnensystem', size: 40000, shape: 'ringplanet', color: '#ffd23f', value: 1 },
      { name: 'Roter Riese', size: 90000, shape: 'star', color: '#ff5a3d', value: 3, explosive: true },
      { name: 'Nebel', size: 160000, shape: 'nebula', color: '#b06bff', value: 5 },
      { name: 'Sternhaufen', size: 260000, shape: 'cluster', color: '#9fd0ff', value: 8 },
      { name: 'Neutronenstern', size: 300000, shape: 'star', color: '#e6f4ff', value: 12, explosive: true },
      { name: 'Schwarzes Loch', size: 520000, shape: 'blackhole', color: '#000000', value: 22 },
      { name: 'Zwerggalaxie', size: 800000, shape: 'nebula', color: '#6bd0ff', value: 34 },
    ],
  },
];

// ---------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------
export const SPAWN = {
  density: 70,          // Anzahl Objekte im Umkreis
  areaViews: 1.6,       // Spawn-Radius in "Bildschirm-Halbdiagonalen"
  despawnViews: 2.6,
  minRel: 0.18,         // kleinste Objekte relativ zum Spieler (kleinere werden nicht mehr gespawnt)
  maxRel: 3.2,          // größte Objekte relativ zum Spieler
  nextWorldPeek: 0.25,  // Chance auf Objekt aus der nächsten Welt (Vorschau auf was kommt)
};

// ---------------------------------------------------------------------
// Permanente Upgrades (Shop zwischen den Runs)
// cost = base × growth^level
// ---------------------------------------------------------------------
export const UPGRADES = [
  { id: 'size',   name: 'Startgröße',    icon: '⬤', desc: 'Du startest größer.',                      base: 30,  growth: 1.80, max: 40, per: 0.12, unit: '×' },
  { id: 'rage',   name: 'Wut-Tank',      icon: '🔥', desc: 'Mehr maximale Wut = längere Runs.',          base: 20,  growth: 1.70, max: 40, per: 0.12, unit: '×' },
  { id: 'calm',   name: 'Dauerwut',      icon: '⏳', desc: 'Wut sinkt langsamer.',                        base: 40,  growth: 1.85,  max: 25, per: 0.05, unit: '-' },
  { id: 'dmg',    name: 'Wucht',         icon: '💥', desc: 'Mehr Schaden pro Treffer.',                   base: 25,  growth: 1.75,  max: 40, per: 0.15, unit: '×' },
  { id: 'hard',   name: 'Härte',         icon: '🪨', desc: 'Zerstöre Objekte, die größer sind als du.',  base: 60,  growth: 1.95,  max: 15, per: 0.06, unit: '+' },
  { id: 'speed',  name: 'Tempo',         icon: '💨', desc: 'Schneller rollen.',                           base: 20,  growth: 1.70, max: 30, per: 0.06, unit: '×' },
  { id: 'absorb', name: 'Hunger',        icon: '🍖', desc: 'Wachse schneller durch Zerstörung.',          base: 50,  growth: 1.90, max: 30, per: 0.08, unit: '×' },
  { id: 'scrap',  name: 'Schrottgier',   icon: '⚙', desc: 'Mehr Schrott pro Objekt.',                    base: 35,  growth: 1.80, max: 40, per: 0.15, unit: '×' },
  { id: 'magnet', name: 'Magnet',        icon: '🧲', desc: 'Zieht Schrott & Krümel an.',                  base: 45,  growth: 1.85,  max: 20, per: 0.5,  unit: '+' },
  { id: 'dash',   name: 'Rammstoß',      icon: '⚡', desc: 'Dash lädt schneller auf.',                     base: 40,  growth: 1.85,  max: 20, per: 0.06, unit: '-' },
];

// ---------------------------------------------------------------------
// Mutationen – bei jedem Welt-Aufstieg 1 aus 3 wählen (nur für diesen Run)
// ---------------------------------------------------------------------
export const MUTATIONS = [
  { id: 'boom',     name: 'Explosiv',       icon: '💣', desc: 'Jede Zerstörung macht eine kleine Explosion.' },
  { id: 'spikes',   name: 'Stacheln',       icon: '🦔', desc: '+60 % Schaden.' },
  { id: 'turbo',    name: 'Turbo',          icon: '🏎', desc: '+30 % Tempo.' },
  { id: 'greed',    name: 'Gier',           icon: '💰', desc: '+60 % Schrott.' },
  { id: 'zen',      name: 'Kochende Ruhe',  icon: '🧘', desc: 'Wut sinkt 30 % langsamer.' },
  { id: 'hole',     name: 'Schwarzes Loch', icon: '🌀', desc: 'Zieht kleine Objekte an.' },
  { id: 'shock',    name: 'Schockwelle',    icon: '🔊', desc: 'Alle 4 s eine Druckwelle um dich herum.' },
  { id: 'glutton',  name: 'Vielfraß',       icon: '😋', desc: '+40 % Wachstum.' },
  { id: 'hardhead', name: 'Dickschädel',    icon: '🪖', desc: 'Zerstöre noch größere Objekte (+20 %).' },
  { id: 'frenzy',   name: 'Raserei',        icon: '🌪', desc: 'Kombo-Fenster doppelt so lang.' },
  { id: 'dashmore', name: 'Dauer-Dash',     icon: '⚡', desc: 'Dash lädt 2× so schnell, Dash schadet 2×.' },
  { id: 'golden',   name: 'Goldrausch',     icon: '✨', desc: 'Goldene Objekte 4× häufiger.' },
];

// ---------------------------------------------------------------------
// Zufällige Events während eines Runs
// ---------------------------------------------------------------------
export const EVENTS = {
  firstAfter: 25,     // Sekunden bis zum ersten möglichen Event
  every: [30, 45],    // Abstand zwischen Events (min, max)
  duration: 10,
  list: [
    { id: 'glass',  name: 'GLASWELT!',        desc: 'Alles zerbricht mit einem Treffer' },
    { id: 'gold',   name: 'GOLDREGEN!',       desc: 'Viele goldene Objekte' },
    { id: 'frenzy', name: 'WUTANFALL!',       desc: 'Wut sinkt nicht' },
    { id: 'meteor', name: 'METEORSCHAUER!',   desc: 'Meteore zerschlagen alles um dich' },
  ],
};
