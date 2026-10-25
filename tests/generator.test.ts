import { describe, expect, it } from 'vitest';
import { Block } from '../src/data/blocks';
import { SOLID_TOP_ROWS, TOWN_COLUMNS } from '../src/data/generation';
import { MINERALS } from '../src/data/minerals';
import { RELICS, relicRow } from '../src/data/relics';
import { ZONES, zoneAt } from '../src/data/zones';
import { generateWorld } from '../src/world/generator';
import type { Grid } from '../src/world/grid';
import { findPathToBottom, reachableCells } from '../src/world/pathCheck';
import { gridFrom } from './helpers/sim';

function cells(grid: Grid): string {
  const out: number[] = [];
  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) out.push(grid.get(col, row), grid.mineral(col, row));
  }
  return out.join(',');
}

const SEEDS = Array.from({ length: 30 }, (_, i) => i * 7919 + 1);
const worlds = SEEDS.map((seed) => generateWorld(seed));

describe('generateWorld', () => {
  it('builds the same world from the same seed and another from another seed', () => {
    expect(cells(generateWorld(42))).toBe(cells(generateWorld(42)));
    expect(cells(generateWorld(42))).not.toBe(cells(generateWorld(43)));
  });

  it('fills every zone with its own base material', () => {
    for (const grid of worlds) {
      for (const zone of ZONES) {
        for (let row = zone.firstRow; row <= zone.lastRow; row++) {
          for (let col = 0; col < grid.width; col++) {
            const block = grid.get(col, row);
            const special = [
              Block.Empty,
              Block.Ore,
              Block.Corestone,
              Block.Gas,
              Block.Lava,
              Block.Relic,
            ] as number[];
            if (!special.includes(block)) expect(block).toBe(zone.base);
          }
        }
      }
    }
  });

  it('keeps the town plateau flat and solid', () => {
    const [first, last] = TOWN_COLUMNS;
    for (const grid of worlds) {
      for (let col = first; col <= last; col++) {
        expect(grid.get(col, 0)).not.toBe(Block.Empty);
      }
    }
  });

  it('keeps caves out of the first rows; only the gentle dips beside the town are open', () => {
    for (const grid of worlds) {
      for (let row = 2; row < SOLID_TOP_ROWS; row++) {
        for (let col = 0; col < grid.width; col++) expect(grid.get(col, row)).not.toBe(Block.Empty);
      }
    }
  });

  it('digs more caves deeper down', () => {
    const openShare = (zoneIndex: number): number => {
      const zone = ZONES[zoneIndex - 1];
      if (!zone) return 0;
      let open = 0;
      let total = 0;
      for (const grid of worlds) {
        for (let row = Math.max(zone.firstRow, SOLID_TOP_ROWS); row <= zone.lastRow; row++) {
          for (let col = 0; col < grid.width; col++) {
            total++;
            if (grid.get(col, row) === Block.Empty) open++;
          }
        }
      }
      return open / total;
    };
    expect(openShare(2)).toBeGreaterThan(openShare(1));
    expect(openShare(3)).toBeGreaterThan(openShare(2));
  });

  it('never lays a corestone barrier across the whole width', () => {
    for (const grid of worlds) {
      for (let row = 0; row < grid.height; row++) {
        let corestone = 0;
        for (let col = 0; col < grid.width; col++) {
          if (grid.get(col, row) === Block.Corestone) corestone++;
        }
        expect(corestone).toBeLessThan(grid.width);
      }
    }
  });

  it('spreads minerals by the table: full density in the main zone, half elsewhere', () => {
    const share = (mineralId: number, zoneIndex: number): number => {
      const zone = ZONES[zoneIndex - 1];
      if (!zone) return 0;
      let hits = 0;
      let ground = 0;
      for (const grid of worlds) {
        for (let row = zone.firstRow; row <= zone.lastRow; row++) {
          for (let col = 0; col < grid.width; col++) {
            const block = grid.get(col, row);
            if (block !== zone.base && block !== Block.Ore) continue;
            ground++;
            if (block === Block.Ore && grid.mineral(col, row) === mineralId) hits++;
          }
        }
      }
      return hits / ground;
    };
    // Rustite: main zone 1 (8 %), half in zone 2. Cobaltine: main zone 2 (5 %).
    expect(share(1, 1)).toBeCloseTo(0.08, 2);
    expect(share(1, 2)).toBeCloseTo(0.04, 2);
    expect(share(2, 2)).toBeCloseTo(0.05, 2);
    expect(share(2, 1)).toBeCloseTo(0.025, 2);
    // Nothing outside its zones: no Starheart above zone 5.
    expect(share(8, 4)).toBe(0);
  });

  it('puts Core Pearls only into the last 50 rows', () => {
    const pearl = MINERALS.find((mineral) => mineral.key === 'mineral.corePearl');
    let found = 0;
    for (const grid of worlds) {
      for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
          if (grid.mineral(col, row) !== pearl?.id) continue;
          found++;
          expect(row).toBeGreaterThanOrEqual(grid.height - 50);
        }
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it('hides gas pockets in zones 2 to 5 and lava only in zones 4 and 5', () => {
    const zonesWith = (block: number): Set<number> => {
      const zones = new Set<number>();
      for (const grid of worlds) {
        for (let row = 0; row < grid.height; row++) {
          for (let col = 0; col < grid.width; col++) {
            if (grid.get(col, row) === block) zones.add(zoneAt(row).index);
          }
        }
      }
      return zones;
    };
    expect([...zonesWith(Block.Gas)].sort()).toEqual([2, 3, 4, 5]);
    expect([...zonesWith(Block.Lava)].sort()).toEqual([4, 5]);
  });

  it('places the ten relics at their depths, each where the pod can reach it', () => {
    for (const grid of worlds) {
      const reachable = reachableCells(grid);
      const found: number[] = [];
      for (let row = 0; row < grid.height; row++) {
        for (let col = 0; col < grid.width; col++) {
          if (grid.get(col, row) !== Block.Relic) continue;
          found.push(row);
          expect(reachable[row * grid.width + col]).toBe(1);
          expect(col).toBeGreaterThanOrEqual(RELICS.edgeMargin);
          expect(col).toBeLessThan(grid.width - RELICS.edgeMargin);
        }
      }
      expect(found).toEqual(RELICS.depthsMeters.map((_, index) => relicRow(index)));
    }
  });

  it('always leaves a way from the surface to the bottom (anti-softlock, 100 seeds)', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const path = findPathToBottom(generateWorld(seed));
      expect(path.reachable, `seed ${seed}`).toBe(true);
    }
  });
});

describe('findPathToBottom', () => {
  it('goes through ground the pod can drill', () => {
    expect(findPathToBottom(gridFrom(['###', '###', '###'])).reachable).toBe(true);
  });

  it('is stopped by corestone across the whole width', () => {
    const path = findPathToBottom(gridFrom(['###', 'XXX', '###']));
    expect(path).toEqual({ reachable: false, deepestRow: 0 });
  });

  it('goes around a barrier that leaves a gap', () => {
    expect(findPathToBottom(gridFrom(['###', 'XX#', '###'])).reachable).toBe(true);
  });

  it('never counts on crossing lava', () => {
    expect(findPathToBottom(gridFrom(['###', 'LLL', '###'])).reachable).toBe(false);
  });

  it('drills sideways only while standing on something', () => {
    // The only way on is the drillable cell right of the shaft. Standing on the corestone at
    // the bottom of the shaft the pod can drill into it; in mid-air it cannot.
    const standing = gridFrom(['.X', '.#', 'X#']);
    const falling = gridFrom(['.X', '.#', '.X', 'XX']);
    expect(findPathToBottom(standing).reachable).toBe(true);
    expect(findPathToBottom(falling).reachable).toBe(false);
  });
});
