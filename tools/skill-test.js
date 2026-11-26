// Skill-Test: prüft, ob jedes Upgrade, jede Fähigkeit, jede Mutation und
// jedes Monster im Spiel wirklich etwas bewirkt.
// Aufruf: node tools/skill-test.js   (Exit-Code 1, wenn etwas nicht wirkt)
import * as C from '../js/config.js';
import { Game, prestigeGain, doPrestige } from '../js/game.js';
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
  const grow = up => { const g = makeGame(up); const r0 = g.p.r; const o = obj(g, g.p.r * 1.6, 0, g.p.r * 0.6); o.hp = 0.0001; run(g, 0.4, input({ dx: 1 })); return g.p.r - r0; };
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
    case 'hole': { const o = obj(g, g.p.r * 3, 0, g.p.r * 0.5); o.hp = o.maxHp = 1e12; run(g, 1.5); ok = o.dead && Math.abs(g.p.x) < 1; info = 'angesaugt und gefressen, ohne Schubsen'; break; }
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

console.log(`\n${passes} bestanden, ${fails} fehlgeschlagen`);
process.exit(fails ? 1 : 0);
