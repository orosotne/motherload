import type { EventBus } from '../core/events';
import { RECOVERY } from '../data/economy';
import type { GameEvents } from '../sim/events';
import type { GameState } from '../sim/game';

/** Seconds to fade back in after the pod reappears on the surface. */
const FADE_IN = 0.45;

function ramp(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/**
 * Fades to black at the end of a rescue tow or after a destroyed pod, and back in once the pod
 * is on the surface, so the jump there is never seen.
 */
export class Fade {
  private readonly root = document.createElement('div');
  private fadeIn = 0;

  constructor(parent: HTMLElement, events: EventBus<GameEvents>) {
    this.root.className = 'fade';
    parent.append(this.root);
    events.on('Rescued', () => (this.fadeIn = FADE_IN));
    events.on('Respawned', () => (this.fadeIn = FADE_IN));
  }

  update(state: GameState, dt: number): void {
    const { status } = state;
    let opacity = 0;
    if (status.kind === 'rescue') {
      opacity = ramp((1 - status.left / RECOVERY.rescueSeconds - 0.72) / 0.28);
    } else if (status.kind === 'respawn') {
      opacity = ramp((1 - status.left / RECOVERY.respawnSeconds - 0.5) / 0.5);
    } else if (this.fadeIn > 0) {
      this.fadeIn = Math.max(this.fadeIn - dt, 0);
      opacity = this.fadeIn / FADE_IN;
    }
    // A hidden overlay costs nothing to composite; an invisible one still covers the screen.
    this.root.style.visibility = opacity > 0 ? 'visible' : 'hidden';
    this.root.style.opacity = opacity.toFixed(3);
  }
}
