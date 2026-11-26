// Prüft die Easter-Egg-Karte 420 mit einem Endgame-Spielstand (Bot).
// Aufruf: node tools/check420.js [Upgrade-Anteil 0..1] [Masterplan-Stufen] [Runs]
import * as C from '../js/config.js';
import { playRun } from './balance-sim.js';
import { defaultSave } from '../js/save.js';
const frac = Number(process.argv[2] || 1), dm = Number(process.argv[3] || 30), runs = Number(process.argv[4] || 6);
const save = defaultSave(); save.selectedMap = '420'; save.bossKills = 1;
C.UPGRADES.forEach(u => save.upgrades[u.id] = Math.round(u.max * frac));
C.DM_PERKS.forEach(d => save.dmPerks[d.id] = Math.min(d.max, dm));
let wins = 0; const out = [];
for (let i = 0; i < runs; i++) { const r = playRun(save); if (r.won420) wins++; out.push(`${r.leaves}🍃${r.won420 ? '✔' : ''} ${r.time.toFixed(0)}s`); }
console.log(`Upgrades ${Math.round(frac * 100)} %, Masterplan ${dm}: ${out.join(' · ')} → geschafft ${wins}/${runs}`);
