import { t } from '../i18n';

export interface PanelAction {
  label: string;
  /** Right-aligned detail, e.g. a price. */
  detail?: string;
  disabled?: boolean;
  run: () => void;
}

export interface PanelView {
  title: string;
  /** Header colour: the building's own. */
  color: string;
  /** What the owner says. */
  line: string;
  /** Optional content between the line and the actions. */
  body?: HTMLElement;
  actions: PanelAction[];
  /** Feedback on the last action. */
  note?: string;
}

const NEXT = new Set(['ArrowDown', 'ArrowRight', 'KeyS', 'KeyD']);
const PREVIOUS = new Set(['ArrowUp', 'ArrowLeft', 'KeyW', 'KeyA']);

/**
 * Modal panel for the shops (GAME_SPEC §8): big buttons, focus moved with the arrows or WASD,
 * Enter or Space to choose, Esc or E to close. The caller pauses the game while it is open.
 */
export class PanelHost {
  private backdrop: HTMLElement | null = null;
  private render: (() => PanelView) | null = null;
  private onClose: (() => void) | null = null;
  private buttons: HTMLButtonElement[] = [];
  private focusIndex = 0;

  constructor(private readonly parent: HTMLElement) {
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
    const backdrop = document.createElement('div');
    backdrop.className = 'panel-backdrop';
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
    const panel = document.createElement('section');
    panel.className = 'panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');

    const head = document.createElement('header');
    head.className = 'panel-head';
    head.style.background = view.color;
    const title = document.createElement('h2');
    title.textContent = view.title;
    const line = document.createElement('p');
    line.className = 'panel-line';
    line.textContent = view.line;
    head.append(title, line);

    const body = document.createElement('div');
    body.className = 'panel-body';
    if (view.body) body.append(view.body);
    const note = document.createElement('p');
    note.className = 'panel-note';
    note.textContent = view.note ?? '';
    const actions = document.createElement('div');
    actions.className = 'panel-actions';
    const all = [...view.actions, { label: t('panel.close'), run: () => this.close() }];
    this.buttons = all.map((action, index) => this.button(action, index));
    actions.append(...this.buttons);
    const hint = document.createElement('p');
    hint.className = 'panel-hint';
    hint.textContent = t('panel.closeHint');
    body.append(note, actions, hint);

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
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'panel-action';
    button.disabled = !!action.disabled;
    const label = document.createElement('span');
    label.textContent = action.label;
    button.append(label);
    if (action.detail) {
      const detail = document.createElement('small');
      detail.textContent = action.detail;
      button.append(detail);
    }
    button.addEventListener('click', () => {
      this.focusIndex = index;
      action.run();
      this.refresh();
    });
    return button;
  }

  private focus(index: number): void {
    const enabled = this.buttons.filter((button) => !button.disabled);
    const target = this.buttons[index]?.disabled ? enabled[0] : this.buttons[index];
    this.focusIndex = target ? this.buttons.indexOf(target) : 0;
    this.buttons.forEach((button, i) =>
      button.classList.toggle('is-focused', i === this.focusIndex),
    );
    target?.focus({ preventScroll: true });
  }

  private move(step: 1 | -1): void {
    const count = this.buttons.length;
    for (let i = 1; i <= count; i++) {
      const index = (this.focusIndex + step * i + count) % count;
      if (!this.buttons[index]?.disabled) {
        this.focus(index);
        return;
      }
    }
  }

  private onKey(event: KeyboardEvent): void {
    if (!this.isOpen || event.repeat) return;
    if (event.code === 'Escape' || event.code === 'KeyE') this.close();
    else if (NEXT.has(event.code)) this.move(1);
    else if (PREVIOUS.has(event.code)) this.move(-1);
    else if (event.code === 'Enter' || event.code === 'Space')
      this.buttons[this.focusIndex]?.click();
    else return;
    event.preventDefault();
  }
}
