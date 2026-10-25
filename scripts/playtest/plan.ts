import { Block, isDrillable, isSolid } from '../../src/data/blocks';
import { hardnessAt } from '../../src/sim/drilling';
import type { PodStats } from '../../src/sim/stats';
import type { Grid } from '../../src/world/grid';

/** A cell the pod can be in, or drill into. */
export interface Cell {
  col: number;
  row: number;
}

/** Seconds a planned step takes, roughly: the planner only compares ways, it does not time them. */
const SIDE_SECONDS = 0.3;
const FALL_SECONDS = 0.25;
/** Drilling also means stopping and starting again. */
const DRILL_OVERHEAD = 0.15;
/** Seconds a way over a lava cell counts extra. */
const LAVA_DETOUR = 4;

/** Open for the pod: empty cells, the sky included; never lava. */
export function open(grid: Grid, col: number, row: number): boolean {
  return grid.get(col, row) === Block.Empty;
}

/** Safe to drill into: no gas (it explodes), and no lava right under it to fall into. */
export function diggable(grid: Grid, col: number, row: number): boolean {
  const block = grid.get(col, row);
  return (
    block !== Block.Gas &&
    block !== Block.Heart &&
    isDrillable(block) &&
    grid.get(col, row + 1) !== Block.Lava
  );
}

/** A binary min-heap of grid slots by cost, on two flat arrays: no garbage per entry. */
class Heap {
  private readonly costs: number[] = [];
  private readonly slots: number[] = [];
  /** The entry `pop` took off last. */
  cost = 0;
  slot = 0;

  get size(): number {
    return this.costs.length;
  }

  push(cost: number, slot: number): void {
    const { costs, slots } = this;
    let i = costs.length;
    costs.push(cost);
    slots.push(slot);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      const parentCost = costs[parent] ?? 0;
      if (parentCost <= cost) break;
      costs[i] = parentCost;
      slots[i] = slots[parent] ?? 0;
      i = parent;
    }
    costs[i] = cost;
    slots[i] = slot;
  }

  /** Takes the cheapest entry off into `cost` and `slot`. */
  pop(): void {
    const { costs, slots } = this;
    this.cost = costs[0] ?? 0;
    this.slot = slots[0] ?? 0;
    const cost = costs.pop() ?? 0;
    const slot = slots.pop() ?? 0;
    const size = costs.length;
    if (size === 0) return;
    let i = 0;
    for (;;) {
      const left = 2 * i + 1;
      if (left >= size) break;
      const right = left + 1;
      const child = right < size && (costs[right] ?? 0) < (costs[left] ?? 0) ? right : left;
      const childCost = costs[child] ?? 0;
      if (childCost >= cost) break;
      costs[i] = childCost;
      slots[i] = slots[child] ?? 0;
      i = child;
    }
    costs[i] = cost;
    slots[i] = slot;
  }
}

export interface SearchOptions {
  /** Drilling allowed; without it the search keeps to open cells (the way home). */
  dig: boolean;
  /** Seconds beyond which the search stops looking. */
  maxCost?: number;
  /** Rows below this one are off limits, e.g. where the pod would overheat. */
  maxRow?: number;
  /** Extra seconds per sideways step: a straight shaft is quicker to fly back up. */
  sidePenalty?: number;
}

/** The cost of the cheapest way to every cell found, and where each way came from. */
export interface Search {
  grid: Grid;
  from: Cell;
  cost: Float64Array;
  previous: Int32Array;
  /** Slots of the cells in the order they were settled, cheapest first (see `cellOf`). */
  order: number[];
}

/** Steps to the four neighbours: up, down, left, right. */
const STEPS: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

function slot(grid: Grid, col: number, row: number): number {
  return (row + grid.skyRows) * grid.width + col;
}

/** The cell of a slot in a search. */
export function cellOf(found: Search, at: number): Cell {
  const { grid } = found;
  return { col: at % grid.width, row: Math.floor(at / grid.width) - grid.skyRows };
}

/**
 * The cheapest ways from `from` by the game's rules (Dijkstra): fly up only through open cells,
 * drill down, left or right only when standing on solid ground, never into gas or lava. Costs
 * are rough seconds. `stop` ends the search at the first cell it accepts.
 */
export function search(
  grid: Grid,
  stats: PodStats,
  from: Cell,
  options: SearchOptions,
  stop?: (cell: Cell) => boolean,
): Search {
  const top = -grid.skyRows;
  const size = grid.width * (grid.height - top);
  const cost = new Float64Array(size).fill(Infinity);
  const previous = new Int32Array(size).fill(-1);
  const order: number[] = [];
  const heap = new Heap();
  const maxCost = options.maxCost ?? Infinity;
  const maxRow = options.maxRow ?? Infinity;
  const side = options.sidePenalty ?? 0;
  const start = slot(grid, from.col, from.row);
  cost[start] = 0;
  heap.push(0, start);
  const step = (fromCol: number, fromRow: number, col: number, row: number): number => {
    if (col < 0 || col >= grid.width || row < top || row >= grid.height) return Infinity;
    if (row > maxRow) return Infinity;
    const up = row < fromRow;
    const sideways = row === fromRow ? side : 0;
    if (open(grid, col, row)) {
      // Right over lava the pod could sag into it: only when there is no other way.
      const risk = grid.get(col, row + 1) === Block.Lava ? LAVA_DETOUR : 0;
      if (up) return 1 / stats.climbSpeed + risk;
      return (row > fromRow ? FALL_SECONDS : SIDE_SECONDS) + risk + sideways;
    }
    // Drilling: never upwards, and only while standing on something solid.
    if (!options.dig || up || !diggable(grid, col, row)) return Infinity;
    if (row === fromRow && !isSolid(grid.get(fromCol, fromRow + 1))) return Infinity;
    const hardness = hardnessAt(grid, col, row) ?? 99;
    return hardness * stats.drillSecondsPerHardness + DRILL_OVERHEAD + sideways;
  };
  while (heap.size > 0) {
    heap.pop();
    const at = heap.slot;
    const spent = heap.cost;
    if (spent > (cost[at] ?? Infinity)) continue;
    const col = at % grid.width;
    const row = Math.floor(at / grid.width) + top;
    order.push(at);
    if (at !== start && stop?.({ col, row })) break;
    for (const [dc, dr] of STEPS) {
      const c = col + dc;
      const r = row + dr;
      const total = spent + step(col, row, c, r);
      if (total > maxCost) continue;
      const target = slot(grid, c, r);
      if (total >= (cost[target] ?? Infinity)) continue;
      cost[target] = total;
      previous[target] = at;
      heap.push(total, target);
    }
  }
  return { grid, from, cost, previous, order };
}

/** Seconds to reach `cell` in a search, Infinity when it was not reached. */
export function costTo(found: Search, cell: Cell): number {
  return found.cost[slot(found.grid, cell.col, cell.row)] ?? Infinity;
}

/** The cells from just after the start to `cell`, or null when the search did not reach it. */
export function pathTo(found: Search, cell: Cell): Cell[] | null {
  const { grid } = found;
  const start = slot(grid, found.from.col, found.from.row);
  let at = slot(grid, cell.col, cell.row);
  if (!Number.isFinite(found.cost[at] ?? Infinity)) return null;
  const path: Cell[] = [];
  while (at !== start) {
    path.push(cellOf(found, at));
    at = found.previous[at] ?? start;
    if (at < 0) return null;
  }
  return path.reverse();
}

/** The cheapest way to the first cell `goal` accepts, or null. */
export function plan(
  grid: Grid,
  stats: PodStats,
  from: Cell,
  goal: (cell: Cell) => boolean,
  options: SearchOptions,
): Cell[] | null {
  const found = search(grid, stats, from, options, goal);
  const at = found.order.at(-1);
  const last = at === undefined ? null : cellOf(found, at);
  return last && goal(last) ? pathTo(found, last) : null;
}

/** Seconds of flying a way home takes, roughly, for the fuel it needs. */
export function flightSeconds(path: readonly Cell[], from: Cell, stats: PodStats): number {
  let seconds = 0;
  let at = from;
  for (const cell of path) {
    seconds += cell.row < at.row ? 1 / stats.climbSpeed : SIDE_SECONDS;
    at = cell;
  }
  return seconds;
}
