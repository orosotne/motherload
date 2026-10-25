import {
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  SphereGeometry,
} from 'three';
import { isSolid } from '../data/blocks';
import type { Grid } from '../world/grid';
import { Particles } from './effects/particles';
import { BLOOM_LAYER, toon } from './toon';

const FLOWER_COLORS = ['#FF6B9A', '#FFD166', '#9BF6FF', '#C77DFF', '#FFFFFF', '#FF9F43'];
const LANTERN_COLORS = ['#FFD166', '#FF6B9A', '#9BF6FF', '#8FE3B0'];
const FLOWERS_PER_COLUMN = 2;
/** Lanterns hang on a string over the town, columns 13 to 27, behind the play plane. */
const LANTERNS = 30;
const STRING = { from: 12.6, to: 27.4, height: 3.1, sag: 0.7, z: -1.0 };
/** Fireworks: often right after the ending, then now and then. */
const BURST_FAST = 0.9;
const BURST_SLOW = 5;
const FAST_SECONDS = 40;

/**
 * The planet blooms (GAME_SPEC §7): flowers on every solid surface block, lanterns strung over
 * the station and fireworks in the sky, from the ending on.
 */
export class Celebration {
  readonly root = new Group();
  private readonly stems: InstancedMesh;
  private readonly heads: InstancedMesh;
  private readonly lanterns: InstancedMesh;
  private readonly sparks = new Particles(600, true);
  private readonly matrix = new Matrix4();
  private readonly color = new Color();
  private surfaceVersion = -1;
  private since = 0;
  private nextBurst = 0.4;
  private seed = 7;

  constructor(private readonly grid: Grid) {
    const count = grid.width * FLOWERS_PER_COLUMN;
    this.stems = new InstancedMesh(
      new CylinderGeometry(0.025, 0.025, 0.3, 5).translate(0, 0.15, 0),
      toon({ color: '#5DBB63' }),
      count,
    );
    this.heads = new InstancedMesh(
      new IcosahedronGeometry(0.09, 0),
      toon({ color: '#ffffff' }),
      count,
    );
    this.lanterns = new InstancedMesh(
      new SphereGeometry(0.11, 10, 8),
      new MeshBasicMaterial({ color: '#ffffff' }),
      LANTERNS,
    );
    this.lanterns.layers.enable(BLOOM_LAYER);
    this.placeLanterns();
    this.root.add(this.stems, this.heads, this.lanterns, this.sparks.mesh);
    this.root.visible = false;
  }

  /** A cheap repeatable pseudo-random number in [0, 1); effects never touch game state. */
  private random(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  update(finished: boolean, dt: number): void {
    this.root.visible = finished;
    if (!finished) return;
    this.since += dt;
    this.placeFlowers();
    this.nextBurst -= dt;
    if (this.nextBurst <= 0) {
      this.nextBurst = this.since < FAST_SECONDS ? BURST_FAST : BURST_SLOW;
      this.firework();
    }
    this.sparks.update(dt);
  }

  /** Flowers on top of the surface blocks; dug-out ones lose theirs. */
  private placeFlowers(): void {
    const version = this.surfaceChunksVersion();
    if (version === this.surfaceVersion) return;
    this.surfaceVersion = version;
    let index = 0;
    for (let col = 0; col < this.grid.width; col++) {
      if (!isSolid(this.grid.get(col, 0))) continue;
      for (let i = 0; i < FLOWERS_PER_COLUMN; i++) {
        // Fixed spots per column, so a rebuild does not move the flowers.
        const x = col - 0.35 + ((col * 7 + i * 5) % 8) * 0.1;
        const z = -0.35 + ((col * 3 + i * 7) % 8) * 0.1;
        this.matrix.makeTranslation(x, 0.5, z);
        this.stems.setMatrixAt(index, this.matrix);
        this.matrix.makeTranslation(x, 0.82, z);
        this.heads.setMatrixAt(index, this.matrix);
        const tint = FLOWER_COLORS[(col + i * 3) % FLOWER_COLORS.length] ?? '#ffffff';
        this.heads.setColorAt(index, this.color.set(tint));
        index++;
      }
    }
    this.stems.count = index;
    this.heads.count = index;
    this.stems.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
    if (this.heads.instanceColor) this.heads.instanceColor.needsUpdate = true;
  }

  /** Changes to the surface row's chunks; any of them means the flowers may need a move. */
  private surfaceChunksVersion(): number {
    let sum = 0;
    for (let chunk = 0; chunk < this.grid.chunkCols; chunk++) sum += this.grid.chunkVersion(chunk);
    return sum;
  }

  private placeLanterns(): void {
    for (let i = 0; i < LANTERNS; i++) {
      const t = i / (LANTERNS - 1);
      const x = STRING.from + (STRING.to - STRING.from) * t;
      const y = STRING.height - STRING.sag * 4 * t * (1 - t);
      this.matrix.makeTranslation(x, y, STRING.z);
      this.lanterns.setMatrixAt(i, this.matrix);
      this.lanterns.setColorAt(
        i,
        this.color.set(LANTERN_COLORS[i % LANTERN_COLORS.length] ?? '#fff'),
      );
    }
  }

  private firework(): void {
    const x = 6 + this.random() * (this.grid.width - 12);
    const y = 6 + this.random() * 4;
    const tint = FLOWER_COLORS[Math.floor(this.random() * FLOWER_COLORS.length)] ?? '#ffffff';
    this.sparks.emit(x, y, tint, { count: 44, speed: 6, gravity: 2.5, life: 1.3, size: 0.12 });
    this.sparks.emit(x, y, '#ffffff', {
      count: 10,
      speed: 2.5,
      gravity: 1.5,
      life: 0.7,
      size: 0.1,
    });
  }
}
