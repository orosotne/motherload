import { isSolid } from '../data/blocks';
import type { FeelConfig } from '../data/feel';
import type { PodConfig } from '../data/pod';
import type { Grid } from '../world/grid';
import { colOf, rowOf, type Pod } from './pod';
import type { PodStats } from './stats';

/** Keeps the pod's edges off exact cell borders, so touching a wall never counts as inside it. */
const EDGE = 1e-6;

export interface MotionControls {
  horizontal: -1 | 0 | 1;
  thrusting: boolean;
}

export interface MotionResult {
  /** Downward speed at touchdown if the pod landed this tick, otherwise null. */
  landingSpeed: number | null;
  /** Blocks fallen since the top of the fall, when the pod landed this tick. */
  fallHeight: number;
  /** The engine started from idle this tick. */
  engineStarted: boolean;
}

function approach(value: number, target: number, maxStep: number): number {
  return value < target ? Math.min(value + maxStep, target) : Math.max(value - maxStep, target);
}

function solid(grid: Grid, col: number, row: number): boolean {
  return isSolid(grid.get(col, row));
}

/** Moves the pod sideways, stopping at the first wall. Returns true if a wall stopped it. */
function moveX(pod: Pod, grid: Grid, dx: number, half: number): boolean {
  if (dx === 0) return false;
  const nextX = pod.x + dx;
  const col = colOf(dx > 0 ? nextX + half : nextX - half);
  for (let row = rowOf(pod.y + half - EDGE); row <= rowOf(pod.y - half + EDGE); row++) {
    if (solid(grid, col, row)) {
      pod.x = dx > 0 ? col - 0.5 - half - EDGE : col + 0.5 + half + EDGE;
      return true;
    }
  }
  pod.x = nextX;
  return false;
}

/** Moves the pod vertically, stopping at the first floor or ceiling. Returns true if stopped. */
function moveY(pod: Pod, grid: Grid, dy: number, half: number): boolean {
  if (dy === 0) return false;
  const nextY = pod.y + dy;
  const row = rowOf(dy < 0 ? nextY - half : nextY + half);
  for (let col = colOf(pod.x - half + EDGE); col <= colOf(pod.x + half - EDGE); col++) {
    if (solid(grid, col, row)) {
      // Row r spans y from −r − 0.5 to −r + 0.5.
      pod.y = dy < 0 ? -row + 0.5 + half + EDGE : -row - 0.5 - half - EDGE;
      return true;
    }
  }
  pod.y = nextY;
  return false;
}

/** True when solid ground lies right under the pod. */
export function touchingFloor(pod: Pod, grid: Grid, half: number): boolean {
  const row = rowOf(pod.y - half - 2 * EDGE);
  for (let col = colOf(pod.x - half + EDGE); col <= colOf(pod.x + half - EDGE); col++) {
    if (solid(grid, col, row)) return true;
  }
  return false;
}

/** One tick of driving, gravity and flight (GAME_SPEC §3, §5.10). */
export function stepMotion(
  pod: Pod,
  grid: Grid,
  controls: MotionControls,
  dt: number,
  config: PodConfig,
  stats: PodStats,
  feel: FeelConfig,
): MotionResult {
  const wasGrounded = pod.grounded;
  const engineIdle = pod.thrust === 0;
  if (feel.engine.enabled) {
    const ramp = controls.thrusting
      ? dt / feel.engine.rampUpSeconds
      : -dt / feel.engine.rampDownSeconds;
    pod.thrust = Math.min(Math.max(pod.thrust + ramp, 0), 1);
  } else {
    pod.thrust = controls.thrusting ? 1 : 0;
  }

  const { horizontal } = controls;
  const reversing = horizontal !== 0 && Math.sign(pod.vx) === -horizontal;
  let accel: number;
  if (wasGrounded) accel = horizontal === 0 || reversing ? config.groundBrake : config.groundAccel;
  else accel = horizontal === 0 ? config.airBrake : config.airAccel;
  pod.vx = approach(pod.vx, horizontal * config.driveSpeed, accel * dt);
  if (horizontal !== 0) pod.facing = horizontal;

  pod.vy += (pod.thrust * config.thrustAccel - config.gravity) * dt;
  pod.vy = Math.min(Math.max(pod.vy, -config.maxFallSpeed), stats.climbSpeed);

  if (moveX(pod, grid, pod.vx * dt, config.halfSize)) pod.vx = 0;
  const touchdownSpeed = -pod.vy;
  if (moveY(pod, grid, pod.vy * dt, config.halfSize)) pod.vy = 0;

  pod.grounded = pod.vy <= 0 && touchingFloor(pod, grid, config.halfSize);
  const landed = !wasGrounded && pod.grounded;
  const fallHeight = landed ? Math.max(pod.fallTopY - pod.y, 0) : 0;
  const braked = pod.thrust > 0 && pod.vy > -config.brakeSpeed;
  pod.fallTopY = pod.grounded || braked ? pod.y : Math.max(pod.fallTopY, pod.y);

  return {
    landingSpeed: landed ? Math.max(touchdownSpeed, 0) : null,
    fallHeight,
    engineStarted: engineIdle && pod.thrust > 0,
  };
}
