import { Block, BLOCKS, isSolid, type BlockId } from '../data/blocks';
import { zoneAt } from '../data/zones';
import type { Grid } from '../world/grid';
import { colOf, restY, rowOf, type Drill, type DrillDir, type Pod } from './pod';
import type { PodStats } from './stats';

/** Hardness of the block at a cell, or null when it cannot be drilled (GAME_SPEC §4). */
export function hardnessAt(grid: Grid, col: number, row: number): number | null {
  const { hardness } = BLOCKS[grid.get(col, row)];
  switch (hardness.kind) {
    case 'fixed':
      return hardness.value;
    case 'zone': {
      const base = BLOCKS[zoneAt(row).base].hardness;
      return base.kind === 'fixed' ? base.value + hardness.bonus : null;
    }
    case 'none':
      return null;
  }
}

/** The cell a drill in `dir` would hit from the pod's current cell. */
export function drillTarget(pod: Pod, dir: DrillDir): { col: number; row: number } {
  const col = colOf(pod.x);
  const row = rowOf(pod.y);
  if (dir === 'down') return { col, row: row + 1 };
  return { col: dir === 'left' ? col - 1 : col + 1, row };
}

/**
 * Starts drilling in `dir` if the target can be drilled. `carry` is time already spent, so a
 * drilling that follows another one keeps the rhythm exact. The pod must stand on the ground;
 * the caller checks that (§3: no drilling upwards or in the air).
 */
export function startDrill(
  pod: Pod,
  grid: Grid,
  dir: DrillDir,
  stats: PodStats,
  half: number,
  carry = 0,
): Drill | null {
  const { col, row } = drillTarget(pod, dir);
  const hardness = hardnessAt(grid, col, row);
  if (hardness === null) return null;
  pod.drill = {
    col,
    row,
    dir,
    duration: hardness * stats.drillSecondsPerHardness,
    elapsed: Math.max(carry, 0),
    fromX: pod.x,
    fromY: pod.y,
    toX: col,
    toY: restY(row, half),
  };
  pod.vx = 0;
  pod.vy = 0;
  pod.thrust = 0;
  if (dir !== 'down') pod.facing = dir === 'left' ? -1 : 1;
  return pod.drill;
}

export interface DrillResult {
  col: number;
  row: number;
  block: BlockId;
  mineral: number;
  /** Time past the end of the drilling within this tick. */
  overflow: number;
}

/**
 * Advances the drilling: the pod glides into the target cell (§3) and, once the time is up, the
 * block disappears and the pod stands in its place.
 */
export function advanceDrill(pod: Pod, grid: Grid, dt: number): DrillResult | null {
  const drill = pod.drill;
  if (!drill) return null;
  drill.elapsed += dt;
  const t = Math.min(drill.elapsed / drill.duration, 1);
  pod.x = drill.fromX + (drill.toX - drill.fromX) * t;
  pod.y = drill.fromY + (drill.toY - drill.fromY) * t;
  // The tolerance absorbs float error, so a 0.6 s drilling takes exactly 36 ticks at 60 Hz.
  if (drill.elapsed + 1e-9 < drill.duration) return null;

  const result: DrillResult = {
    col: drill.col,
    row: drill.row,
    block: grid.get(drill.col, drill.row),
    mineral: grid.mineral(drill.col, drill.row),
    overflow: drill.elapsed - drill.duration,
  };
  grid.set(drill.col, drill.row, Block.Empty);
  pod.drill = null;
  pod.grounded = isSolid(grid.get(drill.col, drill.row + 1));
  pod.fallTopY = pod.y;
  return result;
}
