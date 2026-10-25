/**
 * Pod physics (GAME_SPEC §3). Units are blocks and seconds. Gravity and fall speed come from the
 * spec; the rest are starting values the spec leaves open (DECISIONS.md), tunable in the debug
 * panel. Drill speed and climb speed depend on upgrades (src/data/upgrades.ts).
 */
export interface PodConfig {
  /** Half the pod's width and height; a block is 1. */
  halfSize: number;
  gravity: number;
  maxFallSpeed: number;
  /** Top driving speed. */
  driveSpeed: number;
  /** Acceleration towards the driving direction on the ground. */
  groundAccel: number;
  /** Deceleration on the ground without input, and when reversing. */
  groundBrake: number;
  airAccel: number;
  /** Drag in the air without sideways input. */
  airBrake: number;
  /** Upward acceleration of the engine at full thrust, before gravity. */
  thrustAccel: number;
  /**
   * Braking with the engine below this downward speed restarts the fall, so a pod that brakes
   * before touchdown takes no fall damage (§7).
   */
  brakeSpeed: number;
}

export const POD: Readonly<PodConfig> = {
  halfSize: 0.4,
  gravity: 20,
  maxFallSpeed: 14,
  driveSpeed: 4.5,
  groundAccel: 30,
  groundBrake: 40,
  airAccel: 18,
  airBrake: 10,
  thrustAccel: 46,
  brakeSpeed: 4,
};
