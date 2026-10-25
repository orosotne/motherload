/**
 * `npm run sim:economy` (GAME_SPEC §6): income per trip for every zone and tier, time to the
 * next purchase, and a whole game played by the model against the targets of the early game.
 * Exits with 1 when a target is missed. The whole game is the playtest's (`npm run playtest`).
 */
import { TIER_PRICES, UPGRADE_BRANCHES } from '../src/data/upgrades';

/** Node's process, without pulling in all of its types for one exit code. */
declare const process: { exitCode?: number };
import { statsFor, type Tiers } from '../src/sim/stats';
import { measureBands } from './economy/bands';
import { simulateProgression } from './economy/progression';
import { checkTargets } from './economy/report';
import { bestTrip } from './economy/trip';

const money = (value: number): string => `$${Math.round(value).toLocaleString('en-US')}`;
const pad = (text: string, width: number): string => text.padStart(width);

const bands = measureBands();

console.log('\nIncome per trip by zone and tier (all branches at that tier, shaft already dug)\n');
console.log(
  ['tier', 'zone', 'net/trip', 'min/trip', '$/min', 'next tier', 'trips']
    .map((h) => pad(h, 10))
    .join(''),
);
for (let tier = 0; tier < TIER_PRICES.length; tier++) {
  const tiers = Object.fromEntries(UPGRADE_BRANCHES.map((branch) => [branch, tier])) as Tiers;
  const stats = statsFor(tiers);
  const next = TIER_PRICES[tier + 1];
  for (let zone = 1; zone <= 5; zone++) {
    const shaft = Math.max(...bands.filter((band) => band.zone === zone).map((b) => b.midRow));
    const trip = bestTrip(bands, stats, shaft, zone);
    const cells = trip
      ? [
          money(trip.net),
          (trip.seconds / 60).toFixed(1),
          money((trip.net / trip.seconds) * 60),
          next ? money(next) : '-',
          next ? (next / trip.net).toFixed(1) : '-',
        ]
      : ['out of reach', '', '', '', ''];
    console.log([`T${tier + 1}`, String(zone), ...cells].map((cell) => pad(cell, 10)).join(''));
  }
}

const timeline = simulateProgression(bands);
console.log(`\nA game played by the model: ${timeline.trips} trips\n`);
for (const event of timeline.events) {
  const at = pad(`${event.minutes.toFixed(1)} min`, 10);
  if (event.kind === 'buy')
    console.log(`${at}  buy ${event.branch} T${event.tier + 1} for ${money(event.price)}`);
  if (event.kind === 'relic') console.log(`${at}  relic ${event.index + 1}`);
}
console.log('\nZones first reached:');
for (const [zone, minutes] of Object.entries(timeline.zoneMinutes)) {
  console.log(`  zone ${zone}: ${minutes.toFixed(1)} min`);
}
const finale = timeline.finaleMinutes;
console.log(
  `\nFinale: ${finale === null ? `not reached, ${timeline.stuck ?? 'out of time'}` : `${finale.toFixed(1)} min`}` +
    `; at most ${timeline.maxTripsPerPurchase} trips before a purchase`,
);

const checks = checkTargets(timeline);
console.log('\nBalance targets of the early game (§6; the whole game: npm run playtest):');
for (const check of checks)
  console.log(`  ${check.ok ? 'ok  ' : 'MISS'} ${check.name}: ${check.detail}`);
process.exitCode = checks.every((check) => check.ok) ? 0 : 1;
