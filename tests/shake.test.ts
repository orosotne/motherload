import { describe, expect, it } from 'vitest';
import { landingTrauma, Shake } from '../src/render/effects/shake';

describe('Shake', () => {
  it('caps trauma at 1', () => {
    const shake = new Shake();
    shake.add(0.7);
    shake.add(0.7);
    expect(shake.level).toBe(1);
  });

  it('decays trauma linearly at the configured rate', () => {
    const shake = new Shake();
    shake.add(1);
    shake.update(0.5, 1.5);
    expect(shake.level).toBeCloseTo(0.25);
    shake.update(1, 1.5);
    expect(shake.level).toBe(0);
  });

  it('shakes with strength trauma², so small trauma barely shows', () => {
    const offsets = [0.5, 1].map((trauma) => {
      const shake = new Shake();
      shake.add(trauma);
      shake.update(0.137, 0);
      return Math.abs(shake.offset(1, 1, 20).x);
    });
    expect((offsets[0] ?? 0) / (offsets[1] ?? 1)).toBeCloseTo(0.25);
  });

  it('stays still without trauma', () => {
    const shake = new Shake();
    shake.update(0.3, 1.5);
    expect(shake.offset(1, 1, 20)).toEqual({ x: 0, y: 0, roll: 0 });
  });
});

describe('landingTrauma', () => {
  it('ignores soft landings and grows to the maximum at the top fall speed', () => {
    expect(landingTrauma(5, 7, 14, 0.55)).toBe(0);
    expect(landingTrauma(10.5, 7, 14, 0.55)).toBeCloseTo(0.275);
    expect(landingTrauma(14, 7, 14, 0.55)).toBeCloseTo(0.55);
    expect(landingTrauma(20, 7, 14, 0.55)).toBeCloseTo(0.55);
  });
});
