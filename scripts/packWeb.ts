/**
 * `npm run pack:web` (GAME_SPEC F6): the production build in dist/ as one zip for itch.io, with
 * index.html at its root. Checks that the page only links relative paths, since itch.io serves
 * the game from a sub-path, and that it fits the size budget (§10: under 2 MB gzip).
 * Exits with 1 when it does not.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import pkg from '../package.json' with { type: 'json' };
import { zip } from './zip';

/** Node's process, without pulling in all of its types for one exit code. */
declare const process: { exitCode?: number };

const DIST = 'dist';
const RELEASE = 'release';
const BUDGET_BYTES = 2 * 1024 * 1024;

/** Every file under `dir`, relative to it with forward slashes, in a stable order. */
function filesIn(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? filesIn(`${dir}/${entry.name}`, `${prefix}${entry.name}/`)
        : [`${prefix}${entry.name}`],
    )
    .sort();
}

const problems: string[] = [];
const names = existsSync(DIST) ? filesIn(DIST) : [];
if (!names.includes('index.html')) problems.push(`no ${DIST}/index.html: run npm run build`);
else {
  const page = new TextDecoder().decode(readFileSync(`${DIST}/index.html`));
  // `/assets/…` would point at the root of itch.io's server, not at the game.
  if (/\s(?:src|href)="\/(?!\/)/.test(page)) problems.push('index.html links absolute paths');
}

if (problems.length === 0) {
  const archive = zip(names.map((name) => ({ name, data: readFileSync(`${DIST}/${name}`) })));
  mkdirSync(RELEASE, { recursive: true });
  const path = `${RELEASE}/hlbina-${pkg.version}-web.zip`;
  writeFileSync(path, archive);
  const kb = (bytes: number): string => `${Math.round(bytes / 1024)} kB`;
  console.log(`${path}: ${names.length} files, ${kb(archive.length)} (budget ${kb(BUDGET_BYTES)})`);
  if (archive.length > BUDGET_BYTES) problems.push('the build is over the size budget');
}
for (const problem of problems) console.error(`pack:web: ${problem}`);
process.exitCode = problems.length === 0 ? 0 : 1;
