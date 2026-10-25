import { Block } from '../../src/data/blocks';
import { mineralById } from '../../src/data/minerals';
import type { GameState } from '../../src/sim/game';
import { cellOf, costTo, search, type Cell, type Search } from './plan';
import { heatRow } from './rig';

/** Every way within `reach` seconds of digging from `from`, above the heat. */
export function look(state: GameState, from: Cell, reach: number): Search {
  const options = { dig: true, maxCost: reach, maxRow: heatRow(state) };
  return search(state.grid, state.stats, from, options);
}

/** The most valuable ore within `reach` seconds and below `fromRow`, per second of getting there. */
export function bestOre(
  state: GameState,
  found: Search,
  reach: number,
  fromRow: number,
): Cell | null {
  const { grid } = state;
  let best: Cell | null = null;
  let bestScore = 0;
  for (const at of found.order) {
    const cell = cellOf(found, at);
    if (cell.row < fromRow || grid.get(cell.col, cell.row) !== Block.Ore) continue;
    const cost = costTo(found, cell);
    if (cost > reach) continue;
    const value = mineralById(grid.mineral(cell.col, cell.row))?.value ?? 0;
    const score = value / (cost + 1.5);
    if (score > bestScore) {
      bestScore = score;
      best = cell;
    }
  }
  return best;
}

/** Where the relics lie: the bot sees the whole grid. They never move, only get picked up. */
export function relicCells(state: GameState): Cell[] {
  const { grid } = state;
  const cells: Cell[] = [];
  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      if (grid.get(col, row) === Block.Relic) cells.push({ col, row });
    }
  }
  return cells;
}

/** The relic of `cells` cheapest to reach in a search, if it reached one within `reach`. */
export function nearestRelic(
  state: GameState,
  found: Search,
  cells: readonly Cell[],
  reach: number,
): Cell | null {
  let best: Cell | null = null;
  let bestCost = reach;
  for (const cell of cells) {
    if (state.grid.get(cell.col, cell.row) !== Block.Relic) continue;
    const cost = costTo(found, cell);
    if (cost <= bestCost) {
      bestCost = cost;
      best = cell;
    }
  }
  return best;
}
