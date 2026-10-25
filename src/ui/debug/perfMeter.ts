import './debug.css';

/** The parts of three's `renderer.info` the meter reads, typed here so the meter stays three-free. */
export interface RenderInfo {
  readonly render: { readonly calls: number; readonly triangles: number };
  readonly memory: { readonly geometries: number; readonly textures: number };
}

/** The readout averages over this window, in seconds, so the numbers stay legible. */
const WINDOW_SECONDS = 0.5;

/**
 * Performance readout (GAME_SPEC §9.9) in the units of the performance budget: frame rate, frame
 * time, CPU time per frame and draw calls (budget: 200).
 */
export class PerfMeter {
  private readonly element = document.createElement('div');
  private frames = 0;
  private seconds = 0;
  private cpuMs = 0;
  private worstFrameMs = 0;

  constructor(
    parent: HTMLElement,
    private readonly info: RenderInfo,
  ) {
    this.element.className = 'perf-meter';
    parent.append(this.element);
  }

  get visible(): boolean {
    return !this.element.hidden;
  }

  set visible(value: boolean) {
    this.element.hidden = !value;
  }

  /** Records one rendered frame: how long it lasted and how much CPU time it took to produce. */
  frame(frameSeconds: number, cpuMs: number): void {
    this.frames += 1;
    this.seconds += frameSeconds;
    this.cpuMs += cpuMs;
    this.worstFrameMs = Math.max(this.worstFrameMs, frameSeconds * 1000);
    if (this.seconds < WINDOW_SECONDS) return;

    const { calls, triangles } = this.info.render;
    const { geometries, textures } = this.info.memory;
    this.element.textContent = [
      `${(this.frames / this.seconds).toFixed(0)} fps`,
      `frame ${((this.seconds * 1000) / this.frames).toFixed(1)} ms, worst ${this.worstFrameMs.toFixed(1)}`,
      `cpu ${(this.cpuMs / this.frames).toFixed(2)} ms`,
      `${calls} draw calls, ${triangles} triangles`,
      `${geometries} geometries, ${textures} textures`,
    ].join('\n');

    this.frames = 0;
    this.seconds = 0;
    this.cpuMs = 0;
    this.worstFrameMs = 0;
  }
}
