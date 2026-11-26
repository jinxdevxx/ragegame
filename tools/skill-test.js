// Skill-Test: prüft, ob jedes Upgrade, jede Fähigkeit, jede Mutation und
// jedes Monster im Spiel wirklich etwas bewirkt.
// Aufruf: node tools/skill-test.js   (Exit-Code 1, wenn etwas nicht wirkt)
import * as C from '../js/config.js';
import { Game, prestigeGain, doPrestige, monsterData, addMonsterXp, raiseTalent, canRaiseTalent, talentFree, computeStats, runXp } from '../js/game.js';
import { defaultSave } from '../js/save.js';

const DT = 1 / 60;
let fails = 0, passes = 0;
function check(name, ok, info = '') {
  if (ok) { passes++; console.log(`  ✔ ${name}${info ? '  (' + info + ')' : ''}`); }
  else { fails++; console.log(`  ✘ ${name}${info ? '  (' + info + ')' : ''}`); }
}
const input = (o = {}) => ({ dx: 0, dy: 0, dash: false, slam: false, berserk: false, ...o });

// Testwelt ohne Zufall: keine Spawns, Events oder Aufträge
function makeGame(upg = {}, muts = [], char = 'grumpf') {
  const save = defaultSave();
  Object.assign(save.upgrades, upg);
  save.selectedChar = char;
  const g = new Game(save, {});
  g.vw = 1280; g.vh = 720;
  g.start();
  g.objects = []; g.coins = [];
  g.muts = muts.slice();
  g.chooseMutation(null);
  freeze(g);
  return g;
}
function freeze(g) { g.spawnT = 1e9; g.nextEventAt = 1e9; g.questT = 1e9; g.quest = null; g.event = null; }
function obj(g, x, y, size, extra = {}) {
  const hp = Math.pow(size, 1.5) * g.hpScale(g.world);
  const o = { x: g.p.x + x, y: g.p.y + y, size, name: 'Test', shape: 'rock', color: '#888', value: 5, world: g.world, explosive: false, golden: false, crate: false,
    hp, maxHp: hp, hitCd: 0, hitAnim: 0, flash: 0, bonusMult: 1, move: null, speed: 0, hazard: 0, vx: 0, vy: 0, heading: 0, wanderT: 0, anim: 0, face: 1, seed: 0.5, scared: 0, pop: 0, ...extra };
  g.objects.push(o); return o;
}
function run(g, secs, inp = input()) { for (let t = 0; t < secs; t += DT) { freeze(g); const i = { ...inp }; g.update(DT, i); } }

// ---------------------------------------------------------------- Upgrades
console.log('\nUpgrades (Stufe 0 gegen Stufe 5):');
const L = 5;
{
  const a = makeGame(), b = makeGame({ size: L });
  check('Startgröße', b.p.r > a.p.r * 1.3, `${a.p.r.toFixed(1)} → ${b.p.r.toFixed(1)}`);
}
{
  const a = makeGame(), b = makeGame({ rage: L });
  check('Wut-Tank', b.stats.rageMax > a.stats.rageMax * 1.2, `${a.stats.rageMax} → ${b.stats.rageMax}`);
}
{
  const a = makeGame(), b = makeGame({ calm: L });
  run(a, 2); run(b, 2);
  check('Dauerwut', b.p.rage > a.p.rage + 2, `Wut nach 2 s: ${a.p.rage.toFixed(1)} → ${b.p.rage.toFixed(1)}`);
}
{
  const hit = up => { const g = makeGame(up); const o = obj(g, g.p.r * 1.75, 0, g.p.r * 1.0); o.hp = o.maxHp = 1e12; run(g, 0.5, input({ dx: 1 })); return 1e12 - o.hp; };
  const a = hit({}), b = hit({ dmg: L });
  check('Wucht', b > a * 1.5, `Schaden ${a.toExponential(2)} → ${b.toExponential(2)}`);
}
{
  const a = makeGame(), b = makeGame({ hard: L });
  check('Härte', b.breakLimit() > a.breakLimit() * 1.2, `zerstörbar bis ${a.breakLimit().toFixed(1)} → ${b.breakLimit().toFixed(1)}`);
}
{
  const a = makeGame(), b = makeGame({ speed: L });
  run(a, 1, input({ dx: 1 })); run(b, 1, input({ dx: 1 }));
  check('Tempo', b.p.x > a.p.x * 1.2, `Strecke ${a.p.x.toFixed(0)} → ${b.p.x.toFixed(0)}`);
}
{
  const grow = up => { const g = makeGame(up); const r0 = g.p.r; const o = obj(g, g.p.r * 1.6, 0, g.p.r * 0.3); o.hp = 0.0001; run(g, 0.4, input({ dx: 1 })); return g.p.r - r0; };
  const a = grow({}), b = grow({ absorb: L });
  check('Hunger', b > a * 1.2, `Wachstum ${a.toFixed(3)} → ${b.toFixed(3)}`);
}
{
  const loot = up => { const g = makeGame(up); const o = obj(g, g.p.r * 1.6, 0, g.p.r * 0.6); o.hp = 0.0001; run(g, 0.3, input({ dx: 1 })); return g.coins.reduce((s, c) => s + c.value, 0) + g.runScrap; };
  const a = loot({}), b = loot({ scrap: L });
  check('Schrottgier', b > a * 1.5, `Schrott ${a.toFixed(2)} → ${b.toFixed(2)}`);
}
{
  const pull = up => {
    const g = makeGame(up);
    const d = g.p.r * 4.5;
    g.coins.push({ x: g.p.x + d, y: g.p.y, z: 0, vx: 0, vy: 0, vz: 0, g: 1, value: 10, age: 1, life: 10, golden: false, spin: 0 });
    const crumb = obj(g, d, g.p.r, g.p.r * 0.2);
    run(g, 2);
    return { got: g.runScrap > 0, crumbMoved: crumb.dead || Math.hypot(crumb.x - g.p.x, crumb.y - g.p.y) < d * 0.9 };
  };
  const a = pull({}), b = pull({ magnet: L });
  check('Magnet: Schrott', !a.got && b.got, `ohne: ${a.got ? 'eingesammelt' : 'liegt'}, mit: ${b.got ? 'eingesammelt' : 'liegt'}`);
  check('Magnet: Krümel', !a.crumbMoved && b.crumbMoved, `ohne: ${a.crumbMoved ? 'angezogen' : 'liegt'}, mit: ${b.crumbMoved ? 'angezogen' : 'liegt'}`);
}
{
  const a = makeGame(), b = makeGame({ dash: L });
  check('Ansturm (Abklingzeit)', b.stats.dashCooldown < a.stats.dashCooldown * 0.85, `${a.stats.dashCooldown.toFixed(2)} s → ${b.stats.dashCooldown.toFixed(2)} s`);
}
{
  const a = makeGame(), b = makeGame({ slam: L });
  check('Erdbeben', b.stats.slamCooldown < a.stats.slamCooldown && b.stats.slamRadius > a.stats.slamRadius, `${a.stats.slamCooldown.toFixed(1)} s / ${a.stats.slamRadius.toFixed(2)} → ${b.stats.slamCooldown.toFixed(1)} s / ${b.stats.slamRadius.toFixed(2)}`);
}
{
  const fill = up => { const g = makeGame(up); for (let i = 0; i < 10; i++) { const o = obj(g, g.p.r * (1.2 + i * 0.01), 0, g.p.r * 0.5); g.kill(o, 'hit'); } return g.p.berserk; };
  const a = fill({}), b = fill({ berserk: L });
  check('Berserker (Aufladung)', b > a * 1.3, `${(a * 100).toFixed(0)} % → ${(b * 100).toFixed(0)} %`);
}

{
  const a = makeGame(), b = makeGame({ chaosup: L });
  const ch = g => { const o = obj(g, g.p.r * 1.6, 0, g.p.r * 0.6); g.kill(o, 'hit'); return g.runChaos; };
  const x = ch(a), y = ch(b);
  check('Chaos-Rausch', y > x * 1.3, `Chaos ${x.toFixed(2)} → ${y.toFixed(2)}`);
}
{
  const a = makeGame(), b = makeGame({ luck: L });
  check('Gold-Riecher', b.stats.goldenChance > a.stats.goldenChance * 1.5, `${(a.stats.goldenChance * 100).toFixed(1)} % → ${(b.stats.goldenChance * 100).toFixed(1)} %`);
}
{
  const count = up => { const g = makeGame(up); let n = 0; for (let i = 0; i < 4000; i++) { g.objects = []; g.spawnOne(g.p.r * 3, g.p.r * 20); if (g.objects[0] && g.objects[0].crate) n++; } return n; };
  const a = count({}), b = count({ crates: L });
  check('Kistenfinder', b > a * 1.3, `Kisten pro 4000 Spawns: ${a} → ${b}`);
}
{
  const a = makeGame(), b = makeGame({ combo: L });
  check('Kettenreaktion', b.stats.comboWindow > a.stats.comboWindow && b.stats.comboMax > a.stats.comboMax, `${a.stats.comboWindow.toFixed(2)} s/×${a.stats.comboMax} → ${b.stats.comboWindow.toFixed(2)} s/×${b.stats.comboMax}`);
}
{
  const q = up => { const g = makeGame(up); g.quest = { type: 'combo', count: 1, progress: 1, label: 'x' }; g.completeQuest(); return g.coins.reduce((s, c) => s + c.value, 0); };
  const a = q({}), b = q({ quest: L });
  check('Auftragskiller', b > a * 1.5, `Belohnung ${a.toFixed(1)} → ${b.toFixed(1)}`);
}

// ---------------------------------------------------------------- Böser Masterplan (◆)
console.log('\nBöser Masterplan (Stufe 0 gegen 3):');
function dmGame(perks) { const save = defaultSave(); save.dmPerks = perks; const g = new Game(save, {}); g.vw = 1280; g.vh = 720; g.start(); return g; }
{
  const base = dmGame({});
  const t = [['dm_scrap', 'scrapMult'], ['dm_power', 'damage'], ['dm_growth', 'absorb'], ['dm_rage', 'rageMax'], ['dm_start', 'startRadius'], ['dm_chaos', 'chaosMult']];
  for (const [id, stat] of t) { const g = dmGame({ [id]: 3 }); check(C.DM_PERKS.find(d => d.id === id).name, g.stats[stat] > base.stats[stat] * 1.1, `${stat} ${base.stats[stat].toFixed(2)} → ${g.stats[stat].toFixed(2)}`); }
  const m = dmGame({ dm_mut: 2 });
  check('Genlabor', m.muts.length === 2, `${m.muts.length} Start-Mutationen`);
}
{
  const s = defaultSave(); s.upgrades = { dmg: 10, size: 10 }; s.scrap = 999; s.cycleBest = 6; s.cycleScrap = 5e9; s.chaos = 77; s.dmPerks = { dm_keep: 2 };
  const gain = prestigeGain(s);
  const got = doPrestige(s);
  check('Urknall gibt Dunkle Materie', got > 0 && s.darkMatter === got && got === gain, `+${got} ◆`);
  check('Urknall setzt Schrott zurück', s.scrap === 0 && s.cycleScrap === 0 && s.cycleBest === 0);
  check('Schurken-Erbe behält Upgrade-Stufen', s.upgrades.dmg === 2 && s.upgrades.size === 2, `dmg 10 → ${s.upgrades.dmg}`);
  check('Urknall behält Chaos', s.chaos === 77);
  const s2 = defaultSave(); s2.cycleBest = 3; s2.cycleScrap = 1e9;
  check('Urknall erst ab dem Kontinent', prestigeGain(s2) === 0);
}

{
  // Magnet darf keine Objekte anziehen, die dich wegschubsen (nur Krümel)
  const g = makeGame({ magnet: 10 });
  const o = obj(g, g.p.r * 3, 0, g.p.r * 0.45); o.hp = o.maxHp = 1e12;
  const x0 = o.x; run(g, 1);
  check('Magnet zieht keine schweren Objekte an', Math.abs(o.x - x0) < 1e-6 && Math.abs(g.p.x) < 0.5, `Objekt bewegt ${(o.x - x0).toFixed(2)}, Spieler ${g.p.x.toFixed(2)}`);
}
{
  // Gegen ein Objekt laufen, das mehrere Schläge braucht: nicht wegprallen
  const g = makeGame(); const o = obj(g, g.p.r * 1.9, 0, g.p.r * 0.9); o.hp = o.maxHp = 1e12;
  let minX = 0; for (let t = 0; t < 1; t += DT) { freeze(g); g.update(DT, input({ dx: 1 })); minX = Math.min(minX, g.p.x); }
  check('Kein Wegprallen an zerstörbaren Objekten', minX > -0.5 && g.p.vx >= -1, `kleinste x-Position ${minX.toFixed(2)}`);
}

// ---------------------------------------------------------------- Fähigkeiten
console.log('\nFähigkeiten:');
{
  const g = makeGame();
  run(g, 0.1, input({ dash: true, dx: 1 }));
  const x = g.p.x;
  const h = makeGame(); run(h, 0.1, input({ dx: 1 }));
  check('Ansturm bewegt schnell nach vorne', x > h.p.x * 2, `${h.p.x.toFixed(0)} → ${x.toFixed(0)}`);
  check('Ansturm hat Abklingzeit', g.p.dashCd > 0, `${g.p.dashCd.toFixed(2)} s`);
}
{
  const g = makeGame();
  const near = [obj(g, g.p.r * 2.5, 0, g.p.r * 0.6), obj(g, -g.p.r * 2.5, 0, g.p.r * 0.6), obj(g, 0, g.p.r * 2.5, g.p.r * 0.5)];
  const far = obj(g, g.p.r * 12, 0, g.p.r * 0.6);
  const big = obj(g, 0, -g.p.r * 2.6, g.p.r * 2.5);
  run(g, 0.05, input({ slam: true }));
  check('Stampfer zerstört Objekte in der Nähe', near.every(o => o.dead), near.map(o => o.dead ? 'kaputt' : 'heil').join(', '));
  check('Stampfer trifft nichts außer Reichweite', !far.dead);
  check('Stampfer zerstört nichts, was zu groß ist', !big.dead);
  check('Stampfer hat Abklingzeit', g.p.slamCd > 0, `${g.p.slamCd.toFixed(1)} s`);
}
{
  const g = makeGame();
  run(g, 0.05, input({ berserk: true }));
  check('Berserker startet NICHT ohne volle Leiste', g.p.berserkT === 0);
  g.p.berserk = 1;
  const rage0 = g.p.rage;
  run(g, 0.05, input({ berserk: true }));
  check('Berserker startet mit voller Leiste + R', g.p.berserkT > 0);
  run(g, 1);
  check('Berserker: keine Wut-Abnahme', g.p.rage >= rage0 - 0.01);
  check('Berserker: größere Trefferzone', g.hr() > g.p.r * 1.1);
  // Ende + Abklingzeit: Kills laden weiter (halbe Rate), Zünden erst nach der Abklingzeit, Auftrags-Ladung geht nie verloren
  g.addBerserk(C.QUESTS.berserkReward, true); // Auftrag während Berserker
  run(g, g.p.berserkT + 0.1);
  const banked = g.p.berserk;
  check('Berserker: Auftrags-Ladung im Berserker bleibt erhalten', banked > 0.1, `${(banked * 100).toFixed(0)} % nach Ende`);
  const b0 = g.p.berserk; for (let i = 0; i < 6; i++) { const o = obj(g, g.p.r * 1.2, 0, g.p.r * 0.5); g.kill(o, 'hit'); }
  check('Berserker: lädt in der Abklingzeit weiter', g.p.berserkCd > 0 && g.p.berserk > b0, `${(b0 * 100).toFixed(0)} → ${(g.p.berserk * 100).toFixed(0)} %`);
  g.p.berserk = 1; run(g, 0.05, input({ berserk: true }));
  check('Berserker: zündet nicht während der Abklingzeit', g.p.berserkT === 0);
  run(g, C.BERSERK.cooldown + 0.1); run(g, 0.05, input({ berserk: true }));
  check('Berserker: zündet nach der Abklingzeit', g.p.berserkT > 0);
}

// ---------------------------------------------------------------- Mutationen
console.log('\nMutationen:');
const base = makeGame();
for (const m of C.MUTATIONS) {
  const g = makeGame({}, [m.id]);
  const S = g.stats, B = base.stats;
  let ok = false, info = '';
  switch (m.id) {
    case 'boom': { const o = obj(g, g.p.r * 1.5, 0, g.p.r * 0.6); const n = obj(g, g.p.r * 2.3, 0, g.p.r * 0.4); g.kill(o, 'hit'); g.processExplosions(); ok = n.dead; info = 'Nachbar mitgerissen'; break; }
    case 'hole': { const o = obj(g, g.p.r * 3, 0, g.p.r * 0.5); const tough = obj(g, -g.p.r * 3, 0, g.p.r * 0.5); tough.hp = tough.maxHp = 1e12; const tx = tough.x; run(g, 1.5); const mg = makeGame({ magnet: 5 }), mh = makeGame({ magnet: 5 }, ['hole']); const far = obj(g, g.p.r * 7.5, g.p.r * 2, g.p.r * 0.5); run(g, 2.5);
      ok = o.dead && far.dead && tough.x === tx && Math.abs(g.p.x) < 1 && g.magnetRange() > base.magnetRange() && mh.magnetRange() > mg.magnetRange();
      info = `frisst Fressbares, lässt Zähes liegen, Magnet-Radius ${(base.magnetRange() / base.p.r).toFixed(1)}→${(g.magnetRange() / g.p.r).toFixed(1)} R, mit Magnet-Upgrade ${(mg.magnetRange() / mg.p.r).toFixed(1)}→${(mh.magnetRange() / mh.p.r).toFixed(1)} R`; break; }
    case 'shock': { const o = obj(g, g.p.r * 2.5, 0, g.p.r * 0.5); run(g, 0.2); ok = o.dead; info = 'Druckwelle zerstört'; break; }
    case 'spikes': ok = S.damage > B.damage; break;
    case 'turbo': ok = S.speed > B.speed; break;
    case 'greed': ok = S.scrapMult > B.scrapMult; break;
    case 'zen': ok = S.rageDrain < B.rageDrain; break;
    case 'glutton': ok = S.absorb > B.absorb; break;
    case 'hardhead': ok = S.breakRatio > B.breakRatio; break;
    case 'frenzy': ok = S.comboWindow > B.comboWindow; break;
    case 'dashmore': ok = S.dashCooldown < B.dashCooldown && S.dashDamage > B.dashDamage; break;
    case 'golden': ok = S.goldenChance > B.goldenChance; break;
    case 'rager': ok = S.berserkGain > B.berserkGain; break;
    case 'armor': ok = S.hazardMult < B.hazardMult; break;
    default: info = 'kein Test definiert';
  }
  check(`${m.name}`, ok, info);
}

// ---------------------------------------------------------------- Monster
console.log('\nMonster:');
for (const ch of C.CHARACTERS) {
  if (!Object.keys(ch.perks).length) { check(`${ch.name} (Standard)`, true); continue; }
  const g = makeGame({}, [], ch.id), S = g.stats, B = base.stats;
  const diffs = [];
  for (const k of Object.keys(S)) if (Math.abs(S[k] - B[k]) > 1e-9) diffs.push(k);
  check(`${ch.name}`, diffs.length >= Object.keys(ch.perks).length - 0, diffs.join(', '));
}

// ---------------------------------------------------------------- Hindernisse
console.log('\nHindernisse:');
{
  const g = makeGame();
  obj(g, g.p.r * 2.2, 0, g.p.r * 1.6, { hazard: 15 });
  const r0 = g.p.rage;
  run(g, 0.4, input({ dx: 1 }));
  check('Hindernis zieht Wut ab', g.p.rage < r0 - 10, `${r0.toFixed(0)} → ${g.p.rage.toFixed(0)}`);
}
{
  const g = makeGame({}, ['armor']);
  obj(g, g.p.r * 2.2, 0, g.p.r * 1.6, { hazard: 15 });
  const r0 = g.p.rage;
  run(g, 0.4, input({ dx: 1 }));
  const a = makeGame(); obj(a, a.p.r * 2.2, 0, a.p.r * 1.6, { hazard: 15 }); const a0 = a.p.rage; run(a, 0.4, input({ dx: 1 }));
  check('Panzerhaut halbiert Hindernis-Schaden', (r0 - g.p.rage) < (a0 - a.p.rage) * 0.7);
}

// ---------------------------------------------------------------- Monster-Skills (Taste F)
console.log('\nMonster-Skills (F):');
function charGame(id) { const g = makeGame({}, [], id); return g; }
const ring = (g, n, dist, size, extra = {}) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return obj(g, Math.cos(a) * g.p.r * dist, Math.sin(a) * g.p.r * dist, g.p.r * size, extra); });
{
  const g = charGame('grumpf'); g.p.rage = 30; g.useSkill();
  const o = obj(g, g.p.r * 1.5, 0, g.p.r * 0.5); o.hp = 1e-9; g.kill(o, 'hit'); const withRoar = g.coins.reduce((s, c) => s + c.value, 0);
  const h = charGame('grumpf'); const o2 = obj(h, h.p.r * 1.5, 0, h.p.r * 0.5); o2.hp = 1e-9; h.kill(o2, 'hit'); const without = h.coins.reduce((s, c) => s + c.value, 0);
  check('Grumpf · Wutschrei: Wut + doppelter Schrott', g.p.rage > 60 && withRoar > without * 1.8, `Wut 30 → ${g.p.rage.toFixed(0)}, Schrott ×${(withRoar / without).toFixed(2)}`);
}
{
  const g = charGame('stachel'); const os = ring(g, 8, 4, 0.5); g.useSkill(); run(g, 1);
  check('Stachelkönig · Stachelhagel: zerlegt Objekte rundum', os.filter(o => o.dead).length >= 6, `${os.filter(o => o.dead).length}/8 zerstört`);
}
{
  const g = charGame('flitzer'), h = charGame('flitzer'); g.useSkill(); run(g, 1, input({ dx: 1 })); run(h, 1, input({ dx: 1 }));
  check('Flitzer · Schallmauer: schneller', g.p.x > h.p.x * 1.08, `Strecke ${h.p.x.toFixed(0)} → ${g.p.x.toFixed(0)}`);
  const k = charGame('flitzer'); const os = ring(k, 8, 1.9, 0.5); os.forEach(o => { o.hp = o.maxHp = k.oneHit() * 2; }); k.useSkill(); run(k, 0.9);
  check('Flitzer · Schallmauer: Überschall-Ringe zerlegen Zähes rundum', os.filter(o => o.dead).length >= 6, `${os.filter(o => o.dead).length}/8`);
}
{
  const g = charGame('golem'); g.useSkill(); run(g, 0.4); const os = [obj(g, 0, 0, g.p.r * 0.5)]; os[0].x = g.p.x; os[0].y = g.p.y + g.p.r * 0.2; os[0].hp = os[0].maxHp = g.oneHit() * 2; run(g, 1.5);
  check('Magma-Golem · Lava-Spur: schmilzt Objekte in der Lava', os[0].dead, os[0].dead ? 'geschmolzen' : 'heil');
}
{
  const g = charGame('goldzahn'); const os = ring(g, 6, 5, 0.5); g.useSkill();
  check('Goldzahn · Goldregen: Objekte im Sichtfeld werden golden', os.every(o => o.golden));
}
{
  const g = charGame('void'); g.p.lookX = 1; g.p.lookY = 0; const os = [obj(g, g.p.r * 6, g.p.r * 2, 0.5 * 1), obj(g, g.p.r * 4, -g.p.r * 3, 0.5)]; os.forEach(o => { o.size = g.p.r * 0.5; o.hp = o.maxHp = g.oneHit() * 2; }); g.useSkill(); run(g, 3);
  check('Void · Singularität: saugt ein und frisst', os.every(o => o.dead), `${os.filter(o => o.dead).length}/2 gefressen`);
}
{
  const g = charGame('frost'); const mover = obj(g, g.p.r * 5, 0, g.p.r * 0.5, { move: 'drive', speed: 2, vx: 50, vy: 0 }); const hz = obj(g, g.p.r * 2.2, 0, g.p.r * 1.6, { hazard: 15 }); const x0 = mover.x; g.useSkill();
  const r0 = g.p.rage; run(g, 0.6, input({ dx: 1 }));
  check('Frostbeule · Eiszeit: alles steht still, Hindernisse harmlos', mover.x === x0 && g.p.rage > r0 - 6, `Objekt bewegt ${(mover.x - x0).toFixed(1)}, Wut ${r0.toFixed(0)} → ${g.p.rage.toFixed(0)}`);
}
{
  const g = charGame('kraken'); const os = ring(g, 14, 5, 0.6); os.forEach(o => { o.hp = o.maxHp = 1e12; }); g.useSkill();
  check('Kraken · Tentakelgriff: zerquetscht 10 Objekte (auch zähe)', os.filter(o => o.dead).length === 10, `${os.filter(o => o.dead).length}/14`);
}
{
  const g = charGame('mecha'); const os = ring(g, 16, 6, 0.5); g.useSkill(); run(g, 1.8);
  check('Mecha-Rex · Raketensalve: sprengt 16 Ziele im Sichtfeld', os.filter(o => o.dead).length >= 13, `${os.filter(o => o.dead).length}/16`);
}
{
  const g = charGame('phoenix'); const os = ring(g, 8, 2.6, 1.3); os.forEach(o => { o.hp = o.maxHp = g.oneHit() * 4; }); g.p.rage = 20; const r0 = g.p.rage; g.useSkill(); run(g, 2);
  check('Phönix · Phönixfeuer: Flammenkranz verbrennt auch Großes (130 %) + Wut zurück', os.every(o => o.dead) && g.p.rage > r0 - 5, `${os.filter(o => o.dead).length}/8, Wut ${r0.toFixed(0)} → ${g.p.rage.toFixed(0)}`);
  const h = charGame('phoenix'); h.p.rage = 0.001; run(h, 0.2);
  check('Phönix · Wiedergeburt (einmal pro Run)', h.state === 'play' && h.p.rage > 10 && h.p.revived);
}
{
  const g = charGame('infernus'); const big = ring(g, 6, 3, 1.3); big.forEach(o => { o.hp = o.maxHp = g.oneHit() * 2; }); g.useSkill(); run(g, 1);
  check('Infernus · Höllenfeuer: sprengt auch zu große Objekte', big.filter(o => o.dead).length >= 5, `${big.filter(o => o.dead).length}/6 (130 % deiner Größe)`);
}
{
  const g = charGame('urzorn'); const os = ring(g, 10, 7, 0.6); os.forEach(o => { o.hp = o.maxHp = g.oneHit() * 3; }); const b0 = g.p.berserk; g.useSkill(); run(g, 0.2);
  check('Urzorn · Urknall-Faust: zerstört alles Zerstörbare in Sicht + Berserker', os.filter(o => o.dead).length >= 9 && g.p.berserk > b0, `${os.filter(o => o.dead).length}/10, Berserker +${((g.p.berserk - b0) * 100).toFixed(0)} %`);
}
check('Hölle-Sonder-Skin ist nicht käuflich', C.SKINS.find(k => k.id === 'hell').special === 'boss' && !C.SKINS.find(k => k.id === 'hell').cost);
check('Jedes Monster hat einen Skill', C.CHARACTERS.every(c => c.skill && c.skill.id && c.skill.cd > 0));

// ---------------------------------------------------------------- Mutationen ausgeschöpft
console.log('\nAlle Mutationen vergeben:');
{
  const g = makeGame({}, C.MUTATIONS.map(m => m.id));
  const ch = g.mutationChoices();
  check('Auswahl nie leer – stapelbare Verstärkungen', ch.length === 3 && ch.every(c => c.stack), ch.map(c => c.name).join(', '));
  const a = makeGame({}, ['b_dmg']), b = makeGame({}, ['b_dmg', 'b_dmg', 'b_scrap']), base0 = makeGame();
  check('Verstärkungen stapeln sich', b.stats.damage > a.stats.damage && a.stats.damage > base0.stats.damage && b.stats.scrapMult > base0.stats.scrapMult, `Schaden ×${(b.stats.damage / base0.stats.damage).toFixed(2)}`);
  // Welt-Aufstieg mit allen Mutationen: Spiel muss weiterlaufen können
  const h = makeGame({}, C.MUTATIONS.map(m => m.id)); let offered = null; h.hooks = { onWorld: (w, c) => { offered = c; } };
  h.p.mass = Math.pow(C.WORLDS[1].minRadius * 1.1, 2); h.p.r = Math.sqrt(h.p.mass); run(h, 0.05);
  check('Welt-Aufstieg mit allen Mutationen bietet Auswahl an', h.state === 'mutation' && offered && offered.length === 3);
}

// ---------------------------------------------------------------- Monster-Level & Talente
console.log('\nMonster-Level & Talente:');
{
  const s = defaultSave();
  let total = 0; for (let L = 1; L < C.MONSTER_LEVEL.max; L++) total += C.MONSTER_LEVEL.xpFor(L);
  const mid = runXp(1500, 6, 6), runs = Math.round(total / mid);
  check('Level 99 braucht viele Runs (Grind)', runs > 150 && runs < 600, `${total} EP gesamt, ~${runs} Runs à ${mid} EP`);
  addMonsterXp(s, 'grumpf', 500);
  const m = monsterData(s, 'grumpf');
  check('EP geben Level + Talentpunkte', m.lvl > 1 && talentFree(s, 'grumpf') === m.lvl - 1, `Lvl ${m.lvl}, ${talentFree(s, 'grumpf')} Punkte`);
  check('Skill-Meister erst ab Level 15 gesperrt', !canRaiseTalent(s, 'grumpf', 'mastery'));
  const b0 = computeStats(s, [], 'grumpf'); raiseTalent(s, 'grumpf', 'power'); raiseTalent(s, 'grumpf', 'hunger');
  const b1 = computeStats(s, [], 'grumpf');
  check('Kraft + Hunger wirken', b1.damage > b0.damage && b1.absorb > b0.absorb, `Schaden ×${(b1.damage / b0.damage).toFixed(3)}`);
  addMonsterXp(s, 'goldzahn', 1e9);
  const g = monsterData(s, 'goldzahn'); check('Level-Obergrenze 99', g.lvl === 99, `Lvl ${g.lvl}`);
  const z0 = computeStats(s, [], 'goldzahn'); for (let i = 0; i < 25; i++) raiseTalent(s, 'goldzahn', 'sig');
  for (let i = 0; i < 25; i++) raiseTalent(s, 'goldzahn', 'mastery');
  const z1 = computeStats(s, [], 'goldzahn');
  check('Signatur (Goldgier) + Skill-Meister wirken', z1.scrapMult > z0.scrapMult * 1.4 && z1.skillCdMult < 0.8, `Schrott ×${(z1.scrapMult / z0.scrapMult).toFixed(2)}, Abklingzeit ×${z1.skillCdMult.toFixed(2)}`);
  let maxed = 0; for (const T of C.TALENTS) for (let i = 0; i < 30; i++) if (raiseTalent(s, 'goldzahn', T.id)) maxed++;
  check('Talente gedeckelt (max. 25 Ränge, nur verfügbare Punkte)', talentFree(s, 'goldzahn') >= 0 && C.TALENTS.every(T => (monsterData(s, 'goldzahn').pts[T.id] || 0) <= T.max));
  check('Jedes Monster hat ein Signatur-Talent', C.CHARACTERS.every(c => C.SIGNATURES[c.id]));
  // Run gibt EP an das gespielte Monster
  const gg = makeGame(); gg.kills = 300; gg.questsDone = 2; gg.world = 2; const lv0 = monsterData(gg.save, 'grumpf').xp + monsterData(gg.save, 'grumpf').lvl * 1e6; let endS = null; gg.hooks = { onEnd: x => { endS = x; } }; gg.finish();
  check('Run-Ende vergibt EP', endS && endS.xp > 0 && monsterData(gg.save, 'grumpf').xp + monsterData(gg.save, 'grumpf').lvl * 1e6 > lv0, `+${endS && endS.xp} EP`);
}

// ---------------------------------------------------------------- Skill-Evolutionen
console.log('\nSkill-Evolutionen:');
function evoGame(evos) { const save = defaultSave(); save.evos = evos; const g = new Game(save, {}); g.vw = 1280; g.vh = 720; g.start(); g.objects = []; freeze(g); return g; }
{
  const g = evoGame({ dash1: true }); const o = obj(g, g.p.r * 3, g.p.r * 1.4, g.p.r * 0.5); o.hp = o.maxHp = g.oneHit() * 2;
  run(g, 0.05, input({ dash: true, dx: 1 })); run(g, 0.4); o.x = g.lava[0] ? g.lava[0].x : o.x; o.y = g.lava[0] ? g.lava[0].y : o.y; run(g, 1);
  check('Flammen-Ansturm: Feuerspur verbrennt', g.lava.length > 0 || o.dead, `${o.dead ? 'verbrannt' : 'heil'}`);
}
{
  const g = evoGame({ dash1: true, dash2: true }); const os = ring(g, 6, 2.5, 0.6); os.forEach(o => { o.hp = o.maxHp = g.oneHit() * 2; });
  g.p.dashT = 0.01; g.p.dashX = 1; run(g, 0.1);
  check('Meteor-Ansturm: Explosion am Ende', os.filter(o => o.dead).length >= 4, `${os.filter(o => o.dead).length}/6`);
}
{
  const g = evoGame({ slam1: true }); const far = ring(g, 6, 4.6, 0.5); far.forEach(o => { o.hp = o.maxHp = g.oneHit() * 1.5; });
  const h = evoGame({}); const far2 = ring(h, 6, 4.6, 0.5); far2.forEach(o => { o.hp = o.maxHp = h.oneHit() * 1.5; });
  run(g, 0.05, input({ slam: true })); run(g, 0.6); run(h, 0.05, input({ slam: true })); run(h, 0.6);
  check('Nachbeben: zweite, größere Welle', far.filter(o => o.dead).length > far2.filter(o => o.dead).length, `${far2.filter(o => o.dead).length} → ${far.filter(o => o.dead).length} zerstört`);
}
{
  const g = evoGame({ slam1: true, slam2: true });
  g.coins.push({ x: g.p.x + g.p.r * 10, y: g.p.y, z: 0, vx: 0, vy: 0, vz: 0, g: 1, value: 10, age: 1, life: 10, golden: false, spin: 0 });
  run(g, 0.05, input({ slam: true })); obj(g, g.p.r * 2.2, 0, g.p.r * 1.6, { hazard: 15 }); let hurt = false; for (let t = 0; t < 1.2; t += DT) { freeze(g); g.update(DT, input({ dx: 1 })); if (g.p.hurtT > 0) hurt = true; }
  check('Erdspalter: Münzen fliegen zu dir, Hindernisse harmlos', g.runScrap > 0 && !hurt, `Schrott ${g.runScrap.toFixed(0)}, Treffer durch Hindernis: ${hurt ? 'ja' : 'nein'}`);
}
{
  const g = evoGame({ berserk1: true }); g.p.berserk = 1; run(g, 0.05, input({ berserk: true }));
  const o = obj(g, g.p.r * 2.2, 0, g.p.r * 1.0); o.hp = o.maxHp = 1e12; run(g, 0.5, input({ dx: 1 }));
  check('Titanenwut: zerbröselt alles bei Berührung', o.dead);
}
{
  const g = evoGame({ berserk1: true, berserk2: true }); g.p.berserk = 1; run(g, 0.05, input({ berserk: true })); const t0 = g.p.berserkT;
  for (let i = 0; i < 10; i++) { const o = obj(g, g.p.r * 1.5, 0, g.p.r * 0.5); g.kill(o, 'hit'); }
  check('Endloser Zorn: Zerstörung verlängert den Berserker', g.p.berserkT > t0 + 1, `${t0.toFixed(2)} s → ${g.p.berserkT.toFixed(2)} s`);
}

// ---------------------------------------------------------------- Run beenden
console.log('\nRun beenden:');
{
  const save = defaultSave(); const g = new Game(save, {}); g.vw = 1280; g.vh = 720; g.start(); g.objects = [];
  g.runScrap = 1234.6; g.runChaos = 55.2; g.p.rage = 0; g.die(); g.dyingT = 0; g.update(DT, input());
  check('Run beenden behält Schrott und Chaos', save.scrap === 1234 && save.chaos === 55 && g.state === 'over', `Schrott ${save.scrap}, Chaos ${save.chaos}`);
}

// ---------------------------------------------------------------- Endboss
console.log('\nEndboss ZORNOS (Welt 50):');
{
  const save = defaultSave(); C.UPGRADES.forEach(u => save.upgrades[u.id] = Math.min(u.max, 200));
  const g = new Game(save, {}); g.vw = 1280; g.vh = 720;
  g.start({ radius: C.WORLDS[C.BOSS.world].minRadius * 1.2 });
  g.objects = []; g.spawnT = 1e9;
  for (let t = 0; t < 0.2; t += DT) g.update(DT, input());
  check('Boss erscheint in Welt 50', !!g.boss, g.worlds[g.world].name);
  const rage0 = g.p.rage; g.boss.intro = 0; g.boss.attackT = 1e9;
  for (let t = 0; t < 3; t += DT) { g.spawnT = 1e9; g.boss.x = g.p.x + g.boss.size * 6; g.boss.y = g.p.y; g.update(DT, input()); }
  check('Wut sinkt im Bosskampf nicht (Wut = Leben)', Math.abs(g.p.rage - rage0) < 1e-6, `${rage0.toFixed(1)} → ${g.p.rage.toFixed(1)}`);
  { const r1 = g.p.rage; g.boss.x = g.p.x + g.boss.size * 0.5; g.boss.y = g.p.y; g.p.hurtCd = 0; g.p.dashT = 0; g.update(DT, input());
    check('Kontakt mit ZORNOS verbrennt Wut (Hit & Run statt Kuscheln)', g.p.rage < r1, `${r1.toFixed(0)} → ${g.p.rage.toFixed(0)}`);
    check('Arena: keine Objekte im Bosskampf', g.objects.filter(o => o.name !== 'Höllenwächter').length === 0); }
  const o = obj(g, g.p.r * 1.5, 0, g.p.r * 0.4); o.hp = 1e-9; g.kill(o, 'hit');
  check('Zerstörung füllt im Bosskampf keine Wut auf', g.p.rage <= rage0 + 1e-6);
  // Feuerring trifft
  g.bossShots.push({ kind: 'ring', x: g.p.x - g.p.r * 3, y: g.p.y, r: g.p.r * 2.6, speed: g.p.r * 3, max: g.p.r * 20, hit: false });
  for (let t = 0; t < 0.5; t += DT) { g.spawnT = 1e9; g.update(DT, input()); }
  check('Feuerring zieht Wut (Leben) ab', g.p.rage < rage0 - 1, `${rage0.toFixed(0)} → ${g.p.rage.toFixed(0)}`);
  // Treffer am Boss
  g.p.hurtCd = 0; const hp0 = g.boss.hp; g.boss.x = g.p.x + g.boss.size * 0.9; g.boss.y = g.p.y; g.boss.hitCd = 0;
  for (let t = 0; t < 0.3; t += DT) { g.spawnT = 1e9; g.update(DT, input({ dx: 1 })); }
  check('Treffer machen dem Boss Schaden', g.boss && g.boss.hp < hp0, `${(hp0 * 100).toFixed(1)} % → ${g.boss ? (g.boss.hp * 100).toFixed(1) : 0} %`);
  // Sieg
  g.bossHurt(1e9);
  check('Boss besiegt', !g.boss && g.bossKilled);
  g.p.rage = 0; g.die(); g.dyingT = 0; g.update(DT, input());
  check('Sieg schaltet Infernus frei', save.unlockedChars.includes('infernus') && save.bossKills === 1);
  check('Sieg gibt Dunkle Materie', save.darkMatter >= C.BOSS.rewardDM);
}

console.log(`\n${passes} bestanden, ${fails} fehlgeschlagen`);
process.exit(fails ? 1 : 0);
