import { ACTIONS, KEYBOARD, type Action, type MenuCommand } from '../data/controls';
import { GamepadReader } from './gamepad';

export type ActionSet = Readonly<Record<Action, boolean>>;

/** What the player does during one simulation tick. */
export interface InputFrame {
  /** Actions whose key is down at the end of the tick. */
  held: ActionSet;
  /** Actions pressed since the previous tick, even if already released again (a quick tap). */
  pressed: ActionSet;
}

function actionSet(predicate: (action: Action) => boolean): ActionSet {
  const set = {} as Record<Action, boolean>;
  for (const action of ACTIONS) set[action] = predicate(action);
  return set;
}

/** A frame with nothing pressed, for tests and for frames while a menu has focus. */
export const IDLE_FRAME: InputFrame = {
  held: actionSet(() => false),
  pressed: actionSet(() => false),
};

function isEditable(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Keyboard and gamepad input (GAME_SPEC §5). Collects key events between simulation ticks and
 * hands the simulation one {@link InputFrame} per tick, so a tap shorter than a tick is never
 * lost. The gamepad is polled with each sample.
 */
export class Input {
  readonly pad: GamepadReader;
  private readonly heldKeys = new Set<string>();
  private readonly pressedSinceSample = new Set<Action>();
  private readonly menuCommands = new Set<MenuCommand>();

  constructor(source: EventTarget, pad = new GamepadReader()) {
    this.pad = pad;
    source.addEventListener('keydown', (event) => this.onKey(event as KeyboardEvent, true));
    source.addEventListener('keyup', (event) => this.onKey(event as KeyboardEvent, false));
    // A key released while the window had no focus never sends keyup (Cmd+Tab on a Mac).
    source.addEventListener('blur', () => this.releaseAll());
  }

  /** Input for the next simulation tick; clears the record of presses. */
  sample(): InputFrame {
    const pad = this.pad.poll();
    for (const command of pad.menu) this.menuCommands.add(command);
    const held = new Set<Action>(pad.held);
    for (const code of this.heldKeys) {
      const action = KEYBOARD[code];
      if (action) held.add(action);
    }
    const frame: InputFrame = {
      held: actionSet((action) => held.has(action)),
      pressed: actionSet(
        (action) => this.pressedSinceSample.has(action) || pad.pressed.has(action),
      ),
    };
    this.pressedSinceSample.clear();
    return frame;
  }

  /** Gamepad menu commands since the last call (D-pad, A, B, Start), for menus and panels. */
  takeMenuCommands(): MenuCommand[] {
    const commands = [...this.menuCommands];
    this.menuCommands.clear();
    return commands;
  }

  releaseAll(): void {
    this.heldKeys.clear();
  }

  /** Forgets presses not yet sampled, e.g. the key that just closed a menu. */
  clearPresses(): void {
    this.pressedSinceSample.clear();
    this.menuCommands.clear();
  }

  private onKey(event: KeyboardEvent, down: boolean): void {
    const action = KEYBOARD[event.code];
    if (!action) return;
    const editable = isEditable(event.target);
    // Arrows and space would otherwise scroll the page or press a focused button.
    if (!editable) event.preventDefault();
    if (!down) {
      // A release always counts: the key may have been held for the game before a text field
      // got focus, and must not stay stuck.
      this.heldKeys.delete(event.code);
      return;
    }
    if (editable) return;
    if (!event.repeat) this.pressedSinceSample.add(action);
    this.heldKeys.add(event.code);
  }
}
