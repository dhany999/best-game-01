// pickups.js — embers (XP) and hearts (healing).
// Embers drift, then magnet toward the warden; collecting enough XP levels up.
import { CONFIG } from './config.js';

export function updatePickups(G, dt) {
  const p = G.player;
  for (const pk of G.pickups) {
    pk.bob += dt * 4;
    const dx = p.x - pk.x;
    const dy = p.y - pk.y;
    const d = Math.hypot(dx, dy) || 1;
    const magnetR = CONFIG.player.magnetRadius + (p.magnetBonus || 0);
    if (p.alive && d < magnetR) {
      const pull = 560 * (1 - d / (magnetR + 40));
      pk.vx += (dx / d) * pull * dt * 4;
      pk.vy += (dy / d) * pull * dt * 4;
    } else {
      pk.vx *= 0.92;
      pk.vy *= 0.92;
    }
    pk.x += pk.vx * dt;
    pk.y += pk.vy * dt;

    if (p.alive && d < CONFIG.player.pickupRadius + 8) {
      pk.taken = true;
      if (pk.kind === 'heart') {
        p.hp = Math.min(p.maxHp, p.hp + pk.value);
        G.floaters.push({ x: p.x, y: p.y - 24, text: `+${pk.value} HP`, life: 0.9, maxLife: 0.9, color: '#7fe0c3' });
      } else {
        gainXp(G, pk.value);
      }
      G.audio.pickup();
    }
  }
  G.pickups = G.pickups.filter((pk) => !pk.taken);
}

export function gainXp(G, amount) {
  const p = G.player;
  p.xp += amount;
  const need = CONFIG.xpNeed(p.level);
  if (p.xp >= need) {
    p.xp -= need;
    p.level += 1;
    G.audio.levelUp();
    G.pendingLevels += 1;
    G.floaters.push({ x: p.x, y: p.y - 30, text: 'LEVEL UP!', life: 1.1, maxLife: 1.1, color: '#ffd166' });
  }
}
