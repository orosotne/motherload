import {
  BoxGeometry,
  Color,
  Group,
  InstancedMesh,
  Matrix4,
  Euler,
  Quaternion,
  Vector3,
} from 'three';
import type { BufferGeometry, Material } from 'three';
import type { BlockId } from '../data/blocks';
import type { Grid } from '../world/grid';

/** How one cell is drawn: a cube in `material`, tinted `color`; null draws nothing. */
export interface BlockLook {
  material: Material;
  color: Color;
}

/** Decides the look of a cell; `row` matters because colours follow the zone (§8). */
export type BlockLooks = (block: BlockId, row: number) => BlockLook | null;

/** A mineral crystal sticking out of an ore block's face (§6: own shape and colour). */
export interface CrystalLook {
  geometry: BufferGeometry;
  material: Material;
}

/** Chunks within this many chunk rows of the camera are drawn (GAME_SPEC §9.7). */
const VISIBLE_CHUNK_ROWS = 2;
/** ±4 % brightness per block, so the grid does not look sterile (§8). */
const SHADE_VARIATION = 0.04;

/** Deterministic hash of a cell in [0, 1), so a rebuilt chunk keeps its shading. */
export function cellHash(col: number, row: number, salt = 0): number {
  let h = Math.imul(col + 0x9e37 + salt, 0x27d4eb2d) ^ Math.imul(row + 0x79b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 2 ** 32;
}

class ChunkView {
  /** Grid version this view was built from; −1 means never built. */
  version = -1;
  readonly meshes = new Map<Material | number, InstancedMesh>();

  constructor(
    readonly chunkCol: number,
    readonly chunkRow: number,
  ) {}
}

/**
 * Draws the grid chunk by chunk (GAME_SPEC §4, §9.6): per chunk one InstancedMesh per material
 * and one per mineral crystal, rebuilt only when that chunk changed; only chunks near the camera
 * are shown.
 */
export class ChunkRenderer {
  readonly group = new Group();
  private readonly chunks: ChunkView[] = [];
  private readonly cube = new BoxGeometry(1, 1, 1);
  private readonly matrix = new Matrix4();
  private readonly shade = new Color();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly euler = new Euler();
  private readonly scale = new Vector3(1, 1, 1);

  constructor(
    private readonly grid: Grid,
    private readonly looks: BlockLooks,
    private readonly crystals: (mineral: number) => CrystalLook | null,
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
        const look = this.looks(block, row);
        if (look) this.addCube(chunk, look, col, row);
        const mineral = this.grid.mineral(col, row);
        const crystal = mineral > 0 ? this.crystals(mineral) : null;
        if (crystal) this.addCrystal(chunk, mineral, crystal, col, row);
      }
    }
    for (const mesh of chunk.meshes.values()) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  private addCube(chunk: ChunkView, look: BlockLook, col: number, row: number): void {
    const mesh = this.meshFor(chunk, look.material, this.cube, look.material);
    const index = mesh.count++;
    mesh.setMatrixAt(index, this.matrix.makeTranslation(col, -row, 0));
    const shade = 1 + (cellHash(col, row) * 2 - 1) * SHADE_VARIATION;
    mesh.setColorAt(index, this.shade.copy(look.color).multiplyScalar(shade));
  }

  private addCrystal(
    chunk: ChunkView,
    mineral: number,
    crystal: CrystalLook,
    col: number,
    row: number,
  ): void {
    const mesh = this.meshFor(chunk, mineral, crystal.geometry, crystal.material);
    const index = mesh.count++;
    const turn = cellHash(col, row, 7) * Math.PI * 2;
    this.euler.set(0.4, turn, 0.3 * (cellHash(col, row, 3) - 0.5));
    // Half sunk into the block's front face, so it reads as embedded ore.
    this.position.set(col, -row, 0.5);
    this.matrix.compose(this.position, this.rotation.setFromEuler(this.euler), this.scale);
    mesh.setMatrixAt(index, this.matrix);
  }

  private meshFor(
    chunk: ChunkView,
    key: Material | number,
    geometry: BufferGeometry,
    material: Material,
  ): InstancedMesh {
    let mesh = chunk.meshes.get(key);
    if (!mesh) {
      mesh = new InstancedMesh(geometry, material, this.grid.chunkSize * this.grid.chunkSize);
      mesh.count = 0;
      // Chunk visibility is managed above; per-mesh culling would need bounds per rebuild.
      mesh.frustumCulled = false;
      chunk.meshes.set(key, mesh);
      this.group.add(mesh);
    }
    return mesh;
  }
}
