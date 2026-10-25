/** Game actions (GAME_SPEC §5). */
export const ACTIONS = [
  'left',
  'right',
  'up',
  'down',
  'use',
  'enter',
  'pause',
  /** Shows a radio message whole, then closes it (§7). */
  'skip',
  'slot1',
  'slot2',
  'slot3',
  'slot4',
  'slot5',
  'slotPrev',
  'slotNext',
] as const;

export type Action = (typeof ACTIONS)[number];

/**
 * Keyboard layout by physical key (`KeyboardEvent.code`), so it works the same on QWERTY and the
 * Slovak QWERTZ layout (§5).
 */
export const KEYBOARD: Readonly<Record<string, Action>> = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyW: 'up',
  ArrowUp: 'up',
  Space: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyF: 'use',
  KeyE: 'enter',
  Escape: 'pause',
  Enter: 'skip',
  NumpadEnter: 'skip',
  Digit1: 'slot1',
  Digit2: 'slot2',
  Digit3: 'slot3',
  Digit4: 'slot4',
  Digit5: 'slot5',
};

/** Gamepad buttons in the standard mapping (§5) and the actions they trigger in play. */
export const GAMEPAD_BUTTONS: Readonly<Record<number, Action>> = {
  0: 'up',
  1: 'skip',
  2: 'use',
  3: 'enter',
  4: 'slotPrev',
  5: 'slotNext',
  9: 'pause',
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
};

/** Commands for menus and shop panels. */
export type MenuCommand = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'pause';

/** Gamepad buttons in menus: the D-pad moves, A (index 0) chooses, B (index 1) goes back. */
export const GAMEPAD_MENU: Readonly<Record<number, MenuCommand>> = {
  0: 'confirm',
  1: 'back',
  9: 'pause',
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
};

/** The left stick counts as pushed past this much. */
export const STICK_DEADZONE = 0.45;
