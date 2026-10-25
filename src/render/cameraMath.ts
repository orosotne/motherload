/** Camera follow math (GAME_SPEC §5.8), kept free of Three.js so it can be tested headless. */

export interface CameraFollowConfig {
  followRate: number;
  lookahead: number;
  fallLookahead: number;
  climbLookahead: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

/** Speeds that count as "full" lookahead in each direction. */
export interface SpeedScale {
  drive: number;
  fall: number;
  climb: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** The point the camera aims for: the pod plus lookahead in its direction of travel. */
export function followTarget(
  pod: Vec2,
  velocity: Vec2,
  config: CameraFollowConfig,
  speeds: SpeedScale,
): Vec2 {
  const ahead = clamp(velocity.x / speeds.drive, -1, 1) * config.lookahead;
  const vertical =
    velocity.y < 0
      ? -clamp(-velocity.y / speeds.fall, 0, 1) * config.fallLookahead
      : clamp(velocity.y / speeds.climb, 0, 1) * config.climbLookahead;
  return { x: pod.x + ahead, y: pod.y + vertical };
}

/** Exponential approach: each second closes the gap by the factor e^−rate, independent of fps. */
export function smoothToward(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/**
 * Keeps a view of half-size `halfView` inside [min, max]. When the range is narrower than the
 * view, the view centres on it.
 */
export function clampView(center: number, halfView: number, min: number, max: number): number {
  if (max - min <= halfView * 2) return (min + max) / 2;
  return clamp(center, min + halfView, max - halfView);
}
