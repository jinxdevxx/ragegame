// =====================================================================
//  RAGEVERSE – Zeichnen (Canvas 2D)
//  Jede Objekt-Form wird im Einheitskreis (Radius 1) gezeichnet.
// =====================================================================
import * as C from './config.js';

const TAU = Math.PI * 2;

function shade(hex, amt) {
  // amt -1..1 → dunkler/heller
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }

const SHAPES = {
  blade(ctx, o) {
    ctx.fillStyle = o.color;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * 0.35 - 0.15, 0.9); ctx.quadraticCurveTo(i * 0.5, 0, i * 0.4 + 0.1, -1); ctx.lineTo(i * 0.35 + 0.15, 0.9); ctx.fill();
    }
  },
  flower(ctx, o) {
    ctx.fillStyle = o.color;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; circle(ctx, Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.42); }
    ctx.fillStyle = '#ffd23f'; circle(ctx, 0, 0, 0.38);
  },
  mushroom(ctx, o) {
    ctx.fillStyle = '#f3e6cf'; rrect(ctx, -0.28, -0.1, 0.56, 1, 0.15);
    ctx.fillStyle = o.color; ctx.beginPath(); ctx.ellipse(0, -0.15, 1, 0.75, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#fff'; circle(ctx, -0.4, -0.45, 0.14); circle(ctx, 0.3, -0.6, 0.12); circle(ctx, 0.55, -0.3, 0.1);
  },
  gnome(ctx, o) {
    ctx.fillStyle = o.color; circle(ctx, 0, 0.4, 0.6);
    ctx.fillStyle = '#f2c9a0'; circle(ctx, 0, -0.05, 0.32);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-0.32, 0.05); ctx.quadraticCurveTo(0, 0.75, 0.32, 0.05); ctx.fill();
    ctx.fillStyle = '#e23b3b'; ctx.beginPath(); ctx.moveTo(-0.38, -0.15); ctx.lineTo(0.1, -1); ctx.lineTo(0.38, -0.15); ctx.fill();
  },
  round(ctx, o) {
    ctx.fillStyle = shade(o.color, -0.3); circle(ctx, 0, 0.08, 1);
    ctx.fillStyle = o.color; circle(ctx, 0, 0, 0.92);
    ctx.fillStyle = shade(o.color, 0.35); circle(ctx, -0.3, -0.3, 0.3);
  },
  pot(ctx, o) {
    ctx.fillStyle = o.color; ctx.beginPath(); ctx.moveTo(-0.8, -0.3); ctx.lineTo(0.8, -0.3); ctx.lineTo(0.55, 0.9); ctx.lineTo(-0.55, 0.9); ctx.fill();
    ctx.fillStyle = shade(o.color, -0.2); rrect(ctx, -0.9, -0.45, 1.8, 0.3, 0.08);
    ctx.fillStyle = '#3fa34d'; circle(ctx, -0.3, -0.65, 0.3); circle(ctx, 0.25, -0.75, 0.33); circle(ctx, 0, -0.95, 0.25);
  },
  tank(ctx, o) {
    ctx.fillStyle = shade(o.color, -0.35); rrect(ctx, -0.7, -0.95, 1.4, 1.95, 0.45);
    ctx.fillStyle = o.color; rrect(ctx, -0.62, -0.9, 1.24, 1.8, 0.4);
    ctx.fillStyle = shade(o.color, 0.3); rrect(ctx, -0.45, -0.75, 0.2, 1.3, 0.1);
    // Warnzeichen
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(0, -0.35); ctx.lineTo(0.38, 0.3); ctx.lineTo(-0.38, 0.3); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(-0.04, -0.18, 0.08, 0.28); ctx.fillRect(-0.04, 0.16, 0.08, 0.08);
  },
  box(ctx, o) {
    ctx.fillStyle = shade(o.color, -0.35); rrect(ctx, -0.85, -0.7, 1.7, 1.55, 0.12);
    ctx.fillStyle = o.color; rrect(ctx, -0.85, -0.8, 1.7, 1.45, 0.12);
    ctx.fillStyle = shade(o.color, 0.25); ctx.fillRect(-0.7, -0.65, 1.4, 0.14);
  },
  house(ctx, o) {
    ctx.fillStyle = o.color; ctx.fillRect(-0.75, -0.15, 1.5, 1);
    ctx.fillStyle = '#b8402f'; ctx.beginPath(); ctx.moveTo(-0.95, -0.1); ctx.lineTo(0, -0.95); ctx.lineTo(0.95, -0.1); ctx.fill();
    ctx.fillStyle = '#3a2a1e'; ctx.fillRect(-0.18, 0.3, 0.36, 0.55);
    ctx.fillStyle = '#9fe0ff'; ctx.fillRect(-0.6, 0.05, 0.3, 0.25); ctx.fillRect(0.3, 0.05, 0.3, 0.25);
  },
  cone(ctx, o) {
    ctx.fillStyle = o.color; ctx.beginPath(); ctx.moveTo(0, -0.95); ctx.lineTo(0.6, 0.8); ctx.lineTo(-0.6, 0.8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-0.35, 0, 0.7, 0.18);
    ctx.fillStyle = shade(o.color, -0.3); ctx.fillRect(-0.8, 0.75, 1.6, 0.2);
  },
  lamp(ctx, o) {
    ctx.fillStyle = shade(o.color, -0.3); ctx.fillRect(-0.12, -0.6, 0.24, 1.55);
    ctx.fillStyle = '#555'; rrect(ctx, -0.45, 0.8, 0.9, 0.18, 0.06);
    ctx.fillStyle = o.color; rrect(ctx, -0.4, -1, 0.8, 0.5, 0.12);
  },
  car(ctx, o) {
    ctx.fillStyle = '#1b1b1b'; circle(ctx, -0.55, 0.5, 0.25); circle(ctx, 0.55, 0.5, 0.25);
    ctx.fillStyle = o.color; rrect(ctx, -1, -0.15, 2, 0.65, 0.2);
    ctx.fillStyle = shade(o.color, -0.15); rrect(ctx, -0.6, -0.6, 1.15, 0.55, 0.2);
    ctx.fillStyle = '#bfe9ff'; rrect(ctx, -0.48, -0.5, 0.42, 0.35, 0.08); rrect(ctx, 0.04, -0.5, 0.42, 0.35, 0.08);
  },
  building(ctx, o) {
    const w = 0.7 + (o.seed % 0.3), h = 1;
    ctx.fillStyle = shade(o.color, -0.35); ctx.fillRect(-w + 0.12, -h + 0.12, w * 2, h * 2);
    ctx.fillStyle = o.color; ctx.fillRect(-w, -h, w * 2, h * 2 - 0.05);
    ctx.fillStyle = 'rgba(255,240,170,0.85)';
    const cols = 4, rows = 6;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if (((i * 7 + j * 13 + (o.seed * 100 | 0)) % 5) === 0) continue;
      ctx.fillRect(-w + 0.15 + i * (w * 2 - 0.3) / cols, -h + 0.15 + j * 0.3, (w * 2 - 0.3) / cols * 0.6, 0.17);
    }
  },
  tree(ctx, o) {
    ctx.fillStyle = '#6b4423'; ctx.fillRect(-0.12, 0.3, 0.24, 0.65);
    ctx.fillStyle = shade(o.color, -0.25); circle(ctx, 0.1, 0.05, 0.75);
    ctx.fillStyle = o.color; circle(ctx, -0.35, -0.15, 0.5); circle(ctx, 0.3, -0.25, 0.5); circle(ctx, 0, -0.55, 0.45);
  },
  rock(ctx, o) {
    ctx.fillStyle = shade(o.color, -0.3);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = 0.8 + 0.2 * Math.sin(i * 3.1 + o.seed * 10); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r + 0.05); }
    ctx.fill();
    ctx.fillStyle = o.color;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = 0.72 + 0.2 * Math.sin(i * 3.1 + o.seed * 10); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r - 0.05); }
    ctx.fill();
    ctx.fillStyle = shade(o.color, 0.3); circle(ctx, -0.25, -0.3, 0.18);
  },
  mountain(ctx, o) {
    ctx.fillStyle = shade(o.color, -0.25); ctx.beginPath(); ctx.moveTo(-1, 0.8); ctx.lineTo(-0.2, -0.9); ctx.lineTo(0.95, 0.8); ctx.fill();
    ctx.fillStyle = o.color; ctx.beginPath(); ctx.moveTo(-1, 0.8); ctx.lineTo(-0.2, -0.9); ctx.lineTo(0.2, 0.8); ctx.fill();
    if (o.explosive) { ctx.fillStyle = '#ff6a1f'; ctx.beginPath(); ctx.moveTo(-0.38, -0.5); ctx.lineTo(-0.2, -0.9); ctx.lineTo(-0.02, -0.5); ctx.fill(); }
    else { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-0.45, -0.38); ctx.lineTo(-0.2, -0.9); ctx.lineTo(0.05, -0.38); ctx.fill(); }
  },
  island(ctx, o) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 1, 0.85, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = o.color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = 0.75 + 0.15 * Math.sin(i * 2.3 + o.seed * 7); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.85); }
    ctx.fill();
    ctx.fillStyle = shade(o.color, -0.2); circle(ctx, 0.2, 0.1, 0.25); circle(ctx, -0.3, -0.15, 0.18);
  },
  planet(ctx, o) {
    const g = ctx.createRadialGradient(-0.35, -0.35, 0.1, 0, 0, 1);
    g.addColorStop(0, shade(o.color, 0.35)); g.addColorStop(0.7, o.color); g.addColorStop(1, shade(o.color, -0.5));
    ctx.fillStyle = g; circle(ctx, 0, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; circle(ctx, 0.3, 0.2, 0.22); circle(ctx, -0.25, 0.45, 0.14);
  },
  ringplanet(ctx, o) {
    ctx.strokeStyle = shade(o.color, -0.2); ctx.lineWidth = 0.12;
    ctx.beginPath(); ctx.ellipse(0, 0, 1, 0.3, -0.3, Math.PI, TAU); ctx.stroke();
    SHAPES.planet(ctx, { ...o, color: o.color });
    ctx.beginPath(); ctx.ellipse(0, 0, 1, 0.3, -0.3, 0, Math.PI); ctx.stroke();
  },
  star(ctx, o) {
    const g = ctx.createRadialGradient(0, 0, 0.2, 0, 0, 1.25);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, o.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; circle(ctx, 0, 0, 1.25);
  },
  nebula(ctx, o) {
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + o.seed * 6, d = 0.4;
      const g = ctx.createRadialGradient(Math.cos(a) * d, Math.sin(a) * d, 0, Math.cos(a) * d, Math.sin(a) * d, 0.7);
      g.addColorStop(0, o.color + 'aa'); g.addColorStop(1, o.color + '00');
      ctx.fillStyle = g; circle(ctx, Math.cos(a) * d, Math.sin(a) * d, 0.7);
    }
    ctx.fillStyle = '#ffffff'; circle(ctx, 0, 0, 0.08);
  },
  cluster(ctx, o) {
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4 + o.seed * 5, d = Math.sqrt(i / 14) * 0.85;
      ctx.fillStyle = i % 3 ? o.color : '#ffffff'; circle(ctx, Math.cos(a) * d, Math.sin(a) * d, 0.12);
    }
  },
  blackhole(ctx, o) {
    const g = ctx.createRadialGradient(0, 0, 0.3, 0, 0, 1.2);
    g.addColorStop(0, '#000'); g.addColorStop(0.45, '#000'); g.addColorStop(0.55, '#ff9a3d'); g.addColorStop(0.75, '#7a2bff55'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; circle(ctx, 0, 0, 1.2);
  },
};

// Sterne für Welt-Hintergrund (Bildschirm-Koordinaten, Parallax)
const STARS = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.6 + 0.3, p: Math.random() * 0.5 + 0.1 }));

export function render(ctx, g, W, H, time) {
  const cam = g.cam, z = cam.zoom, p = g.p;
  const world = C.WORLDS[g.world];
  const sh = g.shake * Math.min(W, H) * 0.012;
  const ox = W / 2 + (Math.random() - 0.5) * sh, oy = H / 2 + (Math.random() - 0.5) * sh;
  const sx = x => (x - cam.x) * z + ox, sy = y => (y - cam.y) * z + oy;

  // Hintergrund
  ctx.fillStyle = world.bg; ctx.fillRect(0, 0, W, H);
  if (world.stars) {
    for (const s of STARS) {
      const x = ((s.x * W - cam.x * z * s.p * 0.02) % W + W) % W;
      const y = ((s.y * H - cam.y * z * s.p * 0.02) % H + H) % H;
      ctx.fillStyle = `rgba(255,255,255,${0.3 + s.p})`; ctx.fillRect(x, y, s.s, s.s);
    }
  }
  // Raster (Gitterweite hängt an Zweierpotenz der Spielergröße, damit es nicht flackert)
  const step = Math.pow(2, Math.round(Math.log2(p.r * 4)));
  const stepPx = step * z;
  ctx.strokeStyle = world.grid; ctx.lineWidth = 1;
  ctx.beginPath();
  let gx = Math.floor((cam.x - W / 2 / z) / step) * step;
  for (; sx(gx) < W; gx += step) { ctx.moveTo(sx(gx) | 0, 0); ctx.lineTo(sx(gx) | 0, H); }
  let gy = Math.floor((cam.y - H / 2 / z) / step) * step;
  for (; sy(gy) < H; gy += step) { ctx.moveTo(0, sy(gy) | 0); ctx.lineTo(W, sy(gy) | 0); }
  if (stepPx > 6) ctx.stroke();
  // Flecken für Bodentextur
  ctx.fillStyle = world.bg2;
  const big = step * 4;
  let bx = Math.floor((cam.x - W / 2 / z) / big) * big;
  for (; sx(bx) < W + big * z; bx += big) {
    let by = Math.floor((cam.y - H / 2 / z) / big) * big;
    for (; sy(by) < H + big * z; by += big) {
      const h = Math.sin(bx * 12.9898 + by * 78.233) * 43758.5453; const f = h - Math.floor(h);
      if (f < 0.35) { ctx.beginPath(); ctx.ellipse(sx(bx + big * f), sy(by + big * (1 - f)), big * z * 0.35, big * z * 0.22, f * 3, 0, TAU); ctx.fill(); }
    }
  }

  // Meteor-Schatten
  for (const m of g.meteors) {
    const k = 1 - m.t / 0.7;
    ctx.fillStyle = `rgba(0,0,0,${0.15 + k * 0.3})`;
    ctx.beginPath(); ctx.arc(sx(m.x), sy(m.y), m.r * z * k, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb13d';
    const mx = sx(m.x) + (1 - k) * W * 0.3, my = sy(m.y) - (1 - k) * H * 0.6;
    ctx.beginPath(); ctx.arc(mx, my, Math.max(3, p.r * z * 0.5), 0, TAU); ctx.fill();
  }

  // Objekte
  const breakLimit = p.r * g.stats.breakRatio * (g.event && g.event.id === 'glass' ? 1.4 : 1);
  const viewPad = 50;
  const objs = g.objects.slice().sort((a, b) => a.y - b.y);
  for (const o of objs) {
    const X = sx(o.x), Y = sy(o.y), R = o.size * z;
    if (X < -R - viewPad || X > W + R + viewPad || Y < -R - viewPad || Y > H + R + viewPad) continue;
    if (R < 0.6) { ctx.fillStyle = o.color; ctx.fillRect(X, Y, 1.2, 1.2); continue; }
    ctx.save();
    let jx = 0;
    if (o.shake > 0) jx = (Math.random() - 0.5) * R * 0.25;
    ctx.translate(X + jx, Y);
    // Schatten
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(R * 0.15, R * 0.9, R * 0.85, R * 0.28, 0, 0, TAU); ctx.fill();
    ctx.rotate(o.rot);
    ctx.scale(R, R);
    const sh2 = SHAPES[o.shape] || SHAPES.round;
    sh2(ctx, o);
    if (o.golden) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255,205,40,0.55)'; ctx.fillRect(-1.3, -1.3, 2.6, 2.6);
      ctx.globalCompositeOperation = 'source-over';
      const t = time * 3 + o.seed * 10;
      ctx.fillStyle = '#fff8c0';
      for (let i = 0; i < 3; i++) { const a = t + i * 2.1; circle(ctx, Math.cos(a) * 1.05, Math.sin(a * 1.3) * 1.05, 0.08); }
    }
    ctx.restore();
    // Unzerstörbar-Markierung
    if (o.size > breakLimit && R > 8) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1.5, R * 0.05);
      ctx.setLineDash([R * 0.15, R * 0.12]);
      ctx.beginPath(); ctx.arc(X, Y, R * 1.05, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    // HP-Balken
    if (o.hp < o.maxHp && R > 6) {
      const w = Math.max(20, R * 1.4), f = Math.max(0, o.hp / o.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(X - w / 2, Y - R - 12, w, 5);
      ctx.fillStyle = f > 0.5 ? '#ffd23f' : '#ff5a3d'; ctx.fillRect(X - w / 2, Y - R - 12, w * f, 5);
    }
  }

  // Schrott-Orbs
  const orbR = Math.max(3, Math.min(7, p.r * z * 0.16));
  for (const o of g.orbs) {
    const X = sx(o.x), Y = sy(o.y);
    if (X < -10 || X > W + 10 || Y < -10 || Y > H + 10) continue;
    const blink = o.life < 2 && Math.floor(o.life * 8) % 2 === 0;
    if (blink) continue;
    ctx.fillStyle = o.golden ? '#fff1a0' : '#ffcf3d';
    ctx.beginPath(); ctx.arc(X, Y, orbR, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9a6a00'; ctx.beginPath(); ctx.arc(X, Y, orbR * 0.4, 0, TAU); ctx.fill();
  }

  // Druckwellen
  for (const r of g.rings) {
    const k = 1 - r.life / r.max;
    ctx.strokeStyle = r.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = Math.max(2, r.r * z * 0.08 * (1 - k));
    ctx.beginPath(); ctx.arc(sx(r.x), sy(r.y), r.r * z * (0.3 + 0.7 * k), 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Partikel
  for (const q of g.particles) {
    const X = sx(q.x), Y = sy(q.y), s = Math.max(1.5, q.size * z);
    ctx.globalAlpha = Math.min(1, q.life / q.max * 1.5);
    ctx.fillStyle = q.color;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(q.rot); ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Spieler
  if (g.state !== 'dying' && g.state !== 'over') drawPlayer(ctx, g, sx(p.x), sy(p.y), p.r * z, time);

  // Texte
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const t of g.texts) {
    ctx.globalAlpha = Math.min(1, t.life / t.max * 2);
    ctx.font = `800 ${Math.round(Math.max(13, Math.min(22, p.r * z * 0.5)))}px "Lilita One", system-ui, sans-serif`;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(t.s, sx(t.x), sy(t.y)); ctx.fillStyle = t.color; ctx.fillText(t.s, sx(t.x), sy(t.y));
  }
  ctx.globalAlpha = 1;

  // Wut-Vignette, wenn die Wut knapp wird
  const rf = p.rage / g.stats.rageMax;
  if (rf < 0.3 && g.state === 'play') {
    const a = (0.3 - rf) / 0.3 * (0.35 + 0.15 * Math.sin(time * 10));
    const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(120,0,0,0)'); v.addColorStop(1, `rgba(160,0,0,${a})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
}

function drawPlayer(ctx, g, X, Y, R, time) {
  const p = g.p, rf = p.rage / g.stats.rageMax;
  // Glühen
  const glow = ctx.createRadialGradient(X, Y, R * 0.8, X, Y, R * (1.6 + rf * 0.6));
  glow.addColorStop(0, `rgba(255,70,40,${0.25 + rf * 0.35})`); glow.addColorStop(1, 'rgba(255,70,40,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(X, Y, R * 2.3, 0, TAU); ctx.fill();
  // Dash-Bereitschaft
  if (p.dashCd <= 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = Math.max(1.5, R * 0.06);
    ctx.beginPath(); ctx.arc(X, Y, R * 1.18, 0, TAU); ctx.stroke();
  }
  // Körper
  const pulse = 1 + Math.sin(time * (6 + rf * 10)) * 0.025;
  const body = ctx.createRadialGradient(X - R * 0.35, Y - R * 0.4, R * 0.1, X, Y, R * pulse);
  body.addColorStop(0, '#ff8a6a'); body.addColorStop(0.6, '#e8262b'); body.addColorStop(1, '#8e0f1a');
  ctx.fillStyle = body; ctx.beginPath(); ctx.arc(X, Y, R * pulse, 0, TAU); ctx.fill();
  // Risse/Lava
  ctx.strokeStyle = 'rgba(255,210,63,0.55)'; ctx.lineWidth = Math.max(1, R * 0.05);
  ctx.beginPath(); ctx.moveTo(X - R * 0.7, Y + R * 0.3); ctx.lineTo(X - R * 0.45, Y + R * 0.5); ctx.lineTo(X - R * 0.2, Y + R * 0.42); ctx.stroke();
  // Augen
  const lx = p.lookX, ly = p.lookY;
  const ex = X + lx * R * 0.18, ey = Y + ly * R * 0.12 - R * 0.12;
  for (const s of [-1, 1]) {
    const cx = ex + s * R * 0.32, cy = ey;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.22, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a0505'; ctx.beginPath(); ctx.arc(cx + lx * R * 0.08, cy + ly * R * 0.08, R * 0.11, 0, TAU); ctx.fill();
    // wütende Augenbrauen
    ctx.strokeStyle = '#2a0606'; ctx.lineWidth = Math.max(2, R * 0.1); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + s * R * 0.26, cy - R * 0.38); ctx.lineTo(cx - s * R * 0.14, cy - R * 0.2); ctx.stroke();
  }
  // Mund
  ctx.fillStyle = '#2a0606';
  ctx.beginPath(); ctx.ellipse(ex, ey + R * 0.42, R * 0.3, R * 0.12 + rf * R * 0.06, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff';
  for (let i = -2; i <= 2; i++) ctx.fillRect(ex + i * R * 0.1 - R * 0.035, ey + R * 0.32, R * 0.07, R * 0.08);
}
