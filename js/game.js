// =====================================================================
//  RAGEVERSE – Spiel-Logik (Simulation, keine Grafik)
// =====================================================================
import * as C from './config.js?v=0.2.2';

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function upgradeLevel(save, id) { return (save.upgrades && save.upgrades[id]) || 0; }
export function upgradeDef(id) { return C.UPGRADES.find(u => u.id === id); }
export function upgradeCost(u, level) { return Math.ceil(u.base * Math.pow(u.growth, level)); }

export function worldIndexFor(r) {
  let w = 0;
  for (let i = 0; i < C.WORLDS.length; i++) if (r >= C.WORLDS[i].minRadius) w = i;
  return w;
}

// Alle Spielerwerte aus Basiswerten + Upgrades + Mutationen
export function charDef(id) { return C.CHARACTERS.find(c => c.id === id) || C.CHARACTERS[0]; }
export function mapDef(id) { return C.MAPS.find(m => m.id === id) || C.MAPS[0]; }

export function computeStats(save, muts = [], charId = save.selectedChar) {
  const P = C.PLAYER, A = C.ABILITIES;
  const L = id => upgradeLevel(save, id);
  const per = id => upgradeDef(id).per;
  const has = id => muts.includes(id);
  const k = charDef(charId).perks || {};
  const pk = (name, def = 1) => (k[name] ?? def);
  return {
    startRadius: P.startRadius * (1 + per('size') * L('size')) * pk('size'),
    rageMax: P.rageMax * (1 + per('rage') * L('rage')) * pk('rage'),
    rageDrain: P.rageDrain * Math.pow(1 - per('calm'), L('calm')) * (has('zen') ? 0.7 : 1),
    damage: P.damage * (1 + per('dmg') * L('dmg')) * (has('spikes') ? 1.6 : 1) * pk('damage'),
    breakRatio: P.breakRatio + per('hard') * L('hard') + (has('hardhead') ? 0.2 : 0),
    speed: P.speed * (1 + per('speed') * L('speed')) * (has('turbo') ? 1.3 : 1) * pk('speed'),
    absorb: P.absorb * (1 + per('absorb') * L('absorb')) * (has('glutton') ? 1.4 : 1) * pk('absorb'),
    scrapMult: (1 + per('scrap') * L('scrap')) * (has('greed') ? 1.6 : 1) * C.SCRAP_SCALE * pk('scrap'),
    magnet: P.magnet + per('magnet') * L('magnet') + pk('magnet', 0),
    dashCooldown: P.dashCooldown * Math.pow(1 - per('dash'), L('dash')) * (has('dashmore') ? 0.5 : 1) * pk('dash'),
    dashDamage: has('dashmore') ? 2 : 1,
    slamCooldown: A.slam.cooldown * Math.pow(1 - per('slam'), L('slam')),
    slamRadius: A.slam.radius * (1 + per('slam') * L('slam')),
    slamDamage: A.slam.damage * pk('slam'),
    boomMult: pk('boom'),
    comboWindow: C.COMBO.window * (has('frenzy') ? 2 : 1),
    goldenChance: C.GOLDEN_CHANCE * (has('golden') ? 4 : 1) * pk('golden'),
    berserkGain: (1 + per('berserk') * L('berserk')) * (has('rager') ? 2 : 1) * pk('berserk'),
    berserkTime: C.BERSERK.duration + pk('berserkTime', 0),
    hazardMult: (has('armor') ? 0.5 : 1) * pk('hazard'),
  };
}

export class Game {
  constructor(save, hooks = {}) {
    this.save = save;
    this.hooks = hooks;
    this.state = 'idle';
    this.vw = 800; this.vh = 600;
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.clear();
  }

  clear() {
    this.objects = []; this.coins = []; this.particles = []; this.chunks = []; this.puffs = [];
    this.decals = []; this.texts = []; this.rings = []; this.meteors = []; this.explosionQueue = [];
  }

  hook(name, ...a) { const f = this.hooks[name]; if (f) f(...a); }
  sfx(name, v = 1) { this.hook('sfx', name, v); }

  start(opts = {}) {
    this.map = mapDef(opts.map || this.save.selectedMap);
    this.worlds = this.map.worlds;
    this.char = charDef(opts.char || this.save.selectedChar);
    this.muts = [];
    this.stats = computeStats(this.save, this.muts, this.char.id);
    const r = opts.radius || this.stats.startRadius;
    this.p = {
      x: 0, y: 0, vx: 0, vy: 0, r, mass: r * r, rage: this.stats.rageMax,
      dashT: 0, dashCd: 0, dashX: 1, dashY: 0, lookX: 1, lookY: 0, face: 1, walk: 0,
      punchT: 0, punchX: 1, punchY: 0, hurtT: 0, hurtCd: 0,
      berserk: 0, berserkT: 0, squash: 0, slamCd: 0, slamT: 0,
    };
    this.world = worldIndexFor(r);
    this.startWorld = this.world;
    this.clear();
    this.time = 0; this.combo = 0; this.comboT = 0; this.bestCombo = 0; this.calloutIdx = 0;
    this.runScrap = 0; this.runChaos = 0; this.kills = 0; this.maxRadius = r;
    this.event = null; this.eventT = 0; this.nextEventAt = C.EVENTS.firstAfter;
    this.shockT = 0; this.meteorT = 0; this.spawnT = 0; this.shake = 0; this.dyingT = 0;
    this.hitStop = 0; this.flash = 0; this.coinChain = 0; this.coinChainT = 0;
    this.quest = null; this.questT = C.QUESTS.firstAfter; this.questsDone = 0;
    this.pendingWorlds = 0;
    this.cam.x = 0; this.cam.y = 0; this.cam.zoom = this.targetZoom();
    this.spawnTick(true);
    this.state = 'play';
  }

  // Nach der letzten Welt geht es endlos weiter: alle ×4 Größe zählt wie eine neue Welt
  endless() {
    const last = this.worlds.length - 1;
    if (this.world < last) return 0;
    return Math.max(0, Math.log(this.p.r / this.worlds[last].minRadius) / Math.log(4));
  }
  level(world) { return world + (world === this.worlds.length - 1 ? this.endless() : 0); }
  hpScale(world) { return Math.pow(C.WORLD_SCALING.hp, this.level(world)) * this.map.hpMult; }

  // effektiver Radius (Berserker macht größer)
  hr() { return this.p.r * (this.p.berserkT > 0 ? C.BERSERK.sizeBoost : 1); }
  breakLimit() {
    const glass = this.event && this.event.id === 'glass';
    return this.p.r * this.stats.breakRatio * (glass ? 1.4 : 1) * (this.p.berserkT > 0 ? C.BERSERK.breakBoost : 1);
  }
  targetZoom() { return (Math.min(this.vw, this.vh) * 0.05) / this.p.r; }
  viewRadius() { return Math.hypot(this.vw, this.vh) / 2 / this.cam.zoom; }

  // ------------------------------------------------------------------
  update(dt, input) {
    if (this.state === 'dying') {
      this.dyingT -= dt;
      this.updateFx(dt * 0.5);
      if (this.dyingT <= 0) this.finish();
      return;
    }
    if (this.state !== 'play') return;
    // Treffer-Stopp: kurzer Freeze bei großen Treffern
    if (this.hitStop > 0) { this.hitStop -= dt; this.updateCamera(dt); return; }

    const p = this.p, S = this.stats;
    this.time += dt;
    const berserk = p.berserkT > 0;

    this.updateEvents(dt);
    this.updateQuest(dt);

    // --- Bewegung
    p.dashCd = Math.max(0, p.dashCd - dt);
    if (input.dash && p.dashCd <= 0) {
      let dx = input.dx, dy = input.dy;
      if (Math.hypot(dx, dy) < 0.1) { dx = p.lookX; dy = p.lookY; }
      const l = Math.hypot(dx, dy) || 1;
      p.dashX = dx / l; p.dashY = dy / l; p.dashT = C.PLAYER.dashTime; p.dashCd = S.dashCooldown;
      p.squash = 1;
      this.sfx('dash');
      for (let i = 0; i < 5; i++) this.puff(p.x - p.dashX * p.r, p.y - p.dashY * p.r + p.r * 0.5, p.r * rand(0.3, 0.6), '#f4ead8');
    }
    input.dash = false;
    p.slamCd = Math.max(0, p.slamCd - dt);
    p.slamT = Math.max(0, p.slamT - dt);
    if (input.slam && p.slamCd <= 0) this.slam();
    input.slam = false;
    if (input.berserk && p.berserk >= 1 && p.berserkT <= 0) this.startBerserk();
    input.berserk = false;
    const maxV = S.speed * p.r * (berserk ? C.BERSERK.speedMult : 1);
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.vx = p.dashX * maxV * C.PLAYER.dashPower;
      p.vy = p.dashY * maxV * C.PLAYER.dashPower;
      if (Math.random() < 0.6) this.puff(p.x, p.y + p.r * 0.6, p.r * rand(0.25, 0.45), '#f4ead8');
    } else {
      const idle = Math.abs(input.dx) + Math.abs(input.dy) < 0.01;
      const k = Math.min(1, C.PLAYER.accel * (idle ? 2.2 : 1) * dt); // ohne Eingabe hart bremsen
      p.vx += (input.dx * maxV - p.vx) * k;
      p.vy += (input.dy * maxV - p.vy) * k;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > maxV * 0.1) {
      p.lookX = p.vx / sp; p.lookY = p.vy / sp;
      if (Math.abs(p.vx) > maxV * 0.08) p.face = p.vx > 0 ? 1 : -1;
    }
    p.walk += (sp / p.r) * dt * 2.2;
    p.punchT = Math.max(0, p.punchT - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.hurtCd = Math.max(0, p.hurtCd - dt);
    p.squash = Math.max(0, p.squash - dt * 5);

    // --- Berserker
    if (berserk) {
      p.berserkT -= dt;
      if (Math.random() < 0.5) this.particle(p.x + rand(-1, 1) * p.r, p.y - rand(0, 1.5) * p.r, Math.random() < 0.5 ? '#ff6a1f' : '#ffd23f', p.r * rand(0.12, 0.25), 0.5, 0, -p.r * 3, 'flame');
      if (p.berserkT <= 0) { p.berserkT = 0; p.berserk = 0; this.hook('onBerserk', false); }
    }

    // --- Wut
    const frenzy = this.event && this.event.id === 'frenzy';
    if (!frenzy && p.berserkT <= 0) p.rage -= S.rageDrain * this.map.drainMult * Math.pow(C.WORLD_SCALING.rageDrain, this.level(this.world)) * (1 + C.PLAYER.rageDrainGrowth * this.time) * dt;
    p.rage = Math.min(p.rage, S.rageMax);
    if (p.rage <= 0) { p.rage = 0; this.die(); return; }

    // --- Kombo
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) { this.combo = 0; this.calloutIdx = 0; } }
    if (this.coinChainT > 0) { this.coinChainT -= dt; if (this.coinChainT <= 0) this.coinChain = 0; }

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

    this.moveObjects(dt, maxV);
    this.magnetCrumbs(dt);
    this.collide();
    this.processExplosions();
    this.updateCoins(dt, sp);

    // --- Welt-Aufstieg
    while (this.world < this.worlds.length - 1 && p.r >= this.worlds[this.world + 1].minRadius) {
      this.world++;
      this.pendingWorlds++;
    }
    if (this.pendingWorlds > 0) {
      this.pendingWorlds--;
      p.rage = Math.min(S.rageMax, p.rage + S.rageMax * 0.5);
      this.flash = 1;
      this.sfx('levelup');
      this.state = 'mutation';
      this.hook('onWorld', this.world, this.mutationChoices());
    }

    // --- Spawning
    this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawnT = 0.2; this.spawnTick(false); }

    this.updateFx(dt);
  }

  updateEvents(dt) {
    const p = this.p;
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
      const e = pick(C.EVENTS.list);
      this.event = e; this.eventT = C.EVENTS.duration;
      this.hook('onEvent', e);
      this.sfx('event');
    }
    for (const m of this.meteors) {
      m.t -= dt;
      if (m.t <= 0) { this.explode(m.x, m.y, m.r, Math.pow(p.r, 1.5) * 2.2, true); }
    }
    this.meteors = this.meteors.filter(m => m.t > 0);
  }

  // ------------------------------------------------------------------
  // Mini-Aufträge
  // ------------------------------------------------------------------
  updateQuest(dt) {
    if (this.quest) {
      if (this.quest.type === 'combo' && this.combo >= this.quest.count) this.quest.progress = this.quest.count;
      if (this.quest.progress >= this.quest.count) this.completeQuest();
      return;
    }
    this.questT -= dt;
    if (this.questT <= 0) this.newQuest();
  }

  newQuest() {
    const p = this.p, lim = this.breakLimit();
    const names = {};
    for (const o of this.objects) {
      if (o.crate || o.size > lim || o.size < p.r * 0.3) continue;
      names[o.name] = (names[o.name] || 0) + 1;
    }
    const common = Object.entries(names).filter(([, n]) => n >= 2).map(([k]) => k);
    const r = Math.random();
    let q;
    if (common.length && r < 0.6) {
      const target = pick(common);
      const count = 5 + Math.floor(Math.random() * 6);
      q = { type: 'kill', target, count, label: `Zerstöre ${count}× ${target}` };
    } else if (r < 0.82) {
      const count = [12, 15, 20, 25][Math.min(3, this.questsDone)];
      q = { type: 'combo', count, label: `Schaffe eine ${count}er-Kombo` };
    } else {
      q = { type: 'boom', count: 3, label: 'Lass 3 Explosionen hochgehen' };
    }
    q.progress = 0;
    this.quest = q;
    this.hook('onQuest', q, false);
  }

  completeQuest() {
    const p = this.p, S = this.stats, q = this.quest;
    this.quest = null; this.questT = C.QUESTS.pause; this.questsDone++;
    p.rage = Math.min(S.rageMax, p.rage + S.rageMax * C.QUESTS.rageReward);
    this.addBerserk(C.QUESTS.berserkReward);
    const value = C.QUESTS.scrapReward * this.worlds[this.world].scrapMult * this.map.scrapMult * S.scrapMult * (1 + this.questsDone * 0.2);
    this.runChaos += C.CHAOS.questBonus * this.map.chaosMult;
    this.coinBurst(p.x, p.y, value, 12, true);
    this.flash = Math.max(this.flash, 0.35);
    this.sfx('quest');
    this.hook('onQuest', q, true);
  }

  // ------------------------------------------------------------------
  moveObjects(dt, playerMaxV) {
    const p = this.p, lim = this.breakLimit();
    const viewR = this.viewRadius() * 1.3;
    for (const o of this.objects) {
      if (!o.move) continue;
      const dxp = o.x - p.x, dyp = o.y - p.y, dp = Math.hypot(dxp, dyp);
      if (dp > viewR) continue;
      let v = o.speed * o.size;
      if (o.move === 'drive') {
        // fährt stur geradeaus
      } else if (o.move === 'wander') {
        o.wanderT -= dt;
        if (o.wanderT <= 0) { o.wanderT = rand(1, 3); o.heading = Math.random() * TAU; }
        o.vx += (Math.cos(o.heading) * v - o.vx) * Math.min(1, dt * 2);
        o.vy += (Math.sin(o.heading) * v - o.vy) * Math.min(1, dt * 2);
      } else if (o.move === 'flee') {
        const scared = dp < p.r * 7 && o.size <= lim * 1.3;
        if (scared && dp > 1e-6) {
          v = Math.min(v, playerMaxV * 0.72);
          const jitter = Math.sin(this.time * 7 + o.seed * 20) * 0.6;
          const ax = dxp / dp, ay = dyp / dp;
          const tx = ax * Math.cos(jitter) - ay * Math.sin(jitter), ty = ax * Math.sin(jitter) + ay * Math.cos(jitter);
          o.vx += (tx * v - o.vx) * Math.min(1, dt * 6);
          o.vy += (ty * v - o.vy) * Math.min(1, dt * 6);
          o.scared = 0.4;
        } else {
          o.wanderT -= dt;
          if (o.wanderT <= 0) { o.wanderT = rand(1, 3); o.heading = Math.random() * TAU; o.idle = Math.random() < 0.5; }
          const iv = o.idle ? 0 : v * 0.2;
          o.vx += (Math.cos(o.heading) * iv - o.vx) * Math.min(1, dt * 3);
          o.vy += (Math.sin(o.heading) * iv - o.vy) * Math.min(1, dt * 3);
          o.scared = Math.max(0, (o.scared || 0) - dt);
        }
      }
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (Math.abs(o.vx) > 1e-3) o.face = o.vx > 0 ? 1 : -1;
      o.anim += dt * Math.hypot(o.vx, o.vy) / Math.max(1, o.size) * 3;
    }
  }

  collide() {
    const p = this.p, S = this.stats;
    const glass = this.event && this.event.id === 'glass';
    const berserk = p.berserkT > 0;
    const R = this.hr();
    const limit = this.breakLimit();
    for (const o of this.objects) {
      if (o.dead) continue;
      const dx = o.x - p.x, dy = o.y - p.y;
      const d = Math.hypot(dx, dy);
      const minD = R + o.size * 0.8;
      if (d >= minD) continue;
      if (o.size < p.r * C.PLAYER.crumbRatio) { this.kill(o, 'touch'); continue; }
      const nx = d > 1e-6 ? dx / d : 1, ny = d > 1e-6 ? dy / d : 0;
      const breakable = o.size <= limit;
      if (breakable && o.hitCd <= 0) {
        const approach = Math.max(0, p.vx * nx + p.vy * ny);
        let impact = clamp(approach / (S.speed * p.r), 0.45, 1.3);
        if (p.dashT > 0) impact *= 2.5 * S.dashDamage;
        let dmg = S.damage * Math.pow(p.r, 1.5) * 0.6 * impact;
        if (glass) dmg *= 100;
        if (berserk) dmg *= C.BERSERK.damageMult;
        o.hp -= dmg; o.hitCd = 0.15; o.hitAnim = 1; o.flash = 1;
        p.punchT = 0.16; p.punchX = nx; p.punchY = ny;
        if (o.hp <= 0) { this.kill(o, 'hit'); continue; }
        this.sfx('hit', clamp(o.size / p.r, 0.2, 1));
        for (let i = 0; i < 4; i++) {
          const a = Math.atan2(-ny, -nx) + rand(-0.8, 0.8), v = rand(2, 5) * p.r;
          this.particle(o.x - nx * o.size * 0.7, o.y - ny * o.size * 0.7 - o.size * 0.4, i % 2 ? '#ffffff' : o.color, o.size * 0.12, 0.35, Math.cos(a) * v, Math.sin(a) * v, 'spark');
        }
      } else if (!breakable) {
        if (o.hazard && p.hurtCd <= 0 && !berserk) {
          const loss = S.rageMax * o.hazard / 100 * S.hazardMult;
          p.rage -= loss; p.hurtT = 0.45; p.hurtCd = 0.9;
          this.shake = Math.min(1.2, this.shake + 0.6);
          this.text(p.x, p.y - p.r * 2.2, 'AUA! −' + Math.round(o.hazard * S.hazardMult) + '% Wut', '#ff5a5a', 1.1, p.r * 0.8, true);
          this.sfx('hurt');
          // kräftiger Rückstoß
          p.vx = -nx * S.speed * p.r * 2.2; p.vy = -ny * S.speed * p.r * 2.2;
        } else if (o.hitCd <= 0) {
          o.hitCd = 0.6; o.hitAnim = 0.6;
          this.sfx('thud');
          this.text(o.x, o.y - o.size * 1.6, 'ZU GROSS', '#ffffff', 0.7, p.r * 0.6);
        }
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
    const rel = o.size / p.r;
    // Wachstum
    p.mass += o.size * o.size * S.absorb * Math.pow(C.WORLD_SCALING.absorb, this.level(this.world));
    p.r = Math.sqrt(p.mass);
    if (p.r > this.maxRadius) this.maxRadius = p.r;
    // Wut
    p.rage = Math.min(S.rageMax, p.rage + C.PLAYER.ragePerKill * clamp(Math.pow(rel, 0.7) * 1.6, 0.15, 3) + (o.crate ? S.rageMax * 0.15 : 0));
    // Berserker
    if (p.berserkT <= 0) this.addBerserk(C.BERSERK.perKill * clamp(rel * 1.5, 0.25, 2));
    // Kombo
    this.combo++; this.comboT = S.comboWindow;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    const co = C.COMBO.callouts;
    while (this.calloutIdx < co.length && this.combo >= co[this.calloutIdx][0]) {
      this.hook('onCallout', co[this.calloutIdx][1], this.calloutIdx);
      this.sfx('callout', this.calloutIdx);
      this.calloutIdx++;
    }
    const comboMult = Math.min(C.COMBO.max, 1 + this.combo * C.COMBO.perStep);
    // Auftrag
    if (this.quest && this.quest.type === 'kill' && o.name === this.quest.target) this.quest.progress++;
    // Schrott
    const w = this.worlds[o.world];
    this.runChaos += (C.CHAOS.perKill + (rel > 1 ? C.CHAOS.bigBonus * rel : 0)) * this.map.chaosMult;
    const value = o.value * w.scrapMult * this.map.scrapMult * comboMult * S.scrapMult * (o.golden ? C.GOLDEN_MULT : 1) * (o.bonusMult || 1) * (o.crate ? C.CRATE_MULT : 1);
    const n = o.crate ? 14 : clamp(Math.ceil(Math.sqrt(o.value) * (o.golden ? 2 : 1)), 1, 8);
    this.coinBurst(o.x, o.y, value, n, o.golden);
    if ((rel > 0.35 || o.golden || o.crate) && value >= 1) this.text(o.x, o.y - o.size * 1.4, '+' + fmt(value), o.golden || o.crate ? '#ffd23f' : '#fff3c4', 0.9, p.r * 0.7, rel > 0.8 || o.crate);
    // Trümmer
    const big = rel > 0.7;
    const nChunks = clamp(Math.round(4 + rel * 6), 3, 10);
    for (let i = 0; i < nChunks; i++) {
      const a = Math.random() * TAU, v = rand(1, 4) * o.size;
      this.chunks.push({
        x: o.x, y: o.y, z: o.size * rand(0.3, 1.2), vx: Math.cos(a) * v + p.vx * 0.3, vy: Math.sin(a) * v * 0.7 + p.vy * 0.3,
        vz: o.size * rand(3, 7), g: o.size * 22, size: o.size * rand(0.16, 0.34), color: i % 4 === 0 ? shadeHex(o.color, -0.25) : o.color,
        rot: Math.random() * TAU, vr: rand(-12, 12), life: rand(1, 1.6), max: 1.6, sides: 3 + (i % 3),
      });
    }
    const maxChunks = this.fx && this.fx.low ? 80 : 260;
    if (this.chunks.length > maxChunks) this.chunks.splice(0, this.chunks.length - maxChunks);
    for (let i = 0; i < (big ? 6 : 3); i++) this.puff(o.x + rand(-0.6, 0.6) * o.size, o.y + rand(-0.3, 0.3) * o.size, o.size * rand(0.4, 0.8), '#efe6d6');
    if (rel > 0.25) {
      this.decals.push({ x: o.x, y: o.y, size: o.size * 1.15, color: o.color, life: 14, max: 14, seed: Math.random() });
      if (this.decals.length > 70) this.decals.shift();
    }
    if (big) { this.shake = Math.min(1.1, this.shake + rel * 0.3); this.hitStop = Math.max(this.hitStop, 0.04); p.squash = 1; }
    if (cause !== 'touch') { this.sfx(o.crate ? 'crate' : 'break', clamp(rel, 0.2, 1.2)); p.punchT = Math.max(p.punchT, 0.12); }
    else if (Math.random() < 0.3) this.sfx('crumb');
    // Explosionen
    if (o.explosive) {
      this.explosionQueue.push({ x: o.x, y: o.y, r: o.size * 3.2 * S.boomMult, dmg: Math.pow(o.size, 1.5) * 2.5 * S.boomMult * this.hpScale(o.world), big: true });
      if (this.quest && this.quest.type === 'boom') this.quest.progress++;
    } else if (this.muts.includes('boom') && rel > 0.2) {
      this.explosionQueue.push({ x: o.x, y: o.y, r: o.size * 2 * S.boomMult, dmg: Math.pow(o.size, 1.5) * 1.5 * this.hpScale(o.world), big: false });
    }
  }

  addBerserk(amount) {
    const p = this.p;
    if (p.berserkT > 0) return;
    const was = p.berserk;
    p.berserk = Math.min(1, p.berserk + amount * this.stats.berserkGain);
    if (was < 1 && p.berserk >= 1) { this.sfx('ready'); this.hook('onBerserkReady'); }
  }

  startBerserk() {
    const p = this.p;
    p.berserkT = this.stats.berserkTime;
    this.hitStop = 0.12; this.flash = 0.8; this.shake = 1.2; p.squash = 1;
    this.rings.push({ x: p.x, y: p.y, r: p.r * 6, life: 0.6, max: 0.6, color: '#ff4a2a' });
    this.sfx('berserk');
    this.hook('onBerserk', true);
  }

  // Stampfer: Erdbeben um den Spieler
  slam() {
    const p = this.p, S = this.stats;
    p.slamCd = S.slamCooldown; p.slamT = 0.35; p.squash = 1;
    const R = p.r * S.slamRadius * (p.berserkT > 0 ? C.BERSERK.sizeBoost : 1);
    this.hitStop = Math.max(this.hitStop, 0.07);
    this.shake = Math.min(1.4, this.shake + 1);
    this.rings.push({ x: p.x, y: p.y, r: R, life: 0.5, max: 0.5, color: '#fff3c4', ground: true });
    this.rings.push({ x: p.x, y: p.y, r: R * 0.6, life: 0.35, max: 0.35, color: '#ffb13d', ground: true });
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; this.puff(p.x + Math.cos(a) * R * 0.7, p.y + Math.sin(a) * R * 0.5, p.r * rand(0.5, 0.9), '#efe6d6'); }
    this.sfx('slam');
    const dmg = Math.pow(p.r, 1.5) * S.slamDamage * S.damage * (p.berserkT > 0 ? C.BERSERK.damageMult : 1);
    this.explosionQueue.push({ x: p.x, y: p.y, r: R, dmg, big: false, maxSize: this.breakLimit(), silent: true });
    this.processExplosions();
  }

  coinBurst(x, y, value, n, golden) {
    const p = this.p;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, v = rand(1, 3.2) * p.r;
      this.coins.push({ x, y, z: p.r * 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, vz: p.r * rand(4, 7), g: p.r * 24,
        value: value / n, age: 0, life: 10, golden, spin: Math.random() * TAU });
    }
    if (this.coins.length > 400) this.coins.splice(0, this.coins.length - 400);
  }

  updateCoins(dt, sp) {
    const p = this.p, S = this.stats;
    const pick = p.r * 1.3, pull = this.magnetRange();
    for (const c of this.coins) {
      c.age += dt; c.life -= dt; c.spin += dt * 10;
      if (c.z > 0 || c.vz > 0) {
        c.vz -= c.g * dt; c.z += c.vz * dt;
        if (c.z <= 0) { c.z = 0; if (Math.abs(c.vz) > c.g * 0.08) c.vz = -c.vz * 0.35; else c.vz = 0; }
      }
      const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
      if (c.age > 0.3 && d < pick) {
        c.life = -1; this.runScrap += c.value;
        this.coinChain++; this.coinChainT = 0.45;
        this.sfx('coin', this.coinChain);
        continue;
      }
      if (c.age > 0.35 && d < pull) {
        const v = (p.r * 7 + sp) * dt * (1 + c.age);
        c.x += dx / d * Math.min(v, d); c.y += dy / d * Math.min(v, d);
      } else { c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= 0.93; c.vy *= 0.93; }
    }
    this.coins = this.coins.filter(c => c.life > 0);
  }

  magnetRange() { return this.p.r * (2.5 + this.stats.magnet * 2); }

  // Magnet saugt auch Krümel an
  magnetCrumbs(dt) {
    const S = this.stats;
    if (S.magnet <= 0) return;
    const p = this.p, R = this.magnetRange(), lim = p.r * C.PLAYER.crumbRatio * 1.6;
    for (const o of this.objects) {
      if (o.size > lim) continue;
      const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy);
      if (d < R && d > 1e-6) { const v = p.r * (2 + S.magnet * 1.2) * dt; o.x += dx / d * Math.min(v, d); o.y += dy / d * Math.min(v, d); o.pulled = 0.2; }
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
      if (!e.silent) this.rings.push({ x: e.x, y: e.y, r: e.r, life: 0.45, max: 0.45, color: e.big ? '#ffb13d' : '#ffffff' });
      if (e.big) {
        this.shake = Math.min(1.3, this.shake + 0.6);
        this.hitStop = Math.max(this.hitStop, 0.06);
        this.flash = Math.max(this.flash, 0.25);
        this.sfx('boom', 1);
        for (let i = 0; i < 16; i++) {
          const a = Math.random() * TAU, v = rand(1, 4) * e.r;
          this.particle(e.x, e.y, i % 3 === 0 ? '#ffffff' : i % 2 ? '#ff6a1f' : '#ffd23f', e.r * rand(0.06, 0.14), rand(0.3, 0.7), Math.cos(a) * v, Math.sin(a) * v, 'spark');
        }
        for (let i = 0; i < 6; i++) this.puff(e.x + rand(-0.4, 0.4) * e.r, e.y + rand(-0.3, 0.3) * e.r, e.r * rand(0.25, 0.45), '#5a4a44');
      }
      for (const o of this.objects) {
        if (o.dead || o.size > (e.maxSize || e.r * 1.1)) continue;
        const d = Math.hypot(o.x - e.x, o.y - e.y);
        if (d > e.r + o.size * 0.5) continue;
        o.hp -= e.dmg * (1 - 0.5 * clamp(d / e.r, 0, 1));
        o.hitAnim = 1; o.flash = 1;
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
    if (initial) { for (let i = 0; i < need; i++) this.spawnOne(p.r * 4, area); return; }
    // Lücken direkt um den Spieler füllen (z. B. nach dem Wachsen), sonst am Rand
    let near = 0;
    for (const o of this.objects) if (o.size >= p.r * C.SPAWN.minRel * 0.8 && Math.hypot(o.x - p.x, o.y - p.y) < viewR) near++;
    const nearTarget = C.SPAWN.density * Math.pow(1 / C.SPAWN.areaViews, 2) * 0.9;
    const nearNeed = Math.min(6, Math.ceil(nearTarget - near));
    for (let i = 0; i < nearNeed; i++) this.spawnOne(p.r * 3.5, viewR * 0.95, true);
    need = Math.min(need, 10);
    for (let i = 0; i < need; i++) this.spawnOne(viewR * 1.05, area);
  }

  spawnOne(minD, maxD, popIn = false) {
    const p = this.p;
    const crateChance = this.event && this.event.id === 'crates' ? 0.25 : C.CRATE_CHANCE;
    let t;
    if (Math.random() < crateChance) {
      const W = this.worlds[this.world];
      const avg = W.objects.reduce((s, o) => s + o.value, 0) / W.objects.length;
      t = { name: 'Schrottkiste', size: p.r * rand(0.45, 0.75), shape: 'crate', color: '#c98a3d', value: avg, world: this.world, crate: true };
    } else t = this.pickType();
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
    const golden = !t.crate && Math.random() < (evGold ? 0.3 : this.stats.goldenChance);
    const hp = Math.pow(t.size, 1.5) * this.hpScale(t.world) * (t.crate ? 0.5 : 1);
    const o = {
      x, y, size: t.size, name: t.name, shape: t.shape, color: t.color, value: t.value, world: t.world,
      explosive: !!t.explosive, golden, crate: !!t.crate, hp, maxHp: hp, hitCd: 0, hitAnim: 0, flash: 0, bonusMult: t.bonusMult || 1,
      move: t.move || null, speed: t.speed || 0, hazard: t.hazard || 0, vx: 0, vy: 0, heading: Math.random() * TAU, wanderT: 0, anim: Math.random() * 10,
      face: Math.random() < 0.5 ? -1 : 1, seed: Math.random(), scared: 0, pop: popIn ? 1 : 0,
    };
    if (o.move === 'drive') {
      const ground = this.worlds[t.world].ground;
      const a = ground === 'space' || ground === 'ocean' ? Math.random() * TAU : Math.floor(Math.random() * 4) * Math.PI / 2;
      o.vx = Math.cos(a) * o.speed * o.size; o.vy = Math.sin(a) * o.speed * o.size;
      o.face = o.vx >= 0 ? 1 : -1;
    }
    this.objects.push(o);
  }

  pickType() {
    const r = this.p.r, w = this.world;
    const cands = []; let total = 0;
    for (let wi = w - 1; wi <= w + 1; wi++) {
      const W = this.worlds[wi]; if (!W) continue;
      for (const t of W.objects) {
        const rel = t.size / r;
        if (rel < C.SPAWN.minRel || rel > C.SPAWN.maxRel) continue;
        let wt = Math.exp(-Math.pow(Math.log(rel / C.SPAWN.sweetSpot), 2) / (2 * 0.75 * 0.75));
        if (wi === w + 1) wt *= C.SPAWN.nextWorldPeek;
        if (wi === w - 1) wt *= 0.6;
        if (t.hazard) wt *= 0.6;
        cands.push({ t, wi, wt }); total += wt;
      }
    }
    if (!cands.length) {
      // Endlos: nach der letzten Welt wachsen die Objekte einfach mit
      const W = this.worlds[this.worlds.length - 1];
      const t = pick(W.objects);
      const size = r * rand(0.25, 1.6);
      return { ...t, size, world: this.worlds.length - 1, bonusMult: Math.min(64, Math.pow(size / t.size, 0.25)) };
    }
    let k = Math.random() * total;
    for (const c of cands) { k -= c.wt; if (k <= 0) return { ...c.t, size: c.t.size * rand(0.88, 1.15), world: c.wi }; }
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
    this.stats = computeStats(this.save, this.muts, this.char.id);
    this.p.rage = ratio * this.stats.rageMax;
    this.state = 'play';
  }

  // ------------------------------------------------------------------
  updateCamera(dt) {
    const p = this.p;
    const k = Math.min(1, dt * 8);
    this.cam.x += (p.x - this.cam.x) * k;
    this.cam.y += (p.y - p.r * 0.6 - this.cam.y) * k;
    const tz = this.targetZoom() / (p.berserkT > 0 ? 1.12 : 1);
    this.cam.zoom *= Math.pow(tz / this.cam.zoom, Math.min(1, dt * 2.5));
  }

  updateFx(dt) {
    this.updateCamera(dt);
    for (const q of this.particles) {
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      const f = q.kind === 'flame' ? 0.96 : 0.9; q.vx *= f; q.vy *= f;
    }
    this.particles = this.particles.filter(q => q.life > 0);
    for (const c of this.chunks) {
      c.life -= dt;
      c.vz -= c.g * dt; c.z += c.vz * dt;
      if (c.z <= 0) { c.z = 0; if (c.vz < 0) { c.vz = -c.vz * 0.35; c.vx *= 0.6; c.vy *= 0.6; c.vr *= 0.5; } }
      c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
    }
    this.chunks = this.chunks.filter(c => c.life > 0);
    for (const u of this.puffs) { u.life -= dt; u.r += u.grow * dt; u.y -= u.r * 0.3 * dt; }
    this.puffs = this.puffs.filter(u => u.life > 0);
    for (const d of this.decals) d.life -= dt;
    this.decals = this.decals.filter(d => d.life > 0);
    for (const t of this.texts) { t.life -= dt; t.y -= t.vy * dt; t.vy *= 0.94; }
    this.texts = this.texts.filter(t => t.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter(r => r.life > 0);
    for (const o of this.objects) {
      if (o.hitCd > 0) o.hitCd -= dt;
      if (o.hitAnim > 0) o.hitAnim = Math.max(0, o.hitAnim - dt * 6);
      if (o.flash > 0) o.flash = Math.max(0, o.flash - dt * 10);
      if (o.pop > 0) o.pop = Math.max(0, o.pop - dt * 3);
      if (!o.move) o.anim += dt;
    }
    this.shake = Math.max(0, this.shake - dt * 2.5);
    this.flash = Math.max(0, this.flash - dt * 3);
  }

  particle(x, y, color, size, life, vx, vy, kind = 'bit') {
    if (this.particles.length > (this.fx && this.fx.low ? 120 : 500)) return;
    if (this.fx && this.fx.low && Math.random() < 0.5) return;
    this.particles.push({ x, y, color, size, life, max: life, vx, vy, rot: Math.random() * TAU, vr: rand(-8, 8), kind });
  }
  puff(x, y, r, color) {
    if (this.puffs.length > (this.fx && this.fx.low ? 30 : 120)) return;
    this.puffs.push({ x, y, r, grow: r * rand(1.5, 2.5), life: rand(0.35, 0.6), max: 0.6, color });
  }
  text(x, y, s, color, life, vy, big = false) {
    if (this.texts.length > 40) this.texts.shift();
    this.texts.push({ x, y, s, color, life, max: life, vy, big });
  }

  die() {
    this.state = 'dying';
    this.dyingT = 1.2;
    this.sfx('die');
    const p = this.p;
    p.berserkT = 0;
    for (let i = 0; i < 14; i++) this.puff(p.x + rand(-1, 1) * p.r, p.y + rand(-0.5, 0.5) * p.r, p.r * rand(0.5, 1), '#3a2a2a');
  }

  finish() {
    this.state = 'over';
    const s = this.save;
    const earned = Math.floor(this.runScrap);
    const rec = { newWorld: this.world > (s.bestWorld || 0), newSize: this.maxRadius > (s.bestRadius || 0) };
    const chaos = Math.floor(this.runChaos);
    s.scrap += earned; s.totalScrap += earned; s.runs++;
    s.chaos = (s.chaos || 0) + chaos; s.totalChaos = (s.totalChaos || 0) + chaos;
    s.totalKills = (s.totalKills || 0) + this.kills;
    s.mapBest = s.mapBest || {};
    s.mapBest[this.map.id] = Math.max(s.mapBest[this.map.id] || 0, this.world);
    s.bestWorld = Math.max(s.bestWorld || 0, this.world);
    s.bestRadius = Math.max(s.bestRadius || 0, this.maxRadius);
    this.hook('onEnd', {
      earned, chaos, kills: this.kills, map: this.map.id, time: this.time, world: this.world, maxRadius: this.maxRadius,
      bestCombo: this.bestCombo, muts: this.muts.slice(), quests: this.questsDone, ...rec,
    });
  }

  worldProgress() {
    const w = this.world, cur = this.worlds[w], next = this.worlds[w + 1];
    if (!next) return 1;
    const lo = Math.max(cur.minRadius, C.PLAYER.startRadius);
    return clamp(Math.log(this.p.r / lo) / Math.log(next.minRadius / lo), 0, 1);
  }
}

export function shadeHex(hex, amt) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt < 0) { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  else { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
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
