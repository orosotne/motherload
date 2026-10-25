import { Color, Group, Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import type { EventBus } from '../../core/events';
import { Block, type BlockId } from '../../data/blocks';
import { mineralById } from '../../data/minerals';
import { zoneAt } from '../../data/zones';
import type { GameEvents } from '../../sim/events';
import type { GameState, SimSettings } from '../../sim/game';
import { rockColor } from '../palette';
import { BLOOM_LAYER } from '../toon';
import { Particles } from './particles';

const FLASH_SECONDS = 0.14;

/**
 * Juice that reacts to the game (§5, §8): debris in the block's colour while drilling and when a
 * block breaks (§5.4), sparks for minerals and a flash for valuable ones (§5.5), dust on hard
 * landings, fire and rubble for explosions.
 */
export class FeelEffects {
  readonly group = new Group();
  private readonly debris = new Particles(420, false);
  private readonly sparks = new Particles(240, true);
  private readonly flash: Mesh;
  private readonly flashMaterial = new MeshBasicMaterial({ color: '#ffffff', transparent: true });
  private flashAge = Infinity;
  private debrisDue = 0;
  private readonly color = new Color();

  constructor(
    private readonly state: GameState,
    private readonly settings: SimSettings,
    events: EventBus<GameEvents>,
  ) {
    this.flash = new Mesh(new SphereGeometry(1, 16, 12), this.flashMaterial);
    this.flash.layers.enable(BLOOM_LAYER);
    this.flash.visible = false;
    this.group.add(this.debris.mesh, this.sparks.mesh, this.flash);

    events.on('BlockBroken', ({ col, row, block, mineral }) => {
      this.debris.emit(col, -row, this.blockColor(block, row, mineral), {
        count: 10,
        speed: 4,
        lift: 2,
        size: 0.14,
      });
    });
    events.on('MineralCollected', ({ col, row, mineral, value }) => {
      const color = mineralById(mineral)?.color ?? '#ffffff';
      this.sparks.emit(col, -row, color, { count: 12, speed: 3.5, lift: 1, gravity: 2, life: 0.5 });
      const { hitstop } = this.settings.feel;
      if (hitstop.enabled && value >= hitstop.minValue) {
        this.flashAge = 0;
        this.flash.position.set(col, -row, 0.7);
        this.sparks.emit(col, -row, '#ffffff', { count: 18, speed: 6, gravity: 1, life: 0.4 });
      }
    });
    events.on('RelicFound', ({ col, row }) => {
      this.sparks.emit(col, -row, '#FFD166', { count: 40, speed: 5, lift: 2, gravity: 1, life: 1 });
    });
    events.on('Landed', ({ speed }) => {
      if (speed < 6) return;
      const { pod } = this.state;
      this.debris.emit(pod.x, pod.y - 0.4, '#C9B79C', {
        count: Math.round(speed),
        speed: 2.5,
        lift: 1.5,
        size: 0.1,
        gravity: 6,
        spread: 0.7,
      });
    });
    events.on('Explosion', ({ col, row, radius }) => {
      const zone = rockColor(zoneAt(Math.max(row, 0)).index);
      this.debris.emit(col, -row, zone, {
        count: 26 + radius * 10,
        speed: 7,
        lift: 3,
        size: 0.18,
        spread: radius * 2,
      });
      this.sparks.emit(col, -row, '#FFB347', { count: 24, speed: 8, gravity: 3, life: 0.5 });
      this.sparks.emit(col, -row, '#FF5A14', { count: 16, speed: 5, gravity: 2, life: 0.7 });
    });
    events.on('Destroyed', () => {
      const { pod } = this.state;
      this.debris.emit(pod.x, pod.y, '#E8A15A', { count: 30, speed: 7, lift: 3, size: 0.16 });
      this.sparks.emit(pod.x, pod.y, '#FFB347', { count: 30, speed: 8, gravity: 2, life: 0.6 });
    });
  }

  /** The colour debris should have: the zone's rock, with a dash of the mineral in ore. */
  private blockColor(block: BlockId, row: number, mineral: number): Color {
    if (block === Block.Corestone) return this.color.set('#8B93A6');
    this.color.copy(rockColor(zoneAt(row).index));
    const ore = mineralById(mineral)?.color;
    if (block === Block.Ore && ore) this.color.lerp(new Color(ore), 0.35);
    return this.color;
  }

  update(dt: number): void {
    const { pod, grid } = this.state;
    const life = this.settings.feel.drillLife;
    if (pod.drill && life.enabled) {
      this.debrisDue += dt * life.debrisPerSecond;
      const { col, row } = pod.drill;
      const color = this.blockColor(grid.get(col, row), row, grid.mineral(col, row));
      // Where the bit bites: between the pod and the block's centre.
      const x = pod.x + (col - pod.x) * 0.55;
      const y = pod.y + (-row - pod.y) * 0.55;
      while (this.debrisDue >= 1) {
        this.debrisDue -= 1;
        this.debris.emit(x, y, color, { count: 1, speed: 3, lift: 2.5, size: 0.09, life: 0.45 });
      }
    } else {
      this.debrisDue = 0;
    }
    this.debris.update(dt);
    this.sparks.update(dt);

    this.flashAge += dt;
    const t = this.flashAge / FLASH_SECONDS;
    this.flash.visible = t < 1;
    if (t < 1) {
      this.flash.scale.setScalar(0.3 + t * 0.9);
      this.flashMaterial.opacity = 1 - t;
    }
  }
}
