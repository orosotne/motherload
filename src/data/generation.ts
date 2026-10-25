/**
 * World generation per zone (GAME_SPEC §4). Index 0 is zone 1. Caves come from 2D simplex noise:
 * a cell is a cave where the noise exceeds the threshold, so lower thresholds mean more caves.
 */
export interface ZoneGeneration {
  caveThreshold: number;
  /** Noise frequency per block; lower makes larger caves. */
  caveScale: number;
  /** Corestone barriers per 100 rows. */
  barriersPer100Rows: number;
  /** Shortest and longest barrier in blocks; never the full width (§4). */
  barrierLength: readonly [number, number];
  /** Share of base-material blocks that are gas pockets (§7: zones 2 to 5). */
  gasDensity: number;
  /** Chance that a cave floor cell holds lava, making pools (§7: zones 4 and 5). */
  lavaFloorChance: number;
  /** Share of base-material blocks replaced by small lava pockets. */
  lavaPocketDensity: number;
}

export const GENERATION: readonly ZoneGeneration[] = [
  {
    caveThreshold: 0.8,
    caveScale: 0.16,
    barriersPer100Rows: 0,
    barrierLength: [3, 5],
    gasDensity: 0,
    lavaFloorChance: 0,
    lavaPocketDensity: 0,
  },
  {
    caveThreshold: 0.66,
    caveScale: 0.13,
    barriersPer100Rows: 4,
    barrierLength: [3, 7],
    gasDensity: 0.012,
    lavaFloorChance: 0,
    lavaPocketDensity: 0,
  },
  {
    caveThreshold: 0.52,
    caveScale: 0.075,
    barriersPer100Rows: 5,
    barrierLength: [4, 9],
    gasDensity: 0.015,
    lavaFloorChance: 0,
    lavaPocketDensity: 0,
  },
  {
    caveThreshold: 0.58,
    caveScale: 0.1,
    barriersPer100Rows: 6,
    barrierLength: [4, 10],
    gasDensity: 0.018,
    lavaFloorChance: 0.3,
    lavaPocketDensity: 0.006,
  },
  {
    caveThreshold: 0.55,
    caveScale: 0.09,
    barriersPer100Rows: 6,
    barrierLength: [5, 12],
    gasDensity: 0.02,
    lavaFloorChance: 0.4,
    lavaPocketDensity: 0.008,
  },
];

/** Rows under the surface kept free of caves, so the town stands on solid ground. */
export const SOLID_TOP_ROWS = 6;
/** Caves are stretched sideways: vertical noise frequency relative to horizontal. */
export const CAVE_VERTICAL_STRETCH = 1.6;
/** Columns of the flat town plateau (§4: buildings in columns 14 to 26). */
export const TOWN_COLUMNS: readonly [number, number] = [14, 26];
/** Deepest dip of the gently rolling terrain beside the town, in rows. */
export const SURFACE_DIP_ROWS = 2;
