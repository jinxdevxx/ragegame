// Balancing-Simulator: ein Bot spielt Runs ohne Grafik.
// Aufruf: node tools/balance-sim.js [runsProProfil] [karte]
// Zeigt pro Upgrade-Stufe: Run-Dauer, erreichte Welt, Schrott, Chaos
// und eine Progression über viele Runs (Bot kauft nach jedem Run Upgrades).
import * as C from '../js/config.js';
import { raiseTalent, Game, upgradeCost, fmt, prestigeGain, doPrestige, dmCost } from '../js/game.js';
import { defaultSave } from '../js/save.js';

const RUNS = Number(process.argv[2]) || 6;
const MAP = process.argv[3] || 'suburb';
const DT = 1 / 30;

export function bot(g) {
  const p = g.p, lim = g.breakLimit();
  let best = null, bs = Infinity;
  for (const o of g.objects) {
    if (o.size > lim && !o.mother) continue;
    const d = Math.hypot(o.x - p.x, o.y - p.y) - o.size;
    let score = d / Math.max(0.3, Math.min(1.5, o.size / p.r));
    if (o.leaf) score *= 0.35; if (o.mother) score *= 0.05; // Karte 420: Blätter und Mutterpflanze bevorzugen
    if (score < bs) { bs = score; best = o; }
  }
  const out = { dx: 0, dy: 0, dash: false, slam: false, berserk: p.berserk >= 1 };
  if (!best) { out.dx = Math.cos(g.time); out.dy = Math.sin(g.time); return out; }
  const dx = best.x - p.x, dy = best.y - p.y, d = Math.hypot(dx, dy) || 1;
  out.dx = dx / d; out.dy = dy / d;
  out.dash = d < p.r * 6 && best.size > p.r * 0.5;
  // Stampfer, wenn viele zerstörbare Objekte in Reichweite sind
  let near = 0;
  for (const o of g.objects) if (o.size <= lim && Math.hypot(o.x - p.x, o.y - p.y) < p.r * g.stats.slamRadius) near++;
  out.slam = near >= 4;
  return out;
}

export function playRun(save, opts = {}) {
  let res = null;
  const g = new Game(save, {
    onWorld: (w, ch) => g.chooseMutation(ch[0] && ch[0].id),
    onEnd: s => { res = s; },
  });
  g.vw = 1280; g.vh = 720;
  g.start(opts);
  let steps = 0, emptyTime = 0;
  while (!res && steps < 30 * 60 * 20) {
    g.update(DT, bot(g));
    // Leerlauf messen: Zeit ohne zerstörbares Objekt in Sichtweite
    if (g.state === 'play' && steps % 6 === 0) {
      const vr = g.viewRadius() * 0.8, lim = g.breakLimit();
      if (!g.objects.some(o => o.size <= lim && o.size > g.p.r * 0.3 && Math.hypot(o.x - g.p.x, o.y - g.p.y) < vr)) emptyTime += DT * 6;
    }
    steps++;
  }
  if (!res) { g.p.rage = 0; g.die(); g.dyingT = 0; g.update(DT, bot(g)); }
  res.emptyTime = emptyTime;
  return res;
}

function freshSave() { const s = defaultSave(); s.selectedMap = MAP; return s; }

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const worlds = C.MAPS.find(m => m.id === MAP).worlds;
  console.log(`\nKarte: ${MAP}`);
  console.log('\n=== Profil: alle Upgrades auf Stufe L ===');
  console.log('Stufe | Dauer  | Welt (Ø / max)          | Schrott Ø  | Chaos Ø | Leerlauf');
  const PROFILE = (process.env.PROFILE || '0,3,6,10,15,20').split(',').map(Number);
  for (const L of PROFILE) {
    const save = freshSave();
    C.UPGRADES.forEach(u => save.upgrades[u.id] = Math.min(u.max, L));
    let t = 0, w = 0, wmax = 0, s = 0, ch = 0, e = 0;
    for (let i = 0; i < RUNS; i++) {
      const r = playRun(save);
      t += r.time; w += r.world; wmax = Math.max(wmax, r.world); s += r.earned; ch += r.chaos; e += r.emptyTime;
    }
    console.log(`${String(L).padStart(5)} | ${(t / RUNS).toFixed(0).padStart(4)} s | ${(w / RUNS).toFixed(1).padStart(4)} / ${worlds[wmax].name.padEnd(16)} | ${fmt(s / RUNS).padStart(9)} | ${fmt(ch / RUNS).padStart(7)} | ${(e / t * 100).toFixed(1)} %`);
  }

  if (process.env.NOPROG) process.exit(0);
  console.log('\n=== Progression mit Urknall: Bot kauft günstigste Upgrades, sprengt, wenn er 6 Runs nicht weiterkommt ===');
  const save = freshSave();
  let bestWorld = -1, stuck = 0, cycleStart = 1, everBest = -1;
  const NOPRESTIGE = !!process.env.NOPRESTIGE, STUCK = Number(process.env.STUCK || 6); // Vergleich: ohne Urknall / früher Urknall
  const RUNS_TOTAL = Number(process.env.RUNS_TOTAL || 120);
  const buy = () => {
    // Talentpunkte des Monsters verteilen (reihum, so weit freigeschaltet)
    if (!process.env.NOTALENTS) for (let k = 0; k < 200; k++) { let any = false; for (const T of C.TALENTS) if (raiseTalent(save, save.selectedChar || 'grumpf', T.id)) any = true; if (!any) break; }
    for (;;) {
      let cheapest = null, cc = Infinity;
      for (const u of C.UPGRADES) { const l = save.upgrades[u.id] || 0; if (l >= u.max) continue; const c = upgradeCost(u, l); if (c < cc) { cc = c; cheapest = u; } }
      if (!cheapest || save.scrap < cc) break;
      save.scrap -= cc; save.upgrades[cheapest.id] = (save.upgrades[cheapest.id] || 0) + 1;
    }
    for (;;) {
      let cheapest = null, cc = Infinity;
      for (const d of C.DM_PERKS) { const l = save.dmPerks[d.id] || 0; if (l >= d.max) continue; const c = dmCost(d, l); if (c < cc) { cc = c; cheapest = d; } }
      if (!cheapest || save.darkMatter < cc) break;
      save.darkMatter -= cc; save.dmPerks[cheapest.id] = (save.dmPerks[cheapest.id] || 0) + 1;
    }
  };
  for (let run = 1; run <= RUNS_TOTAL; run++) {
    const r = playRun(save);
    buy();
    const newBest = r.world > bestWorld;
    if (newBest) { bestWorld = r.world; stuck = 0; } else stuck++;
    if (run <= 2 || newBest || run % 20 === 0) {
      const lv = Object.values(save.upgrades).reduce((a, b) => a + b, 0);
      console.log(`Run ${String(run).padStart(3)}: ${r.time.toFixed(0).padStart(3)} s, ${worlds[r.world].name.padEnd(14)} +${fmt(r.earned).padStart(7)} ⚙ +${fmt(r.chaos).padStart(6)} ☠ · Upgrades ${lv} · ◆ ${fmt(save.totalDarkMatter || 0)}`);
    }
    everBest = Math.max(everBest, r.world);
    if (run % 10 === 0) console.log(`   ▸ nach ${run} Runs: weiteste Welt ${everBest + 1} (${worlds[everBest].name})`);
    if (!NOPRESTIGE && stuck >= STUCK && prestigeGain(save) > 0) {
      const g = doPrestige(save); buy();
      console.log(`   💥 URKNALL nach Run ${run} (Durchgang ${save.prestiges} dauerte ${run - cycleStart + 1} Runs): +${g} ◆, Masterplan-Stufen ${Object.values(save.dmPerks).reduce((a, b) => a + b, 0)}`);
      cycleStart = run + 1; bestWorld = -1; stuck = 0;
    }
  }
}
