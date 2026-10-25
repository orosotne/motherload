/** Crystal shapes; every mineral has its own, not just its own colour (§6, §5.12). */
export type CrystalShape =
  'cube' | 'tetra' | 'octa' | 'dodeca' | 'prism' | 'spike' | 'shard' | 'star' | 'pearl';

export interface MineralConfig {
  /** Stored in the grid's mineral layer and in saves; 0 means none, so ids start at 1. */
  id: number;
  /** i18n key of the name. */
  key: string;
  /** Sale price of one unit in dollars. */
  value: number;
  /** Zones (1 to 5) it occurs in. */
  zones: readonly number[];
  /** Zone with the full density; elsewhere the density halves (§6). */
  mainZone: number;
  /** Share of blocks that carry it in the main zone. */
  density: number;
  /** Only in the last this many rows of the world (Core Pearl). */
  lastRows?: number;
  color: string;
  shape: CrystalShape;
}

/** GAME_SPEC §6. Main zones are a design decision (DECISIONS.md). */
export const MINERALS: readonly MineralConfig[] = [
  {
    id: 1,
    key: 'mineral.rustite',
    value: 25,
    zones: [1, 2],
    mainZone: 1,
    density: 0.08,
    color: '#D2643C',
    shape: 'cube',
  },
  {
    id: 2,
    key: 'mineral.cobaltine',
    value: 60,
    zones: [1, 2, 3],
    mainZone: 2,
    density: 0.05,
    color: '#3F7FE0',
    shape: 'tetra',
  },
  {
    id: 3,
    key: 'mineral.glimmerite',
    value: 150,
    zones: [2, 3],
    mainZone: 2,
    density: 0.04,
    color: '#E9E46A',
    shape: 'octa',
  },
  {
    id: 4,
    key: 'mineral.aurelite',
    value: 400,
    zones: [2, 3, 4],
    mainZone: 3,
    density: 0.03,
    color: '#FFC23A',
    shape: 'dodeca',
  },
  {
    id: 5,
    key: 'mineral.skyquartz',
    value: 900,
    zones: [3, 4],
    mainZone: 3,
    density: 0.025,
    color: '#8FE6FF',
    shape: 'prism',
  },
  {
    id: 6,
    key: 'mineral.emberstone',
    value: 2000,
    zones: [4, 5],
    mainZone: 4,
    density: 0.02,
    color: '#FF5522',
    shape: 'spike',
  },
  {
    id: 7,
    key: 'mineral.voidglass',
    value: 5000,
    zones: [4, 5],
    mainZone: 4,
    density: 0.012,
    color: '#8A3CFF',
    shape: 'shard',
  },
  {
    id: 8,
    key: 'mineral.starheart',
    value: 12000,
    zones: [5],
    mainZone: 5,
    density: 0.008,
    color: '#FF6FD8',
    shape: 'star',
  },
  {
    id: 9,
    key: 'mineral.corePearl',
    value: 30000,
    zones: [5],
    mainZone: 5,
    density: 0.003,
    lastRows: 50,
    color: '#FFF3D1',
    shape: 'pearl',
  },
];

export function mineralById(id: number): MineralConfig | undefined {
  return MINERALS.find((mineral) => mineral.id === id);
}

/** Highest mineral id; cargo arrays are sized by it. */
export const MAX_MINERAL_ID = Math.max(...MINERALS.map((mineral) => mineral.id));
