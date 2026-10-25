import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  SphereGeometry,
} from 'three';
import { RECOVERY } from '../data/economy';
import type { GameState } from '../sim/game';
import { toon } from './toon';

/** Share of the rescue spent flying in; the rest is the tow up. */
const ARRIVE = 0.45;
/** How high the drone lifts the pod before the screen fades, in blocks. */
const LIFT = 3;
const HOVER = 1.3;
const START_HEIGHT = 10;

function smooth(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return clamped * clamped * (3 - 2 * clamped);
}

/** Rescue progress from 0 (called) to 1 (at the surface), or null outside a rescue. */
export function rescueProgress(state: GameState): number | null {
  if (state.status.kind !== 'rescue') return null;
  return 1 - Math.max(state.status.left, 0) / RECOVERY.rescueSeconds;
}

/** How far the drone has lifted the pod, in blocks. */
export function towLift(progress: number | null): number {
  return progress === null ? 0 : smooth((progress - ARRIVE) / (1 - ARRIVE)) * LIFT;
}

/** The rescue drone (§3): flies down to a stranded pod and tows it up. */
export class DroneView {
  readonly root = new Group();
  private readonly rotors: Mesh[] = [];
  private readonly beacon: Mesh;
  private readonly cable: Mesh;
  private time = 0;

  constructor() {
    const metal = toon({ color: '#6B7385' });
    const body = new Mesh(new BoxGeometry(0.8, 0.2, 0.5), metal);
    for (const [x, z] of [
      [-0.45, -0.3],
      [0.45, -0.3],
      [-0.45, 0.3],
      [0.45, 0.3],
    ] as const) {
      const rotor = new Mesh(
        new CylinderGeometry(0.22, 0.22, 0.03, 12),
        toon({ color: '#C9CED8', transparent: true, opacity: 0.7 }),
      );
      rotor.position.set(x, 0.14, z);
      this.rotors.push(rotor);
      body.add(rotor);
    }
    this.beacon = new Mesh(
      new SphereGeometry(0.08, 10, 8),
      new MeshBasicMaterial({ color: '#FF4D4D' }),
    );
    this.beacon.position.set(0, -0.12, 0.26);
    this.cable = new Mesh(
      new CylinderGeometry(0.025, 0.025, 1, 6),
      new MeshBasicMaterial({ color: '#1E1E24' }),
    );
    this.root.add(body, this.beacon, this.cable);
    this.root.visible = false;
  }

  /** `podX`, `podY` is the pod's drawn centre, already lifted by the tow. */
  update(progress: number | null, podX: number, podY: number, dt: number): void {
    this.time += dt;
    this.root.visible = progress !== null;
    if (progress === null) return;
    const arrive = smooth(progress / ARRIVE);
    const height = START_HEIGHT + (HOVER - START_HEIGHT) * arrive;
    this.root.position.set(podX, podY + height, 0);
    for (const rotor of this.rotors) rotor.rotation.y = this.time * 40;
    this.beacon.visible = Math.sin(this.time * 12) > 0;
    const towing = progress >= ARRIVE;
    this.cable.visible = towing;
    this.cable.scale.y = height - 0.4;
    this.cable.position.y = -(height - 0.4) / 2 - 0.1;
  }
}
