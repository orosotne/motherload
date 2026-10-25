import { describe, expect, it } from 'vitest';
import { Block } from '../src/data/blocks';
import { HEART, QUAKE } from '../src/data/story';
import { WORLD } from '../src/data/world';
import { ZONES } from '../src/data/zones';
import { createGame, defaultSettings } from '../src/sim/game';
import { createPod } from '../src/sim/pod';
import { quake } from '../src/story/quakes';
import { hasBit } from '../src/story/state';
import { Grid } from '../src/world/grid';
import { Sim } from './helpers/sim';

const ZONE3 = ZONES[2]?.firstRow ?? 150;

function rockWorld(): Grid {
  const grid = new Grid(WORLD.width, WORLD.height, WORLD.chunkSize, WORLD.skyRows);
  grid.fill(Block.Rock);
  return grid;
}

function emptyCells(grid: Grid): number {
  return grid.snapshot().blocks.filter((block) => block === Block.Empty).length;
}

describe('earthquakes (§7)', () => {
  it('shake the ground on the first visit to zone 3 and open a cave below the pod', () => {
    const sim = new Sim(rockWorld(), 20, ZONE3);
    sim.state.grid.set(20, ZONE3, Block.Empty);
    const before = emptyCells(sim.state.grid);
    sim.hold([], 1);
    const quakes = sim.events('Earthquake');
    expect(quakes).toHaveLength(1);
    expect(quakes[0]?.payload).toMatchObject({ zone: 3, row: ZONE3 + QUAKE.startBelow });
    const opened = emptyCells(sim.state.grid) - before;
    expect(opened).toBeGreaterThanOrEqual(QUAKE.length[0] * QUAKE.width);
    expect(sim.state.hull).toBe(sim.state.stats.maxHull);
    expect(hasBit(sim.state.story.quakes, 3)).toBe(true);
  });

  it('happen once per zone', () => {
    const sim = new Sim(rockWorld(), 20, ZONE3);
    quake(sim.state, 3, sim.bus);
    const after = sim.state.grid.snapshot();
    quake(sim.state, 3, sim.bus);
    expect(sim.events('Earthquake')).toHaveLength(1);
    expect(sim.state.grid.snapshot()).toEqual(after);
  });

  it("leave ore, relics, corestone and the Heart's chamber alone", () => {
    const sim = new Sim(rockWorld(), 20, HEART.chamber.firstRow - 10);
    const { grid } = sim.state;
    for (let row = 0; row < grid.height; row++) {
      for (let col = 0; col < grid.width; col++) {
        const pick = (col + row) % 3;
        if (pick === 0) grid.set(col, row, Block.Ore, 2);
        else if (pick === 1) grid.set(col, row, row % 2 ? Block.Relic : Block.Corestone);
      }
    }
    const before = grid.snapshot();
    quake(sim.state, 5, sim.bus);
    const after = grid.snapshot();
    for (let i = 0; i < after.blocks.length; i++) {
      if (after.blocks[i] === before.blocks[i]) continue;
      expect(before.blocks[i]).toBe(Block.Rock);
      expect(Math.floor(i / grid.width)).toBeLessThan(HEART.chamber.firstRow - 1);
    }
  });

  it('crack a world the same way every time', () => {
    const crack = (seed: number): Uint8Array => {
      const state = createGame(rockWorld(), defaultSettings(), seed);
      state.pod = createPod(20, ZONE3, defaultSettings().pod.halfSize);
      quake(state, 3, new Sim(state.grid, 20, ZONE3).bus);
      return state.grid.snapshot().blocks;
    };
    expect(crack(42)).toEqual(crack(42));
    expect(crack(42)).not.toEqual(crack(43));
  });
});
