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

/** Actions the player may put on keys of their choice in the settings (F6). */
export const REBINDABLE = ['left', 'right', 'up', 'down', 'use', 'enter', 'skip'] as const;

export type Rebindable = (typeof REBINDABLE)[number];

/**
 * The chosen key of each rebindable action, by physical key (`KeyboardEvent.code`), so it works
 * the same on QWERTY and the Slovak QWERTZ layout (§5).
 */
export const DEFAULT_KEYS: Readonly<Record<Rebindable, string>> = {
  left: 'KeyA',
  right: 'KeyD',
  up: 'KeyW',
  down: 'KeyS',
  use: 'KeyF',
  enter: 'KeyE',
  skip: 'Enter',
};

/** Keys that always work, whatever was chosen: arrows, space, Esc and the slot numbers. */
export const FIXED_KEYS: Readonly<Record<string, Action>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  Space: 'up',
  ArrowDown: 'down',
  Escape: 'pause',
  NumpadEnter: 'skip',
  Digit1: 'slot1',
  Digit2: 'slot2',
  Digit3: 'slot3',
  Digit4: 'slot4',
  Digit5: 'slot5',
};

/** The keyboard layout: the fixed keys plus the chosen ones (§5). */
export function keyboardMap(
  chosen: Readonly<Record<Rebindable, string>> = DEFAULT_KEYS,
): Readonly<Record<string, Action>> {
  const map: Record<string, Action> = { ...FIXED_KEYS };
  for (const action of REBINDABLE) map[chosen[action]] = action;
  return map;
}

/** The default keyboard layout. */
export const KEYBOARD = keyboardMap();

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
