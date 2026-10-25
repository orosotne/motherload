import type { AudioEngine } from './engine';

type Wave = OscillatorType;

interface ToneOptions {
  type?: Wave;
  gain?: number;
  attack?: number;
  /** Glide to this frequency over the tone's length. */
  slideTo?: number;
  delay?: number;
}

interface NoiseOptions {
  filter?: BiquadFilterType;
  frequency?: number;
  /** Sweep the filter to this frequency over the length. */
  sweepTo?: number;
  q?: number;
  gain?: number;
  delay?: number;
}

/**
 * Procedural sound effects in the spirit of jsfxr (GAME_SPEC §8): every action has a sound,
 * made from oscillators and filtered noise, nothing recorded.
 */
export class Sfx {
  private drill: { osc: OscillatorNode; gain: GainNode; noise: AudioBufferSourceNode } | null =
    null;
  private engine: { gain: GainNode; filter: BiquadFilterNode } | null = null;

  constructor(private readonly audio: AudioEngine) {}

  private get out(): { context: AudioContext; bus: GainNode } | null {
    const { context, sfx } = this.audio;
    return context && sfx ? { context, bus: sfx } : null;
  }

  tone(frequency: number, seconds: number, options: ToneOptions = {}): void {
    const out = this.out;
    if (!out) return;
    const { context, bus } = out;
    const { type = 'sine', gain = 0.3, attack = 0.005, slideTo, delay = 0 } = options;
    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + seconds);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(envelope).connect(bus);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  noise(seconds: number, options: NoiseOptions = {}): void {
    const out = this.out;
    const buffer = this.audio.noise();
    if (!out || !buffer) return;
    const { context, bus } = out;
    const {
      filter = 'lowpass',
      frequency = 1000,
      sweepTo,
      q = 0.7,
      gain = 0.3,
      delay = 0,
    } = options;
    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const biquad = context.createBiquadFilter();
    biquad.type = filter;
    biquad.Q.value = q;
    biquad.frequency.setValueAtTime(frequency, start);
    if (sweepTo) biquad.frequency.exponentialRampToValueAtTime(sweepTo, start + seconds);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(gain, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(biquad).connect(envelope).connect(bus);
    source.start(start, Math.random() * 0.5);
    source.stop(start + seconds + 0.05);
  }

  /** The drill loop (§5.4): a buzzing saw plus grit, its pitch set by the block's hardness. */
  drillOn(pitch: number): void {
    const out = this.out;
    const buffer = this.audio.noise();
    if (!out || !buffer) return;
    const { context, bus } = out;
    if (!this.drill) {
      const osc = context.createOscillator();
      osc.type = 'sawtooth';
      const gain = context.createGain();
      gain.gain.value = 0;
      const grit = context.createBufferSource();
      grit.buffer = buffer;
      grit.loop = true;
      const band = context.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 1800;
      const gritGain = context.createGain();
      gritGain.gain.value = 0.35;
      grit.connect(band).connect(gritGain).connect(gain);
      const low = context.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 900;
      osc.connect(low).connect(gain).connect(bus);
      osc.start();
      grit.start();
      this.drill = { osc, gain, noise: grit };
    }
    const now = context.currentTime;
    this.drill.osc.frequency.setTargetAtTime(pitch, now, 0.03);
    this.drill.gain.gain.setTargetAtTime(0.13, now, 0.02);
  }

  drillOff(): void {
    const { context } = this.audio;
    if (!this.drill || !context) return;
    this.drill.gain.gain.setTargetAtTime(0, context.currentTime, 0.04);
  }

  /** Engine rumble while flying (§5.10): low noise that swells with thrust. */
  thrust(level: number): void {
    const out = this.out;
    const buffer = this.audio.noise();
    if (!out || !buffer) return;
    const { context, bus } = out;
    if (!this.engine) {
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(bus);
      source.start();
      this.engine = { gain, filter };
    }
    const now = context.currentTime;
    this.engine.gain.gain.setTargetAtTime(level * 0.22, now, 0.05);
    this.engine.filter.frequency.setTargetAtTime(200 + level * 500, now, 0.05);
  }

  landing(speed: number): void {
    const strength = Math.min(speed / 14, 1);
    this.tone(90, 0.18, { slideTo: 45, gain: 0.25 + strength * 0.35 });
    this.noise(0.12, { frequency: 600, sweepTo: 150, gain: 0.1 + strength * 0.2 });
  }

  /** A bell whose pitch rises with the mineral's value (§5.5): $25 low, $5 000 high. */
  chime(value: number): void {
    const steps = Math.round(Math.log2(Math.max(value, 25) / 25) * 2.5);
    const base = 520 * 2 ** (steps / 12);
    this.tone(base, 0.5, { type: 'triangle', gain: 0.22 });
    this.tone(base * 2.01, 0.35, { gain: 0.08, delay: 0.01 });
    this.tone(base * 1.5, 0.3, { type: 'triangle', gain: 0.1, delay: 0.07 });
  }

  hiss(): void {
    this.noise(0.45, { filter: 'highpass', frequency: 3500, gain: 0.18 });
  }

  aborted(): void {
    this.noise(0.15, { filter: 'bandpass', frequency: 900, sweepTo: 300, gain: 0.12 });
  }

  explosion(radius: number): void {
    const size = 0.6 + radius * 0.2;
    this.noise(0.9 * size, { frequency: 1600, sweepTo: 90, gain: 0.5 });
    this.tone(70, 0.7 * size, { slideTo: 30, gain: 0.5 });
  }

  /** Fuel warning (§3): two beeps, three when it is urgent. */
  fuelWarning(level: 1 | 2): void {
    const beeps = level === 1 ? 2 : 3;
    for (let i = 0; i < beeps; i++) {
      this.tone(level === 1 ? 880 : 1175, 0.11, { type: 'square', gain: 0.09, delay: i * 0.16 });
    }
  }

  click(): void {
    this.tone(1400, 0.04, { type: 'square', gain: 0.05 });
  }

  buy(): void {
    this.tone(784, 0.12, { type: 'triangle', gain: 0.18 });
    this.tone(1175, 0.25, { type: 'triangle', gain: 0.18, delay: 0.08 });
  }

  relic(): void {
    [523, 659, 784, 1047].forEach((note, i) =>
      this.tone(note, 0.5, { type: 'triangle', gain: 0.18, delay: i * 0.1 }),
    );
  }

  damage(): void {
    this.noise(0.2, { filter: 'bandpass', frequency: 400, gain: 0.25 });
    this.tone(160, 0.15, { type: 'square', slideTo: 80, gain: 0.1 });
  }

  sizzle(): void {
    this.noise(0.6, { filter: 'highpass', frequency: 2500, sweepTo: 6000, gain: 0.15 });
  }

  alarm(): void {
    this.tone(660, 0.18, { type: 'square', gain: 0.08 });
    this.tone(520, 0.18, { type: 'square', gain: 0.08, delay: 0.2 });
  }

  item(): void {
    this.tone(600, 0.15, { type: 'sine', slideTo: 1200, gain: 0.15 });
  }

  teleport(): void {
    this.tone(300, 0.6, { type: 'sine', slideTo: 1600, gain: 0.15 });
    this.noise(0.5, { filter: 'bandpass', frequency: 2000, sweepTo: 6000, gain: 0.06 });
  }

  drone(): void {
    this.tone(220, 1.2, { type: 'sawtooth', slideTo: 330, gain: 0.05 });
  }
}
