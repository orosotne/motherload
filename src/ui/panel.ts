import type { MenuCommand } from '../data/controls';
import { t } from '../i18n';
import { nextButton, type Direction } from './panelNav';

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
  /** Left and right on the focused button change its value, like a slider. */
  adjust?: (step: -1 | 1) => void;
  /** Enter in a text field of the panel chooses this action, as in a form. */
  submit?: boolean;
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
  /** The title screen: a big logo, no frame (F6). */
  variant?: 'title';
  /**
   * What Esc, B or a click beside the panel do: close it (the default), go somewhere else
   * instead, or nothing at all (null), e.g. on the title screen.
   */
  back?: (() => void) | null;
}

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

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

/**
 * Modal panel for the shops and menus (GAME_SPEC §8): big cards, focus moved with the arrows or
 * WASD to the nearest card in that direction (a D-pad does the same), Enter or Space to choose,
 * Esc or E to go back. The caller pauses the game while it is open.
 */
export class PanelHost {
  private backdrop: HTMLElement | null = null;
  private render: (() => PanelView) | null = null;
  private onClose: (() => void) | null = null;
  private buttons: HTMLButtonElement[] = [];
  private actions: PanelAction[] = [];
  private back: (() => void) | null = null;
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
      if (event.target === backdrop) this.goBack();
    });
    this.backdrop = backdrop;
    this.parent.append(backdrop);
    this.refresh();
  }

  /** Draws the panel again from the current state, keeping the focused button. */
  refresh(): void {
    if (!this.backdrop || !this.render) return;
    const view = this.render();
    const title = view.variant === 'title';
    this.back = view.back === undefined ? () => this.close() : view.back;
    this.backdrop.classList.toggle('is-title', title);
    const panel = element('section', title ? 'panel is-title' : 'panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');

    const head = element('header', 'panel-head');
    if (!title) head.style.background = view.color;
    if (view.portrait) {
      const portrait = element('span', 'panel-portrait');
      // Static SVG from portraits.ts, never text from the game or the player.
      portrait.innerHTML = view.portrait;
      head.append(portrait);
    }
    const titles = element('div', 'panel-titles');
    titles.append(element(title ? 'h1' : 'h2', '', view.title));
    titles.append(element('p', 'panel-line', view.line));
    head.append(titles);

    const body = element('div', 'panel-body');
    if (view.body) body.append(view.body);
    const note = element('p', 'panel-note', view.note ?? '');
    const actions = element('div', `panel-actions${view.layout === 'grid' ? ' is-grid' : ''}`);
    const close = { label: t('panel.close'), run: () => this.close() };
    this.actions = view.noClose ? view.actions : [...view.actions, close];
    this.buttons = this.actions.map((action, index) => this.button(action, index));
    actions.append(...this.buttons);
    body.append(note, actions);
    const hint = view.back === undefined ? t('panel.closeHint') : t('panel.backHint');
    if (this.back && !title) body.append(element('p', 'panel-hint', hint));

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
    // Tab and the mouse move the focus too; Enter must choose what is focused.
    button.addEventListener('focus', () => this.mark(index));
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
    this.mark(target ? this.buttons.indexOf(target) : 0);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'nearest' });
  }

  private mark(index: number): void {
    this.focusIndex = index;
    this.buttons.forEach((button, i) => button.classList.toggle('is-focused', i === index));
  }

  /** Moves the focus, or changes the value of a slider on left and right. */
  private move(direction: Direction): void {
    const adjust = this.actions[this.focusIndex]?.adjust;
    if (adjust && (direction === 'left' || direction === 'right')) {
      this.sound();
      adjust(direction === 'left' ? -1 : 1);
      this.refresh();
      return;
    }
    const next = nextButton(this.buttons, this.focusIndex, direction);
    if (next >= 0 && next !== this.focusIndex) this.sound();
    if (next >= 0) this.focus(next);
  }

  /** Esc, B or a click beside the panel. */
  private goBack(): void {
    this.back?.();
  }

  /** A menu command from the gamepad: D-pad moves, A chooses, B and Start go back (§8). */
  command(command: MenuCommand): void {
    if (!this.isOpen) return;
    if (command === 'confirm') this.buttons[this.focusIndex]?.click();
    else if (command === 'back' || command === 'pause') this.goBack();
    else this.move(command);
  }

  private onKey(event: KeyboardEvent): void {
    if (!this.isOpen || event.repeat) return;
    if (isEditable(event.target)) {
      // Typing a seed: the keys are letters, not menu moves. Esc leaves the field; Enter
      // chooses the panel's submit action, which then holds the focus.
      if (event.code === 'Escape' && event.target instanceof HTMLElement) event.target.blur();
      const submit = this.actions.findIndex((action) => action.submit);
      if ((event.code === 'Enter' || event.code === 'NumpadEnter') && submit >= 0) {
        event.preventDefault();
        this.buttons[submit]?.click();
      }
      return;
    }
    const direction = DIRECTIONS[event.code];
    if (event.code === 'Escape' || event.code === 'KeyE') this.goBack();
    else if (direction) this.move(direction);
    else if (event.code === 'Enter' || event.code === 'Space')
      this.buttons[this.focusIndex]?.click();
    else return;
    event.preventDefault();
  }
}
