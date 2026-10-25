import type { GUI } from 'lil-gui';
import type { FeelConfig } from '../../data/feel';

/**
 * Game feel controls (GAME_SPEC §5): every item has an on/off switch to compare the difference,
 * plus its main values. Numbers in the folder titles follow the spec's list.
 */
export function addFeelFolder(gui: GUI, feel: FeelConfig): void {
  const folder = gui.addFolder('Game feel');

  const input = folder.addFolder('1 input buffer');
  input.add(feel.inputBuffer, 'enabled');
  input.add(feel.inputBuffer, 'ms', 0, 400, 10);

  const landing = folder.addFolder('2 landing buffer');
  landing.add(feel.landingBuffer, 'enabled');
  landing.add(feel.landingBuffer, 'ms', 0, 400, 10);

  const squash = folder.addFolder('3 squash & stretch');
  squash.add(feel.squash, 'enabled');
  squash.add(feel.squash, 'landScaleY', 0.5, 1, 0.01).name('landing height');
  squash.add(feel.squash, 'landScaleX', 1, 1.5, 0.01).name('landing width');
  squash.add(feel.squash, 'landMs', 0, 400, 10).name('landing ms');
  squash.add(feel.squash, 'liftScaleY', 1, 1.5, 0.01).name('lift-off height');
  squash.add(feel.squash, 'liftMs', 0, 400, 10).name('lift-off ms');

  const shake = folder.addFolder('7 screen shake');
  shake.add(feel.shake, 'enabled');
  shake.add(feel.shake, 'decayPerSecond', 0.1, 5, 0.1).name('decay per second');
  shake.add(feel.shake, 'maxOffset', 0, 2, 0.05).name('max offset (blocks)');
  shake.add(feel.shake, 'maxRollDeg', 0, 10, 0.5).name('max roll (°)');
  shake.add(feel.shake, 'landingMaxTrauma', 0, 1, 0.05).name('landing trauma');

  const camera = folder.addFolder('8 camera follow');
  camera.add(feel.camera, 'enabled');
  camera.add(feel.camera, 'followRate', 1, 30, 0.5).name('follow rate (1/s)');
  camera.add(feel.camera, 'lookahead', 0, 8, 0.25).name('lookahead (blocks)');
  camera.add(feel.camera, 'fallLookahead', 0, 10, 0.25).name('fall lookahead');

  const engine = folder.addFolder('10 engine curve');
  engine.add(feel.engine, 'enabled');
  engine.add(feel.engine, 'rampUpSeconds', 0.02, 1, 0.01).name('ramp up (s)');
  engine.add(feel.engine, 'rampDownSeconds', 0.02, 1, 0.01).name('ramp down (s)');

  const forgiveness = folder.addFolder('11 forgiveness');
  forgiveness.add(feel.forgiveness, 'enabled');
  forgiveness.add(feel.forgiveness, 'gasAbortMs', 0, 800, 10).name('gas abort window (ms)');

  for (const child of folder.folders) child.close();
}
