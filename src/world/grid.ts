import { Block, type BlockId } from '../data/blocks';

/**
 * The world grid (GAME_SPEC §9.6): one byte of block type and one byte of mineral id per cell,
 * split into square chunks. Every change bumps the chunk's version, so renderers rebuild only
 * the chunks that changed.
 *
 * Coordinates: column `col` grows to the right, row `row` grows downwards from the surface row 0.
 */
export class Grid {
  readonly width: number;
  readonly height: number;
  readonly chunkSize: number;
  readonly chunkCols: number;
  readonly chunkRows: number;
  /** Rows of open sky above the surface; higher up the world is closed. */
  readonly skyRows: number;

  private readonly blocks: Uint8Array;
  private readonly minerals: Uint8Array;
  private readonly versions: Uint32Array;

  constructor(width: number, height: number, chunkSize: number, skyRows: number) {
    if (width <= 0 || height <= 0 || chunkSize <= 0) {
      throw new RangeError('Grid needs a positive size');
    }
    this.width = width;
    this.height = height;
    this.chunkSize = chunkSize;
    this.skyRows = skyRows;
    this.chunkCols = Math.ceil(width / chunkSize);
    this.chunkRows = Math.ceil(height / chunkSize);
    this.blocks = new Uint8Array(width * height);
    this.minerals = new Uint8Array(width * height);
    this.versions = new Uint32Array(this.chunkCols * this.chunkRows);
  }

  inside(col: number, row: number): boolean {
    return col >= 0 && col < this.width && row >= 0 && row < this.height;
  }

  /**
   * Block at a cell. Outside the grid there is open sky above the surface (up to `skyRows`)
   * and an indestructible border everywhere else.
   */
  get(col: number, row: number): BlockId {
    if (this.inside(col, row)) {
      return (this.blocks[row * this.width + col] ?? Block.Bedrock) as BlockId;
    }
    const inSky = row < 0 && row >= -this.skyRows && col >= 0 && col < this.width;
    return inSky ? Block.Empty : Block.Bedrock;
  }

  /** Mineral id stored with an ore block; 0 means none. */
  mineral(col: number, row: number): number {
    return this.inside(col, row) ? (this.minerals[row * this.width + col] ?? 0) : 0;
  }

  set(col: number, row: number, block: BlockId, mineral = 0): void {
    if (!this.inside(col, row)) {
      throw new RangeError(`Cell ${col},${row} is outside the grid`);
    }
    const index = row * this.width + col;
    this.blocks[index] = block;
    this.minerals[index] = mineral;
    this.bump(this.chunkIndex(col, row));
  }

  /** Fills every cell with one block, e.g. for test worlds. */
  fill(block: BlockId): void {
    this.blocks.fill(block);
    this.minerals.fill(0);
    for (let i = 0; i < this.versions.length; i++) this.bump(i);
  }

  chunkIndex(col: number, row: number): number {
    const chunkCol = Math.floor(col / this.chunkSize);
    const chunkRow = Math.floor(row / this.chunkSize);
    return chunkRow * this.chunkCols + chunkCol;
  }

  /** Increases whenever a cell of the chunk changes. */
  chunkVersion(index: number): number {
    return this.versions[index] ?? 0;
  }

  private bump(index: number): void {
    this.versions[index] = (this.versions[index] ?? 0) + 1;
  }
}
