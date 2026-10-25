import { ENGINE } from '../data/engine';

/**
 * Fixed-timestep accumulator (GAME_SPEC §9.1). Pure: no timers and no DOM, so it runs headless.
 */
export class FixedStepClock {
  readonly stepMs: number;
  readonly maxFrameMs: number;
  private accumulatorMs = 0;

  constructor(stepMs: number, maxFrameMs: number) {
    if (!(stepMs > 0) || !(maxFrameMs > 0)) {
      throw new RangeError('FixedStepClock needs a positive step and frame limit');
    }
    this.stepMs = stepMs;
    this.maxFrameMs = maxFrameMs;
  }

  /** Feeds real elapsed time and returns how many fixed steps are due now. */
  advance(frameMs: number): number {
    this.accumulatorMs += Math.min(Math.max(frameMs, 0), this.maxFrameMs);
    const steps = Math.floor(this.accumulatorMs / this.stepMs);
    this.accumulatorMs -= steps * this.stepMs;
    return steps;
  }

  /** Progress into the next step, 0 to 1. Renderers blend previous → current state by it. */
  get alpha(): number {
    // Clamped because float rounding can leave the remainder a hair outside [0, step).
    return Math.min(Math.max(this.accumulatorMs / this.stepMs, 0), 1);
  }
}

/** Callbacks driven by {@link GameLoop}. */
export interface LoopHandlers {
  /** Advances the simulation by one fixed step of `dt` seconds. */
  update(dt: number): void;
  /** Draws one frame. `alpha` (0 to 1) blends the previous and current simulation state. */
  render(alpha: number, frameSeconds: number): void;
}

/** Runtime switches for debugging; the debug panel edits them directly. */
export interface LoopControls {
  /** Freezes the simulation while rendering continues. */
  paused: boolean;
  /** Simulation speed multiplier, for tuning game feel in slow motion. */
  timeScale: number;
  /** Blend between simulation states; when off, the latest state is drawn as is. */
  interpolate: boolean;
}

/** Schedules frames: requestAnimationFrame in the game, a manual fake in tests. */
export interface FrameScheduler {
  request(callback: (timeMs: number) => void): number;
  cancel(handle: number): void;
}

const animationFrames: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
};

/**
 * Game loop (GAME_SPEC §9.1): the simulation advances in fixed steps of 1 / ENGINE.simHz,
 * rendering happens once per display frame and interpolates between steps.
 */
export class GameLoop {
  readonly controls: LoopControls = { paused: false, timeScale: 1, interpolate: true };

  private readonly clock = new FixedStepClock(1000 / ENGINE.simHz, ENGINE.maxFrameMs);
  private readonly stepSeconds = 1 / ENGINE.simHz;
  private handle: number | null = null;
  private lastTimeMs: number | null = null;
  private manualSteps = 0;
  private updateMs = 0;

  constructor(
    private readonly handlers: LoopHandlers,
    private readonly scheduler: FrameScheduler = animationFrames,
  ) {}

  get running(): boolean {
    return this.handle !== null;
  }

  /** Wall time the last frame spent in `update`, for the performance meter. */
  get lastUpdateMs(): number {
    return this.updateMs;
  }

  start(): void {
    if (this.handle !== null) return;
    this.lastTimeMs = null;
    this.handle = this.scheduler.request(this.frame);
  }

  stop(): void {
    if (this.handle === null) return;
    this.scheduler.cancel(this.handle);
    this.handle = null;
  }

  /** Queues exactly one simulation step while paused (frame-by-frame debugging). */
  step(): void {
    if (this.controls.paused) this.manualSteps += 1;
  }

  private readonly frame = (timeMs: number): void => {
    const frameMs = this.lastTimeMs === null ? 0 : timeMs - this.lastTimeMs;
    this.lastTimeMs = timeMs;

    let steps: number;
    if (this.controls.paused) {
      steps = this.manualSteps;
      this.manualSteps = 0;
    } else {
      steps = this.clock.advance(frameMs * this.controls.timeScale);
    }

    const updateStart = performance.now();
    for (let i = 0; i < steps; i++) this.handlers.update(this.stepSeconds);
    this.updateMs = performance.now() - updateStart;

    // A paused game shows its exact latest state instead of a blend.
    const blend = this.controls.interpolate && !this.controls.paused;
    this.handlers.render(blend ? this.clock.alpha : 1, frameMs / 1000);

    // stop() may have been called by a handler during this frame.
    if (this.handle !== null) this.handle = this.scheduler.request(this.frame);
  };
}
