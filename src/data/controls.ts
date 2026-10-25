/** Game actions (GAME_SPEC §5). */
export const ACTIONS = [
  'left',
  'right',
  'up',
  'down',
  'use',
  'enter',
  'pause',
  'slot1',
  'slot2',
  'slot3',
  'slot4',
  'slot5',
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
  Digit1: 'slot1',
  Digit2: 'slot2',
  Digit3: 'slot3',
  Digit4: 'slot4',
  Digit5: 'slot5',
};
