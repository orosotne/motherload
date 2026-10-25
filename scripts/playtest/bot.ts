import type { EventBus } from '../../src/core/events';
import type { InputFrame } from '../../src/core/input';
import { Block } from '../../src/data/blocks';
import { ACTIONS, type Action } from '../../src/data/controls';
import { FUEL } from '../../src/data/economy';
import { HEART } from '../../src/data/story';
import { cargoUnits } from '../../src/sim/cargo';
import type { GameEvents } from '../../src/sim/events';
import type { GameState, SimSettings } from '../../src/sim/game';
import { colOf, rowOf } from '../../src/sim/pod';
import { abandonFinale, nearHeart } from '../../src/story/finale';
import { Pilot } from './pilot';
import { flightSeconds, pathTo, plan, type Cell } from './plan';
import { bestOre, look, nearestRelic, relicCells } from './prospect';
import { bottleneck, finaleReady, heatRow, limitRow } from './rig';
import { visitShops } from './shopping';

type Mode = 'shop' | 'down' | 'mine' | 'home' | 'heart' | 'escape' | 'wait';

/** Seconds of digging the bot will spend to reach ore near its work depth. */
const ORE_REACH = 45;
/** How far to look once the band around the work depth is mined out, and at last. */
const ORE_FAR = 150;
const ORE_ANYWHERE = 300;
const RELIC_REACH = 120;
/** Seconds a sideways step counts extra: straight shafts fly faster. */
const SIDE_PENALTY = 0.5;
const HEART_SIDE_PENALTY = 3;
/** Escapes lost in a row before taking the tow home and upgrading first. */
const ESCAPE_TRIES = 3;

/**
 * A scripted player for the playtest (GAME_SPEC F6: balance after playtest). It plays the real
 * simulation with the player's controls: trips down its shaft to the deepest band its rig can
 * handle, mines the best ore within reach, detours for relics, flies home in time, sells, buys
 * upgrades evenly and, with six relics and a good enough rig, reignites the Heart and escapes.
 * It sees the whole grid, which a player does not; it is no smarter than that.
 */
export class Bot {
  mode: Mode = 'shop';
  /** Stops at the shops: each one costs a player some time in the menus. */
  visits = 0;
  private readonly pilot: Pilot;
  private workRow = 0;
  private escapesLost = 0;
  /** Trips to wait after giving up an escape, buying upgrades meanwhile. */
  private finaleCooldown = 0;
  private replanIn = 0;
  /** The last estimate of the flight home, and when to estimate again. */
  private home = 0;
  private homeIn = 0;
  private readonly relics: Cell[];
  /** The band around the work depth had no more ore the last time the bot looked. */
  private minedOut = false;

  constructor(
    private readonly state: GameState,
    settings: SimSettings,
    private readonly events: EventBus<GameEvents>,
  ) {
    this.pilot = new Pilot(state, settings);
    this.relics = relicCells(state);
    events.on('EscapeFailed', () => {
      this.escapesLost++;
      if (this.escapesLost < ESCAPE_TRIES) return;
      this.escapesLost = 0;
      this.finaleCooldown = 3;
      abandonFinale(state, settings.pod.halfSize, events);
    });
  }

  /** The input for the next tick. */
  frame(dt: number): InputFrame {
    const held = new Set<Action>();
    const pressed = new Set<Action>();
    this.think(dt, held, pressed);
    const set = (from: Set<Action>): Record<Action, boolean> => {
      const out = {} as Record<Action, boolean>;
      for (const action of ACTIONS) out[action] = from.has(action);
      return out;
    };
    return { held: set(held), pressed: set(pressed) };
  }

  private here(): Cell {
    const { pod } = this.state;
    return { col: colOf(pod.x), row: rowOf(pod.y) };
  }

  private think(dt: number, held: Set<Action>, pressed: Set<Action>): void {
    const { state } = this;
    if (state.status.kind !== 'play') {
      this.mode = 'wait';
      return;
    }
    if (state.finale) {
      this.escape(dt, held);
      return;
    }
    if (this.mode === 'escape' || this.mode === 'wait') {
      this.mode = this.here().row < 0 ? 'shop' : 'home';
      this.pilot.follow([]);
    }
    if (this.mode === 'shop') {
      this.shop();
      this.startTrip();
    }
    if ((this.mode === 'down' || this.mode === 'mine') && this.needHome(dt)) this.goHome();
    const status = this.pilot.step(dt, held);
    if (status === 'stuck') {
      this.replan();
      return;
    }
    if (status !== 'done') return;
    switch (this.mode) {
      case 'home':
        if (this.here().row < 0) this.mode = 'shop';
        else this.goHome();
        break;
      case 'heart':
        // Beside the Heart: land, then light it. Elsewhere: find the way again.
        if (nearHeart(state)) pressed.add('enter');
        else if (!this.besideHeart(this.here())) this.goHeart();
        break;
      case 'down':
        this.mode = 'mine';
        this.mine();
        break;
      case 'mine':
        this.mine();
        break;
      default:
        break;
    }
  }

  private shop(): void {
    this.visits++;
    if (this.finaleCooldown > 0) this.finaleCooldown--;
    visitShops(this.state, this.events, bottleneck(this.state));
  }

  private startTrip(): void {
    if (finaleReady(this.state) && this.finaleCooldown === 0) {
      this.goHeart();
      return;
    }
    this.workRow = limitRow(this.state);
    this.goDown();
  }

  private goDown(): void {
    this.mode = 'down';
    const { grid, stats } = this.state;
    const deep = (cell: Cell): boolean => cell.row >= this.workRow;
    const options = { dig: true, maxRow: heatRow(this.state), sidePenalty: SIDE_PENALTY };
    const path = plan(grid, stats, this.here(), deep, options);
    if (path) this.pilot.follow(path);
    else this.goHome();
  }

  /** On the chamber floor right next to the Heart, where it can be lit. */
  private besideHeart(cell: Cell): boolean {
    const { cols, rows } = HEART;
    return cell.row === rows[1] && (cell.col === cols[0] - 1 || cell.col === cols[1] + 1);
  }

  private goHeart(): void {
    this.mode = 'heart';
    const { grid, stats } = this.state;
    const beside = (cell: Cell): boolean => this.besideHeart(cell);
    // Down as straight as the rock allows: the way back up is the escape (§7).
    const options = { dig: true, sidePenalty: HEART_SIDE_PENALTY };
    this.pilot.follow(plan(grid, stats, this.here(), beside, options) ?? []);
  }

  /** Relics first, then the best ore near the work depth; deeper when it runs out. */
  private mine(): void {
    const { state } = this;
    const here = this.here();
    // Relics a little further than ore; below the heat no search reaches them.
    const relics = this.relics.some(
      (cell) => cell.row <= heatRow(state) && state.grid.get(cell.col, cell.row) === Block.Relic,
    );
    // Mined out around here the last time: one wide look serves the near finds too.
    const reach = this.minedOut ? ORE_ANYWHERE : relics ? RELIC_REACH : ORE_REACH;
    let found = look(state, here, reach);
    const near =
      (relics ? nearestRelic(state, found, this.relics, RELIC_REACH) : null) ??
      bestOre(state, found, ORE_REACH, this.workRow - 30);
    if (near || this.workRow < limitRow(state)) this.minedOut = false;
    if (near) {
      this.pilot.follow(pathTo(found, near) ?? []);
      return;
    }
    if (this.workRow < limitRow(state)) {
      this.workRow = Math.min(this.workRow + 4, limitRow(state));
      this.goDown();
      return;
    }
    // The band is mined out around here: look further, at last anywhere up the shaft.
    if (!this.minedOut) found = look(state, here, ORE_ANYWHERE);
    this.minedOut = true;
    const far =
      bestOre(state, found, ORE_FAR, this.workRow - 60) ?? bestOre(state, found, ORE_ANYWHERE, 0);
    if (far) this.pilot.follow(pathTo(found, far) ?? []);
    else this.goHome();
  }

  /** Seconds of flying home from here, along the real way, refreshed now and then. */
  private homeSeconds(dt: number): number {
    this.homeIn -= dt;
    if (this.homeIn > 0) return this.home;
    this.homeIn = 2;
    const { grid, stats } = this.state;
    const from = this.here();
    const path = plan(grid, stats, from, (cell) => cell.row < 0, { dig: false });
    this.home = path ? flightSeconds(path, from, stats) : (from.row + 1) / stats.climbSpeed;
    return this.home;
  }

  private needHome(dt: number): boolean {
    const { state } = this;
    const { stats } = state;
    if (cargoUnits(state.cargo) >= stats.cargoCapacity) return true;
    const flight = this.homeSeconds(dt) * 1.4 + 5;
    if (state.fuel < flight * FUEL.flyPerSecond + 0.1 * stats.tankLiters) return true;
    const kit = state.slots.some((slot) => slot?.item === 'repairKit');
    if (state.hull < stats.maxHull * 0.35 && !kit) return true;
    return state.heat > 0.6;
  }

  private goHome(): void {
    this.mode = 'home';
    const path = plan(this.state.grid, this.state.stats, this.here(), (cell) => cell.row < 0, {
      dig: false,
    });
    // Walled in (it should not happen): dig a way out instead.
    this.pilot.follow(
      path ??
        plan(this.state.grid, this.state.stats, this.here(), (cell) => cell.row < 0, {
          dig: true,
        }) ??
        [],
    );
  }

  private replan(): void {
    if (this.mode === 'home') this.goHome();
    else if (this.mode === 'heart') this.goHeart();
    else this.mine();
  }

  /** The escape (§7): wait for the fire, then up the open way, planning again now and then. */
  private escape(dt: number, held: Set<Action>): void {
    const finale = this.state.finale;
    if (!finale || finale.phase !== 'escape') return;
    if (this.mode !== 'escape') {
      this.mode = 'escape';
      this.replanIn = 0;
    }
    this.replanIn -= dt;
    if (this.replanIn <= 0 || this.pilot.remaining === 0) {
      this.replanIn = 1.5;
      const out = (cell: Cell): boolean => cell.row < 0;
      const options = { dig: false, sidePenalty: SIDE_PENALTY };
      this.pilot.follow(plan(this.state.grid, this.state.stats, this.here(), out, options) ?? []);
    }
    this.pilot.step(dt, held);
  }
}
