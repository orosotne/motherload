import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/events';
import { TIER_PRICES, UPGRADE_BRANCHES } from '../src/data/upgrades';
import type { GameEvents } from '../src/sim/events';
import { createGame, defaultSettings, type GameState } from '../src/sim/game';
import { buyUpgrade, maxTier, upgradeQuote } from '../src/sim/upgrades';
import { gridFrom } from './helpers/sim';

function game(cash: number): { state: GameState; events: EventBus<GameEvents>; log: string[] } {
  const state = createGame(gridFrom(['###']), defaultSettings());
  state.cash = cash;
  const events = new EventBus<GameEvents>();
  const log: string[] = [];
  events.on('UpgradeBought', ({ branch, tier, price }) => log.push(`${branch} ${tier} ${price}`));
  return { state, events, log };
}

describe('workshop upgrades (§6)', () => {
  it('quotes the next tier with its price and the change it brings', () => {
    const { state } = game(0);
    expect(upgradeQuote(state, 'drill')).toEqual({
      branch: 'drill',
      tier: 1,
      price: 500,
      now: 0.6,
      next: 0.48,
    });
    expect(upgradeQuote(state, 'cargo')).toMatchObject({ now: 7, next: 14 });
  });

  it('sells tiers in order at the same prices in every branch', () => {
    for (const branch of UPGRADE_BRANCHES) {
      const { state, events } = game(1_000_000);
      const paid: number[] = [];
      while (upgradeQuote(state, branch)) {
        const before = state.cash;
        expect(buyUpgrade(state, branch, events)).toBe(true);
        paid.push(before - state.cash);
      }
      expect(paid).toEqual(TIER_PRICES.slice(1));
      expect(state.tiers[branch]).toBe(maxTier(branch));
      expect(buyUpgrade(state, branch, events)).toBe(false);
    }
  });

  it('refuses without enough cash and changes nothing', () => {
    const { state, events, log } = game(499);
    expect(buyUpgrade(state, 'tank', events)).toBe(false);
    expect(state.cash).toBe(499);
    expect(state.tiers.tank).toBe(0);
    expect(log).toEqual([]);
  });

  it('updates what the pod can do and announces the purchase', () => {
    const [, t2 = 0, t3 = 0] = TIER_PRICES;
    const { state, events, log } = game(t2 + t3);
    buyUpgrade(state, 'cargo', events);
    buyUpgrade(state, 'cargo', events);
    expect(state.stats.cargoCapacity).toBe(24);
    expect(state.cash).toBe(0);
    expect(log).toEqual([`cargo 1 ${t2}`, `cargo 2 ${t3}`]);
  });

  it('delivers a new hull repaired and a new tank full', () => {
    const { state, events } = game(1000);
    state.hull = 3;
    state.fuel = 1;
    buyUpgrade(state, 'hull', events);
    buyUpgrade(state, 'tank', events);
    expect(state.hull).toBe(50);
    expect(state.fuel).toBe(20);
  });
});
