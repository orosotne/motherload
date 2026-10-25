import { DEFAULT_KEYS, FIXED_KEYS, REBINDABLE, type Rebindable } from '../data/controls';

/** Keys the browser or the system needs: never offered for a game action. */
const RESERVED = new Set(['Tab', 'MetaLeft', 'MetaRight', 'ContextMenu', 'CapsLock', 'Fn']);

/** True when the player may put an action on this key (`KeyboardEvent.code`). */
export function canBind(code: string): boolean {
  return code !== '' && !(code in FIXED_KEYS) && !RESERVED.has(code) && !/^F\d+$/.test(code);
}

/**
 * Puts `action` on the key `code`. An action that had that key gets this action's old key, so
 * every action keeps exactly one key of its own.
 */
export function bindKey(
  keys: Readonly<Record<Rebindable, string>>,
  action: Rebindable,
  code: string,
): Record<Rebindable, string> {
  const next = { ...keys };
  const other = REBINDABLE.find((candidate) => candidate !== action && keys[candidate] === code);
  if (other) next[other] = keys[action];
  next[action] = code;
  return next;
}

/** Chosen keys as stored: kept when each is allowed and used once, otherwise the defaults. */
export function validKeys(raw: unknown): Record<Rebindable, string> {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const keys = { ...DEFAULT_KEYS };
  for (const action of REBINDABLE) {
    const code = source[action];
    if (typeof code === 'string' && canBind(code)) keys[action] = code;
  }
  const used = new Set(REBINDABLE.map((action) => keys[action]));
  return used.size === REBINDABLE.length ? keys : { ...DEFAULT_KEYS };
}
