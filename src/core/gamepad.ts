import {
  GAMEPAD_BUTTONS,
  GAMEPAD_MENU,
  STICK_DEADZONE,
  type Action,
  type MenuCommand,
} from '../data/controls';

/** What the gamepad does right now, and what was newly pressed since the previous poll. */
export interface PadPoll {
  held: Set<Action>;
  pressed: Set<Action>;
  menu: Set<MenuCommand>;
}

/** Minimal shape of the browser's Gamepad, so this runs headless too. */
interface PadLike {
  mapping: string;
  buttons: readonly { pressed: boolean }[];
  axes: readonly number[];
  vibrationActuator?: {
    playEffect?: (type: string, params: Record<string, number>) => Promise<unknown>;
  } | null;
}

type PadSource = () => readonly (PadLike | null)[];

function browserPads(): readonly (PadLike | null)[] {
  return typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
    ? (navigator.getGamepads() as unknown as readonly (PadLike | null)[])
    : [];
}

/**
 * Gamepad via the Gamepad API (GAME_SPEC §5): Joy-Con, Pro Controller, Xbox and PlayStation
 * pads in the standard mapping. The left stick and the D-pad drive and drill, A flies, X uses
 * equipment, Y enters a building, L and R pick the slot, Start pauses. Polled, not evented.
 */
export class GamepadReader {
  private before = new Set<number>();
  private stickBefore = new Set<Action>();
  private active: PadLike | null = null;

  constructor(private readonly source: PadSource = browserPads) {}

  get connected(): boolean {
    return this.active !== null;
  }

  poll(): PadPoll {
    const poll: PadPoll = { held: new Set(), pressed: new Set(), menu: new Set() };
    const pad = this.source().find((candidate) => candidate && candidate.mapping === 'standard');
    this.active = pad ?? null;
    const now = new Set<number>();
    pad?.buttons.forEach((button, index) => {
      if (button.pressed) now.add(index);
    });
    for (const index of now) {
      const action = GAMEPAD_BUTTONS[index];
      if (action) poll.held.add(action);
      if (this.before.has(index)) continue;
      if (action) poll.pressed.add(action);
      const command = GAMEPAD_MENU[index];
      if (command) poll.menu.add(command);
    }
    this.before = now;

    const stick = new Set<Action>();
    const [x = 0, y = 0] = pad?.axes ?? [];
    if (x < -STICK_DEADZONE) stick.add('left');
    if (x > STICK_DEADZONE) stick.add('right');
    if (y < -STICK_DEADZONE) stick.add('up');
    if (y > STICK_DEADZONE) stick.add('down');
    for (const action of stick) {
      poll.held.add(action);
      if (this.stickBefore.has(action)) continue;
      poll.pressed.add(action);
      if (action === 'left' || action === 'right' || action === 'up' || action === 'down') {
        poll.menu.add(action);
      }
    }
    this.stickBefore = stick;
    return poll;
  }

  /** Rumble (§5.9) where the browser supports it; weak and strong motors from 0 to 1. */
  rumble(weak: number, strong: number, ms: number): void {
    const actuator = this.active?.vibrationActuator;
    if (!actuator?.playEffect) return;
    void actuator
      .playEffect('dual-rumble', {
        startDelay: 0,
        duration: ms,
        weakMagnitude: Math.min(weak, 1),
        strongMagnitude: Math.min(strong, 1),
      })
      .catch(() => undefined);
  }
}
