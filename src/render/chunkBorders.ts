import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';
import type { Grid } from '../world/grid';

/** Debug lines on the chunk borders (§9.9), in front of the blocks. */
export function createChunkBorders(grid: Grid): LineSegments {
  const points: number[] = [];
  const left = -0.5;
  const right = grid.width - 0.5;
  const bottom = -grid.height + 0.5;
  for (let row = 0; row <= grid.height; row += grid.chunkSize) {
    const y = -row + 0.5;
    points.push(left, y, 0.55, right, y, 0.55);
  }
  for (let col = 0; col <= grid.width; col += grid.chunkSize) {
    const x = col - 0.5;
    points.push(x, 0.5, 0.55, x, bottom, 0.55);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  const lines = new LineSegments(geometry, new LineBasicMaterial({ color: '#FF2E88' }));
  lines.visible = false;
  return lines;
}
