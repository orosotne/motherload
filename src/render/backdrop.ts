import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import type { Grid } from '../world/grid';

/** How far the rock walls reach beyond the world, in blocks. */
const MARGIN = 16;

/**
 * Rock around the playfield: a wall behind the grid, so tunnels show rock instead of sky, and
 * solid rock beyond the sides and under the bottom. Rows span y from 0.5 (top of the surface
 * row) down to −height + 0.5.
 */
export function createBackdrop(grid: Grid): Group {
  const group = new Group();
  const backWall = new MeshStandardMaterial({ color: '#3b3330', roughness: 1 });
  const rock = new MeshStandardMaterial({ color: '#2a2526', roughness: 1 });

  const top = 0.5;
  const bottom = -grid.height + 0.5;
  const left = -0.5;
  const right = grid.width - 0.5;
  const height = top - bottom + MARGIN;
  const centerY = (top + bottom - MARGIN) / 2;

  const back = new Mesh(new PlaneGeometry(right - left + 2 * MARGIN, height), backWall);
  // Just behind the cubes' back faces.
  back.position.set((left + right) / 2, centerY, -0.52);

  const side = new BoxGeometry(MARGIN, height, 1);
  const leftRock = new Mesh(side, rock);
  leftRock.position.set(left - MARGIN / 2, centerY, 0);
  const rightRock = new Mesh(side, rock);
  rightRock.position.set(right + MARGIN / 2, centerY, 0);

  const floor = new Mesh(new BoxGeometry(right - left, MARGIN, 1), rock);
  floor.position.set((left + right) / 2, bottom - MARGIN / 2, 0);

  group.add(back, leftRock, rightRock, floor);
  return group;
}
