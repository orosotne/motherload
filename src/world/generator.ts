import { Block } from '../data/blocks';
import { WORLD } from '../data/world';
import { Grid } from './grid';

/** F1 test world: solid dirt from the surface down. F2 replaces it with the zoned generator. */
export function createTestWorld(): Grid {
  const grid = new Grid(WORLD.width, WORLD.height, WORLD.chunkSize, WORLD.skyRows);
  grid.fill(Block.Dirt);
  return grid;
}
