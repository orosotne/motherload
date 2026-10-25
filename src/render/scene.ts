import { Color, DirectionalLight, HemisphereLight, Scene } from 'three';
import { RENDER } from '../data/render';

/** Builds the scene with the zone 1 sky and the surface lighting (GAME_SPEC §8). */
export function createScene(): Scene {
  const scene = new Scene();
  scene.background = new Color(RENDER.skyColor);

  const { hemisphere, sun } = RENDER;
  scene.add(new HemisphereLight(hemisphere.sky, hemisphere.ground, hemisphere.intensity));

  const sunLight = new DirectionalLight(sun.color, sun.intensity);
  sunLight.position.set(...sun.direction);
  scene.add(sunLight);

  return scene;
}
