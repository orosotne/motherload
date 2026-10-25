import type { ItemId } from '../data/items';
import type { UpgradeBranch } from '../data/upgrades';

/** Version of the save format (GAME_SPEC §9.8); older saves are migrated in migrations.ts. */
export const SCHEMA_VERSION = 1;

/**
 * A saved game as stored in localStorage. The world is its seed plus the cells changed since
 * generation, never the whole grid (§9.8).
 */
export interface SaveData {
  schemaVersion: number;
  /** Generator version the world diff belongs to (WORLD_VERSION). */
  worldVersion: number;
  /** When it was saved, as an ISO date. */
  savedAt: string;
  seed: number;
  /** Simulated seconds played. */
  time: number;
  pod: { x: number; y: number; facing: -1 | 1 };
  cash: number;
  fuel: number;
  hull: number;
  /** Units per mineral id, index 0 unused. */
  cargo: number[];
  tiers: Record<UpgradeBranch, number>;
  slots: ({ item: ItemId; anchor: { col: number; row: number } | null } | null)[];
  selectedSlot: number;
  heat: number;
  relics: boolean[];
  deepestZone: number;
  /** Changed cells as [index, block, mineral] triples, flattened. */
  world: number[];
}
