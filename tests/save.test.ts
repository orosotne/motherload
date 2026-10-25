import { describe, expect, it } from 'vitest';
import { Block } from '../src/data/blocks';
import { migrate } from '../src/save/migrations';
import { newGame, restore, serialize } from '../src/save/save';
import { SCHEMA_VERSION } from '../src/save/schema';
import { readSave, writeSave, type SaveStorage } from '../src/save/storage';
import { defaultSettings } from '../src/sim/game';
import { createPod } from '../src/sim/pod';
import { statsFor } from '../src/sim/stats';
import { WORLD_VERSION } from '../src/world/generator';

function memoryStorage(): SaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

/** A game with some progress: dug cells, cash, upgrades, items, relics. */
function playedGame() {
  const settings = defaultSettings();
  const { state, baseline } = newGame(1234, settings);
  for (let row = 0; row < 12; row++) state.grid.set(20, row, Block.Empty);
  state.grid.set(5, 3, Block.Ore, 4);
  state.pod = createPod(20, 11, settings.pod.halfSize);
  state.time = 321.5;
  state.cash = 4321;
  state.tiers.drill = 2;
  state.tiers.cargo = 1;
  state.stats = statsFor(state.tiers);
  state.fuel = 7.25;
  state.hull = 21;
  state.cargo[2] = 3;
  state.slots[0] = { item: 'anchor', anchor: { col: 20, row: 11 } };
  state.slots[3] = { item: 'megaCharge', anchor: null };
  state.selectedSlot = 3;
  state.heat = 0.3;
  state.relics[0] = true;
  state.deepestZone = 2;
  return { state, baseline, settings };
}

describe('saving (§9.8)', () => {
  it('survives a reload: the same world and the same progress come back', () => {
    const { state, baseline, settings } = playedGame();
    const storage = memoryStorage();
    expect(writeSave(serialize(state, baseline), storage)).toBe(true);

    const data = readSave(storage);
    expect(data?.schemaVersion).toBe(SCHEMA_VERSION);
    if (!data) throw new Error('no save');
    const loaded = restore(data, settings).state;
    expect(loaded.grid.snapshot()).toEqual(state.grid.snapshot());
    expect(loaded.seed).toBe(1234);
    expect([loaded.pod.x, loaded.pod.y]).toEqual([state.pod.x, state.pod.y]);
    expect(loaded.time).toBe(321.5);
    expect([loaded.cash, loaded.fuel, loaded.hull]).toEqual([4321, 7.25, 21]);
    expect(loaded.tiers).toEqual(state.tiers);
    expect(loaded.stats).toEqual(state.stats);
    expect(loaded.cargo).toEqual(state.cargo);
    expect(loaded.slots).toEqual(state.slots);
    expect(loaded.selectedSlot).toBe(3);
    expect(loaded.heat).toBe(0.3);
    expect(loaded.relics).toEqual(state.relics);
    expect(loaded.deepestZone).toBe(2);
  });

  it('stores the world as the seed plus only the changed cells', () => {
    const { state, baseline } = playedGame();
    const data = serialize(state, baseline);
    // 12 dug cells plus one changed ore, three numbers each (some cells may already be empty).
    expect(data.world.length % 3).toBe(0);
    expect(data.world.length / 3).toBeLessThanOrEqual(13);
    expect(data.world.length / 3).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(data).length).toBeLessThan(2000);
  });

  it('saves a pod caught mid-drill where the drilling began', () => {
    const { state, baseline, settings } = playedGame();
    state.pod.drill = {
      col: 20,
      row: 12,
      dir: 'down',
      duration: 1,
      elapsed: 0.5,
      fromX: 20,
      fromY: state.pod.y,
      toX: 20,
      toY: state.pod.y - 1,
    };
    const startY = state.pod.y;
    state.pod.y -= 0.5;
    expect(serialize(state, baseline).pod.y).toBe(startY);
    expect(restore(serialize(state, baseline), settings).state.pod.drill).toBeNull();
  });

  it('starts over when the save is missing, damaged or from an unknown version', () => {
    const storage = memoryStorage();
    expect(readSave(storage)).toBeNull();
    storage.data.set('hlbina.save', '{not json');
    expect(readSave(storage)).toBeNull();
    expect(migrate({ schemaVersion: 99, seed: 1 })).toBeNull();
    expect(migrate({ schemaVersion: 1 })).toBeNull();
    expect(migrate('save')).toBeNull();
  });

  it('repairs bad values instead of losing the game', () => {
    const data = migrate({
      schemaVersion: 1,
      worldVersion: WORLD_VERSION,
      seed: 7,
      cash: 'lots',
      hull: -5,
      tiers: { drill: 99, hull: -1 },
      slots: [{ item: 'rocket' }, { item: 'charge' }],
      relics: [true, 'yes'],
      world: [5, Block.Empty, 0, -1, 2, 0, 3, 99, 0],
    });
    expect(data?.cash).toBe(0);
    expect(data?.hull).toBe(1);
    expect(data?.tiers.drill).toBe(5);
    expect(data?.tiers.hull).toBe(0);
    expect(data?.slots.slice(0, 2)).toEqual([null, { item: 'charge', anchor: null }]);
    expect(data?.relics.slice(0, 2)).toEqual([true, false]);
    expect(data?.world).toEqual([5, Block.Empty, 0]);
  });

  it('keeps progress but not the changed cells of a world from another generator version', () => {
    const { state, baseline } = playedGame();
    const old = { ...serialize(state, baseline), worldVersion: WORLD_VERSION - 1 };
    const data = migrate(JSON.parse(JSON.stringify(old)));
    expect(data?.world).toEqual([]);
    expect(data?.cash).toBe(4321);
    expect(data?.pod.y).toBeGreaterThan(0);
  });

  it('copes with storage the browser refuses', () => {
    const refusing: SaveStorage = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => undefined,
    };
    const { state, baseline } = playedGame();
    expect(writeSave(serialize(state, baseline), refusing)).toBe(false);
    expect(readSave(refusing)).toBeNull();
  });
});
