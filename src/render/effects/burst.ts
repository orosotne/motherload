import { Mesh, MeshBasicMaterial, SphereGeometry } from 'three';

/** A quick expanding fireball, for a destroyed pod (F4 adds particles). */
export class Burst {
  readonly mesh: Mesh;
  private readonly material = new MeshBasicMaterial({ color: '#FF9F43', transparent: true });
  private age = Infinity;

  constructor(
    private readonly seconds = 0.55,
    private readonly radius = 2.2,
  ) {
    this.mesh = new Mesh(new SphereGeometry(1, 20, 14), this.material);
    this.mesh.visible = false;
  }

  start(x: number, y: number): void {
    this.age = 0;
    this.mesh.position.set(x, y, 0.3);
  }

  update(dt: number): void {
    this.age += dt;
    const t = this.age / this.seconds;
    this.mesh.visible = t < 1;
    if (t >= 1) return;
    const scale = 0.3 + (1 - (1 - t) * (1 - t)) * this.radius;
    this.mesh.scale.setScalar(scale);
    this.material.opacity = 1 - t;
  }
}
