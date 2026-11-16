// main.js — bootstrap and game loop for Emberfall: Last Light of the Grove.
// Builds the shared game state, runs requestAnimationFrame, and routes
// between the title, playing, level-up, pause, victory and defeat screens.
// ?shot=title|play|victory|defeat renders one deterministic scene for
// screenshots instead of starting the live loop. ?seed=N starts a live run
// on a fixed seed, so a run can be shared and replayed exactly.
import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { createPlayer, updatePlayer } from './player.js';
import { updateEnemies } from './enemies.js';
import { updateProjectiles } from './projectiles.js';
import { updatePickups } from './pickups.js';
import { updateWaves } from './waves.js';
import { render, updateParticles } from './render.js';
import { resetRun, startGame, openLevelUp, handleClick, handleMenuKeys } from './ui.js';
import { buildShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function loadBest() {
  try {
    return Number(window.localStorage.getItem('emberfall-best') || 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem('emberfall-best', String(value));
  } catch {
    // Storage unavailable (private mode, file://): best score just won't persist.
  }
}

// The grove scenery: charred trees around the clearing + drifting embers.
function makeScenery(rng) {
  const trees = [];
  for (let i = 0; i < 26; i++) {
    const edge = rng.int(0, 3);
    let x;
    let y;
    if (edge === 0) { x = rng.range(0, CONFIG.width); y = rng.range(-10, 46); }
    else if (edge === 1) { x = rng.range(0, CONFIG.width); y = CONFIG.height - rng.range(-10, 46); }
    else if (edge === 2) { x = rng.range(-10, 46); y = rng.range(0, CONFIG.height); }
    else { x = CONFIG.width - rng.range(-10, 46); y = rng.range(0, CONFIG.height); }
    const branches = [];
    for (let b = 0; b < 3; b++) {
      branches.push({ at: rng.range(0.35, 0.9), dx: rng.range(-26, 26), dy: rng.range(-18, 6) });
    }
    trees.push({ x, y, h: rng.range(46, 110), r: rng.range(5, 9), lean: rng.range(-14, 14), branches, burning: rng.chance(0.3) });
  }
  const embers = [];
  for (let i = 0; i < 42; i++) {
    embers.push({ x: rng.range(0, CONFIG.width), y: rng.range(0, CONFIG.height), speed: rng.range(6, 20), size: rng.range(1, 2.6), phase: rng.range(0, Math.PI * 2) });
  }
  return { trees, embers };
}

function createGame(seed) {
  const rng = makeRng(seed);
  const scenery = makeScenery(rng);
  const G = {
    canvas,
    ctx,
    rng,
    input: new Input(canvas),
    audio: new AudioSys(),
    mode: 'title',
    time: 0,
    score: 0,
    kills: 0,
    wave: 0,
    waveState: 'lull',
    lullTimer: 0,
    spawnQueue: [],
    spawnTimer: 0,
    waveBanner: '',
    waveBannerTimer: 0,
    player: createPlayer(),
    enemies: [],
    projectiles: [],
    enemyShots: [],
    pickups: [],
    particles: [],
    floaters: [],
    novaFx: [],
    boss: null,
    trees: scenery.trees,
    embers: scenery.embers,
    shake: 0,
    best: loadBest(),
    pendingLevels: 0,
    levelChoices: [],
    endStats: null,
    ui: { buttons: [] },
  };
  return G;
}

function update(G, dt) {
  G.shake = Math.max(0, G.shake - dt * 34);
  if (G.mode === 'playing') {
    G.time += dt;
    updatePlayer(G, dt);
    updateWaves(G, dt);
    updateEnemies(G, dt);
    updateProjectiles(G, dt);
    updatePickups(G, dt);
    updateParticles(G, dt);
    if (G.mode === 'playing' && G.pendingLevels > 0) openLevelUp(G);
    if (G.mode === 'playing' && G.player.alive && G.score > G.best) {
      // Best score tracks live so a mid-run refresh keeps the record.
      G.best = G.score;
    }
  } else if (G.mode === 'title' || G.mode === 'victory' || G.mode === 'defeat') {
    // Ambient drift behind the menus.
    updateParticles(G, dt);
  }
}

function frame(G, now, last) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  handleMenuKeys(G);
  update(G, dt);
  render(G);
  if (G.input.mouse.clicked) handleClick(G);
  if ((G.mode === 'victory' || G.mode === 'defeat') && G.endStats) {
    saveBest(G.endStats.best);
  }
  G.input.endFrame();
  return now;
}

function main() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seedParam = Number(params.get('seed'));
  // A ?seed=N run is deterministic: same seed, same grove, same waves.
  // Without one, the grove is seeded from the clock as before.
  const seed = Number.isFinite(seedParam) && params.has('seed')
    ? (seedParam >>> 0)
    : (Date.now() % 2147483647);

  const G = createGame(seed);

  // Debug handle for automated playtests (read-only inspection from a test
  // driver); the game itself never reads it.
  window.__game = G;

  if (shot) {
    // Deterministic screenshot scene: build, render once, signal readiness.
    buildShot(G, shot, seed);
    render(G);
    window.__shotReady = true;
    return;
  }

  // Pause when the tab loses focus mid-run; never lose a run to alt-tab.
  window.addEventListener('blur', () => {
    if (G.mode === 'playing') G.mode = 'paused';
  });

  let last = performance.now();
  const loop = (now) => {
    last = frame(G, now, last);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

main();
