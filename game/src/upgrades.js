// upgrades.js — the blessings offered at each level-up.
// Three cards, one choice: new weapons, stronger fire, or a tougher warden.
// v2 adds Thornmail: foes that touch the warden take damage back, so a
// build can answer the swarm instead of only outrunning it.
import { CONFIG } from './config.js';

// Every blessing: an id, a card face, when it may be offered, and what it
// does to the warden. Damage and fire-rate blessings stack multiplicatively.
export const BLESSINGS = [
  {
    id: 'bolt-damage', name: 'Ember Might', icon: '🔥',
    desc: '+25% damage on all attacks',
    canOffer: () => true,
    apply: (p) => { p.damageMul *= 1.25; },
  },
  {
    id: 'fire-rate', name: 'Rapid Sparks', icon: '⚡',
    desc: '+20% fire rate on all weapons',
    canOffer: () => true,
    apply: (p) => { p.fireRateMul *= 1.2; },
  },
  {
    id: 'swift-boots', name: 'Swift Boots', icon: '💨',
    desc: '+12% move speed',
    canOffer: () => true,
    apply: (p) => { p.speed *= 1.12; },
  },
  {
    id: 'heartwood', name: 'Heartwood', icon: '❤️',
    desc: '+25 max HP and heal 25',
    canOffer: () => true,
    apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  },
  {
    id: 'dash-charm', name: 'Dash Charm', icon: '🌀',
    desc: '-25% dash cooldown',
    canOffer: (p) => p.dashCooldown > 0.8,
    apply: (p) => { p.dashCooldown = Math.max(0.8, p.dashCooldown * 0.75); },
  },
  {
    id: 'nova-ring', name: 'Nova Ring', icon: '💥',
    desc: 'Unlock: a ring of fire pulses around you',
    canOffer: (p) => !p.novaUnlocked,
    apply: (p) => { p.novaUnlocked = true; p.novaTimer = 0.5; },
  },
  {
    id: 'nova-power', name: 'Nova Surge', icon: '☀️',
    desc: 'Nova Ring: +40% damage, +20% radius',
    canOffer: (p) => p.novaUnlocked,
    apply: (p) => { p.novaDamage *= 1.4; p.novaRadius *= 1.2; },
  },
  {
    id: 'thorn-volley', name: 'Thorn Volley', icon: '🌿',
    desc: 'Unlock: a fan of thorns fires at foes',
    canOffer: (p) => !p.thornUnlocked,
    apply: (p) => { p.thornUnlocked = true; p.thornTimer = 0.5; },
  },
  {
    id: 'thorn-more', name: 'Thorn Storm', icon: '🌹',
    desc: 'Thorn Volley: +2 thorns per volley',
    canOffer: (p) => p.thornUnlocked,
    apply: (p) => { p.thornCount += 2; },
  },
  {
    id: 'thornmail', name: 'Thornmail', icon: '🌵',
    desc: 'Foes that touch you take 15 damage back',
    canOffer: (p) => p.thornsDamage < 45,
    apply: (p) => { p.thornsDamage = (p.thornsDamage || 0) + 15; },
  },
  {
    id: 'moonlit-ward', name: 'Moonlit Ward', icon: '🌙',
    desc: 'A pale ward blocks one hit; it renews each wave',
    canOffer: (p) => !(p.blessings || []).includes('moonlit-ward'),
    apply: (p) => { p.shield = true; },
  },
  {
    id: 'magnet', name: 'Ember Lure', icon: '🧲',
    desc: 'Embers fly to you from farther away',
    canOffer: () => true,
    apply: (p) => { p.magnetBonus = (p.magnetBonus || 0) + 60; },
  },
];

// Roll `count` distinct blessings the warden can still take.
export function rollChoices(G, count = 3) {
  const p = G.player;
  const pool = BLESSINGS.filter((b) => b.canOffer(p));
  const choices = [];
  while (choices.length < count && pool.length > 0) {
    const i = Math.floor(G.rng.next() * pool.length);
    choices.push(pool.splice(i, 1)[0]);
  }
  // Fallback so the level-up screen is never empty.
  while (choices.length < count) choices.push(BLESSINGS[0]);
  return choices;
}

export function applyBlessing(G, blessing) {
  // Remember the blessing for the HUD's row of icons (and for the
  // Moonlit Ward's per-wave renewal in waves.js).
  G.player.blessings = G.player.blessings || [];
  G.player.blessings.push(blessing.id);
  blessing.apply(G.player);
  G.floaters.push({
    x: G.player.x, y: G.player.y - 30,
    text: blessing.name, life: 1.2, maxLife: 1.2, color: '#ffd166',
  });
}
