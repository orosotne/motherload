import { WORLD } from './world';

/** Who talks on the radio (GAME_SPEC §7). */
export type Speaker = 'gus' | 'mira' | 'pip' | 'voice';

/**
 * Radio messages (§7): each plays once, at its trigger. The text is `radio.<id>` in i18n.
 * `blocking` ones stop the game until read; only the finale has them (§7).
 */
export interface RadioMessage {
  id: string;
  speaker: Speaker;
  blocking?: boolean;
}

const gus = (id: string): RadioMessage => ({ id: `gus.${id}`, speaker: 'gus' });
const mira = (id: string): RadioMessage => ({ id: `mira.${id}`, speaker: 'mira' });
const pip = (id: string): RadioMessage => ({ id: `pip.${id}`, speaker: 'pip' });
const voice = (id: string): RadioMessage => ({ id: `voice.${id}`, speaker: 'voice' });

/** A new game: the station needs income, and there is the legend of the Heart (§7). */
export const INTRO_MESSAGES: readonly RadioMessage[] = [gus('intro'), mira('intro'), pip('intro')];

/** Depth milestones in metres with their message, besides the zone entries (§7). */
export const DEPTH_MILESTONES: readonly { meters: number; message: RadioMessage }[] = [
  { meters: 100, message: gus('depth100') },
  { meters: 400, message: pip('depth400') },
  { meters: 900, message: mira('depth900') },
  { meters: 1400, message: gus('depth1400') },
  { meters: 1900, message: mira('depth1900') },
];

/**
 * The first visit to each zone. From zone 3 on, the ground shakes (Gus says so) and the Voice
 * from the depths joins in: static first, then fragments of words (§7).
 */
export const ZONE_MESSAGES: Readonly<Record<number, readonly RadioMessage[]>> = {
  2: [gus('zone2')],
  3: [gus('quake3'), voice('zone3')],
  4: [gus('quake4'), voice('zone4')],
  5: [mira('quake5'), voice('zone5')],
};

/** The first accident of each kind (§7) and other firsts worth a word of advice. */
export const FIRST_MESSAGES = {
  fall: gus('firstFall'),
  gas: gus('firstGas'),
  lava: gus('firstLava'),
  heat: gus('firstHeat'),
  rescue: pip('firstRescue'),
  wreck: gus('firstWreck'),
  cargoFull: mira('cargoFull'),
  fuelLow: pip('fuelLow'),
  upgrade: gus('firstUpgrade'),
} as const satisfies Record<string, RadioMessage>;

/** Mira's word on the first find of each mineral (§7), by mineral id. */
export function mineralMessage(mineral: number): RadioMessage {
  return mira(`mineral.${mineral}`);
}

/** Mira's comment on relic `index` (0-based); the Album shows it too (§7). */
export function relicMessage(index: number): RadioMessage {
  return mira(`relic.${index + 1}`);
}

/** The finale (§7): the Heart speaks, it catches fire, the escape and its retries. */
export const FINALE_MESSAGES = {
  heartNeedsRelics: voice('heartNeedsRelics'),
  heartReady: voice('heartReady'),
  ignite: { ...voice('ignite'), blocking: true },
  escape: gus('escape'),
  retry: pip('retry'),
  abandon: pip('abandon'),
} as const satisfies Record<string, RadioMessage>;

/** Zones whose first visit shakes the ground and opens a new cave (§7). */
export const QUAKE_ZONES: readonly number[] = [3, 4, 5];

export const QUAKE = {
  /** Seconds of shaking (§7). */
  seconds: 2,
  /** The new cave: how far below the pod it starts, how long and how wide it is. */
  startBelow: 4,
  length: [18, 28] as const,
  width: 2,
  /** Columns from the pod's to look for its spot. */
  reach: 6,
} as const;

/** The Heart's chamber at the bottom of the world (§7): rows and columns, inclusive. */
export const HEART = {
  chamber: { firstRow: WORLD.height - 11, lastRow: WORLD.height - 3, firstCol: 14, lastCol: 25 },
  /** The Heart itself, 2 × 2 blocks on the chamber floor. */
  cols: [19, 20] as const,
  rows: [WORLD.height - 4, WORLD.height - 3] as const,
  /** How close the pod must stand to reignite it, in blocks from its centre. */
  reach: 2.4,
} as const;

/** The finale (§7). */
export const FINALE = {
  /** Seconds the Heart takes to catch fire, while the player watches. */
  igniteSeconds: 3.5,
  /** Seconds from the start of the escape until the lava reaches the surface. */
  escapeSeconds: 90,
  /** Seconds the lava gives on each new try after it caught the pod (pillar 4). */
  slackPerFailure: 15,
  /** Seconds before the lava starts rising. */
  graceSeconds: 5,
  /**
   * How the lava speeds up: its share of the way is (time share)^this. Above 1 it starts slow,
   * while the pod finds its way out of the chamber, and still reaches the top on time.
   */
  lavaEase: 1.6,
  /** Row the lava starts from, below the world. */
  lavaStartRow: WORLD.height + 6,
  /** Seconds between collapses that open new ways up during the escape. */
  collapseSeconds: 6,
  /** Where a collapse opens: rows above the pod, columns to either side. */
  collapseRows: [3, 9] as const,
  collapseCols: 6,
  /** Rows under the surface a collapse never touches, so the station stands firm. */
  collapseTopRows: 2,
} as const;

/** The radio window (§7): a typewriter, at most two lines, then it waits and fades. */
export const RADIO = {
  charsPerSecond: 42,
  /** Seconds a finished message stays: a base plus a little per character. */
  holdSeconds: 2.2,
  holdPerChar: 0.035,
  /** Longest text that still fits on two lines. */
  maxChars: 110,
  /** A message that waited longer than this in the queue is no news any more and is dropped. */
  staleSeconds: 30,
} as const;
