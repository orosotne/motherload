import { Block } from '../data/blocks';
import { ITEM_IDS, SUPPLY, type ItemId } from '../data/items';
import { MAX_MINERAL_ID } from '../data/minerals';
import { RELICS } from '../data/relics';
import { INTRO_MESSAGES, QUAKE_ZONES, relicMessage, ZONE_MESSAGES } from '../data/story';
import { UPGRADE_BRANCHES, type UpgradeBranch } from '../data/upgrades';
import { WORLD } from '../data/world';
import { ZONES } from '../data/zones';
import { maxTier } from '../sim/upgrades';
import { withBit } from '../story/state';
import { WORLD_VERSION } from '../world/generator';
import { surfacePod } from './save';
import { SCHEMA_VERSION, type SaveData } from './schema';

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Math.max(value, min), max)
    : fallback;
}

function whole(value: unknown, fallback: number, min: number, max: number): number {
  return Math.round(finite(value, fallback, min, max));
}

function tiers(raw: unknown): Record<UpgradeBranch, number> {
  const source = isRecord(raw) ? raw : {};
  const result = {} as Record<UpgradeBranch, number>;
  for (const branch of UPGRADE_BRANCHES)
    result[branch] = whole(source[branch], 0, 0, maxTier(branch));
  return result;
}

/**
 * Equipment slots. An anchor set in a world from another generator version points into rock
 * that was never dug there, so it comes back unset: the item stays, ready to be set again.
 */
function slots(raw: unknown, sameWorld: boolean): SaveData['slots'] {
  const source = Array.isArray(raw) ? raw : [];
  return Array.from({ length: SUPPLY.slots }, (_, index) => {
    const slot: unknown = source[index];
    if (!isRecord(slot) || !ITEM_IDS.includes(slot.item as ItemId)) return null;
    const anchor =
      sameWorld && isRecord(slot.anchor)
        ? {
            col: whole(slot.anchor.col, 0, 0, WORLD.width - 1),
            row: whole(slot.anchor.row, 0, 0, WORLD.height - 1),
          }
        : null;
    return { item: slot.item as ItemId, anchor: slot.item === 'anchor' ? anchor : null };
  });
}

/** Changed cells, keeping only triples that make sense for this world. */
function world(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const values: unknown[] = raw;
  const cells = WORLD.width * WORLD.height;
  const out: number[] = [];
  const int = (value: unknown, below: number): number =>
    Number.isInteger(value) && (value as number) >= 0 && (value as number) < below
      ? (value as number)
      : -1;
  // Every block id the grid stores; Bedrock only exists outside it.
  const blocks = new Set<number>(Object.values(Block).filter((id) => id !== Block.Bedrock));
  for (let i = 0; i + 2 < values.length; i += 3) {
    const cell = int(values[i], cells);
    const block = values[i + 1];
    const mineral = int(values[i + 2], MAX_MINERAL_ID + 1);
    if (cell >= 0 && blocks.has(block as number) && mineral >= 0) {
      out.push(cell, block as number, mineral);
    }
  }
  return out;
}

type Story = SaveData['story'];

/** Radio ids are short dotted words, e.g. `mira.relic.3`. */
const MESSAGE_ID = /^[a-z]+(\.[A-Za-z0-9]+)+$/;

function story(raw: unknown): Story {
  const source = isRecord(raw) ? raw : {};
  const seen = Array.isArray(source.seen) ? (source.seen as unknown[]) : [];
  return {
    seen: [
      ...new Set(seen.filter((id): id is string => typeof id === 'string' && MESSAGE_ID.test(id))),
    ],
    quakes: whole(source.quakes, 0, 0, 2 ** 30),
    finished: source.finished === true,
  };
}

/**
 * What a save from before the story (version 1) has lived through already: the intro, the
 * zones reached and the relics found keep quiet, and the zones passed do not quake again.
 */
function storySoFar(deepestZone: number, relics: readonly boolean[]): Story {
  const seen = INTRO_MESSAGES.map((message) => message.id);
  for (let zone = 2; zone <= deepestZone; zone++) {
    for (const message of ZONE_MESSAGES[zone] ?? []) seen.push(message.id);
  }
  relics.forEach((found, index) => {
    if (found) seen.push(relicMessage(index).id);
  });
  let quakes = 0;
  for (const zone of QUAKE_ZONES) if (zone <= deepestZone) quakes = withBit(quakes, zone);
  return { seen, quakes, finished: false };
}

/**
 * The fields versions 1 and 2 share, checked one by one: a damaged save loses a value, not the
 * whole game.
 */
function readCommon(raw: Raw): Omit<SaveData, 'story'> | null {
  if (typeof raw.seed !== 'number' || !Number.isInteger(raw.seed)) return null;
  const sameWorld = raw.worldVersion === WORLD_VERSION;
  const pod = isRecord(raw.pod) ? raw.pod : {};
  const fallbackPod = surfacePod();
  const cargo = Array.isArray(raw.cargo) ? raw.cargo : [];
  const relics = Array.isArray(raw.relics) ? raw.relics : [];
  return {
    schemaVersion: SCHEMA_VERSION,
    worldVersion: WORLD_VERSION,
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : '',
    seed: raw.seed >>> 0,
    time: finite(raw.time, 0, 0),
    // A world from another generator version is not ours to patch: start on the surface.
    pod: sameWorld
      ? {
          x: finite(pod.x, fallbackPod.x, -1, WORLD.width),
          y: finite(pod.y, fallbackPod.y, -WORLD.height, WORLD.skyRows),
          facing: pod.facing === -1 ? -1 : 1,
        }
      : fallbackPod,
    cash: whole(raw.cash, 0, 0, Number.MAX_SAFE_INTEGER),
    fuel: finite(raw.fuel, 0, 0),
    hull: whole(raw.hull, 1, 1, Number.MAX_SAFE_INTEGER),
    cargo: Array.from({ length: MAX_MINERAL_ID + 1 }, (_, id) =>
      id === 0 ? 0 : whole(cargo[id], 0, 0, 10_000),
    ),
    tiers: tiers(raw.tiers),
    slots: slots(raw.slots, sameWorld),
    selectedSlot: whole(raw.selectedSlot, 0, 0, SUPPLY.slots - 1),
    heat: finite(raw.heat, 0, 0, 1),
    relics: RELICS.depthsMeters.map((_, index) => relics[index] === true),
    deepestZone: whole(raw.deepestZone, 1, 1, ZONES.length),
    world: sameWorld ? world(raw.world) : [],
  };
}

/**
 * Reads a save of any known version into the current format, or null when it is not a save
 * this game can read. Each future version adds a step from the one before.
 */
export function migrate(raw: unknown): SaveData | null {
  if (!isRecord(raw)) return null;
  if (raw.schemaVersion !== 1 && raw.schemaVersion !== 2) return null;
  const common = readCommon(raw);
  if (!common) return null;
  // Version 2 added the story (F5).
  return {
    ...common,
    story:
      raw.schemaVersion === 1 ? storySoFar(common.deepestZone, common.relics) : story(raw.story),
  };
}
