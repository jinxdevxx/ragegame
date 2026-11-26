// =====================================================================
//  RAGEVERSE – Einstieg: Game-Loop, Steuerung, Menüs, Shop, Updates
// =====================================================================
import * as C from './config.js?v=0.3.2';
import { Game, computeStats, upgradeLevel, upgradeCost, fmt, charDef, mapDef, dmLevel, dmCost, prestigeGain, doPrestige } from './game.js?v=0.3.2';
import { render, drawMonsterPreview } from './render.js?v=0.3.2';
import { initAudio, setMuted, setMusic, setIntensity, setVolumes, sfx } from './audio.js?v=0.3.2';
import { loadSave, writeSave, resetSave, listSlots, loadSlotInto, createSlot, deleteSlot, getSlot, loadMeta } from './save.js?v=0.3.2';
import { PATCH_NOTES, VERSION } from './patchnotes.js?v=0.3.2';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const canvas = $('game');
const ctx = canvas.getContext('2d');
const save = loadSave();
const params = new URLSearchParams(location.search);
// Test-Modus: URL-Parameter laden direkt einen Spielstand (Standard: Platz 1)
const TEST_KEYS = ['scrap', 'chaos', 'upgrades', 'unlock', 'char', 'map', 'world', 'slot'];
const testMode = TEST_KEYS.some(k => params.has(k));
if (testMode) {
  const i = Math.max(0, Math.min(2, (Number(params.get('slot')) || 1) - 1));
  if (!listSlots()[i]) createSlot(i, 'Test');
  loadSlotInto(save, i);
}

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
window.__rv = { game, save, C, get pointer() { return pointer; }, get input() { return input; } };

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
  if (k === 'escape') { e.preventDefault(); onEscape(); return; }
  if (!inRun) return;
  if (k.startsWith('arrow') || k === ' ') e.preventDefault(); // Seite nicht scrollen
  if (e.repeat) return;
  if (game.state !== 'play') { if (k === 'p' && current === 'screen-pause') resume(); return; }
  if (k === ' ') input.dash = true;
  if (k === 'e' || k === 'shift') input.slam = true;
  if (k === 'r' || k === 'q') input.berserk = true;
  if (k === 'p') pause();
});
// Escape: im Run → Pause + Einstellungen; in Fenstern → zurück
function onEscape() {
  if (!$('notes-modal').hidden) { $('notes-modal').hidden = true; return; }
  if (current === 'screen-settings') { closeSettings(); return; }
  if (current === 'screen-mutation') return;
  if (inRun && game.state === 'play') { pause(); openSettings('screen-pause'); return; }
  if (inRun && current === 'screen-pause') { resume(); return; }
  if (current === 'screen-help') { back(); return; }
  if (current === 'screen-menu') { openSettings('screen-menu'); return; }
  if (current === 'screen-slots') { if (getSlot() >= 0) openMenu(); return; }
  if (!inRun) openMenu();
}
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); pointer.active = false; if (game.state === 'play' && inRun) pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'play' && inRun) pause(); else if (!document.hidden) checkForUpdate(); });

const mouseAllowed = () => save.settings.control !== 'keys';
canvas.addEventListener('pointerdown', e => {
  initAudio();
  pointer.x = e.clientX; pointer.y = e.clientY;
  pointer.touch = e.pointerType !== 'mouse';
  if (pointer.touch) {
    // Touch/Stift: Finger halten = laufen (immer aktiv)
    pointer.active = true;
    document.body.classList.add('touch');
    const now = performance.now();
    if (now - lastTap < 300) input.dash = true;
    lastTap = now;
  } else if (e.button === 0 && mouseAllowed()) {
    pointer.active = true; // Maus: nur solange die linke Taste gedrückt ist
  } else if (e.button === 2 && mouseAllowed()) { input.dash = true; }
});
canvas.addEventListener('pointermove', e => {
  pointer.x = e.clientX; pointer.y = e.clientY;
  // Sicherheitsnetz: Ist keine Maustaste mehr gedrückt, sofort stoppen
  if (e.pointerType === 'mouse' && (e.buttons & 1) === 0) pointer.active = false;
});
window.addEventListener('pointerup', () => { pointer.active = false; });
window.addEventListener('mouseup', () => { pointer.active = false; });
document.addEventListener('mouseleave', () => { if (!pointer.touch) pointer.active = false; });
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
  if (pointer.active && game.p && (pointer.touch || mouseAllowed())) {
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
const SCREENS = ['screen-menu', 'screen-shop', 'screen-chars', 'screen-maps', 'screen-help', 'screen-results', 'screen-mutation', 'screen-pause', 'screen-settings', 'screen-slots'];
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
function resume() { if (game.state !== 'paused') return; game.state = 'play'; lastT = performance.now(); keys.clear(); pointer.active = false; show(null); }
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
$('btn-pause-settings').onclick = () => openSettings('screen-pause');
$('btn-settings').onclick = () => openSettings('screen-menu');
$('menu-slot').onclick = () => openSlots();

// ------------------------------------------------------------------
// Spielstände
// ------------------------------------------------------------------
const slotPreviews = [];
let slotDelArmed = -1, slotNaming = -1;
function fmtDate(t) {
  if (!t) return '–';
  const d = new Date(t), now = new Date();
  const same = d.toDateString() === now.toDateString();
  return same ? 'heute, ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('de-DE');
}
function openSlots() {
  inRun = false; setIntensity(0);
  const slots = listSlots(), last = loadMeta().lastSlot;
  slotPreviews.length = 0;
  $('slot-grid').innerHTML = slots.map((d, i) => {
    if (!d) {
      if (slotNaming === i) return `<div class="slot empty">
        <div class="slot-num">Platz ${i + 1}</div>
        <input type="text" id="slot-name-input" maxlength="24" placeholder="Name, z. B. ${['Grumpfs Rache', 'Chaos-Lauf', 'Kollege'][i]}" autocomplete="off">
        <div class="slot-actions"><button class="btn" data-cancel>Abbrechen</button><button class="btn primary" data-create="${i}">Erstellen</button></div>
      </div>`;
      return `<button class="slot empty" data-new="${i}"><div class="slot-new">＋</div><div class="slot-name" style="text-align:center">Neuer Spielstand</div><div class="slot-num" style="text-align:center">Platz ${i + 1}</div></button>`;
    }
    const ch = charDef(d.selectedChar), mp = mapDef(d.selectedMap);
    const best = Math.max(d.bestWorld || 0, ...Object.values(d.mapBest || {}), 0);
    return `<div class="slot ${i === last ? 'last' : ''}">
      <canvas width="240" height="160" data-slotprev="${i}"></canvas>
      <div><div class="slot-num">Platz ${i + 1}${i === last ? ' · zuletzt gespielt' : ''}</div><div class="slot-name">${esc(d.name || 'Spielstand ' + (i + 1))}</div></div>
      <div class="slot-stats">
        <span>Monster: <b>${esc(ch.name)}</b></span><span>Karte: <b>${esc(mp.name)}</b></span>
        <span>Weiteste Welt: <b>${esc(C.WORLDS[best].name)}</b></span><span>Runs: <b>${d.runs || 0}</b></span>
        <span>⚙ <b>${fmt(d.scrap || 0)}</b></span><span>☠ <b>${fmt(d.chaos || 0)}</b></span>
        <span style="grid-column:1/-1">Zuletzt: <b>${fmtDate(d.lastPlayed)}</b></span>
      </div>
      <div class="slot-actions">
        <button class="btn del ${slotDelArmed === i ? 'primary' : ''}" data-del="${i}" title="Spielstand löschen">${slotDelArmed === i ? 'Wirklich löschen?' : '🗑'}</button>
        <button class="btn primary" data-load="${i}">Spielen</button>
      </div>
    </div>`;
  }).join('');
  $('slot-grid').querySelectorAll('canvas[data-slotprev]').forEach(cv => { const d = slots[Number(cv.dataset.slotprev)]; slotPreviews.push({ cv, char: charDef(d.selectedChar), stage: Math.max(d.bestWorld || 0, ...Object.values(d.mapBest || {}), 0) }); });
  $('slots-back-row').hidden = getSlot() < 0;
  show('screen-slots');
  const inp = $('slot-name-input');
  if (inp) { inp.focus(); inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') $('slot-grid').querySelector('[data-create]').click(); if (e.key === 'Escape') { slotNaming = -1; openSlots(); } }; }
}
$('slot-grid').addEventListener('click', e => {
  initAudio();
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.new !== undefined) { slotNaming = Number(t.dataset.new); slotDelArmed = -1; sfx('click'); openSlots(); return; }
  if (t.dataset.cancel !== undefined) { slotNaming = -1; openSlots(); return; }
  if (t.dataset.create !== undefined) {
    const i = Number(t.dataset.create);
    createSlot(i, $('slot-name-input').value); slotNaming = -1;
    loadSlotInto(save, i); sfx('unlock'); game.start(); openMenu(); return;
  }
  if (t.dataset.load !== undefined) { const i = Number(t.dataset.load); slotDelArmed = -1; loadSlotInto(save, i); sfx('buy'); game.start(); openMenu(); return; }
  if (t.dataset.del !== undefined) {
    const i = Number(t.dataset.del);
    if (slotDelArmed !== i) { slotDelArmed = i; sfx('click'); openSlots(); setTimeout(() => { if (slotDelArmed === i) { slotDelArmed = -1; if (current === 'screen-slots') openSlots(); } }, 4000); return; }
    deleteSlot(i); slotDelArmed = -1; sfx('deny');
    if (getSlot() === i) loadSlotInto(save, i), deleteSlot(i), location.reload();
    else openSlots();
  }
});
$('btn-slots-back').onclick = () => openMenu();

// ------------------------------------------------------------------
// Einstellungen
// ------------------------------------------------------------------
let settingsFrom = 'screen-menu';
const CONTROL_DESC = {
  keys: 'Nur Tastatur (WASD/Pfeiltasten). Die Maus steuert gar nicht.',
  mouse: 'Linke Maustaste gedrückt halten = Monster läuft zur Maus. Rechtsklick = Ansturm.',
  both: 'Tastatur und Maus (Taste halten) gleichzeitig.',
};
function openSettings(from) {
  settingsFrom = from; sfx('click');
  renderSettings();
  show('screen-settings');
}
function closeSettings() {
  sfx('click');
  if (settingsFrom === 'screen-pause' && inRun) show('screen-pause'); else openMenu();
}
function renderSettings() {
  const st = save.settings;
  document.querySelectorAll('#set-control button').forEach(b => b.classList.toggle('on', b.dataset.v === st.control));
  $('set-control-desc').textContent = CONTROL_DESC[st.control];
  document.querySelectorAll('#set-fx button').forEach(b => b.classList.toggle('on', b.dataset.v === st.fx));
  $('set-sfx').value = st.sfx; $('set-music').value = st.music;
  $('set-shake').classList.toggle('on', st.shake);
  $('set-hints').classList.toggle('on', st.hints);
  $('set-reset').textContent = resetArmed ? 'Wirklich löschen?' : 'Zurücksetzen';
  $('set-reset').classList.toggle('primary', resetArmed);
}
function applySettings() {
  const st = save.settings;
  setVolumes(st.sfx / 100, st.music / 100);
  game.fx = { shake: st.shake, low: st.fx === 'low' };
  pointer.active = false;
  writeSave(save);
}
let resetArmed = false;
$('set-control').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; save.settings.control = b.dataset.v; applySettings(); renderSettings(); sfx('click'); });
$('set-fx').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; save.settings.fx = b.dataset.v; applySettings(); renderSettings(); sfx('click'); });
$('set-sfx').addEventListener('input', e => { save.settings.sfx = Number(e.target.value); applySettings(); });
$('set-sfx').addEventListener('change', () => sfx('coin', 6));
$('set-music').addEventListener('input', e => { save.settings.music = Number(e.target.value); applySettings(); });
$('set-shake').onclick = () => { save.settings.shake = !save.settings.shake; applySettings(); renderSettings(); sfx('click'); };
$('set-hints').onclick = () => { save.settings.hints = !save.settings.hints; applySettings(); renderSettings(); sfx('click'); };
$('set-reset').onclick = () => {
  if (!resetArmed) { resetArmed = true; renderSettings(); setTimeout(() => { resetArmed = false; if (current === 'screen-settings') renderSettings(); }, 4000); return; }
  resetSave(); location.reload();  // lädt neu und zeigt die Spielstand-Auswahl
};
$('btn-settings-close').onclick = closeSettings;
$('btn-settings-done').onclick = closeSettings;
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
  if (getSlot() < 0) { openSlots(); return; }
  inRun = false; setIntensity(0);
  $('menu-slot-name').textContent = save.name || 'Spielstand';
  const ch = charDef(save.selectedChar), mp = mapDef(save.selectedMap);
  $('menu-char').innerHTML = `👹 <b>${esc(ch.name)}</b> <small>${esc(ch.title)}</small>`;
  $('menu-map').innerHTML = `${mp.icon} <b>${esc(mp.name)}</b>${mp.scrapMult > 1 ? ` <small>×${mp.scrapMult} Schrott</small>` : ''}`;
  $('menu-scrap').textContent = fmt(save.scrap);
  $('menu-chaos').textContent = fmt(save.chaos);
  $('menu-dm').textContent = fmt(save.darkMatter || 0);
  $('menu-dm-pill').hidden = !(save.darkMatter || save.prestiges);
  const w = C.WORLDS[bestWorldAny()] || C.WORLDS[0];
  $('menu-stats').innerHTML = save.runs ? `
    <div class="stat"><b>${w.name}</b><small>Weiteste Welt</small></div>
    <div class="stat"><b>${fmt(save.totalKills || 0)}</b><small>Zerstört</small></div>
    <div class="stat"><b>${save.runs}</b><small>Runs</small></div>` : '';
  show('screen-menu');
}

// ------------------------------------------------------------------
// Schurkenhöhle (Upgrades + Urknall)
// ------------------------------------------------------------------
let shopTab = 'body', bangArmed = false;
function openShop() { inRun = false; setIntensity(0); sfx('click'); bangArmed = false; renderShop(); show('screen-shop'); }
function renderShop() {
  $('shop-scrap').textContent = fmt(save.scrap);
  $('shop-dm').textContent = fmt(save.darkMatter || 0);
  $('shop-dm-pill').hidden = !(save.darkMatter || save.prestiges || prestigeGain(save) > 0);
  const bangReady = prestigeGain(save) > 0;
  const affordable = cat => C.UPGRADES.filter(u => u.cat === cat && upgradeLevel(save, u.id) < u.max && save.scrap >= upgradeCost(u, upgradeLevel(save, u.id))).length;
  $('shop-tabs').innerHTML = C.UPGRADE_CATS.map(c => { const n = affordable(c.id); return `<button class="tab ${shopTab === c.id ? 'on' : ''}" data-tab="${c.id}">${c.icon} ${c.name}${n ? `<span class="cnt">${n}</span>` : ''}</button>`; }).join('')
    + `<button class="tab bang ${shopTab === 'bang' ? 'on' : ''}" data-tab="bang">💥 Urknall${bangReady ? '<span class="cnt">!</span>' : ''}</button>`;
  if (shopTab === 'bang') { renderBang(); return; }
  const cat = C.UPGRADE_CATS.find(c => c.id === shopTab);
  const base = computeStats({ upgrades: {} }, [], 'grumpf');
  const st = computeStats(save, [], 'grumpf'); // inkl. Masterplan-Boni (◆)
  const dmOnly = computeStats({ upgrades: {}, dmPerks: save.dmPerks || {} }, [], 'grumpf');
  const dmNote = (key, label) => { const f = dmOnly[key] / base[key]; return f > 1.001 ? ` <span class="dmtag">◆ ×${f.toFixed(2)} ${label}</span>` : ''; };
  const parts = [];
  const f = (k, label) => { const x = dmOnly[k] / base[k]; if (x > 1.001) parts.push(`×${x.toFixed(2)} ${label}`); };
  f('scrapMult', 'Schrott'); f('damage', 'Schaden'); f('absorb', 'Wachstum'); f('rageMax', 'Wut'); f('startRadius', 'Startgröße'); f('chaosMult', 'Chaos');
  $('shop-tab-desc').innerHTML = esc(cat.desc + ' Gilt für alle Monster und Karten.') + (parts.length ? `<br><span class="dmtag">🧠 Masterplan aktiv (für immer): ${parts.join(' · ')}</span>` : '');
  const effect = {
    size: () => `Start ${(st.startRadius / base.startRadius).toFixed(2)}×${dmNote('startRadius', 'Masterplan')}`,
    rage: () => `${Math.round(st.rageMax)} Wut${dmNote('rageMax', 'Masterplan')}`,
    calm: () => `−${Math.round((1 - st.rageDrain / base.rageDrain) * 100)} % Verlust`,
    dmg: () => `${st.damage.toFixed(2)}× Schaden${dmNote('damage', 'Masterplan')}`,
    hard: () => `bis ${Math.round(st.breakRatio * 100)} % deiner Größe`,
    speed: () => `${(st.speed / base.speed).toFixed(2)}× Tempo`,
    absorb: () => `${(st.absorb / base.absorb).toFixed(2)}× Wachstum${dmNote('absorb', 'Masterplan')}`,
    scrap: () => `${(st.scrapMult / base.scrapMult).toFixed(2)}× Schrott${dmNote('scrapMult', 'Masterplan')}`,
    magnet: () => `Reichweite ${(2.5 + st.magnet * 2).toFixed(1)}× Körper`,
    dash: () => `${st.dashCooldown.toFixed(1)} s Abklingzeit`,
    slam: () => `${st.slamCooldown.toFixed(1)} s · Radius ${st.slamRadius.toFixed(1)}×`,
    berserk: () => `${st.berserkGain.toFixed(2)}× Aufladung`,
    combo: () => `Fenster ${st.comboWindow.toFixed(1)} s · bis ×${st.comboMax.toFixed(1)}`,
    chaosup: () => `${st.chaosMult.toFixed(2)}× Chaos${dmNote('chaosMult', 'Masterplan')}`,
    luck: () => `${(st.goldenChance * 100).toFixed(1)} % Gold-Chance`,
    crates: () => `${(C.CRATE_CHANCE * st.crateMult * 100).toFixed(1)} % Kisten-Chance`,
    quest: () => `${st.questMult.toFixed(2)}× Auftragsbeute`,
  };
  $('shop-grid').innerHTML = C.UPGRADES.filter(u => u.cat === shopTab).map(u => {
    const l = upgradeLevel(save, u.id), maxed = l >= u.max, cost = upgradeCost(u, l), can = !maxed && save.scrap >= cost;
    return `<div class="upg ${can ? 'can' : ''}" data-id="${u.id}">
      <div class="upg-top"><div class="upg-icon">${u.icon}</div><div class="upg-txt"><div class="upg-name">${u.name} <span class="lv">Lv ${l}/${u.max}</span></div><div class="upg-lvl">${effect[u.id] ? effect[u.id]() : ''}</div></div></div>
      <div class="upg-desc">${u.desc}</div>
      <div class="bar tiny"><div style="width:${Math.round(l / u.max * 100)}%"></div></div>
      <button class="btn ${can ? 'primary' : ''}" data-buy="${u.id}" ${can ? '' : 'disabled'}>${maxed ? 'MAX' : '⚙ ' + fmt(cost)}</button>
    </div>`;
  }).join('');
}
// Vorschau: was bringt der Urknall konkret beim Schrott?
function bangPreview(gain) {
  const d = C.DM_PERKS.find(x => x.id === 'dm_scrap');
  let dm = (save.darkMatter || 0) + gain, l = dmLevel(save, 'dm_scrap'), n = 0;
  while (l < d.max && dm >= dmCost(d, l)) { dm -= dmCost(d, l); l++; n++; }
  const now = computeStats(save, [], 'grumpf').scrapMult;
  const after = computeStats({ upgrades: {}, dmPerks: { ...(save.dmPerks || {}), dm_scrap: l } }, [], 'grumpf').scrapMult;
  const keep = dmLevel(save, 'dm_keep') * C.DM_PERKS.find(x => x.id === 'dm_keep').per;
  return `💡 Steckst du alles in <b>Schwarzgeld</b>, startest du danach mit <b>×${(after / C.SCRAP_SCALE).toFixed(2)} Schrott</b> (jetzt mit deinen Upgrades: ×${(now / C.SCRAP_SCALE).toFixed(2)}). `
    + `Deine Upgrades werden ${keep > 0 ? `auf ${Math.round(keep * 100)} % ` : ''}zurückgesetzt – je später du sprengst, desto mehr ◆ gibt es.`;
}

function renderBang() {
  const gain = prestigeGain(save), P = C.PRESTIGE;
  const cycleW = C.WORLDS[Math.min(save.cycleBest || 0, C.WORLDS.length - 1)].name;
  $('shop-tab-desc').textContent = '';
  const perks = C.DM_PERKS.map(d => {
    const l = dmLevel(save, d.id), maxed = l >= d.max, cost = dmCost(d, l), can = !maxed && (save.darkMatter || 0) >= cost;
    const eff = d.id === 'dm_mut' ? `${l} Start-Mutation${l === 1 ? '' : 'en'}` : d.id === 'dm_keep' ? `behält ${Math.round(l * d.per * 100)} % der Stufen` : `+${Math.round(l * d.per * 100)} %`;
    return `<div class="upg dmp ${can ? 'can' : ''}">
      <div class="upg-top"><div class="upg-icon">${d.icon}</div><div class="upg-txt"><div class="upg-name">${d.name} <span class="lv">Lv ${l}/${d.max}</span></div><div class="upg-lvl">${eff}</div></div></div>
      <div class="upg-desc">${d.desc}</div>
      <button class="btn ${can ? 'primary' : ''}" data-dm="${d.id}" ${can ? '' : 'disabled'}>${maxed ? 'MAX' : '◆ ' + fmt(cost)}</button>
    </div>`;
  }).join('');
  $('shop-grid').innerHTML = `<div class="bang-panel">
      <h3>💥 Der Urknall</h3>
      <div>Sprenge deinen Fortschritt in die Luft: <b>Schrott und Upgrades</b> sind danach weg. Dafür bekommst du <b>◆ Dunkle Materie</b> für den <b>Bösen Masterplan</b> – Boni, die für immer bleiben. <b>Chaos, Monster, Karten und Rekorde bleiben erhalten.</b></div>
      <div class="bang-stats">
        <div class="stat"><b>${esc(cycleW)}</b><small>Weiteste Welt (dieser Durchgang)</small></div>
        <div class="stat"><b>${fmt(save.cycleScrap || 0)}</b><small>Schrott seit letztem Urknall</small></div>
        <div class="stat"><b>${save.prestiges || 0}</b><small>Urknalle bisher</small></div>
      </div>
      ${gain > 0
        ? `<div>Urknall jetzt bringt dir: <span class="bang-gain">+${fmt(gain)} ◆</span></div>
           <div class="char-req ok">${bangPreview(gain)}</div>
           <button class="btn bang-btn ${bangArmed ? 'armed' : ''}" id="btn-bang">${bangArmed ? '⚠ Sicher? Nochmal klicken!' : '💥 URKNALL AUSLÖSEN'}</button>`
        : `<div class="char-req">🔒 Erreiche in diesem Durchgang den <b>${esc(C.WORLDS[P.minWorld].name)}</b>, um den Urknall freizuschalten. Je weiter du kommst und je mehr Schrott du sammelst, desto mehr ◆ gibt es.</div>`}
    </div>
    <h3 style="grid-column:1/-1;margin:6px 0 0;color:#7fffe0">🧠 Der Böse Masterplan <small class="muted">(◆ ${fmt(save.darkMatter || 0)})</small></h3>
    ${perks}`;
}
$('shop-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; shopTab = b.dataset.tab; bangArmed = false; sfx('click'); renderShop(); });
$('shop-grid').addEventListener('click', e => {
  const bang = e.target.closest('#btn-bang');
  if (bang) {
    if (!bangArmed) { bangArmed = true; sfx('ready'); renderShop(); setTimeout(() => { bangArmed = false; if (current === 'screen-shop' && shopTab === 'bang') renderShop(); }, 4000); return; }
    const gain = doPrestige(save); writeSave(save); bangArmed = false;
    const fl = document.createElement('div'); fl.className = 'bang-flash'; document.body.appendChild(fl); setTimeout(() => fl.remove(), 1500);
    sfx('berserk'); setTimeout(() => sfx('unlock'), 400);
    game.start(); renderShop();
    hintMenu(`💥 URKNALL! +${fmt(gain)} ◆ Dunkle Materie`);
    return;
  }
  const dmb = e.target.closest('[data-dm]');
  if (dmb) {
    const d = C.DM_PERKS.find(x => x.id === dmb.dataset.dm), l = dmLevel(save, d.id), cost = dmCost(d, l);
    if (l >= d.max || (save.darkMatter || 0) < cost) { sfx('deny'); return; }
    save.darkMatter -= cost; save.dmPerks[d.id] = l + 1; writeSave(save); sfx('unlock'); renderShop(); return;
  }
  const b = e.target.closest('[data-buy]'); if (!b) return;
  const u = C.UPGRADES.find(x => x.id === b.dataset.buy);
  const l = upgradeLevel(save, u.id), cost = upgradeCost(u, l);
  if (l >= u.max || save.scrap < cost) { sfx('deny'); return; }
  save.scrap -= cost; save.upgrades[u.id] = l + 1; writeSave(save);
  sfx('buy'); renderShop();
  const card = $('shop-grid').querySelector(`[data-id="${u.id}"]`);
  if (card) { card.classList.add('bought'); setTimeout(() => card.classList.remove('bought'), 400); }
});
function hintMenu(text) { const el = $('callout'); $('hud').hidden = false; el.hidden = true; void el.offsetWidth; el.textContent = text; el.dataset.tier = 3; el.hidden = false; setTimeout(() => { el.hidden = true; $('hud').hidden = !inRun; }, 1400); }

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
  if (current === 'screen-slots') for (const p of slotPreviews) drawMonsterPreview(p.cv, p.char, p.stage, time, false);
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
      <div class="hk"><kbd>WASD</kbd> / <kbd>Pfeiltasten</kbd></div><div>Laufen.</div>
      <div class="hk"><kbd>Maustaste halten</kbd></div><div>Laufen zur Maus – nur wenn in den Einstellungen „Maus“ oder „Beides“ gewählt ist (aktuell: <b>${{ keys: 'Tastatur', mouse: 'Maus', both: 'Beides' }[save.settings.control]}</b>).</div>
      <div class="hk">Finger halten</div><div>Laufen auf dem Handy (immer aktiv). Doppeltipp = Ansturm.</div>
      <div class="hk"><kbd>Esc</kbd></div><div>Einstellungen</div>
      <div class="hk"><kbd>P</kbd></div><div>Pause</div>
    </div>
    <h3>Fähigkeiten</h3>
    <div class="help-abs">
      <div class="habs"><span class="ab-ic">⚡</span><div><b>${A.dash.name}</b> <kbd>Leertaste</kbd> · Doppeltipp<br>${A.dash.desc}<br><small>Abklingzeit: <b>${st.dashCooldown.toFixed(1)} s</b> (Upgrade „Ansturm“ in der Schurkenhöhle)</small></div></div>
      <div class="habs"><span class="ab-ic">💥</span><div><b>${A.slam.name}</b> <kbd>E</kbd> · 💥-Button<br>${A.slam.desc}<br><small>Abklingzeit: <b>${st.slamCooldown.toFixed(1)} s</b> · Radius: <b>${st.slamRadius.toFixed(1)}× Körper</b> (Upgrade „Erdbeben“)</small></div></div>
      <div class="habs"><span class="ab-ic">😡</span><div><b>${A.berserk.name}</b> <kbd>R</kbd> · 😡-Button<br>${A.berserk.desc}<br><small>Dauer: <b>${st.berserkTime.toFixed(0)} s</b> (Upgrade „Berserker“ lädt schneller)</small></div></div>
    </div>
    <h3>Wie es funktioniert</h3>
    <ul class="help-list">
      <li><b>🔥 Wut</b> ist deine Zeit. Sie sinkt ständig und mit der Zeit immer schneller. Jede Zerstörung füllt sie wieder auf.</li>
      <li><b>Wachsen:</b> Alles Zerstörte macht dich größer. Bist du groß genug, steigst du in die nächste Welt auf, wählst eine <b>Mutation</b> und dein Monster <b>evolviert</b>.</li>
      <li><b>Gestrichelter Kreis</b> = noch zu groß für dich. <b>Rot mit ⚠</b> = Hindernis, das dir Wut abzieht, wenn du reinläufst.</li>
      <li><b>⚙ Schrott</b> fällt als Münzen heraus – einsammeln! Damit kaufst du Upgrades in der <b>🦹 Schurkenhöhle</b>.</li>
      <li><b>☠ Chaos</b> bekommst du für jede Zerstörung, extra für große Brocken und Aufträge. Damit schaltest du neue <b>Monster</b> frei.</li>
      <li><b>Aufträge</b> oben links bringen Wut, Schrott, Chaos und Berserker-Ladung.</li>
      <li><b>Kombo:</b> Schnell hintereinander zerstören = bis zu ×${C.COMBO.max} Schrott.</li>
      <li><b>Goldene Objekte</b> = ×${C.GOLDEN_MULT} Schrott. <b>Schrottkisten</b> platzen wie Piñatas. <b>⚠-Fässer</b> explodieren in Kettenreaktionen.</li>
      <li><b>Neue Karten</b> schaltest du über deine weiteste Welt frei. Sie sind härter, bringen aber deutlich mehr.</li>
      <li><b>💥 Urknall</b> (in der Schurkenhöhle, ab dem Kontinent): Schrott und Upgrades werden gesprengt, dafür gibt es <b>◆ Dunkle Materie</b> für den <b>Bösen Masterplan</b> – Boni für immer. So kommst du in jedem Durchgang schneller und weiter.</li>
      <li><b>Welten:</b> Nach der Galaxie warten Galaxienhaufen, Universum und Multiversum – und danach geht es endlos weiter.</li>
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
    ${prestigeGain(save) > 0 ? `<div class="res-unlock">💥 <b>Urknall möglich:</b> +${fmt(prestigeGain(save))} ◆ Dunkle Materie → Schurkenhöhle › Urknall</div>` : ''}
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
  if (!save.settings.hints) return;
  const el = $('hint'); el.innerHTML = html; el.hidden = false;
  clearTimeout(hintTimer); hintTimer = setTimeout(() => el.hidden = true, secs * 1000);
}
function tutorial() {
  if ((save.tutorial || 0) >= 3) return;
  save.tutorial = (save.tutorial || 0) + 1; writeSave(save);
  const steps = [
    [0.5, (save.settings.control === 'keys' ? '<b>WASD</b> / Pfeiltasten zum Laufen' : '<b>Maustaste halten</b> oder <b>WASD</b> zum Laufen') + ' – renn in Dinge, die <b>kleiner</b> sind als du! 👊'],
    [3, '<b>Esc</b> = Einstellungen (z. B. Maus- oder Tastatursteuerung)'],
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
applySettings();
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
if (testMode) openMenu(); else openSlots();
requestAnimationFrame(frame);
