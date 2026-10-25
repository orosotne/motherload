import { createNoise2D } from 'simplex-noise';
import { mixSeed, Rng } from '../core/rng';
import { Block } from '../data/blocks';
import {
  CAVE_VERTICAL_STRETCH,
  GENERATION,
  SOLID_TOP_ROWS,
  SURFACE_DIP_ROWS,
  TOWN_COLUMNS,
} from '../data/generation';
import { MINERALS } from '../data/minerals';
import { WORLD } from '../data/world';
import { ZONES, zoneAt } from '../data/zones';
import { Grid } from './grid';
import { findPathToBottom } from './pathCheck';

/** Each generation step draws from its own stream, so changing one step leaves the others. */
const SALT = { surface: 1, caves: 2, barriers: 3, ores: 4 } as const;

interface Barrier {
  row: number;
  rows: number;
  firstCol: number;
  lastCol: number;
}

/**
 * Builds the world from a seed (GAME_SPEC §4): the same seed always gives the same world.
 * Zones of base material, a flat town plateau with rolling terrain beside it, caves, short
 * corestone barriers, ore by the mineral table, and a guaranteed way down to the bottom.
 */
export function generateWorld(seed: number): Grid {
  const grid = new Grid(WORLD.width, WORLD.height, WORLD.chunkSize, WORLD.skyRows);
  fillZones(grid);
  carveSurface(grid, new Rng(mixSeed(seed, SALT.surface)));
  carveCaves(grid, new Rng(mixSeed(seed, SALT.caves)));
  const barriers = placeBarriers(grid, new Rng(mixSeed(seed, SALT.barriers)));
  placeOres(grid, new Rng(mixSeed(seed, SALT.ores)));
  keepBottomReachable(grid, barriers);
  return grid;
}

function fillZones(grid: Grid): void {
  for (let row = 0; row < grid.height; row++) {
    const base = zoneAt(row).base;
    for (let col = 0; col < grid.width; col++) grid.set(col, row, base);
  }
}

/** Flat plateau for the town; beside it the ground dips by up to SURFACE_DIP_ROWS. */
function carveSurface(grid: Grid, rng: Rng): void {
  const raw = Array.from({ length: grid.width }, () => rng.next());
  const [townFirst, townLast] = TOWN_COLUMNS;
  for (let col = 0; col < grid.width; col++) {
    if (col >= townFirst - 1 && col <= townLast + 1) continue;
    const smooth = ((raw[col - 1] ?? 0.5) + (raw[col] ?? 0.5) + (raw[col + 1] ?? 0.5)) / 3;
    const dip = Math.round(smooth * SURFACE_DIP_ROWS);
    for (let row = 0; row < dip; row++) grid.set(col, row, Block.Empty);
  }
}

/** Caves from two octaves of simplex noise, more and larger deeper down (§4). */
function carveCaves(grid: Grid, rng: Rng): void {
  const noise = createNoise2D(() => rng.next());
  for (let row = SOLID_TOP_ROWS; row < grid.height; row++) {
    const zone = GENERATION[zoneAt(row).index - 1];
    if (!zone) continue;
    for (let col = 0; col < grid.width; col++) {
      const x = col * zone.caveScale;
      const y = row * zone.caveScale * CAVE_VERTICAL_STRETCH;
      const value = 0.7 * noise(x, y) + 0.3 * noise(x * 2 + 97, y * 2 + 31);
      if (value > zone.caveThreshold) grid.set(col, row, Block.Empty);
    }
  }
}

/** Short corestone barriers, one or two rows thick, never the full width (§4). */
function placeBarriers(grid: Grid, rng: Rng): Barrier[] {
  const barriers: Barrier[] = [];
  for (const zone of ZONES) {
    const config = GENERATION[zone.index - 1];
    if (!config || config.barriersPer100Rows <= 0) continue;
    const zoneRows = zone.lastRow - zone.firstRow + 1;
    const count = Math.round((zoneRows * config.barriersPer100Rows) / 100);
    for (let i = 0; i < count; i++) {
      const [shortest, longest] = config.barrierLength;
      const length = Math.min(rng.int(shortest, longest), grid.width - 4);
      const firstCol = rng.int(0, grid.width - length);
      const row = rng.int(zone.firstRow + 1, zone.lastRow - 2);
      const rows = rng.chance(0.3) ? 2 : 1;
      const barrier = { row, rows, firstCol, lastCol: firstCol + length - 1 };
      paintBarrier(grid, barrier, Block.Corestone);
      barriers.push(barrier);
    }
  }
  return barriers;
}

function paintBarrier(grid: Grid, barrier: Barrier, block: typeof Block.Corestone | null): void {
  for (let row = barrier.row; row < barrier.row + barrier.rows; row++) {
    const base = zoneAt(row).base;
    for (let col = barrier.firstCol; col <= barrier.lastCol; col++) {
      grid.set(col, row, block ?? base);
    }
  }
}

/** Ore in base-material cells: full density in a mineral's main zone, half elsewhere (§6). */
function placeOres(grid: Grid, rng: Rng): void {
  for (let row = 0; row < grid.height; row++) {
    const zone = zoneAt(row);
    const candidates = MINERALS.filter(
      (mineral) =>
        mineral.zones.includes(zone.index) &&
        (mineral.lastRows === undefined || row >= grid.height - mineral.lastRows),
    ).map((mineral) => ({
      id: mineral.id,
      chance: mineral.mainZone === zone.index ? mineral.density : mineral.density / 2,
    }));
    for (let col = 0; col < grid.width; col++) {
      if (grid.get(col, row) !== zone.base) continue;
      const roll = rng.next();
      let threshold = 0;
      for (const candidate of candidates) {
        threshold += candidate.chance;
        if (roll < threshold) {
          grid.set(col, row, Block.Ore, candidate.id);
          break;
        }
      }
    }
  }
}

/**
 * Anti-softlock (§4): while the bottom cannot be reached, the barrier stopping the deepest
 * progress turns back into plain rock. Without barriers every column can be drilled straight
 * down, so this always ends with a way to the bottom.
 */
function keepBottomReachable(grid: Grid, barriers: Barrier[]): void {
  for (;;) {
    const path = findPathToBottom(grid);
    if (path.reachable) return;
    const candidates = barriers
      .filter((barrier) => barrier.row + barrier.rows > path.deepestRow)
      .sort((a, b) => a.row - b.row);
    const blocking = candidates[0] ?? barriers[barriers.length - 1];
    if (!blocking) throw new Error('World has no way down and no barrier to remove');
    paintBarrier(grid, blocking, null);
    barriers.splice(barriers.indexOf(blocking), 1);
  }
}
