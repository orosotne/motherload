import { describe, expect, it } from 'vitest';
import { Block } from '../src/data/blocks';
import { defaultSettings } from '../src/sim/game';
import { restY } from '../src/sim/pod';
import { gridFrom, Sim } from './helpers/sim';

const HALF = 0.4;
/** Hardness 1 with the tier 1 drill: 0.6 s at 60 Hz. */
const DRILL_TICKS = 36;

describe('drilling', () => {
  it('drills down: the block disappears after 0.6 s and the pod stands in its place', () => {
    const sim = new Sim(gridFrom(['....', '####', '####', '####']), 1, 0);
    sim.hold(['down'], 1);
    const started = sim.events('DrillStarted')[0];
    expect(started?.payload).toMatchObject({ col: 1, row: 1, dir: 'down' });

    sim.until((s) => s.events('BlockBroken').length > 0);
    expect(sim.tick - (started?.tick ?? 0)).toBe(DRILL_TICKS);
    expect(sim.state.grid.get(1, 1)).toBe(Block.Empty);
    expect(sim.pod.x).toBe(1);
    expect(sim.pod.y).toBeCloseTo(restY(1, HALF), 9);
  });

  it('drills to both sides', () => {
    const sim = new Sim(gridFrom(['#.#', '###']), 1, 0);
    sim.hold(['left'], DRILL_TICKS + 1);
    expect(sim.state.grid.get(0, 0)).toBe(Block.Empty);
    expect(sim.pod.x).toBe(0);

    sim.hold(['right'], 90);
    expect(sim.state.grid.get(2, 0)).toBe(Block.Empty);
  });

  it('drills a column without a single idle tick between blocks', () => {
    const sim = new Sim(gridFrom(['...', ...Array<string>(8).fill('###')]), 1, 0);
    sim.hold(['down'], 5 * DRILL_TICKS + 1);
    const starts = sim.events('DrillStarted').map((entry) => entry.tick);
    const breaks = sim.events('BlockBroken').map((entry) => entry.tick);
    expect(breaks).toHaveLength(5);
    breaks.forEach((tick, i) => {
      expect(tick - (starts[i] ?? 0)).toBe(DRILL_TICKS);
      // The next block starts on the very tick the previous one gives way.
      expect(starts[i + 1]).toBe(tick);
    });
  });

  it('drills a row sideways without idle ticks', () => {
    const sim = new Sim(gridFrom(['.######', '#######']), 0, 0);
    sim.hold(['right'], 4 * DRILL_TICKS + 1);
    const starts = sim.events('DrillStarted').map((entry) => entry.tick);
    const breaks = sim.events('BlockBroken').map((entry) => entry.tick);
    expect(breaks.length).toBe(4);
    breaks.forEach((tick, i) => expect(starts[i + 1]).toBe(tick));
  });

  it('never drills upwards', () => {
    const sim = new Sim(gridFrom(['###', '#.#', '###']), 1, 1);
    sim.hold(['up'], 120);
    expect(sim.state.grid.get(1, 0)).toBe(Block.Dirt);
    expect(sim.events('DrillStarted')).toHaveLength(0);
  });

  it('never drills in the air, and a held direction drills on touchdown', () => {
    const sim = new Sim(gridFrom(['#.#', '#.#', '#.#', '#.#', '###', '###']), 1, 0);
    sim.hold(['down'], 1);
    expect(sim.pod.grounded).toBe(false);
    sim.until((s) => s.events('Landed').length > 0);
    const landedTick = sim.events('Landed')[0]?.tick;
    const started = sim.events('DrillStarted');
    expect(started).toHaveLength(1);
    expect(started[0]?.tick).toBe(landedTick);
    expect(started[0]?.payload).toMatchObject({ col: 1, row: 4 });
  });

  it('drills harder blocks proportionally slower', () => {
    const sim = new Sim(gridFrom(['...', 'CCC']), 1, 0);
    sim.hold(['down'], 1);
    sim.until((s) => s.events('BlockBroken').length > 0);
    // Clay is hardness 1.4: 0.84 s, so the 51st tick finishes it.
    expect(sim.tick - 1).toBe(51);
  });

  it('cannot drill the world border or corestone', () => {
    const sim = new Sim(gridFrom(['..', 'XX']), 0, 0);
    sim.hold(['left'], 30);
    sim.hold(['down'], 30);
    expect(sim.events('DrillStarted')).toHaveLength(0);
  });

  it('falls after drilling sideways into a cell without a floor', () => {
    const sim = new Sim(gridFrom(['.#', '#.', '##']), 0, 0);
    sim.hold(['right'], DRILL_TICKS + 1);
    sim.hold([], 1);
    expect(sim.pod.grounded).toBe(false);
    sim.until((s) => s.events('Landed').length > 0);
    expect(sim.pod.y).toBeCloseTo(restY(1, HALF), 5);
  });
});

describe('input buffer (§5.1)', () => {
  /** Drills right once, then taps down `ticksEarly` ticks before that block gives way. */
  function tapBeforeBreak(ticksEarly: number, enabled = true): Sim {
    const settings = defaultSettings();
    settings.feel.inputBuffer.enabled = enabled;
    const sim = new Sim(gridFrom(['.##', '###', '###']), 0, 0, settings);
    sim.hold(['right'], 1);
    sim.hold([], DRILL_TICKS - ticksEarly - 1);
    sim.tap('down');
    sim.hold([], ticksEarly);
    return sim;
  }

  it('runs a direction tapped 100 ms before the block gives way right after it', () => {
    const sim = tapBeforeBreak(6);
    const breakTick = sim.events('BlockBroken')[0]?.tick;
    const next = sim.events('DrillStarted')[1];
    expect(next?.tick).toBe(breakTick);
    expect(next?.payload.dir).toBe('down');
  });

  it('ignores a tap 200 ms before the block gives way', () => {
    expect(tapBeforeBreak(12).events('DrillStarted')).toHaveLength(1);
  });

  it('can be switched off', () => {
    expect(tapBeforeBreak(6, false).events('DrillStarted')).toHaveLength(1);
  });
});

describe('landing buffer (§5.2)', () => {
  const FALL = ['#.#', '#.#', '#.#', '#.#', '#.#', '###', '###'];

  function landingTick(): number {
    const dry = new Sim(gridFrom(FALL), 1, 0);
    dry.until((s) => s.events('Landed').length > 0);
    return dry.tick;
  }

  /** Lets the pod fall and taps down `ticksEarly` ticks before touchdown. */
  function tapBeforeLanding(ticksEarly: number, enabled = true): Sim {
    const settings = defaultSettings();
    settings.feel.landingBuffer.enabled = enabled;
    const sim = new Sim(gridFrom(FALL), 1, 0, settings);
    sim.hold([], landingTick() - ticksEarly - 1);
    sim.tap('down');
    sim.until((s) => s.events('Landed').length > 0);
    sim.hold([], 2);
    return sim;
  }

  it('drills on touchdown when down was tapped 100 ms before', () => {
    const sim = tapBeforeLanding(6);
    const started = sim.events('DrillStarted');
    expect(started).toHaveLength(1);
    expect(started[0]?.tick).toBe(sim.events('Landed')[0]?.tick);
  });

  it('ignores a tap 200 ms before touchdown', () => {
    expect(tapBeforeLanding(12).events('DrillStarted')).toHaveLength(0);
  });

  it('can be switched off', () => {
    expect(tapBeforeLanding(6, false).events('DrillStarted')).toHaveLength(0);
  });
});
