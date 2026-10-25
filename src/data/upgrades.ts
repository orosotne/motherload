/** Workshop upgrade branches (GAME_SPEC §6). */
export const UPGRADE_BRANCHES = [
  'drill',
  'hull',
  'engine',
  'tank',
  'cooling',
  'cargo',
  'light',
] as const;

export type UpgradeBranch = (typeof UPGRADE_BRANCHES)[number];

/** Value of tiers T1 to T6 per branch (§6). T1 is the starting equipment. */
export const UPGRADE_VALUES: Readonly<Record<UpgradeBranch, readonly number[]>> = {
  /** Seconds to drill hardness 1. */
  drill: [0.6, 0.48, 0.38, 0.3, 0.24, 0.19],
  /** Hull points. */
  hull: [30, 50, 80, 120, 180, 260],
  /** Top climbing speed in blocks per second. */
  engine: [3, 4, 5.5, 7, 9, 11],
  /** Fuel tank in litres. */
  tank: [12, 20, 32, 50, 75, 110],
  /** Depth in metres down to which the pod does not overheat. */
  cooling: [1100, 1250, 1400, 1550, 1750, 2000],
  /** Cargo units. */
  cargo: [7, 14, 24, 38, 56, 80],
  /** Headlight reach in blocks. */
  light: [4, 6, 8, 10, 13, 16],
};

/**
 * Price of each tier, the same in every branch; tiers are bought in order (§6). Tuned with
 * `npm run sim:economy` and `npm run playtest` from the spec's 500 / 1 500 / 4 000 / 10 000 /
 * 25 000 (DECISIONS.md).
 */
export const TIER_PRICES: readonly number[] = [0, 500, 4000, 20000, 45000, 130000];
