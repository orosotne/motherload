import type { FeelConfig } from '../data/feel';

/**
 * "+$150" that flies from the mined block to the cargo readout in the HUD (GAME_SPEC §5.6).
 */
export class Popups {
  constructor(
    private readonly parent: HTMLElement,
    private readonly feel: FeelConfig,
    /** Screen position of a world point, in CSS pixels. */
    private readonly project: (x: number, y: number) => { x: number; y: number },
    /** Where the popups fly to. */
    private readonly target: () => DOMRect | null,
  ) {}

  show(text: string, x: number, y: number, color: string): void {
    const { popup } = this.feel;
    if (!popup.enabled) return;
    const from = this.project(x, y);
    const to = this.target();
    const node = document.createElement('div');
    node.className = 'popup';
    node.textContent = text;
    node.style.color = color;
    node.style.left = `${from.x}px`;
    node.style.top = `${from.y}px`;
    this.parent.append(node);
    const dx = to ? to.left + to.width / 2 - from.x : 0;
    const dy = to ? to.top + to.height / 2 - from.y : -60;
    const flight = node.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
        { transform: 'translate(-50%, -120%) scale(1.15)', opacity: 1, offset: 0.2 },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.5)`,
          opacity: 0.2,
        },
      ],
      { duration: popup.ms, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' },
    );
    flight.onfinish = () => node.remove();
  }
}
