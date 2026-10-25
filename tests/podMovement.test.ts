import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../src/sim/game';
import { restY } from '../src/sim/pod';
import { gridFrom, Sim } from './helpers/sim';

const HALF = 0.4;

/** A shaft `depth` rows deep, one cell wide, with a floor of dirt under it. */
function shaft(depth: number): string[] {
  return [...Array<string>(depth).fill('#.#'), '###'];
}

describe('pod movement', () => {
  it('falls with gravity 20 up to 14 blocks per second', () => {
    const sim = new Sim(gridFrom(shaft(60)), 1, 0);
    sim.hold([], 1);
    expect(sim.pod.vy).toBeCloseTo(-20 / 60);
    sim.hold([], 59);
    expect(sim.pod.vy).toBe(-14);
  });

  it('lands standing on the floor and reports speed and fall height', () => {
    const sim = new Sim(gridFrom(shaft(10)), 1, 0);
    sim.until((s) => s.events('Landed').length > 0);
    const landed = sim.events('Landed')[0]?.payload;
    expect(sim.pod.y).toBeCloseTo(restY(9, HALF), 5);
    expect(sim.pod.vy).toBe(0);
    expect(sim.pod.grounded).toBe(true);
    expect(landed?.speed).toBeGreaterThan(10);
    expect(landed?.fallHeight).toBeCloseTo(9, 5);
  });

  it('drives up to driveSpeed and stops against a wall it cannot drill', () => {
    const sim = new Sim(gridFrom(['......X', '#######']), 1, 0);
    let topSpeed = 0;
    for (let i = 0; i < 90; i++) {
      sim.hold(['right'], 1);
      topSpeed = Math.max(topSpeed, sim.pod.vx);
    }
    expect(topSpeed).toBeCloseTo(4.5);
    expect(sim.pod.x).toBeCloseTo(6 - 0.5 - HALF, 5);
    expect(sim.pod.vx).toBe(0);
    expect(sim.events('DrillStarted')).toHaveLength(0);
  });

  it('cannot leave the world at the sides', () => {
    const sim = new Sim(gridFrom(['.....', '#####']), 2, 0);
    sim.hold(['left'], 120);
    expect(sim.pod.x).toBeCloseTo(-0.5 + HALF, 5);
  });

  it('builds thrust gradually with the engine curve and announces the engine start once', () => {
    const sim = new Sim(gridFrom(['...', '###']), 1, 0);
    sim.hold(['up'], 1);
    expect(sim.pod.thrust).toBeCloseTo(1 / 60 / 0.25);
    sim.hold(['up'], 14);
    expect(sim.pod.thrust).toBeCloseTo(1);
    expect(sim.events('EngineStarted')).toHaveLength(1);
  });

  it('switches thrust instantly when the engine curve is off', () => {
    const settings = defaultSettings();
    settings.feel.engine.enabled = false;
    const sim = new Sim(gridFrom(['...', '###']), 1, 0, settings);
    sim.hold(['up'], 1);
    expect(sim.pod.thrust).toBe(1);
  });

  it('climbs no faster than the tier 1 engine allows', () => {
    const sim = new Sim(gridFrom(['...', '###']), 1, 0);
    sim.hold(['up'], 60);
    expect(sim.pod.vy).toBe(3);
  });

  it('cannot fly above the closed sky', () => {
    const sim = new Sim(gridFrom(['...', '###'], 12), 1, 0);
    sim.hold(['up'], 600);
    // Row −13 is the first closed row; its bottom edge is at y = 12.5.
    expect(sim.pod.y + HALF).toBeLessThanOrEqual(12.5);
    expect(sim.pod.y + HALF).toBeCloseTo(12.5, 4);
  });

  it('steers sideways in the air', () => {
    const sim = new Sim(gridFrom(['.....', '#####']), 1, 0);
    sim.hold(['up'], 30);
    const x = sim.pod.x;
    sim.hold(['up', 'right'], 20);
    expect(sim.pod.grounded).toBe(false);
    expect(sim.pod.x).toBeGreaterThan(x + 0.3);
  });

  it('lets the engine brake a fall so the landing counts as a short one', () => {
    const sim = new Sim(gridFrom(shaft(30)), 1, 0);
    // Falling at full speed about 7.5 blocks above the floor: brake until slow, then let go.
    sim.until((s) => s.pod.y < -21.5);
    sim.hold(['up'], 1);
    sim.until((s) => s.pod.vy > -3 || s.events('Landed').length > 0);
    sim.hold([], 1);
    sim.until((s) => s.events('Landed').length > 0);
    const landed = sim.events('Landed')[0]?.payload;
    expect(landed?.fallHeight).toBeLessThan(3);
  });
});
