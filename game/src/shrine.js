// shrine.js — the Moonshrine: a glowing ring the warden channels for a boon.
// One shrine spawns at each wave start, away from the grove heart. Stand
// inside its ring and the channel fills; step out and it drains. A full
// channel grants one random boon: a heal, a moonfire that wounds every foe
// on the field, or a rain of embers. It is a choice, not a chore: the ring
// is worth the risk of standing still while wisps close in.
import { CONFIG } from './config.js';
import { damageEnemy, spawnBurst } from './player.js';

// Place one shrine for the wave, clear of the grove heart (the warden
// spawns there) and clear of the arena edges.
export function spawnShrine(G) {
  const m = 110;
  let x = CONFIG.width / 2;
  let y = CONFIG.height / 2;
  for (let tries = 0; tries < 8; tries++) {
    x = G.rng.range(m, CONFIG.width - m);
    y = G.rng.range(m + 40, CONFIG.height - m);
    const d = Math.hypot(x - CONFIG.width / 2, y - CONFIG.height / 2);
    if (d > 170) break;
  }
  G.shrine = {
    x, y,
    radius: CONFIG.shrine.radius,
    channel: 0,
    need: CONFIG.shrine.channelTime,
    active: true,
    claimed: false,
  };
}

// One frame of the shrine: fill while the warden stands in the ring, drain
// while they are out of it. A full channel claims the boon at once.
export function updateShrine(G, dt) {
  const s = G.shrine;
  if (!s || !s.active || G.mode !== 'playing') return;
  const p = G.player;
  if (!p.alive) return;
  const d = Math.hypot(p.x - s.x, p.y - s.y);
  if (d < s.radius) {
    s.channel += dt;
    if (s.channel >= s.need) claimShrine(G);
  } else {
    s.channel = Math.max(0, s.channel - dt * 1.5);
  }
}

function claimShrine(G) {
  const s = G.shrine;
  s.active = false;
  s.claimed = true;
  const p = G.player;
  const roll = G.rng.next();
  if (roll < 0.4) {
    // The moon mends: heal 25 HP.
    const healed = Math.min(25, p.maxHp - p.hp);
    p.hp += healed;
    G.floaters.push({ x: s.x, y: s.y - 58, text: `MOONSHRINE +${healed} HP`, life: 1.6, maxLife: 1.6, color: '#c77dff' });
  } else if (roll < 0.7) {
    // Moonfire: every foe on the field takes 40 damage at once.
    for (const e of [...G.enemies]) {
      if (e.alive) damageEnemy(G, e, 40, true);
    }
    G.floaters.push({ x: s.x, y: s.y - 58, text: 'MOONSHRINE — moonfire!', life: 1.6, maxLife: 1.6, color: '#c77dff' });
  } else {
    // Ember rain: ten embers scatter around the shrine.
    for (let i = 0; i < 10; i++) {
      G.pickups.push({
        x: s.x + G.rng.range(-70, 70), y: s.y + G.rng.range(-70, 70),
        vx: 0, vy: 0, value: 2, kind: 'ember', bob: G.rng.range(0, Math.PI * 2),
      });
    }
    G.floaters.push({ x: s.x, y: s.y - 58, text: 'MOONSHRINE — ember rain!', life: 1.6, maxLife: 1.6, color: '#c77dff' });
  }
  G.audio.levelUp();
  spawnBurst(G, s.x, s.y, '#c77dff', 22, 240);
}

// The shrine on the ground: a pale violet ring, a crescent moon at its
// heart, and a channel arc that fills while the warden stands inside.
export function drawShrine(ctx, G) {
  const s = G.shrine;
  if (!s || !s.active) return;
  const pulse = 0.5 + Math.sin(G.time * 3) * 0.2;
  const glow = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.radius + 26);
  glow.addColorStop(0, `rgba(199,125,255,${0.22 * pulse + 0.1})`);
  glow.addColorStop(1, 'rgba(199,125,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.radius + 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(199,125,255,${0.65 + 0.3 * pulse})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
  ctx.stroke();
  // Channel arc: the ring fills as the warden stands in it.
  if (s.channel > 0) {
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, -Math.PI / 2, -Math.PI / 2 + (s.channel / s.need) * Math.PI * 2);
    ctx.stroke();
  }
  // Crescent moon.
  ctx.fillStyle = '#e9d5ff';
  ctx.beginPath();
  ctx.arc(s.x, s.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(10,46,51,0.9)';
  ctx.beginPath();
  ctx.arc(s.x + 6, s.y - 3, 11, 0, Math.PI * 2);
  ctx.fill();
}
