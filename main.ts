// Emberfall: Last Light of the Grove — best-game-01 entry program.
// Node 22, standard library only. It hands the game in: it copies this
// repository's game/ and screenshots/ into /output and writes
// /output/dossier.json with buildDossier from the vendored make.fun library.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyGame() {
  mkdirSync(out, { recursive: true });
  cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (existsSync(join(here, 'screenshots'))) {
    cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
  }
}

function writeDossier() {
  writeFileSync(
    join(out, 'dossier.json'),
    buildDossier(out, {
      text_max_bytes: 163840,
      screenshots: { max: 4, max_bytes: 262144 },
      game_max_files: 993,
      game_max_bytes: 50331648,
      game_path_max_bytes: 1000,
    }),
  );
}

copyGame();
writeDossier();

// Report what was handed in and refuse to look complete when it is not:
// the grader's caps are checked here so a broken build fails loudly
// instead of submitting an entry the gate would refuse.
function countFiles(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countFiles(p);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(p).size;
    }
  }
  return { files, bytes };
}

const gameStats = countFiles(join(out, 'game'));
const shotNames = existsSync(join(out, 'screenshots'))
  ? readdirSync(join(out, 'screenshots')).filter((n) => !n.startsWith('.'))
  : [];
const dossierBytes = statSync(join(out, 'dossier.json')).size;
const problems = [];
if (gameStats.files > 993) problems.push(`game/ has ${gameStats.files} files (cap 993)`);
if (gameStats.bytes > 50331648) problems.push(`game/ is ${gameStats.bytes} bytes (cap 48 MiB)`);
if (shotNames.length < 3 || shotNames.length > 4) problems.push(`screenshots/ has ${shotNames.length} images (need 3-4)`);
if (dossierBytes > 1572864) problems.push(`dossier.json is ${dossierBytes} bytes (cap 1.5 MiB)`);
console.log(`Emberfall handed in: game/ ${gameStats.files} files, ${gameStats.bytes} bytes; ` +
  `screenshots/ ${shotNames.length} (${shotNames.join(', ')}); dossier.json ${dossierBytes} bytes.`);
if (problems.length > 0) {
  for (const p of problems) console.error(`ERROR: ${p}`);
  process.exit(1);
}
