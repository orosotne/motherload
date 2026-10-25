import { Block, isDrillable, isSolid } from '../data/blocks';
import type { Grid } from './grid';

export interface PathResult {
  reachable: boolean;
  /** Deepest row the pod can get to. */
  deepestRow: number;
}

/**
 * Every cell the pod can get to from the surface, as a flag per cell (row × width + col).
 * Moves follow the pod's real abilities: it drills down and sideways (sideways only while
 * standing on something), falls and flies through open cells, but never drills upwards.
 * Lava and corestone are never entered, so no route depends on them (GAME_SPEC §4).
 */
export function reachableCells(grid: Grid): Uint8Array {
  const { width, height } = grid;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const visit = (col: number, row: number): void => {
    const index = row * width + col;
    if (visited[index]) return;
    visited[index] = 1;
    queue.push(index);
  };
  const enterable = (col: number, row: number): boolean => {
    const block = grid.get(col, row);
    return block === Block.Empty || isDrillable(block);
  };

  for (let col = 0; col < width; col++) if (enterable(col, 0)) visit(col, 0);

  for (let head = 0; head < queue.length; head++) {
    const index = queue[head] ?? 0;
    const col = index % width;
    const row = (index - col) / width;
    if (row + 1 < height && enterable(col, row + 1)) visit(col, row + 1);
    if (row > 0 && grid.get(col, row - 1) === Block.Empty) visit(col, row - 1);
    const standing = isSolid(grid.get(col, row + 1));
    for (const side of [col - 1, col + 1]) {
      if (side < 0 || side >= width) continue;
      const block = grid.get(side, row);
      if (block === Block.Empty || (standing && isDrillable(block))) visit(side, row);
    }
  }
  return visited;
}

/** Whether the pod can get from the surface to the bottom row (GAME_SPEC §4 anti-softlock). */
export function findPathToBottom(grid: Grid): PathResult {
  const visited = reachableCells(grid);
  let deepestRow = 0;
  for (let index = visited.length - 1; index >= 0; index--) {
    if (visited[index]) {
      deepestRow = Math.floor(index / grid.width);
      break;
    }
  }
  return { reachable: deepestRow === grid.height - 1, deepestRow };
}
