// player.js — the Ember Warden: movement, dash with i-frames, health,
// and the auto-firing weapon set (ember bolt, nova ring, thorn volley).
// v2: a Thornmail blessing gives the warden retaliation damage on touch
// (thornsDamage, spent by enemies.js), and the bolt hits a little harder
// so the early waves never feel like chipping paint.
import { CONFIG } from './config.js';

export function createPlayer() {
  return {
    x: CONFIG.width / 2,
    y: CONFIG.height / 2,
    radius: CONFIG.player.radius,
    hp: CONFIG.player.maxHp,
    maxHp: CONFIG.player.maxHp,
    level: 1,
    xp: 0,
    speed: CONFIG.player.speed,
    damageMul: 1,
    fireRateMul: 1,
    dashCooldown: CONFIG.player.dashCooldown,
    dashTimer: 0,
    dashTimeLeft: 0,
    dashDir: { x: 1, y: 0 },
    iframes: 0,
    flash: 0,
    boltTimer: 0,
    novaTimer: 0,
    thornTimer: 0,
    novaUnlocked: false,
    thornUnlocked: false,
    novaDamage: CONFIG.weapons.nova.damage,
    novaRadius: CONFIG.weapons.nova.radius,
    thornCount: CONFIG.weapons.thorn.count,
    // Thornmail retaliation: 0 until the blessing is taken.
    thornsDamage: 0,
    facing: { x: 1, y: 0 },
    walkPhase: 0,
    alive: true,
  };
}

export function nearestEnemy(G, x, y, maxRange) {
  let best = null;
  let bestD = maxRange * maxRange;
  for (const e of G.enemies) {
    if (!e.alive) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function fireBolt(G, target) {
  const p = G.player;
  const w = CONFIG.weapons.bolt;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  G.projectiles.push({
    x: p.x + (dx / d) * (p.radius + 6),
    y: p.y + (dy / d) * (p.radius + 6),
    vx: (dx / d) * w.speed,
    vy: (dy / d) * w.speed,
    damage: w.damage * p.damageMul,
    radius: w.radius,
    life: w.range / w.speed,
    kind: 'bolt',
  });
  G.audio.shoot();
}

function fireNova(G) {
  const p = G.player;
  G.novaFx.push({ x: p.x, y: p.y, r: 0, maxR: p.novaRadius, life: 0.45, maxLife: 0.45 });
  for (const e of G.enemies) {
    if (!e.alive) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < p.novaRadius + e.radius) {
      damageEnemy(G, e, p.novaDamage * p.damageMul, true);
    }
  }
  G.audio.hit();
}

function fireThorn(G) {
  const p = G.player;
  const w = CONFIG.weapons.thorn;
  const target = nearestEnemy(G, p.x, p.y, 640) || { x: p.x + p.facing.x, y: p.y + p.facing.y };
  const base = Math.atan2(target.y - p.y, target.x - p.x);
  for (let i = 0; i < p.thornCount; i++) {
    const a = base + (i - (p.thornCount - 1) / 2) * (w.spread / Math.max(1, p.thornCount - 1));
    G.projectiles.push({
      x: p.x + Math.cos(a) * (p.radius + 6),
      y: p.y + Math.sin(a) * (p.radius + 6),
      vx: Math.cos(a) * w.speed,
      vy: Math.sin(a) * w.speed,
      damage: w.damage * p.damageMul,
      radius: 4,
      life: 0.9,
      kind: 'thorn',
    });
  }
  G.audio.shoot();
}

// Shared by projectiles, nova and thornmail: apply damage, spawn feedback,
// handle death. A slain boss wins the game.
export function damageEnemy(G, e, amount, silent = false) {
  if (!e.alive) return;
  e.hp -= amount;
  e.flash = 0.12;
  G.floaters.push({ x: e.x, y: e.y - e.radius, text: String(Math.round(amount)), life: 0.7, maxLife: 0.7, color: '#ffd166' });
  if (e.hp <= 0) {
    e.alive = false;
    G.kills += 1;
    G.score += e.score;
    G.audio.enemyDie();
    spawnBurst(G, e.x, e.y, e.color, e.isElite ? 26 : 12, e.isElite ? 260 : 160);
    // Embers spill out; elites and brutes drop more.
    const drops = e.isElite ? 5 : e.kind === 'brute' ? 3 : 1;
    for (let i = 0; i < drops; i++) {
      G.pickups.push({
        x: e.x + G.rng.range(-14, 14),
        y: e.y + G.rng.range(-14, 14),
        vx: G.rng.range(-40, 40),
        vy: G.rng.range(-40, 40),
        value: e.xp,
        kind: 'ember',
        bob: G.rng.range(0, Math.PI * 2),
      });
    }
    if (e.isElite && G.rng.chance(0.65)) {
      G.pickups.push({ x: e.x, y: e.y, vx: 0, vy: 0, value: 30, kind: 'heart', bob: 0 });
    }
    if (e.kind === 'boss') {
      G.boss = null;
      winGame(G);
    }
  } else if (!silent) {
    G.audio.hit();
  }
}

export function spawnBurst(G, x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = G.rng.angle();
    const s = G.rng.range(speed * 0.25, speed);
    G.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: G.rng.range(0.3, 0.8),
      maxLife: 0.8,
      size: G.rng.range(2, 5),
      color,
    });
  }
}

export function hurtPlayer(G, amount) {
  const p = G.player;
  if (p.iframes > 0 || p.dashTimeLeft > 0 || !p.alive) return;
  p.hp -= amount;
  p.iframes = CONFIG.player.iframesAfterHit;
  p.flash = 0.25;
  G.shake = Math.min(14, G.shake + 7);
  G.audio.hurt();
  spawnBurst(G, p.x, p.y, '#ff2e63', 10, 180);
  if (p.hp <= 0) {
    p.hp = 0;
    p.alive = false;
    spawnBurst(G, p.x, p.y, '#ff9f1c', 40, 320);
    G.audio.defeat();
    G.mode = 'defeat';
    G.endStats = snapshotStats(G);
  }
}

export function snapshotStats(G) {
  return {
    score: G.score,
    kills: G.kills,
    level: G.player.level,
    wave: G.wave,
    time: G.time,
    best: Math.max(G.best, G.score),
  };
}

export function winGame(G) {
  G.mode = 'victory';
  G.audio.victory();
  G.endStats = snapshotStats(G);
  spawnBurst(G, G.player.x, G.player.y, '#ffd166', 60, 380);
}

// One frame of warden: cooldowns, dash, movement, then the auto-weapons.
export function updatePlayer(G, dt) {
  const p = G.player;
  if (!p.alive) return;
  const input = G.input;

  p.iframes = Math.max(0, p.iframes - dt);
  p.flash = Math.max(0, p.flash - dt);
  p.dashTimer = Math.max(0, p.dashTimer - dt);

  // Dash on Space: a quick burst with i-frames.
  if (input.wasPressed('Space') && p.dashTimer <= 0 && p.dashTimeLeft <= 0) {
    const mv = input.moveVector();
    p.dashDir = mv.x !== 0 || mv.y !== 0 ? mv : p.facing;
    p.dashTimeLeft = CONFIG.player.dashTime;
    p.dashTimer = p.dashCooldown;
    G.audio.dash();
    spawnBurst(G, p.x, p.y, '#2ec4b6', 8, 140);
  }

  let vx = 0;
  let vy = 0;
  if (p.dashTimeLeft > 0) {
    p.dashTimeLeft -= dt;
    vx = p.dashDir.x * CONFIG.player.dashSpeed;
    vy = p.dashDir.y * CONFIG.player.dashSpeed;
  } else {
    const mv = input.moveVector();
    vx = mv.x * p.speed;
    vy = mv.y * p.speed;
    if (mv.x !== 0 || mv.y !== 0) {
      p.facing = { x: mv.x, y: mv.y };
      p.walkPhase += dt * 11;
    }
  }
  p.x = Math.max(p.radius, Math.min(CONFIG.width - p.radius, p.x + vx * dt));
  p.y = Math.max(p.radius, Math.min(CONFIG.height - p.radius, p.y + vy * dt));

  // Auto-fire ember bolt at the nearest foe.
  p.boltTimer -= dt;
  const boltInterval = 1 / (CONFIG.weapons.bolt.rate * p.fireRateMul);
  if (p.boltTimer <= 0) {
    const target = nearestEnemy(G, p.x, p.y, CONFIG.weapons.bolt.range);
    if (target) {
      fireBolt(G, target);
      p.boltTimer = boltInterval;
    } else {
      p.boltTimer = 0.08;
    }
  }

  // Nova ring pulses on its own timer once unlocked.
  if (p.novaUnlocked) {
    p.novaTimer -= dt;
    if (p.novaTimer <= 0) {
      fireNova(G);
      p.novaTimer = CONFIG.weapons.nova.interval / p.fireRateMul;
    }
  }

  // Thorn volley fans out at the nearest foe once unlocked.
  if (p.thornUnlocked) {
    p.thornTimer -= dt;
    if (p.thornTimer <= 0) {
      fireThorn(G);
      p.thornTimer = CONFIG.weapons.thorn.interval / p.fireRateMul;
    }
  }
}
