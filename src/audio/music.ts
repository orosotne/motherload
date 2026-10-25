import { MUSIC_CROSSFADE } from '../data/audio';
import type { AudioEngine } from './engine';

/** A piece of generated music: a key, chords per bar and simple patterns per eighth note. */
interface Track {
  bpm: number;
  /** MIDI note of the key's root. */
  root: number;
  scale: readonly number[];
  /** Scale degree of each bar's chord. */
  chords: readonly number[];
  /** Melody in scale degrees per eighth note over two bars; null is a rest. */
  melody: readonly (number | null)[];
  wave: OscillatorType;
  drums: 'hats' | 'pulse' | 'heartbeat' | 'none';
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

/**
 * Music (§8): a cheerful tune on the surface and an ambient loop for each zone, from sunny to
 * tense, wondrous, dangerous and mysterious.
 */
const TRACKS: Readonly<Record<string, Track>> = {
  surface: {
    bpm: 112,
    root: 60,
    scale: MAJOR,
    chords: [0, 3, 4, 0],
    melody: [4, null, 2, 4, 5, 4, 2, null, 0, 1, 2, null, 4, null, null, null],
    wave: 'square',
    drums: 'hats',
  },
  zone1: {
    bpm: 84,
    root: 57,
    scale: MAJOR,
    chords: [0, 5, 3, 4],
    melody: [7, null, null, 4, null, null, 5, null, 4, null, null, 2, null, null, null, null],
    wave: 'triangle',
    drums: 'none',
  },
  zone2: {
    bpm: 76,
    root: 55,
    scale: DORIAN,
    chords: [0, 0, 3, 6],
    melody: [null, 2, null, null, 3, null, 2, null, null, 0, null, null, 6, null, null, null],
    wave: 'triangle',
    drums: 'pulse',
  },
  zone3: {
    bpm: 70,
    root: 62,
    scale: LYDIAN,
    chords: [0, 1, 0, 4],
    melody: [11, 9, 7, null, 9, 11, 14, null, 11, null, 9, null, 7, null, null, null],
    wave: 'sine',
    drums: 'none',
  },
  zone4: {
    bpm: 92,
    root: 50,
    scale: PHRYGIAN,
    chords: [0, 1, 0, 6],
    melody: [null, null, 0, 1, null, null, 0, null, null, null, 3, 1, null, 0, null, null],
    wave: 'sawtooth',
    drums: 'pulse',
  },
  zone5: {
    bpm: 66,
    root: 52,
    scale: MINOR,
    chords: [0, 5, 3, 4],
    melody: [null, 7, null, null, 6, null, null, null, 5, null, null, 4, null, null, null, null],
    wave: 'sine',
    drums: 'heartbeat',
  },
};

const LOOKAHEAD = 0.25;

function frequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

class TrackPlayer {
  readonly gain: GainNode;
  private next: number;
  private step = 0;

  constructor(
    private readonly context: AudioContext,
    private readonly track: Track,
    bus: GainNode,
    private readonly noise: AudioBuffer | null,
  ) {
    this.gain = context.createGain();
    this.gain.gain.value = 0.0001;
    this.gain.connect(bus);
    this.next = context.currentTime + 0.1;
  }

  /** Scale degree to a MIDI note; degrees past the scale climb octaves. */
  private note(degree: number, octave = 0): number {
    const { scale, root } = this.track;
    const size = scale.length;
    const wrapped = ((degree % size) + size) % size;
    return root + (scale[wrapped] ?? 0) + 12 * (Math.floor(degree / size) + octave);
  }

  private voice(
    midi: number,
    start: number,
    seconds: number,
    wave: OscillatorType,
    level: number,
    attack = 0.02,
  ): void {
    const osc = this.context.createOscillator();
    osc.type = wave;
    osc.frequency.value = frequency(midi);
    const env = this.context.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(level, start + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(env).connect(this.gain);
    osc.start(start);
    osc.stop(start + seconds + 0.05);
  }

  private drum(start: number, kind: 'hat' | 'kick'): void {
    if (kind === 'kick') {
      const osc = this.context.createOscillator();
      osc.frequency.setValueAtTime(110, start);
      osc.frequency.exponentialRampToValueAtTime(40, start + 0.15);
      const env = this.context.createGain();
      env.gain.setValueAtTime(0.35, start);
      env.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      osc.connect(env).connect(this.gain);
      osc.start(start);
      osc.stop(start + 0.25);
      return;
    }
    if (!this.noise) return;
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    const env = this.context.createGain();
    env.gain.setValueAtTime(0.06, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + 0.05);
    source.connect(filter).connect(env).connect(this.gain);
    source.start(start, (this.step * 0.137) % 0.8);
    source.stop(start + 0.08);
  }

  /** Schedules every eighth note that starts before `until`. */
  schedule(until: number): void {
    const { track } = this;
    const eighth = 60 / track.bpm / 2;
    // After a gap (a hidden tab gets no frames while the sound clock runs on) the missed notes
    // are skipped, not played all at once.
    const now = this.context.currentTime;
    if (this.next < now) {
      const missed = Math.ceil((now - this.next) / eighth);
      this.next += missed * eighth;
      this.step += missed;
    }
    while (this.next < until) {
      const bar = Math.floor(this.step / 8) % track.chords.length;
      const inBar = this.step % 8;
      const chord = track.chords[bar] ?? 0;
      if (inBar === 0) {
        for (const third of [0, 2, 4])
          this.voice(this.note(chord + third, -1), this.next, eighth * 8, 'sine', 0.05, 0.4);
      }
      if (inBar === 0 || inBar === 4)
        this.voice(this.note(chord, -2), this.next, eighth * 3, 'triangle', 0.12);
      const degree = track.melody[this.step % track.melody.length];
      if (degree !== null && degree !== undefined) {
        this.voice(
          this.note(degree),
          this.next,
          eighth * 1.6,
          track.wave,
          track.wave === 'sine' ? 0.07 : 0.035,
        );
      }
      if (track.drums === 'hats' && inBar % 2 === 1) this.drum(this.next, 'hat');
      if (track.drums === 'pulse' && inBar % 4 === 0) this.drum(this.next, 'kick');
      if (track.drums === 'heartbeat' && (inBar === 0 || inBar === 1)) this.drum(this.next, 'kick');
      this.next += eighth;
      this.step++;
    }
  }
}

/** Plays the music of where the pod is and crossfades on a change (§8). */
export class Music {
  private current: { id: string; player: TrackPlayer } | null = null;
  private readonly fading: TrackPlayer[] = [];

  constructor(private readonly audio: AudioEngine) {}

  /** `id`: 'surface' or 'zone1' … 'zone5'. Call every frame; it only acts on a change. */
  update(id: string): void {
    const { context, music } = this.audio;
    if (!context || !music) return;
    if (this.current?.id !== id) this.switchTo(id, context, music);
    const until = context.currentTime + LOOKAHEAD;
    this.current?.player.schedule(until);
    for (const player of this.fading) player.schedule(until);
  }

  private switchTo(id: string, context: AudioContext, bus: GainNode): void {
    const track = TRACKS[id];
    if (!track) return;
    const now = context.currentTime;
    if (this.current) {
      const old = this.current.player;
      old.gain.gain.setTargetAtTime(0.0001, now, MUSIC_CROSSFADE / 4);
      this.fading.push(old);
      window.setTimeout(
        () => {
          old.gain.disconnect();
          this.fading.splice(this.fading.indexOf(old), 1);
        },
        MUSIC_CROSSFADE * 1000 + 500,
      );
    }
    const player = new TrackPlayer(context, track, bus, this.audio.noise());
    player.gain.gain.setTargetAtTime(1, now, MUSIC_CROSSFADE / 4);
    this.current = { id, player };
  }
}
