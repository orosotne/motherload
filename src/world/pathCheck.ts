import { Block, isDrillable, isSolid } from '../data/blocks';
import type { Grid } from './grid';

export interface PathResult {
  reachable: boolean;
  /** Deepest row the pod can get to. */
  deepestRow: number;
}

/**
 * Whether the pod can get from the surface to the bottom row (GAME_SPEC §4 anti-softlock).
 * Moves follow the pod's real abilities: it drills down and sideways (sideways only while
 * standing on something), falls and flies through open cells, but never drills upwards.
 */
export function findPathToBottom(grid: Grid): PathResult {
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

  let deepestRow = 0;
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head] ?? 0;
    const col = index % width;
    const row = (index - col) / width;
    deepestRow = Math.max(deepestRow, row);
    if (row === height - 1) return { reachable: true, deepestRow };

    if (row + 1 < height && enterable(col, row + 1)) visit(col, row + 1);
    if (row > 0 && grid.get(col, row - 1) === Block.Empty) visit(col, row - 1);
    const standing = isSolid(grid.get(col, row + 1));
    for (const side of [col - 1, col + 1]) {
      if (side < 0 || side >= width) continue;
      const block = grid.get(side, row);
      if (block === Block.Empty || (standing && isDrillable(block))) visit(side, row);
    }
  }
  return { reachable: false, deepestRow };
}
