import type { MenuCommand } from '../data/controls';
import { t } from '../i18n';

export interface PanelAction {
  label: string;
  /** Right-aligned detail, e.g. a price. */
  detail?: string;
  /** Second line under the label, e.g. "now → after". */
  sub?: string;
  /** Small inline SVG drawn before the label; static markup from icons.ts only. */
  icon?: string;
  /** Tier dots: how many of how many are filled. */
  pips?: { filled: number; total: number };
  disabled?: boolean;
  run: () => void;
}

export interface PanelView {
  title: string;
  /** Header colour: the building's own. */
  color: string;
  /** What the owner says. */
  line: string;
  /** The owner's face from portraits.ts (§7); static markup only. */
  portrait?: string;
  /** Optional content between the line and the actions. */
  body?: HTMLElement;
  actions: PanelAction[];
  /** Cards in two columns instead of a list. */
  layout?: 'list' | 'grid';
  /** Leave out the automatic Close button, when an action already closes the panel. */
  noClose?: boolean;
  /** Feedback on the last action. */
  note?: string;
}

type Direction = 'up' | 'down' | 'left' | 'right';

const DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Modal panel for the shops (GAME_SPEC §8): big cards, focus moved with the arrows or WASD
 * to the nearest card in that direction (a D-pad does the same in F4), Enter or Space to choose,
 * Esc or E to close. The caller pauses the game while it is open.
 */
export class PanelHost {
  private backdrop: HTMLElement | null = null;
  private render: (() => PanelView) | null = null;
  private onClose: (() => void) | null = null;
  private buttons: HTMLButtonElement[] = [];
  private focusIndex = 0;

  constructor(
    private readonly parent: HTMLElement,
    /** A UI click (§8), played when a button is chosen or the focus moves. */
    private readonly sound: () => void = () => undefined,
  ) {
    window.addEventListener('keydown', (event) => this.onKey(event));
  }

  get isOpen(): boolean {
    return this.backdrop !== null;
  }

  open(render: () => PanelView, onClose: () => void): void {
    this.close();
    this.render = render;
    this.onClose = onClose;
    this.focusIndex = 0;
    const backdrop = element('div', 'panel-backdrop');
    backdrop.addEventListener('pointerdown', (event) => {
      if (event.target === backdrop) this.close();
    });
    this.backdrop = backdrop;
    this.parent.append(backdrop);
    this.refresh();
  }

  /** Draws the panel again from the current state, keeping the focused button. */
  refresh(): void {
    if (!this.backdrop || !this.render) return;
    const view = this.render();
    const panel = element('section', 'panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');

    const head = element('header', 'panel-head');
    head.style.background = view.color;
    if (view.portrait) {
      const portrait = element('span', 'panel-portrait');
      // Static SVG from portraits.ts, never text from the game or the player.
      portrait.innerHTML = view.portrait;
      head.append(portrait);
    }
    const titles = element('div', 'panel-titles');
    titles.append(element('h2', '', view.title), element('p', 'panel-line', view.line));
    head.append(titles);

    const body = element('div', 'panel-body');
    if (view.body) body.append(view.body);
    const note = element('p', 'panel-note', view.note ?? '');
    const actions = element('div', `panel-actions${view.layout === 'grid' ? ' is-grid' : ''}`);
    const close = { label: t('panel.close'), run: () => this.close() };
    const all = view.noClose ? view.actions : [...view.actions, close];
    this.buttons = all.map((action, index) => this.button(action, index));
    actions.append(...this.buttons);
    body.append(note, actions, element('p', 'panel-hint', t('panel.closeHint')));

    panel.append(head, body);
    this.backdrop.replaceChildren(panel);
    this.focus(Math.min(this.focusIndex, this.buttons.length - 1));
  }

  close(): void {
    if (!this.backdrop) return;
    this.backdrop.remove();
    this.backdrop = null;
    this.render = null;
    const onClose = this.onClose;
    this.onClose = null;
    onClose?.();
  }

  private button(action: PanelAction, index: number): HTMLButtonElement {
    const button = element('button', 'panel-action');
    button.type = 'button';
    button.disabled = !!action.disabled;
    const main = element('span', 'panel-action-main');
    if (action.icon) {
      const icon = element('span', 'panel-icon');
      // Static SVG from icons.ts, never text from the game or the player.
      icon.innerHTML = action.icon;
      main.append(icon);
    }
    const text = element('span', 'panel-action-text');
    text.append(element('span', 'panel-action-label', action.label));
    if (action.pips) text.append(this.pips(action.pips));
    if (action.sub) text.append(element('span', 'panel-action-sub', action.sub));
    main.append(text);
    button.append(main);
    if (action.detail) button.append(element('small', '', action.detail));
    button.addEventListener('click', () => {
      this.focusIndex = index;
      this.sound();
      action.run();
      this.refresh();
    });
    return button;
  }

  private pips({ filled, total }: { filled: number; total: number }): HTMLElement {
    const row = element('span', 'panel-pips');
    row.setAttribute('aria-label', `${filled} / ${total}`);
    for (let i = 0; i < total; i++) row.append(element('i', i < filled ? 'is-on' : ''));
    return row;
  }

  private focus(index: number): void {
    const enabled = this.buttons.filter((button) => !button.disabled);
    const target = this.buttons[index]?.disabled ? enabled[0] : this.buttons[index];
    this.focusIndex = target ? this.buttons.indexOf(target) : 0;
    this.buttons.forEach((button, i) =>
      button.classList.toggle('is-focused', i === this.focusIndex),
    );
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'nearest' });
  }

  /** Moves the focus to the nearest enabled button in a direction, wrapping in lists. */
  private move(direction: Direction): void {
    const from = this.buttons[this.focusIndex]?.getBoundingClientRect();
    if (!from) return;
    const centre = (rect: DOMRect): [number, number] => [
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    ];
    const [fx, fy] = centre(from);
    let best = -1;
    let bestScore = Infinity;
    this.buttons.forEach((button, index) => {
      if (button.disabled || index === this.focusIndex) return;
      const [x, y] = centre(button.getBoundingClientRect());
      const along = { up: fy - y, down: y - fy, left: fx - x, right: x - fx }[direction];
      const across =
        direction === 'up' || direction === 'down' ? Math.abs(x - fx) : Math.abs(y - fy);
      if (along <= 1) return;
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = index;
      }
    });
    // In a single column, left and right step through the list like up and down.
    if (best < 0 && (direction === 'left' || direction === 'right')) {
      this.move(direction === 'left' ? 'up' : 'down');
      return;
    }
    if (best < 0) best = this.wrap(direction);
    if (best >= 0 && best !== this.focusIndex) this.sound();
    if (best >= 0) this.focus(best);
  }

  /** Off the edge: up and left go to the last enabled button, down and right to the first. */
  private wrap(direction: Direction): number {
    const enabled = this.buttons.flatMap((button, index) => (button.disabled ? [] : [index]));
    const forward = direction === 'down' || direction === 'right';
    return (forward ? enabled[0] : enabled[enabled.length - 1]) ?? -1;
  }

  /** A menu command from the gamepad: D-pad moves, A chooses, B and Start close (§8). */
  command(command: MenuCommand): void {
    if (!this.isOpen) return;
    if (command === 'confirm') this.buttons[this.focusIndex]?.click();
    else if (command === 'back' || command === 'pause') this.close();
    else this.move(command);
  }

  private onKey(event: KeyboardEvent): void {
    if (!this.isOpen || event.repeat) return;
    const direction = DIRECTIONS[event.code];
    if (event.code === 'Escape' || event.code === 'KeyE') this.close();
    else if (direction) this.move(direction);
    else if (event.code === 'Enter' || event.code === 'Space')
      this.buttons[this.focusIndex]?.click();
    else return;
    event.preventDefault();
  }
}
