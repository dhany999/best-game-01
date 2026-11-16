// enemies.js — the shadow wisps: chasers, skitterers, brutes, spitters,
// elite variants from wave 4, and the wave-10 boss Gloomheart.
// v2: elites are weaker (3.0x HP, 1.25x damage) and brutes only go elite
// from wave 6; the boss has 800 HP, fires 8-orb bursts and summons slower,
// so the finale is a fight, not a siege. Foes that touch a warden wearing
// Thornmail take retaliation damage (see player.js).
import { CONFIG } from './config.js';
import { damageEnemy, hurtPlayer, spawnBurst } from './player.js';

let nextId = 1;

// Build one foe from its kind definition, scaled to the current wave and
// to its elite multiplier when it is one.
export function makeEnemy(G, kind, x, y, elite = false) {
  const def = CONFIG.enemies[kind];
  const el = CONFIG.enemies.elite;
  const hpMul = elite ? el.hpMul : 1;
  const hp = def.hp * CONFIG.waves.hpScale(G.wave) * hpMul;
  const e = {
    id: nextId++,
    kind,
    x, y,
    hp,
    maxHp: hp,
    speed: def.speed * CONFIG.waves.speedScale(G.wave) * (elite ? el.speedMul : 1),
    damage: def.damage * (elite ? el.damageMul : 1),
    radius: def.radius * (elite ? el.radiusMul : 1),
    xp: def.xp * (elite ? el.xpMul : 1),
    score: def.score * (elite ? el.scoreMul : 1),
    color: def.color,
    isElite: elite,
    alive: true,
    flash: 0,
    shootTimer: def.shootInterval ? G.rng.range(1, def.shootInterval) : 0,
    wobble: G.rng.range(0, Math.PI * 2),
    touchCooldown: 0,
  };
  return e;
}

export function makeBoss(G, x, y) {
  const def = CONFIG.enemies.boss;
  const boss = {
    id: nextId++,
    kind: 'boss',
    x, y,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    damage: def.damage,
    radius: def.radius,
    xp: 0,
    score: def.score,
    color: def.color,
    isElite: false,
    alive: true,
    flash: 0,
    shootTimer: 0,
    wobble: 0,
    touchCooldown: 0,
    summonTimer: CONFIG.boss.summonInterval,
    burstTimer: CONFIG.boss.burstInterval,
  };
  G.boss = boss;
  G.audio.bossRoar();
  G.shake = Math.min(16, G.shake + 10);
  return boss;
}

// Spawn just outside a random arena edge.
export function edgeSpawn(G) {
  const m = 30;
  const side = G.rng.int(0, 3);
  if (side === 0) return { x: G.rng.range(0, CONFIG.width), y: -m };
  if (side === 1) return { x: CONFIG.width + m, y: G.rng.range(0, CONFIG.height) };
  if (side === 2) return { x: G.rng.range(0, CONFIG.width), y: CONFIG.height + m };
  return { x: -m, y: G.rng.range(0, CONFIG.height) };
}

// Steer one foe toward the warden; spitters hold their shooting range and
// skitterers weave. Returns the unit vector toward the player.
function chase(G, e, dt, nx, ny, d) {
  const p = G.player;
  if (e.kind === 'boss') {
    bossTurn(G, e, dt, nx, ny, d);
    return;
  }
  if (e.kind === 'spitter') {
    const range = CONFIG.enemies.spitter.shootRange;
    if (d > range) {
      e.x += nx * e.speed * dt;
      e.y += ny * e.speed * dt;
    } else if (d < 200) {
      e.x -= nx * e.speed * 0.6 * dt;
      e.y -= ny * e.speed * 0.6 * dt;
    }
    e.shootTimer -= dt;
    if (e.shootTimer <= 0 && d < range + 40 && p.alive) {
      e.shootTimer = CONFIG.enemies.spitter.shootInterval;
      G.enemyShots.push({
        x: e.x, y: e.y,
        vx: nx * 210, vy: ny * 210,
        damage: e.damage, radius: 7, life: 3.2, kind: 'orb',
      });
      G.audio.shoot();
    }
    return;
  }
  if (e.kind === 'skitterer') {
    // Fast zig-zag charge.
    const perp = Math.sin(e.wobble * 2.2) * 0.7;
    e.x += (nx - ny * perp) * e.speed * dt;
    e.y += (ny + nx * perp) * e.speed * dt;
    return;
  }
  e.x += nx * e.speed * dt;
  e.y += ny * e.speed * dt;
}

// Push overlapping foes apart so they never stack into one blob.
function separate(G, e, dt) {
  for (const o of G.enemies) {
    if (o === e || !o.alive) continue;
    const sx = e.x - o.x;
    const sy = e.y - o.y;
    const sd = Math.hypot(sx, sy);
    const min = e.radius + o.radius;
    if (sd > 0.01 && sd < min) {
      const push = ((min - sd) / min) * 26 * dt;
      e.x += (sx / sd) * push;
      e.y += (sy / sd) * push;
    }
  }
}

// A touch hurts the warden — and a Thornmail warden hurts back.
function touchFoe(G, e, d) {
  const p = G.player;
  if (!p.alive || e.touchCooldown > 0 || d >= e.radius + p.radius) return;
  hurtPlayer(G, e.damage);
  e.touchCooldown = 0.6;
  const thorns = p.thornsDamage || 0;
  if (thorns > 0 && e.alive) {
    // Retaliation is its own hit: it can finish the foe off.
    damageEnemy(G, e, thorns);
  }
}

export function updateEnemies(G, dt) {
  const p = G.player;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    e.flash = Math.max(0, e.flash - dt);
    e.touchCooldown = Math.max(0, e.touchCooldown - dt);
    e.wobble += dt * 3;

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    chase(G, e, dt, dx / d, dy / d, d);
    separate(G, e, dt);
    touchFoe(G, e, Math.hypot(p.x - e.x, p.y - e.y));
  }
  G.enemies = G.enemies.filter((e) => e.alive);
}

// Gloomheart: slow advance, radial orb bursts, and wisp summons.
function bossTurn(G, boss, dt, nx, ny, d) {
  const p = G.player;
  boss.x += nx * boss.speed * dt;
  boss.y += ny * boss.speed * dt;
  boss.x = Math.max(boss.radius, Math.min(CONFIG.width - boss.radius, boss.x));
  boss.y = Math.max(boss.radius, Math.min(CONFIG.height - boss.radius, boss.y));

  // Radial burst of shadow orbs.
  boss.burstTimer -= dt;
  if (boss.burstTimer <= 0 && p.alive) {
    boss.burstTimer = CONFIG.boss.burstInterval;
    const n = CONFIG.boss.burstCount;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + G.rng.range(-0.1, 0.1);
      G.enemyShots.push({
        x: boss.x, y: boss.y,
        vx: Math.cos(a) * 170, vy: Math.sin(a) * 170,
        damage: 12, radius: 7, life: 4, kind: 'orb',
      });
    }
    G.audio.bossRoar();
    G.shake = Math.min(16, G.shake + 8);
  }

  // Summon a pair of wisps to harry the warden.
  boss.summonTimer -= dt;
  if (boss.summonTimer <= 0) {
    boss.summonTimer = CONFIG.boss.summonInterval;
    for (let i = 0; i < 2; i++) {
      const a = G.rng.angle();
      const w = makeEnemy(G, 'wisp', boss.x + Math.cos(a) * 70, boss.y + Math.sin(a) * 70);
      G.enemies.push(w);
      spawnBurst(G, w.x, w.y, '#b78cff', 6, 120);
    }
  }
}
