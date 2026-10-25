import {
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Euler,
  Vector3,
} from 'three';
import { BLOOM_LAYER } from '../toon';

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  age: number;
  life: number;
  size: number;
  gravity: number;
  color: Color;
}

export interface EmitOptions {
  count: number;
  /** Launch speed in blocks per second. */
  speed: number;
  /** Bias upwards, in blocks per second. */
  lift?: number;
  /** Seconds a piece lives, give or take a third. */
  life?: number;
  size?: number;
  /** Fall acceleration; sparks float, debris drops. */
  gravity?: number;
  /** Spread of the starting point in blocks. */
  spread?: number;
}

/**
 * A pool of small tumbling cubes (§8): debris in a block's colour, dust, sparks. One instanced
 * mesh, so a burst costs one draw call. `glowing` pools feed the bloom.
 */
export class Particles {
  readonly mesh: InstancedMesh;
  private readonly alive: Particle[] = [];
  private readonly free: Particle[] = [];
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly euler = new Euler();
  private readonly scale = new Vector3();
  private seed = 1;

  constructor(capacity: number, glowing: boolean) {
    const material = new MeshBasicMaterial({ color: '#ffffff', transparent: glowing });
    this.mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), material, capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    if (glowing) this.mesh.layers.enable(BLOOM_LAYER);
    for (let i = 0; i < capacity; i++) {
      this.free.push({
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        spin: 0,
        age: 0,
        life: 1,
        size: 0.1,
        gravity: 0,
        color: new Color(),
      });
    }
  }

  /** A cheap repeatable pseudo-random number in [0, 1); effects never touch game state. */
  private random(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  emit(x: number, y: number, color: Color | string, options: EmitOptions): void {
    const { count, speed, lift = 0, life = 0.6, size = 0.1, gravity = 18, spread = 0.2 } = options;
    for (let i = 0; i < count; i++) {
      const particle = this.free.pop() ?? this.alive.shift();
      if (!particle) return;
      const angle = this.random() * Math.PI * 2;
      const power = speed * (0.4 + this.random() * 0.6);
      particle.x = x + (this.random() - 0.5) * spread;
      particle.y = y + (this.random() - 0.5) * spread;
      particle.z = 0.6 + this.random() * 0.3;
      particle.vx = Math.cos(angle) * power;
      particle.vy = Math.sin(angle) * power + lift;
      particle.vz = (this.random() - 0.3) * speed * 0.5;
      particle.spin = (this.random() - 0.5) * 20;
      particle.age = 0;
      particle.life = life * (0.67 + this.random() * 0.66);
      particle.size = size * (0.6 + this.random() * 0.8);
      particle.gravity = gravity;
      particle.color.set(color);
      this.alive.push(particle);
    }
  }

  update(dt: number): void {
    let index = 0;
    for (let i = this.alive.length - 1; i >= 0; i--) {
      const p = this.alive[i];
      if (!p) continue;
      p.age += dt;
      if (p.age >= p.life) {
        this.alive.splice(i, 1);
        this.free.push(p);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const fade = 1 - p.age / p.life;
      this.position.set(p.x, p.y, p.z);
      this.euler.set(p.age * p.spin, p.age * p.spin * 0.7, 0);
      this.scale.setScalar(p.size * (0.3 + 0.7 * fade));
      this.mesh.setMatrixAt(
        index,
        this.matrix.compose(this.position, this.rotation.setFromEuler(this.euler), this.scale),
      );
      this.mesh.setColorAt(index, p.color);
      index++;
    }
    this.mesh.count = index;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
