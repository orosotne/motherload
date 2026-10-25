import { describe, expect, it } from 'vitest';
import { FixedStepClock, GameLoop, type FrameScheduler } from '../src/core/loop';
import { Rng } from '../src/core/rng';
import { ENGINE } from '../src/data/engine';

describe('FixedStepClock', () => {
  it('runs one step per step-length frame', () => {
    const clock = new FixedStepClock(10, 100);
    expect([clock.advance(10), clock.advance(10), clock.advance(10)]).toEqual([1, 1, 1]);
    expect(clock.alpha).toBe(0);
  });

  it('accumulates short frames until a whole step is due', () => {
    const clock = new FixedStepClock(10, 100);
    expect(clock.advance(4)).toBe(0);
    expect(clock.alpha).toBeCloseTo(0.4);
    expect(clock.advance(4)).toBe(0);
    expect(clock.advance(4)).toBe(1);
    expect(clock.alpha).toBeCloseTo(0.2);
  });

  it('catches up with several steps after a long frame', () => {
    const clock = new FixedStepClock(10, 100);
    expect(clock.advance(35)).toBe(3);
    expect(clock.alpha).toBeCloseTo(0.5);
  });

  it('drops time beyond maxFrameMs instead of spiralling', () => {
    const clock = new FixedStepClock(10, 100);
    expect(clock.advance(5_000)).toBe(10);
  });

  it('ignores negative frame times', () => {
    const clock = new FixedStepClock(10, 100);
    expect(clock.advance(-50)).toBe(0);
    expect(clock.alpha).toBe(0);
  });

  it('never loses or invents time across uneven frames', () => {
    const rng = new Rng(7);
    const clock = new FixedStepClock(10, 100);
    let elapsed = 0;
    let steps = 0;
    for (let i = 0; i < 1_000; i++) {
      const frame = rng.int(0, 40);
      elapsed += frame;
      steps += clock.advance(frame);
    }
    expect(steps).toBe(Math.floor(elapsed / 10));
  });

  it('keeps alpha within [0, 1] at the real 60 Hz step', () => {
    const rng = new Rng(11);
    const clock = new FixedStepClock(1000 / 60, 100);
    for (let i = 0; i < 1_000; i++) {
      clock.advance(rng.range(0, 40));
      expect(clock.alpha).toBeGreaterThanOrEqual(0);
      expect(clock.alpha).toBeLessThanOrEqual(1);
    }
  });

  it('rejects non-positive limits', () => {
    expect(() => new FixedStepClock(0, 100)).toThrow(RangeError);
    expect(() => new FixedStepClock(10, 0)).toThrow(RangeError);
  });
});

/** Frame scheduler driven by hand: the test decides when each frame fires and at what time. */
class ManualFrames implements FrameScheduler {
  private pending: ((timeMs: number) => void) | null = null;
  private nextHandle = 1;

  get scheduled(): boolean {
    return this.pending !== null;
  }

  request(callback: (timeMs: number) => void): number {
    this.pending = callback;
    return this.nextHandle++;
  }

  cancel(): void {
    this.pending = null;
  }

  fire(timeMs: number): void {
    const callback = this.pending;
    this.pending = null;
    callback?.(timeMs);
  }
}

const STEP_MS = 1000 / ENGINE.simHz;

function createLoop(): { loop: GameLoop; frames: ManualFrames; calls: string[]; alphas: number[] } {
  const frames = new ManualFrames();
  const calls: string[] = [];
  const alphas: number[] = [];
  const loop = new GameLoop(
    {
      update: (dt) => {
        expect(dt).toBeCloseTo(1 / ENGINE.simHz);
        calls.push('update');
      },
      render: (alpha) => {
        calls.push('render');
        alphas.push(alpha);
      },
    },
    frames,
  );
  return { loop, frames, calls, alphas };
}

describe('GameLoop', () => {
  it('simulates due steps before rendering and keeps scheduling frames', () => {
    const { loop, frames, calls } = createLoop();
    loop.start();
    frames.fire(1_000); // The first frame only sets the time base.
    frames.fire(1_000 + 2.5 * STEP_MS);

    expect(calls).toEqual(['render', 'update', 'update', 'render']);
    expect(frames.scheduled).toBe(true);
  });

  it('interpolates by the clock, or draws the latest state when interpolation is off', () => {
    const { loop, frames, alphas } = createLoop();
    loop.start();
    frames.fire(0);
    frames.fire(1.5 * STEP_MS);
    loop.controls.interpolate = false;
    frames.fire(1.75 * STEP_MS);

    expect(alphas[1]).toBeCloseTo(0.5);
    expect(alphas[2]).toBe(1);
  });

  it('freezes the simulation while paused but keeps rendering', () => {
    const { loop, frames, calls, alphas } = createLoop();
    loop.start();
    frames.fire(0);
    loop.controls.paused = true;
    frames.fire(10 * STEP_MS);

    expect(calls).toEqual(['render', 'render']);
    expect(alphas[1]).toBe(1);
  });

  it('runs exactly one update per step() while paused, and none while running', () => {
    const { loop, frames, calls } = createLoop();
    loop.start();
    frames.fire(0);
    loop.step(); // Ignored: not paused.
    loop.controls.paused = true;
    loop.step();
    frames.fire(0.5 * STEP_MS);
    frames.fire(STEP_MS);

    expect(calls).toEqual(['render', 'update', 'render', 'render']);
  });

  it('holds the simulation still for a hitstop, then goes on without catching up', () => {
    const { loop, frames, calls } = createLoop();
    loop.start();
    frames.fire(0);
    loop.freeze(60);
    frames.fire(2 * STEP_MS); // 33 ms frozen
    frames.fire(4 * STEP_MS); // 66 ms: the freeze ends within this frame
    frames.fire(5 * STEP_MS);

    expect(calls).toEqual(['render', 'render', 'render', 'update', 'render']);
  });

  it('scales simulated time with timeScale', () => {
    const { loop, frames, calls } = createLoop();
    loop.controls.timeScale = 0.5;
    loop.start();
    frames.fire(0);
    frames.fire(4.5 * STEP_MS); // 4.5 steps of real time at half speed: 2 updates.

    expect(calls.filter((call) => call === 'update')).toHaveLength(2);
  });

  it('stops scheduling after stop(), also when stopped from inside a frame', () => {
    const { loop, frames } = createLoop();
    loop.start();
    loop.stop();
    expect(frames.scheduled).toBe(false);
    expect(loop.running).toBe(false);

    const selfStopping = new ManualFrames();
    const stopper: GameLoop = new GameLoop(
      { update: () => undefined, render: () => stopper.stop() },
      selfStopping,
    );
    stopper.start();
    selfStopping.fire(0);
    expect(selfStopping.scheduled).toBe(false);
    expect(stopper.running).toBe(false);
  });
});
