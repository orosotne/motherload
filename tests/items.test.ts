import { describe, expect, it } from 'vitest';
import { Block } from '../src/data/blocks';
import { buildingCenter } from '../src/sim/buildings';
import { buyItem, useSlot } from '../src/sim/items';
import { createPod, rowOf } from '../src/sim/pod';
import { gridFrom, Sim } from './helpers/sim';

/** A small world: surface row 0, everything below drillable dirt. */
function world(rows = 12, width = 30): Sim {
  return new Sim(gridFrom(Array<string>(rows).fill('#'.repeat(width))), 20, 5);
}

describe('supply depot (§6)', () => {
  it('sells items into five slots for cash', () => {
    const sim = world();
    sim.state.cash = 10_000;
    for (let i = 0; i < 5; i++) expect(buyItem(sim.state, 'fuelCell', sim.bus)).toBe(true);
    expect(buyItem(sim.state, 'fuelCell', sim.bus)).toBe(false);
    expect(sim.state.cash).toBe(10_000 - 5 * 300);
    sim.state.slots[2] = null;
    sim.state.cash = 100;
    expect(buyItem(sim.state, 'repairKit', sim.bus)).toBe(false);
  });

  it('fuel cell adds 15 l up to the tank size, never into a full tank', () => {
    const sim = world();
    sim.state.slots[0] = { item: 'fuelCell', anchor: null };
    sim.tap('use');
    expect(sim.events('ItemRefused')[0]?.payload.reason).toBe('tankFull');
    sim.state.fuel = 2;
    sim.tap('use');
    expect(sim.state.fuel).toBeCloseTo(12, 1);
    expect(sim.state.slots[0]).toBeNull();
  });

  it('repair kit adds 40 HP up to the hull size', () => {
    const sim = world();
    sim.state.slots[3] = { item: 'repairKit', anchor: null };
    sim.state.hull = 5;
    sim.tap('slot4').tap('use');
    expect(sim.state.hull).toBe(30);
    expect(sim.events('ItemUsed')[0]?.payload).toEqual({ item: 'repairKit', slot: 3, auto: false });
  });

  it('charges clear 3 × 3 or 5 × 5 around the pod, minerals lost, relics and corestone kept', () => {
    const sim = world();
    const { grid } = sim.state;
    grid.set(19, 4, Block.Ore, 2);
    grid.set(21, 6, Block.Relic);
    grid.set(20, 6, Block.Corestone);
    sim.state.pod = createPod(20, 5, 0.4);
    sim.state.slots[0] = { item: 'charge', anchor: null };
    sim.tap('use');
    expect(grid.get(19, 4)).toBe(Block.Empty);
    expect(grid.mineral(19, 4)).toBe(0);
    expect(grid.get(21, 6)).toBe(Block.Relic);
    expect(grid.get(20, 6)).toBe(Block.Corestone);
    expect(grid.get(22, 5)).toBe(Block.Dirt);
    expect(sim.events('Explosion')[0]?.payload).toEqual({
      col: 20,
      row: 5,
      radius: 1,
      source: 'charge',
    });
    expect(sim.state.hull).toBe(30);

    sim.state.slots[0] = { item: 'megaCharge', anchor: null };
    sim.state.pod = createPod(10, 5, 0.4);
    sim.tap('use');
    expect(grid.get(8, 3)).toBe(Block.Empty);
    expect(grid.get(12, 7)).toBe(Block.Empty);
    expect(grid.get(13, 5)).toBe(Block.Dirt);
  });

  it('charges and beacons do nothing on the surface', () => {
    const sim = world();
    sim.state.pod = createPod(20, -1, 0.4);
    sim.state.slots[0] = { item: 'charge', anchor: null };
    sim.state.slots[1] = { item: 'beacon', anchor: null };
    useSlot(sim.state, 0, 0.4, sim.bus);
    useSlot(sim.state, 1, 0.4, sim.bus);
    expect(sim.events('ItemRefused').map((entry) => entry.payload.reason)).toEqual([
      'surface',
      'surface',
    ]);
    expect(sim.state.grid.get(20, 0)).toBe(Block.Dirt);
  });

  it('the beacon brings the pod with its cargo straight to Mira', () => {
    const sim = world();
    sim.state.cargo[3] = 2;
    sim.state.slots[0] = { item: 'beacon', anchor: null };
    sim.tap('use');
    expect(sim.state.pod.x).toBe(buildingCenter('buyer'));
    expect(rowOf(sim.state.pod.y)).toBe(-1);
    expect(sim.state.cargo[3]).toBe(2);
    expect(sim.events('Teleported')[0]?.payload.cause).toBe('beacon');
  });

  it('the anchor is set underground and later takes the pod back down once', () => {
    const sim = world();
    sim.state.slots[0] = { item: 'anchor', anchor: null };
    sim.state.pod = createPod(20, -1, 0.4);
    sim.tap('use');
    expect(sim.events('ItemRefused')[0]?.payload.reason).toBe('noAnchor');

    sim.state.grid.set(7, 9, Block.Empty);
    sim.state.pod = createPod(7, 9, 0.4);
    sim.tap('use');
    expect(sim.state.slots[0]).toEqual({ item: 'anchor', anchor: { col: 7, row: 9 } });

    sim.state.pod = createPod(20, -1, 0.4);
    sim.tap('use');
    expect([sim.state.pod.x, rowOf(sim.state.pod.y)]).toEqual([7, 9]);
    expect(sim.state.slots[0]).toBeNull();
  });

  it('uses the first filled slot when the selected one is empty', () => {
    const sim = world();
    sim.state.slots[2] = { item: 'repairKit', anchor: null };
    sim.state.hull = 1;
    sim.tap('use');
    expect(sim.state.hull).toBe(30);
  });

  it('on an empty tank a fuel cell on board fills it instead of calling the drone', () => {
    const sim = world();
    sim.state.slots[1] = { item: 'fuelCell', anchor: null };
    sim.state.fuel = 0.0001;
    sim.hold([], 3);
    expect(sim.state.status.kind).toBe('play');
    expect(sim.state.fuel).toBeGreaterThan(11.9);
    expect(sim.events('ItemUsed')[0]?.payload).toEqual({ item: 'fuelCell', slot: 1, auto: true });
  });

  it('at 0 HP a repair kit on board saves the pod', () => {
    const sim = world(20);
    sim.state.slots[4] = { item: 'repairKit', anchor: null };
    sim.state.hull = 4;
    sim.state.grid.set(20, 6, Block.Empty);
    for (let row = 6; row < 15; row++) sim.state.grid.set(20, row, Block.Empty);
    sim.until((s) => s.events('Landed').length > 0, 300);
    expect(sim.state.status.kind).toBe('play');
    expect(sim.state.hull).toBe(30);
    expect(sim.events('Destroyed')).toEqual([]);
  });
});
