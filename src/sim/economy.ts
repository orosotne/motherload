import type { EventBus } from '../core/events';
import { ECONOMY } from '../data/economy';
import { cargoUnits, cargoValue } from './cargo';
import type { GameEvents } from './events';
import type { GameState } from './game';

/** Services on the surface (GAME_SPEC §6): selling, fuel and repairs. Cash is whole dollars. */

export function sellAll(
  state: GameState,
  events: EventBus<GameEvents>,
): { units: number; value: number } {
  const units = cargoUnits(state.cargo);
  const value = Math.round(cargoValue(state.cargo) * ECONOMY.sellShare);
  if (units === 0) return { units, value: 0 };
  state.cash += value;
  state.cargo.fill(0);
  events.emit('Sold', { units, value });
  return { units, value };
}

/** Litres missing to a full tank and what they cost. */
export function refuelQuote(state: GameState): { liters: number; cost: number } {
  const liters = Math.max(state.stats.tankLiters - state.fuel, 0);
  return { liters, cost: Math.ceil(liters * ECONOMY.fuelPricePerLiter) };
}

/**
 * Fills the tank as far as the cash goes. A pilot who cannot even pay for the emergency amount
 * gets it from Pip for free, so a run can always start (pillar 4).
 */
export function refuel(
  state: GameState,
  events: EventBus<GameEvents>,
): { liters: number; cost: number; free: boolean } {
  const quote = refuelQuote(state);
  if (quote.liters <= 0) return { liters: 0, cost: 0, free: false };
  const price = ECONOMY.fuelPricePerLiter;
  const emergency = Math.min(ECONOMY.emergencyFuelLiters, state.stats.tankLiters);
  const affordable = Math.min(quote.liters, state.cash / price);

  let result: { liters: number; cost: number; free: boolean };
  if (state.fuel + affordable < emergency) {
    result = { liters: emergency - state.fuel, cost: 0, free: true };
  } else {
    const liters = affordable;
    result = { liters, cost: Math.min(Math.ceil(liters * price), state.cash), free: false };
  }
  state.fuel += result.liters;
  state.cash -= result.cost;
  events.emit('Refueled', result);
  return result;
}

export function repairQuote(state: GameState): { hp: number; cost: number } {
  const hp = Math.max(state.stats.maxHull - state.hull, 0);
  return { hp, cost: hp * ECONOMY.repairPricePerHp };
}

/** Repairs as many hull points as the cash pays for (§6: $10 per HP). */
export function repair(
  state: GameState,
  events: EventBus<GameEvents>,
): { hp: number; cost: number } {
  const missing = repairQuote(state).hp;
  const hp = Math.min(missing, Math.floor(state.cash / ECONOMY.repairPricePerHp));
  if (hp <= 0) return { hp: 0, cost: 0 };
  const cost = hp * ECONOMY.repairPricePerHp;
  state.hull += hp;
  state.cash -= cost;
  events.emit('Repaired', { hp, cost });
  return { hp, cost };
}
