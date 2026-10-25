import { EventBus } from '../../src/core/events';
import { BALANCE } from '../../src/data/balance';
import { Block } from '../../src/data/blocks';
import { ENGINE } from '../../src/data/engine';
import { mineralById } from '../../src/data/minerals';
import { WORLD } from '../../src/data/world';
import { newGame } from '../../src/save/save';
import type { GameEvents } from '../../src/sim/events';
import { defaultSettings, stepGame } from '../../src/sim/game';
import { rowOf } from '../../src/sim/pod';
import type { Grid } from '../../src/world/grid';
import { Bot } from './bot';

export interface Milestone {
  minutes: number;
  text: string;
}

/** One whole game played by the bot, as a player would see the clock. */
export interface Playthrough {
  seed: number;
  /** The Heart burns again and the pod got out. */
  finished: boolean;
  minutes: number;
  trips: number;
  rescues: number;
  wrecks: number;
  escapesLost: number;
  relics: number;
  deepestMeters: number;
  firstUpgradeMinutes: number | null;
  /** Most trips in a row that ended without an upgrade, and the longest wait for one. */
  maxDryTrips: number;
  maxUpgradeGapMinutes: number;
  /** Dollars paid for upgrades and items, and the value of the ore still in the ground. */
  spent: number;
  oreLeft: number;
  zoneMinutes: Record<number, number>;
  milestones: Milestone[];
  /** Why it ended before the finale, if it did. */
  stopped: string | null;
}

/** Dollars of ore still in the ground. */
function oreValue(grid: Grid): number {
  let value = 0;
  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      if (grid.get(col, row) === Block.Ore)
        value += mineralById(grid.mineral(col, row))?.value ?? 0;
    }
  }
  return value;
}

/** Minutes of game time without a new depth or a sale before the bot counts as stuck. */
const STUCK_MINUTES = 20;

/**
 * Plays a whole game with the bot on the real simulation (GAME_SPEC F6). The clock adds the
 * time a player spends in the shops on every surface stop, as the economy model does.
 */
export function playthrough(seed: number, maxHours: number): Playthrough {
  const settings = defaultSettings();
  const { state } = newGame(seed, settings);
  const events = new EventBus<GameEvents>();
  const bot = new Bot(state, settings, events);
  const dt = 1 / ENGINE.simHz;
  const minutes = (): number => (state.time + bot.visits * BALANCE.surfaceSeconds) / 60;
  const result: Playthrough = {
    seed,
    finished: false,
    minutes: 0,
    trips: 0,
    rescues: 0,
    wrecks: 0,
    escapesLost: 0,
    relics: 0,
    deepestMeters: 0,
    firstUpgradeMinutes: null,
    maxDryTrips: 0,
    maxUpgradeGapMinutes: 0,
    spent: 0,
    oreLeft: 0,
    zoneMinutes: {},
    milestones: [],
    stopped: null,
  };
  const note = (text: string): void => {
    result.milestones.push({ minutes: minutes(), text });
  };
  let upgrades = 0;
  let lastUpgrade = 0;
  events.on('UpgradeBought', ({ branch, tier, price }) => {
    result.firstUpgradeMinutes ??= minutes();
    result.maxUpgradeGapMinutes = Math.max(result.maxUpgradeGapMinutes, minutes() - lastUpgrade);
    result.spent += price;
    lastUpgrade = minutes();
    upgrades++;
    note(`${branch} T${tier + 1}`);
  });
  events.on('ItemBought', ({ price }) => {
    result.spent += price;
  });
  events.on('ZoneEntered', ({ zone, first }) => {
    if (first) result.zoneMinutes[zone] = minutes();
  });
  events.on('RelicFound', ({ index }) => {
    result.relics++;
    note(`relic ${index + 1}`);
  });
  events.on('RescueStarted', () => result.rescues++);
  events.on('Destroyed', () => result.wrecks++);
  events.on('EscapeFailed', () => result.escapesLost++);
  events.on('HeartIgnited', () => note('the Heart lit'));
  events.on('FinaleWon', () => {
    result.finished = true;
    note('escaped');
  });

  let deepest = 0;
  let lastProgress = 0;
  // Progress: a new depth, or anything earned (a sale or a relic).
  events.on('Sold', ({ value }) => {
    if (value > 0) lastProgress = state.time;
  });
  events.on('RelicFound', () => {
    lastProgress = state.time;
  });
  // The first stop at the shops is before any trip.
  let visits = 1;
  let upgradesBefore = 0;
  let dry = 0;
  while (!result.finished) {
    stepGame(state, bot.frame(dt), dt, settings, events);
    if (bot.visits > visits) {
      visits = bot.visits;
      dry = upgrades > upgradesBefore ? 0 : dry + 1;
      upgradesBefore = upgrades;
      result.maxDryTrips = Math.max(result.maxDryTrips, dry);
    }
    const row = rowOf(state.pod.y);
    if (row > deepest) lastProgress = state.time;
    deepest = Math.max(deepest, row);
    if (minutes() > maxHours * 60) {
      result.stopped = `out of time after ${maxHours} h`;
      break;
    }
    if (state.time - lastProgress > STUCK_MINUTES * 60 && !state.finale) {
      result.stopped = `stuck in ${bot.mode} at row ${row}`;
      break;
    }
  }
  result.minutes = minutes();
  result.trips = bot.visits;
  result.oreLeft = oreValue(state.grid);
  result.deepestMeters = (deepest + 1) * WORLD.metersPerBlock;
  return result;
}
