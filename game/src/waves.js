// waves.js — the wave director: builds each wave's spawn queue, drips foes
// in from the edges, and advances the grove toward the wave-10 boss.
import { CONFIG } from './config.js';
import { edgeSpawn, makeBoss, makeEnemy } from './enemies.js';

// Which foe kinds may appear on wave n.
function waveRoster(n) {
  const roster = ['wisp'];
  if (n >= 2) roster.push('skitterer');
  if (n >= 3) roster.push('brute');
  if (n >= 4) roster.push('spitter');
  return roster;
}

export function startWave(G, n) {
  G.wave = n;
  G.waveState = 'spawning';
  G.spawnTimer = 0.5;
  const count = CONFIG.waves.baseCount + CONFIG.waves.perWave * n;
  const roster = waveRoster(n);
  G.spawnQueue = [];
  for (let i = 0; i < count; i++) {
    const kind = G.rng.pick(roster);
    // Elites stalk the grove from wave 3 onward.
    const elite = n >= 3 && G.rng.chance(0.09);
    G.spawnQueue.push({ kind, elite });
  }
  if (n === CONFIG.waves.total) {
    G.spawnQueue.push({ kind: 'boss', elite: false });
  }
  G.waveBanner = `WAVE ${n}${n === CONFIG.waves.total ? ' — GLOOMHEART AWAKENS' : ''}`;
  G.waveBannerTimer = 2.4;
}

export function updateWaves(G, dt) {
  if (G.mode !== 'playing') return;

  if (G.waveBannerTimer > 0) G.waveBannerTimer -= dt;

  if (G.waveState === 'lull') {
    G.lullTimer -= dt;
    if (G.lullTimer <= 0) startWave(G, G.wave + 1);
    return;
  }

  // Drip the queue in one foe at a time.
  if (G.spawnQueue.length > 0) {
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0) {
      G.spawnTimer = CONFIG.waves.spawnInterval(G.wave);
      const next = G.spawnQueue.shift();
      const pos = edgeSpawn(G);
      if (next.kind === 'boss') {
        G.enemies.push(makeBoss(G, CONFIG.width / 2, 60));
      } else {
        G.enemies.push(makeEnemy(G, next.kind, pos.x, pos.y, next.elite));
      }
    }
    return;
  }

  // Wave ends when the queue is empty and the field is clear.
  if (G.enemies.length === 0) {
    if (G.wave >= CONFIG.waves.total) return; // boss death already won the game
    G.score += 50 * G.wave;
    G.audio.waveClear();
    G.waveState = 'lull';
    G.lullTimer = CONFIG.waves.lull;
    G.waveBanner = `WAVE ${G.wave} CLEARED  +${50 * G.wave}`;
    G.waveBannerTimer = 2.2;
  }
}
