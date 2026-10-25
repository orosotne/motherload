import { WORLD } from '../data/world';
import { t } from '../i18n';
import type { GameState } from '../sim/game';

/** Below this many seconds or metres the timer turns red and pulses. */
const CRITICAL_SECONDS = 15;
const CRITICAL_METERS = 40;

/** Minutes and seconds left, rounded up: 1:30, 0:09. */
export function clock(seconds: number): string {
  const whole = Math.max(Math.ceil(seconds), 0);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** Metres between the pod's underside and the lava's surface during the escape. */
export function lavaGap(state: GameState, half: number): number {
  const lavaRow = state.finale?.lavaRow ?? Infinity;
  return Math.max((state.pod.y - half - (0.5 - lavaRow)) * WORLD.metersPerBlock, 0);
}

/**
 * The escape's countdown at the top (GAME_SPEC §7): seconds until the lava reaches the surface
 * and how far below the pod it is.
 */
export class EscapeTimer {
  private readonly root = document.createElement('div');
  private readonly label = document.createElement('span');
  private readonly time = document.createElement('b');
  private readonly gap = document.createElement('span');
  private shown = '';

  constructor(
    parent: HTMLElement,
    private readonly half: number,
  ) {
    this.root.className = 'escape';
    this.root.hidden = true;
    this.label.className = 'escape-label';
    this.root.append(this.label, this.time, this.gap);
    // First in the layer, so the toasts after it can make room (story.css).
    parent.prepend(this.root);
  }

  update(state: GameState): void {
    const finale = state.finale;
    const running = finale?.phase === 'escape';
    this.root.hidden = !running;
    if (!running) return;
    const meters = Math.round(lavaGap(state, this.half));
    const text = [t('escape.label'), clock(finale.left), t('escape.lava', { meters })].join('|');
    if (text === this.shown) return;
    this.shown = text;
    const [label = '', time = '', gap = ''] = text.split('|');
    this.label.textContent = label;
    this.time.textContent = time;
    this.gap.textContent = gap;
    this.root.classList.toggle(
      'is-critical',
      finale.left <= CRITICAL_SECONDS || meters <= CRITICAL_METERS,
    );
  }
}
