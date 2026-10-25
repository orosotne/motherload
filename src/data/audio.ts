/** Mixer defaults (GAME_SPEC §8): volumes from 0 to 1. The settings remember the player's own. */
export interface AudioVolumes {
  master: number;
  music: number;
  sfx: number;
}

export const AUDIO_DEFAULTS: Readonly<AudioVolumes> = { master: 0.8, music: 0.5, sfx: 0.8 };

/** Seconds a zone's music takes to fade into the next one's. */
export const MUSIC_CROSSFADE = 2.5;
