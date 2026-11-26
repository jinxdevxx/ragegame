// Browser-Test für Menüs und neue Funktionen.
// Vorher im Repo: python3 -m http.server 8080 ; dann: node tools/browser-test.cjs [screenshot-ordner]
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp';
(async () => {
  const b = await chromium.launch();
  const R = []; const errs = [];
  const log = (n, ok, i = '') => R.push(`${ok ? '✔' : '✘'} ${n}${i ? '  (' + i + ')' : ''}`);
  const page = async (q = '?slot=1') => { const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); await p.goto('http://localhost:8080/' + q); await p.waitForTimeout(600); return p; };
  const vis = p => p.evaluate(() => [...document.querySelectorAll('.screen')].filter(s => !s.hidden).map(s => s.id).join(','));
  const click = (p, sel) => p.evaluate(s => document.querySelector(s).click(), sel);

  // Frischer Start → Spielstand-Auswahl
  let p = await page('');
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(600);
  log('Start zeigt Spielstand-Auswahl', (await vis(p)) === 'screen-slots');
  await click(p, '[data-new="0"]'); await p.waitForTimeout(150); await p.fill('#slot-name-input', 'Testheld'); await p.keyboard.press('Enter'); await p.waitForTimeout(400);
  log('Neuer Spielstand → Menü', (await vis(p)) === 'screen-menu');
  await p.close();

  // Einstellungen: kein „Spielstand löschen“ mehr; Löschen nur mit eigener Bestätigung
  p = await page('?slot=1');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  log('Einstellungen ohne Spielstand-Reset', await p.evaluate(() => !document.getElementById('set-reset') && !/zurücksetzen|Spielstand löschen/i.test(document.getElementById('screen-settings').innerText)));
  await p.evaluate(() => { localStorage.setItem('rageverse_slot_2', JSON.stringify({ name: 'Wegwerf', created: 1, lastPlayed: 1 })); });
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  await click(p, '#menu-slot'); await p.waitForTimeout(300);
  await click(p, '[data-del="2"]'); await p.waitForTimeout(150);
  const asked = await p.evaluate(() => !document.getElementById('confirm-modal').hidden && !!localStorage.getItem('rageverse_slot_2'));
  await click(p, '#confirm-no'); await p.waitForTimeout(100);
  const kept = await p.evaluate(() => !!localStorage.getItem('rageverse_slot_2'));
  await click(p, '[data-del="2"]'); await p.waitForTimeout(800); await click(p, '#confirm-yes'); await p.waitForTimeout(300);
  const gone = await p.evaluate(() => !localStorage.getItem('rageverse_slot_2'));
  log('Spielstand löschen: Abfrage, Abbrechen behält, Bestätigen löscht', asked && kept && gone);
  await p.close();

  // Erfolge + Statistik
  p = await page('?slot=1');
  await p.evaluate(() => { const s = window.__rv.save; s.totalKills = 1500; s.runs = 12; s.stats = { bestCombo: 25, playTime: 3700 }; });
  await click(p, '#btn-achievements'); await p.waitForTimeout(1200);
  const ach = await p.evaluate(() => ({ count: document.getElementById('ach-count').textContent, items: document.querySelectorAll('.ach.done').length, chaos: window.__rv.save.chaos }));
  log('Erfolge: werden vergeben und belohnt', ach.items >= 3 && ach.chaos > 0, `${ach.count}, ☠ ${ach.chaos}`);
  await p.screenshot({ path: OUT + '/erfolge.png' });
  await click(p, '[data-atab="stats"]'); await p.waitForTimeout(200);
  const stats = await p.evaluate(() => document.getElementById('ach-grid').innerText);
  log('Statistik zeigt „Objekte zerstört“', /Objekte zerstört/.test(stats) && /1\.50K|1500/.test(stats));
  await p.screenshot({ path: OUT + '/statistik.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  log('Esc → zurück ins Menü', (await vis(p)) === 'screen-menu');

  // Schurkenhöhle: Evolution
  await p.evaluate(() => { const s = window.__rv.save; s.upgrades.dash = 8; s.chaos = 50000; });
  await click(p, '#btn-shop-menu'); await p.waitForTimeout(200); await click(p, '[data-tab="evo"]'); await p.waitForTimeout(200);
  await click(p, '[data-evo="dash1"]'); await p.waitForTimeout(200);
  log('Evolution kaufen (Flammen-Ansturm)', await p.evaluate(() => !!window.__rv.save.evos.dash1));
  await p.screenshot({ path: OUT + '/evolution.png' });

  // Währungs-Stufen
  await p.evaluate(() => { window.__rv.save.scrap = 2.5e9; }); await click(p, '[data-tab="body"]'); await p.waitForTimeout(150);
  log('Währung: 2,5 Mrd. Schrott = 🥈 2.50 Platin', (await p.evaluate(() => document.getElementById('shop-scrap').textContent)).includes('2.50 Platin'));

  // Run: Monster-Skill (F), Auftrag, Run beenden
  await click(p, '[data-play]'); await p.waitForTimeout(600);
  const before = await p.evaluate(() => window.__rv.game.p.skillCd);
  await p.keyboard.press('f'); await p.waitForTimeout(200);
  log('Taste F löst den Monster-Skill aus', await p.evaluate(b => window.__rv.game.p.skillCd > b, before));
  await p.waitForTimeout(5000);
  const q = await p.evaluate(() => ({ shown: !document.getElementById('hud-quest').hidden, reward: document.getElementById('q-reward').textContent }));
  log('Auftrag mit Belohnung wird angezeigt', q.shown && /Belohnung/.test(q.reward), q.reward);
  await p.screenshot({ path: OUT + '/auftrag.png' });
  const sc0 = await p.evaluate(() => window.__rv.save.scrap);
  await click(p, '#btn-endrun'); await p.waitForTimeout(100); await click(p, '#btn-endrun'); await p.waitForTimeout(2200);
  log('🏁 Run beenden → Ergebnis, Schrott behalten', (await vis(p)) === 'screen-results' && (await p.evaluate(() => window.__rv.save.scrap)) >= sc0);
  await p.close();

  // Boss
  p = await page('?world=49&upgrades=250&unlock=1');
  await click(p, '#btn-play'); await p.waitForTimeout(1500);
  log('Boss-Anzeige in Welt 50', await p.evaluate(() => !document.getElementById('boss-bar').hidden && !!window.__rv.game.boss));
  await p.screenshot({ path: OUT + '/boss.png' });
  await p.close();

  // Monster-Auswahl zeigt Skills
  p = await page('?slot=1&unlock=1');
  await click(p, '#btn-chars'); await p.waitForTimeout(800);
  log('Monster-Auswahl zeigt 11 Monster mit Skill', await p.evaluate(() => document.querySelectorAll('.char').length === 11 && document.querySelectorAll('.char-skill').length === 11));
  await p.screenshot({ path: OUT + '/monster.png' });
  await p.close();

  console.log(R.join('\n')); console.log('Fehler:', errs.length ? errs.join(' | ') : 'keine');
  process.exitCode = R.some(r => r.startsWith('✘')) || errs.length ? 1 : 0;
  await b.close();
})();
