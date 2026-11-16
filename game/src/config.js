// config.js — every tuning knob for Emberfall: Last Light of the Grove.
// One place to balance the game: player, weapons, enemies, waves, XP, boss.
export const CONFIG = {
  // Arena is the whole canvas; the grove is a bounded clearing.
  width: 1280,
  height: 720,

  player: {
    radius: 16,
    speed: 235,
    maxHp: 100,
    dashSpeed: 640,
    dashTime: 0.16,
    dashCooldown: 2.4,
    iframesAfterHit: 0.7,
    pickupRadius: 26,
    magnetRadius: 130,
  },

  weapons: {
    bolt: { damage: 12, rate: 2.4, speed: 560, range: 560, radius: 5 },
    nova: { damage: 20, radius: 135, interval: 3.4, unlocked: false },
    thorn: { damage: 9, count: 5, spread: 0.9, interval: 1.7, speed: 430, unlocked: false },
  },

  // XP needed to go from `level` to `level + 1`.
  xpNeed(level) {
    return Math.floor(9 * Math.pow(level, 1.32) + 6);
  },

  waves: {
    total: 10,
    // Seconds of calm between waves.
    lull: 3.0,
    // Base spawn budget for wave n: count = base + perWave * n.
    baseCount: 5,
    perWave: 4,
    // Seconds between spawns shrink as waves rise.
    spawnInterval(n) {
      return Math.max(0.28, 1.05 - n * 0.07);
    },
    hpScale(n) {
      return 1 + (n - 1) * 0.22;
    },
    speedScale(n) {
      return 1 + (n - 1) * 0.03;
    },
  },

  enemies: {
    wisp: { hp: 18, speed: 88, damage: 8, radius: 13, xp: 1, score: 10, color: '#b78cff' },
    skitterer: { hp: 12, speed: 158, damage: 6, radius: 10, xp: 1, score: 15, color: '#7fe0c3' },
    brute: { hp: 64, speed: 56, damage: 16, radius: 21, xp: 3, score: 30, color: '#ff7a59' },
    spitter: { hp: 26, speed: 72, damage: 10, radius: 13, xp: 2, score: 25, color: '#ffd166', ranged: true, shootInterval: 2.6, shootRange: 380 },
    elite: { hpMul: 4.2, radiusMul: 1.45, speedMul: 0.92, xpMul: 5, scoreMul: 5, damageMul: 1.5 },
    boss: { hp: 950, speed: 46, damage: 24, radius: 48, xp: 0, score: 500, color: '#ff2e63' },
  },

  boss: {
    name: 'Gloomheart',
    summonInterval: 6.0,
    burstInterval: 4.2,
    burstCount: 10,
  },

  // Palette: ember orange against a deep teal night.
  colors: {
    bgTop: '#06232b',
    bgBottom: '#03141a',
    ground: '#0a2e33',
    ember: '#ff9f1c',
    emberHot: '#ffd166',
    flame: '#ff6b35',
    teal: '#2ec4b6',
    tealDark: '#0e7c7b',
    text: '#f4ead8',
    textDim: '#9fb8b2',
    danger: '#ff2e63',
    heal: '#7fe0c3',
  },
};
