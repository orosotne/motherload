import type { Speaker } from '../data/story';
import type { Sfx } from './sfx';

/** Sounds of the story (GAME_SPEC §7, §8), made from the same oscillators and noise. */
export class StorySfx {
  constructor(private readonly sfx: Sfx) {}

  /** A message starts: a radio chirp, Pip's beeps, or static and a hum for the Voice. */
  radio(speaker: Speaker): void {
    const { sfx } = this;
    if (speaker === 'pip') {
      [1320, 990, 1480, 1175].forEach((note, i) =>
        sfx.tone(note, 0.07, { type: 'square', gain: 0.05, delay: i * 0.09 }),
      );
      return;
    }
    if (speaker === 'voice') {
      sfx.noise(1.2, { filter: 'bandpass', frequency: 1800, q: 0.6, gain: 0.07 });
      sfx.tone(55, 1.4, { gain: 0.09, attack: 0.3 });
      return;
    }
    const [low, high] = speaker === 'gus' ? [587, 784] : [784, 1047];
    sfx.noise(0.05, { filter: 'highpass', frequency: 3000, gain: 0.07 });
    sfx.tone(low, 0.08, { type: 'triangle', gain: 0.08, delay: 0.04 });
    sfx.tone(high, 0.12, { type: 'triangle', gain: 0.08, delay: 0.12 });
  }

  /** Two seconds of deep rumble (§7). */
  quake(): void {
    this.sfx.noise(2.2, { frequency: 180, sweepTo: 60, gain: 0.45 });
    this.sfx.tone(42, 2.2, { slideTo: 30, gain: 0.35, attack: 0.25 });
  }

  /** Rock giving way somewhere above during the escape. */
  collapse(): void {
    this.sfx.noise(0.9, { frequency: 500, sweepTo: 70, gain: 0.3 });
    this.sfx.tone(60, 0.6, { slideTo: 35, gain: 0.2 });
  }

  /** The Heart catches fire: a whoosh and a chord that swells. */
  ignite(): void {
    this.sfx.noise(3, { filter: 'bandpass', frequency: 150, sweepTo: 3200, gain: 0.22 });
    [262, 330, 392, 523].forEach((note, i) =>
      this.sfx.tone(note, 3, { type: 'triangle', gain: 0.1, attack: 0.8, delay: 0.4 + i * 0.25 }),
    );
  }

  /** The lava wins this time. */
  escapeFailed(): void {
    this.sfx.noise(0.8, { filter: 'highpass', frequency: 2000, sweepTo: 5000, gain: 0.18 });
    this.sfx.tone(330, 0.6, { type: 'triangle', slideTo: 165, gain: 0.12 });
  }

  /** Out of the ground with the Heart burning: a happy fanfare. */
  fanfare(): void {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((note, i) =>
      this.sfx.tone(note, i === notes.length - 1 ? 1.2 : 0.25, {
        type: 'triangle',
        gain: 0.16,
        delay: i * 0.14,
      }),
    );
  }
}
