import type { EventBus } from '../core/events';
import {
  DEPTH_MILESTONES,
  FINALE_MESSAGES,
  FIRST_MESSAGES,
  INTRO_MESSAGES,
  mineralMessage,
  relicMessage,
  ZONE_MESSAGES,
  type RadioMessage,
} from '../data/story';
import { RELICS } from '../data/relics';
import { depthMeters } from '../sim/buildings';
import type { GameEvents } from '../sim/events';
import type { GameState } from '../sim/game';
import { nearHeart, relicCount } from './finale';

/**
 * Decides what the radio says (GAME_SPEC §7): depth milestones, the first find of each mineral,
 * the first accident of each kind, relics, the Voice from the depths and the finale. Each message
 * plays once; the ids played are saved in `story.seen`. That is all it writes, and no game rule
 * reads it, so the simulation runs the same with or without the director listening.
 */
export class StoryDirector {
  constructor(
    private readonly state: GameState,
    private readonly events: EventBus<GameEvents>,
  ) {
    const once = (message: RadioMessage) => () => this.once(message);
    events.on('MineralCollected', ({ mineral }) => this.once(mineralMessage(mineral)));
    events.on('RelicFound', ({ index }) => this.once(relicMessage(index)));
    events.on('ZoneEntered', ({ zone, first }) => {
      if (first) for (const message of ZONE_MESSAGES[zone] ?? []) this.once(message);
    });
    events.on('BlockBroken', () => {
      this.checkDepth();
      this.checkHeart();
    });
    events.on('Landed', () => {
      this.checkDepth();
      this.checkHeart();
    });
    events.on('Damaged', ({ source }) => {
      if (source === 'fall') this.once(FIRST_MESSAGES.fall);
    });
    events.on('Explosion', ({ source }) => {
      if (source === 'gas') this.once(FIRST_MESSAGES.gas);
    });
    events.on('LavaContact', once(FIRST_MESSAGES.lava));
    events.on('Overheat', once(FIRST_MESSAGES.heat));
    events.on('RescueStarted', () => {
      if (!state.finale) this.once(FIRST_MESSAGES.rescue);
    });
    events.on('Destroyed', () => {
      if (!state.finale) this.once(FIRST_MESSAGES.wreck);
    });
    events.on('CargoFull', once(FIRST_MESSAGES.cargoFull));
    events.on('FuelAlert', once(FIRST_MESSAGES.fuelLow));
    events.on('UpgradeBought', once(FIRST_MESSAGES.upgrade));
    events.on('HeartIgnited', () => this.play(FINALE_MESSAGES.ignite));
    events.on('EscapeStarted', ({ attempt }) =>
      this.play(attempt > 1 ? FINALE_MESSAGES.retry : FINALE_MESSAGES.escape),
    );
    events.on('FinaleAbandoned', () => this.play(FINALE_MESSAGES.abandon));
  }

  /** A new game opens with Gus and Pip saying hello. */
  start(): void {
    for (const message of INTRO_MESSAGES) this.once(message);
  }

  private play(message: RadioMessage): void {
    this.events.emit('Radio', { message });
  }

  private once(message: RadioMessage): void {
    if (this.state.story.seen.includes(message.id)) return;
    this.state.story.seen.push(message.id);
    this.play(message);
  }

  /** The deepest milestone passed speaks; shallower ones it skipped stay silent. */
  private checkDepth(): void {
    const depth = depthMeters(this.state.pod);
    const passed = DEPTH_MILESTONES.filter(({ meters }) => depth >= meters);
    const deepest = passed.at(-1);
    if (!deepest || this.state.story.seen.includes(deepest.message.id)) return;
    for (const { message } of passed) {
      if (message !== deepest.message && !this.state.story.seen.includes(message.id)) {
        this.state.story.seen.push(message.id);
      }
    }
    this.once(deepest.message);
  }

  /** The Heart speaks when the pod first stands by it: ready, or waiting for more relics. */
  private checkHeart(): void {
    if (!nearHeart(this.state)) return;
    const ready = relicCount(this.state) >= RELICS.neededForFinale;
    this.once(ready ? FINALE_MESSAGES.heartReady : FINALE_MESSAGES.heartNeedsRelics);
  }
}
