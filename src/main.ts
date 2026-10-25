import './ui/styles.css';
import { GameLoop } from './core/loop';
import { CameraRig } from './render/camera';
import { createDemoCube, syncDemoCube } from './render/demoCube';
import { bindResize, createRenderer } from './render/renderer';
import { createScene } from './render/scene';
import { createSpin, DEMO_SPIN_SPEED, stepSpin } from './sim/demoSpin';
import type { DebugTools } from './ui/debug/debugPanel';

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

let debug: DebugTools | null = null;

const loop = new GameLoop({
  update: (dt) => stepSpin(spin, dt, demo.speed),
  render: (alpha, frameSeconds) => {
    const renderStart = performance.now();
    renderer.info.reset();
    syncDemoCube(cube, spin, alpha);
    renderer.render(scene, rig.camera);
    debug?.perf.frame(frameSeconds, loop.lastUpdateMs + performance.now() - renderStart);
  },
});
loop.start();

// Debug tools: always in dev mode; in a production build only with ?debug in the URL.
if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')) {
  void import('./ui/debug/debugPanel')
    .then(({ createDebugTools }) => {
      debug = createDebugTools({ loop, camera: rig, renderInfo: renderer.info, demo });
    })
    .catch((error: unknown) => console.error('Debug tools failed to load', error));
}
