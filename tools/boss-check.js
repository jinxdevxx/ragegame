// Boss-Analyse: Bot kämpft gegen ZORNOS (Welt 50) und protokolliert Schaden, Größe, Treffer.
// Aufruf: node tools/boss-check.js [profil: low|mid|end] [runs] [eatFirst=1: erst Objekte fressen]
import * as C from '../js/config.js';
import { Game } from '../js/game.js';
import { defaultSave } from '../js/save.js';
import { bot } from './balance-sim.js';
const prof = process.argv[2] || 'mid', N = Number(process.argv[3] || 3), EAT = process.argv[4] === '1', NAT = process.argv[4] === 'nat', SKILL = Number(process.env.SKILL ?? 1);
const DT = 1 / 30;
function mkSave() {
  const s = defaultSave(); s.selectedChar = 'grumpf';
  const L = Number(prof) || { low: 0.45, mid: 0.7, end: 1 }[prof];
  C.UPGRADES.forEach(u => s.upgrades[u.id] = Math.round(u.max * L));
  C.DM_PERKS.forEach(d => s.dmPerks[d.id] = Math.round(Math.min(d.max, 25) * L));
  return s;
}
// Bot spielt "Hit & Run": Ansturm rein, abprallen, auf Abstand kreisen, Meteor-Zielen ausweichen
function bossBot(g) {
  const p = g.p, b = g.boss, out = { dx: 0, dy: 0, dash: false, slam: false, berserk: p.berserk >= 1 };
  if (!b || EAT && g.time < g.eatUntil) return bot(g);
  const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
  let mx, my;
  if (p.dashCd <= 0 && !(b.windup > 0) && !(b.charge > 0)) { mx = dx / d; my = dy / d; out.dash = d < b.size * 3.5; }
  else { // kreisen auf Abstand
    const want = b.size * 2.6, rad = (d - want) / want;
    mx = -dy / d + dx / d * rad * 2; my = dx / d + dy / d * rad * 2;
    if (b.windup > 0 || b.charge > 0) { mx = -dy / d; my = dx / d; } // Sturmangriff: seitlich weg
  }
  if (SKILL > 0) for (const sh of g.bossShots) if (sh.kind === 'meteor') { const ex = p.x - sh.x, ey = p.y - sh.y, e = Math.hypot(ex, ey) || 1; if (e < sh.r + p.r * 1.5) { mx += ex / e * 3 * SKILL; my += ey / e * 3 * SKILL; } }
  const l = Math.hypot(mx, my) || 1; out.dx = mx / l; out.dy = my / l;
  return out;
}
for (let i = 0; i < N; i++) {
  let res = null;
  const g = new Game(mkSave(), { onWorld: (w, ch) => g.chooseMutation(ch[0] && ch[0].id), onEnd: s => { res = s; } });
  g.vw = 1280; g.vh = 720;
  if (NAT) g.start(); else g.start({ radius: C.MAPS[0].worlds[49].minRadius * 1.02 });
  g.eatUntil = 40;
  let lost = 0, lastRage = g.p.rage, t0 = null, log = [], maxHit = 0, nObj = 0, samples = 0;
  for (let s = 0; s < 30 * 600 && !res; s++) {
    g.update(DT, bossBot(g));
    if (g.boss && t0 === null) { t0 = g.time; console.log(`   Boss erscheint nach ${g.time.toFixed(0)} s · Power (Schaden/Boss-Härte) ${(g.stats.damage / g.bossDamageNeed()).toExponential(2)}`); }
    if (g.p.rage < lastRage && g.state === 'play' && g.p.rage > 0) lost += lastRage - g.p.rage; lastRage = g.p.rage;
    if (g.boss) { nObj += g.objects.length; samples++; }
    if (g.boss && s % 300 === 0) log.push(`${(g.time - t0).toFixed(0)}s hp ${(g.boss.hp * 100).toFixed(1)}% endl ${g.endless().toFixed(2)} r×${(g.p.r / C.MAPS[0].worlds[49].minRadius).toFixed(1)}`);
    if (g.boss) g.__bhp = g.boss.hp;
    if (g.bossDone) break;
  }
  console.log(`[${prof}] Lauf ${i + 1}: ${g.bossDone ? 'BESIEGT nach ' + (g.time - t0).toFixed(0) + ' s' : res ? 'TOT nach ' + (g.time - (t0 || 0)).toFixed(0) + ' s (Boss ' + ((g.__bhp ?? 1) * 100).toFixed(0) + '%)' : 'Zeit um'} · Wut verloren ${(lost / g.stats.rageMax * 100).toFixed(0)}% der Max-Wut · Ø Objekte im Kampf ${(nObj / Math.max(1, samples)).toFixed(0)} · hazardMult ${g.stats.hazardMult.toFixed(2)}`);
  console.log('   ' + log.slice(0, 8).join(' | '));
}
