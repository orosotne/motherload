import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/events';
import { BUILDINGS } from '../src/data/buildings';
import { buildingAt, depthMeters } from '../src/sim/buildings';
import { refuel, repair, sellAll } from '../src/sim/economy';
import type { GameEvents } from '../src/sim/events';
import { createGame, defaultSettings, type GameState } from '../src/sim/game';
import { createPod } from '../src/sim/pod';
import { gridFrom } from './helpers/sim';

function game(): { state: GameState; events: EventBus<GameEvents>; log: string[] } {
  const state = createGame(gridFrom(['#'.repeat(30)]), defaultSettings());
  const events = new EventBus<GameEvents>();
  const log: string[] = [];
  events.on('Sold', ({ value }) => log.push(`sold ${value}`));
  events.on('Refueled', ({ liters, cost, free }) => log.push(`fuel ${liters} ${cost} ${free}`));
  events.on('Repaired', ({ hp, cost }) => log.push(`repair ${hp} ${cost}`));
  return { state, events, log };
}

describe('selling (§6: 100 % of the value)', () => {
  it('sells the whole hold', () => {
    const { state, events, log } = game();
    state.cargo[1] = 2;
    state.cargo[2] = 1;
    expect(sellAll(state, events)).toEqual({ units: 3, value: 110 });
    expect(state.cash).toBe(110);
    expect(state.cargo.every((units) => units === 0)).toBe(true);
    expect(log).toEqual(['sold 110']);
  });

  it('does nothing with an empty hold', () => {
    const { state, events, log } = game();
    expect(sellAll(state, events)).toEqual({ units: 0, value: 0 });
    expect(log).toEqual([]);
  });
});

describe('fuel station ($2 per litre)', () => {
  it('fills the tank', () => {
    const { state, events } = game();
    state.fuel = 2;
    state.cash = 100;
    expect(refuel(state, events)).toEqual({ liters: 10, cost: 20, free: false });
    expect([state.fuel, state.cash]).toEqual([12, 80]);
  });

  it('fills as far as the cash goes', () => {
    const { state, events } = game();
    state.fuel = 2;
    state.cash = 10;
    refuel(state, events);
    expect([state.fuel, state.cash]).toEqual([7, 0]);
  });

  it('gives a broke pilot the emergency fuel for free, so a run can always start', () => {
    const { state, events } = game();
    state.fuel = 0;
    state.cash = 3;
    expect(refuel(state, events)).toEqual({ liters: 4, cost: 0, free: true });
    expect([state.fuel, state.cash]).toEqual([4, 3]);
  });

  it('does nothing with a full tank', () => {
    const { state, events, log } = game();
    state.cash = 50;
    expect(refuel(state, events)).toEqual({ liters: 0, cost: 0, free: false });
    expect(log).toEqual([]);
  });
});

describe('repairs ($10 per HP)', () => {
  it('repairs the whole hull', () => {
    const { state, events } = game();
    state.hull = 10;
    state.cash = 1000;
    expect(repair(state, events)).toEqual({ hp: 20, cost: 200 });
    expect([state.hull, state.cash]).toEqual([30, 800]);
  });

  it('repairs as much as the cash pays for', () => {
    const { state, events } = game();
    state.hull = 10;
    state.cash = 55;
    expect(repair(state, events)).toEqual({ hp: 5, cost: 50 });
  });
});

describe('buildings and depth', () => {
  it('knows which building the pod stands in front of', () => {
    const { state } = game();
    const at = (col: number, row = -1): string | undefined => {
      state.pod = createPod(col, row, 0.4);
      return buildingAt(state.pod)?.id;
    };
    for (const building of BUILDINGS) expect(at(building.firstCol)).toBe(building.id);
    expect(at(20)).toBeUndefined();
    expect(at(15, 0)).toBeUndefined();
    state.pod = createPod(15, -1, 0.4);
    state.pod.grounded = false;
    expect(buildingAt(state.pod)).toBeNull();
  });

  it('measures depth: 0 m on the surface, 4 m per row, 2000 m at the bottom', () => {
    expect(depthMeters(createPod(5, -1, 0.4))).toBe(0);
    expect(depthMeters(createPod(5, 0, 0.4))).toBe(4);
    expect(depthMeters(createPod(5, 49, 0.4))).toBe(200);
    expect(depthMeters(createPod(5, 499, 0.4))).toBe(2000);
  });
});
