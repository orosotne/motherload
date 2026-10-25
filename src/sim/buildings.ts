import { BUILDINGS, type BuildingConfig, type BuildingId } from '../data/buildings';
import { WORLD } from '../data/world';
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
