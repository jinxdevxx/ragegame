// Balancing-Simulator: ein einfacher Bot spielt Runs ohne Grafik.
// Aufruf: node tools/balance-sim.js [runsProProfil]
// Zeigt pro Upgrade-Stufe: Run-Dauer, erreichte Welt, verdienter Schrott.
import * as C from '../js/config.js';
import { Game, computeStats, upgradeCost, fmt } from '../js/game.js';

const RUNS = Number(process.argv[2]) || 6;
const DT = 1 / 30;

function bot(g) {
  const p = g.p, lim = p.r * g.stats.breakRatio;
  let best = null, bs = Infinity;
  for (const o of g.objects) {
    if (o.size > lim) continue;
    const d = Math.hypot(o.x - p.x, o.y - p.y) - o.size;
    const score = d / Math.max(0.3, Math.min(1.5, o.size / p.r));
    if (score < bs) { bs = score; best = o; }
  }
  if (!best) return { dx: Math.cos(g.time), dy: Math.sin(g.time), dash: false };
  const dx = best.x - p.x, dy = best.y - p.y, d = Math.hypot(dx, dy) || 1;
  return { dx: dx / d, dy: dy / d, dash: d < p.r * 6 && best.size > p.r * 0.5 };
}

function playRun(save) {
  let res = null;
  const g = new Game(save, {
    onWorld: (w, ch) => g.chooseMutation(ch[0] && ch[0].id),
    onEnd: s => { res = s; },
  });
  g.vw = 1280; g.vh = 720;
  g.start();
  let steps = 0;
  while (!res && steps < 30 * 60 * 20) {
    g.update(DT, bot(g));
    steps++;
  }
  return res;
}

// Profil A: alle Upgrades gleich hoch
console.log('\n=== Profil: alle Upgrades auf Stufe L ===');
console.log('Stufe | Dauer  | Welt (Ø / max)          | Schrott Ø   | Zerstört Ø');
for (const L of [0, 3, 6, 10, 15, 20, 30]) {
  const save = { scrap: 0, totalScrap: 0, upgrades: {}, bestWorld: 0, bestRadius: 0, runs: 0 };
  C.UPGRADES.forEach(u => save.upgrades[u.id] = Math.min(u.max, L));
  let t = 0, w = 0, wmax = 0, s = 0, k = 0;
  for (let i = 0; i < RUNS; i++) {
    const r = playRun(save);
    t += r.time; w += r.world; wmax = Math.max(wmax, r.world); s += r.earned; k += r.kills;
  }
  console.log(`${String(L).padStart(5)} | ${(t / RUNS).toFixed(0).padStart(4)} s | ${(w / RUNS).toFixed(1).padStart(4)} / ${C.WORLDS[wmax].name.padEnd(16)} | ${fmt(s / RUNS).padStart(10)} | ${(k / RUNS).toFixed(0)}`);
}

// Profil B: realistische Progression – nach jedem Run günstigstes Upgrade kaufen
console.log('\n=== Progression: Bot kauft nach jedem Run die günstigsten Upgrades ===');
const save = { scrap: 0, totalScrap: 0, upgrades: {}, bestWorld: 0, bestRadius: 0, runs: 0 };
let bestWorld = -1;
for (let run = 1; run <= 100; run++) {
  const r = playRun(save);
  for (;;) {
    let cheapest = null, cc = Infinity;
    for (const u of C.UPGRADES) {
      const l = save.upgrades[u.id] || 0; if (l >= u.max) continue;
      const c = upgradeCost(u, l); if (c < cc) { cc = c; cheapest = u; }
    }
    if (!cheapest || save.scrap < cc) break;
    save.scrap -= cc; save.upgrades[cheapest.id] = (save.upgrades[cheapest.id] || 0) + 1;
  }
  if (run <= 3 || r.world > bestWorld || run % 10 === 0) {
    const lv = Object.values(save.upgrades).reduce((a, b) => a + b, 0);
    console.log(`Run ${String(run).padStart(2)}: ${r.time.toFixed(0).padStart(3)} s, ${C.WORLDS[r.world].name.padEnd(13)} +${fmt(r.earned).padStart(7)} Schrott, Upgrade-Stufen gesamt ${lv}`);
  }
  bestWorld = Math.max(bestWorld, r.world);
}
