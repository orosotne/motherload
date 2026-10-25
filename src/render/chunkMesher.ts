import { BoxGeometry, Color, Group, InstancedMesh, Matrix4, type Material } from 'three';
import type { BlockId } from '../data/blocks';
import type { Grid } from '../world/grid';

/** Material for a block type, or null for blocks that are not drawn as cubes. */
export type BlockMaterials = (block: BlockId) => Material | null;

/** Chunks within this many chunk rows of the camera are drawn (GAME_SPEC §9.7). */
const VISIBLE_CHUNK_ROWS = 2;
/** ±4 % brightness per block, so the grid does not look sterile (§8). */
const SHADE_VARIATION = 0.04;

/** Deterministic hash of a cell in [0, 1), so a rebuilt chunk keeps its shading. */
function cellHash(col: number, row: number): number {
  let h = Math.imul(col + 0x9e37, 0x27d4eb2d) ^ Math.imul(row + 0x79b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 2 ** 32;
}

class ChunkView {
  /** Grid version this view was built from; −1 means never built. */
  version = -1;
  readonly meshes = new Map<BlockId, InstancedMesh>();

  constructor(
    readonly chunkCol: number,
    readonly chunkRow: number,
  ) {}
}

/**
 * Draws the grid chunk by chunk (GAME_SPEC §4, §9.6): one InstancedMesh per chunk and block
 * type, rebuilt only when that chunk changed, and only chunks near the camera are shown.
 */
export class ChunkRenderer {
  readonly group = new Group();
  private readonly chunks: ChunkView[] = [];
  private readonly geometry = new BoxGeometry(1, 1, 1);
  private readonly matrix = new Matrix4();
  private readonly shade = new Color();

  constructor(
    private readonly grid: Grid,
    private readonly materials: BlockMaterials,
  ) {
    // Same order as Grid.chunkIndex: rows outside, columns inside.
    for (let row = 0; row < grid.chunkRows; row++) {
      for (let col = 0; col < grid.chunkCols; col++) this.chunks.push(new ChunkView(col, row));
    }
  }

  /** Shows the chunks around `focusRow` and rebuilds the ones that changed since last drawn. */
  update(focusRow: number): void {
    const focusChunkRow = Math.floor(focusRow / this.grid.chunkSize);
    this.chunks.forEach((chunk, index) => {
      const visible = Math.abs(chunk.chunkRow - focusChunkRow) <= VISIBLE_CHUNK_ROWS;
      for (const mesh of chunk.meshes.values()) mesh.visible = visible;
      if (!visible) return;
      const version = this.grid.chunkVersion(index);
      if (version === chunk.version) return;
      this.rebuild(chunk);
      chunk.version = version;
    });
  }

  private rebuild(chunk: ChunkView): void {
    const size = this.grid.chunkSize;
    for (const mesh of chunk.meshes.values()) mesh.count = 0;
    const lastRow = Math.min((chunk.chunkRow + 1) * size, this.grid.height);
    const lastCol = Math.min((chunk.chunkCol + 1) * size, this.grid.width);
    for (let row = chunk.chunkRow * size; row < lastRow; row++) {
      for (let col = chunk.chunkCol * size; col < lastCol; col++) {
        const block = this.grid.get(col, row);
        const material = this.materials(block);
        if (!material) continue;
        const mesh = this.meshFor(chunk, block, material);
        const index = mesh.count++;
        mesh.setMatrixAt(index, this.matrix.makeTranslation(col, -row, 0));
        const shade = 1 + (cellHash(col, row) * 2 - 1) * SHADE_VARIATION;
        mesh.setColorAt(index, this.shade.setScalar(shade));
      }
    }
    for (const mesh of chunk.meshes.values()) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  private meshFor(chunk: ChunkView, block: BlockId, material: Material): InstancedMesh {
    let mesh = chunk.meshes.get(block);
    if (!mesh) {
      const capacity = this.grid.chunkSize * this.grid.chunkSize;
      mesh = new InstancedMesh(this.geometry, material, capacity);
      mesh.count = 0;
      // Chunk visibility is managed above; per-mesh culling would need bounds updated per rebuild.
      mesh.frustumCulled = false;
      chunk.meshes.set(block, mesh);
      this.group.add(mesh);
    }
    return mesh;
  }
}
