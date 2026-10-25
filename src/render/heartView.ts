import { Color, Group, IcosahedronGeometry, Mesh, PointLight, TorusGeometry } from 'three';
import { FINALE, HEART } from '../data/story';
import type { GameState } from '../sim/game';
import { BLOOM_LAYER, outlineMaterial, toon } from './toon';

/** Heart colours: a dying ember before, a bright fire once it burns again (§7). */
const DORMANT = new Color('#7A2E5C');
const LIT = new Color('#FFB347');
const RING = '#F2C14E';

/** A heartbeat, "lub-dub": two quick swells per beat, `t` in beats. */
export function heartbeat(t: number): number {
  const phase = t - Math.floor(t);
  const lub = Math.exp(-((phase / 0.07) ** 2));
  const dub = 0.6 * Math.exp(-(((phase - 0.22) / 0.07) ** 2));
  return lub + dub;
}

/**
 * The Heart of Tumbra in its chamber (GAME_SPEC §7): a faceted crystal over its 2 × 2 cells,
 * ringed in the Builders' gold. Before the finale it beats slowly and dimly, fading; while it
 * catches fire it brightens, and from then on it beats fast and bright.
 */
export class HeartView {
  readonly root = new Group();
  private readonly crystal: Mesh;
  private readonly material = toon({ color: '#ffffff', emissive: '#ffffff' });
  private readonly ring: Mesh;
  private readonly light: PointLight;
  private readonly color = new Color();
  private time = 0;

  constructor() {
    const geometry = new IcosahedronGeometry(0.85, 0).scale(1, 1.1, 0.75);
    this.crystal = new Mesh(geometry, this.material);
    this.crystal.layers.enable(BLOOM_LAYER);
    const outline = new Mesh(geometry, outlineMaterial(0.04));
    this.crystal.add(outline);
    this.ring = new Mesh(new TorusGeometry(1.15, 0.07, 8, 40), toon({ color: RING }));
    this.light = new PointLight('#FF8A3D', 0, 9, 1.4);
    this.light.position.set(0, 0, 1.6);
    this.root.add(this.crystal, this.ring, this.light);
    const x = (HEART.cols[0] + HEART.cols[1]) / 2;
    const y = -(HEART.rows[0] + HEART.rows[1]) / 2;
    this.root.position.set(x, y, 0);
  }

  update(state: GameState, dt: number): void {
    this.time += dt;
    const finale = state.finale;
    // How much it burns: 0 fading, rising during the ignition, 1 once it is lit.
    let fire = state.story.finished || finale?.phase === 'escape' ? 1 : 0;
    if (finale?.phase === 'ignite') fire = 1 - Math.max(finale.left, 0) / FINALE.igniteSeconds;
    const bpm = 30 + 70 * fire;
    const beat = heartbeat((this.time * bpm) / 60);
    this.color.copy(DORMANT).lerp(LIT, fire);
    this.material.color.copy(this.color);
    this.material.emissive.copy(this.color);
    this.material.emissiveIntensity = 0.25 + 0.45 * fire + beat * (0.15 + 0.35 * fire);
    this.crystal.scale.setScalar(1 + beat * (0.04 + 0.06 * fire));
    this.crystal.rotation.y = this.time * (0.2 + 0.6 * fire);
    this.ring.rotation.set(Math.PI / 2 + Math.sin(this.time * 0.5) * 0.25, 0, this.time * 0.3);
    this.light.color.copy(this.color);
    this.light.intensity = 1.2 + 6 * fire + beat * 1.5;
  }
}
