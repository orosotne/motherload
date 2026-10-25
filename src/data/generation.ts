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
}

export const GENERATION: readonly ZoneGeneration[] = [
  { caveThreshold: 0.8, caveScale: 0.16, barriersPer100Rows: 0, barrierLength: [3, 5] },
  { caveThreshold: 0.66, caveScale: 0.13, barriersPer100Rows: 4, barrierLength: [3, 7] },
  { caveThreshold: 0.52, caveScale: 0.075, barriersPer100Rows: 5, barrierLength: [4, 9] },
  { caveThreshold: 0.58, caveScale: 0.1, barriersPer100Rows: 6, barrierLength: [4, 10] },
  { caveThreshold: 0.55, caveScale: 0.09, barriersPer100Rows: 6, barrierLength: [5, 12] },
];

/** Rows under the surface kept free of caves, so the town stands on solid ground. */
export const SOLID_TOP_ROWS = 6;
/** Caves are stretched sideways: vertical noise frequency relative to horizontal. */
export const CAVE_VERTICAL_STRETCH = 1.6;
/** Columns of the flat town plateau (§4: buildings in columns 14 to 26). */
export const TOWN_COLUMNS: readonly [number, number] = [14, 26];
/** Deepest dip of the gently rolling terrain beside the town, in rows. */
export const SURFACE_DIP_ROWS = 2;
