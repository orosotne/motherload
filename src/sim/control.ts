import type { EventBus } from '../core/events';
import type { InputFrame } from '../core/input';
import { Block } from '../data/blocks';
import { ENGINE } from '../data/engine';
import { hardnessAt, startDrill } from './drilling';
import type { GameEvents } from './events';
import { gasAbortSeconds } from './hazards';
import type { GameState, SimSettings } from './game';
import type { DrillDir } from './pod';
import type { MotionControls } from './podMotion';

/** No input: what an unpowered pod gets. */
export const IDLE_CONTROLS: MotionControls = { horizontal: 0, thrusting: false };

const DRILL_DIRS: readonly DrillDir[] = ['down', 'left', 'right'];

export function bufferSeconds(buffer: { enabled: boolean; ms: number }): number {
  return buffer.enabled ? buffer.ms / 1000 : 0;
}

/** Drilling directions the player asks for: held ones first, then presses inside the window. */
function requestedDrills(state: GameState, input: InputFrame, windowSeconds: number): DrillDir[] {
  const requested = DRILL_DIRS.filter(
    (dir) => input.held[dir] || state.time - state.pressedAt[dir] <= windowSeconds + 1e-9,
  );
  return requested.sort((a, b) => {
    const held = Number(input.held[b]) - Number(input.held[a]);
    return held !== 0 ? held : state.pressedAt[b] - state.pressedAt[a];
  });
}

/**
 * Starts drilling if the pod stands on the ground and the player asks for a direction, held or
 * pressed within `windowSeconds` (input and landing buffers, §5.1–5.2). Flying wins over drilling.
 */
export function tryDrill(
  state: GameState,
  input: InputFrame,
  settings: SimSettings,
  events: EventBus<GameEvents>,
  windowSeconds: number,
  carry: number,
): void {
  if (!state.pod.grounded || input.held.up) return;
  for (const dir of requestedDrills(state, input, windowSeconds)) {
    const drill = startDrill(state.pod, state.grid, dir, state.stats, settings.pod.halfSize, carry);
    if (!drill) continue;
    const gas = state.grid.get(drill.col, drill.row) === Block.Gas;
    // However fast the drill, a gas pocket never gives way before the time to let go is over.
    if (gas)
      drill.duration = Math.max(drill.duration, gasAbortSeconds(settings.feel) + 1 / ENGINE.simHz);
    events.emit('DrillStarted', {
      col: drill.col,
      row: drill.row,
      dir,
      seconds: drill.duration,
      hardness: hardnessAt(state.grid, drill.col, drill.row) ?? 0,
    });
    // A gas pocket hisses as the drill bites (§5.11): letting go now stops it.
    if (gas) events.emit('GasHiss', { col: drill.col, row: drill.row });
    return;
  }
}

export function motionControls(state: GameState, input: InputFrame): MotionControls {
  const { left, right, up } = input.held;
  let horizontal: -1 | 0 | 1 = left ? -1 : right ? 1 : 0;
  // Both held: the later press wins.
  if (left && right) horizontal = state.pressedAt.left > state.pressedAt.right ? -1 : 1;
  return { horizontal, thrusting: up };
}
