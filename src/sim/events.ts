import type { BlockId } from '../data/blocks';
import type { DrillDir } from './pod';

export type DamageSource = 'fall' | 'gas' | 'lava' | 'heat';

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
  MineralCollected: { mineral: number; value: number; col: number; row: number };
  /** The cargo hold was full, so the mineral shattered without gain (§3). */
  CargoFull: { mineral: number; col: number; row: number };
  Damaged: { amount: number; source: DamageSource; hull: number };
  /** The tank dropped below 20 % (level 1) or 10 % (level 2). */
  FuelAlert: { level: 1 | 2 };
  ZoneEntered: { zone: number };
  RescueStarted: Record<string, never>;
  /** The drone towed the pod to the surface (§3). */
  Rescued: { fee: number; lostUnits: number };
  Destroyed: { cause: DamageSource };
  Respawned: { fee: number; lostUnits: number };
  Sold: { units: number; value: number };
  Refueled: { liters: number; cost: number; free: boolean };
  Repaired: { hp: number; cost: number };
}
