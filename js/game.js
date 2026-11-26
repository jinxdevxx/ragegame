// =====================================================================
//  RAGEVERSE – Spiel-Logik (Simulation, keine Grafik)
// =====================================================================
import * as C from './config.js';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export function upgradeLevel(save, id) { return save.upgrades[id] || 0; }
export function upgradeDef(id) { return C.UPGRADES.find(u => u.id === id); }
export function upgradeCost(u, level) { return Math.ceil(u.base * Math.pow(u.growth, level)); }

export function worldIndexFor(r) {
  let w = 0;
  for (let i = 0; i < C.WORLDS.length; i++) if (r >= C.WORLDS[i].minRadius) w = i;
  return w;
}

// Alle Spielerwerte aus Basiswerten + Upgrades + Mutationen
export function computeStats(save, muts = []) {
  const P = C.PLAYER;
  const L = id => upgradeLevel(save, id);
  const per = id => upgradeDef(id).per;
  const has = id => muts.includes(id);
  return {
    startRadius: P.startRadius * (1 + per('size') * L('size')),
    rageMax: P.rageMax * (1 + per('rage') * L('rage')),
    rageDrain: P.rageDrain * Math.pow(1 - per('calm'), L('calm')) * (has('zen') ? 0.7 : 1),
    damage: P.damage * (1 + per('dmg') * L('dmg')) * (has('spikes') ? 1.6 : 1),
    breakRatio: P.breakRatio + per('hard') * L('hard') + (has('hardhead') ? 0.2 : 0),
    speed: P.speed * (1 + per('speed') * L('speed')) * (has('turbo') ? 1.3 : 1),
    absorb: P.absorb * (1 + per('absorb') * L('absorb')) * (has('glutton') ? 1.4 : 1),
    scrapMult: (1 + per('scrap') * L('scrap')) * (has('greed') ? 1.6 : 1) * C.SCRAP_SCALE,
    magnet: P.magnet + per('magnet') * L('magnet'),
    dashCooldown: P.dashCooldown * Math.pow(1 - per('dash'), L('dash')) * (has('dashmore') ? 0.5 : 1),
    dashDamage: has('dashmore') ? 2 : 1,
    comboWindow: C.COMBO.window * (has('frenzy') ? 2 : 1),
    goldenChance: C.GOLDEN_CHANCE * (has('golden') ? 4 : 1),
  };
}

export class Game {
  constructor(save, hooks = {}) {
    this.save = save;
    this.hooks = hooks;
    this.state = 'idle';
    this.vw = 800; this.vh = 600;
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.objects = []; this.orbs = []; this.particles = []; this.texts = []; this.rings = []; this.meteors = [];
  }

  sfx(name, v = 1) { this.hooks.sfx && this.hooks.sfx(name, v); }

  start(opts = {}) {
    this.muts = [];
    this.stats = computeStats(this.save, this.muts);
    const r = opts.radius || this.stats.startRadius;
    this.p = { x: 0, y: 0, vx: 0, vy: 0, r, mass: r * r, rage: this.stats.rageMax,
      dashT: 0, dashCd: 0, dashX: 1, dashY: 0, lookX: 1, lookY: 0, hurt: 0 };
    this.world = worldIndexFor(r);
    this.startWorld = this.world;
    this.objects = []; this.orbs = []; this.particles = []; this.texts = []; this.rings = []; this.meteors = [];
    this.explosionQueue = [];
    this.time = 0; this.combo = 0; this.comboT = 0; this.bestCombo = 0;
    this.runScrap = 0; this.kills = 0; this.maxRadius = r;
    this.event = null; this.eventT = 0; this.nextEventAt = C.EVENTS.firstAfter;
    this.shockT = 0; this.meteorT = 0; this.spawnT = 0; this.shake = 0; this.dyingT = 0;
    this.pendingWorlds = 0;
    this.cam.x = 0; this.cam.y = 0; this.cam.zoom = this.targetZoom();
    this.spawnTick(true);
    this.state = 'play';
  }

  targetZoom() { return (Math.min(this.vw, this.vh) * 0.045) / this.p.r; }
  viewRadius() { return Math.hypot(this.vw, this.vh) / 2 / this.cam.zoom; }

  // ------------------------------------------------------------------
  update(dt, input) {
    if (this.state === 'dying') {
      this.dyingT -= dt;
      this.updateFx(dt * 0.4);
      if (this.dyingT <= 0) this.finish();
      return;
    }
    if (this.state !== 'play') return;
    const p = this.p, S = this.stats;
    this.time += dt;

    // --- Events
    if (this.event) {
      this.eventT -= dt;
      if (this.event.id === 'meteor') {
        this.meteorT -= dt;
        if (this.meteorT <= 0) {
          this.meteorT = 0.3;
          const a = Math.random() * TAU, d = Math.random() * this.viewRadius() * 0.7;
          this.meteors.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, t: 0.7, r: p.r * 2.6 });
        }
      }
      if (this.eventT <= 0) { this.event = null; this.nextEventAt = this.time + rand(...C.EVENTS.every); }
    } else if (this.time >= this.nextEventAt) {
      const e = C.EVENTS.list[Math.floor(Math.random() * C.EVENTS.list.length)];
      this.event = e; this.eventT = C.EVENTS.duration;
      this.hooks.onEvent && this.hooks.onEvent(e);
      this.sfx('event');
    }
    for (const m of this.meteors) {
      m.t -= dt;
      if (m.t <= 0) {
        this.explode(m.x, m.y, m.r, Math.pow(p.r, 1.5) * 2.2, true);
        this.sfx('boom', 0.6);
      }
    }
    this.meteors = this.meteors.filter(m => m.t > 0);

    // --- Bewegung
    p.dashCd = Math.max(0, p.dashCd - dt);
    if (input.dash && p.dashCd <= 0) {
      let dx = input.dx, dy = input.dy;
      if (Math.hypot(dx, dy) < 0.1) { dx = p.lookX; dy = p.lookY; }
      const l = Math.hypot(dx, dy) || 1;
      p.dashX = dx / l; p.dashY = dy / l; p.dashT = C.PLAYER.dashTime; p.dashCd = S.dashCooldown;
      this.sfx('dash');
    }
    input.dash = false;
    const maxV = S.speed * p.r;
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.vx = p.dashX * maxV * C.PLAYER.dashPower;
      p.vy = p.dashY * maxV * C.PLAYER.dashPower;
      if (Math.random() < 0.8) this.particle(p.x, p.y, '#ff5a3d', p.r * 0.35, 0.3, 0, 0);
    } else {
      const k = Math.min(1, C.PLAYER.accel * dt);
      p.vx += (input.dx * maxV - p.vx) * k;
      p.vy += (input.dy * maxV - p.vy) * k;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > maxV * 0.1) { p.lookX = p.vx / sp; p.lookY = p.vy / sp; }

    // --- Wut
    const frenzy = this.event && this.event.id === 'frenzy';
    if (!frenzy) p.rage -= S.rageDrain * Math.pow(C.WORLD_SCALING.rageDrain, this.world) * (1 + C.PLAYER.rageDrainGrowth * this.time) * dt;
    p.rage = Math.min(p.rage, S.rageMax);
    if (p.rage <= 0) { p.rage = 0; this.die(); return; }

    // --- Kombo
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    // --- Mutationen mit Dauerwirkung
    if (this.muts.includes('shock')) {
      this.shockT -= dt;
      if (this.shockT <= 0) {
        this.shockT = 4;
        this.explode(p.x, p.y, p.r * 4, Math.pow(p.r, 1.5) * 0.9 * S.damage, false);
        this.sfx('shock');
      }
    }
    if (this.muts.includes('hole')) {
      for (const o of this.objects) {
        if (o.size > p.r * 0.6) continue;
        const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy);
        if (d < p.r * 7 && d > 1e-6) { const v = p.r * 3 * dt; o.x += dx / d * v; o.y += dy / d * v; }
      }
    }

    // --- Kollisionen
    this.collide(dt);
    this.processExplosions();

    // --- Schrott einsammeln
    const pick = p.r * 1.25, pull = p.r * (2.5 + S.magnet * 1.5);
    for (const o of this.orbs) {
      o.life -= dt;
      const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy);
      if (d < pick) { o.life = -1; this.runScrap += o.value; this.sfx('pickup'); continue; }
      if (d < pull) { const v = (p.r * 6 + sp) * dt; o.x += dx / d * Math.min(v, d); o.y += dy / d * Math.min(v, d); }
      else { o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= 0.92; o.vy *= 0.92; }
    }
    this.orbs = this.orbs.filter(o => o.life > 0);

    // --- Welt-Aufstieg
    while (this.world < C.WORLDS.length - 1 && p.r >= C.WORLDS[this.world + 1].minRadius) {
      this.world++;
      this.pendingWorlds++;
    }
    if (this.pendingWorlds > 0) {
      this.pendingWorlds--;
      p.rage = Math.min(S.rageMax, p.rage + S.rageMax * 0.5);
      this.sfx('levelup');
      this.state = 'mutation';
      this.hooks.onWorld && this.hooks.onWorld(this.world, this.mutationChoices());
    }

    // --- Spawning
    this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawnT = 0.2; this.spawnTick(false); }

    this.updateFx(dt);
  }

  updateCamera(dt) {
    const p = this.p;
    const k = Math.min(1, dt * 8);
    this.cam.x += (p.x - this.cam.x) * k;
    this.cam.y += (p.y - this.cam.y) * k;
    this.cam.zoom *= Math.pow(this.targetZoom() / this.cam.zoom, Math.min(1, dt * 2.5));
  }

  updateFx(dt) {
    this.updateCamera(dt);
    for (const q of this.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9; q.rot += q.vr * dt; }
    this.particles = this.particles.filter(q => q.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y -= t.vy * dt; }
    this.texts = this.texts.filter(t => t.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter(r => r.life > 0);
    for (const o of this.objects) { if (o.shake > 0) o.shake -= dt; if (o.hitCd > 0) o.hitCd -= dt; }
    this.shake = Math.max(0, this.shake - dt * 2.5);
  }

  collide(dt) {
    const p = this.p, S = this.stats;
    const glass = this.event && this.event.id === 'glass';
    const breakLimit = p.r * S.breakRatio * (glass ? 1.4 : 1);
    for (const o of this.objects) {
      if (o.dead) continue;
      const dx = o.x - p.x, dy = o.y - p.y;
      const d = Math.hypot(dx, dy);
      const minD = p.r + o.size * 0.85;
      if (d >= minD) continue;
      // Krümel: sofort weg
      if (o.size < p.r * C.PLAYER.crumbRatio) { this.kill(o, 'touch'); continue; }
      const nx = d > 1e-6 ? dx / d : 1, ny = d > 1e-6 ? dy / d : 0;
      const breakable = o.size <= breakLimit;
      if (breakable && o.hitCd <= 0) {
        const approach = Math.max(0, p.vx * nx + p.vy * ny);
        let impact = clamp(approach / (S.speed * p.r), 0.35, 1.3);
        if (p.dashT > 0) impact *= 2.5 * S.dashDamage;
        let dmg = S.damage * Math.pow(p.r, 1.5) * 0.6 * impact;
        if (glass) dmg *= 100;
        o.hp -= dmg; o.hitCd = 0.16; o.shake = 0.2;
        if (o.hp <= 0) { this.kill(o, 'hit'); continue; }
        this.sfx('hit', clamp(o.size / p.r, 0.2, 1));
        for (let i = 0; i < 3; i++) this.particle(o.x - nx * o.size * 0.8, o.y - ny * o.size * 0.8, o.color, o.size * 0.15, 0.4, -nx * p.r * 3, -ny * p.r * 3);
      } else if (!breakable && o.hitCd <= 0) {
        o.hitCd = 0.5; o.shake = 0.15;
        this.sfx('thud');
        this.text(o.x, o.y - o.size, 'ZU GROSS', '#ffffff', 0.7, p.r * 0.6);
      }
      // abprallen
      const overlap = minD - d;
      p.x -= nx * overlap; p.y -= ny * overlap;
      const vn = p.vx * nx + p.vy * ny;
      if (vn > 0) { p.vx -= vn * nx * 1.5; p.vy -= vn * ny * 1.5; }
      if (p.dashT > 0 && !breakable) p.dashT = 0;
    }
    if (this.objects.some(o => o.dead)) this.objects = this.objects.filter(o => !o.dead);
  }

  kill(o, cause) {
    if (o.dead) return;
    o.dead = true;
    const p = this.p, S = this.stats;
    this.kills++;
    // Wachstum
    p.mass += o.size * o.size * S.absorb * Math.pow(C.WORLD_SCALING.absorb, this.world);
    p.r = Math.sqrt(p.mass);
    if (p.r > this.maxRadius) this.maxRadius = p.r;
    // Wut
    const rel = o.size / p.r;
    p.rage = Math.min(S.rageMax, p.rage + C.PLAYER.ragePerKill * clamp(Math.pow(rel, 0.7) * 1.6, 0.15, 3));
    // Kombo
    this.combo++; this.comboT = S.comboWindow;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    const comboMult = Math.min(C.COMBO.max, 1 + this.combo * C.COMBO.perStep);
    // Schrott
    const w = C.WORLDS[o.world];
    let value = o.value * w.scrapMult * comboMult * S.scrapMult * (o.golden ? C.GOLDEN_MULT : 1) * (o.bonusMult || 1);
    const n = clamp(Math.ceil(Math.sqrt(o.value)), 1, 6);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = rand(1, 3) * p.r;
      this.orbs.push({ x: o.x, y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, value: value / n, life: 9, golden: o.golden });
    }
    if (rel > 0.4 || o.golden) this.text(o.x, o.y - o.size, '+' + fmt(value), o.golden ? '#ffd23f' : '#ffe9a8', 0.9, p.r * 0.5);
    // Effekte
    const count = clamp(Math.round(4 + rel * 10), 3, 16);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU, v = rand(1, 5) * Math.max(o.size, p.r * 0.3);
      this.particle(o.x, o.y, i % 3 === 0 ? '#ffffff' : o.color, o.size * rand(0.12, 0.3), rand(0.4, 0.9), Math.cos(a) * v, Math.sin(a) * v);
    }
    if (rel > 0.5) this.shake = Math.min(1, this.shake + rel * 0.25);
    if (cause !== 'touch') this.sfx('break', clamp(rel, 0.2, 1.2));
    else if (Math.random() < 0.3) this.sfx('crumb');
    // Explosionen
    if (o.explosive) {
      this.explosionQueue.push({ x: o.x, y: o.y, r: o.size * 3.2, dmg: Math.pow(o.size, 1.5) * 2.5, big: true });
    } else if (this.muts.includes('boom') && rel > 0.2) {
      this.explosionQueue.push({ x: o.x, y: o.y, r: o.size * 1.8, dmg: Math.pow(o.size, 1.5) * 0.6, big: false });
    }
  }

  explode(x, y, r, dmg, big) {
    this.explosionQueue.push({ x, y, r, dmg, big });
    this.processExplosions();
  }

  processExplosions() {
    let guard = 0;
    while (this.explosionQueue.length && guard++ < 80) {
      const e = this.explosionQueue.shift();
      this.rings.push({ x: e.x, y: e.y, r: e.r, life: 0.45, max: 0.45, color: e.big ? '#ffb13d' : '#ffffff' });
      if (e.big) {
        this.shake = Math.min(1.2, this.shake + 0.5);
        this.sfx('boom', 1);
        for (let i = 0; i < 14; i++) {
          const a = Math.random() * TAU, v = rand(1, 4) * e.r;
          this.particle(e.x, e.y, i % 2 ? '#ff6a1f' : '#ffd23f', e.r * rand(0.06, 0.14), rand(0.3, 0.7), Math.cos(a) * v, Math.sin(a) * v);
        }
      }
      for (const o of this.objects) {
        if (o.dead || o.size > e.r * 1.1) continue;
        const d = Math.hypot(o.x - e.x, o.y - e.y);
        if (d > e.r + o.size * 0.5) continue;
        o.hp -= e.dmg * (1 - 0.5 * clamp(d / e.r, 0, 1));
        o.shake = 0.2;
        if (o.hp <= 0) this.kill(o, 'boom');
      }
    }
    this.explosionQueue.length = 0;
    if (this.objects.some(o => o.dead)) this.objects = this.objects.filter(o => !o.dead);
  }

  // ------------------------------------------------------------------
  spawnTick(initial) {
    const p = this.p;
    const viewR = Math.hypot(this.vw, this.vh) / 2 / this.targetZoom();
    const area = viewR * C.SPAWN.areaViews, desp = viewR * C.SPAWN.despawnViews;
    this.objects = this.objects.filter(o => {
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d > desp) return false;
      if (o.size < p.r * 0.05 && d > viewR * 0.7) return false;
      return true;
    });
    let relevant = 0;
    for (const o of this.objects) {
      if (o.size >= p.r * C.SPAWN.minRel * 0.6 && Math.hypot(o.x - p.x, o.y - p.y) < area) relevant++;
    }
    let need = C.SPAWN.density - relevant;
    if (!initial) need = Math.min(need, 8);
    for (let i = 0; i < need; i++) this.spawnOne(initial ? p.r * 4 : viewR * 1.05, area);
  }

  spawnOne(minD, maxD) {
    const p = this.p;
    const t = this.pickType();
    if (!t) return;
    let x = 0, y = 0, ok = false;
    for (let tries = 0; tries < 8 && !ok; tries++) {
      const a = Math.random() * TAU, d = Math.sqrt(rand(minD * minD, maxD * maxD));
      x = p.x + Math.cos(a) * d; y = p.y + Math.sin(a) * d;
      ok = true;
      for (const o of this.objects) {
        if (Math.hypot(o.x - x, o.y - y) < (o.size + t.size) * 0.95) { ok = false; break; }
      }
    }
    if (!ok) return;
    const evGold = this.event && this.event.id === 'gold';
    const golden = Math.random() < (evGold ? 0.3 : this.stats.goldenChance);
    const hp = Math.pow(t.size, 1.5) * Math.pow(C.WORLD_SCALING.hp, t.world);
    this.objects.push({
      x, y, size: t.size, name: t.name, shape: t.shape, color: t.color, value: t.value, world: t.world,
      explosive: !!t.explosive, golden, hp, maxHp: hp, hitCd: 0, shake: 0, bonusMult: t.bonusMult || 1,
      rot: (t.shape === 'building' || t.shape === 'house' || t.shape === 'mountain') ? 0 : rand(-0.5, 0.5),
      seed: Math.random(),
    });
  }

  pickType() {
    const r = this.p.r, w = this.world;
    const cands = []; let total = 0;
    for (let wi = w - 1; wi <= w + 1; wi++) {
      const W = C.WORLDS[wi]; if (!W) continue;
      for (const t of W.objects) {
        const rel = t.size / r;
        if (rel < C.SPAWN.minRel || rel > C.SPAWN.maxRel) continue;
        let wt = Math.exp(-Math.pow(Math.log(rel / 0.6), 2) / (2 * 0.75 * 0.75));
        if (wi === w + 1) wt *= C.SPAWN.nextWorldPeek;
        if (wi === w - 1) wt *= 0.6;
        cands.push({ t, wi, wt }); total += wt;
      }
    }
    if (!cands.length) {
      // Endlos: nach der letzten Welt wachsen die Objekte einfach mit
      const W = C.WORLDS[C.WORLDS.length - 1];
      const t = W.objects[Math.floor(Math.random() * W.objects.length)];
      const size = r * rand(0.25, 1.6);
      return { ...t, size, world: C.WORLDS.length - 1, bonusMult: Math.sqrt(size / t.size) };
    }
    let k = Math.random() * total;
    for (const c of cands) { k -= c.wt; if (k <= 0) return { ...c.t, size: c.t.size * rand(0.85, 1.2), world: c.wi }; }
    const c = cands[cands.length - 1];
    return { ...c.t, world: c.wi };
  }

  mutationChoices() {
    const pool = C.MUTATIONS.filter(m => !this.muts.includes(m.id));
    const out = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return out;
  }

  chooseMutation(id) {
    if (id) this.muts.push(id);
    const ratio = this.p.rage / this.stats.rageMax;
    this.stats = computeStats(this.save, this.muts);
    this.p.rage = ratio * this.stats.rageMax;
    this.state = 'play';
  }

  // ------------------------------------------------------------------
  particle(x, y, color, size, life, vx, vy) {
    if (this.particles.length > 500) return;
    this.particles.push({ x, y, color, size, life, max: life, vx, vy, rot: Math.random() * TAU, vr: rand(-8, 8) });
  }
  text(x, y, s, color, life, vy) {
    if (this.texts.length > 40) return;
    this.texts.push({ x, y, s, color, life, max: life, vy });
  }

  die() {
    this.state = 'dying';
    this.dyingT = 1.1;
    this.sfx('die');
    const p = this.p;
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * TAU, v = rand(1, 4) * p.r;
      this.particle(p.x, p.y, i % 2 ? '#ff3d3d' : '#3a1010', p.r * rand(0.1, 0.3), rand(0.6, 1.2), Math.cos(a) * v, Math.sin(a) * v);
    }
  }

  finish() {
    this.state = 'over';
    const s = this.save;
    const earned = Math.floor(this.runScrap);
    const rec = { newWorld: this.world > (s.bestWorld || 0), newSize: this.maxRadius > (s.bestRadius || 0) };
    s.scrap += earned; s.totalScrap += earned; s.runs++;
    s.bestWorld = Math.max(s.bestWorld || 0, this.world);
    s.bestRadius = Math.max(s.bestRadius || 0, this.maxRadius);
    this.hooks.onEnd && this.hooks.onEnd({
      earned, kills: this.kills, time: this.time, world: this.world, maxRadius: this.maxRadius,
      bestCombo: this.bestCombo, muts: this.muts.slice(), ...rec,
    });
  }

  worldProgress() {
    const w = this.world, cur = C.WORLDS[w], next = C.WORLDS[w + 1];
    if (!next) return 1;
    const lo = Math.max(cur.minRadius, C.PLAYER.startRadius);
    return clamp(Math.log(this.p.r / lo) / Math.log(next.minRadius / lo), 0, 1);
  }
}

export function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return String(Math.floor(n));
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  if (n >= 1e36) return n.toExponential(2).replace('+', '');
  let i = -1;
  while (n >= 1000 && i < units.length - 1) { n /= 1000; i++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + units[i];
}
