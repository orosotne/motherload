import { BALANCE } from '../../src/data/balance';
import { FUEL } from '../../src/data/economy';
import { RELICS } from '../../src/data/relics';
import { HEART } from '../../src/data/story';
import { WORLD } from '../../src/data/world';
import type { GameState } from '../../src/sim/game';
import type { Bottleneck } from './shopping';

/** Tiers (0-based) for the dive to the Heart: T5 cooling keeps the heat short, a T4 hull lasts. */
export const FINALE_COOLING = 4;
const FINALE_HULL = 3;

/** The deepest row the pod can stay in without overheating. */
export function heatRow(state: GameState): number {
  return Math.floor(state.stats.safeDepthMeters / WORLD.metersPerBlock) - 2;
}

/** The deepest row the tank brings the pod back from with room to spare. */
export function fuelRow(state: GameState): number {
  const { stats } = state;
  const liters = 0.5 * stats.tankLiters - 1;
  return Math.floor(((liters / FUEL.flyPerSecond) * stats.climbSpeed) / 1.3);
}

/** The deepest work row this rig allows: heat, the tank, and the Heart's chamber below. */
export function limitRow(state: GameState): number {
  return Math.max(2, Math.min(heatRow(state), fuelRow(state), HEART.chamber.firstRow - 2));
}

export function finaleWanted(state: GameState): boolean {
  return state.relics.filter(Boolean).length >= RELICS.neededForFinale;
}

/** Six relics and a rig that makes the dive and the escape (BALANCE.finaleEngineTier). */
export function finaleReady(state: GameState): boolean {
  const { tiers } = state;
  return (
    finaleWanted(state) &&
    !state.story.finished &&
    tiers.engine >= BALANCE.finaleEngineTier &&
    tiers.cooling >= FINALE_COOLING &&
    tiers.hull >= FINALE_HULL
  );
}

/** What keeps the rig from going deeper: the heat, or the fuel for the way home. */
export function bottleneck(state: GameState): Bottleneck {
  const bottom = HEART.chamber.firstRow - 2;
  const heat = heatRow(state);
  // The Heart sits below every safe depth but the last: cooling for the finale.
  if (finaleWanted(state) && state.tiers.cooling < FINALE_COOLING) return 'heat';
  if (heat <= fuelRow(state) && heat < bottom) return 'heat';
  return fuelRow(state) < bottom ? 'fuel' : null;
}
