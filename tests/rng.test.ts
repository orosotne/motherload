import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';

/** Reference mulberry32 (Tommy Ettinger, as published by bryc), kept to pin the algorithm. */
function referenceMulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function take(rng: Rng, count: number): number[] {
  return Array.from({ length: count }, () => rng.next());
}

describe('Rng', () => {
  it('repeats the same sequence for the same seed', () => {
    expect(take(new Rng(42), 50)).toEqual(take(new Rng(42), 50));
  });

  it('gives different sequences for different seeds', () => {
    expect(take(new Rng(1), 5)).not.toEqual(take(new Rng(2), 5));
  });

  it('is exactly mulberry32', () => {
    for (const seed of [0, 1, 42, 0xdeadbeef, 2 ** 31]) {
      const reference = referenceMulberry32(seed);
      const rng = new Rng(seed);
      for (let i = 0; i < 1_000; i++) expect(rng.next()).toBe(reference());
    }
  });

  it('keeps its output frozen, because every world is built from it', () => {
    expect(take(new Rng(12345), 3)).toEqual([
      0.9797282677609473, 0.3067522644996643, 0.484205421525985,
    ]);
  });

  it('reduces seeds to unsigned 32-bit integers', () => {
    expect(take(new Rng(-1), 5)).toEqual(take(new Rng(0xffffffff), 5));
    expect(take(new Rng(2 ** 32 + 7), 5)).toEqual(take(new Rng(7), 5));
  });

  it('keeps next() within [0, 1)', () => {
    const rng = new Rng(5);
    for (let i = 0; i < 10_000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('covers the whole inclusive int() range and nothing outside it', () => {
    const rng = new Rng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 2_000; i++) {
      const value = rng.int(-2, 3);
      expect(Number.isInteger(value)).toBe(true);
      seen.add(value);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([-2, -1, 0, 1, 2, 3]);
  });

  it('keeps range() within [min, max)', () => {
    const rng = new Rng(8);
    for (let i = 0; i < 2_000; i++) {
      const value = rng.range(2.5, 4);
      expect(value).toBeGreaterThanOrEqual(2.5);
      expect(value).toBeLessThan(4);
    }
  });

  it('hits chance() at roughly the asked probability', () => {
    const rng = new Rng(9);
    const draws = 10_000;
    let hits = 0;
    for (let i = 0; i < draws; i++) if (rng.chance(0.25)) hits++;
    expect(Math.abs(hits / draws - 0.25)).toBeLessThan(0.02);
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
  });
});
