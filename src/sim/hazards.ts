import type { EventBus } from '../core/events';
import type { InputFrame } from '../core/input';
import { Block, isSolid } from '../data/blocks';
import type { FeelConfig } from '../data/feel';
import { GAS, gasDamage, HEAT, LAVA } from '../data/hazards';
import { zoneAt } from '../data/zones';
import { blast } from './blast';
import { depthMeters } from './buildings';
import type { DamageSource, GameEvents } from './events';
import type { GameState } from './game';
import { colOf, rowOf } from './pod';
import { damage } from './recovery';

/** Hazards (GAME_SPEC §7): gas pockets, lava and heat. */

/** Seconds after a gas pocket starts hissing in which letting go stops the drilling (§5.11). */
export function gasAbortSeconds(feel: FeelConfig): number {
  return feel.forgiveness.enabled ? feel.forgiveness.gasAbortMs / 1000 : 0;
}

/**
 * Stops the drilling of a gas pocket when the player lets go of the direction in time. The pod
 * slides back to where it started. Returns true when it stopped.
 */
export function abortGasDrill(
  state: GameState,
  input: InputFrame,
  feel: FeelConfig,
  events: EventBus<GameEvents>,
): boolean {
  const { pod, grid } = state;
  const drill = pod.drill;
  if (!drill || grid.get(drill.col, drill.row) !== Block.Gas) return false;
  if (input.held[drill.dir] || drill.elapsed >= gasAbortSeconds(feel)) return false;
  pod.x = drill.fromX;
  pod.y = drill.fromY;
  pod.drill = null;
  // The press that started it must not start it again through the input buffer.
  state.pressedAt[drill.dir] = -Infinity;
  events.emit('DrillAborted', { col: drill.col, row: drill.row });
  return true;
}

/** A gas pocket drilled through explodes 3 × 3 around itself and hurts the pod (§7). */
export function explodeGas(
  state: GameState,
  col: number,
  row: number,
  events: EventBus<GameEvents>,
): void {
  const { grid, pod } = state;
  blast(grid, col, row, GAS.blastRadius);
  events.emit('Explosion', { col, row, radius: GAS.blastRadius, source: 'gas' });
  const podCol = colOf(pod.x);
  const podRow = rowOf(pod.y);
  if (Math.abs(podCol - col) > GAS.blastRadius || Math.abs(podRow - row) > GAS.blastRadius) return;
  // The blast may have taken the floor away.
  pod.grounded = pod.grounded && isSolid(grid.get(podCol, podRow + 1));
  damage(state, gasDamage(zoneAt(row).index), 'gas', events);
}

/** Damage per second, taken in whole hull points as it adds up. */
function hurtOverTime(
  state: GameState,
  hpPerSecond: number,
  dt: number,
  source: DamageSource,
  events: EventBus<GameEvents>,
): void {
  state.damageCarry += hpPerSecond * dt;
  const whole = Math.floor(state.damageCarry);
  if (whole <= 0) return;
  state.damageCarry -= whole;
  damage(state, whole, source, events);
}

/** True when the pod's box overlaps a lava cell. */
export function touchingLava(state: GameState, half: number): boolean {
  const { pod, grid } = state;
  const edge = 1e-6;
  for (let row = rowOf(pod.y + half - edge); row <= rowOf(pod.y - half + edge); row++) {
    for (let col = colOf(pod.x - half + edge); col <= colOf(pod.x + half - edge); col++) {
      if (grid.get(col, row) === Block.Lava) return true;
    }
  }
  return false;
}

/**
 * Lava costs 10 HP per second while touched (§7). The pod sinks slowly through it, and lava
 * breaks a fall, so there is time to fly out.
 */
export function stepLava(
  state: GameState,
  half: number,
  dt: number,
  events: EventBus<GameEvents>,
): void {
  const inLava = touchingLava(state, half);
  if (inLava && !state.inLava) events.emit('LavaContact', {});
  state.inLava = inLava;
  if (!inLava) return;
  const { pod } = state;
  pod.vy = Math.max(pod.vy, -LAVA.sinkSpeed);
  pod.fallTopY = pod.y;
  hurtOverTime(state, LAVA.damagePerSecond, dt, 'lava', events);
}

/**
 * Below the cooling limit the overheat meter fills, faster the deeper; full, it costs 2 HP per
 * second (§3). Above the limit it cools down.
 */
export function stepHeat(state: GameState, dt: number, events: EventBus<GameEvents>): void {
  const excess = depthMeters(state.pod) - state.stats.safeDepthMeters;
  const change =
    excess > 0 ? (HEAT.fillPerSecond + HEAT.fillPerMeter * excess) * dt : -HEAT.coolPerSecond * dt;
  state.heat = Math.min(Math.max(state.heat + change, 0), 1);
  const level = state.heat >= 1 ? 2 : state.heat >= HEAT.warnLevel ? 1 : 0;
  if (level > state.heatLevel && (level === 1 || level === 2)) {
    events.emit('Overheat', { level });
  }
  state.heatLevel = level;
  if (state.heat >= 1) hurtOverTime(state, HEAT.damagePerSecond, dt, 'heat', events);
}
