/** Camera framing (GAME_SPEC §2). Distances are in blocks: 1 block = 1 world unit. */
export interface CameraSettings {
  /** Vertical field of view in degrees. */
  fovDeg: number;
  /** Downward pitch onto the play plane, in degrees. */
  tiltDeg: number;
  /** Distance from the focus point to the camera, in blocks. */
  distance: number;
  near: number;
  far: number;
}

export const CAMERA: Readonly<CameraSettings> = {
  fovDeg: 40,
  tiltDeg: 12,
  distance: 22,
  near: 0.1,
  far: 500,
};
