import { isSolid } from '../data/blocks';
import { BUILDINGS, type BuildingConfig, type BuildingId } from '../data/buildings';
import { WORLD } from '../data/world';
import { zoneAt } from '../data/zones';
import type { Grid } from '../world/grid';
import { colOf, rowOf, type Pod } from './pod';

/** The building the pod stands in front of on the surface, if any (§3, §7). */
export function buildingAt(pod: Pod): BuildingConfig | null {
  if (!pod.grounded || pod.drill || rowOf(pod.y) !== -1) return null;
  const col = colOf(pod.x);
  return BUILDINGS.find((building) => col >= building.firstCol && col <= building.lastCol) ?? null;
}

export function buildingCenter(id: BuildingId): number {
  const building = BUILDINGS.find((candidate) => candidate.id === id);
  return building ? Math.round((building.firstCol + building.lastCol) / 2) : WORLD.spawnCol;
}

/** Depth in metres shown in the HUD: 0 on the surface, 4 m per row below (§4). */
export function depthMeters(pod: Pod): number {
  return Math.max(0, rowOf(pod.y) + 1) * WORLD.metersPerBlock;
}

/** Columns from `first` to `last`, nearest to `center` first: center, center + 1, center − 1, … */
export function columnsByDistance(center: number, first: number, last: number): number[] {
  const columns: number[] = [];
  for (let step = 0; columns.length < last - first + 1; step++) {
    for (const col of step === 0 ? [center] : [center + step, center - step]) {
      if (col >= first && col <= last) columns.push(col);
    }
  }
  return columns;
}

/** The columns in front of a building, its centre first. */
export function buildingColumns(id: BuildingId): number[] {
  const building = BUILDINGS.find((candidate) => candidate.id === id);
  if (!building) return [WORLD.spawnCol];
  return columnsByDistance(buildingCenter(id), building.firstCol, building.lastCol);
}

/**
 * Where a pod put on the surface can stand: the first of `columns` with ground under it. When
 * the player has dug all of them away, the first one gets its ground back; a pod dropped over a
 * shaft with an empty tank would fall in and be towed again and again.
 */
export function landingColumn(grid: Grid, columns: readonly number[]): number {
  const standing = columns.find((col) => isSolid(grid.get(col, 0)));
  if (standing !== undefined) return standing;
  const col = columns[0] ?? WORLD.spawnCol;
  grid.set(col, 0, zoneAt(0).base);
  return col;
}
