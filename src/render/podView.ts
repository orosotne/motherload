import { Group } from 'three';
import type { Pod } from '../sim/pod';
import type { Tiers } from '../sim/stats';
import { PodModel } from './podModel';

/** A running squash or stretch: the scale decays back to 1 (GAME_SPEC §5.3). */
interface Pulse {
  scaleX: number;
  scaleY: number;
  duration: number;
  left: number;
}

export interface PodDrawOptions {
  /** Squash and stretch switched on (§5.3). */
  pulses: boolean;
  /** Shake of the pod while drilling (§5.4); 0 turns it off. */
  drillShake: number;
  hidden: boolean;
  lift: number;
  tiers: Tiers;
}

const FLAME_FLICKER = 0.15;

/**
 * Draws the pod model between its last two simulation states: it faces where it drives, the
 * drill turns down for drilling down and spins and shakes while it bites (§5.4), squash and
 * stretch on landing and lift-off (§5.3), and a flame that scales with thrust (§5.10).
 */
export class PodView {
  readonly root = new Group();
  private readonly body = new Group();
  private readonly model: PodModel;
  private pulse: Pulse | null = null;
  private time = 0;
  private spin = 0;

  constructor(private readonly half: number) {
    this.model = new PodModel(half);
    this.body.add(this.model.root);
    this.root.add(this.body);
  }

  /** Squash (landing) or stretch (lift-off) that fades back to normal over `ms`. */
  startPulse(scaleX: number, scaleY: number, ms: number): void {
    const duration = ms / 1000;
    if (duration > 0) this.pulse = { scaleX, scaleY, duration, left: duration };
  }

  /**
   * Draws the pod between its last two simulation states. `lift` raises it while the rescue
   * drone tows it; `hidden` hides a destroyed pod.
   */
  update(pod: Pod, alpha: number, dt: number, options: PodDrawOptions): void {
    this.time += dt;
    this.model.setTiers(options.tiers);
    this.root.visible = !options.hidden;
    const x = pod.prevX + (pod.x - pod.prevX) * alpha;
    const y = pod.prevY + (pod.y - pod.prevY) * alpha + options.lift;
    let shakeX = 0;
    let shakeY = 0;
    if (pod.drill && options.drillShake > 0) {
      shakeX = Math.sin(this.time * 91) * options.drillShake;
      shakeY = Math.sin(this.time * 67 + 1.3) * options.drillShake;
    }
    this.root.position.set(x + shakeX, y - this.half + shakeY, 0);

    let scaleX = 1;
    let scaleY = 1;
    if (this.pulse) {
      this.pulse.left -= dt;
      const remaining = Math.max(this.pulse.left, 0) / this.pulse.duration;
      // Quick recovery that settles softly: k² of the remaining time.
      const k = remaining * remaining;
      if (options.pulses) {
        scaleX = 1 + (this.pulse.scaleX - 1) * k;
        scaleY = 1 + (this.pulse.scaleY - 1) * k;
      }
      if (this.pulse.left <= 0) this.pulse = null;
    }
    this.body.scale.set(scaleX, scaleY, scaleX);

    this.placeDrill(pod, dt);
    const { flame } = this.model;
    const flicker = 1 + Math.sin(this.time * 47) * FLAME_FLICKER * pod.thrust;
    flame.visible = pod.thrust > 0.02;
    flame.scale.set(0.6 + 0.4 * pod.thrust, pod.thrust * flicker, 0.6 + 0.4 * pod.thrust);
  }

  /** The model faces its side; the drill turns down while drilling down and spins while busy. */
  private placeDrill(pod: Pod, dt: number): void {
    const down = pod.drill?.dir === 'down';
    const side = pod.drill && !down ? (pod.drill.dir === 'left' ? -1 : 1) : pod.facing;
    this.model.root.scale.x = side;
    const mount = this.model.drillMount;
    if (down) {
      mount.position.set(0, this.half * 0.05, 0);
      mount.rotation.set(0, 0, -Math.PI / 2);
    } else {
      mount.position.set(this.half * 0.95, this.half * 0.62, 0);
      mount.rotation.set(0, 0, 0);
    }
    if (pod.drill) this.spin += dt * 24;
    mount.rotateX(this.spin);
  }
}
