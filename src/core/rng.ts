/** mulberry32 adds this odd constant to its 32-bit state on every draw. */
const MULBERRY_INCREMENT = 0x6d2b79f5;
const UINT32_RANGE = 2 ** 32;

/**
 * Seeded pseudo-random generator, mulberry32 (GAME_SPEC §4, §9.4). The same seed yields the same
 * sequence on every platform, so the same seed always builds the same world. Game logic uses this
 * instead of Math.random.
 */
export class Rng {
  private state: number;

  /** Any number works as a seed; it is reduced to an unsigned 32-bit integer. */
  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + MULBERRY_INCREMENT) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  }

  /** Uniform integer in [min, max], both ends inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** True with probability `p` (0 never, 1 always). */
  chance(p: number): boolean {
    return this.next() < p;
  }
}

/**
 * Derives an independent seed for one part of the generation (caves, ore, …), so adding a step
 * never changes the others.
 */
export function mixSeed(seed: number, salt: number): number {
  let h = (seed ^ Math.imul(salt, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Seed from text the player types for a new game (FNV-1a), so "tumbra" is always the same world. */
export function seedFromText(text: string): number {
  let h = 0x811c9dc5;
  for (const char of text.trim().toLowerCase()) {
    h ^= char.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
