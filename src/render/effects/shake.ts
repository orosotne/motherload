/** Smooth pseudo-noise in [−1, 1] from layered sines; each channel has its own phase. */
function wobble(t: number, channel: number): number {
  return (
    Math.sin(t + channel * 1.7) * 0.5 +
    Math.sin(t * 2.3 + channel * 4.1) * 0.3 +
    Math.sin(t * 4.7 + channel * 2.9) * 0.2
  );
}

export interface ShakeOffset {
  x: number;
  y: number;
  roll: number;
}

/**
 * Trauma-model screen shake (GAME_SPEC §5.7): events add trauma from 0 to 1, the visible
 * strength is trauma², and trauma decays linearly over time.
 */
export class Shake {
  private trauma = 0;
  private time = 0;

  get level(): number {
    return this.trauma;
  }

  add(amount: number): void {
    this.trauma = Math.min(1, this.trauma + Math.max(amount, 0));
  }

  update(dt: number, decayPerSecond: number): void {
    this.time += dt;
    this.trauma = Math.max(0, this.trauma - decayPerSecond * dt);
  }

  /** Camera offset in blocks and roll in radians for the current moment. */
  offset(maxOffset: number, maxRoll: number, frequency: number): ShakeOffset {
    const strength = this.trauma * this.trauma;
    if (strength === 0) return { x: 0, y: 0, roll: 0 };
    const t = this.time * frequency;
    return {
      x: maxOffset * strength * wobble(t, 1),
      y: maxOffset * strength * wobble(t, 2),
      roll: maxRoll * strength * wobble(t, 3),
    };
  }
}

/** Trauma a landing adds: none below `minSpeed`, rising to `maxTrauma` at the top fall speed. */
export function landingTrauma(
  speed: number,
  minSpeed: number,
  topSpeed: number,
  maxTrauma: number,
): number {
  if (speed <= minSpeed || topSpeed <= minSpeed) return 0;
  return Math.min((speed - minSpeed) / (topSpeed - minSpeed), 1) * maxTrauma;
}
