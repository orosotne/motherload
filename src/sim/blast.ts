import { Block, isDrillable, type BlockId } from '../data/blocks';
import type { Grid } from '../world/grid';

/**
 * Blocks a blast clears: everything the drill gets through, except relics, which are one-off
 * story finds (pillar 4: never lose progress). Corestone and lava stay too (§4, §6).
 */
export function blastBreaks(block: BlockId): boolean {
  return block !== Block.Relic && isDrillable(block);
}

/**
 * Clears the square of `radius` around a cell (1 is 3 × 3); minerals in it are lost (§6).
 * Returns how many blocks went.
 */
export function blast(grid: Grid, col: number, row: number, radius: number): number {
  let cleared = 0;
  for (let r = row - radius; r <= row + radius; r++) {
    for (let c = col - radius; c <= col + radius; c++) {
      if (!grid.inside(c, r) || !blastBreaks(grid.get(c, r))) continue;
      grid.set(c, r, Block.Empty);
      cleared++;
    }
  }
  return cleared;
}
