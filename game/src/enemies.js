// enemies.js — the shadow wisps: chasers, skitterers, brutes, spitters,
// elite variants from wave 3, and the wave-10 boss Gloomheart.
import { CONFIG } from './config.js';
import { hurtPlayer, spawnBurst } from './player.js';

let nextId = 1;

export function makeEnemy(G, kind, x, y, elite = false) {
  const def = CONFIG.enemies[kind];
  const hpScale = CONFIG.waves.hpScale(G.wave);
  const speedScale = CONFIG.waves.speedScale(G.wave);
  const e = {
    id: nextId++,
    kind,
    x, y,
    hp: def.hp * hpScale * (elite ? CONFIG.enemies.elite.hpMul : 1),
    maxHp: def.hp * hpScale * (elite ? CONFIG.enemies.elite.hpMul : 1),
    speed: def.speed * speedScale * (elite ? CONFIG.enemies.elite.speedMul : 1),
    damage: def.damage * (elite ? CONFIG.enemies.elite.damageMul : 1),
    radius: def.radius * (elite ? CONFIG.enemies.elite.radiusMul : 1),
    xp: def.xp * (elite ? CONFIG.enemies.elite.xpMul : 1),
    score: def.score * (elite ? CONFIG.enemies.elite.scoreMul : 1),
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
    const nx = dx / d;
    const ny = dy / d;

    if (e.kind === 'boss') {
      updateBoss(G, e, dt, nx, ny, d);
    } else if (e.kind === 'spitter') {
      // Keep a shooting distance; fire shadow orbs at the warden.
      if (d > CONFIG.enemies.spitter.shootRange) {
        e.x += nx * e.speed * dt;
        e.y += ny * e.speed * dt;
      } else if (d < 200) {
        e.x -= nx * e.speed * 0.6 * dt;
        e.y -= ny * e.speed * 0.6 * dt;
      }
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && d < CONFIG.enemies.spitter.shootRange + 40 && p.alive) {
        e.shootTimer = CONFIG.enemies.spitter.shootInterval;
        G.enemyShots.push({
          x: e.x, y: e.y,
          vx: nx * 210, vy: ny * 210,
          damage: e.damage, radius: 7, life: 3.2, kind: 'orb',
        });
        G.audio.shoot();
      }
    } else if (e.kind === 'skitterer') {
      // Fast zig-zag charge.
      const perp = Math.sin(e.wobble * 2.2) * 0.7;
      e.x += (nx - ny * perp) * e.speed * dt;
      e.y += (ny + nx * perp) * e.speed * dt;
    } else {
      e.x += nx * e.speed * dt;
      e.y += ny * e.speed * dt;
    }

    // Gentle separation so foes do not stack into one blob.
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

    // Touch damage, throttled per enemy.
    if (p.alive && e.touchCooldown <= 0 && d < e.radius + p.radius) {
      hurtPlayer(G, e.damage);
      e.touchCooldown = 0.6;
    }
  }
  G.enemies = G.enemies.filter((e) => e.alive);
}

function updateBoss(G, boss, dt, nx, ny, d) {
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
