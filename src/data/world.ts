/** World layout (GAME_SPEC §4). Rows grow downwards from the surface row 0; columns go right. */
export interface WorldConfig {
  /** Columns. */
  width: number;
  /** Rows of ground from the surface down. */
  height: number;
  /** Chunk edge in blocks: only touched chunks are rebuilt (§4, §9.6). */
  chunkSize: number;
  /** Depth of one block row in metres, for the HUD and depth rules (§4). */
  metersPerBlock: number;
  /** Rows of open sky above the surface; the pod cannot fly higher. */
  skyRows: number;
  /** Column the pod starts in. */
  spawnCol: number;
}

export const WORLD: Readonly<WorldConfig> = {
  width: 40,
  height: 100,
  chunkSize: 20,
  metersPerBlock: 4,
  skyRows: 12,
  spawnCol: 20,
};
