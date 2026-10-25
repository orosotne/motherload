import { UPGRADE_BRANCHES, UPGRADE_VALUES, type UpgradeBranch } from '../data/upgrades';

/** Bought tier per branch, 0-based: 0 is T1, the starting equipment. */
export type Tiers = Record<UpgradeBranch, number>;

/** What the pod can do with its current upgrades (§6). */
export interface PodStats {
  drillSecondsPerHardness: number;
  maxHull: number;
  climbSpeed: number;
  tankLiters: number;
  safeDepthMeters: number;
  cargoCapacity: number;
  lightRange: number;
}

export function startTiers(): Tiers {
  const tiers = {} as Tiers;
  for (const branch of UPGRADE_BRANCHES) tiers[branch] = 0;
  return tiers;
}

export function tierValue(branch: UpgradeBranch, tier: number): number {
  const values = UPGRADE_VALUES[branch];
  const value = values[Math.min(Math.max(tier, 0), values.length - 1)];
  if (value === undefined) throw new Error(`No tiers for ${branch}`);
  return value;
}

export function statsFor(tiers: Tiers): PodStats {
  return {
    drillSecondsPerHardness: tierValue('drill', tiers.drill),
    maxHull: tierValue('hull', tiers.hull),
    climbSpeed: tierValue('engine', tiers.engine),
    tankLiters: tierValue('tank', tiers.tank),
    safeDepthMeters: tierValue('cooling', tiers.cooling),
    cargoCapacity: tierValue('cargo', tiers.cargo),
    lightRange: tierValue('light', tiers.light),
  };
}
