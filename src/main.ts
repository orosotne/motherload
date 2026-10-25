import './ui/styles.css';
import { GameLoop } from './core/loop';
import { CameraRig } from './render/camera';
import { createDemoCube, syncDemoCube } from './render/demoCube';
import { bindResize, createRenderer } from './render/renderer';
import { createScene } from './render/scene';
import { createSpin, DEMO_SPIN_SPEED, stepSpin } from './sim/demoSpin';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Missing #game canvas');

const renderer = createRenderer(canvas);
const scene = createScene();
const rig = new CameraRig();
bindResize(renderer, (width, height) => rig.setAspect(width / height));

// F0 test scene: one spinning cube, simulated in fixed steps and drawn with interpolation.
const spin = createSpin();
const demo = { speed: DEMO_SPIN_SPEED };
const cube = createDemoCube();
scene.add(cube);

const loop = new GameLoop({
  update: (dt) => stepSpin(spin, dt, demo.speed),
  render: (alpha) => {
    syncDemoCube(cube, spin, alpha);
    renderer.render(scene, rig.camera);
  },
});
loop.start();
