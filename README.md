# Emberfall: Last Light of the Grove

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/dhany999/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/dhany999/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An original 2D arena-survival game for the make.fun **best-game-01** competition.
Vanilla JavaScript on canvas, no libraries, no external assets, no network
requests — every pixel and sound is generated in code.

## The game

You are the last Ember Warden in a burning grove. Shadow wisps pour in over
10 escalating waves. Your attacks fire automatically at the nearest foe; you
steer, dodge, and dash. Slain wisps drop embers — gather them to level up and
choose 1 of 3 blessings. Elites stalk the grove from wave 4. On wave 10 the
boss **Gloomheart** enters first, with the last adds dripping in behind it:
slay it to win. Fall to 0 HP and the light fades.

The grove mends you: every wave you clear heals +8 HP, so a run that
survives the mid-game can still reach the finale on its feet.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Space | Dash (brief immunity) |
| P | Pause / resume |
| M | Mute / unmute |
| Enter / click | Start, confirm |
| R | Restart on victory / defeat screens |
| 1 / 2 / 3 or click | Choose a blessing on level-up |

Mouse works on every menu button. The HUD shows HP, XP, a dash-readiness
bar, wave, timer, kills and score — and a boss HP bar when Gloomheart lives.

## Depth

- **3 weapons**: ember bolt (always on), nova ring (unlockable radial pulse),
  thorn volley (unlockable spread shot) — each with upgrade blessings.
- **11 blessings**: damage, fire rate, move speed, max HP, dash cooldown,
  ember magnet, weapon unlocks and weapon upgrades — plus **Thornmail**,
  which makes foes that touch you take damage back.
- **5 foes**: wisp (chaser), skitterer (fast zig-zag, from wave 1),
  brute (tanky), spitter (ranged orbs), elite variants — plus the boss with
  radial bursts and wisp summons.
- **Feel**: hit particles, screen shake, hit flash, floating damage numbers,
  synthesized WebAudio SFX (hit, pickup, level-up, boss roar, victory/defeat)
  with a mute toggle. Ember-orange on deep teal night.
- **Balance** (v2): a smooth curve — busier opening waves, elites later and
  weaker, brutes never elite before wave 6, the boss at 850 HP with smaller
  bursts, and wave-clear healing. An autoplayed test pilot now wins the run
  instead of dying on wave 5.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Seeded runs: `http://localhost:8080/?seed=7` replays one fixed grove, so a
run can be shared and replayed exactly.

## Screenshots

Deterministic scenes, rendered by the game itself from a fixed seed:

```sh
# ?shot=title|play|victory|defeat  (see shots.json)
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to
`/output` and writes `/output/dossier.json` with `buildDossier` from
`vendor/makefun-game.ts`, then prints a summary and fails loudly if any
gate cap is breached.

## Layout

```
game/
  index.html          page shell + canvas
  src/
    main.js           bootstrap + game loop + seeded runs
    config.js         tuning (player, weapons, enemies, waves, XP, boss)
    input.js          keyboard + mouse
    random.js         seeded RNG
    player.js         warden movement, dash, auto-fire, damage
    enemies.js        wisps, elites, boss Gloomheart
    projectiles.js    bolts, thorns, enemy orbs
    pickups.js        embers (XP) and hearts
    waves.js          wave director + wave-clear healing
    upgrades.js       blessings / level-up choices
    audio.js          synthesized WebAudio SFX
    render.js         all drawing: grove, entities, HUD, menus
    ui.js             menu actions, clicks, menu keys
    shots.js          deterministic screenshot scenes
screenshots/          4 renders of the game (title, play, victory, defeat)
vendor/makefun-game.ts  kit library, unchanged
```

## License

MIT — see `LICENSE`.
