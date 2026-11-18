// shots.js — deterministic scenes for screenshots.
// ?shot=title|play|victory|defeat with an optional ?seed= renders one fixed
// scene at a fixed simulated time and sets window.__shotReady when done.
// The play scene is a real 50-second simulation with a scripted pilot.
// v3: the play scene opens on wave 4 with the warden already leveled and
// armed (nova ring, thorn volley, Ember Might, Thornmail), so the frame
// shows every weapon, a shade, an elite and the Moonshrine at once.
import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { resetRun } from './ui.js';
import { startWave } from './waves.js';
import { updatePlayer } from './player.js';
import { updateEnemies } from './enemies.js';
import { updateProjectiles } from './projectiles.js';
import { updatePickups } from './pickups.js';
import { updateParticles } from './render.js';
import { updateWaves } from './waves.js';
import { rollChoices, applyBlessing, BLESSINGS } from './upgrades.js';
import { updateShrine } from './shrine.js';

const DT = 1 / 60;

function stepWorld(G, dt) {
  updatePlayer(G, dt);
  updateWaves(G, dt);
  updateEnemies(G, dt);
  updateProjectiles(G, dt);
  updatePickups(G, dt);
  updateParticles(G, dt);
  updateShrine(G, dt);
  G.shake = 0;
  if (G.pendingLevels > 0) {
    const choices = rollChoices(G, 3);
    applyBlessing(G, choices[0]);
    G.pendingLevels -= 1;
  }
}

// A simple pilot: circle the grove heart, veering toward the nearest ember.
// Dashes once late in the run so the dash ring is visible in the shot.
function pilotInput(G) {
  let dashed = false;
  return {
    keys: new Set(),
    mouse: { x: 0, y: 0, clicked: false, down: false },
    moveVector() {
      const p = G.player;
      let tx = CONFIG.width / 2 + Math.cos(G.time * 0.55) * 260;
      let ty = CONFIG.height / 2 + Math.sin(G.time * 0.55) * 170;
      let best = null;
      let bestD = 170 * 170;
      for (const pk of G.pickups) {
        const d = (pk.x - p.x) ** 2 + (pk.y - p.y) ** 2;
        if (d < bestD) { bestD = d; best = pk; }
      }
      if (best) { tx = best.x; ty = best.y; }
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.hypot(dx, dy) || 1;
      return d < 12 ? { x: 0, y: 0 } : { x: dx / d, y: dy / d };
    },
    wasPressed(code) {
      if (code === 'Space' && !dashed && G.time >= 49) { dashed = true; return true; }
      return false;
    },
    endFrame() {},
  };
}

export function buildShot(G, shot, seed) {
  G.rng = makeRng(seed);
  if (shot === 'title') {
    G.mode = 'title';
    G.time = 2.0;
    G.best = 2450;
    for (let i = 0; i < 26; i++) {
      G.particles.push({
        x: CONFIG.width / 2 + G.rng.range(-260, 260),
        y: CONFIG.height / 2 + G.rng.range(-120, 120),
        vx: G.rng.range(-12, 12), vy: G.rng.range(-30, -8),
        life: 1.5, maxLife: 1.5, size: G.rng.range(2, 4.5), color: '#ff9f1c',
      });
    }
    return;
  }

  if (shot === 'play') {
    resetRun(G);
    G.mode = 'playing';
    G.input = pilotInput(G);
    // The warden arrives mid-run: level 5, four blessings already taken
    // (nova ring, thorn volley, Ember Might, Thornmail), so the frame shows
    // every weapon at once and the HUD's blessings row is filled.
    G.player.level = 5;
    for (const id of ['nova-ring', 'thorn-volley', 'bolt-damage', 'thornmail']) {
      applyBlessing(G, BLESSINGS.find((b) => b.id === id));
    }
    startWave(G, 4);
    // The Moonshrine sits on the pilot's orbit path, top right, so the
    // ring and its crescent moon read in the frame.
    if (G.shrine) { G.shrine.x = 880; G.shrine.y = 200; }
    // 50 seconds of real combat at a fixed timestep. The pilot fights
    // through waves 4-5, levels up and earns blessings along the way, and
    // reaches wave 5 — brutes, spitters, shades and elites — with a leveled
    // warden, so the frame stays busy with foes, bolts and damage numbers.
    for (let i = 0; i < 50 * 60; i++) {
      if (!G.player.alive) break;
      G.time += DT;
      stepWorld(G, DT);
    }
    // The photo must catch combat, not a lull: the warden clears waves
    // fast, so keep stepping until the field is busy (12+ foes alive, so
    // the wave's mix — brutes, spitters, shades, elites — is on screen),
    // opening a fresh wave first if the last one just cleared. This only
    // moves the moment of the photo — the simulation stays real.
    for (let i = 0; i < 40 * 60 && G.enemies.length < 12; i++) {
      if (!G.player.alive) break;
      if (G.waveState === 'lull' && G.spawnQueue.length === 0) {
        startWave(G, Math.min(G.wave + 1, CONFIG.waves.total));
      }
      G.time += DT;
      stepWorld(G, DT);
    }
    G.waveBannerTimer = 0;
    return;
  }

  if (shot === 'victory') {
    resetRun(G);
    G.mode = 'victory';
    G.time = 512;
    G.player.x = CONFIG.width / 2;
    G.player.y = CONFIG.height / 2 + 40;
    G.endStats = { score: 2450, kills: 87, level: 9, wave: 10, time: 512, best: 2450 };
    G.best = 2450;
    for (let i = 0; i < 40; i++) {
      G.particles.push({
        x: CONFIG.width / 2 + G.rng.range(-300, 300),
        y: CONFIG.height / 2 + G.rng.range(-160, 160),
        vx: G.rng.range(-40, 40), vy: G.rng.range(-70, -10),
        life: 1.5, maxLife: 1.5, size: G.rng.range(2, 5), color: i % 2 ? '#ffd166' : '#ff9f1c',
      });
    }
    return;
  }

  // defeat
  resetRun(G);
  G.mode = 'defeat';
  G.time = 268;
  G.player.alive = false;
  G.player.hp = 0;
  G.endStats = { score: 980, kills: 34, level: 5, wave: 6, time: 268, best: 2450 };
  G.best = 2450;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    G.enemies.push({
      id: 900 + i, kind: 'wisp', x: CONFIG.width / 2 + Math.cos(a) * 220, y: CONFIG.height / 2 + Math.sin(a) * 120,
      hp: 18, maxHp: 18, speed: 88, damage: 8, radius: 13, xp: 1, score: 10, color: '#b78cff',
      isElite: false, alive: true, flash: 0, shootTimer: 0, wobble: a, touchCooldown: 0,
    });
  }
  for (let i = 0; i < 20; i++) {
    G.particles.push({
      x: CONFIG.width / 2 + G.rng.range(-160, 160),
      y: CONFIG.height / 2 + G.rng.range(-80, 80),
      vx: G.rng.range(-30, 30), vy: G.rng.range(-50, -5),
      life: 1.5, maxLife: 1.5, size: G.rng.range(2, 4), color: '#ff2e63',
    });
  }
}
