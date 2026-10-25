import type { EventBus } from '../../src/core/events';
import type { UpgradeBranch } from '../../src/data/upgrades';
import { refuel, refuelQuote, repair, repairQuote, sellAll } from '../../src/sim/economy';
import type { GameEvents } from '../../src/sim/events';
import type { GameState } from '../../src/sim/game';
import { buyItem } from '../../src/sim/items';
import { buyUpgrade, upgradeQuote } from '../../src/sim/upgrades';

/** What holds the rig back right now: the heat, the fuel for the way home, or nothing. */
export type Bottleneck = 'heat' | 'fuel' | null;

/** The light only matters to a player's eyes; a few tiers are enough to see in the deep. */
const LIGHT_TIERS = 3;

/**
 * The upgrade a sensible player buys next: whatever holds the rig back first, then what earns
 * more per trip, the hull once it lags behind, and some light.
 */
function wishList(state: GameState, bottleneck: Bottleneck): UpgradeBranch[] {
  const first: UpgradeBranch[] =
    bottleneck === 'heat' ? ['cooling'] : bottleneck === 'fuel' ? ['tank', 'engine'] : [];
  const earning: UpgradeBranch[] = ['drill', 'cargo', 'engine', 'tank'];
  const top = Math.max(...earning.map((branch) => state.tiers[branch]));
  const list = [...first, ...earning];
  if (state.tiers.hull < top - 1) list.unshift('hull');
  else list.push('hull');
  if (state.tiers.light < LIGHT_TIERS) list.push('light');
  return list;
}

/** The cheapest wish first, so one big upgrade does not hold back all the small ones. */
function nextUpgrade(state: GameState, bottleneck: Bottleneck): UpgradeBranch | null {
  let best: UpgradeBranch | null = null;
  let bestPrice = Infinity;
  for (const branch of wishList(state, bottleneck)) {
    const price = upgradeQuote(state, branch)?.price ?? Infinity;
    if (price < bestPrice) {
      bestPrice = price;
      best = branch;
    }
  }
  return best;
}

/** Cash at which spare emergency items are worth carrying. */
const SPARES_FROM = 15_000;

/**
 * A stop at the shops, the way a careful player makes it: sell everything, buy the upgrades the
 * rig needs most while keeping enough for fuel and repairs, fill up, repair, and once rich
 * enough carry a spare repair kit and fuel cell.
 */
export function visitShops(
  state: GameState,
  events: EventBus<GameEvents>,
  bottleneck: Bottleneck,
): void {
  sellAll(state, events);
  const reserve = (): number => refuelQuote(state).cost + repairQuote(state).cost + 100;
  for (;;) {
    const branch = nextUpgrade(state, bottleneck);
    const quote = branch ? upgradeQuote(state, branch) : null;
    if (!branch || !quote || quote.price > state.cash - reserve()) break;
    buyUpgrade(state, branch, events);
  }
  refuel(state, events);
  repair(state, events);
  for (const item of ['repairKit', 'fuelCell'] as const) {
    const has = state.slots.some((slot) => slot?.item === item);
    if (!has && state.cash > SPARES_FROM) buyItem(state, item, events);
  }
}
