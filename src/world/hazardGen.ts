import type { Rng } from '../core/rng';
import { Block, isSolid } from '../data/blocks';
import { GENERATION } from '../data/generation';
import { zoneAt } from '../data/zones';
import type { Grid } from './grid';

/** Rows at the bottom of the world without lava. */
const LAVA_FREE_BOTTOM_ROWS = 4;

function settings(row: number): (typeof GENERATION)[number] | undefined {
  return GENERATION[zoneAt(row).index - 1];
}

/**
 * Lava in zones 4 and 5 (GAME_SPEC §7): pools along cave floors, one roll per stretch of floor
 * so a pool fills it from wall to wall, plus small pockets inside the rock.
 */
export function placeLava(grid: Grid, rng: Rng): void {
  // The last rows stay clear: the finale happens down there.
  for (let row = 0; row < grid.height - LAVA_FREE_BOTTOM_ROWS; row++) {
    const zone = settings(row);
    if (!zone || (zone.lavaFloorChance <= 0 && zone.lavaPocketDensity <= 0)) continue;
    const base = zoneAt(row).base;
    const floor = (c: number): boolean =>
      grid.get(c, row) === Block.Empty && isSolid(grid.get(c, row + 1));
    let col = 0;
    while (col < grid.width) {
      if (!floor(col)) {
        col++;
        continue;
      }
      let end = col;
      while (end + 1 < grid.width && floor(end + 1)) end++;
      if (rng.chance(zone.lavaFloorChance)) {
        for (let c = col; c <= end; c++) grid.set(c, row, Block.Lava);
      }
      col = end + 1;
    }
    for (let c = 0; c < grid.width; c++) {
      if (grid.get(c, row) !== base || !rng.chance(zone.lavaPocketDensity)) continue;
      grid.set(c, row, Block.Lava);
      // Some pockets reach into the next cell, so they read as blobs, not dots.
      if (rng.chance(0.5) && grid.get(c + 1, row) === base) grid.set(c + 1, row, Block.Lava);
    }
  }
}

/** Gas pockets in zones 2 to 5, hidden in the base material (§4, §7). */
export function placeGas(grid: Grid, rng: Rng): void {
  for (let row = 0; row < grid.height; row++) {
    const zone = settings(row);
    if (!zone || zone.gasDensity <= 0) continue;
    const base = zoneAt(row).base;
    for (let col = 0; col < grid.width; col++) {
      if (grid.get(col, row) === base && rng.chance(zone.gasDensity)) {
        grid.set(col, row, Block.Gas);
      }
    }
  }
}

/**
 * Turns lava around `row` back into the zone's rock; the anti-softlock uses it when lava is
 * what blocks the way down. Returns how many cells cooled.
 */
export function coolLava(grid: Grid, row: number): number {
  let cooled = 0;
  for (let r = Math.max(row - 1, 0); r <= Math.min(row + 2, grid.height - 1); r++) {
    for (let col = 0; col < grid.width; col++) {
      if (grid.get(col, r) !== Block.Lava) continue;
      grid.set(col, r, zoneAt(r).base);
      cooled++;
    }
  }
  return cooled;
}
