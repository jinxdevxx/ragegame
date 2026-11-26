// =====================================================================
//  RAGEVERSE – Einstieg: Game-Loop, Steuerung, Menüs, Shop, Updates
// =====================================================================
import * as C from './config.js';
import { Game, computeStats, upgradeLevel, upgradeCost, fmt, charDef, mapDef } from './game.js';
import { render, drawMonsterPreview } from './render.js';
import { initAudio, setMuted, setMusic, setIntensity, sfx } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { PATCH_NOTES, VERSION } from './patchnotes.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const canvas = $('game');
const ctx = canvas.getContext('2d');
const save = loadSave();
const params = new URLSearchParams(location.search);

// Test-Parameter: ?scrap=100000 ?chaos=5000 ?world=3 ?upgrades=10 ?char=golem ?map=west ?unlock=1
if (params.has('scrap')) save.scrap = Number(params.get('scrap')) || 0;
if (params.has('chaos')) save.chaos = Number(params.get('chaos')) || 0;
if (params.has('upgrades')) { const l = Number(params.get('upgrades')) || 0; C.UPGRADES.forEach(u => save.upgrades[u.id] = Math.min(u.max, l)); }
if (params.has('unlock')) { save.unlockedChars = C.CHARACTERS.map(c => c.id); save.mapBest = { suburb: 7 }; save.bestWorld = 7; save.totalKills = 99999; }
if (params.has('char')) save.selectedChar = params.get('char');
if (params.has('map')) save.selectedMap = params.get('map');

let inRun = false;
const game = new Game(save, {
  sfx: (n, v) => { if (inRun) sfx(n, v); },
  onWorld: (w, choices) => { if (inRun) showMutation(w, choices); else game.chooseMutation(null); },
  onEnd: s => { if (inRun) showResults(s); else game.start(); },
  onEvent: e => { if (inRun) showEvent(e); },
  onCallout: (text, i) => { if (inRun) callout(text, i); },
  onBerserk: on => { if (inRun) { setIntensity(on ? 2 : 1); if (on) callout('BERSERKER!', 5); } },
  onBerserkReady: () => { if (inRun) hint('😡 Berserker bereit! Drück <b>R</b> (oder tippe 😡)', 3); },
  onQuest: (q, done) => { if (inRun) questUpdate(q, done); },
});
window.__rv = { game, save, C };

// ------------------------------------------------------------------
// Canvas-Größe
// ------------------------------------------------------------------
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  game.vw = W; game.vh = H;
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------
// Steuerung
// ------------------------------------------------------------------
const input = { dx: 0, dy: 0, dash: false, slam: false, berserk: false };
const keys = new Set();
const pointer = { active: false, x: 0, y: 0, touch: false };
let lastTap = 0;

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys.add(k);
  if (!inRun) return;
  if (k === ' ') { input.dash = true; e.preventDefault(); }
  if (k === 'e' || k === 'shift') input.slam = true;
  if (k === 'r' || k === 'q') input.berserk = true;
  if ((k === 'p' || k === 'escape') && game.state === 'play') pause();
  else if ((k === 'p' || k === 'escape') && game.state === 'paused') resume();
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); if (game.state === 'play' && inRun) pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'play' && inRun) pause(); else if (!document.hidden) checkForUpdate(); });

canvas.addEventListener('pointerdown', e => {
  initAudio();
  pointer.active = true; pointer.x = e.clientX; pointer.y = e.clientY;
  pointer.touch = e.pointerType === 'touch';
  if (pointer.touch) {
    document.body.classList.add('touch');
    const now = performance.now();
    if (now - lastTap < 300) input.dash = true;
    lastTap = now;
  } else if (e.button === 2) input.dash = true;
});
canvas.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; if (e.pointerType === 'mouse') pointer.active = true; });
canvas.addEventListener('pointerup', e => { if (e.pointerType === 'touch') pointer.active = false; });
canvas.addEventListener('pointercancel', () => { pointer.active = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
const abBtn = (id, key) => $(id).addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); input[key] = true; });
abBtn('ab-dash', 'dash'); abBtn('ab-slam', 'slam'); abBtn('ab-berserk', 'berserk');

function readInput() {
  let dx = 0, dy = 0;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  if (dx || dy) { const l = Math.hypot(dx, dy); input.dx = dx / l; input.dy = dy / l; return; }
  if (pointer.active && game.p) {
    const px = (game.p.x - game.cam.x) * game.cam.zoom + W / 2;
    const py = (game.p.y - game.p.r - game.cam.y) * game.cam.zoom + H / 2;
    const R = game.p.r * game.cam.zoom;
    const vx = pointer.x - px, vy = pointer.y - py, d = Math.hypot(vx, vy);
    if (d < R * 0.5) { input.dx = 0; input.dy = 0; return; }
    const m = Math.min(1, (d - R * 0.5) / (R * 2.5));
    input.dx = vx / d * m; input.dy = vy / d * m;
    return;
  }
  input.dx = 0; input.dy = 0;
}

// ------------------------------------------------------------------
// Game-Loop
// ------------------------------------------------------------------
let lastT = performance.now(), menuTime = 0;
function frame(t) {
  let dt = (t - lastT) / 1000; lastT = t;
  if (dt > 0.05) dt = 0.05;
  const time = t / 1000;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (inRun) {
    readInput();
    game.update(dt, input);
    render(ctx, game, W, H, time);
    updateHud(time);
  } else {
    // Menü-Hintergrund: Demo-Welt, das Monster stapft herum
    menuTime += dt;
    if (!game.p || game.state === 'over' || game.state === 'dying') { game.start(); }
    game.state = 'play';
    const demo = { dx: Math.cos(menuTime * 0.3), dy: Math.sin(menuTime * 0.21), dash: false };
    game.p.rage = game.stats.rageMax; game.quest = null; game.questT = 999;
    game.update(dt, demo);
    if (game.state === 'mutation') game.chooseMutation(null);
    render(ctx, game, W, H, time);
    animatePreviews(time);
  }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------
// Screens
// ------------------------------------------------------------------
const SCREENS = ['screen-menu', 'screen-shop', 'screen-chars', 'screen-maps', 'screen-help', 'screen-results', 'screen-mutation', 'screen-pause'];
let current = 'screen-menu', helpFrom = 'screen-menu';
function show(id) {
  current = id;
  for (const s of SCREENS) $(s).hidden = s !== id;
  $('hud').hidden = !inRun;
  document.body.classList.toggle('playing', inRun && !id);
  if (!inRun || id) flushPendingToast();
}

function startRun() {
  initAudio(); sfx('click');
  inRun = true;
  const opts = {};
  if (params.has('world')) { const w = C.WORLDS[Number(params.get('world'))]; if (w) opts.radius = Math.max(w.minRadius * 1.15, 10); }
  game.start(opts);
  lastCombo = 0; hudCache = {};
  renderMuts();
  $('hud-quest').hidden = true; $('hud-event').hidden = true; $('callout').hidden = true; $('hint').hidden = true;
  setIntensity(1);
  show(null);
  showBanner(game.worlds[game.world].name.toUpperCase());
  tutorial();
}
function pause() { if (game.state !== 'play' || !inRun) return; game.state = 'paused'; show('screen-pause'); }
function resume() { if (game.state !== 'paused') return; game.state = 'play'; lastT = performance.now(); show(null); }
function back() { sfx('click'); if (current === 'screen-help' && helpFrom === 'screen-pause') { show('screen-pause'); return; } openMenu(); }

document.querySelectorAll('[data-play]').forEach(b => b.onclick = startRun);
document.querySelectorAll('[data-back]').forEach(b => b.onclick = back);
$('btn-play').onclick = startRun;
$('btn-shop-menu').onclick = () => openShop();
$('btn-res-shop').onclick = () => openShop();
$('btn-res-menu').onclick = () => openMenu();
$('btn-chars').onclick = () => openChars();
$('btn-maps').onclick = () => openMaps();
$('btn-help').onclick = () => openHelp('screen-menu');
$('btn-pause-help').onclick = () => openHelp('screen-pause');
$('btn-pause').onclick = pause;
$('btn-resume').onclick = resume;
$('btn-quit').onclick = () => { game.state = 'play'; game.p.rage = 0; game.die(); show(null); };

function bestWorldAny() { return Math.max(save.bestWorld || 0, ...Object.values(save.mapBest || {}), 0); }
function reqMet(req) {
  if (!req) return true;
  if (req.kills && (save.totalKills || 0) < req.kills) return false;
  if (req.world !== undefined && bestWorldAny() < req.world) return false;
  return true;
}
function reqProgress(req) {
  if (!req) return '';
  if (req.kills) return `${fmt(Math.min(save.totalKills || 0, req.kills))} / ${fmt(req.kills)}`;
  if (req.world !== undefined) return reqMet(req) ? 'erreicht' : `bisher: ${C.WORLDS[bestWorldAny()].name}`;
  return '';
}

function openMenu() {
  inRun = false; setIntensity(0);
  const ch = charDef(save.selectedChar), mp = mapDef(save.selectedMap);
  $('menu-char').innerHTML = `👹 <b>${esc(ch.name)}</b> <small>${esc(ch.title)}</small>`;
  $('menu-map').innerHTML = `${mp.icon} <b>${esc(mp.name)}</b>${mp.scrapMult > 1 ? ` <small>×${mp.scrapMult} Schrott</small>` : ''}`;
  $('menu-scrap').textContent = fmt(save.scrap);
  $('menu-chaos').textContent = fmt(save.chaos);
  const w = C.WORLDS[bestWorldAny()] || C.WORLDS[0];
  $('menu-stats').innerHTML = save.runs ? `
    <div class="stat"><b>${w.name}</b><small>Weiteste Welt</small></div>
    <div class="stat"><b>${fmt(save.totalKills || 0)}</b><small>Zerstört</small></div>
    <div class="stat"><b>${save.runs}</b><small>Runs</small></div>` : '';
  show('screen-menu');
}

// ------------------------------------------------------------------
// Werkstatt
// ------------------------------------------------------------------
function openShop() { inRun = false; setIntensity(0); sfx('click'); renderShop(); show('screen-shop'); }
function renderShop() {
  $('shop-scrap').textContent = fmt(save.scrap);
  const base = computeStats({ upgrades: {} }, [], 'grumpf');
  const st = computeStats(save, [], 'grumpf');
  const effect = {
    size: () => `Start ${(st.startRadius / base.startRadius).toFixed(2)}×`,
    rage: () => `${Math.round(st.rageMax)} Wut`,
    calm: () => `−${Math.round((1 - st.rageDrain / base.rageDrain) * 100)} % Verlust`,
    dmg: () => `${st.damage.toFixed(2)}× Schaden`,
    hard: () => `bis ${Math.round(st.breakRatio * 100)} % deiner Größe`,
    speed: () => `${(st.speed / base.speed).toFixed(2)}× Tempo`,
    absorb: () => `${(st.absorb / base.absorb).toFixed(2)}× Wachstum`,
    scrap: () => `${(st.scrapMult / base.scrapMult).toFixed(2)}× Schrott`,
    magnet: () => `Reichweite ${(2.5 + st.magnet * 2).toFixed(1)}× Körper`,
    dash: () => `${st.dashCooldown.toFixed(1)} s Abklingzeit`,
    slam: () => `${st.slamCooldown.toFixed(1)} s · Radius ${st.slamRadius.toFixed(1)}×`,
    berserk: () => `${st.berserkGain.toFixed(2)}× Aufladung`,
  };
  $('shop-grid').innerHTML = C.UPGRADES.map(u => {
    const l = upgradeLevel(save, u.id), maxed = l >= u.max, cost = upgradeCost(u, l), can = !maxed && save.scrap >= cost;
    const pct = Math.round(l / u.max * 100);
    return `<div class="upg ${can ? 'can' : ''}" data-id="${u.id}">
      <div class="upg-top"><div class="upg-icon">${u.icon}</div><div class="upg-txt"><div class="upg-name">${u.name} <span class="lv">Lv ${l}</span></div><div class="upg-lvl">${effect[u.id] ? effect[u.id]() : ''}</div></div></div>
      <div class="upg-desc">${u.desc}</div>
      <div class="bar tiny"><div style="width:${pct}%"></div></div>
      <button class="btn ${can ? 'primary' : ''}" data-buy="${u.id}" ${can ? '' : 'disabled'}>${maxed ? 'MAX' : '⚙ ' + fmt(cost)}</button>
    </div>`;
  }).join('');
}
$('shop-grid').addEventListener('click', e => {
  const b = e.target.closest('[data-buy]'); if (!b) return;
  const u = C.UPGRADES.find(x => x.id === b.dataset.buy);
  const l = upgradeLevel(save, u.id), cost = upgradeCost(u, l);
  if (l >= u.max || save.scrap < cost) { sfx('deny'); return; }
  save.scrap -= cost; save.upgrades[u.id] = l + 1; writeSave(save);
  sfx('buy'); renderShop();
  const card = $('shop-grid').querySelector(`[data-id="${u.id}"]`);
  if (card) { card.classList.add('bought'); setTimeout(() => card.classList.remove('bought'), 400); }
});

// ------------------------------------------------------------------
// Monster
// ------------------------------------------------------------------
const previews = [];
function openChars() {
  inRun = false; sfx('click');
  $('chars-chaos').textContent = fmt(save.chaos);
  previews.length = 0;
  $('char-grid').innerHTML = C.CHARACTERS.map(ch => {
    const owned = save.unlockedChars.includes(ch.id), sel = save.selectedChar === ch.id;
    const met = reqMet(ch.req), afford = save.chaos >= ch.cost;
    let btn;
    if (sel) btn = `<button class="btn" disabled>✔ Ausgewählt</button>`;
    else if (owned) btn = `<button class="btn primary" data-sel="${ch.id}">Wählen</button>`;
    else if (!met) btn = `<button class="btn" disabled>🔒 ${esc(ch.req.label)}</button>`;
    else btn = `<button class="btn ${afford ? 'primary' : ''}" data-buychar="${ch.id}" ${afford ? '' : 'disabled'}>☠ ${fmt(ch.cost)} freischalten</button>`;
    return `<div class="char ${sel ? 'sel' : ''} ${owned ? '' : 'locked'}">
      <canvas width="240" height="200" data-prev="${ch.id}"></canvas>
      <div class="char-name">${esc(ch.name)} <small>${esc(ch.title)}</small></div>
      <div class="char-desc">${esc(ch.desc)}</div>
      ${!owned && ch.req ? `<div class="char-req ${met ? 'ok' : ''}">${met ? '✔' : '🔒'} ${esc(ch.req.label)} <span>${reqProgress(ch.req)}</span></div>` : ''}
      ${btn}
    </div>`;
  }).join('');
  $('char-grid').querySelectorAll('canvas[data-prev]').forEach(cv => previews.push({ cv, char: charDef(cv.dataset.prev), locked: !save.unlockedChars.includes(cv.dataset.prev) }));
  show('screen-chars');
}
$('char-grid').addEventListener('click', e => {
  const s = e.target.closest('[data-sel]');
  if (s) { save.selectedChar = s.dataset.sel; writeSave(save); sfx('buy'); openChars(); return; }
  const b = e.target.closest('[data-buychar]');
  if (b) {
    const ch = charDef(b.dataset.buychar);
    if (save.chaos < ch.cost || !reqMet(ch.req)) { sfx('deny'); return; }
    save.chaos -= ch.cost; save.unlockedChars.push(ch.id); save.selectedChar = ch.id; writeSave(save);
    sfx('unlock'); openChars();
  }
});
let stageCycle = 0;
function animatePreviews(time) {
  if (current === 'screen-menu') {
    stageCycle = Math.floor(time / 2.5) % (bestWorldAny() + 1);
    drawMonsterPreview($('menu-monster'), charDef(save.selectedChar), stageCycle, time, false);
  }
  if (current === 'screen-chars') for (const p of previews) drawMonsterPreview(p.cv, p.char, p.locked ? 0 : Math.floor(time / 2) % 8, time, p.locked);
}

// ------------------------------------------------------------------
// Karten
// ------------------------------------------------------------------
function openMaps() {
  inRun = false; sfx('click');
  $('map-grid').innerHTML = C.MAPS.map(m => {
    const met = reqMet(m.req), sel = save.selectedMap === m.id;
    const best = (save.mapBest || {})[m.id];
    const cols = m.worlds.slice(0, 3).map(w => `<i style="background:${w.bg}"></i>`).join('');
    return `<div class="map ${sel ? 'sel' : ''} ${met ? '' : 'locked'}">
      <div class="map-top"><span class="map-ic">${m.icon}</span><div><div class="map-name">${esc(m.name)}</div><div class="map-sw">${cols}</div></div></div>
      <div class="char-desc">${esc(m.desc)}</div>
      <div class="map-stats"><span>⚙ ×${m.scrapMult}</span><span>☠ ×${m.chaosMult}</span><span>❤ ×${m.hpMult} zäher</span></div>
      <div class="map-worlds">${m.worlds.slice(0, 3).map(w => esc(w.name)).join(' → ')} → …</div>
      ${best !== undefined ? `<div class="char-req ok">Rekord: ${esc(m.worlds[best].name)}</div>` : ''}
      ${sel ? '<button class="btn" disabled>✔ Ausgewählt</button>' : met ? `<button class="btn primary" data-map="${m.id}">Wählen</button>` : `<button class="btn" disabled>🔒 ${esc(m.req.label)}</button>`}
    </div>`;
  }).join('');
  show('screen-maps');
}
$('map-grid').addEventListener('click', e => {
  const b = e.target.closest('[data-map]'); if (!b) return;
  save.selectedMap = b.dataset.map; writeSave(save); sfx('buy'); openMaps();
});

// ------------------------------------------------------------------
// Hilfe
// ------------------------------------------------------------------
function openHelp(from) {
  helpFrom = from; sfx('click');
  const st = computeStats(save, game.muts && inRun ? game.muts : [], save.selectedChar);
  const A = C.ABILITIES;
  $('help-body').innerHTML = `
    <h3>Steuerung</h3>
    <div class="help-grid">
      <div class="hk"><kbd>Maus</kbd> / <kbd>WASD</kbd> / Finger</div><div>Bewegen. Das Monster läuft in Richtung Maus bzw. Finger.</div>
      <div class="hk"><kbd>P</kbd> / <kbd>Esc</kbd></div><div>Pause</div>
    </div>
    <h3>Fähigkeiten</h3>
    <div class="help-abs">
      <div class="habs"><span class="ab-ic">⚡</span><div><b>${A.dash.name}</b> <kbd>Leertaste</kbd> · Doppeltipp<br>${A.dash.desc}<br><small>Abklingzeit: <b>${st.dashCooldown.toFixed(1)} s</b> (Upgrade „Ansturm“)</small></div></div>
      <div class="habs"><span class="ab-ic">💥</span><div><b>${A.slam.name}</b> <kbd>E</kbd> · 💥-Button<br>${A.slam.desc}<br><small>Abklingzeit: <b>${st.slamCooldown.toFixed(1)} s</b> · Radius: <b>${st.slamRadius.toFixed(1)}× Körper</b> (Upgrade „Erdbeben“)</small></div></div>
      <div class="habs"><span class="ab-ic">😡</span><div><b>${A.berserk.name}</b> <kbd>R</kbd> · 😡-Button<br>${A.berserk.desc}<br><small>Dauer: <b>${st.berserkTime.toFixed(0)} s</b> (Upgrade „Berserker“ lädt schneller)</small></div></div>
    </div>
    <h3>Wie es funktioniert</h3>
    <ul class="help-list">
      <li><b>🔥 Wut</b> ist deine Zeit. Sie sinkt ständig und mit der Zeit immer schneller. Jede Zerstörung füllt sie wieder auf.</li>
      <li><b>Wachsen:</b> Alles Zerstörte macht dich größer. Bist du groß genug, steigst du in die nächste Welt auf, wählst eine <b>Mutation</b> und dein Monster <b>evolviert</b>.</li>
      <li><b>Gestrichelter Kreis</b> = noch zu groß für dich. <b>Rot mit ⚠</b> = Hindernis, das dir Wut abzieht, wenn du reinläufst.</li>
      <li><b>⚙ Schrott</b> fällt als Münzen heraus – einsammeln! Damit kaufst du Upgrades in der <b>Werkstatt</b>.</li>
      <li><b>☠ Chaos</b> bekommst du für jede Zerstörung, extra für große Brocken und Aufträge. Damit schaltest du neue <b>Monster</b> frei.</li>
      <li><b>Aufträge</b> oben links bringen Wut, Schrott, Chaos und Berserker-Ladung.</li>
      <li><b>Kombo:</b> Schnell hintereinander zerstören = bis zu ×${C.COMBO.max} Schrott.</li>
      <li><b>Goldene Objekte</b> = ×${C.GOLDEN_MULT} Schrott. <b>Schrottkisten</b> platzen wie Piñatas. <b>⚠-Fässer</b> explodieren in Kettenreaktionen.</li>
      <li><b>Neue Karten</b> schaltest du über deine weiteste Welt frei. Sie sind härter, bringen aber deutlich mehr.</li>
    </ul>`;
  show('screen-help');
}

// ------------------------------------------------------------------
// Ergebnis
// ------------------------------------------------------------------
function showResults(s) {
  writeSave(save);
  setIntensity(0);
  const mins = Math.floor(s.time / 60), secs = Math.floor(s.time % 60);
  const mutNames = s.muts.map(id => { const m = C.MUTATIONS.find(x => x.id === id); return m ? m.icon + ' ' + m.name : id; });
  const worlds = mapDef(s.map).worlds;
  // Neu freischaltbar?
  const unlockables = C.CHARACTERS.filter(c => !save.unlockedChars.includes(c.id) && reqMet(c.req) && save.chaos >= c.cost);
  const maps = C.MAPS.filter(m => reqMet(m.req) && !(save.seenMaps || []).includes(m.id) && m.req);
  $('results-body').innerHTML = `
    <div class="res-earned">
      <div><b id="res-scrap">0</b><span>⚙ Schrott</span></div>
      <div class="chaos"><b id="res-chaos">0</b><span>☠ Chaos</span></div>
    </div>
    <div class="res-grid">
      <div class="stat"><b>${esc(worlds[s.world].name)}</b><small>Welt erreicht ${s.newWorld ? '<span class="badge">NEU!</span>' : ''}</small></div>
      <div class="stat"><b>${fmt(s.kills)}</b><small>Zerstört</small></div>
      <div class="stat"><b>${mins}:${String(secs).padStart(2, '0')}</b><small>Wutdauer</small></div>
      <div class="stat"><b>${s.bestCombo}×</b><small>Beste Kombo</small></div>
    </div>
    ${s.quests ? `<div class="res-muts">✅ ${s.quests} Auftr${s.quests === 1 ? 'ag' : 'äge'} erfüllt</div>` : ''}
    ${mutNames.length ? `<div class="res-muts">Mutationen: ${mutNames.join(' · ')}</div>` : ''}
    ${unlockables.length ? `<div class="res-unlock">🎉 Du kannst jetzt <b>${unlockables.map(c => esc(c.name)).join(', ')}</b> freischalten! → Monster</div>` : ''}
    ${maps.length ? `<div class="res-unlock">🗺 Neue Karte freigeschaltet: <b>${maps.map(m => esc(m.name)).join(', ')}</b>!</div>` : ''}`;
  if (maps.length) { save.seenMaps = [...(save.seenMaps || []), ...maps.map(m => m.id)]; writeSave(save); }
  inRun = false;
  show('screen-results');
  countUp($('res-scrap'), s.earned, 900);
  countUp($('res-chaos'), s.chaos, 900);
}
function countUp(el, target, ms) {
  const t0 = performance.now();
  let lastTick = 0;
  function step(t) {
    const k = Math.min(1, (t - t0) / ms), v = target * (1 - Math.pow(1 - k, 3));
    el.textContent = '+' + fmt(v);
    if (t - lastTick > 60 && k < 1) { sfx('coin', Math.floor(k * 14)); lastTick = t; }
    if (k < 1) requestAnimationFrame(step); else el.classList.add('done');
  }
  requestAnimationFrame(step);
}

// ------------------------------------------------------------------
// Mutation / Welt-Aufstieg / Events / Aufträge
// ------------------------------------------------------------------
function showMutation(w, choices) {
  $('mut-title').textContent = game.worlds[w].name.toUpperCase() + ' ERREICHT!';
  const evo = game.char.colors ? `${game.char.name} wird stärker!` : `Grumpf evolviert zum ${C.EVOLUTION[Math.min(w, 7)].name}!`;
  $('mut-evo').textContent = '🧬 ' + evo;
  $('mut-cards').innerHTML = choices.map(m => `<button class="mut-card" data-mut="${m.id}"><div class="ic">${m.icon}</div><b>${m.name}</b><span>${m.desc}</span></button>`).join('');
  show('screen-mutation');
}
$('mut-cards').addEventListener('click', e => {
  const b = e.target.closest('[data-mut]'); if (!b) return;
  sfx('buy');
  game.chooseMutation(b.dataset.mut);
  renderMuts();
  lastT = performance.now();
  show(null);
  showBanner(game.worlds[game.world].name.toUpperCase());
});
function renderMuts() {
  $('hud-muts').innerHTML = game.muts.map(id => { const m = C.MUTATIONS.find(x => x.id === id); return `<span title="${esc(m.name)}: ${esc(m.desc)}">${m.icon}</span>`; }).join('');
}
function showBanner(text) {
  const b = $('banner');
  b.hidden = true; void b.offsetWidth; b.textContent = text; b.hidden = false;
  clearTimeout(showBanner.t); showBanner.t = setTimeout(() => b.hidden = true, 1800);
}
function showEvent(e) { const el = $('hud-event'); el.innerHTML = `<b>${e.name}</b>${e.desc}`; el.hidden = false; }
function callout(text, tier) {
  const el = $('callout');
  el.hidden = true; void el.offsetWidth;
  el.textContent = text; el.dataset.tier = Math.min(tier, 5); el.hidden = false;
  clearTimeout(callout.t); callout.t = setTimeout(() => el.hidden = true, 1100);
}
function questUpdate(q, done) {
  const el = $('hud-quest');
  el.hidden = false;
  $('q-label').textContent = q.label;
  el.classList.toggle('done', done);
  if (done) { $('q-bar').style.width = '100%'; callout('AUFTRAG ERFÜLLT!', 3); setTimeout(() => { if (!game.quest) el.hidden = true; }, 1500); }
}
let hintTimer = 0;
function hint(html, secs = 4) {
  const el = $('hint'); el.innerHTML = html; el.hidden = false;
  clearTimeout(hintTimer); hintTimer = setTimeout(() => el.hidden = true, secs * 1000);
}
function tutorial() {
  if ((save.tutorial || 0) >= 3) return;
  save.tutorial = (save.tutorial || 0) + 1; writeSave(save);
  const steps = [
    [0.5, 'Lauf in Dinge, die <b>kleiner</b> sind als du – und mach sie kaputt! 👊'],
    [5, '<b>Leertaste</b> (oder Doppeltipp) = ⚡ Ansturm nach vorne'],
    [10, '<b>E</b> = 💥 Stampfer: Erdbeben um dich herum'],
    [15, 'Die 🔥 <b>Wut</b> sinkt ständig – zerstör weiter, sonst ist der Run vorbei!'],
  ];
  for (const [t, txt] of steps) setTimeout(() => { if (inRun) hint(txt, 4.5); }, t * 1000);
}

// ------------------------------------------------------------------
// HUD
// ------------------------------------------------------------------
let lastCombo = 0, hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function setAb(id, frac, label, ready, extra = '') {
  const el = $(id);
  el.style.setProperty('--p', (frac * 100).toFixed(1) + '%');
  el.classList.toggle('ready', ready);
  if (hudCache[id + 't'] !== label) { hudCache[id + 't'] = label; el.querySelector('.ab-t').textContent = label; }
  el.dataset.extra = extra;
}
function updateHud() {
  if (!inRun || !game.p) return;
  const p = game.p, S = game.stats, rf = p.rage / S.rageMax;
  $('hud-rage-bar').style.width = (rf * 100).toFixed(1) + '%';
  $('hud-rage-bar').parentElement.classList.toggle('low', rf < 0.25);
  setText('hud-scrap', fmt(game.runScrap));
  setText('hud-chaos', fmt(game.runChaos));
  const w = game.worlds[game.world], next = game.worlds[game.world + 1];
  setText('hud-world-name', w.name);
  setText('hud-world-next', next ? '→ ' + next.name : '∞ Endlos');
  $('hud-world-bar').style.width = (game.worldProgress() * 100).toFixed(1) + '%';
  const comboEl = $('hud-combo');
  if (game.combo >= 3) {
    comboEl.hidden = false;
    const mult = Math.min(C.COMBO.max, 1 + game.combo * C.COMBO.perStep);
    setText('hud-combo', `${game.combo} KOMBO · ×${mult.toFixed(1)}`);
    if (game.combo !== lastCombo) { comboEl.classList.remove('bump'); void comboEl.offsetWidth; comboEl.classList.add('bump'); }
  } else comboEl.hidden = true;
  lastCombo = game.combo;
  if (!game.event) $('hud-event').hidden = true;
  if (game.quest) { $('q-bar').style.width = (Math.min(1, game.quest.progress / game.quest.count) * 100) + '%'; setText('q-label', `${game.quest.label} (${Math.min(game.quest.progress, game.quest.count)}/${game.quest.count})`); }
  // Fähigkeiten
  setAb('ab-dash', p.dashCd / S.dashCooldown, p.dashCd > 0 ? p.dashCd.toFixed(1) : '', p.dashCd <= 0);
  setAb('ab-slam', p.slamCd / S.slamCooldown, p.slamCd > 0 ? p.slamCd.toFixed(1) : '', p.slamCd <= 0);
  if (p.berserkT > 0) setAb('ab-berserk', 1 - p.berserkT / S.berserkTime, p.berserkT.toFixed(1), false, 'active');
  else setAb('ab-berserk', 1 - p.berserk, p.berserk >= 1 ? 'BEREIT' : Math.floor(p.berserk * 100) + '%', p.berserk >= 1);
}

// ------------------------------------------------------------------
// Ton & Musik
// ------------------------------------------------------------------
function applyAudio() {
  setMuted(save.muted); setMusic(save.music);
  $('btn-mute').textContent = save.muted ? '🔇' : '🔊';
  $('btn-music').style.opacity = save.music ? 1 : 0.4;
}
$('btn-mute').onclick = () => { initAudio(); save.muted = !save.muted; writeSave(save); applyAudio(); };
$('btn-music').onclick = () => { initAudio(); save.music = !save.music; writeSave(save); applyAudio(); };
applyAudio();
document.addEventListener('pointerdown', () => initAudio(), { once: true });

// ------------------------------------------------------------------
// Patch Notes & Update-Hinweis (dezent, nie aufgezwungen)
// ------------------------------------------------------------------
$('ver').textContent = 'v' + VERSION;
function openNotes() {
  if (game.state === 'play' && inRun) pause();
  $('notes-list').innerHTML = PATCH_NOTES.map((n, i) => `
    <article class="note ${i === 0 ? 'latest' : ''}">
      <div class="note-head"><span class="v">v${esc(n.version)}</span><b>${esc(n.title)}</b><time>${esc(n.date)}</time></div>
      ${n.summary ? `<p>${esc(n.summary)}</p>` : ''}
      <ul>${n.changes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    </article>`).join('');
  $('notes-modal').hidden = false;
  markSeen(); hideToast();
}
$('btn-notes').onclick = openNotes;
$('btn-notes-close').onclick = () => { $('notes-modal').hidden = true; };
$('notes-modal').addEventListener('click', e => { if (e.target.id === 'notes-modal') $('notes-modal').hidden = true; });
function markSeen() { save.seenVersion = VERSION; writeSave(save); $('notes-dot').hidden = true; }

let pendingToast = null;
function toast(html, buttons) {
  if (inRun && game.state === 'play') { pendingToast = [html, buttons]; $('notes-dot').hidden = false; return; }
  const el = $('toast');
  el.innerHTML = html + `<div class="t-row">${buttons.map((b, i) => `<button data-i="${i}" class="${b.go ? 'go' : ''}">${b.label}</button>`).join('')}</div>`;
  el.hidden = false;
  el.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; buttons[b.dataset.i].fn(); };
}
function hideToast() { $('toast').hidden = true; }
function flushPendingToast() { if (pendingToast) { const t = pendingToast; pendingToast = null; toast(...t); } }

if (save.seenVersion === null) { save.seenVersion = VERSION; writeSave(save); }
else if (save.seenVersion !== VERSION) {
  $('notes-dot').hidden = false;
  toast(`<b>Neu in v${esc(VERSION)}:</b><p>${esc(PATCH_NOTES[0].title)}</p>`, [
    { label: 'Patch Notes', go: true, fn: openNotes },
    { label: 'Später', fn: () => { markSeen(); hideToast(); } },
  ]);
}

let updateOffered = false;
async function checkForUpdate() {
  if (updateOffered || location.protocol === 'file:') return;
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const { version } = await r.json();
    if (version && version !== VERSION) {
      updateOffered = true;
      $('notes-dot').hidden = false;
      toast(`<b>Update v${esc(version)} verfügbar</b><p>Lade neu, wann es dir passt. Dein Fortschritt bleibt gespeichert.</p>`, [
        { label: 'Jetzt aktualisieren', go: true, fn: () => { writeSave(save); location.reload(); } },
        { label: 'Später', fn: hideToast },
      ]);
    }
  } catch { /* offline */ }
}
setInterval(checkForUpdate, 90 * 1000);
setTimeout(checkForUpdate, 5000);

// ------------------------------------------------------------------
openMenu();
requestAnimationFrame(frame);
