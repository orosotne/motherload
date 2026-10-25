import { describe, expect, it } from 'vitest';
import { cargoUnits, cargoValue, emptyCargo, loseHalfCargo } from '../src/sim/cargo';
import { gridFrom, Sim } from './helpers/sim';

describe('cargo (§3)', () => {
  it('takes ore on board as one unit and announces its value', () => {
    const sim = new Sim(gridFrom(['...', '#1#', '###']), 1, 0);
    sim.hold(['down'], 1).until((s) => s.events('BlockBroken').length > 0);
    expect(sim.state.cargo[1]).toBe(1);
    expect(sim.events('MineralCollected')[0]?.payload).toMatchObject({ mineral: 1, value: 25 });
  });

  it('shatters a mineral without gain when the hold is full', () => {
    const sim = new Sim(gridFrom(['...', '#1#', '###']), 1, 0);
    sim.state.cargo[2] = sim.state.stats.cargoCapacity;
    sim.hold(['down'], 1).until((s) => s.events('BlockBroken').length > 0);
    expect(sim.state.cargo[1]).toBe(0);
    expect(cargoUnits(sim.state.cargo)).toBe(7);
    expect(sim.events('CargoFull')[0]?.payload).toMatchObject({ mineral: 1 });
    expect(sim.events('MineralCollected')).toHaveLength(0);
  });

  it('adds up units and value', () => {
    const cargo = emptyCargo();
    cargo[1] = 2;
    cargo[2] = 1;
    expect(cargoUnits(cargo)).toBe(3);
    expect(cargoValue(cargo)).toBe(110);
  });

  it('loses every second unit in order of value, so about half the worth goes', () => {
    const cargo = emptyCargo();
    cargo[1] = 3;
    cargo[2] = 2;
    cargo[6] = 1;
    // Sorted by value: 1 1 1 2 2 6 → units 2, 4 and 6 of that order go.
    expect(loseHalfCargo(cargo)).toBe(3);
    expect([cargo[1], cargo[2], cargo[6]]).toEqual([2, 1, 0]);
  });
});
