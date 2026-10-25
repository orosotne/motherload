import type { GameState } from '../sim/game';

/**
 * A red glow creeping in from the screen edges as the overheat meter fills (§3), so the heat is
 * felt without looking at the HUD.
 */
export class HeatGlow {
  private readonly root = document.createElement('div');
  private shown = -1;

  constructor(parent: HTMLElement) {
    this.root.className = 'heat-glow';
    parent.append(this.root);
  }

  update(state: GameState): void {
    const level = Math.round(state.heat * 20) / 20;
    if (level === this.shown) return;
    this.shown = level;
    this.root.style.opacity = String(level);
    this.root.style.visibility = level > 0 ? 'visible' : 'hidden';
  }
}
