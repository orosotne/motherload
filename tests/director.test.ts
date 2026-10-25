import { describe, expect, it } from 'vitest';
import { MINERALS } from '../src/data/minerals';
import { RELICS } from '../src/data/relics';
import {
  DEPTH_MILESTONES,
  FINALE_MESSAGES,
  FIRST_MESSAGES,
  INTRO_MESSAGES,
  mineralMessage,
  RADIO,
  relicMessage,
  ZONE_MESSAGES,
  type RadioMessage,
} from '../src/data/story';
import en from '../src/i18n/en.json';
import sk from '../src/i18n/sk.json';
import { createPod } from '../src/sim/pod';
import { StoryDirector } from '../src/story/director';
import { byTheHeart, startEscape } from './helpers/finale';
import { gridFrom, Sim } from './helpers/sim';

/** A Sim with the story director listening, and the ids it put on the radio. */
function directed(sim: Sim): { sim: Sim; director: StoryDirector; said: () => string[] } {
  const director = new StoryDirector(sim.state, sim.bus);
  return { sim, director, said: () => sim.events('Radio').map((e) => e.payload.message.id) };
}

describe('the story director (§7)', () => {
  it('says hello once per game', () => {
    const { director, said, sim } = directed(new Sim(gridFrom(['...', '###']), 1, 0));
    director.start();
    director.start();
    expect(said()).toEqual(['gus.intro', 'mira.intro', 'pip.intro']);
    expect(sim.state.story.seen).toEqual(said());
  });

  it("gives Mira's word on the first find of each mineral, once", () => {
    const { sim, said } = directed(new Sim(gridFrom(['...', '#1#', '#1#', '#2#', '###']), 1, 0));
    sim.hold(['down'], 1).until((s) => s.events('MineralCollected').length === 3, 600);
    expect(said()).toEqual(['mira.mineral.1', 'mira.mineral.2']);
  });

  it('plays the deepest milestone passed and keeps the skipped ones quiet', () => {
    const { sim, said } = directed(new Sim(gridFrom(['...', '###']), 1, 0));
    sim.state.pod = createPod(1, 229, sim.settings.pod.halfSize);
    sim.bus.emit('Landed', { speed: 1, fallHeight: 0 });
    sim.bus.emit('Landed', { speed: 1, fallHeight: 0 });
    expect(said()).toEqual(['mira.depth900']);
    expect(sim.state.story.seen).toEqual(['gus.depth100', 'pip.depth400', 'mira.depth900']);
  });

  it('greets each zone on the first visit; from zone 3 on the Voice joins in', () => {
    const { sim, said } = directed(new Sim(gridFrom(['...', '###']), 1, 0));
    sim.bus.emit('ZoneEntered', { zone: 3, first: true });
    sim.bus.emit('ZoneEntered', { zone: 3, first: false });
    sim.bus.emit('ZoneEntered', { zone: 2, first: false });
    expect(said()).toEqual(['gus.quake3', 'voice.zone3']);
  });

  it('comments on the first accident of each kind, and relics every time one is found', () => {
    const { sim, said } = directed(new Sim(gridFrom(['...', '###']), 1, 0));
    const bus = sim.bus;
    bus.emit('Damaged', { amount: 4, source: 'fall', hull: 20 });
    bus.emit('Damaged', { amount: 4, source: 'fall', hull: 16 });
    bus.emit('Damaged', { amount: 2, source: 'heat', hull: 14 });
    bus.emit('Explosion', { col: 1, row: 1, radius: 1, source: 'charge' });
    bus.emit('Explosion', { col: 1, row: 1, radius: 1, source: 'gas' });
    bus.emit('RelicFound', { index: 2, bonus: 3000, col: 1, row: 129 });
    bus.emit('CargoFull', { mineral: 1, col: 1, row: 1 });
    bus.emit('CargoFull', { mineral: 1, col: 1, row: 1 });
    expect(said()).toEqual(['gus.firstFall', 'gus.firstGas', 'mira.relic.3', 'mira.cargoFull']);
  });

  it('speaks through the finale: the Heart, its fire and the escape', () => {
    const { sim, said } = directed(byTheHeart(6));
    sim.bus.emit('Landed', { speed: 1, fallHeight: 0 });
    startEscape(sim);
    expect(said()).toEqual(['mira.depth1900', 'voice.heartReady', 'voice.ignite', 'gus.escape']);
    const ignite = sim.events('Radio').find((e) => e.payload.message.id === 'voice.ignite');
    expect(ignite?.payload.message.blocking).toBe(true);
  });

  it('changes nothing but the list of messages played', () => {
    const rows = ['...', '#1#', '#2#', '###', '###'];
    const plain = new Sim(gridFrom(rows), 1, 0);
    const { sim } = directed(new Sim(gridFrom(rows), 1, 0));
    for (const run of [plain, sim]) run.hold(['down'], 200).hold(['up'], 60).hold([], 60);
    const strip = (s: Sim): unknown => ({ ...s.state, grid: s.state.grid.snapshot(), story: 0 });
    expect(strip(sim)).toEqual(strip(plain));
    expect(sim.state.story.seen.length).toBeGreaterThan(0);
  });
});

describe('radio texts (§7)', () => {
  it('exist for every message in both languages, and fit on two lines', () => {
    const messages: RadioMessage[] = [
      ...INTRO_MESSAGES,
      ...DEPTH_MILESTONES.map(({ message }) => message),
      ...Object.values(ZONE_MESSAGES).flat(),
      ...Object.values(FIRST_MESSAGES),
      ...Object.values(FINALE_MESSAGES),
      ...MINERALS.map(({ id }) => mineralMessage(id)),
      ...RELICS.depthsMeters.map((_, index) => relicMessage(index)),
    ];
    const keys = new Set(messages.map(({ id }) => `radio.${id}`));
    const english: Record<string, string> = en;
    const slovak: Record<string, string> = sk;
    for (const key of keys) {
      for (const text of [english[key], slovak[key]]) {
        expect(text, key).toBeTruthy();
        expect(text?.length ?? 0, key).toBeLessThanOrEqual(RADIO.maxChars);
      }
    }
    // And no text without a message to say it.
    const texts = Object.keys(en).filter(
      (key) => key.startsWith('radio.') && key !== 'radio.beeps',
    );
    expect(texts.filter((key) => !keys.has(key))).toEqual([]);
  });
});
