import { Color, Scene } from 'three';
import { RENDER } from '../data/render';

/** The scene with the zone 1 sky; lighting.ts adds the lights (GAME_SPEC §8). */
export function createScene(): Scene {
  const scene = new Scene();
  scene.background = new Color(RENDER.skyColor);
  return scene;
}
