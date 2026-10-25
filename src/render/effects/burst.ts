import { Mesh, MeshBasicMaterial, SphereGeometry } from 'three';

/** A quick expanding fireball, for a destroyed pod and explosions (F4 adds particles). */
export class Burst {
  readonly mesh: Mesh;
  private readonly material = new MeshBasicMaterial({ color: '#FF9F43', transparent: true });
  private age = Infinity;
  private radius: number;

  constructor(
    private readonly seconds = 0.55,
    private readonly defaultRadius = 2.2,
  ) {
    this.radius = defaultRadius;
    this.mesh = new Mesh(new SphereGeometry(1, 20, 14), this.material);
    this.mesh.visible = false;
  }

  start(x: number, y: number, radius = this.defaultRadius): void {
    this.age = 0;
    this.radius = radius;
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
