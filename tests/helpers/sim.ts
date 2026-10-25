import { EventBus } from '../../src/core/events';
import type { InputFrame } from '../../src/core/input';
import { Block, type BlockId } from '../../src/data/blocks';
import { ACTIONS, type Action } from '../../src/data/controls';
import { ENGINE } from '../../src/data/engine';
import type { GameEvents } from '../../src/sim/events';
import {
  createGame,
  defaultSettings,
  stepGame,
  type GameState,
  type SimSettings,
} from '../../src/sim/game';
import { createPod } from '../../src/sim/pod';
import { Grid } from '../../src/world/grid';

export const DT = 1 / ENGINE.simHz;

const CELLS: Readonly<Record<string, BlockId>> = {
  '.': Block.Empty,
  '#': Block.Dirt,
  C: Block.Clay,
  X: Block.Corestone,
  G: Block.Gas,
  L: Block.Lava,
  R: Block.Relic,
};

/**
 * Builds a grid from text rows: `#` dirt, `.` empty, `C` clay, `X` corestone, `G` gas, `L` lava,
 * `R` relic, a digit is ore of that mineral id. Row 0 comes first.
 */
export function gridFrom(rows: readonly string[], skyRows = 12): Grid {
  const grid = new Grid(rows[0]?.length ?? 0, rows.length, 20, skyRows);
  rows.forEach((line, row) => {
    [...line].forEach((char, col) => {
      if (/[1-9]/.test(char)) {
        grid.set(col, row, Block.Ore, Number(char));
        return;
      }
      const block = CELLS[char];
      if (block === undefined) throw new Error(`Unknown cell "${char}"`);
      if (block !== Block.Empty) grid.set(col, row, block);
    });
  });
  return grid;
}

type EventType = keyof GameEvents;
/** Every event type; the Record makes the compiler insist on new ones being added here. */
const ALL_EVENTS: Record<EventType, true> = {
  DrillStarted: true,
  BlockBroken: true,
  Landed: true,
  EngineStarted: true,
  MineralCollected: true,
  CargoFull: true,
  Damaged: true,
  FuelAlert: true,
  ZoneEntered: true,
  RescueStarted: true,
  Rescued: true,
  Destroyed: true,
  Respawned: true,
  Sold: true,
  Refueled: true,
  Repaired: true,
  GasHiss: true,
  DrillAborted: true,
  Explosion: true,
  LavaContact: true,
  Overheat: true,
  RelicFound: true,
  UpgradeBought: true,
  ItemBought: true,
  ItemUsed: true,
  ItemRefused: true,
  SlotSelected: true,
  AnchorSet: true,
  Teleported: true,
};
const EVENT_TYPES = Object.keys(ALL_EVENTS) as EventType[];

export interface Logged<K extends EventType = EventType> {
  tick: number;
  type: K;
  payload: GameEvents[K];
}

/** Drives the simulation tick by tick with scripted input and records every event. */
export class Sim {
  readonly settings: SimSettings;
  readonly state: GameState;
  readonly log: Logged[] = [];
  tick = 0;
  private readonly eventBus = new EventBus<GameEvents>();
  private held = new Set<Action>();

  constructor(grid: Grid, col: number, row: number, settings: SimSettings = defaultSettings()) {
    this.settings = settings;
    this.state = createGame(grid, settings);
    this.state.pod = createPod(col, row, settings.pod.halfSize);
    for (const type of EVENT_TYPES) {
      this.eventBus.on(type, (payload) => this.log.push({ tick: this.tick, type, payload }));
    }
  }

  get pod(): GameState['pod'] {
    return this.state.pod;
  }

  get bus(): EventBus<GameEvents> {
    return this.eventBus;
  }

  /** Holds exactly `actions` for `ticks` ticks; newly held actions count as pressed on the first. */
  hold(actions: readonly Action[], ticks: number): this {
    const pressed = actions.filter((action) => !this.held.has(action));
    this.held = new Set(actions);
    for (let i = 0; i < ticks; i++) this.step(i === 0 ? pressed : []);
    return this;
  }

  /** Presses and releases `action` within one tick, keeping everything else as it is. */
  tap(action: Action): this {
    this.held.delete(action);
    this.step([action]);
    return this;
  }

  /** Keeps the current input until `done` holds, at most `maxTicks` ticks. */
  until(done: (sim: Sim) => boolean, maxTicks = 2000): this {
    for (let i = 0; i < maxTicks && !done(this); i++) this.step([]);
    if (!done(this)) throw new Error(`Condition not reached in ${maxTicks} ticks`);
    return this;
  }

  events<K extends EventType>(type: K): Logged<K>[] {
    return this.log.filter((entry): entry is Logged<K> => entry.type === type);
  }

  private step(pressed: readonly Action[]): void {
    this.tick += 1;
    const held = {} as Record<Action, boolean>;
    const pressedNow = {} as Record<Action, boolean>;
    for (const action of ACTIONS) {
      held[action] = this.held.has(action);
      pressedNow[action] = pressed.includes(action);
    }
    const frame: InputFrame = { held, pressed: pressedNow };
    stepGame(this.state, frame, DT, this.settings, this.eventBus);
  }
}
