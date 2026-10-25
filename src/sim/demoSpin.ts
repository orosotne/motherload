/**
 * F0 placeholder simulation: a single spinning angle that proves the fixed-step loop and the
 * render interpolation. F1 replaces it with the pod.
 */

const FULL_TURN = Math.PI * 2;

/** Default spin speed in radians per second. */
export const DEMO_SPIN_SPEED = 0.8;

export interface SpinState {
  /** Angle after the latest simulation step, in radians. */
  angle: number;
  /** Angle one step earlier; the renderer blends between the two. */
  previousAngle: number;
}

export function createSpin(): SpinState {
  return { angle: 0, previousAngle: 0 };
}

export function stepSpin(state: SpinState, dt: number, speed: number): void {
  state.previousAngle = state.angle;
  state.angle += speed * dt;
  // Keep the numbers small; shifting both angles together leaves the blend between them intact.
  if (state.angle > FULL_TURN) {
    state.angle -= FULL_TURN;
    state.previousAngle -= FULL_TURN;
  }
}
