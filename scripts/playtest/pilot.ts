import { Block, isSolid } from '../../src/data/blocks';
import type { Action } from '../../src/data/controls';
import type { GameState, SimSettings } from '../../src/sim/game';
import { colOf, restY, rowOf } from '../../src/sim/pod';
import { open, type Cell } from './plan';

/** Seconds without reaching the next cell before the pilot gives up on a path. */
const STUCK_SECONDS = 6;
/** How close to a cell's centre line the pod must be before it moves on across a wall gap. */
const ALIGN = 0.12;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export type PilotStatus = 'moving' | 'done' | 'stuck';

/**
 * Flies and drills the pod along a planned path, one tick at a time, with the controls a player
 * has: it holds directions and the engine, never moves the pod itself. It centres before going
 * up a shaft or through a side opening, falls fast down long shafts and brakes in time, so a
 * fall never hurts.
 */
export class Pilot {
  private path: Cell[] = [];
  private index = 0;
  private sinceProgress = 0;

  constructor(
    private readonly state: GameState,
    private readonly settings: SimSettings,
  ) {}

  follow(path: Cell[]): void {
    this.path = path;
    this.index = 0;
    this.sinceProgress = 0;
  }

  get remaining(): number {
    return this.path.length - this.index;
  }

  /** The actions to hold this tick, and how the path goes. */
  step(dt: number, held: Set<Action>): PilotStatus {
    const { pod, grid } = this.state;
    const here = { col: colOf(pod.x), row: rowOf(pod.y) };
    // Skip the cells already reached (a fall can pass several at once).
    while (this.index < this.path.length) {
      const target = this.path[this.index];
      if (!target || pod.drill || target.col !== here.col || target.row !== here.row) break;
      this.index++;
      this.sinceProgress = 0;
    }
    const target = this.path[this.index];
    if (!target) {
      this.hold(here, held);
      return pod.drill ? 'moving' : 'done';
    }
    this.sinceProgress += dt;
    if (this.sinceProgress > STUCK_SECONDS) return 'stuck';
    // A drilling runs on by itself; holding on would start the next block below at once.
    if (pod.drill) return 'moving';
    if (!open(grid, target.col, target.row)) {
      const below = target.col === here.col && target.row === here.row + 1;
      const beside = target.row === here.row && Math.abs(target.col - here.col) === 1;
      // Off the planned cell, a drill would bite into whatever is there: plan again.
      if (!below && !beside) return 'stuck';
      this.drill(here, target, held);
      return 'moving';
    }
    this.fly(here, target, held);
    return 'moving';
  }

  /** Into a solid cell: land first, then hold the direction (never with the engine on). */
  private drill(here: Cell, target: Cell, held: Set<Action>): void {
    const { pod } = this.state;
    if (!pod.grounded || Math.abs(pod.vx) > 0.5) {
      this.hold(here, held);
      return;
    }
    if (target.row > here.row) held.add('down');
    else held.add(target.col < here.col ? 'left' : 'right');
  }

  /** Where the pod should be in a cell: resting on its floor, or hovering in its middle. */
  private spot(cell: Cell): { x: number; y: number } {
    const { grid } = this.state;
    const half = this.settings.pod.halfSize;
    const below = grid.get(cell.col, cell.row + 1);
    if (isSolid(below)) return { x: cell.col, y: restY(cell.row, half) };
    // Over lava, hover high, well clear of it.
    return { x: cell.col, y: -cell.row + (below === Block.Lava ? 0.08 : 0) };
  }

  private hold(cell: Cell, held: Set<Action>): void {
    const spot = this.spot(cell);
    this.steer(spot.x, spot.y, held, 0);
  }

  private fly(here: Cell, target: Cell, held: Set<Action>): void {
    const { pod } = this.state;
    const vertical = target.col === here.col;
    if (vertical && Math.abs(pod.x - target.col) > ALIGN) {
      // Line up under or over the opening first.
      this.steer(target.col, this.spot(here).y, held, 0);
      return;
    }
    if (!vertical && Math.abs(pod.y - this.spot(here).y) > ALIGN * 1.5) {
      this.steer(here.col, this.spot(here).y, held, 0);
      return;
    }
    // Aim at the end of the straight stretch ahead, so the pod goes full speed along it.
    const { end, length } = this.stretch(here);
    const spot = this.spot(end);
    this.steer(spot.x, spot.y, held, vertical && target.row > here.row ? length : 0);
  }

  /** The last open cell of the straight line the path takes from `here`, and how many cells. */
  private stretch(here: Cell): { end: Cell; length: number } {
    const first = this.path[this.index];
    if (!first) return { end: here, length: 0 };
    const dc = first.col - here.col;
    const dr = first.row - here.row;
    let end = first;
    let length = 1;
    for (let i = this.index + 1; i < this.path.length; i++) {
      const cell = this.path[i];
      if (!cell || cell.col - end.col !== dc || cell.row - end.row !== dr) break;
      if (!open(this.state.grid, cell.col, cell.row)) break;
      end = cell;
      length++;
    }
    return { end, length };
  }

  /** Velocity targets from the distance to (x, y); the stick and the engine chase them. */
  private steer(x: number, y: number, held: Set<Action>, fall: number): void {
    const { pod, stats } = this.state;
    const config = this.settings.pod;
    const wantVx = clamp((x - pod.x) * 6, -config.driveSpeed, config.driveSpeed);
    if (pod.vx < wantVx - 0.2) held.add('right');
    else if (pod.vx > wantVx + 0.2) held.add('left');
    // Falling: fast in a long shaft, braking under 4 blocks/s for the last few cells (§7).
    const descent = fall > 0 ? Math.min(config.maxFallSpeed, 2.5 + 1.6 * (fall - 1)) : 3;
    const wantVy = clamp((y - pod.y) * 6, -descent, stats.climbSpeed);
    if (pod.vy < wantVy - 0.05 && !(pod.grounded && y <= pod.y + 0.05)) held.add('up');
  }
}
