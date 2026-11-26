// Ruckel-Check: misst, wie oft das Spiel durch „Treffer-Stopps“ (hitStop) einfriert –
// fühlt sich für Spieler wie Lag an. Bot läuft zu fressbaren Objekten.
// Aufruf: node tools/stutter-check.js
import * as C from '../js/config.js';
import { Game } from '../js/game.js';
import { defaultSave } from '../js/save.js';
const DT = 1 / 60;
function scenario(name, world, setup, secs = 20) {
  const save = defaultSave(); save.upgrades = { dmg: 30, size: 20, rage: 20, calm: 15, magnet: 10, absorb: 15 };
  const g = new Game(save, {}); g.vw = 1280; g.vh = 720; g.start();
  const w = C.WORLDS[world]; g.p.mass = Math.pow(w.minRadius * 1.3, 2); g.p.r = Math.sqrt(g.p.mass); g.world = world;
  if (g.state === 'mutation') g.chooseMutation(null);
  setup(g);
  let frozen = 0, freezes = 0, was = false, kills0 = g.kills, maxKillsFrame = 0;
  for (let t = 0; t < secs; t += DT) {
    g.p.rage = g.stats.rageMax; if (g.state === 'mutation') g.chooseMutation(null);
    setup.every && setup.every(g);
    const lim = g.breakLimit(); let best = null, bd = Infinity;
    for (const o of g.objects) { if (o.dead || o.size > lim) continue; const d = Math.hypot(o.x - g.p.x, o.y - g.p.y); if (d < bd) { bd = d; best = o; } }
    const inp = { dx: best ? (best.x - g.p.x) / (bd || 1) : 0, dy: best ? (best.y - g.p.y) / (bd || 1) : 0, dash: false, slam: false, berserk: false, skill: false };
    const k = g.kills; const hs = g.hitStop > 0;
    g.update(DT, inp);
    maxKillsFrame = Math.max(maxKillsFrame, g.kills - k);
    if (hs) { frozen += DT; if (!was) freezes++; } was = hs;
  }
  console.log(`${name.padEnd(28)} eingefroren ${(frozen / secs * 100).toFixed(1).padStart(5)} % · ${(freezes / secs).toFixed(1)} Stopps/s · Kills ${g.kills - kills0} · max Kills/Frame ${maxKillsFrame} · Münzen ${g.coins.length} Trümmer ${g.chunks.length} Partikel ${g.particles.length}`);
}
const meteor = g => { g.event = C.EVENTS.list.find(e => e.id === 'meteor'); g.eventT = 999; };
const ev = id => g => { g.event = C.EVENTS.list.find(e => e.id === id); g.eventT = 999; };
scenario('Stadt normal', 2, () => {});
scenario('Stadt Meteorschauer', 2, Object.assign(meteor, { every: meteor }));
scenario('Welt 6 Meteorschauer', 5, Object.assign(g => meteor(g), { every: meteor }));
scenario('Welt 6 Glaswelt', 5, Object.assign(ev('glass'), { every: ev('glass') }));
scenario('Welt 6 Super-Magnet', 5, g => { g.muts.push('hole'); g.chooseMutation(null); });
scenario('Welt 6 Berserker', 5, Object.assign(g => { g.p.berserkT = 999; }, { every: g => { g.p.berserkT = 999; } }));
scenario('Welt 20 Super-Magnet', 19, g => { g.muts.push('hole'); g.chooseMutation(null); });
