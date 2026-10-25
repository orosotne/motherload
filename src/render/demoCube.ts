import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';
import type { SpinState } from '../sim/demoSpin';

/** Zone 1 palette orange. */
const CUBE_COLOR = '#E8A15A';
/** The cube tips forward at this fraction of its spin, so all faces catch the light. */
const TUMBLE_RATIO = 0.5;

/** F0 placeholder: a cube that shows the interpolated simulation state. F1 replaces it. */
export function createDemoCube(): Mesh {
  return new Mesh(
    new BoxGeometry(2, 2, 2),
    new MeshStandardMaterial({ color: CUBE_COLOR, roughness: 0.6 }),
  );
}

/** Poses the cube between the previous and the current simulation step. */
export function syncDemoCube(cube: Mesh, spin: SpinState, alpha: number): void {
  const angle = spin.previousAngle + (spin.angle - spin.previousAngle) * alpha;
  cube.rotation.set(angle * TUMBLE_RATIO, angle, 0);
}
