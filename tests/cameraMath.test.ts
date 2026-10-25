import { describe, expect, it } from 'vitest';
import { FEEL } from '../src/data/feel';
import { clampView, followTarget, smoothToward } from '../src/render/cameraMath';

const SPEEDS = { drive: 4.5, fall: 14, climb: 3 };

describe('followTarget', () => {
  it('looks 3 blocks ahead in the driving direction at full speed', () => {
    expect(followTarget({ x: 10, y: 0 }, { x: 4.5, y: 0 }, FEEL.camera, SPEEDS)).toEqual({
      x: 13,
      y: 0,
    });
    expect(followTarget({ x: 10, y: 0 }, { x: -4.5, y: 0 }, FEEL.camera, SPEEDS).x).toBe(7);
  });

  it('looks further down when falling than up when climbing', () => {
    const falling = followTarget({ x: 0, y: 0 }, { x: 0, y: -14 }, FEEL.camera, SPEEDS);
    const climbing = followTarget({ x: 0, y: 0 }, { x: 0, y: 3 }, FEEL.camera, SPEEDS);
    expect(falling.y).toBe(-FEEL.camera.fallLookahead);
    expect(climbing.y).toBe(FEEL.camera.climbLookahead);
    expect(-falling.y).toBeGreaterThan(climbing.y);
  });

  it('centres on a pod at rest', () => {
    expect(followTarget({ x: 4, y: -2 }, { x: 0, y: 0 }, FEEL.camera, SPEEDS)).toEqual({
      x: 4,
      y: -2,
    });
  });
});

describe('smoothToward', () => {
  it('closes the gap at the same speed whatever the frame rate', () => {
    let at60 = 0;
    for (let i = 0; i < 60; i++) at60 = smoothToward(at60, 10, 8, 1 / 60);
    let at144 = 0;
    for (let i = 0; i < 144; i++) at144 = smoothToward(at144, 10, 8, 1 / 144);
    expect(at60).toBeCloseTo(at144, 9);
    expect(at60).toBeCloseTo(10 * (1 - Math.exp(-8)), 9);
  });
});

describe('clampView', () => {
  it('keeps the view inside the world', () => {
    expect(clampView(1, 12, -1.5, 40.5)).toBe(10.5);
    expect(clampView(39, 12, -1.5, 40.5)).toBe(28.5);
    expect(clampView(20, 12, -1.5, 40.5)).toBe(20);
  });

  it('centres on a world narrower than the view', () => {
    expect(clampView(3, 12, 0, 10)).toBe(5);
  });
});
