import {
  Color,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
} from 'three';
import type { BlockId } from '../data/blocks';
import type { Grid } from '../world/grid';
import { BLOOM_LAYER } from './toon';

/** How one cell is drawn: `geometry` in `material`, tinted `color`; null draws nothing. */
export interface BlockLook {
  material: Material;
  color: Color;
  geometry: BufferGeometry;
  /** Casts and receives the sun's shadows. */
  shadows: boolean;
  /** Feeds the bloom (§8). */
  glow?: boolean;
}

/**
 * Something sitting in a block's front face: a mineral crystal (§6: own shape and colour), the
 * bubbles of a gas pocket or a relic's emblem. `key` groups equal looks into one mesh.
 */
export interface DecorLook {
  key: number;
  geometry: BufferGeometry;
  material: Material;
  /** Turned at random per cell, like crystals; otherwise facing the camera. */
  turn: boolean;
  glow: boolean;
  /** Inverted-hull outline drawn with the same instances (§8). */
  outline?: Material;
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
  readonly meshes = new Map<string, InstancedMesh>();
  readonly outlines = new Map<string, InstancedMesh>();

  constructor(
    readonly chunkCol: number,
    readonly chunkRow: number,
  ) {}
}

/**
 * Draws the grid chunk by chunk (GAME_SPEC §4, §9.6): per chunk one InstancedMesh per look,
 * rebuilt only when that chunk changed. Chunks near the camera are shown and culled by their
 * bounds, so the draw calls stay within budget (§9).
 */
export class ChunkRenderer {
  readonly group = new Group();
  private readonly chunks: ChunkView[] = [];
  private readonly matrix = new Matrix4();
  private readonly shade = new Color();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly euler = new Euler();
  private readonly scale = new Vector3(1, 1, 1);
  private readonly ids = new Map<object, number>();

  constructor(
    private readonly grid: Grid,
    private readonly looks: (block: BlockId, row: number) => BlockLook | null,
    private readonly decor: (block: BlockId, mineral: number) => DecorLook | null,
  ) {
    // Same order as Grid.chunkIndex: rows outside, columns inside.
    for (let row = 0; row < grid.chunkRows; row++) {
      for (let col = 0; col < grid.chunkCols; col++) this.chunks.push(new ChunkView(col, row));
    }
  }

  /** Forces every chunk to be rebuilt, e.g. after a look was switched in the debug panel. */
  invalidate(): void {
    for (const chunk of this.chunks) chunk.version = -1;
  }

  /** Shows the chunks around `focusRow` and rebuilds the ones that changed since last drawn. */
  update(focusRow: number): void {
    const focusChunkRow = Math.floor(focusRow / this.grid.chunkSize);
    this.chunks.forEach((chunk, index) => {
      const visible = Math.abs(chunk.chunkRow - focusChunkRow) <= VISIBLE_CHUNK_ROWS;
      for (const mesh of chunk.meshes.values()) mesh.visible = visible && mesh.count > 0;
      for (const mesh of chunk.outlines.values()) mesh.visible = visible && mesh.count > 0;
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
        const decor = this.decor(block, this.grid.mineral(col, row));
        if (decor) this.addDecor(chunk, decor, col, row);
      }
    }
    for (const [key, mesh] of chunk.meshes) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.visible = mesh.count > 0;
      if (mesh.count > 0) mesh.computeBoundingSphere();
      const outline = chunk.outlines.get(key);
      if (outline) {
        outline.count = mesh.count;
        outline.visible = mesh.visible;
        outline.boundingSphere = mesh.boundingSphere;
      }
    }
  }

  /** A stable short id per material or geometry, for mesh keys. */
  private id(thing: object): number {
    let id = this.ids.get(thing);
    if (id === undefined) {
      id = this.ids.size;
      this.ids.set(thing, id);
    }
    return id;
  }

  private addCube(chunk: ChunkView, look: BlockLook, col: number, row: number): void {
    const key = `b${this.id(look.material)}-${this.id(look.geometry)}`;
    const mesh = this.meshFor(chunk, key, look.geometry, look.material, look.glow ?? false);
    if (mesh.count === 0) {
      mesh.castShadow = look.shadows;
      mesh.receiveShadow = look.shadows;
    }
    const index = mesh.count++;
    mesh.setMatrixAt(index, this.matrix.makeTranslation(col, -row, 0));
    const shade = 1 + (cellHash(col, row) * 2 - 1) * SHADE_VARIATION;
    mesh.setColorAt(index, this.shade.copy(look.color).multiplyScalar(shade));
  }

  private addDecor(chunk: ChunkView, decor: DecorLook, col: number, row: number): void {
    const key = `d${decor.key}`;
    const mesh = this.meshFor(chunk, key, decor.geometry, decor.material, decor.glow);
    if (decor.outline && !chunk.outlines.has(key)) {
      // The outline shares the crystal's instance matrices: no second copy to keep in sync.
      const outline = new InstancedMesh(decor.geometry, decor.outline, mesh.instanceMatrix.count);
      outline.instanceMatrix = mesh.instanceMatrix;
      outline.frustumCulled = true;
      chunk.outlines.set(key, outline);
      this.group.add(outline);
    }
    const index = mesh.count++;
    if (decor.turn) {
      const turn = cellHash(col, row, 7) * Math.PI * 2;
      this.euler.set(0.4, turn, 0.3 * (cellHash(col, row, 3) - 0.5));
    } else {
      this.euler.set(0, 0, 0);
    }
    // Half sunk into the block's front face, so it reads as embedded.
    this.position.set(col, -row, 0.5);
    this.matrix.compose(this.position, this.rotation.setFromEuler(this.euler), this.scale);
    mesh.setMatrixAt(index, this.matrix);
  }

  private meshFor(
    chunk: ChunkView,
    key: string,
    geometry: BufferGeometry,
    material: Material,
    glow: boolean,
  ): InstancedMesh {
    let mesh = chunk.meshes.get(key);
    if (!mesh) {
      mesh = new InstancedMesh(geometry, material, this.grid.chunkSize * this.grid.chunkSize);
      mesh.count = 0;
      // Bounds come from the instances after each rebuild (computeBoundingSphere).
      mesh.frustumCulled = true;
      if (glow) mesh.layers.enable(BLOOM_LAYER);
      chunk.meshes.set(key, mesh);
      this.group.add(mesh);
    }
    return mesh;
  }
}
