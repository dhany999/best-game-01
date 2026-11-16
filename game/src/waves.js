// waves.js — the wave director: builds each wave's spawn queue from a
// per-wave mix, drips foes in from the edges, mends the warden when a wave
// clears, and opens wave 10 with Gloomheart itself instead of making the
// boss wait behind a queue of adds.
// v2: skitterers join on wave 1 (waves 1-2 were empty walks in v1),
// brutes on wave 3, spitters on wave 4, elites from wave 4 at 8%.
import { CONFIG } from './config.js';
import { edgeSpawn, makeBoss, makeEnemy } from './enemies.js';

// Mix weights per wave: how much of the wave is each foe kind.
// The weights are picked in order, so a wave always opens with wisps and
// the heavier kinds arrive as the drip goes on.
function waveMix(n) {
  if (n <= 1) return [['wisp', 4], ['skitterer', 1]];
  if (n === 2) return [['wisp', 3], ['skitterer', 2]];
  if (n === 3) return [['wisp', 4], ['skitterer', 2], ['brute', 2]];
  if (n === 4) return [['wisp', 3], ['skitterer', 2], ['brute', 2], ['spitter', 1]];
  if (n <= 6) return [['wisp', 3], ['skitterer', 2], ['brute', 2], ['spitter', 2]];
  if (n <= 8) return [['wisp', 2], ['skitterer', 2], ['brute', 3], ['spitter', 2]];
  return [['wisp', 2], ['skitterer', 2], ['brute', 3], ['spitter', 3]];
}

// Pick one kind from a weighted mix using the run's RNG.
function pickKind(G, mix) {
  let total = 0;
  for (const [, w] of mix) total += w;
  let roll = G.rng.next() * total;
  for (const [kind, w] of mix) {
    roll -= w;
    if (roll <= 0) return kind;
  }
  return mix[0][0];
}

// May this spawn be an elite? Elites start on wave 4, at 6%, and brutes
// only go elite from wave 6 — an elite brute earlier was a run-ender.
function rollElite(G, n, kind) {
  const w = CONFIG.waves;
  if (n < w.eliteFirstWave) return false;
  if (kind === 'brute' && n < w.eliteBruteFirstWave) return false;
  return G.rng.chance(w.eliteChance);
}

export function startWave(G, n) {
  G.wave = n;
  G.waveState = 'spawning';
  G.spawnTimer = 0.5;
  const count = CONFIG.waves.baseCount + CONFIG.waves.perWave * n;
  const mix = waveMix(n);
  const queue = [];
  for (let i = 0; i < count; i++) {
    const kind = pickKind(G, mix);
    queue.push({ kind, elite: rollElite(G, n, kind) });
  }
  if (n === CONFIG.waves.total) {
    // The finale opens with the boss: Gloomheart enters first and the
    // remaining adds drip in behind it, instead of the boss waiting at
    // the back of a 40-foe queue while the player mops up.
    queue.unshift({ kind: 'boss', elite: false });
  }
  G.spawnQueue = queue;
  G.waveBanner = `WAVE ${n}${n === CONFIG.waves.total ? ' — GLOOMHEART AWAKENS' : ''}`;
  G.waveBannerTimer = 2.4;
}

// Mend the warden a little when a wave clears: the grove itself keeps a
// surviving run alive, instead of v1's slow bleed with no recovery.
function clearWave(G) {
  const p = G.player;
  const heal = CONFIG.player.waveClearHeal;
  const missing = p.maxHp - p.hp;
  const healed = Math.min(heal, Math.max(0, missing));
  if (healed > 0) {
    p.hp += healed;
    G.floaters.push({
      x: p.x, y: p.y - 30,
      text: `+${healed} HP — the grove mends you`, life: 1.4, maxLife: 1.4, color: '#7fe0c3',
    });
  }
  G.score += 50 * G.wave;
  G.audio.waveClear();
  G.waveState = 'lull';
  G.lullTimer = CONFIG.waves.lull;
  G.waveBanner = `WAVE ${G.wave} CLEARED  +${50 * G.wave}${healed > 0 ? `  +${healed} HP` : ''}`;
  G.waveBannerTimer = 2.2;
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
      if (next.kind === 'boss') {
        G.enemies.push(makeBoss(G, CONFIG.width / 2, 60));
      } else {
        const pos = edgeSpawn(G);
        G.enemies.push(makeEnemy(G, next.kind, pos.x, pos.y, next.elite));
      }
    }
    return;
  }

  // Wave ends when the queue is empty and the field is clear.
  if (G.enemies.length === 0) {
    // On the final wave the boss's death already won the game.
    if (G.wave >= CONFIG.waves.total) return;
    clearWave(G);
  }
}
