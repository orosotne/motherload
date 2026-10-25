import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Tiers } from '../sim/stats';
import { BLOOM_LAYER, outlineMaterial, toon } from './toon';

/**
 * Hull plating per hull tier: cream, teal, steel, plum, rose, gold. Cream first, because the
 * first zone is orange dirt and the pod must stand out against it.
 */
const HULL_COLORS = ['#F4F1DE', '#3FB8AF', '#8FA3BF', '#B08BD0', '#E85D75', '#F2C14E'];
/** Drill steel per drill tier, from plain grey to gold. */
const DRILL_COLORS = ['#7A7F87', '#8C96A3', '#9FB3C8', '#B7C9D9', '#D9C27A', '#F2D16B'];

const OUTLINE = 0.035;

/**
 * The pod as a low-poly toy (§8): body, cabin, drill, nozzle, wheels, tank, cargo box, cooling
 * fins and headlights, built from primitives. Every upgrade tier shows: a bigger drill, a larger
 * tank, more fins, stronger lights, a new paint job. The pivot sits at the bottom centre; +x is
 * the front.
 */
export class PodModel {
  readonly root = new Group();
  /** Turns towards the drilling direction; holds the drill bit. */
  readonly drillMount = new Group();
  readonly flame: Mesh;
  private readonly parts = new Group();
  private readonly outline = outlineMaterial(OUTLINE);
  private shown = '';

  constructor(private readonly half: number) {
    const flameGeometry = new ConeGeometry(half * 0.42, 0.7, 10);
    // Tip down, base at the nozzle.
    flameGeometry.rotateX(Math.PI);
    flameGeometry.translate(0, -0.35, 0);
    this.flame = new Mesh(flameGeometry, new MeshBasicMaterial({ color: '#FFB347' }));
    this.flame.layers.enable(BLOOM_LAYER);
    this.root.add(this.parts, this.drillMount, this.flame);
  }

  /** Rebuilds the parts when the upgrades changed. */
  setTiers(tiers: Tiers): void {
    const key = JSON.stringify(tiers);
    if (key === this.shown) return;
    this.shown = key;
    for (const child of [...this.parts.children, ...this.drillMount.children]) {
      child.removeFromParent();
    }
    this.build(tiers);
  }

  private add(geometry: BufferGeometry, material: Material, x: number, y: number, z = 0): Mesh {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    const hull = new Mesh(geometry, this.outline);
    mesh.add(hull);
    this.parts.add(mesh);
    return mesh;
  }

  private build(tiers: Tiers): void {
    const h = this.half;
    const paint = toon({ color: HULL_COLORS[tiers.hull] ?? HULL_COLORS[0] });
    const dark = toon({ color: '#3A3340' });
    const metal = toon({ color: '#9AA3AE' });

    this.add(new RoundedBoxGeometry(h * 2, h * 1.05, h * 1.5, 2, 0.06), paint, 0, h * 0.72);
    const glass = toon({ color: '#9BF6FF', emissive: '#2EC4B6', emissiveIntensity: 0.25 });
    this.add(
      new SphereGeometry(h * 0.48, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      glass,
      -h * 0.15,
      h * 1.22,
    );

    // Wheels, seen from the front as discs.
    for (const x of [-h * 0.55, h * 0.55]) {
      const wheel = this.add(
        new CylinderGeometry(h * 0.28, h * 0.28, h * 0.3, 14),
        dark,
        x,
        h * 0.26,
        h * 0.62,
      );
      wheel.rotation.x = Math.PI / 2;
    }

    // Fuel tank on the back: grows with the tank tier.
    const tank = h * (0.22 + tiers.tank * 0.045);
    const tankMesh = this.add(
      new CylinderGeometry(tank, tank, h * 1.2, 12),
      metal,
      -h * 1.05,
      h * 0.8,
    );
    tankMesh.rotation.x = Math.PI / 2;

    // Cargo crate on top: grows with the cargo tier.
    const crate = h * (0.32 + tiers.cargo * 0.05);
    this.add(
      new BoxGeometry(crate, crate * 0.8, crate),
      toon({ color: '#C08A52' }),
      h * 0.45,
      h * 1.25 + crate * 0.4,
    );

    // Cooling fins: one more per cooling tier.
    for (let i = 0; i < tiers.cooling; i++) {
      this.add(
        new BoxGeometry(h * 0.06, h * 0.32, h * 0.9),
        metal,
        -h * (0.55 - i * 0.13),
        h * 1.33,
      );
    }

    // Engine nozzle under the body: wider with the engine tier.
    const nozzle = h * (0.3 + tiers.engine * 0.04);
    this.add(new CylinderGeometry(nozzle * 0.8, nozzle, h * 0.25, 12), dark, 0, h * 0.12);

    // Headlights on the front: bigger and more of them with the light tier.
    const light = toon({ color: '#FFF4D6', emissive: '#FFE9A8', emissiveIntensity: 1.2 });
    const lamps = tiers.light >= 3 ? [h * 0.95, h * 0.62] : [h * 0.85];
    for (const y of lamps) {
      const lamp = new Mesh(new CircleGeometry(h * (0.12 + tiers.light * 0.02), 12), light);
      lamp.position.set(h * 1.01, y, h * 0.2);
      lamp.rotation.y = Math.PI / 2;
      lamp.layers.enable(BLOOM_LAYER);
      this.parts.add(lamp);
    }

    // The drill: longer and brighter with each tier, with rings for a screw look.
    const length = h * (0.55 + tiers.drill * 0.09);
    const steel = toon({ color: DRILL_COLORS[tiers.drill] ?? DRILL_COLORS[0] });
    const bit = new Mesh(new ConeGeometry(h * 0.42, length, 14), steel);
    bit.rotation.z = -Math.PI / 2;
    bit.position.x = length / 2;
    bit.add(new Mesh(bit.geometry, this.outline));
    this.drillMount.add(bit);
    for (let i = 1; i <= 2; i++) {
      const ring = new Mesh(new TorusGeometry(h * 0.42 * (1 - i * 0.3), h * 0.04, 6, 16), dark);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = length * i * 0.3;
      this.drillMount.add(ring);
    }
    this.drillMount.position.set(h * 0.95, h * 0.62, 0);
    this.flame.position.set(0, 0, 0);
  }
}
