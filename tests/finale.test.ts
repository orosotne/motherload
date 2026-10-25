import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/events';
import { Block } from '../src/data/blocks';
import { RELICS } from '../src/data/relics';
import { FINALE, HEART } from '../src/data/story';
import type { GameEvents } from '../src/sim/events';
import { createPod, rowOf } from '../src/sim/pod';
import { damage } from '../src/sim/recovery';
import { abandonFinale, escapeSeconds, nearHeart, stepEscape } from '../src/story/finale';
import { byTheHeart, ESCAPE_COL, startEscape } from './helpers/finale';
import { DT } from './helpers/sim';

describe('the finale (§7)', () => {
  it('needs six relics and the pod by the Heart', () => {
    const five = byTheHeart(RELICS.neededForFinale - 1);
    expect(nearHeart(five.state)).toBe(true);
    five.tap('enter');
    expect(five.state.finale).toBeNull();

    const far = byTheHeart(RELICS.neededForFinale);
    far.state.pod = createPod(HEART.chamber.firstCol, HEART.rows[1], far.settings.pod.halfSize);
    far.tap('enter');
    expect(far.state.finale).toBeNull();

    const six = byTheHeart(RELICS.neededForFinale).tap('enter');
    expect(six.state.finale?.phase).toBe('ignite');
    expect(six.events('HeartIgnited')).toHaveLength(1);
  });

  it('holds the pod still while the Heart catches fire, then refills it for the escape', () => {
    const sim = byTheHeart(6);
    sim.state.fuel = 1;
    sim.state.hull = 3;
    const x = sim.pod.x;
    sim.tap('enter').hold(['left', 'up'], Math.floor(FINALE.igniteSeconds / DT) - 2);
    expect(sim.pod.x).toBe(x);
    expect(sim.state.finale?.phase).toBe('ignite');
    startEscape(sim);
    expect(sim.events('EscapeStarted')[0]?.payload).toEqual({ attempt: 1, seconds: 90 });
    expect(sim.state.fuel).toBe(sim.state.stats.tankLiters);
    expect(sim.state.hull).toBe(sim.state.stats.maxHull);
    expect([sim.pod.x, rowOf(sim.pod.y)]).toEqual([ESCAPE_COL, HEART.rows[1]]);
  });

  it('lets the lava rise after a grace period, slowly at first, to the surface on time', () => {
    const sim = startEscape(byTheHeart(6));
    const { state } = sim;
    const bus = new EventBus<GameEvents>();
    const half = sim.settings.pod.halfSize;
    // Keep the pod out of the lava's way, just under the surface.
    const park = (): void => void (state.pod = createPod(ESCAPE_COL, 0, half));
    const run = (seconds: number): void => {
      for (let t = 0; t < seconds - 1e-9; t += DT) {
        park();
        stepEscape(state, DT, half, bus);
      }
    };
    run(FINALE.graceSeconds);
    expect(state.finale?.lavaRow).toBeCloseTo(FINALE.lavaStartRow, 5);
    run((90 - FINALE.graceSeconds) / 2);
    const midway = FINALE.lavaStartRow * (1 - 0.5 ** FINALE.lavaEase);
    expect(state.finale?.lavaRow).toBeCloseTo(midway, 0);
    expect(midway).toBeGreaterThan(FINALE.lavaStartRow / 2);
    run((90 - FINALE.graceSeconds) / 2 - 1);
    expect(state.finale?.left).toBeCloseTo(1, 5);
    // A second before the end it is racing the last rows up.
    expect(state.finale?.lavaRow).toBeLessThan(10);
    expect(state.finale?.lavaRow).toBeGreaterThan(0);
  });

  it('starts over by the Heart with more time when the lava catches the pod', () => {
    const sim = startEscape(byTheHeart(6));
    sim.until((s) => s.events('EscapeFailed').length > 0, 60 * 20);
    expect(sim.events('EscapeFailed')[0]?.payload).toEqual({ attempts: 1 });
    expect(sim.events('EscapeStarted')[1]?.payload).toEqual({ attempt: 2, seconds: 105 });
    expect(sim.state.finale?.lavaRow).toBe(FINALE.lavaStartRow);
    expect([sim.pod.x, rowOf(sim.pod.y)]).toEqual([ESCAPE_COL, HEART.rows[1]]);
    expect(escapeSeconds(3)).toBe(120);
  });

  it('starts over after a tow or a wreck as well', () => {
    const sim = startEscape(byTheHeart(6));
    damage(sim.state, 9999, 'lava', sim.bus);
    expect(sim.state.status.kind).toBe('respawn');
    sim.hold([], 1);
    expect(sim.events('EscapeFailed')).toHaveLength(1);
    expect(sim.state.status.kind).toBe('play');
    expect(sim.state.hull).toBe(sim.state.stats.maxHull);
  });

  it('breaks new ways open above the pod, never closing one, and spares ore and relics', () => {
    const sim = startEscape(byTheHeart(6));
    const { state } = sim;
    const half = sim.settings.pod.halfSize;
    for (let row = 280; row <= 300; row++) {
      for (let col = 10; col <= 30; col += 2) state.grid.set(col, row, Block.Ore, 3);
    }
    const before = state.grid.snapshot();
    const bus = new EventBus<GameEvents>();
    const collapses: GameEvents['Collapse'][] = [];
    bus.on('Collapse', (event) => collapses.push(event));
    for (let t = 0; t < FINALE.collapseSeconds * 3.5; t += DT) {
      state.pod = createPod(20, 300, half);
      stepEscape(state, DT, half, bus);
    }
    expect(collapses).toHaveLength(3);
    const after = state.grid.snapshot();
    let opened = 0;
    for (let i = 0; i < after.blocks.length; i++) {
      if (after.blocks[i] === before.blocks[i]) continue;
      expect(after.blocks[i]).toBe(Block.Empty);
      expect(before.blocks[i]).toBe(Block.Dirt);
      opened++;
    }
    expect(opened).toBeGreaterThan(0);
    for (const { row } of collapses) {
      expect(row).toBeLessThanOrEqual(300 - FINALE.collapseRows[0]);
      expect(row).toBeGreaterThanOrEqual(300 - FINALE.collapseRows[1]);
    }
  });

  it('ends on the surface: the Heart burns, and all ten relics bring the epilogue', () => {
    const six = startEscape(byTheHeart(6, 5)).hold(['up'], 1);
    six.until((s) => s.events('FinaleWon').length > 0, 60 * 90);
    expect(six.events('FinaleWon')[0]?.payload).toEqual({ allRelics: false, attempts: 1 });
    expect(six.state.story.finished).toBe(true);
    expect(six.state.finale).toBeNull();
    expect(nearHeart(six.state)).toBe(false);

    const ten = startEscape(byTheHeart(10, 5)).hold(['up'], 1);
    ten.until((s) => s.events('FinaleWon').length > 0, 60 * 90);
    expect(ten.events('FinaleWon')[0]?.payload.allRelics).toBe(true);
  });

  it('is made on the first try with an engine at T4, and on a later one with less', () => {
    const t4 = startEscape(byTheHeart(6, 3)).hold(['up'], 1);
    t4.until((s) => s.state.story.finished || s.events('EscapeFailed').length > 0, 60 * 95);
    expect(t4.events('EscapeFailed')).toHaveLength(0);
    expect(t4.state.time).toBeLessThan(FINALE.igniteSeconds + 90);

    const t3 = startEscape(byTheHeart(6, 2)).hold(['up'], 1);
    t3.until((s) => s.state.story.finished, 60 * 300);
    expect(t3.events('FinaleWon')[0]?.payload.attempts).toBe(2);
  });

  it('turns the beacon down while the core collapses', () => {
    const sim = startEscape(byTheHeart(6));
    sim.state.slots[0] = { item: 'beacon', anchor: null };
    sim.tap('use');
    expect(sim.events('ItemRefused').at(-1)?.payload).toEqual({ item: 'beacon', reason: 'escape' });
    expect(rowOf(sim.pod.y)).toBe(HEART.rows[1]);
  });

  it('lets the player give up: a free tow home, and the Heart waits for another try', () => {
    const sim = startEscape(byTheHeart(6));
    abandonFinale(sim.state, sim.settings.pod.halfSize, sim.bus);
    expect(sim.events('FinaleAbandoned')).toHaveLength(1);
    expect(sim.state.finale).toBeNull();
    expect(sim.state.story.finished).toBe(false);
    expect(rowOf(sim.pod.y)).toBe(-1);
    expect(sim.state.fuel).toBe(sim.state.stats.tankLiters);
    sim.state.pod = createPod(HEART.cols[0] - 1, HEART.rows[1], sim.settings.pod.halfSize);
    sim.tap('enter');
    expect(sim.state.finale?.phase).toBe('ignite');
  });
});
