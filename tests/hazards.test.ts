import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/events';
import { Block } from '../src/data/blocks';
import { gasDamage } from '../src/data/hazards';
import type { GameEvents } from '../src/sim/events';
import { createGame, defaultSettings } from '../src/sim/game';
import { stepHeat } from '../src/sim/hazards';
import { createPod } from '../src/sim/pod';
import { statsFor } from '../src/sim/stats';
import { DT, gridFrom, Sim } from './helpers/sim';

const GAS_WORLD = ['...', '#G#', '###', '###'];

describe('gas pockets (§7, §5.11)', () => {
  it('hiss, and letting go within 0.3 s stops the drilling', () => {
    const sim = new Sim(gridFrom(GAS_WORLD), 1, 0);
    const startY = sim.pod.y;
    sim.hold(['down'], 6);
    expect(sim.events('GasHiss')).toHaveLength(1);
    sim.hold([], 1);
    expect(sim.events('DrillAborted')).toHaveLength(1);
    expect(sim.pod.drill).toBeNull();
    expect(sim.pod.y).toBeCloseTo(startY, 5);
    expect(sim.state.grid.get(1, 1)).toBe(Block.Gas);
    // The press that started it does not restart it through the input buffer.
    sim.hold([], 10);
    expect(sim.events('GasHiss')).toHaveLength(1);
  });

  it('keeps the full 0.3 s to let go even with the fastest drill', () => {
    // T6 drill in clay: 1.4 × 0.19 = 0.266 s, faster than the window.
    const rows = Array<string>(60).fill('###');
    rows[50] = '...';
    rows[51] = '#G#';
    const fast = (): Sim => {
      const sim = new Sim(gridFrom(rows), 1, 50);
      sim.state.tiers.drill = 5;
      sim.state.stats = statsFor(sim.state.tiers);
      return sim;
    };
    const late = fast().hold(['down'], 17).hold([], 1);
    expect(late.events('Explosion')).toEqual([]);
    expect(late.events('DrillAborted')).toHaveLength(1);
    const held = fast().hold(['down'], 30);
    expect(held.events('Explosion')).toHaveLength(1);
  });

  it('a tap never gets through: the drilling stops on the next tick', () => {
    const sim = new Sim(gridFrom(GAS_WORLD), 1, 0);
    sim.tap('down').hold([], 1);
    expect(sim.events('DrillAborted')).toHaveLength(1);
  });

  it('held past 0.3 s it goes through and explodes 3 × 3, 15 HP in zones 1 and 2', () => {
    const sim = new Sim(gridFrom(GAS_WORLD), 1, 0);
    sim
      .hold(['down'], 20)
      .hold([], 1)
      .until((s) => s.events('Explosion').length > 0, 120);
    expect(sim.events('DrillAborted')).toEqual([]);
    expect(sim.events('Explosion')[0]?.payload).toEqual({
      col: 1,
      row: 1,
      radius: 1,
      source: 'gas',
    });
    expect(sim.events('Damaged')[0]?.payload).toEqual({ amount: 15, source: 'gas', hull: 15 });
    expect(sim.state.grid.get(0, 2)).toBe(Block.Empty);
    expect(sim.state.grid.get(2, 1)).toBe(Block.Empty);
    expect(sim.state.grid.get(1, 3)).toBe(Block.Dirt);
  });

  it('hurts more in every deeper zone', () => {
    expect([2, 3, 4, 5].map(gasDamage)).toEqual([15, 20, 25, 30]);
    const rows = Array<string>(160).fill('###');
    rows[150] = '...';
    rows[151] = '#G#';
    const sim = new Sim(gridFrom(rows), 1, 150);
    sim.hold(['down'], 90).until((s) => s.events('Explosion').length > 0, 120);
    expect(sim.events('Damaged')[0]?.payload.amount).toBe(20);
  });

  it('without forgiveness letting go does not help', () => {
    const sim = new Sim(gridFrom(GAS_WORLD), 1, 0);
    sim.settings.feel.forgiveness.enabled = false;
    sim
      .hold(['down'], 6)
      .hold([], 1)
      .until((s) => s.events('Explosion').length > 0, 120);
    expect(sim.events('DrillAborted')).toEqual([]);
  });
});

describe('falls (§7, §5.11)', () => {
  const fall = (forgiving: boolean): number => {
    const sim = new Sim(gridFrom(['...', '...', '...', '###']), 1, 0);
    sim.settings.feel.forgiveness.enabled = forgiving;
    sim.until((s) => s.events('Landed').length > 0, 200);
    return 30 - sim.state.hull;
  };

  it('a 2-block fall is free with forgiveness and costs 4 HP a block without', () => {
    expect(fall(true)).toBe(0);
    expect(fall(false)).toBe(8);
  });
});

describe('lava (§7)', () => {
  const LAVA_WORLD = ['...', '...', '...', 'LLL', '###'];

  it('costs 10 HP per second, breaks the fall and lets the pod sink only slowly', () => {
    const sim = new Sim(gridFrom(LAVA_WORLD), 1, 0);
    sim.until((s) => s.events('Landed').length > 0, 200);
    expect(sim.events('Landed')[0]?.payload.speed).toBeLessThan(3);
    expect(sim.events('LavaContact')).toHaveLength(1);
    const hull = sim.state.hull;
    sim.hold([], 60);
    expect(hull - sim.state.hull).toBe(10);
    expect(sim.events('Damaged').every((entry) => entry.payload.source === 'lava')).toBe(true);
  });

  it('stops hurting once the pod flies out', () => {
    const sim = new Sim(gridFrom(LAVA_WORLD), 1, 0);
    sim.until((s) => s.events('Landed').length > 0, 200);
    sim.hold(['up'], 40).hold([], 1);
    const hull = sim.state.hull;
    sim.hold(['up'], 30);
    expect(sim.state.hull).toBe(hull);
    expect(sim.state.inLava).toBe(false);
  });
});

describe('heat (§3)', () => {
  const deep = (row: number) => {
    const state = createGame(gridFrom(['###']), defaultSettings());
    state.pod = createPod(1, row, 0.4);
    const events = new EventBus<GameEvents>();
    const levels: number[] = [];
    events.on('Overheat', ({ level }) => levels.push(level));
    const run = (seconds: number): void => {
      for (let t = 0; t < seconds; t += DT) stepHeat(state, DT, events);
    };
    return { state, levels, run };
  };

  it('fills below the cooling limit and then costs 2 HP per second', () => {
    // Row 280 is 1 124 m, past the starting limit of 1 100 m.
    const { state, levels, run } = deep(280);
    run(5);
    expect(state.heat).toBeGreaterThan(0.4);
    expect(state.heat).toBeLessThan(0.5);
    run(7);
    expect(state.heat).toBe(1);
    expect(levels).toEqual([1, 2]);
    const hull = state.hull;
    run(5);
    expect(hull - state.hull).toBe(10);
  });

  it('cools down above the limit, and better cooling moves the limit', () => {
    const { state, run } = deep(280);
    state.heat = 0.5;
    state.pod = createPod(1, 200, 0.4);
    run(1);
    expect(state.heat).toBeCloseTo(0.25, 2);
    state.tiers.cooling = 1;
    state.stats.safeDepthMeters = 1250;
    state.pod = createPod(1, 280, 0.4);
    run(2);
    expect(state.heat).toBe(0);
  });
});
