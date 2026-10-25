import {
  BoxGeometry,
  ConeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from 'three';
import type { Pod } from '../sim/pod';

/** A running squash or stretch: the scale decays back to 1 (GAME_SPEC §5.3). */
interface Pulse {
  scaleX: number;
  scaleY: number;
  duration: number;
  left: number;
}

const FLAME_LENGTH = 0.7;
const FLAME_FLICKER = 0.15;

/**
 * F1 pod: an orange cube with a drill bit showing where it faces or drills, and a flame under it
 * that scales with thrust (§5.10). The pivot is at the bottom, so squashing keeps it on the ground.
 */
export class PodView {
  readonly root = new Group();
  private readonly body = new Group();
  private readonly bit: Mesh;
  private readonly flame: Mesh;
  private pulse: Pulse | null = null;
  private time = 0;

  constructor(private readonly half: number) {
    const size = half * 2;
    const hull = new Mesh(
      new BoxGeometry(size, size, size),
      new MeshStandardMaterial({ color: '#E8A15A', roughness: 0.5 }),
    );
    hull.position.y = half;

    this.bit = new Mesh(
      new ConeGeometry(half * 0.45, half * 0.6, 12),
      new MeshStandardMaterial({ color: '#5b5f66', metalness: 0.4, roughness: 0.4 }),
    );
    this.body.add(hull, this.bit);

    const flameGeometry = new ConeGeometry(half * 0.5, FLAME_LENGTH, 12);
    // Tip down, base at the pod's bottom.
    flameGeometry.rotateX(Math.PI);
    flameGeometry.translate(0, -FLAME_LENGTH / 2, 0);
    this.flame = new Mesh(flameGeometry, new MeshBasicMaterial({ color: '#FFB347' }));
    this.root.add(this.body, this.flame);
  }

  /** Squash (landing) or stretch (lift-off) that fades back to normal over `ms`. */
  startPulse(scaleX: number, scaleY: number, ms: number): void {
    const duration = ms / 1000;
    if (duration > 0) this.pulse = { scaleX, scaleY, duration, left: duration };
  }

  update(pod: Pod, alpha: number, dt: number, pulsesEnabled: boolean): void {
    this.time += dt;
    const x = pod.prevX + (pod.x - pod.prevX) * alpha;
    const y = pod.prevY + (pod.y - pod.prevY) * alpha;
    this.root.position.set(x, y - this.half, 0);

    let scaleX = 1;
    let scaleY = 1;
    if (this.pulse) {
      this.pulse.left -= dt;
      const remaining = Math.max(this.pulse.left, 0) / this.pulse.duration;
      // Quick recovery that settles softly: k² of the remaining time.
      const k = remaining * remaining;
      if (pulsesEnabled) {
        scaleX = 1 + (this.pulse.scaleX - 1) * k;
        scaleY = 1 + (this.pulse.scaleY - 1) * k;
      }
      if (this.pulse.left <= 0) this.pulse = null;
    }
    this.body.scale.set(scaleX, scaleY, scaleX);

    this.placeBit(pod);
    const flicker = 1 + Math.sin(this.time * 47) * FLAME_FLICKER * pod.thrust;
    this.flame.visible = pod.thrust > 0.02;
    this.flame.scale.set(0.6 + 0.4 * pod.thrust, pod.thrust * flicker, 0.6 + 0.4 * pod.thrust);
  }

  /** The drill bit points down while drilling down, otherwise to the side the pod faces. */
  private placeBit(pod: Pod): void {
    const reach = this.half * 1.3;
    if (pod.drill?.dir === 'down') {
      this.bit.position.set(0, -this.half * 0.3 + 0.02, 0);
      this.bit.rotation.set(0, 0, Math.PI);
      return;
    }
    const side = pod.drill ? (pod.drill.dir === 'left' ? -1 : 1) : pod.facing;
    this.bit.position.set(side * reach, this.half, 0);
    this.bit.rotation.set(0, 0, (side * -Math.PI) / 2);
  }
}
