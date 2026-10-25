/**
 * `npm run playtest` (GAME_SPEC F6, §10): a scripted player plays whole games on the real
 * simulation, from the first trip to the finale, without debug tools. It shows that the game can
 * be finished and how long the way there takes.
 * Exits with 1 when a game is not finished.
 */
import { BALANCE } from '../src/data/balance';
import { mixSeed } from '../src/core/rng';
import { playthrough, type Playthrough } from './playtest/run';

/** Node's process, without pulling in all of its types for one exit code. */
declare const process: { exitCode?: number; argv: string[] };

const games = Number(process.argv[2] ?? BALANCE.seeds);
const hours = Number(process.argv[3] ?? BALANCE.maxHours);
const fmt = (value: number | null | undefined): string =>
  value === null || value === undefined ? '-' : value.toFixed(1);
const money = (value: number): string => `$${Math.round(value / 1000)}k`;

const results: Playthrough[] = [];
for (let i = 0; i < games; i++) {
  const seed = mixSeed(2026, i + 1);
  const result = playthrough(seed, hours);
  results.push(result);
  const zones = [2, 3, 4, 5].map((zone) => `z${zone} ${fmt(result.zoneMinutes[zone])}`).join(' ');
  console.log(
    `seed ${seed}: ${result.finished ? 'finished' : 'NOT finished'} in ${fmt(result.minutes)} min, ` +
      `${result.trips} trips, first upgrade ${fmt(result.firstUpgradeMinutes)} min, ${zones}, ` +
      `relics ${result.relics}, rescues ${result.rescues}, wrecks ${result.wrecks}, ` +
      `escapes lost ${result.escapesLost}, trips without an upgrade ${result.maxDryTrips}, ` +
      `spent ${money(result.spent)}, ore left ${money(result.oreLeft)}` +
      (result.stopped ? `, stopped: ${result.stopped}` : ''),
  );
}

const average = (pick: (result: Playthrough) => number | null | undefined): string => {
  const values = results.map(pick).filter((value): value is number => typeof value === 'number');
  return values.length ? fmt(values.reduce((a, b) => a + b, 0) / values.length) : '-';
};
const finished = results.filter((result) => result.finished);
console.log(`\nFinished ${finished.length} of ${results.length} games.`);
console.log(`The bot on average, in its own minutes:`);
console.log(`  first upgrade ${average((r) => r.firstUpgradeMinutes)} min`);
for (const zone of [2, 3, 4, 5])
  console.log(`  zone ${zone}: ${average((r) => r.zoneMinutes[zone])} min`);
console.log(`  finale: ${average((r) => (r.finished ? r.minutes : null))} min`);
process.exitCode = finished.length === results.length ? 0 : 1;
