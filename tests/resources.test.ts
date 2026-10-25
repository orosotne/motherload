import { describe, expect, it } from 'vitest';
import { RECOVERY } from '../src/data/economy';
import { cargoUnits } from '../src/sim/cargo';
import { colOf, createPod, rowOf } from '../src/sim/pod';
import { gridFrom, Sim } from './helpers/sim';

const WIDE = '.'.repeat(24);
const GROUND = '#'.repeat(24);

function burned(sim: Sim, run: (sim: Sim) => void): number {
  const before = sim.state.fuel;
  run(sim);
  return before - sim.state.fuel;
}

describe('fuel (§3)', () => {
  it('burns 0.01 l/s idle, 0.04 driving, 0.12 flying and 0.08 drilling', () => {
    expect(burned(new Sim(gridFrom([WIDE, GROUND]), 2, 0), (s) => s.hold([], 60))).toBeCloseTo(
      0.01,
      6,
    );
    expect(
      burned(new Sim(gridFrom([WIDE, GROUND]), 2, 0), (s) => s.hold(['right'], 60)),
    ).toBeCloseTo(0.04, 6);
    expect(burned(new Sim(gridFrom([WIDE, GROUND]), 2, 0), (s) => s.hold(['up'], 60))).toBeCloseTo(
      0.12,
      6,
    );
    // One tick to start (idle), then 36 ticks of drilling.
    const drilling = burned(new Sim(gridFrom(['...', '###', '###']), 1, 0), (s) =>
      s.hold(['down'], 37),
    );
    expect(drilling).toBeCloseTo(0.01 / 60 + 0.6 * 0.08, 6);
  });

  it('warns once below 20 % and once more below 10 %', () => {
    const sim = new Sim(gridFrom([WIDE, GROUND]), 2, 0);
    sim.state.fuel = sim.state.stats.tankLiters * 0.21;
    sim.hold(['up'], 1).until((s) => s.state.fuel < s.state.stats.tankLiters * 0.09, 5000);
    expect(sim.events('FuelAlert').map((entry) => entry.payload.level)).toEqual([1, 2]);
  });

  it('stops an empty pod and sends the drone: towed to Pip for 15 % of cash and half the cargo', () => {
    // Standing on the surface (row 0) away from the station, drilling down on a few drops.
    const sim = new Sim(gridFrom([GROUND, GROUND]), 3, -1);
    sim.state.cash = 1000;
    sim.state.cargo[1] = 4;
    sim.state.cargo[2] = 1;
    sim.state.fuel = 0.01;
    sim.hold(['down'], 30);
    expect(sim.events('RescueStarted')).toHaveLength(1);
    expect(sim.events('BlockBroken')).toHaveLength(0);
    expect(sim.state.status.kind).toBe('rescue');

    sim.hold([], Math.ceil(RECOVERY.rescueSeconds * 60) + 1);
    expect(sim.events('Rescued')[0]?.payload).toEqual({ fee: 150, lostUnits: 2 });
    expect(sim.state.cash).toBe(850);
    expect(cargoUnits(sim.state.cargo)).toBe(3);
    expect([colOf(sim.pod.x), rowOf(sim.pod.y)]).toEqual([15, -1]);
    expect(sim.state.status.kind).toBe('play');
  });

  it('needs no drone when the tank runs dry at the fuel station', () => {
    const sim = new Sim(gridFrom([GROUND]), 15, -1);
    sim.state.fuel = 0.001;
    sim.hold([], 120);
    expect(sim.state.fuel).toBe(0);
    expect(sim.events('RescueStarted')).toHaveLength(0);
  });

  it('cannot move without fuel', () => {
    const sim = new Sim(gridFrom([GROUND]), 15, -1);
    sim.state.fuel = 0;
    const x = sim.pod.x;
    sim.hold(['right', 'up'], 60);
    expect(sim.pod.x).toBe(x);
    expect(sim.pod.thrust).toBe(0);
  });
});

describe('zones', () => {
  it('announces entering a new zone', () => {
    const sim = new Sim(gridFrom(Array<string>(60).fill('###')), 1, 0);
    sim.state.pod = createPod(1, 50, 0.4);
    sim.hold([], 1);
    expect(sim.events('ZoneEntered')[0]?.payload).toEqual({ zone: 2 });
  });
});
