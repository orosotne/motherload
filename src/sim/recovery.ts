import type { EventBus } from '../core/events';
import { ECONOMY, FALL, RECOVERY } from '../data/economy';
import { WORLD } from '../data/world';
import { buildingColumns, columnsByDistance, landingColumn } from './buildings';
import { loseAllCargo, loseHalfCargo } from './cargo';
import type { DamageSource, GameEvents } from './events';
import type { GameState } from './game';
import { autoUse } from './items';
import { createPod } from './pod';

/**
 * Fall damage (§3, §7): free up to `safeBlocks` (3, or 0 with forgiveness off, §5.11), then
 * 4 HP per further block.
 */
export function fallDamage(fallHeight: number, safeBlocks: number = FALL.safeBlocks): number {
  return FALL.hpPerBlock * Math.max(0, Math.round(fallHeight) - safeBlocks);
}

/** Back on the surface after a rescue or a new pod: no heat, no pending damage. */
function cooledDown(state: GameState): void {
  state.heat = 0;
  state.heatLevel = 0;
  state.damageCarry = 0;
  state.inLava = false;
}

function freeze(state: GameState): void {
  const { pod } = state;
  if (pod.drill) {
    // The block stays; the pod slides back out of it.
    pod.x = pod.drill.fromX;
    pod.y = pod.drill.fromY;
    pod.drill = null;
  }
  pod.vx = 0;
  pod.vy = 0;
  pod.thrust = 0;
}

/** Hull damage; at 0 HP the pod is destroyed (§3). */
export function damage(
  state: GameState,
  amount: number,
  source: DamageSource,
  events: EventBus<GameEvents>,
): void {
  if (amount <= 0 || state.status.kind !== 'play') return;
  state.hull = Math.max(0, state.hull - amount);
  events.emit('Damaged', { amount, source, hull: state.hull });
  if (state.hull > 0 || autoUse(state, 'repairKit', events)) return;
  freeze(state);
  state.status = { kind: 'respawn', left: RECOVERY.respawnSeconds };
  events.emit('Destroyed', { cause: source });
}

/** Empty tank: the pod stops and the rescue drone comes for it (§3). */
export function startRescue(state: GameState, events: EventBus<GameEvents>): void {
  freeze(state);
  state.status = { kind: 'rescue', left: RECOVERY.rescueSeconds };
  events.emit('RescueStarted', {});
}

/** Counts down a rescue or respawn and finishes it on the surface. */
export function stepRecovery(
  state: GameState,
  dt: number,
  halfSize: number,
  events: EventBus<GameEvents>,
): void {
  const { status } = state;
  if (status.kind === 'play') return;
  status.left -= dt;
  if (status.left > 0) return;

  if (status.kind === 'rescue') {
    // Towed to Pip's fuel station: 15 % of the cash and half the cargo (§3).
    const fee = Math.round(state.cash * ECONOMY.rescueFeeShare);
    state.cash -= fee;
    const lostUnits = loseHalfCargo(state.cargo);
    state.pod = createPod(landingColumn(state.grid, buildingColumns('fuel')), -1, halfSize);
    state.status = { kind: 'play' };
    cooledDown(state);
    events.emit('Rescued', { fee, lostUnits });
    return;
  }

  // Destroyed: a new pod on the surface for 25 % of the cash; cargo lost, upgrades kept (§3).
  const fee = Math.round(state.cash * ECONOMY.destroyFeeShare);
  state.cash -= fee;
  const lostUnits = loseAllCargo(state.cargo);
  state.hull = state.stats.maxHull;
  state.fuel = state.stats.tankLiters;
  const columns = columnsByDistance(WORLD.spawnCol, 0, state.grid.width - 1);
  state.pod = createPod(landingColumn(state.grid, columns), -1, halfSize);
  state.status = { kind: 'play' };
  cooledDown(state);
  events.emit('Respawned', { fee, lostUnits });
}
