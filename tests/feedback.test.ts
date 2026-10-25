import { describe, expect, it } from 'vitest';
import type { AudioEngine } from '../src/audio/engine';
import { Music } from '../src/audio/music';
import { EventBus } from '../src/core/events';
import type { GamepadReader } from '../src/core/gamepad';
import { FEEL } from '../src/data/feel';
import type { GameEvents } from '../src/sim/events';
import { Rumble } from '../src/ui/rumble';
import { gridFrom, Sim } from './helpers/sim';

/** Just enough of an AudioContext to count the voices the music schedules. */
function fakeAudio() {
  const param = () => ({
    value: 0,
    setValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
    setTargetAtTime: () => undefined,
  });
  const node = () => ({ connect: (next: unknown) => next, disconnect: () => undefined });
  let oscillators = 0;
  const context = {
    currentTime: 0,
    createOscillator: () => {
      oscillators++;
      return {
        ...node(),
        type: 'sine',
        frequency: param(),
        start: () => undefined,
        stop: () => undefined,
      };
    },
    createGain: () => ({ ...node(), gain: param() }),
    createBiquadFilter: () => ({ ...node(), type: 'lowpass', frequency: param(), Q: param() }),
    createBufferSource: () => ({
      ...node(),
      buffer: null,
      start: () => undefined,
      stop: () => undefined,
    }),
  };
  const engine = { context, music: context.createGain(), noise: () => null };
  return { engine: engine as unknown as AudioEngine, context, count: () => oscillators };
}

describe('music after a long gap', () => {
  it('skips the notes it missed instead of playing them all at once', () => {
    const { engine, context, count } = fakeAudio();
    const music = new Music(engine);
    music.update('zone1');
    const first = count();
    // Ten minutes in a hidden tab: no frames, but the sound clock ran on.
    context.currentTime = 600;
    music.update('zone1');
    expect(count() - first).toBeLessThan(12);
  });
});

describe('rumble while a menu is open', () => {
  it('does not pulse for drilling while the game is paused', () => {
    const calls: number[] = [];
    const pad = { rumble: (weak: number) => calls.push(weak) } as unknown as GamepadReader;
    const sim = new Sim(gridFrom(['...', '###', '###']), 1, 0);
    const rumble = new Rumble(pad, structuredClone(FEEL), new EventBus<GameEvents>());
    sim.hold(['down'], 2);
    expect(sim.pod.drill).not.toBeNull();
    for (let i = 0; i < 30; i++) rumble.update(sim.state, 0.05, true);
    expect(calls).toEqual([]);
    rumble.update(sim.state, 0.05, false);
    expect(calls.length).toBe(1);
  });
});
