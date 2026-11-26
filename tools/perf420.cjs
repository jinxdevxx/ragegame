// Performance auf Karte 420 mit komplett ausgemaxtem Spielstand (wie im Cheat-Build).
// Aufruf (Server läuft): [DPR=2 W=1512 H=860 MAP=420|suburb LV=0..1] node tools/perf420.cjs [sekunden]
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: Number(process.env.W || 1280), height: Number(process.env.H || 720) }, deviceScaleFactor: Number(process.env.DPR || 1) });
  await p.goto('http://localhost:8080/?slot=3'); await p.waitForTimeout(500);
  if (process.env.HIDE) await p.addStyleTag({ content: process.env.HIDE + '{display:none!important}' });
  await p.evaluate(([MAP, LV]) => { const { save: s, C } = window.__rv; s.bossKills = 1; s.egg420 = true; s.settings.autoMut = true; s.selectedMap = MAP;
    C.UPGRADES.forEach(u => s.upgrades[u.id] = Math.round(u.max * LV)); C.DM_PERKS.forEach(d => s.dmPerks[d.id] = Math.round(d.max * LV)); C.SKILL_EVOS.forEach(e => s.evos[e.id] = true);
    s.monsters = { grumpf: { xp: 0, lvl: 99, pts: { power: 25, hunger: 25, mastery: 25, sig: 23 } } };
    window.__prof = {}; document.querySelector('#btn-play').click();
    const g = window.__rv.game; setInterval(() => { if (g.p) g.p.rage = g.stats.rageMax;  }, 30);
    const oU = g.update.bind(g); window.__ut = { s: 0, n: 0, max: 0 }; g.update = function (dt, i) { const t = performance.now(); oU(dt, i); const d = performance.now() - t; window.__ut.s += d; window.__ut.n++; window.__ut.max = Math.max(window.__ut.max, d); };
    window.__pf = { n: 0, sum: 0, slow: 0, worst: 0, last: performance.now() };
    window.__long = []; let lw = -1; (function f() { const P = window.__pf, now = performance.now(), d = now - P.last; P.last = now; const g2 = window.__rv.game; if (d > 50 && P.n > 10) window.__long.push(Math.round(d) + 'ms W' + (g2.world + 1) + (g2.world !== lw ? '(neu)' : '') + ' ' + g2.state + ' ' + [...document.querySelectorAll('.toast:not([hidden]),#banner:not([hidden]),.callout')].length); lw = g2.world; P.n++; P.sum += d; if (d > 34) P.slow++; if (d > P.worst && P.n > 10) P.worst = d; requestAnimationFrame(f); })(); }, [process.env.MAP || '420', Number(process.env.LV || 1)]);
  const secs = Number(process.argv[2] || 25), keys = ['d', 's', 'a', 'w'];
  for (let i = 0; i < secs; i++) { const k1 = keys[i % 4]; await p.keyboard.down(k1); if (i % 3 === 0) await p.keyboard.press(' '); if (i % 5 === 2) await p.keyboard.press('f'); await p.waitForTimeout(1000); await p.keyboard.up(k1); if (i % 4 === 3) await p.keyboard.press('e'); }
  const r = await p.evaluate(() => { const P = window.__pf, g = window.__rv.game, U = window.__ut, pr = window.__prof;
    return { fps: 1000 / (P.sum / P.n), slow: P.slow / P.n * 100, worst: P.worst, upd: U.s / U.n, updMax: U.max, obj: g.objects.length, kills: g.kills, leaves: g.leaves, r: g.p.r,
      prof: Object.entries(pr).filter(([k]) => k !== 'spikes').map(([k, v]) => k + ' ' + (v / P.n).toFixed(2)).join(' · '), spikes: (pr.spikes || []).slice(0, 12).join(' ') }; });
  console.log(`Ø ${r.fps.toFixed(0)} fps · ${r.slow.toFixed(1)} % > 34 ms · schlimmster ${r.worst.toFixed(0)} ms · Update Ø ${r.upd.toFixed(2)} ms (max ${r.updMax.toFixed(0)}) · Objekte ${r.obj} · Kills ${r.kills} · Blätter ${r.leaves}`);
  console.log('Zeichnen/Frame: ' + r.prof); console.log('Spitzen: ' + r.spikes); console.log('Lange Bilder: ' + (await p.evaluate(() => window.__long.join(' | ')))); console.log('Canvas', await p.evaluate(() => { const c = document.querySelector('canvas'); return c.width + '×' + c.height + ' · sichtbare Fenster: ' + [...document.querySelectorAll('.screen')].filter(s => !s.hidden).map(s => s.id).join(',') + ' · Auflösungsstufe ' + JSON.stringify(window.__res()); }));
  await b.close();
})();
