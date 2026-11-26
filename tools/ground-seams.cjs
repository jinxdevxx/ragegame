// Aufruf (Server läuft): node tools/ground-seams.cjs
// Vergleich: Boden komplett auf einmal vs. in Streifen – Pixel-Unterschied pro Welt
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/?slot=3'); await p.waitForTimeout(500);
  const out = await p.evaluate(async (worlds) => {
    const { C } = window.__rv; document.querySelector('#btn-play').click();
    await new Promise(r => setTimeout(r, 300));
    window.__skip = { update: true, render: true, hud: true };
    const { render } = await import(document.querySelector('script[type=module]').src.replace('main.js', 'render.js'));
    const g = window.__rv.game, cv = document.querySelector('canvas'), ctx = cv.getContext('2d'); cv.width = 1280; cv.height = 720;
    const res = [];
    for (const w of worlds) {
      const W = g.worlds[w]; g.world = w; g.p.r = W.minRadius * 1.3; g.p.mass = g.p.r * g.p.r; g.objects = []; g.cam.zoom = g.targetZoom(); g.cam.x = g.p.x; g.cam.y = g.p.y;
      const snap = (sync) => { window.__clearGround(); window.__groundSync = sync; window.__groundStrips = !sync; window.__stripFrames = 0; window.__skip.objekte = true; window.__skip.player = true;
        let n = 0; do { ctx.setTransform(1, 0, 0, 1, 0, 0); render(ctx, g, 1280, 720, 5); n++; } while (n < 12);
        return ctx.getImageData(0, 0, 1280, 720).data; };
      const a = snap(true); const bb = snap(false); let nz = 0; for (let i = 0; i < a.length; i += 4000) if (a[i] + a[i+1] + a[i+2] > 30) nz++;
      let diff = 0, big = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.abs(a[i] - bb[i]) + Math.abs(a[i + 1] - bb[i + 1]) + Math.abs(a[i + 2] - bb[i + 2]); if (d > 12) diff++; if (d > 60) big++; }
      res.push(`${w + 1} ${W.name}: ${(diff / (a.length / 4) * 100).toFixed(2)} % abweichend (${(big / (a.length / 4) * 100).toFixed(2)} % stark)`);
    }
    return res;
  }, [0, 1, 2, 4, 6, 9, 12, 16, 20, 24, 28, 32, 36, 40, 44, 47, 49]);
  console.log(out.join('\n'), errs); await b.close();
})();
