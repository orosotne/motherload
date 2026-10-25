import type { Rng } from '../core/rng';
import { Block, isDrillable, isSolid } from '../data/blocks';
import { RELICS, relicRow } from '../data/relics';
import type { Grid } from './grid';
import { reachableCells } from './pathCheck';

/** Columns ordered by distance from `start`: start, start + 1, start − 1, start + 2, … */
function columnsAround(start: number, first: number, last: number): number[] {
  const columns: number[] = [];
  for (let step = 0; columns.length < last - first + 1; step++) {
    for (const col of step === 0 ? [start] : [start + step, start - step]) {
      if (col >= first && col <= last) columns.push(col);
    }
  }
  return columns;
}

/**
 * Places the ten relics at their fixed depths (GAME_SPEC §7), each in a column drawn from the
 * seed. A relic sits inside solid rock the pod can reach; swapping such a block for a relic keeps
 * every route as it was, because both are solid and drillable.
 */
export function placeRelics(grid: Grid, rng: Rng): void {
  const reachable = reachableCells(grid);
  const first = RELICS.edgeMargin;
  const last = grid.width - 1 - RELICS.edgeMargin;
  RELICS.depthsMeters.forEach((_, index) => {
    const row = relicRow(index);
    const start = rng.int(first, last);
    const col = columnsAround(start, first, last).find((candidate) => {
      const block = grid.get(candidate, row);
      return isSolid(block) && isDrillable(block) && reachable[row * grid.width + candidate] === 1;
    });
    if (col === undefined) throw new Error(`No reachable rock for relic ${index + 1}`);
    grid.set(col, row, Block.Relic);
  });
}
