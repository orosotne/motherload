/**
 * The pod's simulation state. World coordinates: cell centres sit on integer coordinates, column c
 * at x = c and row r at y = −r (rows grow downwards), one block is one unit (DECISIONS.md).
 */

/** Column of the cell containing world x. */
export function colOf(x: number): number {
  return Math.floor(x + 0.5);
}

/** Row of the cell containing world y. */
export function rowOf(y: number): number {
  return Math.floor(0.5 - y);
}

/** Centre y of a pod of half-size `half` standing on the floor of `row`. */
export function restY(row: number, half: number): number {
  return -row - 0.5 + half;
}

export type DrillDir = 'left' | 'right' | 'down';

/** A drilling in progress: the pod glides from `from` to the resting spot in the target cell. */
export interface Drill {
  col: number;
  row: number;
  dir: DrillDir;
  /** Seconds the whole block takes. */
  duration: number;
  elapsed: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface Pod {
  x: number;
  y: number;
  /** Position one tick earlier; the renderer blends between the two. */
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  grounded: boolean;
  /** Engine output from 0 to 1; with the engine curve it builds up gradually (§5.10). */
  thrust: number;
  facing: -1 | 1;
  drill: Drill | null;
  /** Top of the current fall, for fall damage; braking with the engine restarts it (§7). */
  fallTopY: number;
}

/** A pod standing still on the floor of cell (`col`, `row`). */
export function createPod(col: number, row: number, half: number): Pod {
  const y = restY(row, half);
  return {
    x: col,
    y,
    prevX: col,
    prevY: y,
    vx: 0,
    vy: 0,
    grounded: true,
    thrust: 0,
    facing: 1,
    drill: null,
    fallTopY: y,
  };
}
