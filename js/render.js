// =====================================================================
//  RAGEVERSE – Zeichnen (Canvas 2D)
//  Reihenfolge: Boden → Trümmer-Flecken → Schatten/Objekte/Monster
//  (nach Tiefe sortiert) → Trümmer → Münzen → Effekte → Overlays
// =====================================================================
import { SPRITES, OUT } from './sprites.js?v=0.2.2';
import { drawMonster } from './monster.js?v=0.2.2';
import { shadeHex as sh } from './game.js?v=0.2.2';

const TAU = Math.PI * 2;
const STARS = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.8 + 0.4, p: Math.random() * 0.6 + 0.1, tw: Math.random() * 6 }));
const hash = (x, y, k = 0) => { const h = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return h - Math.floor(h); };

// ---------------------------------------------------------------------
// Boden
// ---------------------------------------------------------------------
function drawGround(c, g, W, H, sx, sy, z, world, time) {
  const cam = g.cam;
  c.fillStyle = world.bg; c.fillRect(0, 0, W, H);
  if (world.ground === 'space') return drawSpace(c, g, W, H, z, world, time);
  // zwei Detailstufen weich überblenden, damit beim Wachsen nichts springt
  const L = Math.log2(g.p.r * 3), lo = Math.floor(L), f = L - lo;
  groundLayer(c, g, W, H, sx, sy, z, world, Math.pow(2, lo), 1 - f, time);
  groundLayer(c, g, W, H, sx, sy, z, world, Math.pow(2, lo + 1), f, time);
}

function groundLayer(c, g, W, H, sx, sy, z, world, cell, alpha, time) {
  if (alpha < 0.02) return;
  const cam = g.cam;
  const x0 = Math.floor((cam.x - W / 2 / z) / cell) - 1, x1 = Math.ceil((cam.x + W / 2 / z) / cell) + 1;
  const y0 = Math.floor((cam.y - H / 2 / z) / cell) - 1, y1 = Math.ceil((cam.y + H / 2 / z) / cell) + 1;
  const cp = cell * z;
  if (cp < 4) return;
  c.globalAlpha = alpha;
  const G = world.ground;
  if (G === 'lawn' || G === 'candy') {
    // Mähstreifen / Zuckerstreifen
    c.fillStyle = world.bg2;
    for (let ix = x0; ix <= x1; ix++) if (((ix % 4) + 4) % 4 < 2) c.fillRect(sx(ix * cell), 0, cp + 1, H);
    for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
      const h = hash(ix, iy, cell);
      const X = sx((ix + h) * cell), Y = sy((iy + hash(iy, ix, cell)) * cell);
      if (G === 'lawn') {
        c.strokeStyle = world.accent; c.lineWidth = Math.max(1, cp * 0.04);
        c.beginPath(); c.moveTo(X - cp * 0.08, Y); c.lineTo(X - cp * 0.12, Y - cp * 0.14); c.moveTo(X, Y); c.lineTo(X, Y - cp * 0.18); c.moveTo(X + cp * 0.08, Y); c.lineTo(X + cp * 0.13, Y - cp * 0.13); c.stroke();
        if (h > 0.86) { c.fillStyle = h > 0.93 ? '#ffffff' : '#ffd23f'; c.beginPath(); c.arc(X + cp * 0.3, Y - cp * 0.2, cp * 0.05, 0, TAU); c.fill(); }
      } else {
        const cols = ['#ffffff', '#7fd3ff', '#ffd23f', '#a0f04a', '#c9a0ff'];
        c.fillStyle = cols[Math.floor(h * 5)];
        c.save(); c.translate(X, Y); c.rotate(h * 6); c.fillRect(-cp * 0.08, -cp * 0.025, cp * 0.16, cp * 0.05); c.restore();
        if (h > 0.8) { c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(X + cp * 0.3, Y, cp * 0.12, 0, TAU); c.fill(); }
      }
    }
  } else if (G === 'street' || G === 'city' || G === 'town' || G === 'candytown') {
    // Gehweg-Platten
    c.strokeStyle = 'rgba(0,0,0,0.07)'; c.lineWidth = 1;
    c.beginPath();
    for (let ix = x0; ix <= x1; ix++) { c.moveTo(sx(ix * cell) | 0, 0); c.lineTo(sx(ix * cell) | 0, H); }
    for (let iy = y0; iy <= y1; iy++) { c.moveTo(0, sy(iy * cell) | 0); c.lineTo(W, sy(iy * cell) | 0); }
    c.stroke();
    // Straßen alle 5 Felder
    const rw = cp * 1.6;
    c.fillStyle = world.bg2;
    for (let ix = x0; ix <= x1; ix++) if (((ix % 5) + 5) % 5 === 0) c.fillRect(sx(ix * cell) - rw / 2, 0, rw, H);
    for (let iy = y0; iy <= y1; iy++) if (((iy % 5) + 5) % 5 === 0) c.fillRect(0, sy(iy * cell) - rw / 2, W, rw);
    // Mittellinien
    c.strokeStyle = world.accent; c.lineWidth = Math.max(1.5, cp * 0.06);
    c.setLineDash([cp * 0.35, cp * 0.3]);
    c.beginPath();
    for (let ix = x0; ix <= x1; ix++) if (((ix % 5) + 5) % 5 === 0) { c.moveTo(sx(ix * cell), 0); c.lineTo(sx(ix * cell), H); }
    for (let iy = y0; iy <= y1; iy++) if (((iy % 5) + 5) % 5 === 0) { c.moveTo(0, sy(iy * cell)); c.lineTo(W, sy(iy * cell)); }
    c.stroke(); c.setLineDash([]);
    if (G === 'town') { // Holzbretter am Rand
      c.fillStyle = 'rgba(120,70,30,0.25)';
      for (let iy = y0; iy <= y1; iy++) if (((iy % 5) + 5) % 5 === 1) c.fillRect(0, sy(iy * cell) - rw * 0.05, W, rw * 0.35);
    }
  } else if (G === 'sand' || G === 'canyon') {
    c.strokeStyle = world.accent; c.lineWidth = Math.max(1, cp * 0.035);
    for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
      const h = hash(ix, iy, cell), X = sx((ix + h) * cell), Y = sy((iy + hash(iy, ix, cell)) * cell);
      if (G === 'sand') {
        c.beginPath(); c.arc(X, Y + cp * 0.4, cp * 0.45, Math.PI * 1.2, Math.PI * 1.8); c.stroke();
        if (h > 0.8) { c.fillStyle = '#b8a07a'; c.beginPath(); c.ellipse(X + cp * 0.2, Y, cp * 0.07, cp * 0.05, 0, 0, TAU); c.fill(); }
      } else {
        c.beginPath(); c.moveTo(X, Y); c.lineTo(X + cp * 0.2, Y + cp * 0.15); c.lineTo(X + cp * 0.15, Y + cp * 0.35); c.stroke();
        if (h > 0.7) { c.fillStyle = world.bg2; c.beginPath(); c.ellipse(X - cp * 0.2, Y + cp * 0.2, cp * 0.25, cp * 0.1, 0, 0, TAU); c.fill(); }
      }
    }
  } else if (G === 'alpine') {
    for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
      const h = hash(ix, iy, cell), X = sx((ix + h) * cell), Y = sy((iy + hash(iy, ix, cell)) * cell);
      if (h > 0.75) { c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(X, Y, cp * 0.35, cp * 0.16, 0, 0, TAU); c.fill(); }
      else if (h > 0.5) { c.fillStyle = '#8a8f86'; c.beginPath(); c.ellipse(X, Y, cp * 0.08, cp * 0.06, 0, 0, TAU); c.fill(); }
      else { c.strokeStyle = world.bg2; c.lineWidth = Math.max(1, cp * 0.04); c.beginPath(); c.moveTo(X, Y); c.lineTo(X - cp * 0.05, Y - cp * 0.12); c.stroke(); }
    }
  } else if (G === 'ocean') {
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = Math.max(1, cp * 0.05);
    for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) {
      const h = hash(ix, iy, cell); if (h < 0.5) continue;
      const X = sx((ix + h) * cell) + Math.sin(time * 1.5 + h * 10) * cp * 0.1, Y = sy((iy + hash(iy, ix, cell)) * cell);
      c.beginPath(); c.arc(X, Y, cp * 0.18, Math.PI * 1.15, Math.PI * 1.85); c.arc(X + cp * 0.33, Y, cp * 0.18, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    }
  } else if (G === 'choco') {
    c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = Math.max(1.5, cp * 0.06);
    c.beginPath();
    for (let ix = x0; ix <= x1; ix++) { c.moveTo(sx(ix * cell), 0); c.lineTo(sx(ix * cell), H); }
    for (let iy = y0; iy <= y1; iy++) { c.moveTo(0, sy(iy * cell)); c.lineTo(W, sy(iy * cell)); }
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.07)';
    for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) c.fillRect(sx(ix * cell) + cp * 0.08, sy(iy * cell) + cp * 0.08, cp * 0.84, cp * 0.12);
  }
  c.globalAlpha = 1;
}

function drawSpace(c, g, W, H, z, world, time) {
  const cam = g.cam;
  for (let i = 0; i < 3; i++) {
    const x = ((Math.sin(i * 3.3) * 0.5 + 0.5) * W - cam.x * z * 0.004 * (i + 1)) % (W * 1.5);
    const y = ((Math.cos(i * 2.1) * 0.5 + 0.5) * H - cam.y * z * 0.004 * (i + 1)) % (H * 1.5);
    const gr = c.createRadialGradient(x, y, 0, x, y, Math.max(W, H) * 0.5);
    gr.addColorStop(0, world.bg2 + 'cc'); gr.addColorStop(1, world.bg2 + '00');
    c.fillStyle = gr; c.fillRect(0, 0, W, H);
  }
  for (const s of STARS) {
    const x = ((s.x * W - cam.x * z * s.p * 0.02) % W + W) % W;
    const y = ((s.y * H - cam.y * z * s.p * 0.02) % H + H) % H;
    c.globalAlpha = 0.35 + s.p + Math.sin(time * 2 + s.tw) * 0.2;
    c.fillStyle = '#ffffff'; c.fillRect(x, y, s.s, s.s);
  }
  c.globalAlpha = 1;
}

// ---------------------------------------------------------------------
// Hauptfunktion
// ---------------------------------------------------------------------
export function render(c, g, W, H, time) {
  const cam = g.cam, z = cam.zoom, p = g.p;
  const world = g.worlds[g.world];
  const shk = (g.fx && g.fx.shake === false ? 0 : g.shake) * Math.min(W, H) * 0.014;
  const ox = W / 2 + (Math.random() - 0.5) * shk, oy = H / 2 + (Math.random() - 0.5) * shk;
  const sx = x => (x - cam.x) * z + ox, sy = y => (y - cam.y) * z + oy;
  c.lineJoin = 'round'; c.lineCap = 'round';

  drawGround(c, g, W, H, sx, sy, z, world, time);

  // Trümmer-Flecken auf dem Boden
  for (const d of g.decals) {
    const X = sx(d.x), Y = sy(d.y), R = d.size * z;
    if (X < -R || X > W + R || Y < -R || Y > H + R) continue;
    c.globalAlpha = Math.min(1, d.life / 3) * 0.55;
    c.fillStyle = 'rgba(40,25,20,0.5)'; c.beginPath(); c.ellipse(X, Y + R * 0.3, R, R * 0.45, 0, 0, TAU); c.fill();
    c.fillStyle = d.color;
    for (let i = 0; i < 5; i++) { const a = d.seed * 10 + i * 1.3, r = R * (0.2 + (i % 3) * 0.25); c.fillRect(X + Math.cos(a) * r - R * 0.08, Y + R * 0.3 + Math.sin(a) * r * 0.45 - R * 0.05, R * 0.16, R * 0.1); }
  }
  c.globalAlpha = 1;

  // Meteor-Schatten
  for (const m of g.meteors) {
    const k = 1 - m.t / 0.7;
    c.fillStyle = `rgba(0,0,0,${0.15 + k * 0.3})`;
    c.beginPath(); c.ellipse(sx(m.x), sy(m.y), m.r * z * k, m.r * z * k * 0.5, 0, 0, TAU); c.fill();
    const mx = sx(m.x) + (1 - k) * W * 0.3, my = sy(m.y) - (1 - k) * H * 0.7;
    c.fillStyle = '#ffb13d'; c.beginPath(); c.arc(mx, my, Math.max(4, p.r * z * 0.5), 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,200,80,0.5)'; c.lineWidth = Math.max(3, p.r * z * 0.4); c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + W * 0.08, my - H * 0.18); c.stroke();
  }

  // Bodenwellen (Stampfer)
  for (const r of g.rings) if (r.ground) {
    const k = 1 - r.life / r.max;
    c.strokeStyle = r.color; c.globalAlpha = 1 - k; c.lineWidth = Math.max(3, r.r * z * 0.1 * (1 - k));
    c.beginPath(); c.ellipse(sx(r.x), sy(r.y), r.r * z * (0.2 + 0.8 * k), r.r * z * (0.2 + 0.8 * k) * 0.5, 0, 0, TAU); c.stroke();
    c.globalAlpha = 1;
  }

  // Magnet-Reichweite (nur wenn Magnet gelevelt)
  if (g.stats.magnet > 0 && g.state === 'play') {
    const R = g.magnetRange() * z;
    c.strokeStyle = 'rgba(255,220,90,0.18)'; c.lineWidth = 2; c.setLineDash([6, 8]);
    c.beginPath(); c.ellipse(sx(p.x), sy(p.y), R, R * 0.55, 0, 0, TAU); c.stroke(); c.setLineDash([]);
  }

  // ---- Objekte + Monster, nach Tiefe sortiert
  const limit = g.breakLimit();
  const drawList = [];
  for (const o of g.objects) {
    const X = sx(o.x), Y = sy(o.y), R = o.size * z;
    if (X < -R * 2.5 || X > W + R * 2.5 || Y < -R * 2.5 || Y > H + R * 2.5) continue;
    drawList.push(o);
  }
  drawList.push(null); // Platzhalter für das Monster
  drawList.sort((a, b) => (a ? a.y : p.y) - (b ? b.y : p.y));
  const hasFilter = 'filter' in c;
  for (const o of drawList) {
    if (o === null) { if (g.state !== 'dying' && g.state !== 'over') drawPlayer(c, g, sx(p.x), sy(p.y), g.hr() * z, time); continue; }
    drawObject(c, g, o, sx(o.x), sy(o.y), o.size * z, limit, time, hasFilter);
  }

  // Trümmerstücke
  for (const ch of g.chunks) {
    const X = sx(ch.x), Y = sy(ch.y), s = Math.max(2, ch.size * z);
    if (X < -50 || X > W + 50 || Y < -50 || Y > H + 50) continue;
    c.globalAlpha = Math.min(1, ch.life * 2);
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(X, Y, s * 0.6, s * 0.25, 0, 0, TAU); c.fill();
    c.save(); c.translate(X, Y - ch.z * z); c.rotate(ch.rot);
    c.beginPath();
    for (let i = 0; i < ch.sides; i++) { const a = i / ch.sides * TAU; c.lineTo(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.4); }
    c.closePath(); c.fillStyle = ch.color; c.fill(); c.lineWidth = Math.max(1, s * 0.12); c.strokeStyle = OUT; c.stroke();
    c.restore();
  }
  c.globalAlpha = 1;

  // Münzen
  const cr = Math.max(4, Math.min(9, p.r * z * 0.17));
  for (const k of g.coins) {
    const X = sx(k.x), Y = sy(k.y);
    if (X < -20 || X > W + 20 || Y < -20 || Y > H + 20) continue;
    if (k.life < 2 && Math.floor(k.life * 8) % 2 === 0) continue;
    const hz = k.z * z;
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(X, Y + cr * 0.4, cr * 0.8, cr * 0.3, 0, 0, TAU); c.fill();
    const w = Math.max(0.25, Math.abs(Math.cos(k.spin)));
    c.fillStyle = '#b07a00'; c.beginPath(); c.ellipse(X, Y - hz, cr * w, cr, 0, 0, TAU); c.fill();
    c.fillStyle = k.golden ? '#fff1a0' : '#ffd23f'; c.beginPath(); c.ellipse(X - cr * 0.08 * w, Y - hz - cr * 0.05, cr * 0.82 * w, cr * 0.85, 0, 0, TAU); c.fill();
    c.fillStyle = '#ffffff'; c.globalAlpha = 0.7; c.beginPath(); c.ellipse(X - cr * 0.3 * w, Y - hz - cr * 0.35, cr * 0.18 * w, cr * 0.25, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
  }

  // Staubwolken
  for (const u of g.puffs) {
    c.globalAlpha = Math.max(0, u.life / u.max) * 0.7;
    c.fillStyle = u.color; c.beginPath(); c.arc(sx(u.x), sy(u.y), Math.max(2, u.r * z), 0, TAU); c.fill();
  }
  c.globalAlpha = 1;

  // Druckwellen
  for (const r of g.rings) if (!r.ground) {
    const k = 1 - r.life / r.max;
    c.strokeStyle = r.color; c.globalAlpha = 1 - k; c.lineWidth = Math.max(2, r.r * z * 0.1 * (1 - k));
    c.beginPath(); c.ellipse(sx(r.x), sy(r.y), r.r * z * (0.3 + 0.7 * k), r.r * z * (0.3 + 0.7 * k) * 0.7, 0, 0, TAU); c.stroke();
    c.globalAlpha = 1;
  }

  // Partikel
  for (const q of g.particles) {
    const X = sx(q.x), Y = sy(q.y), s = Math.max(2, q.size * z);
    c.globalAlpha = Math.min(1, q.life / q.max * 1.5);
    c.fillStyle = q.color;
    if (q.kind === 'spark') { c.strokeStyle = q.color; c.lineWidth = Math.max(2, s * 0.5); c.beginPath(); c.moveTo(X, Y); c.lineTo(X - q.vx * z * 0.04, Y - q.vy * z * 0.04); c.stroke(); }
    else if (q.kind === 'flame') { c.beginPath(); c.arc(X, Y, s * (q.life / q.max), 0, TAU); c.fill(); }
    else { c.save(); c.translate(X, Y); c.rotate(q.rot); c.fillRect(-s / 2, -s / 2, s, s); c.restore(); }
  }
  c.globalAlpha = 1;

  // schwebende Texte (poppen auf)
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const t of g.texts) {
    const age = t.max - t.life, pop = age < 0.12 ? 0.6 + age / 0.12 * 0.6 : 1.2 - Math.min(0.2, (age - 0.12) * 1.5);
    c.globalAlpha = Math.min(1, t.life / t.max * 2.5);
    const size = Math.round((t.big ? 26 : 17) * pop);
    c.font = `${size}px "Lilita One", system-ui, sans-serif`;
    c.lineWidth = 5; c.strokeStyle = 'rgba(30,10,10,0.85)';
    c.strokeText(t.s, sx(t.x), sy(t.y)); c.fillStyle = t.color; c.fillText(t.s, sx(t.x), sy(t.y));
  }
  c.globalAlpha = 1;

  drawOverlays(c, g, W, H, time);
}

const CENTERED = new Set(['planet', 'earth', 'ringplanet', 'star', 'nebula', 'cluster', 'blackhole', 'galaxy', 'station', 'satellite', 'comet', 'ufo']);

function drawObject(c, g, o, X, Y, R, limit, time, hasFilter) {
  if (R < 1.2) { c.fillStyle = o.color; c.fillRect(X - 1, Y - 1, 2, 2); return; }
  const space = g.worlds[o.world] && g.worlds[o.world].ground === 'space';
  const centered = space || CENTERED.has(o.shape);
  const pop = o.pop > 0 ? 1 - o.pop : 1;
  const popS = pop < 1 ? Math.max(0.01, 1 - Math.pow(1 - pop, 3) + Math.sin(pop * Math.PI) * 0.25) : 1;
  // Schatten
  if (!centered) { c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(X + R * 0.08, Y + R * 0.45, R * 0.95 * popS, R * 0.3 * popS, 0, 0, TAU); c.fill(); }
  // Markierung: zu groß / Hindernis
  const tooBig = o.size > limit;
  if (tooBig && R > 6 && !o.crate) {
    c.strokeStyle = o.hazard ? 'rgba(255,60,60,0.75)' : 'rgba(0,0,0,0.3)'; c.lineWidth = Math.max(1.5, R * 0.05);
    c.setLineDash([R * 0.18, R * 0.12]);
    c.beginPath(); c.ellipse(X, Y + (centered ? 0 : R * 0.45), R * 1.05, R * (centered ? 1.05 : 0.38), 0, 0, TAU); c.stroke();
    c.setLineDash([]);
  }
  c.save();
  const a = o.hitAnim || 0;
  if (centered) { c.translate(X, Y); c.scale((1 + a * 0.15) * popS, (1 - a * 0.15) * popS); c.scale(R, R); }
  else {
    c.translate(X, Y + R * 0.5);
    c.scale((1 + a * 0.2) * popS, (1 - a * 0.22) * popS);
    c.translate(0, -R * 0.5);
    c.scale(R * (o.move ? o.face : 1), R);
    c.translate(0, -0.5);
    if (o.move === 'flee' || o.move === 'wander') c.rotate(Math.sin(o.anim * 3) * 0.05);
  }
  c.lineWidth = Math.min(Math.max(0.075 * R, 1.3), 4) / R;
  c.strokeStyle = OUT;
  // Goldene Objekte: Farbe vorübergehend auf Gold umstellen (Filter sind zu langsam)
  const fn = SPRITES[o.shape] || SPRITES.rock;
  if (o.golden) { const col = o.color; o.color = '#ffd23f'; fn(c, o, time); o.color = col; }
  else fn(c, o, time);
  // Treffer-Blitz: weißer Schimmer über der Form
  if (o.flash > 0.05) { c.globalAlpha = o.flash * 0.6; c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(0, 0, 0.95, 0.95, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
  c.restore();
  // Funkeln goldener Objekte / Kisten
  if (o.golden || o.crate) {
    const t = time * 3 + o.seed * 10;
    c.fillStyle = '#fff8c0';
    for (let i = 0; i < 3; i++) { const an = t + i * 2.1, s = Math.max(2, R * 0.1) * (0.6 + 0.4 * Math.sin(t * 2 + i)); star4(c, X + Math.cos(an) * R * 1.05, Y - R * 0.5 + Math.sin(an * 1.3) * R * 0.9, s); }
  }
  // Warnsymbol über Hindernissen
  if (o.hazard && tooBig && R > 6) {
    const bob = Math.sin(time * 6 + o.seed * 5) * 3;
    const hy = Y - (centered ? R * 1.25 : R * 1.8) + bob, hs = Math.max(8, Math.min(16, R * 0.35));
    c.fillStyle = '#ff3b2f'; c.strokeStyle = '#fff'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(X, hy - hs); c.lineTo(X + hs, hy + hs * 0.8); c.lineTo(X - hs, hy + hs * 0.8); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.font = `${Math.round(hs * 1.1)}px "Lilita One", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', X, hy + hs * 0.15);
  }
  // HP-Balken
  if (o.hp < o.maxHp && R > 5) {
    const w = Math.max(24, R * 1.4), f = Math.max(0, o.hp / o.maxHp);
    const by = Y - (centered ? R * 1.2 : R * 1.75) - 8;
    c.fillStyle = 'rgba(20,10,10,0.75)'; c.beginPath(); c.roundRect(X - w / 2 - 2, by - 2, w + 4, 9, 4); c.fill();
    c.fillStyle = f > 0.5 ? '#ffd23f' : '#ff5a3d'; c.beginPath(); c.roundRect(X - w / 2, by, w * f, 5, 3); c.fill();
  }
}

function star4(c, x, y, s) {
  c.beginPath(); c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill();
}

function drawPlayer(c, g, X, Y, R, time) {
  const p = g.p;
  // Ansturm: Speedlines
  if (p.dashT > 0) {
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = Math.max(2, R * 0.08);
    for (let i = 0; i < 5; i++) { const off = (i - 2) * R * 0.4; c.beginPath(); c.moveTo(X - p.dashX * R * 1.2 - p.dashY * off, Y - R - p.dashY * R * 1.2 + p.dashX * off); c.lineTo(X - p.dashX * R * 3 - p.dashY * off, Y - R - p.dashY * R * 3 + p.dashX * off); c.stroke(); }
  }
  drawMonster(c, X, Y, R, {
    char: g.char, stage: g.world, face: p.face, walk: p.walk, punchT: p.punchT, punchX: p.punchX, punchY: p.punchY,
    hurtT: p.hurtT, berserk: p.berserkT > 0, squash: p.squash, time, lookX: p.lookX, lookY: p.lookY, slamT: p.slamT,
  });
  // Ansturm bereit: kleiner Ring am Boden
  if (p.dashCd <= 0 && g.state === 'play') {
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(X, Y, R * 1.2, R * 0.42, 0, 0, TAU); c.stroke();
  }
}

function drawOverlays(c, g, W, H, time) {
  const p = g.p;
  // Berserker: rote Flammen am Rand
  if (p.berserkT > 0) {
    const a = 0.35 + Math.sin(time * 12) * 0.1;
    const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(255,40,0,0)'); v.addColorStop(1, `rgba(255,40,0,${a})`);
    c.fillStyle = v; c.fillRect(0, 0, W, H);
  }
  // wenig Wut / Treffer: rote Vignette
  const rf = p.rage / g.stats.rageMax;
  const danger = Math.max(rf < 0.3 && g.state === 'play' ? (0.3 - rf) / 0.3 * (0.35 + 0.15 * Math.sin(time * 10)) : 0, p.hurtT * 0.9);
  if (danger > 0.01) {
    const v = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(120,0,0,0)'); v.addColorStop(1, `rgba(170,0,0,${danger})`);
    c.fillStyle = v; c.fillRect(0, 0, W, H);
  }
  if (g.flash > 0) { c.fillStyle = `rgba(255,250,235,${g.flash * 0.55})`; c.fillRect(0, 0, W, H); }
}

// Vorschau eines Monsters (Menü, Monster-Auswahl)
export function drawMonsterPreview(canvas, char, stage, time, locked) {
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  c.clearRect(0, 0, W, H);
  const R = Math.min(W, H) * 0.29;
  drawMonster(c, W / 2, H * 0.86, R, {
    char, stage, face: 1, walk: time * 1.5, punchT: (time % 2.2) < 0.18 ? 0.15 : 0, punchX: 1, punchY: 0, hurtT: 0, berserk: false,
    squash: 0, time, lookX: 1, lookY: 0, slamT: 0,
  });
  if (locked) { // geheimnisvolle Silhouette
    c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(18,8,10,0.92)'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = `${Math.round(H * 0.22)}px "Lilita One", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', W / 2, H * 0.55);
  }
}
