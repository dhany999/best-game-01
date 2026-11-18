// render.js — everything the player sees: the burning grove, the warden,
// the wisps, particles, floating numbers, the HUD, and every menu screen.
// All art is procedural canvas drawing; there are no image assets.
import { CONFIG } from './config.js';
import { drawShrine } from './shrine.js';

const C = CONFIG.colors;

// Card faces for the HUD's blessings row (mirrors upgrades.js).
const BLESSING_ICONS = {
  'bolt-damage': '🔥',
  'fire-rate': '⚡',
  'swift-boots': '💨',
  heartwood: '❤️',
  'dash-charm': '🌀',
  'nova-ring': '💥',
  'nova-power': '☀️',
  'thorn-volley': '🌿',
  'thorn-more': '🌹',
  thornmail: '🌵',
  'moonlit-ward': '🌙',
  magnet: '🧲',
};

export function updateParticles(G, dt) {
  for (const pt of G.particles) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.96;
    pt.vy *= 0.96;
    pt.life -= dt;
  }
  G.particles = G.particles.filter((pt) => pt.life > 0);
  for (const fx of G.novaFx) {
    fx.r += (fx.maxR / fx.maxLife) * dt * 1.4;
    fx.life -= dt;
  }
  G.novaFx = G.novaFx.filter((fx) => fx.life > 0);
  for (const f of G.floaters) {
    f.y -= 42 * dt;
    f.life -= dt;
  }
  G.floaters = G.floaters.filter((f) => f.life > 0);
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawBackground(ctx, G) {
  const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
  grad.addColorStop(0, C.bgTop);
  grad.addColorStop(1, C.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  // The grove heart: a warm glow at the centre of the clearing.
  const glow = ctx.createRadialGradient(
    CONFIG.width / 2, CONFIG.height / 2, 20,
    CONFIG.width / 2, CONFIG.height / 2, 420,
  );
  glow.addColorStop(0, 'rgba(255,159,28,0.16)');
  glow.addColorStop(1, 'rgba(255,159,28,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  // The clearing floor: grass tufts, scorched patches and ember glints.
  for (const pt of G.patches || []) {
    if (pt.kind === 'grass') {
      ctx.strokeStyle = 'rgba(46,196,182,0.28)';
      ctx.lineWidth = 1.5;
      for (let s = -1; s <= 1; s++) {
        const a = pt.a + s * 0.5;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x + Math.cos(a) * pt.r, pt.y + Math.sin(a) * pt.r * 0.6);
        ctx.stroke();
      }
    } else if (pt.kind === 'scorch') {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(pt.x, pt.y, pt.r, pt.r * 0.55, pt.a, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const tw = 0.25 + 0.25 * Math.sin(G.time * 2 + pt.a * 5);
      ctx.fillStyle = `rgba(255,159,28,${tw})`;
      circle(ctx, pt.x, pt.y, 2);
    }
  }

  // Four stone braziers burning at the quarter points.
  for (const b of G.braziers || []) {
    const flick = 0.5 + Math.sin(G.time * 6 + b.phase) * 0.3;
    const bg = ctx.createRadialGradient(b.x, b.y - 8, 2, b.x, b.y - 8, 60);
    bg.addColorStop(0, `rgba(255,159,28,${0.28 * flick + 0.08})`);
    bg.addColorStop(1, 'rgba(255,159,28,0)');
    ctx.fillStyle = bg;
    circle(ctx, b.x, b.y - 8, 60);
    ctx.fillStyle = '#1a2b30';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + 4, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,${Math.floor(120 + 80 * flick)},40,${0.75 * flick + 0.2})`;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - 20 - 4 * flick);
    ctx.quadraticCurveTo(b.x + 7, b.y - 8, b.x, b.y + 2);
    ctx.quadraticCurveTo(b.x - 7, b.y - 8, b.x, b.y - 20 - 4 * flick);
    ctx.fill();
  }

  // Charred trees ringing the clearing.
  for (const t of G.trees) {
    ctx.strokeStyle = '#04161b';
    ctx.lineWidth = t.r * 0.5;
    ctx.beginPath();
    ctx.moveTo(t.x, t.y);
    ctx.lineTo(t.x + t.lean, t.y - t.h);
    ctx.stroke();
    ctx.strokeStyle = '#0a2e33';
    ctx.lineWidth = 2;
    for (const b of t.branches) {
      ctx.beginPath();
      ctx.moveTo(t.x + t.lean * b.at, t.y - t.h * b.at);
      ctx.lineTo(t.x + t.lean * b.at + b.dx, t.y - t.h * b.at + b.dy);
      ctx.stroke();
    }
    // A few trees still burn.
    if (t.burning) {
      const flick = 0.5 + Math.sin(G.time * 6 + t.x) * 0.3;
      ctx.fillStyle = `rgba(255,${Math.floor(120 + 80 * flick)},40,${0.5 * flick})`;
      circle(ctx, t.x + t.lean, t.y - t.h - 6, 7 + 3 * flick);
    }
  }

  // Drifting embers in the air.
  for (const e of G.embers) {
    const y = ((e.y - G.time * e.speed) % CONFIG.height + CONFIG.height) % CONFIG.height;
    const tw = 0.35 + 0.35 * Math.sin(G.time * 2 + e.phase);
    ctx.fillStyle = `rgba(255,159,28,${tw})`;
    circle(ctx, e.x + Math.sin(G.time + e.phase) * 8, y, e.size);
  }
}

function drawPlayer(ctx, G) {
  const p = G.player;
  if (!p.alive) return;
  // Blink while invulnerable after a hit.
  if (p.iframes > 0 && Math.floor(G.time * 14) % 2 === 0) return;
  const x = p.x;
  const y = p.y + Math.sin(p.walkPhase) * 1.5;

  // Ember glow under the warden.
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 44);
  glow.addColorStop(0, 'rgba(255,159,28,0.45)');
  glow.addColorStop(1, 'rgba(255,159,28,0)');
  ctx.fillStyle = glow;
  circle(ctx, x, y, 44);

  // Cloak (deep teal) and hood.
  ctx.fillStyle = p.flash > 0 ? '#ffffff' : '#0e7c7b';
  ctx.beginPath();
  ctx.moveTo(x, y - 20);
  ctx.quadraticCurveTo(x + 15, y - 8, x + 13, y + 14);
  ctx.quadraticCurveTo(x, y + 20, x - 13, y + 14);
  ctx.quadraticCurveTo(x - 15, y - 8, x, y - 20);
  ctx.fill();
  // Ember core in the chest.
  ctx.fillStyle = '#ffd166';
  circle(ctx, x, y + 2, 5 + Math.sin(G.time * 5) * 1.2);
  // Face shadow with two bright eyes.
  ctx.fillStyle = '#06232b';
  circle(ctx, x, y - 9, 7);
  ctx.fillStyle = '#ffd166';
  circle(ctx, x - 3, y - 10, 1.6);
  circle(ctx, x + 3, y - 10, 1.6);

  // Moonlit Ward: a pale violet ring while a ward is up to absorb a hit.
  if (p.shield) {
    ctx.strokeStyle = `rgba(233,213,255,${0.6 + 0.3 * Math.sin(G.time * 4)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, p.radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Dash cooldown ring.
  if (p.dashTimer > 0) {
    ctx.strokeStyle = 'rgba(46,196,182,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, p.radius + 7, -Math.PI / 2, -Math.PI / 2 + (1 - p.dashTimer / p.dashCooldown) * Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemy(ctx, G, e) {
  const bob = Math.sin(e.wobble) * 2;
  const x = e.x;
  const y = e.y + bob;
  const flash = e.flash > 0;

  // Elite aura.
  if (e.isElite) {
    ctx.strokeStyle = 'rgba(255,209,102,0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, e.radius + 6 + Math.sin(G.time * 4) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (e.kind === 'wisp') {
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.globalAlpha = 0.9;
    circle(ctx, x, y, e.radius);
    ctx.globalAlpha = 0.45;
    circle(ctx, x, y + e.radius * 0.7, e.radius * 0.6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a0b2e';
    circle(ctx, x - 4, y - 2, 2.5);
    circle(ctx, x + 4, y - 2, 2.5);
  } else if (e.kind === 'skitterer') {
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.strokeStyle = flash ? '#ffffff' : e.color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = e.wobble + (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * (e.radius + 7), y + Math.sin(a) * (e.radius + 7));
      ctx.stroke();
    }
    circle(ctx, x, y, e.radius);
    ctx.fillStyle = '#06232b';
    circle(ctx, x - 3, y - 2, 2);
    circle(ctx, x + 3, y - 2, 2);
  } else if (e.kind === 'brute') {
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + e.wobble * 0.2;
      const r = e.radius * (i % 2 === 0 ? 1 : 0.82);
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3d0a00';
    circle(ctx, x - 6, y - 4, 3);
    circle(ctx, x + 6, y - 4, 3);
  } else if (e.kind === 'spitter') {
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    circle(ctx, x, y, e.radius);
    ctx.fillStyle = '#3d2c00';
    circle(ctx, x, y + 3, 5);
    ctx.fillStyle = '#fff3c4';
    circle(ctx, x - 5, y - 5, 2);
    circle(ctx, x + 5, y - 5, 2);
  } else if (e.kind === 'shade') {
    // A lunger: a tilted violet diamond with one pale eye. While it aims,
    // a dashed telegraph line shows exactly where it is about to strike.
    if (e.lunge === 'aim') {
      const len = 150;
      ctx.strokeStyle = `rgba(199,125,255,${0.45 + 0.4 * Math.sin(G.time * 10)})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 7]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + e.aimX * len, y + e.aimY * len);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(233,213,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, e.radius + 5 + Math.sin(G.time * 8) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4 + e.wobble * 0.1);
    ctx.fillStyle = flash ? '#ffffff' : e.color;
    ctx.fillRect(-e.radius * 0.75, -e.radius * 0.75, e.radius * 1.5, e.radius * 1.5);
    ctx.restore();
    ctx.fillStyle = '#1a0b2e';
    circle(ctx, x, y - 1, 3);
    ctx.fillStyle = '#e9d5ff';
    circle(ctx, x, y - 1, 1.5);
  } else if (e.kind === 'boss') {
    // Gloomheart: a huge shadow heart with burning cracks.
    const pulse = 1 + Math.sin(G.time * 3) * 0.04;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = flash ? '#ffffff' : '#2b0a1e';
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.bezierCurveTo(-52, -6, -34, -46, 0, -22);
    ctx.bezierCurveTo(34, -46, 52, -6, 0, 26);
    ctx.fill();
    ctx.strokeStyle = '#ff2e63';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, -18);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-16, 12);
    ctx.moveTo(16, -20);
    ctx.lineTo(6, -2);
    ctx.lineTo(18, 10);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    circle(ctx, -12, -26, 4);
    circle(ctx, 12, -26, 4);
    ctx.restore();
  }

  // Small HP bar for tough foes.
  if ((e.isElite || e.kind === 'brute' || e.kind === 'boss') && e.hp < e.maxHp) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - w / 2, y - e.radius - 12, w, 5);
    ctx.fillStyle = '#ff2e63';
    ctx.fillRect(x - w / 2, y - e.radius - 12, w * Math.max(0, e.hp / e.maxHp), 5);
  }
}

function drawPickups(ctx, G) {
  for (const pk of G.pickups) {
    const bobY = Math.sin(pk.bob) * 3;
    if (pk.kind === 'heart') {
      ctx.fillStyle = '#7fe0c3';
      circle(ctx, pk.x - 4, pk.y + bobY - 2, 5);
      circle(ctx, pk.x + 4, pk.y + bobY - 2, 5);
      ctx.beginPath();
      ctx.moveTo(pk.x - 8, pk.y + bobY);
      ctx.lineTo(pk.x + 8, pk.y + bobY);
      ctx.lineTo(pk.x, pk.y + bobY + 9);
      ctx.closePath();
      ctx.fill();
    } else {
      const glow = ctx.createRadialGradient(pk.x, pk.y + bobY, 1, pk.x, pk.y + bobY, 14);
      glow.addColorStop(0, 'rgba(255,209,102,0.9)');
      glow.addColorStop(1, 'rgba(255,159,28,0)');
      ctx.fillStyle = glow;
      circle(ctx, pk.x, pk.y + bobY, 14);
      ctx.fillStyle = '#ff9f1c';
      circle(ctx, pk.x, pk.y + bobY, 4.5);
    }
  }
}

function drawProjectiles(ctx, G) {
  for (const pr of G.projectiles) {
    if (pr.kind === 'thorn') {
      ctx.strokeStyle = '#7fe0c3';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pr.x - pr.vx * 0.02, pr.y - pr.vy * 0.02);
      ctx.lineTo(pr.x, pr.y);
      ctx.stroke();
    } else {
      const glow = ctx.createRadialGradient(pr.x, pr.y, 1, pr.x, pr.y, 12);
      glow.addColorStop(0, 'rgba(255,209,102,0.95)');
      glow.addColorStop(1, 'rgba(255,107,53,0)');
      ctx.fillStyle = glow;
      circle(ctx, pr.x, pr.y, 12);
      ctx.fillStyle = '#ffd166';
      circle(ctx, pr.x, pr.y, pr.radius);
    }
  }
  for (const orb of G.enemyShots) {
    ctx.fillStyle = '#b78cff';
    circle(ctx, orb.x, orb.y, orb.radius + 2);
    ctx.fillStyle = '#3d1a6e';
    circle(ctx, orb.x, orb.y, orb.radius - 2);
  }
}

function drawFx(ctx, G) {
  for (const fx of G.novaFx) {
    const a = Math.max(0, fx.life / fx.maxLife);
    ctx.strokeStyle = `rgba(255,159,28,${a})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,209,102,${a * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.r * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const pt of G.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    circle(ctx, pt.x, pt.y, pt.size);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const f of G.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 15px Georgia, serif';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function bar(ctx, x, y, w, h, frac, fill, bg = 'rgba(0,0,0,0.55)') {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

function drawHUD(ctx, G) {
  const p = G.player;
  ctx.textAlign = 'left';
  ctx.font = 'bold 15px Georgia, serif';

  // HP bar.
  ctx.fillStyle = C.text;
  ctx.fillText('HP', 18, 30);
  bar(ctx, 52, 18, 220, 16, p.hp / p.maxHp, p.hp < 30 ? '#ff2e63' : '#2ec4b6');
  ctx.fillStyle = C.text;
  ctx.fillText(`${Math.ceil(p.hp)} / ${p.maxHp}`, 280, 31);

  // XP bar.
  ctx.fillText(`LV ${p.level}`, 18, 58);
  bar(ctx, 52, 46, 220, 10, p.xp / CONFIG.xpNeed(p.level), '#ff9f1c');
  ctx.fillText(`${p.xp} / ${CONFIG.xpNeed(p.level)} XP`, 280, 56);

  // Dash readiness: a full teal bar means Space is ready to fire.
  const dashFrac = p.dashCooldown > 0 ? 1 - Math.max(0, p.dashTimer) / p.dashCooldown : 1;
  ctx.fillText('DASH', 18, 82);
  bar(ctx, 52, 70, 220, 8, dashFrac, dashFrac >= 1 ? '#2ec4b6' : '#0e7c7b');
  ctx.fillText(dashFrac >= 1 ? 'ready' : '…', 280, 80);

  // Blessings taken this run, as a row of icons under the bars.
  const owned = [...new Set(p.blessings || [])];
  if (owned.length > 0) {
    ctx.fillText('BLESSINGS', 18, 106);
    ctx.font = '17px serif';
    owned.forEach((id, i) => {
      const b = BLESSING_ICONS[id] || '✦';
      ctx.fillText(b, 118 + i * 26, 107);
    });
    ctx.font = 'bold 15px Georgia, serif';
  }

  // Right side: wave, timer, kills, score.
  ctx.textAlign = 'right';
  const mm = Math.floor(G.time / 60);
  const ss = String(Math.floor(G.time % 60)).padStart(2, '0');
  ctx.fillStyle = C.text;
  ctx.font = 'bold 20px Georgia, serif';
  ctx.fillText(`WAVE ${G.wave} / ${CONFIG.waves.total}`, CONFIG.width - 18, 32);
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillStyle = C.textDim;
  ctx.fillText(`${mm}:${ss}   ☠ ${G.kills}   ★ ${G.score}`, CONFIG.width - 18, 56);
  // Foes still to come this wave: the queue plus the living field.
  const foesLeft = G.enemies.length + (G.spawnQueue ? G.spawnQueue.length : 0);
  ctx.fillText(`FOES LEFT ${foesLeft}`, CONFIG.width - 18, 80);

  // Wave banner.
  if (G.waveBannerTimer > 0) {
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, G.waveBannerTimer);
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(G.waveBanner, CONFIG.width / 2, 120);
    ctx.globalAlpha = 1;
  }

  // Boss HP bar.
  if (G.boss && G.boss.alive) {
    const w = 460;
    const x = (CONFIG.width - w) / 2;
    const y = CONFIG.height - 44;
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.fillStyle = '#ff2e63';
    ctx.fillText(`👑 ${CONFIG.boss.name}`, CONFIG.width / 2, y - 8);
    bar(ctx, x, y, w, 14, G.boss.hp / G.boss.maxHp, '#ff2e63');
  }

  // Bottom hint + mute state.
  ctx.textAlign = 'left';
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = 'rgba(159,184,178,0.85)';
  ctx.fillText('WASD move · Space dash · P pause · M mute', 18, CONFIG.height - 14);
  ctx.textAlign = 'right';
  ctx.fillText(G.audio.muted ? '🔇 muted (M)' : '🔊 sound on (M)', CONFIG.width - 18, CONFIG.height - 14);
}

// ---- Buttons (canvas-drawn, mouse-clickable) ----
export function addButton(G, x, y, w, h, label, action) {
  const hover = G.input.mouse.x >= x && G.input.mouse.x <= x + w
    && G.input.mouse.y >= y && G.input.mouse.y <= y + h;
  G.ui.buttons.push({ x, y, w, h, label, action, hover });
  return hover;
}

export function drawButtons(ctx, G) {
  ctx.textAlign = 'center';
  for (const b of G.ui.buttons) {
    // Level-up cards register as buttons too but draw themselves; skip them here.
    if (!b.label) continue;
    ctx.fillStyle = b.hover ? '#ff9f1c' : 'rgba(14,124,123,0.9)';
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = b.hover ? '#1a0b00' : '#f4ead8';
    ctx.font = 'bold 20px Georgia, serif';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 7);
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(3,20,26,0.88)';
  ctx.strokeStyle = '#0e7c7b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
}

function statLine(ctx, label, value, x, y) {
  ctx.textAlign = 'left';
  ctx.fillStyle = C.textDim;
  ctx.font = '17px Georgia, serif';
  ctx.fillText(label, x, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = C.text;
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText(String(value), x + 300, y);
}

export function drawTitle(ctx, G) {
  ctx.textAlign = 'center';
  // Three wisps drift behind the title, so the menu itself shows the foe.
  const wispSpots = [
    { x: 300, y: 250, ph: 0 },
    { x: 990, y: 230, ph: 2.1 },
    { x: 940, y: 470, ph: 4.2 },
  ];
  for (const w of wispSpots) {
    const wy = w.y + Math.sin(G.time * 1.2 + w.ph) * 8;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#b78cff';
    circle(ctx, w.x, wy, 15);
    ctx.globalAlpha = 0.4;
    circle(ctx, w.x, wy + 10, 9);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1a0b2e';
    circle(ctx, w.x - 5, wy - 2, 2.5);
    circle(ctx, w.x + 5, wy - 2, 2.5);
  }
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('EMBERFALL', CONFIG.width / 2, 168);
  ctx.fillStyle = '#ff6b35';
  ctx.font = 'italic 28px Georgia, serif';
  ctx.fillText('Last Light of the Grove', CONFIG.width / 2, 210);

  ctx.fillStyle = C.text;
  ctx.font = '18px Georgia, serif';
  ctx.fillText('You are the last Ember Warden. The grove burns and shadow wisps pour in.', CONFIG.width / 2, 262);
  ctx.fillText('Survive 10 waves, slay Gloomheart, and keep the last light alive.', CONFIG.width / 2, 290);
  ctx.fillStyle = C.textDim;
  ctx.font = '16px Georgia, serif';
  ctx.fillText('WASD / arrows — move      Space — dash (brief immunity)', CONFIG.width / 2, 330);
  ctx.fillText('Attacks fire on their own — gather embers, level up, choose blessings', CONFIG.width / 2, 356);
  ctx.fillText('The grove mends you +8 HP after every wave you clear.', CONFIG.width / 2, 382);
  if (G.best > 0) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 17px Georgia, serif';
    ctx.fillText(`Best score: ${G.best}`, CONFIG.width / 2, 416);
  }
  addButton(G, CONFIG.width / 2 - 130, 430, 260, 56, '▶  PLAY', 'start');
  ctx.fillStyle = C.textDim;
  ctx.font = '15px Georgia, serif';
  ctx.fillText('or press Enter', CONFIG.width / 2, 516);
}

export function drawLevelUp(ctx, G) {
  ctx.fillStyle = 'rgba(3,20,26,0.72)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText(`LEVEL ${G.player.level} — CHOOSE A BLESSING`, CONFIG.width / 2, 130);
  const cw = 300;
  const ch = 210;
  const gap = 26;
  const total = cw * 3 + gap * 2;
  const x0 = (CONFIG.width - total) / 2;
  G.levelChoices.forEach((b, i) => {
    const x = x0 + i * (cw + gap);
    const y = 190;
    const hover = G.input.mouse.x >= x && G.input.mouse.x <= x + cw
      && G.input.mouse.y >= y && G.input.mouse.y <= y + ch;
    ctx.fillStyle = hover ? 'rgba(255,159,28,0.22)' : 'rgba(10,46,51,0.95)';
    ctx.strokeStyle = hover ? '#ffd166' : '#0e7c7b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, cw, ch, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '44px serif';
    ctx.fillText(b.icon, x + cw / 2, y + 66);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 21px Georgia, serif';
    ctx.fillText(b.name, x + cw / 2, y + 108);
    ctx.fillStyle = C.text;
    ctx.font = '16px Georgia, serif';
    const words = b.desc.split(' ');
    let line = '';
    let ly = y + 142;
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 26) {
        ctx.fillText(line.trim(), x + cw / 2, ly);
        ly += 22;
        line = w;
      } else line += ' ' + w;
    }
    ctx.fillText(line.trim(), x + cw / 2, ly);
    ctx.fillStyle = C.textDim;
    ctx.font = '15px Georgia, serif';
    ctx.fillText(`press ${i + 1}`, x + cw / 2, y + ch - 16);
    G.ui.buttons.push({ x, y, w: cw, h: ch, label: '', action: `blessing:${i}`, hover });
  });
}

export function drawEnd(ctx, G, won) {
  const s = G.endStats || { score: G.score, kills: G.kills, level: G.player.level, wave: G.wave, time: G.time };
  const mm = Math.floor(s.time / 60);
  const ss = String(Math.floor(s.time % 60)).padStart(2, '0');
  ctx.textAlign = 'center';
  if (won) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 58px Georgia, serif';
    ctx.fillText('👑 THE GROVE LIVES!', CONFIG.width / 2, 150);
    ctx.fillStyle = C.text;
    ctx.font = '20px Georgia, serif';
    ctx.fillText('Gloomheart is slain. Dawn breaks over the embers — the last light holds.', CONFIG.width / 2, 192);
  } else {
    ctx.fillStyle = '#ff2e63';
    ctx.font = 'bold 58px Georgia, serif';
    ctx.fillText('THE LIGHT FADES…', CONFIG.width / 2, 150);
    ctx.fillStyle = C.text;
    ctx.font = '20px Georgia, serif';
    ctx.fillText('The warden has fallen, but the grove remembers. Try again, keeper.', CONFIG.width / 2, 192);
  }
  panel(ctx, CONFIG.width / 2 - 190, 230, 380, 220);
  const x = CONFIG.width / 2 - 160;
  statLine(ctx, 'Score', s.score, x, 268);
  statLine(ctx, 'Wisps slain', s.kills, x, 298);
  statLine(ctx, 'Level reached', s.level, x, 328);
  statLine(ctx, 'Wave reached', `${s.wave} / ${CONFIG.waves.total}`, x, 358);
  statLine(ctx, 'Time survived', `${mm}:${ss}`, x, 388);
  statLine(ctx, 'Best score', Math.max(G.best, s.score), x, 418);
  addButton(G, CONFIG.width / 2 - 130, 486, 260, 56, '↻  PLAY AGAIN', 'restart');
  ctx.fillStyle = C.textDim;
  ctx.font = '15px Georgia, serif';
  ctx.fillText('or press R', CONFIG.width / 2, 572);
}

export function drawPaused(ctx, G) {
  ctx.fillStyle = 'rgba(3,20,26,0.7)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.text;
  ctx.font = 'bold 46px Georgia, serif';
  ctx.fillText('PAUSED', CONFIG.width / 2, 300);
  ctx.fillStyle = C.textDim;
  ctx.font = '18px Georgia, serif';
  ctx.fillText('Press P to resume', CONFIG.width / 2, 340);
  addButton(G, CONFIG.width / 2 - 130, 380, 260, 56, '▶  RESUME', 'resume');
}

// Master draw: world first, then the screen that sits on top of it.
export function render(G) {
  const ctx = G.ctx;
  ctx.save();
  if (G.shake > 0.3) {
    ctx.translate(G.rng.range(-G.shake, G.shake) * 0.5, G.rng.range(-G.shake, G.shake) * 0.5);
  }
  drawBackground(ctx, G);
  if (G.mode !== 'title') {
    drawShrine(ctx, G);
    drawPickups(ctx, G);
    for (const e of G.enemies) drawEnemy(ctx, G, e);
    drawProjectiles(ctx, G);
    drawPlayer(ctx, G);
    drawFx(ctx, G);
  }
  ctx.restore();

  G.ui.buttons = [];
  if (G.mode === 'title') {
    drawTitle(ctx, G);
  } else if (G.mode === 'playing' || G.mode === 'paused' || G.mode === 'levelup') {
    drawHUD(ctx, G);
    if (G.mode === 'paused') drawPaused(ctx, G);
    if (G.mode === 'levelup') drawLevelUp(ctx, G);
  } else if (G.mode === 'victory') {
    drawEnd(ctx, G, true);
  } else if (G.mode === 'defeat') {
    drawEnd(ctx, G, false);
  }
  drawButtons(ctx, G);
}
