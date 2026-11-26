// Performance-Test: misst Update- und Zeichenzeit pro Frame in typischen Lastszenarien.
// Vorher im Repo: python3 -m http.server 8080 ; dann: node tools/perf-test.cjs
const { chromium } = require('playwright');
const SCEN = [
  { name: 'Garten normal', q: '?slot=1&world=0', setup: '' },
  { name: 'Stadt Meteorschauer', q: '?slot=1&world=2', setup: "g.event = C.EVENTS.list.find(e => e.id === 'meteor'); g.eventT = 999;" },
  { name: 'Welt 6 Meteor+Berserker', q: '?slot=1&world=5', setup: "g.event = C.EVENTS.list.find(e => e.id === 'meteor'); g.eventT = 999; g.p.berserkT = 999;" },
  { name: 'Welt 6 Super-Magnet', q: '?slot=1&world=5', setup: "g.muts.push('hole'); s.upgrades.magnet = 15; g.stats = window.__rv.computeStats(s, g.muts, g.char.id);" },
  { name: 'Welt 12 Goldregen', q: '?slot=1&world=11', setup: "g.event = C.EVENTS.list.find(e => e.id === 'gold'); g.eventT = 999;" },
  { name: 'Welt 30', q: '?slot=1&world=29', setup: '' },
  { name: 'Hölle Boss', q: '?slot=1&world=49', setup: '' },
];
(async () => {
  const b = await chromium.launch();
  for (const sc of SCEN) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8080/' + sc.q); await p.waitForTimeout(500);
    await p.keyboard.press('Enter'); await p.waitForTimeout(300);
    await p.evaluate(() => { const b = document.querySelector('#btn-play'); if (b) b.click(); });
    await p.waitForTimeout(800);
    const r = await p.evaluate(async (setup) => {
      const { game: g, save: s, C } = window.__rv;
      if (g.state === 'mutation') g.chooseMutation(null);
      try { new Function('g', 's', 'C', setup)(g, s, C); } catch (e) { return { err: e.message }; }
      g.p.rage = g.stats.rageMax; const keep = setInterval(() => { g.p.rage = g.stats.rageMax; g.p.hp = 1e9; if (g.state === 'mutation') g.chooseMutation(null); }, 50);
      // Bot: läuft im Kreis
      const ups = [], frames = [], dts = []; let last = performance.now();
      const origU = g.update.bind(g);
      g.update = function (dt, inp) { const t = performance.now(); origU(dt, inp); ups.push(performance.now() - t); };
      let ang = 0;
      const t0 = performance.now();
      await new Promise(res => { function f() { const n = performance.now(); dts.push(n - last); last = n; ang += 0.03; const inp = window.__rv.input; if (inp) { inp.keys = inp.keys || {}; } const P = g.p, lim = g.breakLimit(); let best = null, bd = Infinity; for (const o of g.objects) { if (o.dead || o.size > lim) continue; const d = Math.hypot(o.x - P.x, o.y - P.y); if (d < bd) { bd = d; best = o; } } if (best) { const st = Math.min(bd, P.r * 0.35); P.x += (best.x - P.x) / (bd || 1) * st; P.y += (best.y - P.y) / (bd || 1) * st; } if (n - t0 < 5000) requestAnimationFrame(f); else res(); } requestAnimationFrame(f); });
      clearInterval(keep);
      const avg = a => a.reduce((x, y) => x + y, 0) / a.length, p95 = a => [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.95)];
      return { fps: 1000 / avg(dts), worst: Math.max(...dts.slice(5)), p95: p95(dts), upd: avg(ups), updP95: p95(ups), objs: g.objects.length, parts: g.particles.length, chunks: g.chunks.length, coins: g.coins.length, puffs: g.puffs.length, kills: g.kills, state: g.state };
    }, sc.setup);
    console.log(sc.name.padEnd(26), r.err ? 'ERR ' + r.err : `fps ${r.fps.toFixed(0)} · Frame p95 ${r.p95.toFixed(1)} ms · schlimmster ${r.worst.toFixed(0)} ms · Update ${r.upd.toFixed(2)} ms (p95 ${r.updP95.toFixed(1)}) · Obj ${r.objs} Part ${r.parts} Chunks ${r.chunks} Coins ${r.coins} Puffs ${r.puffs} Kills ${r.kills} ${r.state}`, errs.length ? errs : '');
    await p.close();
  }
  await b.close();
})();
