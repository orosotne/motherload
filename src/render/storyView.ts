import { Color, Group } from 'three';
import type { EventBus } from '../core/events';
import { QUAKE } from '../data/story';
import { zoneAt } from '../data/zones';
import type { GameEvents } from '../sim/events';
import type { GameState } from '../sim/game';
import { Celebration } from './celebration';
import { Burst } from './effects/burst';
import { Particles } from './effects/particles';
import type { Shake } from './effects/shake';
import { EscapeLava } from './escapeLava';
import { HeartView } from './heartView';
import { rockColor } from './palette';

/** Trauma held while the ground shakes (§5.7: strength is trauma², so about half). */
const QUAKE_TRAUMA = 0.72;
/** Pale dust that shows in the dark of the deep zones too. */
const DUST = '#D8C8B0';

/**
 * What the story adds to the world (GAME_SPEC §7): the Heart in its chamber, two seconds of
 * shaking and falling dust on a quake, the collapsing core and the rising lava of the escape,
 * and the blooming planet after the ending.
 */
export class StoryView {
  readonly group = new Group();
  private readonly heart = new HeartView();
  private readonly lava: EscapeLava;
  private readonly celebration: Celebration;
  private readonly dust = new Particles(260, false);
  private readonly flare = new Burst(1.1, 3.5);
  private readonly dustColor = new Color();
  private quakeLeft = 0;
  private dustDue = 0;

  constructor(
    private readonly state: GameState,
    private readonly shake: Shake,
    events: EventBus<GameEvents>,
  ) {
    this.lava = new EscapeLava(state.grid.width);
    this.celebration = new Celebration(state.grid);
    this.group.add(
      this.heart.root,
      this.lava.root,
      this.celebration.root,
      this.dust.mesh,
      this.flare.mesh,
    );
    events.on('Earthquake', ({ col, row }) => {
      this.quakeLeft = QUAKE.seconds;
      // Rock bursting where the new cave opens.
      this.dust.emit(col, -row, DUST, { count: 40, speed: 5, lift: 2, size: 0.18, spread: 3 });
    });
    events.on('Collapse', ({ col, row }) => {
      this.shake.add(0.4);
      this.dust.emit(col, -row, this.rock(row), {
        count: 22,
        speed: 3,
        lift: 1,
        size: 0.16,
        spread: 2.5,
      });
    });
    events.on('HeartIgnited', () => this.shake.add(0.35));
    events.on('EscapeStarted', () => {
      const { pod } = this.state;
      this.flare.start(pod.x + 2.5, pod.y);
      this.shake.add(0.6);
    });
  }

  private rock(row: number): Color {
    return this.dustColor.copy(rockColor(zoneAt(Math.max(row, 0)).index));
  }

  /** `focusX`, `focusY`: where the camera looks. */
  update(dt: number, focusX: number, focusY: number): void {
    const { state } = this;
    this.heart.update(state, dt);
    this.lava.update(state, dt, focusX);
    this.celebration.update(state.story.finished, dt);
    if (this.quakeLeft > 0) {
      this.quakeLeft -= dt;
      this.shake.add(Math.max(QUAKE_TRAUMA - this.shake.level, 0));
      // Dust trickles from the ceiling all around the view.
      this.dustDue += dt * 45;
      while (this.dustDue >= 1) {
        this.dustDue -= 1;
        const x = focusX + Math.sin(this.quakeLeft * 91 + this.dustDue * 7) * 0.5 * 22;
        this.dust.emit(x, focusY + 7, DUST, {
          count: 1,
          speed: 0.6,
          size: 0.13,
          gravity: 9,
          life: 1.1,
        });
      }
    }
    this.dust.update(dt);
    this.flare.update(dt);
  }
}
