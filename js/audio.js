// =====================================================================
//  RAGEVERSE – Sound (synthetisch per WebAudio, keine Dateien nötig)
// =====================================================================
let ac = null, master = null, muted = false;
const last = {};

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.35; master.connect(ac.destination);
  } catch { ac = null; }
}
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.35; }

function tone(freq, dur, type = 'square', vol = 0.3, slide = 0) {
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur);
}
function noise(dur, vol = 0.3, freq = 1200) {
  const len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = 'lowpass'; f.frequency.value = freq; s.buffer = buf; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master); s.start();
}

export function sfx(name, v = 1) {
  if (!ac || muted) return;
  const now = performance.now();
  const gap = { pickup: 35, hit: 50, crumb: 60, break: 45, thud: 200, boom: 90 }[name] || 0;
  if (last[name] && now - last[name] < gap) return;
  last[name] = now;
  switch (name) {
    case 'pickup': tone(900 + Math.random() * 300, 0.06, 'triangle', 0.12); break;
    case 'hit': tone(180 - v * 60, 0.07, 'square', 0.12); noise(0.05, 0.15, 2500); break;
    case 'crumb': noise(0.04, 0.08, 4000); break;
    case 'break': noise(0.18, 0.25 + 0.15 * v, 900 - v * 400); tone(140 - v * 50, 0.18, 'sawtooth', 0.12, 0.4); break;
    case 'thud': tone(70, 0.12, 'sine', 0.3, 0.6); break;
    case 'boom': noise(0.5, 0.45 * v, 500); tone(60, 0.4, 'sine', 0.4, 0.3); break;
    case 'dash': tone(220, 0.15, 'sawtooth', 0.12, 2.5); break;
    case 'shock': tone(120, 0.3, 'sine', 0.25, 0.4); break;
    case 'levelup': [0, 4, 7, 12].forEach((s, i) => setTimeout(() => tone(330 * Math.pow(2, s / 12), 0.18, 'square', 0.15), i * 80)); break;
    case 'event': [0, 7, 12].forEach((s, i) => setTimeout(() => tone(440 * Math.pow(2, s / 12), 0.12, 'triangle', 0.18), i * 60)); break;
    case 'die': tone(300, 0.9, 'sawtooth', 0.2, 0.15); break;
    case 'buy': tone(660, 0.08, 'square', 0.15); setTimeout(() => tone(990, 0.1, 'square', 0.15), 70); break;
    case 'click': tone(500, 0.04, 'triangle', 0.1); break;
  }
}
