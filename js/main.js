// =====================================================================
//  RAGEVERSE – Einstieg: Game-Loop, Steuerung, Menüs, Shop, Updates
// =====================================================================
import * as C from './config.js';
import { Game, computeStats, upgradeLevel, upgradeCost, fmt } from './game.js';
import { render } from './render.js';
import { initAudio, setMuted, sfx } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { PATCH_NOTES, VERSION } from './patchnotes.js';

const $ = id => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const save = loadSave();
const params = new URLSearchParams(location.search);

// Debug-/Test-Parameter: ?scrap=100000  ?world=3  ?seed-upgrades=10
if (params.has('scrap')) save.scrap = Number(params.get('scrap')) || 0;
if (params.has('upgrades')) { const l = Number(params.get('upgrades')) || 0; C.UPGRADES.forEach(u => save.upgrades[u.id] = Math.min(u.max, l)); }

const game = new Game(save, {
  sfx,
  onWorld: (w, choices) => showMutation(w, choices),
  onEnd: summary => showResults(summary),
  onEvent: e => showEvent(e),
});
window.__rv = { game, save, C }; // für Tests in der Konsole

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
// Steuerung: Tastatur, Maus, Touch
// ------------------------------------------------------------------
const input = { dx: 0, dy: 0, dash: false };
const keys = new Set();
const pointer = { active: false, x: 0, y: 0, lastMove: 0, touch: false };
let lastTap = 0;

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  keys.add(k);
  if (k === ' ') { input.dash = true; e.preventDefault(); }
  if ((k === 'p' || k === 'escape') && game.state === 'play') pause();
  else if ((k === 'p' || k === 'escape') && game.state === 'paused') resume();
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); if (game.state === 'play') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'play') pause(); else if (!document.hidden) checkForUpdate(); });

canvas.addEventListener('pointerdown', e => {
  initAudio();
  pointer.active = true; pointer.x = e.clientX; pointer.y = e.clientY; pointer.lastMove = performance.now();
  pointer.touch = e.pointerType === 'touch';
  if (pointer.touch) {
    document.body.classList.add('touch');
    const now = performance.now();
    if (now - lastTap < 300) input.dash = true;
    lastTap = now;
  } else if (e.button === 2) input.dash = true;
});
canvas.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.lastMove = performance.now(); if (e.pointerType === 'mouse') pointer.active = true; });
canvas.addEventListener('pointerup', e => { if (e.pointerType === 'touch') pointer.active = false; });
canvas.addEventListener('pointercancel', () => { pointer.active = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
$('btn-dash').addEventListener('pointerdown', e => { e.stopPropagation(); input.dash = true; });

function readInput() {
  let dx = 0, dy = 0;
  if (keys.has('w') || keys.has('arrowup')) dy -= 1;
  if (keys.has('s') || keys.has('arrowdown')) dy += 1;
  if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
  if (keys.has('d') || keys.has('arrowright')) dx += 1;
  if (dx || dy) {
    const l = Math.hypot(dx, dy); input.dx = dx / l; input.dy = dy / l; return;
  }
  if (pointer.active && game.p) {
    const px = (game.p.x - game.cam.x) * game.cam.zoom + W / 2;
    const py = (game.p.y - game.cam.y) * game.cam.zoom + H / 2;
    const R = game.p.r * game.cam.zoom;
    const vx = pointer.x - px, vy = pointer.y - py, d = Math.hypot(vx, vy);
    if (d < R * 0.4) { input.dx = 0; input.dy = 0; return; }
    const m = Math.min(1, (d - R * 0.4) / (R * 2.5));
    input.dx = vx / d * m; input.dy = vy / d * m;
    return;
  }
  input.dx = 0; input.dy = 0;
}

// ------------------------------------------------------------------
// Game-Loop
// ------------------------------------------------------------------
let lastT = performance.now();
let menuTime = 0;
function frame(t) {
  let dt = (t - lastT) / 1000; lastT = t;
  if (dt > 0.05) dt = 0.05;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (game.p && game.state !== 'idle') {
    readInput();
    game.update(dt, input);
    render(ctx, game, W, H, t / 1000);
    updateHud();
  } else {
    // Menü-Hintergrund: Demo-Welt, die sich langsam bewegt
    menuTime += dt;
    if (!game.p) game.start();
    game.state = 'play';
    const demo = { dx: Math.cos(menuTime * 0.3), dy: Math.sin(menuTime * 0.21), dash: false };
    game.p.rage = game.stats.rageMax;
    game.update(dt, demo);
    game.sfxMuted = true;
    game.state = 'idle';
    render(ctx, game, W, H, t / 1000);
  }
  requestAnimationFrame(frame);
}

// Im Menü keine Sounds aus der Demo-Welt
const realSfx = game.hooks.sfx;
game.hooks.sfx = (n, v) => { if (inRun) realSfx(n, v); };
const realWorld = game.hooks.onWorld;
game.hooks.onWorld = (w, ch) => { if (inRun) realWorld(w, ch); else game.chooseMutation(null); };
const realEvent = game.hooks.onEvent;
game.hooks.onEvent = e => { if (inRun) realEvent(e); };
const realEnd = game.hooks.onEnd;
game.hooks.onEnd = s => { if (inRun) realEnd(s); else game.start(); };

// ------------------------------------------------------------------
// Screens
// ------------------------------------------------------------------
let inRun = false;
const screens = ['screen-menu', 'screen-shop', 'screen-results', 'screen-mutation', 'screen-pause'];
function show(id) {
  for (const s of screens) $(s).hidden = s !== id;
  const playing = !id || id === 'screen-mutation' || id === 'screen-pause';
  $('hud').hidden = !inRun;
  document.body.classList.toggle('playing', inRun && !id);
  if (!playing || !inRun) flushPendingToast();
}

function startRun() {
  initAudio();
  sfx('click');
  inRun = true;
  const opts = {};
  if (params.has('world')) { const w = C.WORLDS[Number(params.get('world'))]; if (w) opts.radius = Math.max(w.minRadius * 1.15, 10); }
  game.start(opts);
  lastWorldShown = game.world;
  renderMuts();
  show(null);
  showBanner(C.WORLDS[game.world].name.toUpperCase());
}
function pause() { if (game.state !== 'play' || !inRun) return; game.state = 'paused'; show('screen-pause'); }
function resume() { if (game.state !== 'paused') return; game.state = 'play'; lastT = performance.now(); show(null); }

$('btn-play').onclick = startRun;
$('btn-shop-play').onclick = startRun;
$('btn-res-again').onclick = startRun;
$('btn-shop-menu').onclick = () => openShop();
$('btn-res-shop').onclick = () => openShop();
$('btn-shop-back').onclick = () => openMenu();
$('btn-pause').onclick = pause;
$('btn-resume').onclick = resume;
$('btn-quit').onclick = () => { game.state = 'play'; game.p.rage = 0; game.die(); show(null); };

function openMenu() {
  inRun = false; sfx('click');
  const w = C.WORLDS[save.bestWorld] || C.WORLDS[0];
  $('menu-stats').innerHTML = save.runs ? `
    <div class="stat"><b>${w.name}</b><small>Weiteste Welt</small></div>
    <div class="stat"><b>${fmt(save.totalScrap)}</b><small>Schrott gesamt</small></div>
    <div class="stat"><b>${save.runs}</b><small>Runs</small></div>` : '';
  $('menu-scrap').textContent = '⚙ ' + fmt(save.scrap);
  show('screen-menu');
}

// ------------------------------------------------------------------
// Shop
// ------------------------------------------------------------------
function openShop() {
  inRun = false; sfx('click');
  renderShop();
  show('screen-shop');
}
function renderShop() {
  $('shop-scrap').textContent = fmt(save.scrap);
  const base = computeStats({ upgrades: {} });
  const st = computeStats(save);
  const effect = {
    size: () => `Start ${(st.startRadius / base.startRadius).toFixed(2)}×`,
    rage: () => `${Math.round(st.rageMax)} Wut`,
    calm: () => `−${Math.round((1 - st.rageDrain / base.rageDrain) * 100)} % Verlust`,
    dmg: () => `${st.damage.toFixed(2)}× Schaden`,
    hard: () => `bis ${Math.round(st.breakRatio * 100)} % deiner Größe`,
    speed: () => `${(st.speed / base.speed).toFixed(2)}× Tempo`,
    absorb: () => `${(st.absorb / base.absorb).toFixed(2)}× Wachstum`,
    scrap: () => `${(st.scrapMult / base.scrapMult).toFixed(2)}× Schrott`,
    magnet: () => `+${Math.round(st.magnet * 150)} % Reichweite`,
    dash: () => `${st.dashCooldown.toFixed(2)} s Abklingzeit`,
  };
  $('shop-grid').innerHTML = C.UPGRADES.map(u => {
    const l = upgradeLevel(save, u.id), maxed = l >= u.max, cost = upgradeCost(u, l), can = !maxed && save.scrap >= cost;
    const pips = u.max <= 40 ? `<div class="upg-pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div>` : '';
    return `<div class="upg ${can ? 'can' : ''}">
      <div class="upg-top"><div class="upg-icon">${u.icon}</div><div><div class="upg-name">${u.name}</div><div class="upg-lvl">Stufe ${l}/${u.max} · ${effect[u.id] ? effect[u.id]() : ''}</div></div></div>
      <div class="upg-desc">${u.desc}</div>${pips}
      <button class="btn ${can ? 'primary' : ''}" data-buy="${u.id}" ${can ? '' : 'disabled'}>${maxed ? 'MAX' : '⚙ ' + fmt(cost)}</button>
    </div>`;
  }).join('');
}
$('shop-grid').addEventListener('click', e => {
  const b = e.target.closest('[data-buy]'); if (!b) return;
  const u = C.UPGRADES.find(x => x.id === b.dataset.buy);
  const l = upgradeLevel(save, u.id), cost = upgradeCost(u, l);
  if (l >= u.max || save.scrap < cost) return;
  save.scrap -= cost; save.upgrades[u.id] = l + 1; writeSave(save);
  sfx('buy'); renderShop();
});

// ------------------------------------------------------------------
// Ergebnis
// ------------------------------------------------------------------
function showResults(s) {
  writeSave(save);
  const mins = Math.floor(s.time / 60), secs = Math.floor(s.time % 60);
  const mutNames = s.muts.map(id => { const m = C.MUTATIONS.find(x => x.id === id); return m ? m.icon + ' ' + m.name : id; });
  $('results-body').innerHTML = `
    <div class="res-earned"><b>+${fmt(s.earned)} ⚙</b><span class="muted">Schrott verdient</span></div>
    <div class="res-grid">
      <div class="stat"><b>${C.WORLDS[s.world].name}</b><small>Welt erreicht ${s.newWorld ? '<span class="badge">NEU!</span>' : ''}</small></div>
      <div class="stat"><b>${fmt(s.kills)}</b><small>Zerstört</small></div>
      <div class="stat"><b>${mins}:${String(secs).padStart(2, '0')}</b><small>Wutdauer</small></div>
      <div class="stat"><b>${s.bestCombo}×</b><small>Beste Kombo</small></div>
    </div>
    ${mutNames.length ? `<div class="res-muts">Mutationen: ${mutNames.join(' · ')}</div>` : ''}`;
  inRun = false;
  show('screen-results');
  $('hud').hidden = true;
}

// ------------------------------------------------------------------
// Mutation / Welt-Aufstieg / Events
// ------------------------------------------------------------------
let lastWorldShown = 0;
function showMutation(w, choices) {
  lastWorldShown = w;
  $('mut-title').textContent = C.WORLDS[w].name.toUpperCase() + ' ERREICHT!';
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
  showBanner(C.WORLDS[game.world].name.toUpperCase());
});
function renderMuts() {
  $('hud-muts').innerHTML = game.muts.map(id => { const m = C.MUTATIONS.find(x => x.id === id); return `<span title="${m.name}">${m.icon}</span>`; }).join('');
}
function showBanner(text) {
  const b = $('banner');
  b.hidden = true; void b.offsetWidth; b.textContent = text; b.hidden = false;
  clearTimeout(showBanner.t); showBanner.t = setTimeout(() => b.hidden = true, 1800);
}
function showEvent(e) {
  const el = $('hud-event');
  el.innerHTML = `<b>${e.name}</b>${e.desc}`;
  el.hidden = false;
}

// ------------------------------------------------------------------
// HUD
// ------------------------------------------------------------------
let lastCombo = 0, hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function updateHud() {
  if (!inRun || !game.p) return;
  const p = game.p, rf = p.rage / game.stats.rageMax;
  $('hud-rage-bar').style.width = (rf * 100).toFixed(1) + '%';
  $('hud-rage-bar').parentElement.classList.toggle('low', rf < 0.25);
  setText('hud-scrap', fmt(game.runScrap));
  const w = C.WORLDS[game.world], next = C.WORLDS[game.world + 1];
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
  $('btn-dash').classList.toggle('cooldown', p.dashCd > 0);
}

// ------------------------------------------------------------------
// Ton
// ------------------------------------------------------------------
function applyMute() { setMuted(save.muted); $('btn-mute').textContent = save.muted ? '🔇' : '🔊'; }
$('btn-mute').onclick = () => { save.muted = !save.muted; writeSave(save); applyMute(); };
applyMute();

// ------------------------------------------------------------------
// Patch Notes & Update-Hinweis (dezent, nie aufgezwungen)
// ------------------------------------------------------------------
$('ver').textContent = 'v' + VERSION;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function openNotes() {
  if (game.state === 'play' && inRun) pause();
  $('notes-list').innerHTML = PATCH_NOTES.map((n, i) => `
    <article class="note ${i === 0 ? 'latest' : ''}">
      <div class="note-head"><span class="v">v${esc(n.version)}</span><b>${esc(n.title)}</b><time>${esc(n.date)}</time></div>
      ${n.summary ? `<p>${esc(n.summary)}</p>` : ''}
      <ul>${n.changes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    </article>`).join('');
  $('notes-modal').hidden = false;
  markSeen();
  hideToast();
}
$('btn-notes').onclick = openNotes;
$('btn-notes-close').onclick = () => { $('notes-modal').hidden = true; };
$('notes-modal').addEventListener('click', e => { if (e.target.id === 'notes-modal') $('notes-modal').hidden = true; });

function markSeen() { save.seenVersion = VERSION; writeSave(save); $('notes-dot').hidden = true; }

let pendingToast = null;
function toast(html, buttons) {
  // Während eines laufenden Runs nichts einblenden – erst danach.
  if (inRun && game.state === 'play') { pendingToast = [html, buttons]; $('notes-dot').hidden = false; return; }
  const el = $('toast');
  el.innerHTML = html + `<div class="t-row">${buttons.map((b, i) => `<button data-i="${i}" class="${b.go ? 'go' : ''}">${b.label}</button>`).join('')}</div>`;
  el.hidden = false;
  el.onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; buttons[b.dataset.i].fn(); };
}
function hideToast() { $('toast').hidden = true; }
function flushPendingToast() { if (pendingToast) { const t = pendingToast; pendingToast = null; toast(...t); } }

// Neue Version seit dem letzten Besuch?
if (save.seenVersion === null) { save.seenVersion = VERSION; writeSave(save); }
else if (save.seenVersion !== VERSION) {
  $('notes-dot').hidden = false;
  toast(`<b>Neu in v${esc(VERSION)}:</b><p>${esc(PATCH_NOTES[0].title)}</p>`, [
    { label: 'Patch Notes', go: true, fn: openNotes },
    { label: 'Später', fn: () => { markSeen(); hideToast(); } },
  ]);
}

// Läuft eine neuere Version auf dem Server? Dann dezent anbieten.
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
