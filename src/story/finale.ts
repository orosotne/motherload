import type { EventBus } from '../core/events';
import { mixSeed, Rng } from '../core/rng';
import { Block, isDrillable } from '../data/blocks';
import { RELICS } from '../data/relics';
import { FINALE, HEART } from '../data/story';
import { buildingColumns, landingColumn } from '../sim/buildings';
import type { GameEvents } from '../sim/events';
import type { GameState } from '../sim/game';
import { colOf, createPod, rowOf } from '../sim/pod';

/** The finale in progress (§7): the Heart catching fire, then the escape from the rising lava. */
export interface FinaleState {
  phase: 'ignite' | 'escape';
  /** Seconds left in the phase: the ignition, or the escape until the lava is at the top. */
  left: number;
  /** Seconds this escape lasts: 90, and more after each time the lava won (pillar 4). */
  duration: number;
  /** Seconds since the escape started. */
  escaped: number;
  /** Row of the lava's surface; everything at or below it is lava. */
  lavaRow: number;
  /** Escapes started, the current one included. */
  attempts: number;
  /** Seconds until the next part of the core breaks open. */
  nextCollapse: number;
  collapses: number;
}

/** Seed salt for collapses, past the generator's and the quakes' salts. */
const COLLAPSE_SALT = 200;

export function relicCount(state: GameState): number {
  return state.relics.filter(Boolean).length;
}

/** The pod stands by the Heart and could reignite it, given the relics. */
export function nearHeart(state: GameState): boolean {
  if (state.finale || state.story.finished || state.status.kind !== 'play') return false;
  const { pod } = state;
  const row = rowOf(pod.y);
  const centre = (HEART.cols[0] + HEART.cols[1]) / 2;
  return (
    pod.grounded &&
    !pod.drill &&
    Math.abs(pod.x - centre) <= HEART.reach &&
    row >= HEART.chamber.firstRow &&
    row <= HEART.chamber.lastRow
  );
}

/** Seconds of escape on try `attempt` (1-based): the lava slows down after each loss. */
export function escapeSeconds(attempt: number): number {
  return FINALE.escapeSeconds + FINALE.slackPerFailure * Math.max(attempt - 1, 0);
}

/** With six relics or more, the Heart catches fire and the finale begins (§7). */
export function tryIgnite(state: GameState, events: EventBus<GameEvents>): boolean {
  if (!nearHeart(state) || relicCount(state) < RELICS.neededForFinale) return false;
  state.finale = {
    phase: 'ignite',
    left: FINALE.igniteSeconds,
    duration: escapeSeconds(1),
    escaped: 0,
    lavaRow: FINALE.lavaStartRow,
    attempts: 0,
    nextCollapse: FINALE.collapseSeconds,
    collapses: 0,
  };
  const { pod } = state;
  pod.vx = 0;
  pod.vy = 0;
  pod.thrust = 0;
  events.emit('HeartIgnited', {});
  return true;
}

/** The pod by the Heart with a full tank and hull (§7), and the lava back below the world. */
function startEscape(state: GameState, half: number, events: EventBus<GameEvents>): void {
  const finale = state.finale;
  if (!finale) return;
  finale.attempts += 1;
  finale.phase = 'escape';
  finale.duration = escapeSeconds(finale.attempts);
  finale.left = finale.duration;
  finale.escaped = 0;
  finale.lavaRow = FINALE.lavaStartRow;
  finale.nextCollapse = FINALE.collapseSeconds;
  state.pod = createPod(HEART.cols[0] - 2, HEART.rows[1], half);
  freshPod(state);
  events.emit('EscapeStarted', { attempt: finale.attempts, seconds: finale.duration });
}

/** A full tank and hull and a cool pod, at the start of every escape (§7) and after one. */
function freshPod(state: GameState): void {
  state.status = { kind: 'play' };
  state.fuel = state.stats.tankLiters;
  state.hull = state.stats.maxHull;
  state.heat = 0;
  state.heatLevel = 0;
  state.damageCarry = 0;
  state.inLava = false;
}

/**
 * The player gives the escape up (pillar 4: a weak rig must never be stuck in the finale):
 * Pip's drone tows the pod to the station for free, the Heart goes dim again and waits.
 */
export function abandonFinale(state: GameState, half: number, events: EventBus<GameEvents>): void {
  if (!state.finale) return;
  state.finale = null;
  state.pod = createPod(landingColumn(state.grid, buildingColumns('fuel')), -1, half);
  freshPod(state);
  events.emit('FinaleAbandoned', {});
}

/** The lava won: the escape starts over by the Heart, with more time (pillar 4). */
function failEscape(state: GameState, half: number, events: EventBus<GameEvents>): void {
  if (!state.finale) return;
  events.emit('EscapeFailed', { attempts: state.finale.attempts });
  startEscape(state, half, events);
}

/**
 * Before the normal step: the ignition holds the game still, and an escape that ended in a tow
 * or a wreck starts over by the Heart instead. True when the step is used up.
 */
export function stepFinaleFirst(
  state: GameState,
  dt: number,
  half: number,
  events: EventBus<GameEvents>,
): boolean {
  const finale = state.finale;
  if (!finale) return false;
  if (finale.phase === 'ignite') {
    finale.left -= dt;
    if (finale.left <= 0) startEscape(state, half, events);
    return true;
  }
  if (state.status.kind === 'play') return false;
  failEscape(state, half, events);
  return true;
}

/** A new way up breaks open above the pod: the path changes while it flees (§7). */
function collapse(state: GameState, events: EventBus<GameEvents>): void {
  const finale = state.finale;
  if (!finale) return;
  const rng = new Rng(mixSeed(state.seed, COLLAPSE_SALT + finale.collapses));
  finale.collapses += 1;
  const { grid, pod } = state;
  const reach = FINALE.collapseCols;
  const col = Math.min(Math.max(colOf(pod.x) + rng.int(-reach, reach), 1), grid.width - 2);
  const row = rowOf(pod.y) - rng.int(FINALE.collapseRows[0], FINALE.collapseRows[1]);
  if (row - 1 < FINALE.collapseTopRows) return;
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      const block = grid.get(c, r);
      // Only plain rock gives way: no ore or relic is lost, lava and the Heart stay.
      if (block === Block.Ore || block === Block.Relic || !isDrillable(block)) continue;
      grid.set(c, r, Block.Empty);
    }
  }
  events.emit('Collapse', { col, row });
}

/** After the normal step: the lava rises, catches the pod, or the pod reaches the surface. */
export function stepEscape(
  state: GameState,
  dt: number,
  half: number,
  events: EventBus<GameEvents>,
): void {
  const finale = state.finale;
  if (!finale || finale.phase !== 'escape') return;
  finale.escaped += dt;
  finale.left = Math.max(finale.duration - finale.escaped, 0);
  // Straight up from below the world to the surface, in the time the escape has.
  const rising = Math.max(finale.escaped - FINALE.graceSeconds, 0);
  const share = Math.min(rising / (finale.duration - FINALE.graceSeconds), 1);
  finale.lavaRow = FINALE.lavaStartRow * (1 - share);
  finale.nextCollapse -= dt;
  if (finale.nextCollapse <= 0) {
    finale.nextCollapse = FINALE.collapseSeconds;
    collapse(state, events);
  }
  if (rowOf(state.pod.y) < 0) {
    state.finale = null;
    state.story.finished = true;
    events.emit('FinaleWon', {
      allRelics: relicCount(state) === RELICS.depthsMeters.length,
      attempts: finale.attempts,
    });
    return;
  }
  // The pod's underside touches the lava's surface.
  if (state.pod.y - half <= -finale.lavaRow + 0.5) failEscape(state, half, events);
}
