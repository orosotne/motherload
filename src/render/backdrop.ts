import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import { ZONES } from '../data/zones';
import type { Grid } from '../world/grid';
import { backWallColor } from './materials';

/** How far the rock walls reach beyond the world, in blocks. */
const MARGIN = 16;

/**
 * Rock around the playfield: a wall behind the grid in each zone's darkest tone, so tunnels show
 * rock instead of sky, and solid rock beyond the sides and under the bottom. Rows span y from
 * 0.5 (top of the surface row) down to −height + 0.5.
 */
export function createBackdrop(grid: Grid): Group {
  const group = new Group();
  const rock = new MeshStandardMaterial({ color: '#241F22', roughness: 1 });
  const left = -0.5;
  const right = grid.width - 0.5;
  const width = right - left + 2 * MARGIN;

  for (const zone of ZONES) {
    const top = zone.index === 1 ? 0.5 : -zone.firstRow + 0.5;
    const bottom = zone.index === ZONES.length ? -grid.height + 0.5 - MARGIN : -zone.lastRow - 0.5;
    const wall = new Mesh(
      new PlaneGeometry(width, top - bottom),
      new MeshStandardMaterial({ color: backWallColor(zone.index), roughness: 1 }),
    );
    // Just behind the cubes' back faces.
    wall.position.set((left + right) / 2, (top + bottom) / 2, -0.52);
    group.add(wall);
  }

  const top = 0.5;
  const bottom = -grid.height + 0.5;
  const height = top - bottom + MARGIN;
  const centerY = (top + bottom - MARGIN) / 2;
  const side = new BoxGeometry(MARGIN, height, 1);
  const leftRock = new Mesh(side, rock);
  leftRock.position.set(left - MARGIN / 2, centerY, 0);
  const rightRock = new Mesh(side, rock);
  rightRock.position.set(right + MARGIN / 2, centerY, 0);
  const floor = new Mesh(new BoxGeometry(right - left, MARGIN, 1), rock);
  floor.position.set((left + right) / 2, bottom - MARGIN / 2, 0);

  group.add(leftRock, rightRock, floor);
  return group;
}
