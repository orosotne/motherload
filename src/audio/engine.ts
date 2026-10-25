import { AUDIO_DEFAULTS, type AudioVolumes } from '../data/audio';

const STORAGE_KEY = 'hlbina.audio';

function readVolumes(): AudioVolumes {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof stored !== 'object' || stored === null) return { ...AUDIO_DEFAULTS };
    const read = (key: keyof AudioVolumes): number => {
      const value = (stored as Record<string, unknown>)[key];
      return typeof value === 'number' && value >= 0 && value <= 1 ? value : AUDIO_DEFAULTS[key];
    };
    return { master: read('master'), music: read('music'), sfx: read('sfx') };
  } catch {
    return { ...AUDIO_DEFAULTS };
  }
}

/**
 * WebAudio (GAME_SPEC §8) with a three-way mixer: master, music and effects. Browsers only let
 * sound start after a key press or a click, so the context is made on the first one.
 */
export class AudioEngine {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  music: GainNode | null = null;
  sfx: GainNode | null = null;
  readonly volumes: AudioVolumes = readVolumes();
  private noiseBuffer: AudioBuffer | null = null;
  private readonly onReady: (() => void)[] = [];

  constructor() {
    const unlock = (): void => this.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  /** Starts sound on the first gesture, or resumes it (Safari suspends hidden tabs). */
  unlock(): void {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    const Context = window.AudioContext;
    if (typeof Context !== 'function') return;
    const context = new Context();
    this.context = context;
    this.master = context.createGain();
    this.music = context.createGain();
    this.sfx = context.createGain();
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(context.destination);
    this.applyVolumes();
    for (const ready of this.onReady.splice(0)) ready();
  }

  /** Runs `callback` once sound is available. */
  whenReady(callback: () => void): void {
    if (this.context) callback();
    else this.onReady.push(callback);
  }

  setVolume(channel: keyof AudioVolumes, value: number): void {
    this.volumes[channel] = Math.min(Math.max(value, 0), 1);
    this.applyVolumes();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.volumes));
    } catch {
      // The choice still holds for this session.
    }
  }

  private applyVolumes(): void {
    const { context, master, music, sfx, volumes } = this;
    if (!context || !master || !music || !sfx) return;
    const now = context.currentTime;
    // Squared: sliders feel even to the ear.
    master.gain.setTargetAtTime(volumes.master ** 2, now, 0.05);
    music.gain.setTargetAtTime(volumes.music ** 2, now, 0.05);
    sfx.gain.setTargetAtTime(volumes.sfx ** 2, now, 0.05);
  }

  /** One second of white noise, shared by every noisy sound. */
  noise(): AudioBuffer | null {
    const { context } = this;
    if (!context) return null;
    if (!this.noiseBuffer) {
      const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = buffer.getChannelData(0);
      // A fixed LCG: sound never touches game state, but repeatable noise is easier to tune.
      let seed = 12345;
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        data[i] = (seed / 0x7fffffff) * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
    return this.noiseBuffer;
  }
}
