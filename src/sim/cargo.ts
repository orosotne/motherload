import type { EventBus } from '../core/events';
import { MAX_MINERAL_ID, mineralById } from '../data/minerals';
import type { GameEvents } from './events';

/** Units per mineral id; index 0 stays empty. */
export type Cargo = number[];

export function emptyCargo(): Cargo {
  return new Array<number>(MAX_MINERAL_ID + 1).fill(0);
}

export function cargoUnits(cargo: readonly number[]): number {
  return cargo.reduce((sum, units) => sum + units, 0);
}

export function cargoValue(cargo: readonly number[]): number {
  return cargo.reduce((sum, units, id) => sum + units * (mineralById(id)?.value ?? 0), 0);
}

/**
 * Takes a mineral on board if there is room; with a full hold it shatters without gain (§3).
 * Every mineral is one unit.
 */
export function collectMineral(
  cargo: Cargo,
  capacity: number,
  mineral: number,
  where: { col: number; row: number },
  events: EventBus<GameEvents>,
): void {
  const config = mineralById(mineral);
  if (!config) return;
  if (cargoUnits(cargo) >= capacity) {
    events.emit('CargoFull', { mineral, ...where });
    return;
  }
  cargo[mineral] = (cargo[mineral] ?? 0) + 1;
  events.emit('MineralCollected', { mineral, value: config.value, ...where });
}

/**
 * Throws away half the units, every second one in order of value, so roughly half the cargo's
 * worth is lost (§3 rescue). Returns how many units went.
 */
export function loseHalfCargo(cargo: Cargo): number {
  const units: number[] = [];
  cargo.forEach((count, id) => {
    for (let i = 0; i < count; i++) units.push(id);
  });
  units.sort((a, b) => (mineralById(a)?.value ?? 0) - (mineralById(b)?.value ?? 0));
  let lost = 0;
  for (let i = 1; i < units.length; i += 2) {
    const id = units[i] ?? 0;
    cargo[id] = (cargo[id] ?? 0) - 1;
    lost++;
  }
  return lost;
}

/** Empties the hold; returns how many units were in it. */
export function loseAllCargo(cargo: Cargo): number {
  const lost = cargoUnits(cargo);
  cargo.fill(0);
  return lost;
}
