import { WORLD } from './world';

/** Relics (GAME_SPEC §7): ten one-off finds at fixed depths, the column comes from the seed. */
export const RELICS = {
  depthsMeters: [120, 340, 520, 760, 980, 1200, 1420, 1600, 1820, 1960],
  /** Bonus for relic number n (1 to 10) is n × this. */
  bonusPerOrder: 1000,
  /** Relics need this many relics to reignite the Heart in the finale. */
  neededForFinale: 6,
  /** Columns kept free at the world's edges. */
  edgeMargin: 2,
} as const;

/** Row of a relic: depth is measured at the bottom of a cell, so row = depth / 4 − 1. */
export function relicRow(index: number): number {
  const depth = RELICS.depthsMeters[index] ?? 0;
  return depth / WORLD.metersPerBlock - 1;
}

/** Relic index (0 to 9) of a row, or −1 when no relic lies at that depth. */
export function relicIndexAt(row: number): number {
  return RELICS.depthsMeters.findIndex((_, index) => relicRow(index) === row);
}

/** Cash bonus for finding relic `index` (0-based): $1 000 × its number (§7). */
export function relicBonus(index: number): number {
  return (index + 1) * RELICS.bonusPerOrder;
}
