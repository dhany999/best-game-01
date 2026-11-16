// ui.js — menu input: what a click on a canvas button does, and what the
// menu keys do in each screen. Gameplay keys live in input.js / player.js.
import { rollChoices, applyBlessing } from './upgrades.js';
import { startWave } from './waves.js';
import { createPlayer } from './player.js';

export function resetRun(G) {
  G.player = createPlayer();
  G.enemies = [];
  G.projectiles = [];
  G.enemyShots = [];
  G.pickups = [];
  G.particles = [];
  G.floaters = [];
  G.novaFx = [];
  G.boss = null;
  G.score = 0;
  G.kills = 0;
  G.time = 0;
  G.wave = 0;
  G.waveState = 'lull';
  G.lullTimer = 1.2;
  G.spawnQueue = [];
  G.spawnTimer = 0;
  G.waveBanner = '';
  G.waveBannerTimer = 0;
  G.pendingLevels = 0;
  G.levelChoices = [];
  G.endStats = null;
  G.shake = 0;
}

export function startGame(G) {
  G.audio.ensure();
  resetRun(G);
  G.mode = 'playing';
  startWave(G, 1);
}

export function openLevelUp(G) {
  G.levelChoices = rollChoices(G, 3);
  G.mode = 'levelup';
}

export function chooseBlessing(G, index) {
  const b = G.levelChoices[index];
  if (!b) return;
  applyBlessing(G, b);
  G.pendingLevels = Math.max(0, G.pendingLevels - 1);
  if (G.pendingLevels > 0) {
    openLevelUp(G);
  } else {
    G.mode = 'playing';
  }
}

// A click landed: find the button under the mouse and run its action.
export function handleClick(G) {
  const m = G.input.mouse;
  for (const b of G.ui.buttons) {
    if (b.label === '' && b.action.startsWith('blessing:')) {
      // Level-up cards are buttons too, even with no drawn label.
    }
    if (m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h) {
      runAction(G, b.action);
      return true;
    }
  }
  return false;
}

export function runAction(G, action) {
  if (action === 'start' || action === 'restart') {
    startGame(G);
  } else if (action === 'resume') {
    G.mode = 'playing';
  } else if (action.startsWith('blessing:')) {
    chooseBlessing(G, Number(action.split(':')[1]));
  }
}

// Keys that work on menus and globally (mute, pause, start, restart).
export function handleMenuKeys(G) {
  const input = G.input;
  if (input.wasPressed('KeyM')) {
    G.audio.ensure();
    G.audio.setMuted(!G.audio.muted);
  }
  if (G.mode === 'title' && (input.wasPressed('Enter') || input.wasPressed('NumpadEnter'))) {
    startGame(G);
  } else if ((G.mode === 'victory' || G.mode === 'defeat')
    && (input.wasPressed('KeyR') || input.wasPressed('Enter') || input.wasPressed('NumpadEnter'))) {
    startGame(G);
  } else if (G.mode === 'playing' && input.wasPressed('KeyP')) {
    G.mode = 'paused';
  } else if (G.mode === 'paused' && input.wasPressed('KeyP')) {
    G.mode = 'playing';
  } else if (G.mode === 'levelup') {
    if (input.wasPressed('Digit1')) chooseBlessing(G, 0);
    if (input.wasPressed('Digit2')) chooseBlessing(G, 1);
    if (input.wasPressed('Digit3')) chooseBlessing(G, 2);
  }
}
