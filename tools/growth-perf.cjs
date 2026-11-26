// Wachstums-Performance: starker Bot wächst schnell durch die Welten, protokolliert Ruckler (Frames > 25 ms)
// mit Objektzahlen. Aufruf (Server läuft): node tools/growth-perf.cjs
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('http://localhost:8080/?slot=1&upgrades=' + (process.argv[2] || 45)); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('#btn-play').click()); await p.waitForTimeout(500);
  const r = await p.evaluate(async () => {
    const { game: g } = window.__rv; const log = []; let last = performance.now(), frames = 0, slow = 0, sum = 0;
    const keep = setInterval(() => { if (g.state === 'mutation') g.chooseMutation(null); g.p.rage = g.stats.rageMax; }, 50);
    const t0 = performance.now(); let lastW = g.world, ut = 0;
    const oU = g.update.bind(g); g.update = function (dt, i) { const t = performance.now(); oU(dt, i); ut = performance.now() - t; };
    await new Promise(res => { function f() {
      const n = performance.now(), dt = n - last; last = n; frames++; sum += dt;
      if (dt > 25 && frames > 5) { slow++; if (log.length < 25) { const P = g.p; let tiny = 0, onScr = 0; const vr = g.viewRadius(); for (const o of g.objects) { if (o.size < P.r * 0.1) tiny++; if (Math.hypot(o.x - P.x, o.y - P.y) < vr) onScr++; } log.push(`${dt.toFixed(0)}ms W${g.world + 1} obj ${g.objects.length} (winzig ${tiny}, sichtbar ${onScr}) chunks ${g.chunks.length} coins ${g.coins.length} parts ${g.particles.length} puffs ${g.puffs.length} upd ${ut.toFixed(1)}`); } }
      if (g.world !== lastW) { log.push(`--- Welt ${g.world + 1} nach ${((n - t0) / 1000).toFixed(1)} s`); lastW = g.world; }
      const P = g.p, lim = g.breakLimit(); let best = null, bd = Infinity; for (const o of g.objects) { if (o.dead || o.size > lim) continue; const d = Math.hypot(o.x - P.x, o.y - P.y); if (d < bd) { bd = d; best = o; } }
      if (best) { const st = Math.min(bd, P.r * 0.4); P.x += (best.x - P.x) / (bd || 1) * st; P.y += (best.y - P.y) / (bd || 1) * st; }
      if (n - t0 < 25000 && g.state !== 'over') requestAnimationFrame(f); else res(); } requestAnimationFrame(f); });
    clearInterval(keep);
    return { fps: 1000 / (sum / frames), slowPct: slow / frames * 100, world: g.world + 1, log };
  });
  console.log(`Ø ${r.fps.toFixed(0)} fps, ${r.slowPct.toFixed(1)} % Frames > 25 ms, bis Welt ${r.world}`); r.log.forEach(l => console.log('  ' + l));
  await b.close();
})();
