import type { EventBus } from '../core/events';
import { mixSeed, Rng } from '../core/rng';
import { Block, isDrillable } from '../data/blocks';
import { HEART, QUAKE } from '../data/story';
import type { GameEvents } from '../sim/events';
import type { GameState } from '../sim/game';
import { colOf, rowOf } from '../sim/pod';
import { hasBit, withBit } from './state';

/** Seed salt for quake caves, past the generator's salts. */
const QUAKE_SALT = 100;

/**
 * The first visit to zones 3, 4 and 5 (§7): two seconds of shaking, no damage, and a new cave
 * that opens below the pod as a shortcut. Its spot comes from the seed, so a world always cracks
 * the same way. Relics, ore and the Heart's chamber are left alone.
 */
export function quake(state: GameState, zone: number, events: EventBus<GameEvents>): void {
  if (hasBit(state.story.quakes, zone)) return;
  state.story.quakes = withBit(state.story.quakes, zone);
  const { grid, pod } = state;
  const rng = new Rng(mixSeed(state.seed, QUAKE_SALT + zone));
  const podCol = colOf(pod.x);
  const first = Math.max(QUAKE.width, podCol - QUAKE.reach);
  const last = Math.min(grid.width - 1 - QUAKE.width * 2, podCol + QUAKE.reach);
  const col = rng.int(Math.min(first, last), Math.max(first, last));
  const top = rowOf(pod.y) + QUAKE.startBelow;
  const length = rng.int(QUAKE.length[0], QUAKE.length[1]);
  const bottom = Math.min(top + length, HEART.chamber.firstRow - 2);
  for (let row = top; row <= bottom; row++) {
    // A gently wandering crack, QUAKE.width cells wide.
    const drift = Math.round(Math.sin(row * 0.45 + zone) * 1.5);
    for (let dx = 0; dx < QUAKE.width; dx++) {
      const c = col + drift + dx;
      if (!grid.inside(c, row)) continue;
      const block = grid.get(c, row);
      if (block === Block.Ore || block === Block.Relic || !isDrillable(block)) continue;
      grid.set(c, row, Block.Empty);
    }
  }
  events.emit('Earthquake', { zone, col, row: top });
}
