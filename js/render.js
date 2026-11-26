// =====================================================================
//  RAGEVERSE – Zeichnen (Canvas 2D)
//  Reihenfolge: Boden → Trümmer-Flecken → Schatten/Objekte/Monster
//  (nach Tiefe sortiert) → Trümmer → Münzen → Effekte → Overlays
// =====================================================================
import { SPRITES, OUT } from './sprites.js?v=0.6.2';
import { drawMonster } from './monster.js?v=0.6.2';
import { shadeHex as sh, shadeHex } from './game.js?v=0.6.2';

const TAU = Math.PI * 2;
const STARS = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.8 + 0.4, p: Math.random() * 0.6 + 0.1, tw: Math.random() * 6 }));
const hash = (x, y, k = 0) => { const h = Math.sin(x * 127.1 + y * 311.7 + k * 74.7) * 43758.5453; return h - Math.floor(h); };

// ---------------------------------------------------------------------
// Boden: feste Landschaften je Welt. Die Landschaft liegt fest in der
// Welt (Maßstab S = Start-Größe der Welt) – wächst du, schrumpft sie unter dir.
// ---------------------------------------------------------------------
function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y, seed) => vnoise(x, y, seed) * 0.62 + vnoise(x * 2.7, y * 2.7, seed + 7) * 0.28 + vnoise(x * 6.1, y * 6.1, seed + 13) * 0.1;

function drawGround(c, g, W, H, sx, sy, z, world, time) {
  const cam = g.cam;
  const S = Math.max(10, world.minRadius);
  const v = { x0: cam.x - W / 2 / z - S, x1: cam.x + W / 2 / z + S, y0: cam.y - H / 2 / z - S, y1: cam.y + H / 2 / z + S };
  const ctx = { c, g, W, H, sx, sy, z, world, time, S, v, px: w => w * z };
  c.fillStyle = world.bg; c.fillRect(0, 0, W, H);
  const fn = GROUNDS[world.ground] || GROUNDS.lawn;
  fn(ctx);
}

// Zellen eines Rasters (Weltmaßstab) im Sichtbereich durchlaufen
function cells(v, C, cb) {
  const x0 = Math.floor(v.x0 / C), x1 = Math.ceil(v.x1 / C), y0 = Math.floor(v.y0 / C), y1 = Math.ceil(v.y1 / C);
  if ((x1 - x0) * (y1 - y0) > 6000) return;
  for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) cb(ix, iy);
}
// Gelände aus Rauschen: farbige Flecken je Höhenstufe (adaptives Raster, feste Formen)
function terrain(k, scale, seed, layers) {
  // Glatte Höhenlinien per Marching Squares: Rauschwerte an Gitterpunkten,
  // jede Höhenstufe wird als geschlossene, interpolierte Fläche gefüllt.
  const { c, z, sx, sy, v } = k;
  let C = 16 / z;
  while (((v.x1 - v.x0) / C) * ((v.y1 - v.y0) / C) > 9000) C *= 1.5;
  const x0 = Math.floor(v.x0 / C), y0 = Math.floor(v.y0 / C);
  const nx = Math.ceil(v.x1 / C) - x0 + 1, ny = Math.ceil(v.y1 / C) - y0 + 1;
  const PF = typeof window !== 'undefined' && window.__prof, t0 = PF ? performance.now() : 0;
  const val = new Float32Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) val[j * (nx + 1) + i] = fbm((x0 + i) * C / scale, (y0 + j) * C / scale, seed);
  const P = (i, j) => [sx((x0 + i) * C), sy((y0 + j) * C)];
  if (PF) { PF.t_noise = (PF.t_noise || 0) + performance.now() - t0; PF.t_cells = (PF.t_cells || 0) + nx * ny; PF.t_calls = (PF.t_calls || 0) + 1; }
  for (const L of layers) {
    const g = L.t2 !== undefined ? n => L.t2 - n : n => n - L.t;
    // Volle Zellen werden pro Zeile zu Streifen zusammengefasst (wenige Rechtecke statt tausender Pfade),
    // nur die Randzellen bekommen die interpolierte Kontur.
    const runs = [], edges = [];
    for (let j = 0; j < ny; j++) {
      let runStart = -1;
      for (let i = 0; i <= nx; i++) {
        let full = false, vs = null;
        if (i < nx) {
          vs = [g(val[j * (nx + 1) + i]), g(val[j * (nx + 1) + i + 1]), g(val[(j + 1) * (nx + 1) + i + 1]), g(val[(j + 1) * (nx + 1) + i])];
          full = vs[0] >= 0 && vs[1] >= 0 && vs[2] >= 0 && vs[3] >= 0;
        }
        if (full) { if (runStart < 0) runStart = i; continue; }
        if (runStart >= 0) { runs.push([runStart, i, j]); runStart = -1; }
        if (!vs || (vs[0] < 0 && vs[1] < 0 && vs[2] < 0 && vs[3] < 0)) continue;
        const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], pts = [];
        for (let e = 0; e < 4; e++) {
          const a2 = vs[e], b2 = vs[(e + 1) % 4], pa = P(...corners[e]), pb = P(...corners[(e + 1) % 4]);
          if (a2 >= 0) pts.push(pa);
          if ((a2 >= 0) !== (b2 >= 0)) { const t = a2 / (a2 - b2); pts.push([pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t]); }
        }
        edges.push(pts);
      }
    }
    const draw = (dx, dy, col) => {
      c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 1;
      c.beginPath();
      for (const [i0, i1, j] of runs) { const [ax, ay] = P(i0, j), [bx, by] = P(i1, j + 1); c.rect(ax + dx - 0.5, ay + dy - 0.5, bx - ax + 1, by - ay + 1); }
      c.fill();
      c.beginPath();
      for (const pts of edges) { c.moveTo(pts[0][0] + dx, pts[0][1] + dy); for (let q = 1; q < pts.length; q++) c.lineTo(pts[q][0] + dx, pts[q][1] + dy); c.closePath(); }
      c.fill(); c.stroke(); // schließt Haarlinien zwischen den Randzellen
    };
    if (L.rim) draw(0, Math.max(2, C * z * 0.35), L.rim);
    draw(0, 0, L.color);
  }
  if (PF) PF.t_total = (PF.t_total || 0) + performance.now() - t0;
}

// Teure Landschaften einmal vorzeichnen und wiederverwenden (bis man sich weit bewegt oder stark wächst)
const groundCache = {};
let lastGroundBuild = 0;
function cached(k, key, painter) {
  const { c, z, g, W, H, sx, sy } = k;
  const cam = g.cam;
  key = key + ':' + (g.map ? g.map.id : '') + ':' + g.world;
  let t = groundCache[key];
  const vx0 = cam.x - W / 2 / z, vx1 = cam.x + W / 2 / z, vy0 = cam.y - H / 2 / z, vy1 = cam.y + H / 2 / z;
  // Rauszoomen (Wachsen): altes Bild wird nur verkleinert – erst neu rechnen, wenn es zu klein wird oder der Rand erreicht ist.
  // Reinzoomen: ab 25 % neu rechnen, sonst wird es unscharf.
  const now = performance.now();
  // grob gerechnetes Bild nach 1,5 s Ruhe einmal scharf nachrechnen
  const sharpen = t && t.low && now - t.at > 1500 && now - lastGroundBuild > 1500;
  const stale = !t || sharpen || z / t.z > 1.25 || z / t.z < 0.45 || vx0 < t.x0 || vx1 > t.x1 || vy0 < t.y0 || vy1 > t.y1;
  if (stale && (!t || sharpen || now - (t.at || 0) > 300 || vx0 < t.x0 - (t.x1 - t.x0) || vy0 < t.y0 - (t.y1 - t.y0))) {
    for (const k2 of Object.keys(groundCache)) if (k2 !== key) delete groundCache[k2];
    const fast = !sharpen && now - lastGroundBuild < 2500; // schnelles Wachstum / Weltwechsel: gröber rechnen, dafür flüssig
    const growing = g.p && g.p.r > (t ? t.r || 0 : 0) * 1.01;
    // beim Wachsen großzügig im Voraus rechnen (deckt ~1,6× weiteres Rauszoomen ab)
    const span = growing ? 0.8 : 0.45, mx = W / z * span, my = H / z * span;
    const RES = fast ? 0.45 : 0.7;
    t = t || { cv: document.createElement('canvas') };
    t.at = now; t.low = fast; lastGroundBuild = now; t.z = z; t.r = g.p ? g.p.r : 0; t.x0 = vx0 - mx; t.x1 = vx1 + mx; t.y0 = vy0 - my; t.y1 = vy1 + my;
    const zz = z * RES;
    t.cv.width = Math.ceil((t.x1 - t.x0) * zz); t.cv.height = Math.ceil((t.y1 - t.y0) * zz);
    const oc = t.cv.getContext('2d');
    oc.clearRect(0, 0, t.cv.width, t.cv.height); // transparent: liegt über dem Boden
    painter({ ...k, c: oc, z: zz, W: t.cv.width, H: t.cv.height, sx: x => (x - t.x0) * zz, sy: y => (y - t.y0) * zz,
      v: { x0: t.x0, x1: t.x1, y0: t.y0, y1: t.y1 } });
    groundCache[key] = t;
  }
  c.imageSmoothingEnabled = true;
  c.drawImage(t.cv, sx(t.x0), sy(t.y0), (t.x1 - t.x0) * z, (t.y1 - t.y0) * z);
}
const circle = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
// Baum von oben (Krone mit Schatten)
function treeTop(c, x, y, r, col, dark) {
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(x + r * 0.25, y + r * 0.3, r, r * 0.85, 0, 0, TAU); c.fill();
  circle(c, x, y, r, dark); circle(c, x - r * 0.12, y - r * 0.12, r * 0.82, col);
  circle(c, x - r * 0.35, y - r * 0.35, r * 0.28, 'rgba(255,255,255,0.18)');
}
function pineTop(c, x, y, r, col) { // Deko-Tanne: flach, ohne Schatten (Objekte haben Schatten + Umriss)
  c.fillStyle = col; c.beginPath();
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, rr = i % 2 ? r * 0.55 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.fill(); circle(c, x, y, r * 0.3, 'rgba(255,255,255,0.12)');
}

// Straßenraster (Vorstadt, Stadt, Westernstadt, Bonbonstadt)
function streetGrid(k, o) {
  const { c, sx, sy, z, v, S } = k;
  const B = S * o.block, Rw = S * o.road, sw = S * o.walk;
  const bx0 = Math.floor(v.x0 / B), bx1 = Math.ceil(v.x1 / B), by0 = Math.floor(v.y0 / B), by1 = Math.ceil(v.y1 / B);
  c.fillStyle = o.asphalt; c.fillRect(0, 0, k.W, k.H);
  for (let ix = bx0; ix <= bx1; ix++) for (let iy = by0; iy <= by1; iy++) {
    const x = ix * B + Rw / 2, y = iy * B + Rw / 2, w = B - Rw;
    // Bordstein + Gehweg
    c.fillStyle = o.curb; c.fillRect(sx(x) - 1, sy(y) - 1, w * z + 2, w * z + 2);
    c.fillStyle = o.walkCol; c.fillRect(sx(x + S * 0.08), sy(y + S * 0.08), (w - S * 0.16) * z, (w - S * 0.16) * z);
    if (sw * z > 6) { // Gehwegplatten
      c.strokeStyle = 'rgba(0,0,0,0.07)'; c.lineWidth = 1; c.beginPath();
      for (let t = x; t < x + w; t += sw) { c.moveTo(sx(t), sy(y)); c.lineTo(sx(t), sy(y + sw)); c.moveTo(sx(t), sy(y + w - sw)); c.lineTo(sx(t), sy(y + w)); }
      c.stroke();
    }
    o.lot(k, x + sw, y + sw, w - sw * 2, hash(ix, iy, 3), ix, iy);
  }
  // Markierungen
  const lw = Math.max(1.5, S * 0.12 * z);
  c.lineWidth = lw;
  if (o.center) {
    c.strokeStyle = o.center; c.setLineDash([S * 0.7 * z, S * 0.6 * z]); c.beginPath();
    for (let ix = bx0; ix <= bx1; ix++) { const x = ix * B; for (let iy = by0; iy <= by1; iy++) { c.moveTo(sx(x), sy(iy * B + Rw / 2)); c.lineTo(sx(x), sy((iy + 1) * B - Rw / 2)); } }
    for (let iy = by0; iy <= by1; iy++) { const y = iy * B; for (let ix = bx0; ix <= bx1; ix++) { c.moveTo(sx(ix * B + Rw / 2), sy(y)); c.lineTo(sx((ix + 1) * B - Rw / 2), sy(y)); } }
    c.stroke(); c.setLineDash([]);
  }
  if (o.lanes) {
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.setLineDash([S * 0.5 * z, S * 0.7 * z]); c.beginPath();
    for (const off of [-Rw / 4, Rw / 4]) {
      for (let ix = bx0; ix <= bx1; ix++) for (let iy = by0; iy <= by1; iy++) { c.moveTo(sx(ix * B + off), sy(iy * B + Rw / 2)); c.lineTo(sx(ix * B + off), sy((iy + 1) * B - Rw / 2)); }
      for (let iy = by0; iy <= by1; iy++) for (let ix = bx0; ix <= bx1; ix++) { c.moveTo(sx(ix * B + Rw / 2), sy(iy * B + off)); c.lineTo(sx((ix + 1) * B - Rw / 2), sy(iy * B + off)); }
    }
    c.stroke(); c.setLineDash([]);
  }
  // Zebrastreifen an Kreuzungen
  if (o.zebra && Rw * z > 30) {
    c.fillStyle = o.zebra;
    const st = Rw / 9;
    for (let ix = bx0; ix <= bx1; ix++) for (let iy = by0; iy <= by1; iy++) {
      const cx = ix * B, cy = iy * B;
      for (let i = 0; i < 4; i++) {
        const t = -Rw / 2 + st * (1 + i * 2);
        c.fillRect(sx(cx + t), sy(cy - Rw / 2 - S * 0.9), st * z, S * 0.7 * z);
        c.fillRect(sx(cx + t), sy(cy + Rw / 2 + S * 0.2), st * z, S * 0.7 * z);
        c.fillRect(sx(cx - Rw / 2 - S * 0.9), sy(cy + t), S * 0.7 * z, st * z);
        c.fillRect(sx(cx + Rw / 2 + S * 0.2), sy(cy + t), S * 0.7 * z, st * z);
      }
    }
  }
}

const GROUNDS = {
  // ---------------- Garten: Grundstücke mit Kieswegen, Hecken, Rasen, Beeten und Teichen.
  // Regel: Alles am Boden ist FLACH (keine Umrisse, keine Schatten) – nur echte Objekte haben Umrisse.
  lawn(k) {
    const { c, sx, sy, z, v, S, W, H } = k;
    const B = S * 14, Pw = S * 1.8, Hw = S * 0.45;
    c.fillStyle = '#d8c9a0'; c.fillRect(0, 0, W, H); // Kies
    // Kies-Körnung
    const G = S * 0.9;
    if (G * z > 6) {
      c.fillStyle = 'rgba(120,100,60,0.18)';
      cells(v, G, (ix, iy) => { const h = hash(ix, iy, 401); if (h < 0.5) return; c.fillRect(sx((ix + h) * G), sy((iy + hash(iy, ix, 402)) * G), Math.max(1, S * z * 0.12), Math.max(1, S * z * 0.12)); });
    }
    const bx0 = Math.floor(v.x0 / B), bx1 = Math.ceil(v.x1 / B), by0 = Math.floor(v.y0 / B), by1 = Math.ceil(v.y1 / B);
    for (let ix = bx0; ix <= bx1; ix++) for (let iy = by0; iy <= by1; iy++) {
      const x = ix * B + Pw / 2, y = iy * B + Pw / 2, w = B - Pw, h = hash(ix, iy, 403);
      // Hecke (flach) rund um die Parzelle
      c.fillStyle = '#4e9a3d'; c.fillRect(sx(x), sy(y), w * z, w * z);
      c.fillStyle = '#5aa846'; c.fillRect(sx(x), sy(y), w * z, Hw * 0.45 * z);
      // Rasen mit Mähstreifen
      const lx = x + Hw, ly = y + Hw, lw = w - Hw * 2;
      c.fillStyle = '#74c25a'; c.fillRect(sx(lx), sy(ly), lw * z, lw * z);
      c.fillStyle = '#6ab850';
      const stripes = 6;
      for (let i = 0; i < stripes; i += 2) c.fillRect(sx(lx + i * lw / stripes), sy(ly), lw / stripes * z, lw * z);
      // Gartenelemente (flach, gedeckte Farben)
      if (h < 0.3) { // Gemüsebeet
        const bx = lx + lw * 0.12, by = ly + lw * 0.12, bw = lw * 0.42, bh = lw * 0.3;
        c.fillStyle = '#8a6a48'; c.fillRect(sx(bx), sy(by), bw * z, bh * z);
        c.fillStyle = '#6fa64e';
        for (let r = 0; r < 3; r++) for (let q = 0; q < 6; q++) { c.beginPath(); c.arc(sx(bx + bw * (0.1 + q * 0.16)), sy(by + bh * (0.22 + r * 0.28)), Math.max(1, S * z * 0.22), 0, TAU); c.fill(); }
      } else if (h < 0.5) { // Teich mit Steinrand (flach)
        const cx = lx + lw * 0.68, cy = ly + lw * 0.62, rx = lw * 0.2, ry = lw * 0.14;
        c.fillStyle = '#b9b3a3'; c.beginPath(); c.ellipse(sx(cx), sy(cy), (rx + S * 0.35) * z, (ry + S * 0.35) * z, 0, 0, TAU); c.fill();
        c.fillStyle = '#5ab4dc'; c.beginPath(); c.ellipse(sx(cx), sy(cy), rx * z, ry * z, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(sx(cx - rx * 0.3), sy(cy - ry * 0.35), rx * 0.4 * z, ry * 0.18 * z, 0, 0, TAU); c.fill();
        c.fillStyle = '#6fbf5a'; c.beginPath(); c.arc(sx(cx + rx * 0.35), sy(cy + ry * 0.2), Math.max(1, S * z * 0.35), 0, TAU); c.fill();
      } else if (h < 0.68) { // Blumenrabatte entlang der Hecke (flacher Streifen)
        c.fillStyle = '#7a5c40'; c.fillRect(sx(lx), sy(ly + lw - S * 1.1), lw * z, S * 1.1 * z);
        const cols = ['#e86f9a', '#f2c94c', '#f4f0e6', '#b48ad9'];
        for (let q = 0; q < 14; q++) { c.fillStyle = cols[q % 4]; c.beginPath(); c.arc(sx(lx + lw * (0.04 + q * 0.07)), sy(ly + lw - S * 0.55 + Math.sin(q * 2.3) * S * 0.2), Math.max(1, S * z * 0.2), 0, TAU); c.fill(); }
      } else if (h < 0.8) { // Terrasse (Steinplatten)
        const tx = lx + lw * 0.55, ty = ly + lw * 0.1, tw = lw * 0.35;
        c.fillStyle = '#c9c2b4'; c.fillRect(sx(tx), sy(ty), tw * z, tw * z);
        c.strokeStyle = 'rgba(0,0,0,0.08)'; c.lineWidth = 1; c.beginPath();
        for (let q = 1; q < 4; q++) { c.moveTo(sx(tx + tw * q / 4), sy(ty)); c.lineTo(sx(tx + tw * q / 4), sy(ty + tw)); c.moveTo(sx(tx), sy(ty + tw * q / 4)); c.lineTo(sx(tx + tw), sy(ty + tw * q / 4)); }
        c.stroke();
      }
      // Trittsteine quer über den Rasen (flach)
      if (h > 0.4 && h < 0.9) {
        c.fillStyle = '#c4bdae';
        for (let q = 0; q < 6; q++) { c.beginPath(); c.ellipse(sx(lx + lw * (0.1 + q * 0.15)), sy(ly + lw * 0.85 - q * lw * 0.05), S * 0.45 * z, S * 0.3 * z, 0, 0, TAU); c.fill(); }
      }
    }
  },

  // ---------------- Vorstadt-Straßen: Blöcke mit Vorgärten
  street(k) {
    streetGrid(k, {
      block: 12, road: 2.6, walk: 0.9, asphalt: '#50535d', curb: '#9a9ca4', walkCol: '#d4d6dc', center: '#f5d14a', zebra: 'rgba(255,255,255,0.85)',
      lot(k, x, y, w, h, ix, iy) {
        const { c, sx, sy, z, S } = k, u = S * z;
        c.fillStyle = '#86c45e'; c.fillRect(sx(x), sy(y), w * z, w * z);
        c.fillStyle = '#7ab654'; for (let i = 0; i < 4; i++) if (i % 2) c.fillRect(sx(x + i * w / 4), sy(y), w / 4 * z, w * z);
        // Einfahrt
        c.fillStyle = '#bfc1c8'; c.fillRect(sx(x + w * 0.62), sy(y + w * 0.55), w * 0.14 * z, w * 0.45 * z);
        // Hecke rundherum
        c.strokeStyle = '#3f7d34'; c.lineWidth = Math.max(2, u * 0.35); c.strokeRect(sx(x + S * 0.2), sy(y + S * 0.2), (w - S * 0.4) * z, (w - S * 0.4) * z);
        if (h < 0.35) { // Pool
          c.fillStyle = '#e8eef2'; c.beginPath(); c.roundRect(sx(x + w * 0.12), sy(y + w * 0.14), w * 0.34 * z, w * 0.22 * z, u * 0.4); c.fill();
          c.fillStyle = '#4fc3e9'; c.beginPath(); c.roundRect(sx(x + w * 0.14), sy(y + w * 0.16), w * 0.3 * z, w * 0.18 * z, u * 0.3); c.fill();
        } else { // Gartenbeet
          c.fillStyle = '#7a4e30'; c.fillRect(sx(x + w * 0.12), sy(y + w * 0.12), w * 0.3 * z, w * 0.1 * z);
        }
        for (let i = 0; i < 3; i++) treeTop(c, sx(x + w * (0.18 + hash(ix, iy, 20 + i) * 0.6)), sy(y + w * (0.5 + hash(iy, ix, 30 + i) * 0.35)), u * (0.8 + hash(ix, i, iy) * 0.5), '#4fae45', '#2e6e2a');
      },
    });
  },

  // ---------------- Stadt: breite Straßen, Parks, Parkplätze, Plätze
  city(k) {
    streetGrid(k, {
      block: 11, road: 3.2, walk: 0.7, asphalt: '#3e414b', curb: '#8a8d96', walkCol: '#b4b7c0', center: '#f5d14a', lanes: true, zebra: 'rgba(255,255,255,0.8)',
      lot(k, x, y, w, h, ix, iy) {
        const { c, sx, sy, z, S } = k, u = S * z;
        if (h < 0.3) { // Park
          c.fillStyle = '#6fb352'; c.fillRect(sx(x), sy(y), w * z, w * z);
          c.strokeStyle = '#e6d9b8'; c.lineWidth = Math.max(2, u * 0.5); c.beginPath(); c.moveTo(sx(x), sy(y + w / 2)); c.quadraticCurveTo(sx(x + w / 2), sy(y + w * 0.2), sx(x + w), sy(y + w * 0.6)); c.stroke();
          circle(c, sx(x + w / 2), sy(y + w / 2), u * 1.2, '#4fc3e9');
          for (let i = 0; i < 7; i++) treeTop(c, sx(x + w * hash(ix, iy, 40 + i)), sy(y + w * hash(iy, ix, 50 + i)), u * (0.7 + hash(i, ix, iy) * 0.5), '#4fae45', '#2e6e2a');
        } else if (h < 0.55) { // Parkplatz
          c.fillStyle = '#5a5d66'; c.fillRect(sx(x), sy(y), w * z, w * z);
          c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = Math.max(1, u * 0.08); c.beginPath();
          for (let i = 0; i <= 8; i++) { const tx = x + w * 0.08 + i * w * 0.105; c.moveTo(sx(tx), sy(y + w * 0.1)); c.lineTo(sx(tx), sy(y + w * 0.35)); c.moveTo(sx(tx), sy(y + w * 0.65)); c.lineTo(sx(tx), sy(y + w * 0.9)); }
          c.stroke();
          const cols = ['#e84a5f', '#4bd1a0', '#ffd23f', '#56c2ff', '#ffffff'];
          for (let i = 0; i < 8; i++) if (hash(ix, iy, 60 + i) < 0.6) { c.fillStyle = cols[i % 5]; c.beginPath(); c.roundRect(sx(x + w * 0.1 + i * w * 0.105), sy(y + w * 0.13), w * 0.075 * z, w * 0.18 * z, u * 0.15); c.fill(); }
        } else { // Platz mit Baumreihen
          c.fillStyle = '#c7c3b8'; c.fillRect(sx(x), sy(y), w * z, w * z);
          c.strokeStyle = 'rgba(0,0,0,0.06)'; c.lineWidth = 1; c.beginPath();
          for (let t = 0; t <= w; t += S * 0.9) { c.moveTo(sx(x + t), sy(y)); c.lineTo(sx(x + t), sy(y + w)); c.moveTo(sx(x), sy(y + t)); c.lineTo(sx(x + w), sy(y + t)); }
          c.stroke();
          for (let i = 0; i < 5; i++) { treeTop(c, sx(x + w * (0.1 + i * 0.2)), sy(y + w * 0.12), u * 0.6, '#55b04a', '#2e6e2a'); treeTop(c, sx(x + w * (0.1 + i * 0.2)), sy(y + w * 0.88), u * 0.6, '#55b04a', '#2e6e2a'); }
          circle(c, sx(x + w / 2), sy(y + w / 2), u * 1.1, '#9aa3ad'); circle(c, sx(x + w / 2), sy(y + w / 2), u * 0.85, '#6fd0f0');
        }
      },
    });
  },

  // ---------------- Gebirge: Wiesen, Wälder, Felsen, Bergseen, Schnee
  alpine(k) { cached(k, 'alpine', GROUNDS._alpine); },
  _alpine(k) {
    const { c, sx, sy, z, v, S } = k;
    terrain(k, S * 10, 11, [
      { t: 0.0, t2: 0.3, color: '#4f9ad0', rim: '#3a7fb8' },          // Bergsee
      { t: 0.5, color: '#73a556', rim: '#5f8f47' },                    // dunklere Matten
      { t: 0.6, color: '#a39a86', rim: '#7c7464' },                    // Fels
      { t: 0.68, color: '#8f8676', rim: '#6c6456' },
      { t: 0.74, color: '#eef4f8', rim: '#b8c8d6' },                   // Schnee
    ]);
    // Wälder: kleine Tannen in mittleren Lagen
    const C = S * 1.6;
    if (C * z > 10) cells(v, C, (ix, iy) => {
      const x = (ix + hash(ix, iy, 71)) * C, y = (iy + hash(iy, ix, 72)) * C;
      const n = fbm(x / (S * 10), y / (S * 10), 11);
      if (n > 0.38 && n < 0.58 && hash(ix, iy, 73) < 0.75) pineTop(c, sx(x), sy(y), S * z * (0.45 + hash(ix, iy, 74) * 0.35), n > 0.5 ? '#2c6b3c' : '#3a8a4a');
      else if (n > 0.6 && n < 0.72 && hash(ix, iy, 75) < 0.25) { c.strokeStyle = 'rgba(70,60,50,0.3)'; c.lineWidth = Math.max(1, S * z * 0.08); c.beginPath(); c.moveTo(sx(x), sy(y)); c.lineTo(sx(x + S * 0.6), sy(y + S * 0.3)); c.lineTo(sx(x + S * 0.4), sy(y + S * 0.8)); c.stroke(); }
      else if (n < 0.5 && n > 0.34 && hash(ix, iy, 76) < 0.12) circle(c, sx(x), sy(y), S * z * 0.12, ['#ffffff', '#ffd23f', '#c38bff'][ix & 1 + (iy & 1)]);
    });
  },

  // ---------------- Kontinent: Weltkarte von oben mit Wolken
  ocean(k) {
    const { c, sx, sy, z, v, S, time, W, H } = k;
    cached(k, 'ocean', kk => terrain(kk, S * 9, 21, [
      { t: 0.5, color: '#3f9fdc' },                     // Flachwasser
      { t: 0.56, color: '#6cc2ea' },
      { t: 0.6, color: '#f0d58a', rim: '#d9b864' },     // Strand
      { t: 0.625, color: '#7cc05f', rim: '#62a64a' },   // Land
      { t: 0.72, color: '#4f9e4a', rim: '#3d8238' },    // Wald
      { t: 0.8, color: '#a39a86', rim: '#7c7464' },     // Gebirge
      { t: 0.87, color: '#f4f8fa', rim: '#b8c8d6' },    // Gipfel
    ]));
    // Wellen auf tiefem Wasser
    const C = S * 2;
    if (C * z > 14) {
      c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = Math.max(1, S * z * 0.08); c.beginPath();
      cells(v, C, (ix, iy) => {
        if (hash(ix, iy, 81) > 0.35) return;
        const x = (ix + hash(ix, iy, 82)) * C, y = (iy + hash(iy, ix, 83)) * C;
        if (fbm(x / (S * 9), y / (S * 9), 21) > 0.48) return;
        const X = sx(x) + Math.sin(time * 1.2 + ix) * S * z * 0.15, Y = sy(y), r = S * z * 0.35;
        c.moveTo(X - r * 1.4, Y); c.quadraticCurveTo(X - r * 0.7, Y - r * 0.6, X, Y); c.quadraticCurveTo(X + r * 0.7, Y - r * 0.6, X + r * 1.4, Y);
      });
      c.stroke();
    }
    // Wolken mit Schatten (ziehen langsam)
    const CC = S * 16;
    cells({ x0: v.x0 - CC, x1: v.x1 + CC, y0: v.y0 - CC, y1: v.y1 + CC }, CC, (ix, iy) => {
      if (hash(ix, iy, 91) > 0.45) return;
      const drift = (time * S * 0.15) % CC;
      const x = (ix + hash(ix, iy, 92)) * CC + drift, y = (iy + hash(iy, ix, 93)) * CC;
      const r = S * (2.2 + hash(ix, iy, 94) * 2) * z;
      for (const [dx, dy, s, col] of [[r * 0.5, r * 0.6, 1, 'rgba(0,30,60,0.12)'], [0, 0, 1, 'rgba(255,255,255,0.75)']]) {
        c.fillStyle = col; c.beginPath();
        for (let i = 0; i < 5; i++) { const a = i * 1.3; c.moveTo(sx(x) + dx + Math.cos(a) * r * 0.7 + r * 0.55, sy(y) + dy + Math.sin(a) * r * 0.3); c.arc(sx(x) + dx + Math.cos(a) * r * 0.7, sy(y) + dy + Math.sin(a) * r * 0.3, r * 0.55, 0, TAU); }
        c.fill();
      }
    });
  },

  // ---------------- Dimensionen: fremde Landschaften in den Farben der Welt, mit Sternen
  dimension(k) {
    const { c, sx, sy, z, v, S, world, time } = k, pal = world.pal || [world.bg, world.bg2, world.accent, world.bg2, world.accent, '#ffffff'];
    drawSpace(c, k.g, k.W, k.H, z, world, time);
    cached(k, 'dim', kk => {
      terrain(kk, S * 10, 70 + (world.minRadius % 97), [
        { t: 0.46, color: pal[3], rim: shadeHex(pal[3], -0.35) },
        { t: 0.58, color: pal[4], rim: shadeHex(pal[4], -0.35) },
        { t: 0.7, color: pal[5], rim: shadeHex(pal[5], -0.3) },
        { t: 0.0, t2: 0.22, color: shadeHex(pal[2], -0.2), rim: shadeHex(pal[2], -0.5) },
      ]);
      // schwebende Splitter auf den Inseln
      const C = S * 2.2;
      if (C * kk.z > 12) cells(kk.v, C, (ix, iy) => {
        if (hash(ix, iy, 77) > 0.18) return;
        const x = (ix + hash(ix, iy, 78)) * C, y = (iy + hash(iy, ix, 79)) * C;
        if (fbm(x / (S * 10), y / (S * 10), 70 + (world.minRadius % 97)) < 0.5) return;
        const X = kk.sx(x), Y = kk.sy(y), u = S * kk.z * 0.35;
        kk.c.globalAlpha = 0.55; kk.c.fillStyle = pal[2]; kk.c.beginPath(); kk.c.moveTo(X, Y - u * 1.4); kk.c.lineTo(X + u * 0.5, Y); kk.c.lineTo(X, Y + u * 0.4); kk.c.lineTo(X - u * 0.5, Y); kk.c.closePath(); kk.c.fill();
        kk.c.fillStyle = 'rgba(255,255,255,0.45)'; kk.c.beginPath(); kk.c.moveTo(X, Y - u * 1.4); kk.c.lineTo(X - u * 0.5, Y); kk.c.lineTo(X, Y); kk.c.closePath(); kk.c.fill(); kk.c.globalAlpha = 1;
      });
    });
  },

  // ---------------- Höllenschlund (Welt 50): Obsidian, Asche, Lavaflüsse, aufsteigende Glut
  hell(k) {
    const { c, S, W, H, time } = k;
    c.fillStyle = '#1e0a06'; c.fillRect(0, 0, W, H);
    cached(k, 'hell', kk => terrain(kk, S * 9, 666, [
      { t: 0.42, color: '#2e120c', rim: '#140604' },               // Asche
      { t: 0.62, color: '#140806', rim: '#000000' },               // Obsidian-Platten
      { t: 0.0, t2: 0.3, color: '#ff5a1f', rim: '#7a1a05' },       // Lava
      { t: 0.0, t2: 0.22, color: '#ffb13d' },                      // heiße Lava-Mitte
    ]));
    // pulsierendes Glühen + aufsteigende Glut (bildschirmfest, nur Deko)
    c.fillStyle = `rgba(255,70,20,${0.05 + Math.sin(time * 2) * 0.03})`; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const x = (Math.sin(i * 12.9898) * 0.5 + 0.5) * W, sp = 20 + (i % 7) * 8;
      const y = H - ((time * sp + i * 97) % (H + 40));
      c.fillStyle = i % 3 ? 'rgba(255,140,40,0.7)' : 'rgba(255,220,80,0.8)';
      c.fillRect(x + Math.sin(time + i) * 10, y, 2 + (i % 3), 2 + (i % 3));
    }
  },

  // ---------------- Weltall
  space(k) { drawSpace(k.c, k.g, k.W, k.H, k.z, k.world, k.time); },

  // ---------------- Prärie: Ranch-Weiden mit Zäunen, Wagenwege, flache Steppe (keine Deko-Steine!)
  sand(k) {
    const { c, sx, sy, z, v, S, W, H } = k;
    if (!k.skipTerrain) cached(k, 'sand', kk => terrain(kk, S * 8, 31, [{ t: 0.6, color: '#d9b770' }, { t: 0.0, t2: 0.3, color: '#ead39a' }]));
    const B = S * 16, Rw = S * 2.2;
    const bx0 = Math.floor(v.x0 / B), bx1 = Math.ceil(v.x1 / B), by0 = Math.floor(v.y0 / B), by1 = Math.ceil(v.y1 / B);
    // Wagenwege (flache, hellere Bänder mit Radspuren)
    c.fillStyle = '#ecd9a6';
    for (let ix = bx0; ix <= bx1; ix++) c.fillRect(sx(ix * B) - Rw * z / 2, 0, Rw * z, H);
    for (let iy = by0; iy <= by1; iy++) c.fillRect(0, sy(iy * B) - Rw * z / 2, W, Rw * z);
    c.strokeStyle = 'rgba(140,100,50,0.25)'; c.lineWidth = Math.max(1, S * z * 0.1); c.beginPath();
    for (let ix = bx0; ix <= bx1; ix++) for (const o of [-0.4, 0.4]) { c.moveTo(sx(ix * B + Rw * o), 0); c.lineTo(sx(ix * B + Rw * o), H); }
    for (let iy = by0; iy <= by1; iy++) for (const o of [-0.4, 0.4]) { c.moveTo(0, sy(iy * B + Rw * o)); c.lineTo(W, sy(iy * B + Rw * o)); }
    c.stroke();
    for (let ix = bx0; ix <= bx1; ix++) for (let iy = by0; iy <= by1; iy++) {
      const h = hash(ix, iy, 501), x = ix * B + Rw, y = iy * B + Rw, w = B - Rw * 2;
      if (h < 0.55) { // eingezäunte Weide mit etwas grünerem Gras
        c.fillStyle = 'rgba(160,170,80,0.35)'; c.fillRect(sx(x + S * 0.3), sy(y + S * 0.3), (w - S * 0.6) * z, (w - S * 0.6) * z);
        c.strokeStyle = '#9a6a3a'; c.lineWidth = Math.max(1.5, S * z * 0.12);
        c.strokeRect(sx(x), sy(y), w * z, w * z);
        if (S * z * 6 > 30) { c.fillStyle = '#7a4e2a'; for (let q = 0; q <= 8; q++) for (const [px, py] of [[x + w * q / 8, y], [x + w * q / 8, y + w], [x, y + w * q / 8], [x + w, y + w * q / 8]]) c.fillRect(sx(px) - 2, sy(py) - 2, 4, 4); }
      } else if (h < 0.7) { // Wasserloch (flach)
        c.fillStyle = '#c9a35a'; c.beginPath(); c.ellipse(sx(x + w * 0.5), sy(y + w * 0.5), w * 0.22 * z, w * 0.14 * z, 0, 0, TAU); c.fill();
        c.fillStyle = '#6fb6d9'; c.beginPath(); c.ellipse(sx(x + w * 0.5), sy(y + w * 0.5), w * 0.17 * z, w * 0.1 * z, 0, 0, TAU); c.fill();
      }
    }
    // trockene Grasbüschel (sehr dezent, flach)
    const C = S * 3;
    if (C * z > 18) {
      c.strokeStyle = 'rgba(150,120,60,0.45)'; c.lineWidth = Math.max(1, S * z * 0.06); c.beginPath();
      cells(v, C, (ix, iy) => {
        const h = hash(ix, iy, 33); if (h > 0.35) return;
        const X = sx((ix + hash(iy, ix, 34)) * C), Y = sy((iy + hash(ix, iy, 35)) * C), u = S * z;
        for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.35; c.moveTo(X, Y); c.lineTo(X + Math.cos(a) * u * 0.35, Y + Math.sin(a) * u * 0.35); }
      });
      c.stroke();
    }
  },

  // ---------------- Westernstadt: Lehmstraßen mit Holz-Gehwegen
  town(k) {
    streetGrid(k, {
      block: 12, road: 3, walk: 0.9, asphalt: '#b8875a', curb: '#6a4220', walkCol: '#9a6638', center: null,
      lot(k, x, y, w, h) {
        const { c, sx, sy, z, S } = k;
        c.fillStyle = '#e0c088'; c.fillRect(sx(x), sy(y), w * z, w * z);
        c.strokeStyle = 'rgba(120,80,40,0.25)'; c.lineWidth = 1; c.beginPath();
        for (let t = 0; t < w; t += S * 0.9) { c.moveTo(sx(x), sy(y + t)); c.lineTo(sx(x + w), sy(y + t)); }
        c.stroke();
        if (h < 0.4) { c.fillStyle = '#c9a35a'; c.beginPath(); c.ellipse(sx(x + w * 0.5), sy(y + w * 0.5), w * 0.3 * z, w * 0.2 * z, 0, 0, TAU); c.fill(); }
      },
    });
    // Planken-Linien auf den Holzgehwegen + Wagenspuren
    const { c, sx, sy, z, v, S } = k;
    c.strokeStyle = 'rgba(60,30,10,0.35)'; c.lineWidth = Math.max(1, S * z * 0.06); c.beginPath();
    const B = S * 12;
    for (let ix = Math.floor(v.x0 / B); ix <= Math.ceil(v.x1 / B); ix++) for (const off of [-S * 0.6, S * 0.6]) { c.moveTo(sx(ix * B + off), 0); c.lineTo(sx(ix * B + off), k.H); }
    for (let iy = Math.floor(v.y0 / B); iy <= Math.ceil(v.y1 / B); iy++) for (const off of [-S * 0.6, S * 0.6]) { c.moveTo(0, sy(iy * B + off)); c.lineTo(k.W, sy(iy * B + off)); }
    c.stroke();
  },

  // ---------------- Canyon: Gesteinsschichten, Fluss
  canyon(k) {
    cached(k, 'canyon', kk => terrain(kk, k.S * 9, 41, [
      { t: 0.0, t2: 0.28, color: '#8a4a2a' },                 // Schlucht
      { t: 0.0, t2: 0.22, color: '#4fa3c9', rim: '#3a86ab' }, // Fluss
      { t: 0.5, color: '#e0965a', rim: '#b8693a' },
      { t: 0.62, color: '#eaa66a', rim: '#a8552a' },          // Mesa-Plateau mit Kante
      { t: 0.76, color: '#f0b47a', rim: '#b85a2a' },
    ]));
    // Flussufer-Kiesel als flache Punkte (keine Steine, die wie Objekte aussehen)
  },

  // ---------------- Zuckerwiese: Zuckerguss-Fliesen, Schoko-Bach (keine Streusel – die sind Objekte!)
  candy(k) {
    const { c, sx, sy, z, v, S, W, H } = k;
    const T = S * 4;
    if (T * z > 8) {
      c.fillStyle = '#ffb6d6';
      cells(v, T, (ix, iy) => { if ((ix + iy) & 1) c.fillRect(sx(ix * T), sy(iy * T), T * z + 1, T * z + 1); });
      c.fillStyle = 'rgba(255,255,255,0.35)';
      cells(v, T, (ix, iy) => { c.beginPath(); c.arc(sx((ix + 0.5) * T), sy((iy + 0.5) * T), T * z * 0.12, 0, TAU); c.fill(); });
    }
    cached(k, 'candy', kk => terrain(kk, S * 9, 51, [{ t: 0.66, color: '#ffffff', rim: '#ffd0e6' }, { t: 0.0, t2: 0.24, color: '#8a4a2a', rim: '#6a3418' }]));
  },

  // ---------------- Bonbonstadt
  candytown(k) {
    streetGrid(k, {
      block: 12, road: 2.6, walk: 0.9, asphalt: '#ff9ac8', curb: '#ffffff', walkCol: '#fff0f6', center: '#ffffff', zebra: 'rgba(255,255,255,0.9)',
      lot(k, x, y, w, h, ix, iy) { // Minz-Rasen mit Zuckerstangen-Beeteinfassung (flach)
        const { c, sx, sy, z, S } = k, u = S * z;
        c.fillStyle = '#b8f0d0'; c.fillRect(sx(x), sy(y), w * z, w * z);
        c.fillStyle = '#a6e6c2'; for (let i = 0; i < 6; i += 2) c.fillRect(sx(x + i * w / 6), sy(y), w / 6 * z, w * z);
        const bw = S * 0.5;
        for (let i = 0; i < 12; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#ff6fa8'; c.fillRect(sx(x + i * w / 12), sy(y), w / 12 * z + 1, bw * z); c.fillRect(sx(x + i * w / 12), sy(y + w - bw), w / 12 * z + 1, bw * z); }
        if (h < 0.4) { c.fillStyle = '#ffe6a0'; c.beginPath(); c.ellipse(sx(x + w / 2), sy(y + w / 2), w * 0.2 * z, w * 0.14 * z, 0, 0, TAU); c.fill(); c.fillStyle = '#c98a4a'; c.beginPath(); c.ellipse(sx(x + w / 2), sy(y + w / 2), w * 0.15 * z, w * 0.09 * z, 0, 0, TAU); c.fill(); }
      },
    });
  },

  // ---------------- Schokogebirge
  choco(k) {
    const { c, sx, sy, z, v, S } = k;
    cached(k, 'choco', kk => terrain(kk, S * 9, 61, [{ t: 0.0, t2: 0.3, color: '#d9933a', rim: '#b8732a' }, { t: 0.0, t2: 0.24, color: '#f0b04a' }, { t: 0.55, color: '#6a3a22', rim: '#4a2614' }, { t: 0.68, color: '#4a2614', rim: '#2e160a' }, { t: 0.8, color: '#f6e6d0', rim: '#d0b89a' }]));
    const C = S * 2.5;
    if (C * z > 16) {
      c.strokeStyle = 'rgba(0,0,0,0.13)'; c.lineWidth = Math.max(1.5, S * z * 0.1); c.beginPath();
      cells(v, C, (ix, iy) => { c.rect(sx(ix * C + S * 0.15), sy(iy * C + S * 0.15), (C - S * 0.3) * z, (C - S * 0.3) * z); });
      c.stroke();
    }
  },
};
GROUNDS.rock = GROUNDS.alpine;

let spaceTex = null;
// Eigenes Motiv je Weltraum-Welt (einmal in die Hintergrund-Textur gemalt, nahtlos kachelbar)
function spaceTheme(o, world, w, h) {
  let seed = 7; for (const ch of world.id) seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const wrap = (fn) => { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { o.save(); o.translate(dx, dy); fn(); o.restore(); } };
  const m = Math.min(w, h);
  switch (world.id) {
    case 'planet': { // Erdorbit: großer Erdrand mit Atmosphäre und Wolken
      wrap(() => {
        const X = w * 0.18, Y = h * 1.25, R = m * 0.95;
        const at = o.createRadialGradient(X, Y, R * 0.96, X, Y, R * 1.12); at.addColorStop(0, 'rgba(120,200,255,0.55)'); at.addColorStop(1, 'rgba(120,200,255,0)');
        o.fillStyle = at; o.beginPath(); o.arc(X, Y, R * 1.12, 0, TAU); o.fill();
        const gr = o.createRadialGradient(X + R * 0.3, Y - R * 0.6, R * 0.1, X, Y, R); gr.addColorStop(0, '#3a8ad8'); gr.addColorStop(1, '#0d2a5a');
        o.fillStyle = gr; o.beginPath(); o.arc(X, Y, R, 0, TAU); o.fill();
        o.save(); o.beginPath(); o.arc(X, Y, R, 0, TAU); o.clip();
        o.fillStyle = 'rgba(70,150,80,0.75)'; for (let i = 0; i < 6; i++) { o.beginPath(); o.ellipse(X - R * 0.2 + rnd() * R * 0.9, Y - R * (0.75 + rnd() * 0.2), R * (0.06 + rnd() * 0.12), R * (0.03 + rnd() * 0.05), rnd() * 3, 0, TAU); o.fill(); }
        o.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 8; i++) { o.beginPath(); o.ellipse(X - R * 0.3 + rnd() * R, Y - R * (0.8 + rnd() * 0.18), R * (0.08 + rnd() * 0.1), R * 0.015, rnd() * 0.4, 0, TAU); o.fill(); }
        o.restore();
      });
      break;
    }
    case 'solar': { // Sonnensystem: glühende Sonne in der Ecke, Umlaufbahnen
      wrap(() => {
        const X = w * 0.85, Y = h * 0.2;
        const sg = o.createRadialGradient(X, Y, 0, X, Y, m * 0.55); sg.addColorStop(0, 'rgba(255,240,180,0.9)'); sg.addColorStop(0.12, 'rgba(255,190,60,0.75)'); sg.addColorStop(0.4, 'rgba(255,110,30,0.2)'); sg.addColorStop(1, 'rgba(255,80,20,0)');
        o.fillStyle = sg; o.beginPath(); o.arc(X, Y, m * 0.55, 0, TAU); o.fill();
        o.strokeStyle = 'rgba(255,210,120,0.14)'; o.lineWidth = 1;
        for (let i = 1; i < 6; i++) { o.beginPath(); o.ellipse(X, Y, m * 0.18 * i, m * 0.11 * i, -0.3, 0, TAU); o.stroke(); }
        o.fillStyle = 'rgba(200,170,140,0.5)'; for (let i = 0; i < 70; i++) { const a = rnd() * TAU, r = m * (0.6 + rnd() * 0.08); o.fillRect(X + Math.cos(a - 0.3) * r, Y + Math.sin(a) * r * 0.61, 1.2, 1.2); }
      });
      break;
    }
    case 'galaxy': { // Milchstraße: helles, diagonales Sternenband mit Staubwolken
      wrap(() => {
        o.save(); o.translate(w / 2, h / 2); o.rotate(-0.45);
        const bg = o.createLinearGradient(0, -m * 0.3, 0, m * 0.3); bg.addColorStop(0, 'rgba(176,107,255,0)'); bg.addColorStop(0.5, 'rgba(230,200,255,0.35)'); bg.addColorStop(1, 'rgba(176,107,255,0)');
        o.fillStyle = bg; o.fillRect(-w, -m * 0.3, w * 2, m * 0.6);
        o.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 260; i++) { const y = (rnd() + rnd() + rnd() - 1.5) * m * 0.16; o.fillRect((rnd() - 0.5) * w * 2, y, rnd() < 0.1 ? 1.6 : 0.8, rnd() < 0.1 ? 1.6 : 0.8); }
        o.fillStyle = 'rgba(40,10,60,0.45)'; for (let i = 0; i < 10; i++) { o.beginPath(); o.ellipse((rnd() - 0.5) * w * 1.6, (rnd() - 0.5) * m * 0.12, m * (0.08 + rnd() * 0.12), m * 0.02, 0, 0, TAU); o.fill(); }
        o.restore();
      });
      break;
    }
    case 'supercluster': { // Galaxienhaufen: viele kleine Spiralgalaxien
      for (let i = 0; i < 26; i++) {
        const X = rnd() * w, Y = rnd() * h, R = m * (0.015 + rnd() * 0.04), rot = rnd() * TAU, col = rnd() < 0.5 ? '160,240,255' : '255,220,170';
        wrap(() => {
          o.save(); o.translate(X, Y); o.rotate(rot); o.scale(1, 0.45 + rnd() * 0.4);
          const gg = o.createRadialGradient(0, 0, 0, 0, 0, R * 2); gg.addColorStop(0, `rgba(${col},0.9)`); gg.addColorStop(0.25, `rgba(${col},0.35)`); gg.addColorStop(1, `rgba(${col},0)`);
          o.fillStyle = gg; o.beginPath(); o.arc(0, 0, R * 2, 0, TAU); o.fill();
          o.strokeStyle = `rgba(${col},0.35)`; o.lineWidth = Math.max(0.6, R * 0.15);
          for (let k = 0; k < 2; k++) { o.beginPath(); for (let a = 0; a < 5; a += 0.2) { const r = R * 0.2 + a * R * 0.32; const x = Math.cos(a + k * Math.PI) * r, y = Math.sin(a + k * Math.PI) * r; a ? o.lineTo(x, y) : o.moveTo(x, y); } o.stroke(); }
          o.restore();
        });
      }
      break;
    }
    case 'universe': { // Kosmisches Netz: leuchtende Filamente zwischen Knoten
      const nodes = []; for (let i = 0; i < 22; i++) nodes.push([rnd() * w, rnd() * h, 0.5 + rnd()]);
      wrap(() => {
        for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
          const [x1, y1] = nodes[i], [x2, y2] = nodes[j], d = Math.hypot(x2 - x1, y2 - y1);
          if (d > m * 0.42) continue;
          o.strokeStyle = `rgba(255,120,200,${0.32 * (1 - d / (m * 0.42))})`; o.lineWidth = 2.2; o.beginPath(); o.moveTo(x1, y1); o.quadraticCurveTo((x1 + x2) / 2 + (y2 - y1) * 0.15, (y1 + y2) / 2 - (x2 - x1) * 0.15, x2, y2); o.stroke();
          o.strokeStyle = `rgba(160,220,255,${0.25 * (1 - d / (m * 0.42))})`; o.lineWidth = 0.8; o.stroke();
        }
        for (const [x, y, k] of nodes) { const ng = o.createRadialGradient(x, y, 0, x, y, m * 0.05 * k); ng.addColorStop(0, 'rgba(255,230,250,0.9)'); ng.addColorStop(0.3, 'rgba(255,80,180,0.4)'); ng.addColorStop(1, 'rgba(255,80,180,0)'); o.fillStyle = ng; o.beginPath(); o.arc(x, y, m * 0.05 * k, 0, TAU); o.fill(); }
      });
      break;
    }
    case 'multiverse': { // Multiversum: schillernde Universums-Blasen
      for (let i = 0; i < 10; i++) {
        const X = rnd() * w, Y = rnd() * h, R = m * (0.06 + rnd() * 0.16), hue = Math.floor(rnd() * 360);
        wrap(() => {
          // Universums-Blase: dunkles Inneres mit eigenem Farbnebel, leuchtender Rand
          const bg2 = o.createRadialGradient(X - R * 0.3, Y - R * 0.3, R * 0.1, X, Y, R); bg2.addColorStop(0, `hsla(${hue},85%,55%,0.22)`); bg2.addColorStop(0.7, `hsla(${hue},80%,30%,0.16)`); bg2.addColorStop(1, `hsla(${(hue + 60) % 360},95%,65%,0.35)`);
          o.fillStyle = bg2; o.beginPath(); o.arc(X, Y, R, 0, TAU); o.fill();
          o.strokeStyle = `hsla(${(hue + 120) % 360},95%,70%,0.4)`; o.lineWidth = 1.5; o.stroke();
          o.fillStyle = 'rgba(255,255,255,0.8)'; for (let k = 0; k < 6; k++) o.fillRect(X + (rnd() - 0.5) * R * 1.2, Y + (rnd() - 0.5) * R * 1.2, 1.2, 1.2);
          o.fillStyle = 'rgba(255,255,255,0.5)'; o.beginPath(); o.ellipse(X - R * 0.4, Y - R * 0.45, R * 0.18, R * 0.08, -0.6, 0, TAU); o.fill();
        });
      }
      break;
    }
  }
}

function drawSpace(c, g, W, H, z, world, time) {
  const cam = g.cam;
  // Nebel-Hintergrund einmal pro Welt vorzeichnen
  const key = world.id + W + 'x' + H;
  if (!spaceTex || spaceTex.key !== key) {
    const cv = document.createElement('canvas'); cv.width = Math.ceil(W * 0.5); cv.height = Math.ceil(H * 0.5);
    const o = cv.getContext('2d'); o.fillStyle = world.bg; o.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < 5; i++) {
      const x = (Math.sin(i * 3.3 + world.id.length) * 0.5 + 0.5) * cv.width, y = (Math.cos(i * 2.1 + world.id.length) * 0.5 + 0.5) * cv.height;
      const gr = o.createRadialGradient(x, y, 0, x, y, Math.max(cv.width, cv.height) * (0.3 + i * 0.07));
      gr.addColorStop(0, (i % 2 ? world.accent : world.bg2) + '66'); gr.addColorStop(1, world.bg2 + '00');
      o.fillStyle = gr; o.fillRect(0, 0, cv.width, cv.height);
    }
    spaceTheme(o, world, cv.width, cv.height);
    spaceTex = { key, cv };
  }
  const px = ((-cam.x * z * 0.01) % W + W) % W, py = ((-cam.y * z * 0.01) % H + H) % H;
  for (const [ox, oy] of [[0, 0], [-W, 0], [0, -H], [-W, -H]]) c.drawImage(spaceTex.cv, px + ox, py + oy, W, H);
  for (const s of STARS) {
    const x = ((s.x * W - cam.x * z * s.p * 0.02) % W + W) % W;
    const y = ((s.y * H - cam.y * z * s.p * 0.02) % H + H) % H;
    const tw = 0.35 + s.p + Math.sin(time * 2 + s.tw) * 0.2;
    c.globalAlpha = Math.max(0, Math.min(1, tw));
    c.fillStyle = '#ffffff'; c.fillRect(x, y, s.s, s.s);
    if (s.s > 1.9) { c.fillRect(x - s.s * 1.5, y + s.s * 0.4, s.s * 4, 0.6); c.fillRect(x + s.s * 0.4, y - s.s * 1.5, 0.6, s.s * 4); }
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

  const PF = typeof window !== 'undefined' && window.__prof; let pt = PF ? performance.now() : 0;
  const lap = n => { if (!PF) return; const t2 = performance.now(); PF[n] = (PF[n] || 0) + t2 - pt; if (t2 - pt > 60) (PF.spikes = PF.spikes || []).push(n + '@' + world.name + ':' + (t2 - pt).toFixed(0)); pt = t2; };
  const SK = typeof window !== 'undefined' && window.__skip || {};
  if (SK.boden) { c.fillStyle = world.bg; c.fillRect(0, 0, W, H); } else drawGround(c, g, W, H, sx, sy, z, world, time); lap('boden');

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

  // Skill-Effekte am Boden: Lava, Singularität
  for (const L of g.lava || []) {
    const a = Math.min(1, L.life / 1.5);
    c.fillStyle = `rgba(255,90,20,${0.55 * a})`; c.beginPath(); c.ellipse(sx(L.x), sy(L.y), L.r * z, L.r * z * 0.55, 0, 0, TAU); c.fill();
    c.fillStyle = `rgba(255,210,63,${0.5 * a})`; c.beginPath(); c.ellipse(sx(L.x), sy(L.y), L.r * z * 0.55, L.r * z * 0.3, 0, 0, TAU); c.fill();
  }
  if (g.singularity) {
    const s2 = g.singularity, X = sx(s2.x), Y = sy(s2.y), R = p.r * z * 1.3;
    const gr = c.createRadialGradient(X, Y, R * 0.3, X, Y, R * 3); gr.addColorStop(0, '#000'); gr.addColorStop(0.3, '#000'); gr.addColorStop(0.45, '#ffb13d'); gr.addColorStop(0.7, 'rgba(176,107,255,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.beginPath(); c.ellipse(X, Y, R * 3, R * 1.8, time * 2, 0, TAU); c.fill();
  }

  // Magnet-Reichweite (nur wenn Magnet gelevelt)
  if (g.stats.magnet > 0 && g.state === 'play') {
    const R = g.magnetRange() * z;
    c.strokeStyle = g.stats.hole ? 'rgba(190,130,255,0.32)' : 'rgba(255,220,90,0.18)'; c.lineWidth = 2; c.setLineDash([6, 8]);
    c.beginPath(); c.ellipse(sx(p.x), sy(p.y), R, R * 0.55, 0, 0, TAU); c.stroke(); c.setLineDash([]);
  }

  lap('bodenfx');
  // ---- Objekte + Monster, nach Tiefe sortiert
  const limit = g.breakLimit();
  const drawList = [];
  for (const o of g.objects) {
    const X = sx(o.x), Y = sy(o.y), R = o.size * z;
    if (X < -R * 2.5 || X > W + R * 2.5 || Y < -R * 2.5 || Y > H + R * 2.5) continue;
    drawList.push(o);
  }
  drawList.push(null); // Platzhalter für das Monster
  if (g.boss) drawList.push(BOSS_TOKEN);
  const yOf = o => o === null ? p.y : o === BOSS_TOKEN ? g.boss.y : o.y;
  drawList.sort((a, b) => yOf(a) - yOf(b));
  drawBossFloor(c, g, sx, sy, z, time);
  const hasFilter = 'filter' in c;
  for (const o of drawList) {
    if (o === null) { if (g.state !== 'dying' && g.state !== 'over' && !SK.player) drawPlayer(c, g, sx(p.x), sy(p.y), g.hr() * z, time); continue; }
    if (o === BOSS_TOKEN) { drawBoss(c, g, sx, sy, z, time); continue; }
    if (!SK.objekte) drawObject(c, g, o, sx(o.x), sy(o.y), o.size * z, limit, time, hasFilter);
  }

  lap('objekte');
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

  // Stacheln, Raketen, Tentakel
  c.strokeStyle = '#f2e6c8'; c.lineWidth = Math.max(2, p.r * z * 0.12);
  for (const sp of g.spikes || []) { c.beginPath(); c.moveTo(sx(sp.x), sy(sp.y) - p.r * z); c.lineTo(sx(sp.x - sp.vx * p.r * 0.8), sy(sp.y - sp.vy * p.r * 0.8) - p.r * z); c.stroke(); }
  for (const rk of g.rockets || []) {
    const k = Math.min(1, rk.t / rk.dur), X = sx(rk.x + (rk.tx - rk.x) * k), Y = sy(rk.y + (rk.ty - rk.y) * k) - Math.sin(k * Math.PI) * 80;
    c.fillStyle = '#d0d4dc'; c.beginPath(); c.arc(X, Y, Math.max(3, p.r * z * 0.15), 0, TAU); c.fill();
    c.fillStyle = '#ff8a1f'; c.beginPath(); c.arc(X - 4, Y + 3, Math.max(2, p.r * z * 0.1), 0, TAU); c.fill();
  }
  c.strokeStyle = '#7fffe0'; c.lineWidth = Math.max(3, p.r * z * 0.2);
  for (const f of g.grabFx || []) { c.globalAlpha = f.life / 0.4; c.beginPath(); c.moveTo(sx(p.x), sy(p.y) - p.r * z); c.quadraticCurveTo(sx((p.x + f.x) / 2), sy((p.y + f.y) / 2) - p.r * z * 3, sx(f.x), sy(f.y)); c.stroke(); }
  c.globalAlpha = 1;

  lap('truemmer_muenzen');
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

  lap('puffs_partikel');
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
  lap('texte');
  drawOverlays(c, g, W, H, time); lap('overlays');
}

// ---------------------------------------------------------------------
// ENDBOSS ZORNOS
// ---------------------------------------------------------------------
const BOSS_TOKEN = { boss: true };
const BOSS_CHAR = { type: 'monster', colors: { body: '#5a0a0a', belly: '#ff6a1f', horn: '#1a0505', dark: '#000000' } };
function drawBossFloor(c, g, sx, sy, z, time) {
  if (!g.boss && !(g.bossShots && g.bossShots.length)) return;
  const b = g.boss, p = g.p;
  // Warnlinie vor dem Sturmangriff
  if (b && b.windup > 0) {
    const len = b.size * 9, a = Math.min(1, (0.8 - b.windup) / 0.8);
    c.strokeStyle = `rgba(255,40,20,${0.25 + 0.5 * Math.abs(Math.sin(time * 18))})`; c.lineWidth = b.size * z * 1.2 * a;
    c.beginPath(); c.moveTo(sx(b.x), sy(b.y)); c.lineTo(sx(b.x + b.chargeX * len), sy(b.y + b.chargeY * len)); c.stroke();
  }
  for (const sh of g.bossShots || []) {
    if (sh.kind === 'ring') {
      c.strokeStyle = 'rgba(255,90,20,0.85)'; c.lineWidth = Math.max(4, p.r * z * 0.9);
      c.beginPath(); c.ellipse(sx(sh.x), sy(sh.y), sh.r * z, sh.r * z * 0.6, 0, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = 'rgba(255,220,80,0.9)'; c.lineWidth = Math.max(2, p.r * z * 0.3); c.stroke();
    } else if (sh.kind === 'meteor') {
      const k = Math.max(0, 1 - sh.t / 1.1);
      c.fillStyle = `rgba(80,0,0,${0.2 + k * 0.4})`; c.beginPath(); c.ellipse(sx(sh.x), sy(sh.y), sh.r * z, sh.r * z * 0.6, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,60,30,0.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(sx(sh.x), sy(sh.y), sh.r * z * k, sh.r * z * 0.6 * k, 0, 0, Math.PI * 2); c.stroke();
      const fy = sy(sh.y) - (1 - k) * 600;
      c.fillStyle = '#ffb13d'; c.beginPath(); c.arc(sx(sh.x), fy, Math.max(5, p.r * z * 0.5), 0, Math.PI * 2); c.fill();
    }
  }
}
function drawBoss(c, g, sx, sy, z, time) {
  const b = g.boss, X = sx(b.x), Y = sy(b.y), R = b.size * z;
  c.save();
  if (b.flash > 0) c.globalAlpha = 0.75 + 0.25 * Math.sin(time * 60);
  drawMonster(c, X, Y, R, { char: BOSS_CHAR, stage: 9, face: b.face, walk: b.walk, punchT: b.punchT, punchX: 1, punchY: 0, hurtT: b.flash * 0.3,
    berserk: b.hp < 0.3 || b.charge > 0, squash: b.hitAnim * 0.6, time, lookX: b.face, lookY: 0, slamT: b.windup > 0 ? 0.3 : 0 });
  c.restore();
  // Krone aus Flammen
  for (let i = 0; i < 5; i++) { const a = time * 4 + i * 1.3; c.fillStyle = i % 2 ? '#ffd23f' : '#ff6a1f'; c.beginPath(); c.arc(X + Math.cos(a) * R * 0.5, Y - R * 2.3 - Math.abs(Math.sin(a)) * R * 0.3, R * 0.1, 0, Math.PI * 2); c.fill(); }
  // Feuerbälle
  for (const sh of g.bossShots || []) if (sh.kind === 'fireball') {
    const gx = sx(sh.x), gy = sy(sh.y), r = sh.r * z;
    const gr = c.createRadialGradient(gx, gy, 0, gx, gy, r * 1.6); gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.4, '#ff8a1f'); gr.addColorStop(1, 'rgba(255,60,20,0)');
    c.fillStyle = gr; c.beginPath(); c.arc(gx, gy, r * 1.6, 0, Math.PI * 2); c.fill();
  }
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
  // Auftrags-Ziel markieren (kleiner gelber Pfeil)
  if (g.quest && g.quest.type === 'kill' && o.name === g.quest.target && R > 3) {
    const by = Y - (centered ? R * 1.2 : R * 1.75) - 14 + Math.sin(time * 6 + o.seed * 5) * 3, s = Math.max(6, Math.min(11, R * 0.3));
    c.fillStyle = '#ffd23f'; c.strokeStyle = '#3a1d00'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(X, by + s); c.lineTo(X - s, by - s * 0.4); c.lineTo(X + s, by - s * 0.4); c.closePath(); c.fill(); c.stroke();
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
    skin: g.save && g.save.skinSel ? g.save.skinSel[g.char.id] : null,
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
  if (g.freezeT > 0) { c.fillStyle = `rgba(150,220,255,${Math.min(0.28, g.freezeT * 0.1)})`; c.fillRect(0, 0, W, H); }
  if (p.roarT > 0) { c.strokeStyle = `rgba(255,210,63,${0.3 + Math.sin(time * 10) * 0.1})`; c.lineWidth = 10; c.strokeRect(5, 5, W - 10, H - 10); }
  if (g.flash > 0) { c.fillStyle = `rgba(255,250,235,${g.flash * 0.55})`; c.fillRect(0, 0, W, H); }
}

// Vorschau eines Monsters (Menü, Monster-Auswahl)
export function drawMonsterPreview(canvas, char, stage, time, locked, skin = null) {
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  c.clearRect(0, 0, W, H);
  const R = Math.min(W, H) * 0.29;
  drawMonster(c, W / 2, H * 0.86, R, {
    char, stage, face: 1, walk: time * 1.5, punchT: (time % 2.2) < 0.18 ? 0.15 : 0, punchX: 1, punchY: 0, hurtT: 0, berserk: false,
    squash: 0, time, lookX: 1, lookY: 0, slamT: 0, skin,
  });
  if (locked) { // geheimnisvolle Silhouette
    c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(18,8,10,0.92)'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = `${Math.round(H * 0.22)}px "Lilita One", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', W / 2, H * 0.55);
  }
}
