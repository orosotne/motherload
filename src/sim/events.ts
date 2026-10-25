import type { BlockId } from '../data/blocks';
import type { DrillDir } from './pod';

/**
 * Facts the simulation announces (GAME_SPEC §9.5). Renderer, audio and UI react to them; they
 * never feed back into the simulation.
 */
export interface GameEvents {
  DrillStarted: { col: number; row: number; dir: DrillDir; seconds: number; hardness: number };
  BlockBroken: { col: number; row: number; block: BlockId; mineral: number };
  /** `speed` is the downward speed at touchdown; `fallHeight` counts blocks since the fall top. */
  Landed: { speed: number; fallHeight: number };
  /** The engine started from idle. */
  EngineStarted: Record<string, never>;
}
