import type { EventBus } from '../core/events';
import { relicBonus, relicIndexAt } from '../data/relics';
import type { GameEvents } from './events';
import type { GameState } from './game';

/** A relic drilled out (§7): its bonus of $1 000 × its number, once. */
export function collectRelic(
  state: GameState,
  col: number,
  row: number,
  events: EventBus<GameEvents>,
): void {
  const index = relicIndexAt(row);
  if (index < 0 || state.relics[index]) return;
  state.relics[index] = true;
  const bonus = relicBonus(index);
  state.cash += bonus;
  events.emit('RelicFound', { index, bonus, col, row });
}
