import {
  BoxGeometry,
  Color,
  DodecahedronGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  Euler,
  Vector3,
} from 'three';
import { ZONES } from '../data/zones';
import type { Grid } from '../world/grid';
import { cellHash } from './chunkMesher';
import { backWallColor, rockColor } from './palette';
import { toon } from './toon';

/** How far the rock beyond the world's sides and bottom reaches, in blocks. */
const MARGIN = 16;
/** Depth of the far wall behind the playfield. */
const WALL_Z = -9;

/** First row with rocks in zone 1 per layer: deeper ones would peek over the horizon. */
const FIRST_ROCK_ROWS = [4, 7];

/** Layers of rocks behind the grid; further ones are darker and drift slower on screen (§8). */
const LAYERS = [
  { z: -2.4, spacing: 3, scale: 1.3, shade: 0.55 },
  { z: -5.2, spacing: 4, scale: 2.1, shade: 0.4 },
] as const;

/**
 * What lies behind the playfield (§8): two layers of cave-wall rocks at different depths, so
 * the perspective camera gives them parallax, a far wall in each zone's darkest tone, and solid
 * rock beyond the world's sides and bottom. Rows span y from 0.5 down to −height + 0.5.
 */
export function createParallax(grid: Grid): Group {
  const group = new Group();
  const left = -0.5;
  const right = grid.width - 0.5;
  const width = right - left + 2 * MARGIN;
  const rock = toon({ color: '#ffffff' });
  const geometry = new DodecahedronGeometry(0.5, 0);
  const matrix = new Matrix4();
  const position = new Vector3();
  const rotation = new Quaternion();
  const euler = new Euler();
  const scale = new Vector3();
  const color = new Color();

  for (const zone of ZONES) {
    // Zone 1's wall starts below the horizon: seen from above, a far wall's top edge shows
    // higher on screen than the ground in front of it.
    const top = zone.index === 1 ? -4 : -zone.firstRow + 0.5;
    const bottom = zone.index === ZONES.length ? -grid.height + 0.5 - MARGIN : -zone.lastRow - 0.5;
    const wall = new Mesh(
      new PlaneGeometry(width + 40, top - bottom),
      toon({ color: backWallColor(zone.index) }),
    );
    wall.position.set((left + right) / 2, (top + bottom) / 2, WALL_Z);
    group.add(wall);

    LAYERS.forEach((layer, layerIndex) => {
      const spots: [number, number][] = [];
      const first = zone.index === 1 ? (FIRST_ROCK_ROWS[layerIndex] ?? 6) : zone.firstRow + 1;
      for (let row = first; row <= zone.lastRow; row += layer.spacing) {
        for (let col = -4; col < grid.width + 4; col += layer.spacing) spots.push([col, row]);
      }
      const mesh = new InstancedMesh(geometry, rock, spots.length);
      spots.forEach(([col, row], index) => {
        const jitter = (salt: number): number => cellHash(col, row, salt + layerIndex * 13) - 0.5;
        position.set(col + jitter(1) * layer.spacing, -row + jitter(2) * layer.spacing, layer.z);
        euler.set(jitter(3) * 3, jitter(4) * 3, jitter(5) * 3);
        const size = layer.scale * (0.7 + cellHash(col, row, 9) * 0.8);
        scale.set(size, size * 0.8, size);
        mesh.setMatrixAt(index, matrix.compose(position, rotation.setFromEuler(euler), scale));
        const tone = layer.shade * (0.85 + cellHash(col, row, 11) * 0.3);
        mesh.setColorAt(index, color.copy(rockColor(zone.index)).multiplyScalar(tone));
      });
      mesh.computeBoundingSphere();
      group.add(mesh);
    });
  }

  const top = 0.5;
  const bottom = -grid.height + 0.5;
  const height = top - bottom + MARGIN;
  const centerY = (top + bottom - MARGIN) / 2;
  const sideRock = toon({ color: '#241F22' });
  const side = new BoxGeometry(MARGIN, height, 1);
  const leftRock = new Mesh(side, sideRock);
  leftRock.position.set(left - MARGIN / 2, centerY, 0);
  const rightRock = new Mesh(side, sideRock);
  rightRock.position.set(right + MARGIN / 2, centerY, 0);
  const floor = new Mesh(new BoxGeometry(right - left, MARGIN, 1), sideRock);
  floor.position.set((left + right) / 2, bottom - MARGIN / 2, 0);
  group.add(leftRock, rightRock, floor);
  return group;
}
