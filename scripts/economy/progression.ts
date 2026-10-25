import { BALANCE } from '../../src/data/balance';
import { ECONOMY, FUEL } from '../../src/data/economy';
import { gasDamage, HEAT } from '../../src/data/hazards';
import { RELICS, relicBonus, relicRow } from '../../src/data/relics';
import { TIER_PRICES, UPGRADE_BRANCHES, type UpgradeBranch } from '../../src/data/upgrades';
import { WORLD } from '../../src/data/world';
import { statsFor, startTiers, type PodStats, type Tiers } from '../../src/sim/stats';
import { maxTier } from '../../src/sim/upgrades';
import type { Band } from './bands';
import { chosenTrip, depthOfRow, planTrip, reach, tripRate, type Trip } from './trip';

export type TimelineEvent =
  | { kind: 'trip'; minutes: number; trip: Trip; cash: number }
  | { kind: 'buy'; minutes: number; branch: UpgradeBranch; tier: number; price: number }
  | { kind: 'relic'; minutes: number; index: number };

/** A whole game played by the model, from the first trip to the finale. */
export interface Timeline {
  events: TimelineEvent[];
  firstUpgrade: { minutes: number; trips: number } | null;
  /** Minutes until the first trip into each zone. */
  zoneMinutes: Record<number, number>;
  finaleMinutes: number | null;
  /** Most trips in a row without a purchase. */
  maxTripsPerPurchase: number;
  trips: number;
  /** Why the model stopped short of the finale, if it did. */
  stuck: string | null;
}

/**
 * The affordable upgrade worth the most per dollar, if any: more income per second, or a
 * deeper band within reach, which a player wants for the relics and the core.
 */
function chooseUpgrade(
  bands: readonly Band[],
  tiers: Tiers,
  shaftRow: number,
  cash: number,
): { branch: UpgradeBranch; price: number } | null {
  const stats = statsFor(tiers);
  // Valued where the player mines now: the band of the trip they would pick.
  const current = chosenTrip(bands, stats, shaftRow);
  if (!current) return null;
  const now = tripRate(current);
  const reachNow = reach(bands, stats, shaftRow);
  let best: { branch: UpgradeBranch; price: number; score: number } | null = null;
  for (const branch of UPGRADE_BRANCHES) {
    const tier = tiers[branch] + 1;
    const price = TIER_PRICES[tier];
    if (tier > maxTier(branch) || price === undefined || price > cash) continue;
    const next = statsFor({ ...tiers, [branch]: tier });
    const gain = tripRate(planTrip(bands, next, shaftRow, current.band)) - now;
    const deeper = Math.max(reach(bands, next, shaftRow) - reachNow, 0);
    // The finale needs a strong engine even when mining does not.
    const needed = branch === 'engine' && tier <= BALANCE.finaleEngineTier ? 0.02 : 0;
    const score = (gain + (deeper * BALANCE.reachValue + needed) * Math.max(now, 1)) / price;
    if (score > 0 && (!best || score > best.score)) best = { branch, price, score };
  }
  return best;
}

/**
 * The finale dive (§7): from the deepest open row down to the bottom, through the heat. Fuel and
 * hull refill when the escape starts, so only the way down counts. Seconds, or null if fatal.
 */
function finaleDive(bands: readonly Band[], stats: PodStats, shaftRow: number): number | null {
  const bottom = WORLD.height - 1;
  let seconds = (shaftRow + 1) / BALANCE.descentSpeed;
  let liters = seconds * BALANCE.descentFuelPerSecond;
  let damage = 0;
  let heat = 0;
  for (let row = Math.max(shaftRow + 1, 0); row <= bottom; row++) {
    const band = bands[Math.floor(row / BALANCE.bandRows)];
    if (!band) return null;
    const drilling = band.hardness * stats.drillSecondsPerHardness;
    seconds += drilling;
    liters += drilling * FUEL.drillPerSecond;
    damage += band.gasShare * (1 - BALANCE.gasAvoided) * gasDamage(band.zone);
    const excess = depthOfRow(row) - stats.safeDepthMeters;
    if (excess > 0) {
      const filled = heat + (HEAT.fillPerSecond + HEAT.fillPerMeter * excess) * drilling;
      if (filled >= 1) damage += ((filled - 1) / (filled - heat)) * drilling * HEAT.damagePerSecond;
      heat = Math.min(filled, 1);
    }
  }
  return liters <= stats.tankLiters && damage <= stats.maxHull * BALANCE.finaleRisk
    ? seconds
    : null;
}

/** Plays the game with the model: trips, purchases and relics until the finale (§6 targets). */
export function simulateProgression(measured: readonly Band[]): Timeline {
  // Its own copy: the trips use the bands up.
  const bands = measured.map((band) => ({ ...band }));
  const tiers = startTiers();
  let stats = statsFor(tiers);
  let seconds = 0;
  let cash = ECONOMY.startCash;
  let shaftRow = -1;
  let trips = 0;
  let sincePurchase = 0;
  const found = new Set<number>();
  const timeline: Timeline = {
    events: [],
    firstUpgrade: null,
    zoneMinutes: {},
    finaleMinutes: null,
    maxTripsPerPurchase: 0,
    trips: 0,
    stuck: null,
  };

  while (seconds < BALANCE.maxHours * 3600) {
    const trip = chosenTrip(bands, stats, shaftRow);
    if (!trip) {
      timeline.stuck = 'no trip within reach';
      break;
    }
    seconds += trip.seconds;
    cash += trip.net;
    trips++;
    const band = bands[trip.band.index];
    if (band && band.oreUnits > 0) band.left = Math.max(band.left - trip.units / band.oreUnits, 0);
    sincePurchase++;
    shaftRow = Math.max(shaftRow, trip.band.midRow);
    timeline.zoneMinutes[trip.band.zone] ??= seconds / 60;
    timeline.events.push({ kind: 'trip', minutes: seconds / 60, trip, cash });
    RELICS.depthsMeters.forEach((_, index) => {
      if (found.has(index) || relicRow(index) > trip.band.lastRow) return;
      found.add(index);
      cash += relicBonus(index);
      seconds += BALANCE.relicDetourSeconds;
      timeline.events.push({ kind: 'relic', minutes: seconds / 60, index });
    });

    for (;;) {
      const choice = chooseUpgrade(bands, tiers, shaftRow, cash);
      if (!choice) break;
      cash -= choice.price;
      tiers[choice.branch] += 1;
      stats = statsFor(tiers);
      timeline.events.push({
        kind: 'buy',
        minutes: seconds / 60,
        ...choice,
        tier: tiers[choice.branch],
      });
      timeline.firstUpgrade ??= { minutes: seconds / 60, trips };
      timeline.maxTripsPerPurchase = Math.max(timeline.maxTripsPerPurchase, sincePurchase);
      sincePurchase = 0;
    }

    if (found.size >= RELICS.neededForFinale && tiers.engine >= BALANCE.finaleEngineTier) {
      const dive = finaleDive(bands, stats, shaftRow);
      if (dive !== null) {
        timeline.finaleMinutes = (seconds + dive) / 60;
        timeline.zoneMinutes[5] ??= timeline.finaleMinutes;
        break;
      }
    }
  }
  timeline.trips = trips;
  timeline.maxTripsPerPurchase = Math.max(timeline.maxTripsPerPurchase, sincePurchase);
  if (timeline.finaleMinutes === null) timeline.stuck ??= 'out of time';
  return timeline;
}
