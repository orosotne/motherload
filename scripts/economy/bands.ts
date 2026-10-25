import { Block, BLOCKS } from '../../src/data/blocks';
import { BALANCE } from '../../src/data/balance';
import { mineralById } from '../../src/data/minerals';
import { WORLD } from '../../src/data/world';
import { zoneAt } from '../../src/data/zones';
import { generateWorld } from '../../src/world/generator';

/** What a stretch of rows holds, averaged over several generated worlds. */
export interface Band {
  index: number;
  firstRow: number;
  lastRow: number;
  /** Row the player mines around. */
  midRow: number;
  zone: number;
  /** Hardness of the zone's base material. */
  hardness: number;
  /** Ore blocks per drillable block. */
  oreShare: number;
  /** Average sale value of one ore unit. */
  valuePerOre: number;
  /** Gas pockets per drillable block. */
  gasShare: number;
  /** Ore blocks in the band of one world. */
  oreUnits: number;
  /** Share of the band's ore not mined yet: trips use it up (1 at the start). */
  left: number;
}

/** Splits the world into bands of BALANCE.bandRows rows and measures each over a few seeds. */
export function measureBands(seeds = BALANCE.seeds): Band[] {
  const worlds = Array.from({ length: seeds }, (_, i) => generateWorld(i * 104_729 + 17));
  const bands: Band[] = [];
  for (let first = 0; first < WORLD.height; first += BALANCE.bandRows) {
    const last = Math.min(first + BALANCE.bandRows, WORLD.height) - 1;
    let drillable = 0;
    let ore = 0;
    let value = 0;
    let gas = 0;
    for (const grid of worlds) {
      for (let row = first; row <= last; row++) {
        for (let col = 0; col < grid.width; col++) {
          const block = grid.get(col, row);
          if (BLOCKS[block].hardness.kind === 'none') continue;
          drillable++;
          if (block === Block.Gas) gas++;
          if (block !== Block.Ore) continue;
          ore++;
          value += mineralById(grid.mineral(col, row))?.value ?? 0;
        }
      }
    }
    const zone = zoneAt(first);
    const base = BLOCKS[zone.base].hardness;
    bands.push({
      index: bands.length,
      firstRow: first,
      lastRow: last,
      midRow: Math.round((first + last) / 2),
      zone: zone.index,
      hardness: base.kind === 'fixed' ? base.value : 1,
      oreShare: drillable > 0 ? ore / drillable : 0,
      valuePerOre: ore > 0 ? value / ore : 0,
      gasShare: drillable > 0 ? gas / drillable : 0,
      oreUnits: ore / seeds,
      left: 1,
    });
  }
  return bands;
}
