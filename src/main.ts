import './ui/styles.css';
import { Color, PerspectiveCamera, Scene } from 'three';
import { RENDER } from './data/render';
import { bindResize, createRenderer } from './render/renderer';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Missing #game canvas');

const renderer = createRenderer(canvas);
const scene = new Scene();
scene.background = new Color(RENDER.skyColor);
const camera = new PerspectiveCamera();

bindResize(renderer, (width, height) => {
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
});
