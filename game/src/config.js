// config.js — every tuning knob for Emberfall: Last Light of the Grove.
// v3 balance: the curve is smooth now. Waves 1-2 open busier (skitterers
// join at once, faster drip), the mid-game cliff is gone (elites arrive at
// wave 4, weaker and rarer, and never on brutes before wave 6), and the
// warden recovers between waves (+12 HP on every wave clear) so a run that
// survives the mid-game can actually reach — and beat — Gloomheart.
// v3 adds the shade (a lunger that telegraphs, then strikes from wave 3)
// and the Moonshrine (stand in its ring to channel a boon, once per wave).
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
    // The grove mends the warden when a wave is cleared.
    waveClearHeal: 8,
  },

  weapons: {
    bolt: { damage: 13, rate: 2.6, speed: 560, range: 560, radius: 5 },
    nova: { damage: 20, radius: 135, interval: 3.0, unlocked: false },
    thorn: { damage: 9, count: 5, spread: 0.9, interval: 1.5, speed: 430, unlocked: false },
  },

  // XP needed to go from `level` to `level + 1`. A touch kinder than v1 so
  // the warden is usually level 8-9 when Gloomheart wakes.
  xpNeed(level) {
    return Math.floor(8 * Math.pow(level, 1.3) + 6);
  },

  waves: {
    total: 10,
    // Seconds of calm between waves.
    lull: 3.0,
    // Spawn budget for wave n: count = base + perWave * n.
    // v2: a flatter ramp — more foes early, fewer piled on late.
    baseCount: 7,
    perWave: 3,
    // Seconds between spawns shrink gently as waves rise.
    spawnInterval(n) {
      return Math.max(0.32, 0.92 - n * 0.05);
    },
    // Enemy HP grows ~18% a wave now, not 22%: brutes stop being walls.
    hpScale(n) {
      return 1 + (n - 1) * 0.18;
    },
    speedScale(n) {
      return 1 + (n - 1) * 0.025;
    },
    // Elites: first seen on wave 4 (v1: wave 3), 8% of spawns (v1: 9%).
    eliteFirstWave: 4,
    eliteChance: 0.08,
    // Brutes only go elite from wave 6: an elite brute on wave 3 was a
    // ~390 HP wall in v1 and ended more runs than the boss did.
    eliteBruteFirstWave: 6,
  },

  enemies: {
    wisp: { hp: 18, speed: 88, damage: 8, radius: 13, xp: 1, score: 10, color: '#b78cff' },
    skitterer: { hp: 12, speed: 158, damage: 6, radius: 10, xp: 1, score: 15, color: '#7fe0c3' },
    brute: { hp: 60, speed: 56, damage: 16, radius: 21, xp: 3, score: 30, color: '#ff7a59' },
    spitter: { hp: 26, speed: 72, damage: 8, radius: 13, xp: 2, score: 25, color: '#ffd166', ranged: true, shootInterval: 2.6, shootRange: 380 },
    // Shade: a lunger. It creeps close, flashes a telegraph line while it
    // aims, then dashes at the warden. Dodge the line, not the foe.
    shade: { hp: 24, speed: 74, damage: 8, radius: 12, xp: 2, score: 35, color: '#c77dff', lunger: true },
    elite: { hpMul: 3.0, radiusMul: 1.45, speedMul: 0.92, xpMul: 5, scoreMul: 5, damageMul: 1.25 },
    boss: { hp: 850, speed: 46, damage: 24, radius: 48, xp: 0, score: 500, color: '#ff2e63' },
  },

  // Shade lunge tuning: aim (telegraph) -> lunge -> rest, then aim again.
  // The telegraph is long on purpose: a warden who sees the dashed line
  // and sidesteps is never hit, so the shade punishes standing still,
  // not moving.
  shade: {
    aimTime: 0.85,
    lungeTime: 0.32,
    lungeSpeed: 380,
    restTime: 1.2,
  },

  // Moonshrine: one ring per wave. Stand inside it to channel; leave and
  // the channel drains. A full channel grants one random boon.
  shrine: {
    radius: 46,
    channelTime: 2.5,
  },

  boss: {
    name: 'Gloomheart',
    summonInterval: 7.5,
    burstInterval: 4.2,
    burstCount: 8,
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
