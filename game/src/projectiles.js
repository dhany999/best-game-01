// projectiles.js — player bolts and thorn shards, plus enemy shadow orbs.
// Moves everything, resolves hits, and expires projectiles that leave the grove.
import { damageEnemy, hurtPlayer, spawnBurst } from './player.js';
import { CONFIG } from './config.js';

export function updateProjectiles(G, dt) {
  for (const pr of G.projectiles) {
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    // Bolt / thorn hits the first enemy it touches.
    for (const e of G.enemies) {
      if (!e.alive) continue;
      const dx = e.x - pr.x;
      const dy = e.y - pr.y;
      const rr = e.radius + pr.radius;
      if (dx * dx + dy * dy < rr * rr) {
        damageEnemy(G, e, pr.damage);
        spawnBurst(G, pr.x, pr.y, '#ff9f1c', 4, 120);
        pr.life = 0;
        break;
      }
    }
  }
  G.projectiles = G.projectiles.filter(
    (pr) => pr.life > 0 && pr.x > -20 && pr.x < CONFIG.width + 20 && pr.y > -20 && pr.y < CONFIG.height + 20,
  );

  // Enemy orbs drift and hurt the warden on contact.
  const p = G.player;
  for (const orb of G.enemyShots) {
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;
    orb.life -= dt;
    if (p.alive) {
      const dx = p.x - orb.x;
      const dy = p.y - orb.y;
      const rr = p.radius + orb.radius;
      if (dx * dx + dy * dy < rr * rr) {
        hurtPlayer(G, orb.damage);
        orb.life = 0;
      }
    }
  }
  G.enemyShots = G.enemyShots.filter(
    (o) => o.life > 0 && o.x > -20 && o.x < CONFIG.width + 20 && o.y > -20 && o.y < CONFIG.height + 20,
  );
}
