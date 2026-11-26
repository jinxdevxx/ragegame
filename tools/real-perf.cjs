// Realistischer Performance-Test: echte Tastatur-Steuerung (WASD), starker Spielstand, wächst durch mehrere Welten.
// Aufruf (Server läuft): node tools/real-perf.cjs [upgrades] [sekunden]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CPU ? { args: ['--disable-gpu', '--disable-accelerated-2d-canvas'] } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('http://localhost:8080/?slot=1&upgrades=' + (process.argv[2] || 40) + (process.env.WORLD ? '&world=' + process.env.WORLD : '')); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('#btn-play').click()); await p.waitForTimeout(300);
  await p.evaluate((sk) => { window.__skip = sk ? Object.fromEntries(sk.split(',').map(k => [k, 1])) : {}; window.__prof = {}; const g = window.__rv.game; const oU = g.update.bind(g); window.__ut = { sum: 0, n: 0, max: 0 }; g.update = function (dt, i) { const t = performance.now(); oU(dt, i); const d = performance.now() - t; window.__ut.sum += d; window.__ut.n++; if (d > window.__ut.max) window.__ut.max = d; }; window.__pf = { n: 0, sum: 0, slow: 0, worst: 0, last: performance.now(), log: [] };
    setInterval(() => { if (g.state === 'mutation') g.chooseMutation(null); g.p.rage = g.stats.rageMax; }, 100);
    (function f() { const P = window.__pf, now = performance.now(), d = now - P.last; P.last = now; P.n++; P.sum += d; if (d > 34) P.slow++; if (d > P.worst && P.n > 10) P.worst = d; requestAnimationFrame(f); })(); }, process.env.SKIP || '');
  const secs = Number(process.argv[3] || 30), keys = ['d', 's', 'a', 'w'];
  for (let i = 0; i < secs; i++) {
    const k1 = keys[i % 4], k2 = keys[(i + 1) % 4];
    await p.keyboard.down(k1); await p.keyboard.down(k2); if (i % 3 === 0) await p.keyboard.press(' ');
    await p.waitForTimeout(1000); await p.keyboard.up(k1); await p.keyboard.up(k2);
    if (i % 5 === 4) await p.keyboard.press('e');
  }
  const r = await p.evaluate(() => { const P = window.__pf, g = window.__rv.game; return { prof: Object.entries(window.__prof).filter(([k]) => k !== 'spikes').map(([k, v]) => k.startsWith('t_') ? k + ' ' + v.toFixed(0) : k + ' ' + (v / P.n).toFixed(2) + 'ms').join(' · '), upd: (window.__ut.sum / window.__ut.n).toFixed(2) + ' ms Ø, max ' + window.__ut.max.toFixed(0) + ' ms', spikes: (window.__prof.spikes || []).join(' '), fps: 1000 / (P.sum / P.n), slow: P.slow / P.n * 100, worst: P.worst, w: g.world + 1, name: g.worlds[g.world].name, res: window.__res() }; });
  console.log('Zeichnen pro Frame: ' + r.prof); console.log('Spitzen: ' + r.spikes); console.log('Update: ' + r.upd); console.log(`Ø ${r.fps.toFixed(0)} fps · ${r.slow.toFixed(1)} % Frames > 34 ms · schlimmster ${r.worst.toFixed(0)} ms · bis Welt ${r.w} (${r.name}) · Auflösung ${r.res.dpr}`);
  await b.close();
})();
