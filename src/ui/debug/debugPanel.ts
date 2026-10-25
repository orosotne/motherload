import { GUI } from 'lil-gui';
import type { GameLoop } from '../../core/loop';
import { UPGRADE_BRANCHES } from '../../data/upgrades';
import { WORLD } from '../../data/world';
import type { CameraRig } from '../../render/camera';
import type { GameState, SimSettings } from '../../sim/game';
import { statsFor } from '../../sim/stats';
import { maxTier } from '../../sim/upgrades';
import { addFeelFolder } from './feelFolder';
import { PerfMeter, type RenderInfo } from './perfMeter';

/** What the debug tools can watch and tune. */
export interface DebugTargets {
  loop: GameLoop;
  camera: CameraRig;
  renderInfo: RenderInfo;
  /** Live simulation settings: game feel and pod physics. */
  settings: SimSettings;
  /** The live game, for money and upgrades. */
  state: GameState;
  /** Puts the pod back on the surface. */
  resetPod: () => void;
  /** Puts the pod into a row, clearing that cell (§9.9: teleport to a depth). */
  teleport: (row: number) => void;
  /** Throws the save away and starts a new world. */
  newGame: () => void;
}

export interface DebugTools {
  perf: PerfMeter;
}

/** Physical keys that show or hide all debug tools: the key left of 1 on US and ISO keyboards. */
const TOGGLE_KEYS = new Set(['Backquote', 'IntlBackslash']);

/**
 * Debug panel (GAME_SPEC §9.9): lil-gui controls plus the performance meter. app.ts loads this
 * module lazily, so a normal production build never downloads it.
 */
export function createDebugTools(targets: DebugTargets): DebugTools {
  const perf = new PerfMeter(document.body, targets.renderInfo);
  const gui = new GUI({ title: 'Debug' });
  const view = { perfMeter: true };

  gui
    .add(view, 'perfMeter')
    .name('FPS meter')
    .onChange((on: boolean) => {
      perf.visible = on;
    });

  const loop = gui.addFolder('Loop');
  loop.add(targets.loop.controls, 'paused');
  loop.add({ step: () => targets.loop.step() }, 'step').name('step one tick');
  loop.add(targets.loop.controls, 'timeScale', 0, 2, 0.05).name('time scale');
  loop.add(targets.loop.controls, 'interpolate');

  const camera = gui.addFolder('Camera');
  const settings = targets.camera.settings;
  const apply = (): void => targets.camera.apply();
  camera.add(settings, 'fovDeg', 20, 90, 1).name('FOV (°)').onChange(apply);
  camera.add(settings, 'tiltDeg', 0, 60, 1).name('tilt (°)').onChange(apply);
  camera.add(settings, 'distance', 5, 60, 0.5).name('distance (blocks)').onChange(apply);

  addFeelFolder(gui, targets.settings.feel);

  const game = gui.addFolder('Game');
  const { state } = targets;
  const jump = { row: 100 };
  game.add({ cash: () => (state.cash += 10_000) }, 'cash').name('+ $10 000');
  game.add({ rich: () => (state.cash += 1_000_000) }, 'rich').name('+ $1 000 000');
  game
    .add(
      {
        max: () => {
          for (const branch of UPGRADE_BRANCHES) state.tiers[branch] = maxTier(branch);
          state.stats = statsFor(state.tiers);
          state.fuel = state.stats.tankLiters;
          state.hull = state.stats.maxHull;
        },
      },
      'max',
    )
    .name('all upgrades T6');
  game.add(jump, 'row', 0, WORLD.height - 1, 1).name('teleport row');
  game.add({ go: () => targets.teleport(jump.row) }, 'go').name('teleport');
  game.add({ fresh: targets.newGame }, 'fresh').name('new game (deletes the save)');
  game.close();

  const pod = gui.addFolder('Pod');
  const physics = targets.settings.pod;
  pod.add({ reset: targets.resetPod }, 'reset').name('back to the surface');
  pod.add(physics, 'driveSpeed', 1, 12, 0.25).name('drive speed');
  pod.add(physics, 'groundAccel', 5, 80, 1).name('ground accel');
  pod.add(physics, 'airAccel', 2, 60, 1).name('air accel');
  pod.add(physics, 'gravity', 5, 40, 0.5);
  pod.add(physics, 'maxFallSpeed', 4, 30, 0.5).name('max fall speed');
  pod.add(physics, 'thrustAccel', 20, 90, 1).name('thrust accel');
  pod.close();

  let shown = true;
  window.addEventListener('keydown', (event) => {
    if (!TOGGLE_KEYS.has(event.code) || event.repeat) return;
    shown = !shown;
    gui.show(shown);
    perf.visible = shown && view.perfMeter;
  });

  return { perf };
}
