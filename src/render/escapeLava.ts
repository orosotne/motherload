import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PointLight } from 'three';
import type { GameState } from '../sim/game';
import { Particles } from './effects/particles';
import { BLOOM_LAYER } from './toon';

/** Rows of lava drawn under its surface: enough to fill the screen below it. */
const BODY_ROWS = 30;
/** From the far wall to just in front of the blocks, so it swallows them. */
const BACK_Z = -9.6;
const FRONT_Z = 0.62;
/** The bright crust runs along the front edge only; a whole glowing top would wash out. */
const CRUST_DEPTH = 0.35;

/**
 * The lava rising during the escape (GAME_SPEC §7): one unlit orange body, so lights and haze
 * cannot pale it, with a bright crust along its front edge that bubbles and lights the cave
 * above. Its surface follows the simulation's lava row; only the crust feeds the bloom, so the
 * screen does not drown in glow.
 */
export class EscapeLava {
  readonly root = new Group();
  private readonly body: Mesh;
  private readonly crust: Mesh;
  private readonly light = new PointLight('#FF7A2E', 0, 14, 1.3);
  private readonly bubbles = new Particles(160, true);
  private bubbleDue = 0;
  private time = 0;

  constructor(width: number) {
    const depth = FRONT_Z - BACK_Z;
    const centreZ = (FRONT_Z + BACK_Z) / 2;
    this.body = new Mesh(
      new BoxGeometry(width + 8, BODY_ROWS, depth),
      new MeshBasicMaterial({ color: '#E4500F' }),
    );
    this.body.position.set(width / 2 - 0.5, -BODY_ROWS / 2, centreZ);
    this.crust = new Mesh(
      new BoxGeometry(width + 8, 0.2, CRUST_DEPTH),
      new MeshBasicMaterial({ color: '#FFB347' }),
    );
    this.crust.position.set(width / 2 - 0.5, 0, FRONT_Z - CRUST_DEPTH / 2 + 0.01);
    this.crust.layers.enable(BLOOM_LAYER);
    // The light stays in the scene at zero, so the light count never changes (lighting.ts).
    this.root.add(this.body, this.crust, this.light, this.bubbles.mesh);
    this.body.visible = false;
    this.crust.visible = false;
  }

  update(state: GameState, dt: number, focusX: number): void {
    this.time += dt;
    const finale = state.finale;
    const running = finale?.phase === 'escape';
    this.light.intensity = running ? 5 : 0;
    if (running) {
      // The surface's top edge, gently heaving.
      const top = 0.5 - finale.lavaRow + Math.sin(this.time * 2.2) * 0.06;
      this.body.position.y = top - BODY_ROWS / 2;
      this.crust.position.y = top;
      this.light.position.set(focusX, top + 1.8, 2);
      this.bubbleDue += dt * 18;
      while (this.bubbleDue >= 1) {
        this.bubbleDue -= 1;
        const x = focusX + (Math.sin(this.time * 37 + this.bubbleDue * 11) * 0.5 + 0.5) * 24 - 12;
        this.bubbles.emit(x, top, '#FFB347', {
          count: 1,
          speed: 1,
          lift: 3,
          gravity: 6,
          life: 0.5,
          size: 0.12,
        });
      }
    }
    this.body.visible = running;
    this.crust.visible = running;
    this.bubbles.update(dt);
  }
}
