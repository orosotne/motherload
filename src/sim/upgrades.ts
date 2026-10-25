import type { EventBus } from '../core/events';
import { TIER_PRICES, UPGRADE_VALUES, type UpgradeBranch } from '../data/upgrades';
import type { GameEvents } from './events';
import type { GameState } from './game';
import { statsFor, tierValue } from './stats';

/** The next tier of a branch: what it costs and what it changes (§6, §8 "now → after"). */
export interface UpgradeQuote {
  branch: UpgradeBranch;
  /** The tier on offer, 0-based (1 is T2). */
  tier: number;
  price: number;
  now: number;
  next: number;
}

/** Highest tier index of a branch (T6 is 5). */
export function maxTier(branch: UpgradeBranch): number {
  return Math.min(UPGRADE_VALUES[branch].length, TIER_PRICES.length) - 1;
}

/** What buying the next tier would do, or null when the branch is maxed out. */
export function upgradeQuote(state: GameState, branch: UpgradeBranch): UpgradeQuote | null {
  const current = state.tiers[branch];
  const tier = current + 1;
  if (tier > maxTier(branch)) return null;
  return {
    branch,
    tier,
    price: TIER_PRICES[tier] ?? Infinity,
    now: tierValue(branch, current),
    next: tierValue(branch, tier),
  };
}

/**
 * Buys the next tier of a branch: tiers go in order, one at a time (§6). A new hull arrives
 * repaired and a new tank arrives full.
 */
export function buyUpgrade(
  state: GameState,
  branch: UpgradeBranch,
  events: EventBus<GameEvents>,
): boolean {
  const quote = upgradeQuote(state, branch);
  if (!quote || state.cash < quote.price) return false;
  state.cash -= quote.price;
  state.tiers[branch] = quote.tier;
  state.stats = statsFor(state.tiers);
  if (branch === 'hull') state.hull = state.stats.maxHull;
  if (branch === 'tank') state.fuel = state.stats.tankLiters;
  events.emit('UpgradeBought', { branch, tier: quote.tier, price: quote.price });
  return true;
}
