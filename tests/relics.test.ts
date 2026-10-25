import { describe, expect, it } from 'vitest';
import { RELICS, relicBonus, relicIndexAt, relicRow } from '../src/data/relics';
import { collectRelic } from '../src/sim/relics';
import { gridFrom, Sim } from './helpers/sim';

describe('relics (§7)', () => {
  it('lie at 120, 340 … 1 960 m: depth is measured at the bottom of a cell', () => {
    expect(RELICS.depthsMeters.map((_, index) => relicRow(index))).toEqual([
      29, 84, 129, 189, 244, 299, 354, 399, 454, 489,
    ]);
    expect(relicIndexAt(29)).toBe(0);
    expect(relicIndexAt(30)).toBe(-1);
  });

  it('pay $1 000 × their number', () => {
    expect([0, 1, 9].map(relicBonus)).toEqual([1000, 2000, 10000]);
  });

  it('are found by drilling them out, once', () => {
    const rows = Array<string>(31).fill('###');
    rows[29] = '#R#';
    const sim = new Sim(gridFrom(rows), 1, 28);
    sim.hold(['down'], 1).until((s) => s.events('RelicFound').length > 0, 200);
    expect(sim.events('RelicFound')[0]?.payload).toEqual({
      index: 0,
      bonus: 1000,
      col: 1,
      row: 29,
    });
    expect(sim.state.cash).toBe(1000);
    expect(sim.state.relics[0]).toBe(true);
    collectRelic(sim.state, 1, 29, sim.bus);
    expect(sim.state.cash).toBe(1000);
  });
});
