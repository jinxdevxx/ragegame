// Wie viel bringt der Monster-Skill (F)? Bot spielt je Monster Runs MIT und OHNE Skill.
// Aufruf: node tools/skill-value.js [profil: mid|end] [runs] [monster-ids, kommagetrennt]
import * as C from '../js/config.js';
import { playRun } from './balance-sim.js';
import { defaultSave } from '../js/save.js';
const prof = process.argv[2] || 'mid', N = Number(process.argv[3] || 4);
const ids = (process.argv[4] || C.CHARACTERS.map(c => c.id).join(',')).split(',');
function mkSave(id) {
  const s = defaultSave(); s.selectedChar = id; s.unlockedChars = C.CHARACTERS.map(c => c.id);
  if (prof === 'mid') C.UPGRADES.forEach(u => s.upgrades[u.id] = Math.min(u.max, 14));
  else if (prof === 'e420') { s.selectedMap = '420'; s.bossKills = 1; C.UPGRADES.forEach(u => s.upgrades[u.id] = Math.round(u.max * 0.85)); C.DM_PERKS.forEach(d => s.dmPerks[d.id] = Math.min(d.max, 20)); }
  else { C.UPGRADES.forEach(u => s.upgrades[u.id] = u.max); C.DM_PERKS.forEach(d => s.dmPerks[d.id] = Math.min(d.max, 25)); }
  return s;
}
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
for (const id of ids) {
  const res = {};
  for (const sk of [false, true]) {
    const r = [];
    for (let i = 0; i < N; i++) { const x = playRun(mkSave(id), { skill: sk }); r.push({ w: prof === 'e420' ? x.leaves : x.world + Math.log(Math.max(1, x.maxRadius)) / 100, sc: Math.log10(Math.max(1, x.earned)), t: x.time, k: x.kills }); }
    res[sk] = { w: avg(r.map(x => x.w)), sc: avg(r.map(x => x.sc)), t: avg(r.map(x => x.t)), k: avg(r.map(x => x.k)) };
  }
  const a = res[false], b = res[true];
  console.log(`${prof} ${id.padEnd(9)} ${prof === 'e420' ? 'Blätter' : 'Welt'} ${a.w.toFixed(1)}→${b.w.toFixed(1)} (${(b.w - a.w >= 0 ? '+' : '') + (b.w - a.w).toFixed(1)}) · Schrott ×${Math.pow(10, b.sc - a.sc).toFixed(2)} · Zeit ${a.t.toFixed(0)}→${b.t.toFixed(0)} s · Kills ${a.k.toFixed(0)}→${b.k.toFixed(0)}`);
}
