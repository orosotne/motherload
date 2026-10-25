import { describe, expect, it } from 'vitest';
import { RECOVERY } from '../src/data/economy';
import { cargoUnits } from '../src/sim/cargo';
import { colOf, rowOf } from '../src/sim/pod';
import { fallDamage } from '../src/sim/recovery';
import { gridFrom, Sim } from './helpers/sim';

/** A shaft `depth` rows deep under the surface, 24 wide so the town columns exist. */
function shaft(depth: number): string[] {
  const open = '#'.repeat(3) + '.' + '#'.repeat(20);
  return [...Array<string>(depth).fill(open), '#'.repeat(24)];
}

describe('fall damage (§3, §7)', () => {
  it('is free up to 3 blocks, then 4 HP per further block', () => {
    expect(fallDamage(3)).toBe(0);
    expect(fallDamage(2.6)).toBe(0);
    expect(fallDamage(4.4)).toBe(4);
    expect(fallDamage(5)).toBe(8);
  });

  it('hurts the hull on a hard landing', () => {
    // From the floor of row 0 down to the floor of row 5: a 5-block fall, 2 blocks too many.
    const sim = new Sim(gridFrom(shaft(6)), 3, 0);
    sim.until((s) => s.events('Landed').length > 0);
    expect(sim.events('Landed')[0]?.payload.fallHeight).toBeCloseTo(5, 5);
    expect(sim.events('Damaged')[0]?.payload).toMatchObject({ amount: 8, source: 'fall' });
    expect(sim.state.hull).toBe(30 - 8);
  });
});

describe('destruction (§3)', () => {
  it('replaces a destroyed pod on the surface for 25 % of cash; cargo lost, upgrades kept', () => {
    const sim = new Sim(gridFrom(shaft(6)), 3, 0);
    sim.state.cash = 1000;
    sim.state.cargo[3] = 2;
    sim.state.tiers.drill = 2;
    sim.state.hull = 5;
    sim.until((s) => s.events('Destroyed').length > 0);
    expect(sim.state.status.kind).toBe('respawn');

    sim.hold([], Math.ceil(RECOVERY.respawnSeconds * 60) + 1);
    expect(sim.events('Respawned')[0]?.payload).toEqual({ fee: 250, lostUnits: 2 });
    expect(sim.state.cash).toBe(750);
    expect(cargoUnits(sim.state.cargo)).toBe(0);
    expect(sim.state.hull).toBe(sim.state.stats.maxHull);
    expect(sim.state.fuel).toBe(sim.state.stats.tankLiters);
    expect(sim.state.tiers.drill).toBe(2);
    expect([colOf(sim.pod.x), rowOf(sim.pod.y)]).toEqual([20, -1]);
  });
});
