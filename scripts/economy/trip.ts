import { BALANCE } from '../../src/data/balance';
import { Block, BLOCKS } from '../../src/data/blocks';
import { ECONOMY, FUEL } from '../../src/data/economy';
import { gasDamage } from '../../src/data/hazards';
import { WORLD } from '../../src/data/world';
import type { PodStats } from '../../src/sim/stats';
import type { Band } from './bands';

/** One trip down to a band, mining until the hold, the tank or the nerve runs out, and back. */
export interface Trip {
  band: Band;
  seconds: number;
  liters: number;
  units: number;
  gross: number;
  damage: number;
  /** Fuel and repairs afterwards. */
  costs: number;
  net: number;
}

const oreHardness = BLOCKS[Block.Ore].hardness;
const ORE_BONUS = oreHardness.kind === 'zone' ? oreHardness.bonus : 0;

export function depthOfRow(row: number): number {
  return (row + 1) * WORLD.metersPerBlock;
}

function bandOf(bands: readonly Band[], row: number): Band | undefined {
  return bands[Math.floor(row / BALANCE.bandRows)];
}

/** How well the player sees ore: fully in daylight, deeper as far as the headlight reaches. */
function visibility(band: Band, lightRange: number): number {
  if (band.lastRow < BALANCE.daylightRows) return 1;
  return Math.min(1, lightRange / BALANCE.lightFullRange);
}

function gasPerBlock(band: Band): number {
  return band.gasShare * (1 - BALANCE.gasAvoided) * gasDamage(band.zone);
}

/**
 * Plans a trip to `band` with an open shaft down to `shaftRow`; null when the pod cannot do it
 * (too hot, not enough fuel for the way back, too risky for the hull).
 */
export function planTrip(
  bands: readonly Band[],
  stats: PodStats,
  shaftRow: number,
  band: Band,
): Trip | null {
  if (depthOfRow(band.midRow) > stats.safeDepthMeters) return null;
  const rows = band.midRow + 1;
  const open = Math.min(shaftRow + 1, rows);
  let seconds = open / BALANCE.descentSpeed;
  let liters = seconds * BALANCE.descentFuelPerSecond;
  let damage = 0;
  for (let row = open; row < rows; row++) {
    const rowBand = bandOf(bands, row) ?? band;
    const drilling = rowBand.hardness * stats.drillSecondsPerHardness;
    seconds += drilling;
    liters += drilling * FUEL.drillPerSecond;
    damage += gasPerBlock(rowBand);
  }
  const climb = rows / stats.climbSpeed + 1;
  const climbLiters = climb * FUEL.flyPerSecond;
  const budget = stats.tankLiters * (1 - BALANCE.fuelReserve) - liters - climbLiters;
  const hullLeft = stats.maxHull * BALANCE.hullRisk - damage;
  if (budget <= 0 || hullLeft <= 0) return null;

  const targeting = 1 + (BALANCE.targeting - 1) * visibility(band, stats.lightRange);
  const yieldPerBlock = Math.min(1, band.oreShare * targeting);
  if (yieldPerBlock <= 0) return null;
  const drilling = (band.hardness + ORE_BONUS * yieldPerBlock) * stats.drillSecondsPerHardness;
  const blockSeconds = drilling + BALANCE.moveSecondsPerBlock;
  const blockLiters =
    drilling * FUEL.drillPerSecond + BALANCE.moveSecondsPerBlock * FUEL.drivePerSecond;
  const blockDamage = gasPerBlock(band);
  const blocks = Math.min(
    stats.cargoCapacity / yieldPerBlock,
    budget / blockLiters,
    blockDamage > 0 ? hullLeft / blockDamage : Infinity,
  );
  const units = Math.floor(blocks * yieldPerBlock + 1e-9);
  if (units <= 0) return null;
  const mined = units / yieldPerBlock;
  seconds += mined * blockSeconds + climb + BALANCE.tripOverheadSeconds + BALANCE.surfaceSeconds;
  liters += mined * blockLiters + climbLiters;
  damage += mined * blockDamage;
  const gross = units * band.valuePerOre;
  const costs = liters * ECONOMY.fuelPricePerLiter + damage * ECONOMY.repairPricePerHp;
  return { band, seconds, liters, units, gross, damage, costs, net: gross - costs };
}

export function tripRate(trip: Trip | null): number {
  return trip ? trip.net / trip.seconds : 0;
}

/** The trip with the best income per second, or null when no band is within reach. */
export function bestTrip(
  bands: readonly Band[],
  stats: PodStats,
  shaftRow: number,
  zone?: number,
): Trip | null {
  let best: Trip | null = null;
  for (const band of bands) {
    if (zone !== undefined && band.zone !== zone) continue;
    const trip = planTrip(bands, stats, shaftRow, band);
    if (trip && tripRate(trip) > tripRate(best)) best = trip;
  }
  return best;
}

/**
 * The trip a player picks: the deepest band that pays nearly as well as the best one, since the
 * point of the game is to get deeper (§1).
 */
export function chosenTrip(bands: readonly Band[], stats: PodStats, shaftRow: number): Trip | null {
  const trips = bands
    .filter((band) => band.midRow <= shaftRow + BALANCE.newRowsPerTrip)
    .map((band) => planTrip(bands, stats, shaftRow, band))
    .filter((trip): trip is Trip => trip !== null && trip.net > 0);
  const best = Math.max(0, ...trips.map(tripRate));
  const good = trips.filter((trip) => tripRate(trip) >= best * BALANCE.depthPreference);
  return good[good.length - 1] ?? null;
}

/** Index of the deepest band a pod can mine, −1 when none. */
export function reach(bands: readonly Band[], stats: PodStats, shaftRow: number): number {
  for (let i = bands.length - 1; i >= 0; i--) {
    const band = bands[i];
    if (band && planTrip(bands, stats, shaftRow, band)) return i;
  }
  return -1;
}
