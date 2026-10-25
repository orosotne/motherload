/**
 * Block types (GAME_SPEC §4). The numbers are stored in the world grid and in save files, so an
 * existing id must never change meaning; new types get new ids.
 */
export const Block = {
  Empty: 0,
  /** Hlina, zone 1. */
  Dirt: 1,
  /** Íl, zone 2. */
  Clay: 2,
  /** Skala, zone 3. */
  Rock: 3,
  /** Čadič, zone 4. */
  Basalt: 4,
  /** Pradávny kameň, zone 5. */
  Ancient: 5,
  /** Jadrovec: unbreakable short barriers in zones 2 to 5. */
  Corestone: 6,
  /** Plynová kapsa: drills like its surroundings, explodes when drilled. */
  Gas: 7,
  /** Láva: cannot be drilled, hurts on contact. */
  Lava: 8,
  /** Rudný blok: carries a mineral id in the grid's mineral layer. */
  Ore: 9,
  /** Relikvia: one-off story find. */
  Relic: 10,
  /** World border: returned for cells outside the grid, never stored in it. */
  Bedrock: 11,
  /** Srdce Tumbry: the finale's goal in the core (§7). Cannot be drilled or blasted. */
  Heart: 12,
} as const;

export type BlockId = (typeof Block)[keyof typeof Block];

/** How long a block takes to drill, as hardness × the drill's seconds per hardness (§3). */
export type Hardness =
  | { kind: 'fixed'; value: number }
  /** The zone's base material plus a bonus: gas pockets and ore (§4). */
  | { kind: 'zone'; bonus: number }
  | { kind: 'none' };

export interface BlockInfo {
  /** Blocks movement. */
  solid: boolean;
  hardness: Hardness;
}

const NONE: Hardness = { kind: 'none' };

export const BLOCKS: Readonly<Record<BlockId, BlockInfo>> = {
  [Block.Empty]: { solid: false, hardness: NONE },
  [Block.Dirt]: { solid: true, hardness: { kind: 'fixed', value: 1.0 } },
  [Block.Clay]: { solid: true, hardness: { kind: 'fixed', value: 1.4 } },
  [Block.Rock]: { solid: true, hardness: { kind: 'fixed', value: 2.0 } },
  [Block.Basalt]: { solid: true, hardness: { kind: 'fixed', value: 2.8 } },
  [Block.Ancient]: { solid: true, hardness: { kind: 'fixed', value: 3.5 } },
  [Block.Corestone]: { solid: true, hardness: NONE },
  [Block.Gas]: { solid: true, hardness: { kind: 'zone', bonus: 0 } },
  [Block.Lava]: { solid: false, hardness: NONE },
  [Block.Ore]: { solid: true, hardness: { kind: 'zone', bonus: 0.3 } },
  [Block.Relic]: { solid: true, hardness: { kind: 'fixed', value: 1.5 } },
  [Block.Bedrock]: { solid: true, hardness: NONE },
  [Block.Heart]: { solid: true, hardness: NONE },
};

export function isSolid(block: BlockId): boolean {
  return BLOCKS[block].solid;
}

/** True when the drill can get through it (§4). */
export function isDrillable(block: BlockId): boolean {
  return BLOCKS[block].hardness.kind !== 'none';
}
