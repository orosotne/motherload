import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import { CAMERA, type CameraSettings } from '../data/camera';

/**
 * Perspective camera looking at a focus point on the play plane (z = 0) from `distance` blocks
 * away, pitched down by `tiltDeg` (GAME_SPEC §2).
 */
export class CameraRig {
  readonly camera = new PerspectiveCamera();
  /** Live copy of {@link CAMERA}: the debug panel tunes it, then calls {@link apply}. */
  readonly settings: CameraSettings = { ...CAMERA };
  private readonly focus = new Vector3();

  constructor() {
    this.apply();
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Aims at block coordinates on the play plane: x to the right, y up. */
  setFocus(x: number, y: number): void {
    this.focus.set(x, y, 0);
    this.place();
  }

  /** Re-reads {@link settings} after they changed. */
  apply(): void {
    const { fovDeg, near, far } = this.settings;
    this.camera.fov = fovDeg;
    this.camera.near = near;
    this.camera.far = far;
    this.camera.updateProjectionMatrix();
    this.place();
  }

  private place(): void {
    const tilt = MathUtils.degToRad(this.settings.tiltDeg);
    const { distance } = this.settings;
    this.camera.position.set(
      this.focus.x,
      this.focus.y + Math.sin(tilt) * distance,
      this.focus.z + Math.cos(tilt) * distance,
    );
    this.camera.lookAt(this.focus);
  }
}
