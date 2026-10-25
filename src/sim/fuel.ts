import type { EventBus } from '../core/events';
import { BUILDINGS } from '../data/buildings';
import { FUEL } from '../data/economy';
import type { GameEvents } from './events';
import type { GameState } from './game';
import { colOf, rowOf, type Pod } from './pod';
import type { MotionControls } from './podMotion';
import { startRescue } from './recovery';

/** Litres per second for what the pod does this tick (§3); drilling is billed separately. */
export function fuelRate(pod: Pod, controls: MotionControls): number {
  if (pod.thrust > 0) return FUEL.flyPerSecond;
  if (controls.horizontal !== 0) return FUEL.drivePerSecond;
  return FUEL.idlePerSecond;
}

export function burnFuel(state: GameState, liters: number): void {
  state.fuel = Math.max(0, state.fuel - liters);
}

/** On or above the fuel station: an empty tank there needs no drone, just Pip. */
function atFuelStation(pod: Pod): boolean {
  const station = BUILDINGS.find((building) => building.id === 'fuel');
  const col = colOf(pod.x);
  return !!station && rowOf(pod.y) < 0 && col >= station.firstCol && col <= station.lastCol;
}

/**
 * Fuel warnings at 20 % and 10 % (§3), each announced once on the way down, and the rescue
 * drone when the tank runs dry.
 */
export function checkFuel(state: GameState, events: EventBus<GameEvents>): void {
  const share = state.fuel / state.stats.tankLiters;
  const level = share <= FUEL.criticalShare ? 2 : share <= FUEL.warnShare ? 1 : 0;
  if (level > state.fuelAlert && (level === 1 || level === 2)) {
    events.emit('FuelAlert', { level });
  }
  state.fuelAlert = level;
  if (state.fuel <= 0 && state.status.kind === 'play' && !atFuelStation(state.pod)) {
    startRescue(state, events);
  }
}
