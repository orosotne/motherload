import { Block, isDrillable } from '../data/blocks';
import { HEART } from '../data/story';
import { zoneAt } from '../data/zones';
import type { Grid } from './grid';
import { reachableCells } from './pathCheck';

/**
 * The Heart's chamber at the bottom of the world (§7): an open hall with the Heart, 2 × 2
 * blocks, resting on its floor. If the hall cannot be reached, the column above its centre is
 * cleared of corestone and lava, so the pod can always drill straight down to it.
 */
export function carveHeartChamber(grid: Grid): void {
  const { chamber, cols, rows } = HEART;
  for (let row = chamber.firstRow; row <= chamber.lastRow; row++) {
    for (let col = chamber.firstCol; col <= chamber.lastCol; col++) grid.set(col, row, Block.Empty);
  }
  // Solid ground under the hall, whatever the caves left there.
  for (let row = chamber.lastRow + 1; row < grid.height; row++) {
    for (let col = chamber.firstCol; col <= chamber.lastCol; col++) {
      grid.set(col, row, zoneAt(row).base);
    }
  }
  for (const row of rows) for (const col of cols) grid.set(col, row, Block.Heart);

  const entrance = (chamber.firstCol + cols[0]) >> 1;
  const reachable = reachableCells(grid);
  if (reachable[chamber.firstRow * grid.width + entrance]) return;
  for (let row = 0; row < chamber.firstRow; row++) {
    if (!isDrillable(grid.get(entrance, row)) && grid.get(entrance, row) !== Block.Empty) {
      grid.set(entrance, row, zoneAt(row).base);
    }
  }
}
