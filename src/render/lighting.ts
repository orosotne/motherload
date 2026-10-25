import {
  AmbientLight,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Object3D,
  PointLight,
  SpotLight,
  type Scene,
} from 'three';
import { Block } from '../data/blocks';
import { RENDER } from '../data/render';
import { zoneAt } from '../data/zones';
import type { Pod } from '../sim/pod';
import type { Grid } from '../world/grid';
import { fogColor } from './palette';

/** Daylight from 1 on the surface to 0 below 150 m (§3). */
export function daylight(row: number): number {
  const [full, gone] = RENDER.daylightRows;
  return Math.min(Math.max((gone - row) / (gone - full), 0), 1);
}

/** Seconds between searches for the nearest lava. */
const LAVA_SCAN_SECONDS = 0.25;

/**
 * All lights (§8): hemisphere and sun on the surface, fading into darkness below 150 m where
 * only the headlight, a soft glow around the pod and the nearest lava light the way. The light
 * count never changes, so no shader is ever recompiled while playing.
 */
export class Lighting {
  private readonly hemisphere: HemisphereLight;
  private readonly sun: DirectionalLight;
  private readonly ambient: AmbientLight;
  private readonly headlight: SpotLight;
  private readonly glow: PointLight;
  private readonly lava: PointLight[] = [];
  private readonly fog: Fog;
  private readonly sky = new Color(RENDER.skyColor);
  private readonly dark = new Color();
  private lavaScan = 0;

  constructor(private readonly scene: Scene) {
    const { hemisphere, sun, headlight, podGlow, lavaLights } = RENDER;
    this.hemisphere = new HemisphereLight(hemisphere.sky, hemisphere.ground, hemisphere.intensity);
    this.sun = new DirectionalLight(sun.color, sun.intensity);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(sun.shadowMapSize, sun.shadowMapSize);
    const camera = this.sun.shadow.camera;
    camera.left = -sun.shadowExtent;
    camera.right = sun.shadowExtent;
    camera.top = sun.shadowExtent;
    camera.bottom = -sun.shadowExtent;
    camera.near = 1;
    camera.far = 80;
    this.sun.shadow.bias = -0.0006;
    this.ambient = new AmbientLight('#ffffff', RENDER.ambientDark);
    this.headlight = new SpotLight(
      headlight.color,
      headlight.intensity,
      6,
      headlight.angle,
      headlight.penumbra,
      headlight.decay,
    );
    this.headlight.target = new Object3D();
    this.glow = new PointLight(podGlow.color, podGlow.intensity, podGlow.distance, 1.5);
    for (let i = 0; i < lavaLights.count; i++) {
      this.lava.push(new PointLight(lavaLights.color, 0, lavaLights.distance, 1.4));
    }
    this.fog = new Fog(this.sky, RENDER.fog.near, RENDER.fog.far);
    scene.fog = this.fog;
    scene.add(
      this.hemisphere,
      this.sun,
      this.sun.target,
      this.ambient,
      this.headlight,
      this.headlight.target,
      this.glow,
      ...this.lava,
    );
  }

  /** `x`, `y`: where the pod is drawn; `focusX`, `focusY`: where the camera looks. */
  update(
    pod: Pod,
    x: number,
    y: number,
    focusX: number,
    focusY: number,
    grid: Grid,
    lightRange: number,
    dt: number,
  ): void {
    const row = Math.floor(0.5 - focusY);
    const day = daylight(row);
    this.hemisphere.intensity = RENDER.hemisphere.intensity * day;
    this.sun.intensity = RENDER.sun.intensity * day;
    this.sun.castShadow = day > 0.05;
    const [dx, dy, dz] = RENDER.sun.direction;
    this.sun.position.set(focusX + dx * 30, focusY + dy * 30, dz * 30);
    this.sun.target.position.set(focusX, focusY, 0);
    this.ambient.intensity = RENDER.ambientDark * (1 - day);

    // The headlight looks where the pod drills or faces, a little downwards (§8).
    const down = pod.drill?.dir === 'down';
    const side = pod.drill && !down ? (pod.drill.dir === 'left' ? -1 : 1) : pod.facing;
    this.headlight.position.set(x, y, 1.6);
    this.headlight.target.position.set(down ? x : x + side * 3, down ? y - 3 : y - 0.6, 0);
    this.headlight.distance = lightRange * 1.35 + 1;
    this.headlight.intensity = RENDER.headlight.intensity * (0.25 + 0.75 * (1 - day));
    this.glow.position.set(x, y, 1.2);

    this.dark.copy(fogColor(zoneAt(Math.max(row, 0)).index));
    this.fog.color.copy(this.sky).lerp(this.dark, 1 - day);
    this.scene.background = this.fog.color;

    this.lavaScan -= dt;
    if (this.lavaScan <= 0) {
      this.lavaScan = LAVA_SCAN_SECONDS;
      this.placeLavaLights(grid, x, y);
    }
  }

  /** The nearest lava cells around the pod each get one light (§8: at most 8). */
  private placeLavaLights(grid: Grid, x: number, y: number): void {
    const podRow = Math.round(-y);
    const found: { col: number; row: number; distance: number }[] = [];
    for (let row = podRow - 10; row <= podRow + 10; row++) {
      for (let col = 0; col < grid.width; col++) {
        if (grid.get(col, row) !== Block.Lava) continue;
        found.push({ col, row, distance: Math.hypot(col - x, -row - y) });
      }
    }
    found.sort((a, b) => a.distance - b.distance);
    this.lava.forEach((light, index) => {
      const cell = found[index];
      light.intensity = cell ? RENDER.lavaLights.intensity : 0;
      if (cell) light.position.set(cell.col, -cell.row + 0.3, 0.9);
    });
  }
}
