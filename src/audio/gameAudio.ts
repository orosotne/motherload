import type { EventBus } from '../core/events';
import type { GameEvents } from '../sim/events';
import type { GameState, SimSettings } from '../sim/game';
import { rowOf } from '../sim/pod';
import { hardnessAt } from '../sim/drilling';
import { AudioEngine } from './engine';
import { Music } from './music';
import { Sfx } from './sfx';

/** Sound for the game (§8): effects on events, the drill and engine loops, music per zone. */
export class GameAudio {
  readonly engine = new AudioEngine();
  readonly sfx = new Sfx(this.engine);
  private readonly music = new Music(this.engine);

  constructor(
    private readonly state: GameState,
    private readonly settings: SimSettings,
    events: EventBus<GameEvents>,
  ) {
    const { sfx } = this;
    events.on('BlockBroken', () => sfx.noise(0.08, { frequency: 700, gain: 0.12 }));
    events.on('Landed', ({ speed }) => {
      if (speed > 3) sfx.landing(speed);
    });
    events.on('MineralCollected', ({ value }) => sfx.chime(value));
    events.on('CargoFull', () => sfx.tone(140, 0.25, { type: 'square', gain: 0.08 }));
    events.on('Damaged', ({ source }) => {
      if (source === 'fall' || source === 'gas') sfx.damage();
    });
    events.on('FuelAlert', ({ level }) => sfx.fuelWarning(level));
    events.on('GasHiss', () => sfx.hiss());
    events.on('DrillAborted', () => sfx.aborted());
    events.on('Explosion', ({ radius }) => sfx.explosion(radius));
    events.on('LavaContact', () => sfx.sizzle());
    events.on('Overheat', ({ level }) => {
      if (level === 2) sfx.alarm();
    });
    events.on('RelicFound', () => sfx.relic());
    events.on('UpgradeBought', () => sfx.buy());
    events.on('ItemBought', () => sfx.buy());
    events.on('Sold', () => sfx.buy());
    events.on('ItemUsed', () => sfx.item());
    events.on('ItemRefused', () => sfx.tone(180, 0.12, { type: 'square', gain: 0.06 }));
    events.on('Teleported', () => sfx.teleport());
    events.on('RescueStarted', () => sfx.drone());
    events.on('Destroyed', () => sfx.explosion(2));
  }

  /** Per frame: the drill and engine loops follow the pod, the music follows the zone. */
  update(): void {
    const { state } = this;
    const { pod, grid } = state;
    if (pod.drill && state.status.kind === 'play') {
      const life = this.settings.feel.drillLife;
      const hardness = life.enabled ? (hardnessAt(grid, pod.drill.col, pod.drill.row) ?? 1) : 1.5;
      this.sfx.drillOn(life.pitchBase + life.pitchPerHardness * hardness);
    } else {
      this.sfx.drillOff();
    }
    this.sfx.thrust(state.status.kind === 'play' ? pod.thrust : 0);
    this.music.update(rowOf(pod.y) < 0 ? 'surface' : `zone${state.zone}`);
  }
}
