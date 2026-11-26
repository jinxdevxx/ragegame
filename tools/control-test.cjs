const { chromium } = require('playwright');
// Browser-Test für Steuerung, Einstellungen und Esc-Menü.
// Vorher im Repo: python3 -m http.server 8080 ; dann: node tools/control-test.cjs [screenshot-ordner]
const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8080/'); await p.waitForTimeout(700);
  const pos = () => p.evaluate(() => { const g = window.__rv.game; return [g.p.x, g.p.y]; });
  const dist = (a, c) => Math.hypot(c[0] - a[0], c[1] - a[1]).toFixed(1);
  const st = () => p.evaluate(() => ({ screen: [...document.querySelectorAll('.screen')].filter(s => !s.hidden).map(s => s.id).join(','), state: window.__rv.game.state, control: window.__rv.save.settings.control }));
  const results = [];
  const log = (name, ok, info) => { results.push(`${ok ? '✔' : '✘'} ${name}  (${info})`); };

  // Standard = Tastatur
  log('Standard-Steuerung ist Tastatur', (await st()).control === 'keys', (await st()).control);
  // Esc im Menü -> Einstellungen
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  log('Esc im Menü öffnet Einstellungen', (await st()).screen === 'screen-settings', (await st()).screen);
  await p.screenshot({ path: OUT + '/settings.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  log('Esc schließt Einstellungen', (await st()).screen === 'screen-menu', (await st()).screen);

  await p.evaluate(() => document.getElementById('btn-play').click()); await p.waitForTimeout(400);
  // Modus Tastatur: Maus gedrückt halten darf NICHT bewegen
  let a = await pos(); await p.mouse.move(1200, 100); await p.mouse.down(); await p.waitForTimeout(600); await p.mouse.up(); let c = await pos();
  log('Tastatur-Modus: Maus gedrückt bewegt nicht', dist(a, c) < 2, dist(a, c));
  a = await pos(); await p.keyboard.down('a'); await p.waitForTimeout(500); await p.keyboard.up('a'); c = await pos();
  log('Tastatur-Modus: A läuft nach links', c[0] - a[0] < -10, (c[0] - a[0]).toFixed(1));
  a = await pos(); await p.keyboard.down('w'); await p.keyboard.down('d'); await p.waitForTimeout(400); await p.keyboard.up('w'); await p.keyboard.up('d'); c = await pos();
  log('Tastatur-Modus: W+D läuft diagonal', c[0] - a[0] > 5 && c[1] - a[1] < -5, `${(c[0] - a[0]).toFixed(1)}, ${(c[1] - a[1]).toFixed(1)}`);
  a = await pos(); await p.waitForTimeout(400); c = await pos();
  log('Tastatur-Modus: nach Loslassen Stillstand', dist(a, c) < 2, dist(a, c));

  // Esc im Run -> Pause + Einstellungen
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  let s2 = await st();
  log('Esc im Run öffnet Einstellungen (Spiel pausiert)', s2.screen === 'screen-settings' && s2.state === 'paused', `${s2.screen} / ${s2.state}`);
  await p.click('#set-control [data-v="mouse"]'); await p.waitForTimeout(100);
  log('Umschalten auf Maus', (await st()).control === 'mouse', (await st()).control);
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  log('Esc → zurück ins Pausemenü', (await st()).screen === 'screen-pause', (await st()).screen);
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  s2 = await st();
  log('Esc im Pausemenü → weiterspielen', s2.state === 'play', s2.state);

  // Modus Maus
  a = await pos(); for (let i = 0; i < 8; i++) { await p.mouse.move(1100, 150 + i * 5); await p.waitForTimeout(50); } c = await pos();
  log('Maus-Modus: nur bewegen (ohne Klick) bewegt nicht', dist(a, c) < 2, dist(a, c));
  a = await pos(); await p.mouse.down(); await p.waitForTimeout(500); await p.mouse.up(); c = await pos();
  log('Maus-Modus: Taste halten läuft', dist(a, c) > 10, dist(a, c));
  await p.waitForTimeout(150); a = await pos(); await p.waitForTimeout(400); c = await pos();
  log('Maus-Modus: Loslassen stoppt', dist(a, c) < 2, dist(a, c));
  // Hängende Taste simulieren: mousedown, dann Bewegung mit buttons=0 (Taste woanders losgelassen)
  await p.mouse.down();
  await p.evaluate(() => { const c = document.getElementById('game'); c.dispatchEvent(new PointerEvent('pointermove', { clientX: 1000, clientY: 200, pointerType: 'mouse', buttons: 0, bubbles: true })); });
  await p.waitForTimeout(150); a = await pos(); await p.waitForTimeout(400); c = await pos();
  log('Maus-Modus: „hängende“ Taste wird erkannt und stoppt', dist(a, c) < 2, dist(a, c));
  await p.mouse.up();
  await p.screenshot({ path: OUT + '/run.png' });
  console.log(results.join('\n'));
  console.log('Fehler:', errs.length ? errs.join(' | ') : 'keine');
  process.exitCode = results.some(r => r.startsWith('✘')) || errs.length ? 1 : 0;
  await b.close();
})();
