// Berserker-Check: Bot spielt Runs, misst wie lange das Aufladen dauert und ob Füllung verloren geht.
// Aufruf: node tools/berserk-check.js
import * as C from '../js/config.js';
import { Game } from '../js/game.js';
import { defaultSave } from '../js/save.js';
const DT = 1 / 60;
function run(label, upg, world, secs = 240) {
  const save = defaultSave(); save.upgrades = upg;
  const g = new Game(save, {}); g.vw = 1280; g.vh = 720; g.start();
  if (world) { const w = C.WORLDS[world]; g.p.mass = Math.pow(w.minRadius * 1.2, 2); g.p.r = Math.sqrt(g.p.mass); g.world = world; }
  let lost = 0, readyAt = [], lastStart = 0, cdKills = 0, starts = 0, t = 0, chargeTimes = [];
  const origAdd = g.addBerserk.bind(g);
  g.addBerserk = function (a) { const p = this.p; if (p.berserkT > 0 || p.berserkCd > 0) { lost += a; if (p.berserkCd > 0) cdKills++; } return origAdd(a); };
  let chargeStart = 0, wasReady = false;
  for (; t < secs; t += DT) {
    if (g.state === 'mutation') g.chooseMutation(null);
    if (g.state !== 'play') break;
    g.p.rage = Math.max(g.p.rage, g.stats.rageMax * 0.5);
    const lim = g.breakLimit(); let best = null, bd = Infinity;
    for (const o of g.objects) { if (o.dead || o.size > lim) continue; const d = Math.hypot(o.x - g.p.x, o.y - g.p.y); if (d < bd) { bd = d; best = o; } }
    const ready = g.p.berserk >= 1 && g.p.berserkT <= 0;
    if (ready && !wasReady) chargeTimes.push((g.time - chargeStart).toFixed(0) + 's@W' + (g.world + 1));
    wasReady = ready;
    const inp = { dx: best ? (best.x - g.p.x) / (bd || 1) : 0, dy: best ? (best.y - g.p.y) / (bd || 1) : 0, dash: false, slam: false, berserk: ready, skill: false };
    const before = g.p.berserkT; g.update(DT, inp);
    if (before <= 0 && g.p.berserkT > 0) starts++;
    if (before > 0 && g.p.berserkT <= 0) chargeStart = g.time;
  }
  console.log(`${label.padEnd(30)} Ladezeiten: ${chargeTimes.slice(0, 8).join(', ')} · gezündet ${starts}× in ${g.time.toFixed(0)} s (bis Welt ${g.world + 1}) · Kills in Abklingzeit ${cdKills} (verlorene Ladung ${(lost * 100).toFixed(0)} %)`);
}
run('Garten, keine Upgrades', {}, 0);
run('Garten, Berserker 5', { berserk: 5, dmg: 5, size: 5 }, 0);
run('Stadt, mittlere Upgrades', { berserk: 5, dmg: 15, size: 10, calm: 5, rage: 10 }, 2);
run('Natürlich, starke Upgrades', { berserk: 10, dmg: 40, size: 30, calm: 15, rage: 25, absorb: 20, speed: 10 }, 0);
run('Natürlich, sehr stark', { berserk: 15, dmg: 70, size: 50, calm: 20, rage: 35, absorb: 35, speed: 15 }, 0);
