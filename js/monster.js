// =====================================================================
//  RAGEVERSE – die spielbaren Monster
//  drawMonster zeichnet das Monster stehend, Füße bei (X, Y),
//  R = Größe in Pixeln (Radius der Trefferzone).
//  Jede Welt = eine Evolutionsstufe (größere Hörner, Stacheln, Panzer,
//  Lava-Risse, Sternenstaub …).
// =====================================================================
import * as C from './config.js?v=0.3.2';
import { shadeHex as sh } from './game.js?v=0.3.2';

const TAU = Math.PI * 2;
const OUT = '#1f1212';

export function monsterColors(char, stage) {
  if (!char.colors) return C.EVOLUTION[Math.min(stage, C.EVOLUTION.length - 1)];
  return char.colors;
}

function path(c, fill, stroke = true) { c.fillStyle = fill; c.fill(); if (stroke) c.stroke(); }

// s: { char, stage, face, walk, punchT, punchX, punchY, hurtT, berserk, squash, time, lookX, lookY, dash, slamT, mini }
export function drawMonster(c, X, Y, R, s) {
  const char = s.char, type = char.type, stage = s.stage || 0;
  const col = monsterColors(char, stage);
  const t = s.time || 0;
  const body = s.berserk ? sh(col.body, 0.12) : col.body;

  // Schatten
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath(); c.ellipse(X, Y, R * 1.05, R * 0.38, 0, 0, TAU); c.fill();

  c.save();
  c.translate(X, Y);
  // Aura (Berserker / hohe Evolution)
  if (s.berserk || stage >= 6) {
    const a = s.berserk ? 0.55 + Math.sin(t * 14) * 0.15 : 0.3;
    const g = c.createRadialGradient(0, -R, R * 0.4, 0, -R, R * 2.1);
    g.addColorStop(0, `rgba(255,${s.berserk ? 60 : 160},30,${a})`); g.addColorStop(1, 'rgba(255,80,30,0)');
    c.fillStyle = g; c.beginPath(); c.arc(0, -R, R * 2.1, 0, TAU); c.fill();
  }
  const sq = s.squash || 0;
  const bobY = Math.abs(Math.sin(s.walk * Math.PI)) * R * 0.08;
  c.scale(s.face * (1 + sq * 0.12), 1 - sq * 0.12);
  c.translate(0, -bobY);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.lineWidth = Math.max(1.5, R * 0.075);
  c.strokeStyle = OUT;

  const lift1 = Math.max(0, Math.sin(s.walk * Math.PI)) * R * 0.22;
  const lift2 = Math.max(0, -Math.sin(s.walk * Math.PI)) * R * 0.22;

  // ---------- hinten: Schwanz, Flügel, hinterer Arm ----------
  if (type !== 'alien') {
    const sw = Math.sin(t * 5 + s.walk) * R * 0.15;
    c.beginPath();
    c.moveTo(-R * 0.55, -R * 0.75);
    c.quadraticCurveTo(-R * 1.25, -R * 0.55 + sw, -R * (type === 'lizard' ? 1.75 : 1.4), -R * 0.95 + sw);
    c.quadraticCurveTo(-R * 1.1, -R * 0.25 + sw * 0.5, -R * 0.45, -R * 0.3);
    c.closePath(); path(c, sh(body, -0.08));
    if (type === 'spiky' || type === 'dragon' || stage >= 2) {
      for (let i = 0; i < 3; i++) {
        const x = -R * (0.8 + i * 0.22), y = -R * (0.72 + i * 0.06) + sw * (0.4 + i * 0.2);
        c.beginPath(); c.moveTo(x - R * 0.08, y); c.lineTo(x, y - R * 0.2); c.lineTo(x + R * 0.08, y); c.closePath(); path(c, col.horn);
      }
    }
  }
  if (type === 'dragon') {
    const flap = Math.sin(t * 6) * 0.25;
    c.save(); c.translate(-R * 0.2, -R * 1.3); c.rotate(-0.4 + flap);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(-R * 1.1, -R * 0.7); c.lineTo(-R * 0.9, -R * 0.2); c.lineTo(-R * 1.2, R * 0.1); c.lineTo(-R * 0.6, R * 0.2); c.lineTo(-R * 0.5, R * 0.45); c.closePath();
    path(c, sh(body, -0.2)); c.restore();
  }
  // hinteres Bein
  c.beginPath(); c.roundRect(-R * 0.5, -R * 0.5 - lift2, R * 0.36, R * 0.5, R * 0.14); path(c, sh(body, -0.2));
  // hinterer Arm
  c.beginPath(); c.ellipse(-R * 0.2, -R * 0.95, R * 0.16, R * 0.26, 0.4, 0, TAU); path(c, sh(body, -0.2));

  // ---------- Körper ----------
  c.beginPath();
  if (type === 'golem') c.roundRect(-R * 0.82, -R * 1.95, R * 1.64, R * 1.6, R * 0.35);
  else if (type === 'lizard') c.ellipse(0.05 * R, -R * 1.0, R * 0.95, R * 0.78, -0.15, 0, TAU);
  else if (type === 'alien') { c.moveTo(-R * 0.6, -R * 0.35); c.bezierCurveTo(-R * 0.9, -R * 1.4, -R * 0.6, -R * 2.2, 0, -R * 2.2); c.bezierCurveTo(R * 0.6, -R * 2.2, R * 0.9, -R * 1.4, R * 0.6, -R * 0.35); c.closePath(); }
  else c.ellipse(0, -R * 1.08, R * 0.82, R * 0.9, 0, 0, TAU);
  path(c, body);
  // Sternenstaub / Lava im Körper (hohe Evolution)
  c.save(); c.clip();
  // Glanz
  c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(-R * 0.3, -R * 1.55, R * 0.3, R * 0.18, -0.5, 0, TAU); c.fill();
  // Bauch
  c.fillStyle = col.belly; c.beginPath(); c.ellipse(R * 0.22, -R * 0.82, R * 0.48, R * 0.55, 0, 0, TAU); c.fill();
  c.strokeStyle = sh(col.belly, -0.2); c.lineWidth = Math.max(1, R * 0.03);
  for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(R * -0.12, -R * (0.6 + i * 0.22)); c.lineTo(R * 0.6, -R * (0.6 + i * 0.22)); c.stroke(); }
  c.strokeStyle = OUT; c.lineWidth = Math.max(1.5, R * 0.075);
  if (stage >= 3 || type === 'golem') {
    c.fillStyle = 'rgba(0,0,0,0.22)';
    for (const [x, y, r] of [[-0.45, -1.3, 0.22], [-0.55, -0.75, 0.18], [0.1, -1.7, 0.16]]) { c.beginPath(); c.ellipse(R * x, R * y, R * r, R * r * 0.7, 0.4, 0, TAU); c.fill(); }
  }
  if (stage >= 4 || type === 'golem') {
    c.strokeStyle = `rgba(255,${140 + Math.sin(t * 6) * 40},40,0.95)`; c.lineWidth = Math.max(1.5, R * 0.06);
    c.beginPath(); c.moveTo(-R * 0.7, -R * 1.2); c.lineTo(-R * 0.45, -R * 1.0); c.lineTo(-R * 0.55, -R * 0.7); c.lineTo(-R * 0.3, -R * 0.5); c.stroke();
    c.beginPath(); c.moveTo(-R * 0.2, -R * 1.85); c.lineTo(-R * 0.05, -R * 1.6); c.lineTo(-R * 0.25, -R * 1.45); c.stroke();
    c.strokeStyle = OUT; c.lineWidth = Math.max(1.5, R * 0.075);
  }
  if (stage >= 5 || type === 'alien') {
    for (let i = 0; i < 9; i++) {
      const x = Math.sin(i * 12.9 + 1) * R * 0.7, y = -R * 1.1 + Math.cos(i * 7.3) * R * 0.8;
      const tw = 0.5 + 0.5 * Math.sin(t * 4 + i);
      c.fillStyle = `rgba(255,255,255,${0.4 + tw * 0.6})`; c.beginPath(); c.arc(x, y, R * (0.025 + tw * 0.025), 0, TAU); c.fill();
    }
  }
  c.restore();
  // Konturlinie neu, da clip die Kontur teils verdeckt
  c.beginPath();
  if (type === 'golem') c.roundRect(-R * 0.82, -R * 1.95, R * 1.64, R * 1.6, R * 0.35);
  else if (type === 'lizard') c.ellipse(0.05 * R, -R * 1.0, R * 0.95, R * 0.78, -0.15, 0, TAU);
  else if (type === 'alien') { c.moveTo(-R * 0.6, -R * 0.35); c.bezierCurveTo(-R * 0.9, -R * 1.4, -R * 0.6, -R * 2.2, 0, -R * 2.2); c.bezierCurveTo(R * 0.6, -R * 2.2, R * 0.9, -R * 1.4, R * 0.6, -R * 0.35); c.closePath(); }
  else c.ellipse(0, -R * 1.08, R * 0.82, R * 0.9, 0, 0, TAU);
  c.stroke();

  // Rückenstacheln
  const spikes = type === 'spiky' ? 7 : type === 'dragon' ? 4 : stage >= 1 ? Math.min(2 + stage, 6) : 0;
  for (let i = 0; i < spikes; i++) {
    const a = Math.PI * (1.05 + i * (0.55 / Math.max(1, spikes - 1)));
    const bx = Math.cos(a) * R * 0.8, by = -R * 1.08 + Math.sin(a) * R * 0.88;
    const len = R * (type === 'spiky' ? 0.42 : 0.26 + stage * 0.02);
    c.beginPath(); c.moveTo(bx + Math.cos(a + 1.3) * R * 0.1, by + Math.sin(a + 1.3) * R * 0.1);
    c.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
    c.lineTo(bx + Math.cos(a - 1.3) * R * 0.1, by + Math.sin(a - 1.3) * R * 0.1); c.closePath();
    path(c, col.horn);
  }

  // ---------- Kopf-Features ----------
  const headY = type === 'alien' ? -R * 1.55 : type === 'golem' ? -R * 1.5 : -R * 1.38;
  // Hörner
  if (type !== 'alien' && type !== 'lizard') {
    const hs = R * (0.34 + Math.min(stage, 7) * 0.05) * (type === 'golem' ? 0.8 : 1);
    for (const [x, d] of [[-R * 0.25, -1], [R * 0.42, 1]]) {
      c.beginPath();
      c.moveTo(x - R * 0.12, headY - R * 0.42);
      c.quadraticCurveTo(x + d * hs * 0.2, headY - R * 0.5 - hs, x + d * hs * 0.55, headY - R * 0.55 - hs * 1.05);
      c.quadraticCurveTo(x + d * hs * 0.1, headY - R * 0.55, x + R * 0.12, headY - R * 0.38);
      c.closePath(); path(c, col.horn);
    }
  } else if (type === 'alien') {
    for (const x of [-R * 0.25, R * 0.25]) {
      const wob = Math.sin(t * 5 + x) * R * 0.1;
      c.beginPath(); c.moveTo(x, -R * 2.1); c.quadraticCurveTo(x * 1.6 + wob, -R * 2.5, x * 1.3 + wob, -R * 2.7); c.stroke();
      c.beginPath(); c.arc(x * 1.3 + wob, -R * 2.72, R * 0.1, 0, TAU); path(c, col.horn);
    }
  } else {
    // Echsen-Kamm
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-R * 0.3 + i * R * 0.22, -R * 1.62 + i * 0.02 * R); c.lineTo(-R * 0.2 + i * R * 0.22, -R * 1.95 + Math.sin(t * 8 + i) * R * 0.04); c.lineTo(-R * 0.1 + i * R * 0.22, -R * 1.6); c.closePath(); path(c, col.horn); }
  }

  // Augen
  const lx = Math.max(-0.3, Math.min(1, s.lookX * s.face)), ly = s.lookY;
  const glow = s.berserk ? '#ffe14a' : '#ffffff';
  const eyePos = type === 'alien' ? [[R * 0.15, headY, R * 0.34]] : [[R * 0.05, headY, R * 0.2], [R * 0.52, headY + R * 0.02, R * 0.18]];
  for (const [ex, ey, er] of eyePos) {
    c.beginPath(); c.arc(ex, ey, er, 0, TAU); path(c, glow);
    c.fillStyle = s.berserk ? '#ff2a00' : '#1a0505';
    c.beginPath(); c.arc(ex + er * 0.35 * lx, ey + er * 0.3 * ly, er * 0.5, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + er * 0.2, ey - er * 0.3, er * 0.18, 0, TAU); c.fill();
  }
  // böse Augenbrauen
  c.lineWidth = Math.max(2, R * 0.11);
  c.strokeStyle = col.dark || OUT;
  if (type === 'alien') {
    c.beginPath(); c.moveTo(-R * 0.25, headY - R * 0.42); c.lineTo(R * 0.15, headY - R * 0.25); c.lineTo(R * 0.55, headY - R * 0.42); c.stroke();
  } else {
    c.beginPath(); c.moveTo(-R * 0.18, headY - R * 0.3); c.lineTo(R * 0.22, headY - R * 0.14); c.stroke();
    c.beginPath(); c.moveTo(R * 0.72, headY - R * 0.26); c.lineTo(R * 0.36, headY - R * 0.12); c.stroke();
  }
  c.lineWidth = Math.max(1.5, R * 0.075); c.strokeStyle = OUT;

  // Maul
  const open = (s.punchT > 0 ? 1 : 0) + (s.berserk ? 0.6 : 0) + (s.slamT > 0 ? 1 : 0);
  const my = headY + R * 0.5, mh = R * (0.12 + Math.min(1, open) * 0.16);
  c.beginPath(); c.ellipse(R * 0.3, my, R * 0.36, mh, 0, 0, TAU); path(c, '#3a0a0a');
  c.fillStyle = '#ffffff';
  for (let i = 0; i < 5; i++) { const x = R * (0.02 + i * 0.13); c.beginPath(); c.moveTo(x, my - mh * 0.9); c.lineTo(x + R * 0.05, my - mh * 0.2); c.lineTo(x + R * 0.1, my - mh * 0.9); c.fill(); }
  if (open > 0.5) for (let i = 0; i < 4; i++) { const x = R * (0.08 + i * 0.13); c.beginPath(); c.moveTo(x, my + mh * 0.9); c.lineTo(x + R * 0.05, my + mh * 0.25); c.lineTo(x + R * 0.1, my + mh * 0.9); c.fill(); }
  if (type === 'dragon' && open > 0.5) {
    c.fillStyle = 'rgba(255,140,30,0.85)'; c.beginPath(); c.moveTo(R * 0.62, my); c.lineTo(R * 1.2, my - R * 0.2); c.lineTo(R * 1.1, my + R * 0.15); c.closePath(); c.fill();
  }

  // vorderes Bein
  c.beginPath(); c.roundRect(R * 0.1, -R * 0.5 - lift1, R * 0.38, R * 0.52, R * 0.15); path(c, body);
  c.fillStyle = col.horn; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(R * (0.18 + i * 0.11), -lift1 - R * 0.02, R * 0.05, 0, TAU); c.fill(); }

  // vorderer Arm – schlägt in Richtung des Ziels
  const pt = s.punchT > 0 ? Math.min(1, s.punchT / 0.16) : 0;
  const ax = R * 0.62, ay = -R * 1.0;
  const reach = R * (0.35 + pt * 0.55);
  const px = Math.max(0.2, s.punchX * s.face), py = s.punchY;
  const hx = ax + px * reach, hy = ay + py * reach * 0.6 + (s.slamT > 0 ? R * 0.35 : 0);
  c.lineWidth = Math.max(3, R * 0.26); c.strokeStyle = OUT;
  c.beginPath(); c.moveTo(ax - R * 0.1, ay); c.lineTo(hx, hy); c.stroke();
  c.lineWidth = Math.max(2, R * 0.18); c.strokeStyle = body;
  c.beginPath(); c.moveTo(ax - R * 0.1, ay); c.lineTo(hx, hy); c.stroke();
  c.lineWidth = Math.max(1.5, R * 0.075); c.strokeStyle = OUT;
  c.beginPath(); c.arc(hx, hy, R * (0.16 + pt * 0.05), 0, TAU); path(c, body);
  c.fillStyle = col.horn; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(hx + R * 0.12, hy + i * R * 0.07); c.lineTo(hx + R * 0.24, hy + i * R * 0.07 - R * 0.02); c.lineTo(hx + R * 0.13, hy + i * R * 0.07 + R * 0.04); c.fill(); }

  // Treffer-Blitz bei Schaden
  if (s.hurtT > 0) {
    c.globalAlpha = Math.min(0.6, s.hurtT * 1.5);
    c.fillStyle = '#ff2a2a';
    c.beginPath(); c.ellipse(0, -R * 1.08, R * 0.86, R * 0.95, 0, 0, TAU); c.fill();
    c.globalAlpha = 1;
  }
  c.restore();
}
