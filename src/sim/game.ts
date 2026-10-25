import type { EventBus } from '../core/events';
import type { InputFrame } from '../core/input';
import { ACTIONS, type Action } from '../data/controls';
import { FEEL, type FeelConfig } from '../data/feel';
import { POD, type PodConfig } from '../data/pod';
import { WORLD } from '../data/world';
import type { Grid } from '../world/grid';
import { advanceDrill, hardnessAt, startDrill } from './drilling';
import type { GameEvents } from './events';
import { createPod, type DrillDir, type Pod } from './pod';
import { stepMotion, type MotionControls } from './podMotion';
import { startTiers, statsFor, type PodStats } from './stats';

/** Tunable copies of the data configs; the debug panel edits these. */
export interface SimSettings {
  pod: PodConfig;
  feel: FeelConfig;
}

export function defaultSettings(): SimSettings {
  return { pod: { ...POD }, feel: structuredClone(FEEL) };
}

export interface GameState {
  /** Simulated seconds since the start. */
  time: number;
  grid: Grid;
  pod: Pod;
  stats: PodStats;
  /** Simulation time of each action's latest press, for the input and landing buffers (§5). */
  pressedAt: Record<Action, number>;
}

export function createGame(grid: Grid, settings: SimSettings): GameState {
  const pressedAt = {} as Record<Action, number>;
  for (const action of ACTIONS) pressedAt[action] = -Infinity;
  return {
    time: 0,
    grid,
    pod: createPod(WORLD.spawnCol, -1, settings.pod.halfSize),
    stats: statsFor(startTiers()),
    pressedAt,
  };
}

const DRILL_DIRS: readonly DrillDir[] = ['down', 'left', 'right'];

function bufferSeconds(buffer: { enabled: boolean; ms: number }): number {
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

function tryDrill(
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
    const hardness = hardnessAt(state.grid, drill.col, drill.row) ?? 0;
    events.emit('DrillStarted', {
      col: drill.col,
      row: drill.row,
      dir,
      seconds: drill.duration,
      hardness,
    });
    return;
  }
}

function motionControls(state: GameState, input: InputFrame): MotionControls {
  const { left, right, up } = input.held;
  let horizontal: -1 | 0 | 1 = left ? -1 : right ? 1 : 0;
  // Both held: the later press wins.
  if (left && right) horizontal = state.pressedAt.left > state.pressedAt.right ? -1 : 1;
  return { horizontal, thrusting: up };
}

/** One fixed simulation step (GAME_SPEC §3, §9.1). */
export function stepGame(
  state: GameState,
  input: InputFrame,
  dt: number,
  settings: SimSettings,
  events: EventBus<GameEvents>,
): void {
  state.time += dt;
  for (const action of ACTIONS) if (input.pressed[action]) state.pressedAt[action] = state.time;
  const { pod } = state;
  pod.prevX = pod.x;
  pod.prevY = pod.y;

  if (pod.drill) {
    const broken = advanceDrill(pod, state.grid, dt);
    if (!broken) return;
    events.emit('BlockBroken', {
      col: broken.col,
      row: broken.row,
      block: broken.block,
      mineral: broken.mineral,
    });
    // Input buffer (§5.1): what was pressed shortly before the block gave way runs right now.
    tryDrill(
      state,
      input,
      settings,
      events,
      bufferSeconds(settings.feel.inputBuffer),
      broken.overflow,
    );
    return;
  }

  const motion = stepMotion(
    pod,
    state.grid,
    motionControls(state, input),
    dt,
    settings.pod,
    state.stats,
    settings.feel,
  );
  if (motion.engineStarted) events.emit('EngineStarted', {});
  if (motion.landingSpeed !== null) {
    events.emit('Landed', { speed: motion.landingSpeed, fallHeight: motion.fallHeight });
  }
  // Landing buffer (§5.2): a drilling direction pressed shortly before touchdown runs on landing.
  const window = motion.landingSpeed !== null ? bufferSeconds(settings.feel.landingBuffer) : 0;
  tryDrill(state, input, settings, events, window, 0);
}
