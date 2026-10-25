import type { BlockId } from '../data/blocks';
import { POD } from '../data/pod';
import { WORLD } from '../data/world';
import { emptyCargo } from '../sim/cargo';
import { createGame, type GameState, type SimSettings } from '../sim/game';
import { createPod, restY } from '../sim/pod';
import { statsFor } from '../sim/stats';
import { generateWorld, WORLD_VERSION } from '../world/generator';
import type { Grid } from '../world/grid';
import { SCHEMA_VERSION, type SaveData } from './schema';

/** The world as generated, to compare against when saving. */
export type WorldBaseline = ReturnType<Grid['snapshot']>;

/**
 * A snapshot of the game for storage. A pod caught mid-drill is saved where the drilling began,
 * so it never loads half inside a block.
 */
export function serialize(state: GameState, baseline: WorldBaseline, now = new Date()): SaveData {
  const { pod } = state;
  return {
    schemaVersion: SCHEMA_VERSION,
    worldVersion: WORLD_VERSION,
    savedAt: now.toISOString(),
    seed: state.seed,
    time: state.time,
    pod: {
      x: pod.drill ? pod.drill.fromX : pod.x,
      y: pod.drill ? pod.drill.fromY : pod.y,
      facing: pod.facing,
    },
    cash: state.cash,
    fuel: state.fuel,
    hull: state.hull,
    cargo: [...state.cargo],
    tiers: { ...state.tiers },
    slots: state.slots.map((slot) =>
      slot ? { item: slot.item, anchor: slot.anchor ? { ...slot.anchor } : null } : null,
    ),
    selectedSlot: state.selectedSlot,
    heat: state.heat,
    relics: [...state.relics],
    deepestZone: state.deepestZone,
    world: state.grid.diff(baseline),
  };
}

/** A new game from a seed, with the baseline its saves are compared against. */
export function newGame(
  seed: number,
  settings: SimSettings,
): { state: GameState; baseline: WorldBaseline } {
  const grid = generateWorld(seed);
  return { state: createGame(grid, settings, seed), baseline: grid.snapshot() };
}

/** Rebuilds a game from a (migrated, validated) save: the seed's world plus the changes. */
export function restore(
  data: SaveData,
  settings: SimSettings,
): { state: GameState; baseline: WorldBaseline } {
  const { state, baseline } = newGame(data.seed, settings);
  const { grid } = state;
  for (let i = 0; i + 2 < data.world.length; i += 3) {
    const index = data.world[i] ?? 0;
    const col = index % grid.width;
    const row = (index - col) / grid.width;
    grid.set(col, row, (data.world[i + 1] ?? 0) as BlockId, data.world[i + 2] ?? 0);
  }
  state.time = data.time;
  state.tiers = { ...data.tiers };
  state.stats = statsFor(state.tiers);
  state.cash = data.cash;
  state.fuel = Math.min(data.fuel, state.stats.tankLiters);
  state.hull = Math.min(data.hull, state.stats.maxHull);
  state.cargo = emptyCargo().map((_, id) => data.cargo[id] ?? 0);
  state.slots = data.slots.map((slot) =>
    slot ? { item: slot.item, anchor: slot.anchor ? { ...slot.anchor } : null } : null,
  );
  state.selectedSlot = data.selectedSlot;
  state.heat = data.heat;
  state.relics = state.relics.map((_, index) => data.relics[index] === true);
  state.deepestZone = data.deepestZone;
  const pod = createPod(0, 0, settings.pod.halfSize);
  pod.x = data.pod.x;
  pod.y = data.pod.y;
  pod.prevX = pod.x;
  pod.prevY = pod.y;
  pod.facing = data.pod.facing;
  pod.fallTopY = pod.y;
  // Assume airborne; the first step finds the ground again.
  pod.grounded = false;
  state.pod = pod;
  return { state, baseline };
}

/** Where a save from an older generator puts the pod: on the surface at the start column. */
export function surfacePod(): SaveData['pod'] {
  return { x: WORLD.spawnCol, y: restY(-1, POD.halfSize), facing: 1 };
}
