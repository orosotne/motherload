import type { EventBus } from '../core/events';
import type { InputFrame } from '../core/input';
import { Block } from '../data/blocks';
import { ACTIONS, type Action } from '../data/controls';
import { ECONOMY, FUEL } from '../data/economy';
import { FEEL, type FeelConfig } from '../data/feel';
import { POD, type PodConfig } from '../data/pod';
import { WORLD } from '../data/world';
import { zoneAt } from '../data/zones';
import type { Grid } from '../world/grid';
import { collectMineral, emptyCargo, type Cargo } from './cargo';
import { bufferSeconds, IDLE_CONTROLS, motionControls, tryDrill } from './control';
import { advanceDrill } from './drilling';
import type { GameEvents } from './events';
import { burnFuel, checkFuel, fuelRate } from './fuel';
import { createPod, rowOf, type Pod } from './pod';
import { stepMotion } from './podMotion';
import { damage, fallDamage, stepRecovery } from './recovery';
import { startTiers, statsFor, type PodStats, type Tiers } from './stats';

/** Tunable copies of the data configs; the debug panel edits these. */
export interface SimSettings {
  pod: PodConfig;
  feel: FeelConfig;
}

export function defaultSettings(): SimSettings {
  return { pod: { ...POD }, feel: structuredClone(FEEL) };
}

export type GameStatus =
  | { kind: 'play' }
  /** The rescue drone is on its way; `left` seconds until the pod is at the surface. */
  | { kind: 'rescue'; left: number }
  /** The pod was destroyed; a new one appears on the surface in `left` seconds. */
  | { kind: 'respawn'; left: number };

export interface GameState {
  /** Simulated seconds since the start. */
  time: number;
  seed: number;
  grid: Grid;
  pod: Pod;
  tiers: Tiers;
  stats: PodStats;
  cash: number;
  fuel: number;
  hull: number;
  cargo: Cargo;
  status: GameStatus;
  /** Last fuel warning given: 0 none, 1 below 20 %, 2 below 10 %. */
  fuelAlert: 0 | 1 | 2;
  /** Zone the pod is in, 1 to 5; the surface counts as zone 1. */
  zone: number;
  /** Simulation time of each action's latest press, for the input and landing buffers (§5). */
  pressedAt: Record<Action, number>;
}

export function createGame(grid: Grid, settings: SimSettings, seed = 0): GameState {
  const pressedAt = {} as Record<Action, number>;
  for (const action of ACTIONS) pressedAt[action] = -Infinity;
  const tiers = startTiers();
  const stats = statsFor(tiers);
  return {
    time: 0,
    seed,
    grid,
    pod: createPod(WORLD.spawnCol, -1, settings.pod.halfSize),
    tiers,
    stats,
    cash: ECONOMY.startCash,
    fuel: stats.tankLiters,
    hull: stats.maxHull,
    cargo: emptyCargo(),
    status: { kind: 'play' },
    fuelAlert: 0,
    zone: 1,
    pressedAt,
  };
}

function trackZone(state: GameState, events: EventBus<GameEvents>): void {
  const row = rowOf(state.pod.y);
  const zone = row < 0 ? 1 : zoneAt(row).index;
  if (zone === state.zone) return;
  state.zone = zone;
  events.emit('ZoneEntered', { zone });
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

  if (state.status.kind !== 'play') {
    stepRecovery(state, dt, settings.pod.halfSize, events);
    return;
  }

  const powered = state.fuel > 0;
  if (pod.drill) {
    burnFuel(state, FUEL.drillPerSecond * dt);
    const broken = advanceDrill(pod, state.grid, dt);
    if (broken) {
      const { col, row, block, mineral } = broken;
      events.emit('BlockBroken', { col, row, block, mineral });
      if (block === Block.Ore) {
        collectMineral(state.cargo, state.stats.cargoCapacity, mineral, { col, row }, events);
      }
      // Input buffer (§5.1): what was pressed shortly before the block gave way runs right now.
      const window = bufferSeconds(settings.feel.inputBuffer);
      if (state.fuel > 0) tryDrill(state, input, settings, events, window, broken.overflow);
    }
  } else {
    const controls = powered ? motionControls(state, input) : IDLE_CONTROLS;
    const motion = stepMotion(
      pod,
      state.grid,
      controls,
      dt,
      settings.pod,
      state.stats,
      settings.feel,
    );
    burnFuel(state, fuelRate(pod, controls) * dt);
    if (motion.engineStarted) events.emit('EngineStarted', {});
    if (motion.landingSpeed !== null) {
      events.emit('Landed', { speed: motion.landingSpeed, fallHeight: motion.fallHeight });
      damage(state, fallDamage(motion.fallHeight), 'fall', events);
    }
    if (powered && state.status.kind === 'play') {
      // Landing buffer (§5.2): a drilling direction pressed shortly before touchdown.
      const window = motion.landingSpeed !== null ? bufferSeconds(settings.feel.landingBuffer) : 0;
      tryDrill(state, input, settings, events, window, 0);
    }
  }

  trackZone(state, events);
  checkFuel(state, events);
}
