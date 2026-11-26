import * as C from '../js/config.js';
import { Game, computeStats, prestigeGain, doPrestige, dmCost } from '../js/game.js';
import { defaultSave } from '../js/save.js';
const mk = (save) => { const g = new Game(save, {}); g.vw = 1280; g.vh = 720; g.start(); g.objects = []; g.spawnT = 1e9; g.questT = 1e9; g.nextEventAt = 1e9; return g; };
const loot = save => { const g = mk(save); const hp = 1e-9; const o = { x: g.p.r * 1.5, y: 0, size: g.p.r * 0.6, name: 'T', shape: 'rock', color: '#888', value: 5, world: g.world, hp, maxHp: 1, hitCd: 0, hitAnim: 0, flash: 0, bonusMult: 1, move: null, speed: 0, hazard: 0, vx: 0, vy: 0, anim: 0, face: 1, seed: .5, scared: 0, pop: 0 }; g.kill(o, 'hit'); return g.coins.reduce((s, c) => s + c.value, 0); };
const a = defaultSave(); const b = defaultSave(); b.dmPerks = { dm_scrap: 3 };
console.log('Schrott pro Objekt ohne Schwarzgeld:', loot(a).toFixed(3), '| mit Schwarzgeld 3:', loot(b).toFixed(3), '| Faktor', (loot(b) / loot(a)).toFixed(2));
console.log('scrapMult Stats:', computeStats(a, [], 'grumpf').scrapMult.toFixed(4), '→', computeStats(b, [], 'grumpf').scrapMult.toFixed(4));
// kompletter Ablauf wie im Spiel
const s = defaultSave(); s.upgrades = { scrap: 10, dmg: 10 }; s.cycleBest = 4; s.cycleScrap = 3e6; s.scrap = 12345;
const before = computeStats(s, [], 'grumpf').scrapMult;
const gain = prestigeGain(s); doPrestige(s);
console.log('Urknall: +', gain, '◆ → Schrott', s.scrap, 'Upgrades', JSON.stringify(s.upgrades));
let spent = 0; const d = C.DM_PERKS.find(x => x.id === 'dm_scrap');
while (s.darkMatter >= dmCost(d, s.dmPerks.dm_scrap || 0)) { s.darkMatter -= dmCost(d, s.dmPerks.dm_scrap || 0); s.dmPerks.dm_scrap = (s.dmPerks.dm_scrap || 0) + 1; spent++; }
console.log('Schwarzgeld gekauft:', spent, 'Stufen | scrapMult vor Urknall (10 Schrottgier):', before.toFixed(3), '| nach Urknall (0 Schrottgier + Schwarzgeld):', computeStats(s, [], 'grumpf').scrapMult.toFixed(3));
