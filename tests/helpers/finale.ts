import { Block } from '../../src/data/blocks';
import { HEART } from '../../src/data/story';
import { WORLD } from '../../src/data/world';
import { statsFor, type Tiers } from '../../src/sim/stats';
import { Grid } from '../../src/world/grid';
import { carveHeartChamber } from '../../src/world/heartGen';
import { Sim } from './sim';

/** Where every escape starts: on the chamber floor, two columns left of the Heart. */
export const ESCAPE_COL = HEART.cols[0] - 2;

/**
 * A full-size world of dirt with the Heart's chamber at the bottom and one open shaft from the
 * surface straight down into it, above where the escape starts.
 */
export function finaleWorld(): Grid {
  const grid = new Grid(WORLD.width, WORLD.height, WORLD.chunkSize, WORLD.skyRows);
  grid.fill(Block.Dirt);
  carveHeartChamber(grid);
  for (let row = 0; row < HEART.chamber.firstRow; row++) grid.set(ESCAPE_COL, row, Block.Empty);
  return grid;
}

/**
 * A pod standing right next to the Heart with `relics` relics, its engine at `engine` (0-based)
 * and cooling good enough for the core, so only the lava and the clock matter.
 */
export function byTheHeart(relics: number, engine = 3): Sim {
  const sim = new Sim(finaleWorld(), HEART.cols[0] - 1, HEART.rows[1]);
  const { state } = sim;
  state.relics = state.relics.map((_, index) => index < relics);
  const tiers: Tiers = { ...state.tiers, engine, cooling: 5 };
  state.tiers = tiers;
  state.stats = statsFor(tiers);
  state.fuel = state.stats.tankLiters;
  state.hull = state.stats.maxHull;
  return sim;
}

/** Reignites the Heart and waits for the escape to start. */
export function startEscape(sim: Sim): Sim {
  return sim.tap('enter').until((s) => s.state.finale?.phase === 'escape', 600);
}
