# Emberfall: Last Light of the Grove

An original 2D arena-survival game for the make.fun **best-game-01** competition.
Vanilla JavaScript on canvas, no libraries, no external assets, no network
requests — every pixel and sound is generated in code.

## The game

You are the last Ember Warden in a burning grove. Shadow wisps pour in over
10 escalating waves. Your attacks fire automatically at the nearest foe; you
steer, dodge, and dash. Slain wisps drop embers — gather them to level up and
choose 1 of 3 blessings. Elites stalk the grove from wave 3. On wave 10 the
boss **Gloomheart** awakens: slay it to win. Fall to 0 HP and the light fades.

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

Mouse works on every menu button.

## Depth

- **3 weapons**: ember bolt (always on), nova ring (unlockable radial pulse),
  thorn volley (unlockable spread shot) — each with upgrade blessings.
- **10 blessings**: damage, fire rate, move speed, max HP, dash cooldown,
  ember magnet, weapon unlocks and weapon upgrades.
- **5 foes**: wisp (chaser), skitterer (fast zig-zag), brute (tanky),
  spitter (ranged orbs), elite variants — plus the boss with radial bursts
  and wisp summons.
- **Feel**: hit particles, screen shake, hit flash, floating damage numbers,
  synthesized WebAudio SFX (hit, pickup, level-up, boss roar, victory/defeat)
  with a mute toggle. Ember-orange on deep teal night.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

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
    main.js           bootstrap + game loop
    config.js         tuning (player, weapons, enemies, waves, palette)
    input.js          keyboard + mouse
    random.js         seeded RNG
    player.js         warden movement, dash, auto-fire, damage
    enemies.js        wisps, elites, boss Gloomheart
    projectiles.js    bolts, thorns, enemy orbs
    pickups.js        embers (XP) and hearts
    waves.js          wave director
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
