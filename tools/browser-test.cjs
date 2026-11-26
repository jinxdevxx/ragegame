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

  // Premium-Skins: kaufen (Stufe für Stufe), auswählen, Schrott wird abgezogen
  p = await page('?slot=1');
  await p.evaluate(() => { const s = window.__rv.save; s.scrap = 2e14; s.skins = {}; s.skinSel = {}; });
  await click(p, '#btn-chars'); await p.waitForTimeout(300);
  await click(p, '[data-skinchar="grumpf"][data-skin="gold"]'); await p.waitForTimeout(100);
  const noSkip = await p.evaluate(() => !(window.__rv.save.skins.grumpf || []).includes('gold'));
  await click(p, '[data-skinchar="grumpf"][data-skin="silver"]'); await p.waitForTimeout(100);
  await click(p, '[data-skinchar="grumpf"][data-skin="gold"]'); await p.waitForTimeout(100);
  const sk = await p.evaluate(() => ({ s: window.__rv.save.skins.grumpf, sel: window.__rv.save.skinSel.grumpf, scrap: window.__rv.save.scrap }));
  log('Skins: Gold erst nach Silber, Kauf zieht Schrott ab, wird ausgewählt', noSkip && sk.s.join() === 'silver,gold' && sk.sel === 'gold' && sk.scrap < 1.01e14, `${sk.s.join('+')}, Rest ${sk.scrap.toExponential(2)}`);
  await click(p, '[data-skinchar="grumpf"][data-skin=""]'); await p.waitForTimeout(100);
  log('Skins: zurück auf Normal', await p.evaluate(() => window.__rv.save.skinSel.grumpf === ''));
  await p.close();

  // Geheimes Monster: erscheint erst, wenn alle Erfolge geschafft sind
  p = await page('?slot=1');
  const sec1 = await p.evaluate(() => { document.querySelector('#btn-chars').click(); return !window.__rv.save.unlockedChars.includes('urzorn') && /\?\?\?/.test(document.getElementById('char-grid').innerText) && !/Urzorn/.test(document.getElementById('char-grid').innerText); });
  await p.evaluate(() => { const s = window.__rv.save; window.__rv.C.ACHIEVEMENTS.forEach(a => s.achievements[a.id] = 1); document.querySelector('#btn-achievements').click(); });
  await p.waitForTimeout(400);
  const sec2 = await p.evaluate(() => window.__rv.save.unlockedChars.includes('urzorn'));
  log('Geheimes Monster: versteckt, nach allen Erfolgen freigeschaltet', sec1 && sec2);
  await p.close();

  // Welt-Aufstieg mit allen Mutationen: Karten werden angezeigt, nach 10 s automatische Wahl, Run läuft weiter
  p = await page('?slot=1');
  await click(p, '#btn-play'); await p.waitForTimeout(500);
  await p.evaluate(() => { const g = window.__rv.game; g.muts = window.__rv.C.MUTATIONS.map(m => m.id); g.p.mass = Math.pow(g.worlds[1].minRadius * 1.1, 2); g.p.r = Math.sqrt(g.p.mass); });
  await p.waitForTimeout(600);
  const mut1 = await p.evaluate(() => ({ scr: [...document.querySelectorAll('.screen')].filter(s => !s.hidden).map(s => s.id).join(), cards: document.querySelectorAll('#mut-cards [data-mut]').length, auto: document.getElementById('mut-auto').textContent }));
  await p.waitForTimeout(10800);
  const mut2 = await p.evaluate(() => ({ state: window.__rv.game.state, n: window.__rv.game.muts.length }));
  log('Mutation: volle Auswahl, nach 10 s automatisch gewählt, Run geht weiter', mut1.scr === 'screen-mutation' && mut1.cards === 3 && /10 s/.test(mut1.auto) && mut2.state === 'play' && mut2.n === 15, `${mut1.cards} Karten, danach ${mut2.state}`);
  await p.close();

  // Monster-Level & Talente: Punkt vergeben, Run gibt EP, Balken korrekt (nicht halbiert/leer)
  p = await page('?slot=1');
  await p.evaluate(() => { const s = window.__rv.save; s.monsters = { grumpf: { xp: 0, lvl: 20, pts: {} } }; s.totalKills = 50; s.achievements = {}; });
  await click(p, '#btn-chars'); await p.waitForTimeout(200); await click(p, '[data-talents="grumpf"]'); await p.waitForTimeout(200);
  await click(p, '[data-tal="mastery"]'); await p.waitForTimeout(100);
  const tal = await p.evaluate(() => ({ scr: [...document.querySelectorAll('.screen')].filter(s => !s.hidden).map(s => s.id).join(), pts: window.__rv.save.monsters.grumpf.pts, sigLocked: document.querySelector('[data-tal="sig"]').disabled }));
  log('Talente: Skill-Meister ab Lvl 15 vergeben, Signatur (Lvl 40) gesperrt', tal.scr === 'screen-talents' && tal.pts.mastery === 1 && tal.sigLocked);
  await p.keyboard.press('Escape'); await p.waitForTimeout(150); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  await click(p, '#btn-achievements'); await p.waitForTimeout(300);
  const bw = await p.evaluate(() => { const e = document.querySelector('.ach:not(.done) .bar.tiny > div'); return e.getBoundingClientRect().width / e.parentElement.getBoundingClientRect().width; });
  log('Erfolgs-Balken zeigt echten Fortschritt (50/100)', Math.abs(bw - 0.5) < 0.05, (bw * 100).toFixed(0) + ' %');
  await p.close();

  // Update-Hinweis „Neu in vX“ verschwindet nach 10 s von selbst, Punkt am Patch-Notes-Knopf bleibt
  p = await page('?slot=1');
  await p.evaluate(() => { const m = JSON.parse(localStorage.getItem('rageverse_meta') || '{}'); m.seenVersion = '0.1.0'; localStorage.setItem('rageverse_meta', JSON.stringify(m)); });
  await p.reload(); await p.waitForTimeout(800);
  const tv = await p.evaluate(() => !document.getElementById('toast').hidden);
  await p.waitForTimeout(10500);
  const th = await p.evaluate(() => document.getElementById('toast').hidden && !document.getElementById('notes-dot').hidden);
  log('Neu-Hinweis verschwindet nach 10 s von selbst', tv && th);
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
  log('Monster-Auswahl zeigt 11 Monster mit Skill + 1 geheimes', await p.evaluate(() => document.querySelectorAll('.char').length === 12 && document.querySelectorAll('.char-skill').length + document.querySelectorAll('.char.secret').length === 12));
  await p.screenshot({ path: OUT + '/monster.png' });
  await p.close();

  console.log(R.join('\n')); console.log('Fehler:', errs.length ? errs.join(' | ') : 'keine');
  process.exitCode = R.some(r => r.startsWith('✘')) || errs.length ? 1 : 0;
  await b.close();
})();
