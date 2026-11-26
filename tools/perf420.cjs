// Performance auf Karte 420 mit komplett ausgemaxtem Spielstand (wie im Cheat-Build).
// Aufruf (Server läuft): node tools/perf420.cjs [sekunden]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('http://localhost:8080/?slot=3'); await p.waitForTimeout(500);
  await p.evaluate(() => { const { save: s, C } = window.__rv; s.bossKills = 1; s.egg420 = true; s.selectedMap = '420';
    C.UPGRADES.forEach(u => s.upgrades[u.id] = u.max); C.DM_PERKS.forEach(d => s.dmPerks[d.id] = d.max); C.SKILL_EVOS.forEach(e => s.evos[e.id] = true);
    s.monsters = { grumpf: { xp: 0, lvl: 99, pts: { power: 25, hunger: 25, mastery: 25, sig: 23 } } };
    window.__prof = {}; document.querySelector('#btn-play').click();
    const g = window.__rv.game; setInterval(() => { if (g.p) g.p.rage = g.stats.rageMax; if (g.state === 'mutation') g.chooseMutation(null); }, 30);
    const oU = g.update.bind(g); window.__ut = { s: 0, n: 0, max: 0 }; g.update = function (dt, i) { const t = performance.now(); oU(dt, i); const d = performance.now() - t; window.__ut.s += d; window.__ut.n++; window.__ut.max = Math.max(window.__ut.max, d); };
    window.__pf = { n: 0, sum: 0, slow: 0, worst: 0, last: performance.now() };
    (function f() { const P = window.__pf, now = performance.now(), d = now - P.last; P.last = now; P.n++; P.sum += d; if (d > 34) P.slow++; if (d > P.worst && P.n > 10) P.worst = d; requestAnimationFrame(f); })(); });
  const secs = Number(process.argv[2] || 25), keys = ['d', 's', 'a', 'w'];
  for (let i = 0; i < secs; i++) { const k1 = keys[i % 4]; await p.keyboard.down(k1); if (i % 3 === 0) await p.keyboard.press(' '); if (i % 5 === 2) await p.keyboard.press('f'); await p.waitForTimeout(1000); await p.keyboard.up(k1); if (i % 4 === 3) await p.keyboard.press('e'); }
  const r = await p.evaluate(() => { const P = window.__pf, g = window.__rv.game, U = window.__ut, pr = window.__prof;
    return { fps: 1000 / (P.sum / P.n), slow: P.slow / P.n * 100, worst: P.worst, upd: U.s / U.n, updMax: U.max, obj: g.objects.length, kills: g.kills, leaves: g.leaves, r: g.p.r,
      prof: Object.entries(pr).filter(([k]) => k !== 'spikes').map(([k, v]) => k + ' ' + (v / P.n).toFixed(2)).join(' · '), spikes: (pr.spikes || []).slice(0, 12).join(' ') }; });
  console.log(`Ø ${r.fps.toFixed(0)} fps · ${r.slow.toFixed(1)} % > 34 ms · schlimmster ${r.worst.toFixed(0)} ms · Update Ø ${r.upd.toFixed(2)} ms (max ${r.updMax.toFixed(0)}) · Objekte ${r.obj} · Kills ${r.kills} · Blätter ${r.leaves}`);
  console.log('Zeichnen/Frame: ' + r.prof); console.log('Spitzen: ' + r.spikes);
  await b.close();
})();
