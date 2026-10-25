import type { EventBus } from '../core/events';
import type { GamepadReader } from '../core/gamepad';
import type { FeelConfig } from '../data/feel';
import type { GameEvents } from '../sim/events';
import type { GameState } from '../sim/game';

/** Seconds between the soft pulses while drilling. */
const DRILL_PULSE = 0.18;

/**
 * Rumble (GAME_SPEC §5.9): soft pulses while drilling, a hard jolt for explosions, a bump for
 * hard landings and damage. Silent where the browser has no vibrationActuator.
 */
export class Rumble {
  private sinceDrillPulse = 0;

  constructor(
    private readonly pad: GamepadReader,
    private readonly feel: FeelConfig,
    events: EventBus<GameEvents>,
  ) {
    const on = (weak: number, strong: number, ms: number): void => {
      if (this.feel.rumble.enabled) this.pad.rumble(weak, strong, ms);
    };
    events.on('Explosion', ({ radius }) =>
      on(0.6, this.feel.rumble.explosion * (0.6 + radius * 0.2), 380),
    );
    events.on('Destroyed', () => on(0.8, this.feel.rumble.explosion, 500));
    events.on('Landed', ({ speed }) => {
      if (speed > 7) on(0.35, Math.min(speed / 14, 1) * 0.5, 120);
    });
    events.on('Damaged', ({ source }) => {
      if (source === 'fall' || source === 'gas') on(0.4, 0.4, 150);
    });
    events.on('MineralCollected', () => on(0.25, 0, 60));
  }

  /** Pulses while drilling; nothing while a menu stops the game (`paused`). */
  update(state: GameState, dt: number, paused: boolean): void {
    if (!state.pod.drill || !this.feel.rumble.enabled || paused) {
      this.sinceDrillPulse = DRILL_PULSE;
      return;
    }
    this.sinceDrillPulse += dt;
    if (this.sinceDrillPulse < DRILL_PULSE) return;
    this.sinceDrillPulse = 0;
    this.pad.rumble(this.feel.rumble.drill, 0, 120);
  }
}
