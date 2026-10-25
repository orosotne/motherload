import { validKeys } from '../core/keys';
import type { Rebindable } from '../data/controls';
import type { SaveStorage } from './storage';

/** Player preferences from the settings (GAME_SPEC F6), kept apart from the saved game. */
export interface Prefs {
  /** Gamepad rumble (§5.9). */
  rumble: boolean;
  /** Screen shake (§5.7); some players get queasy from it. */
  shake: boolean;
  /** The chosen key of each rebindable action. */
  keys: Record<Rebindable, string>;
}

const KEY = 'hlbina.prefs';

export function defaultPrefs(): Prefs {
  return { rumble: true, shake: true, keys: validKeys(null) };
}

/** The stored preferences, each value checked, or the defaults. */
export function readPrefs(storage: SaveStorage | null): Prefs {
  try {
    const text = storage?.getItem(KEY) ?? null;
    const raw: unknown = text === null ? null : JSON.parse(text);
    const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
    return {
      rumble: source.rumble !== false,
      shake: source.shake !== false,
      keys: validKeys(source.keys),
    };
  } catch {
    return defaultPrefs();
  }
}

export function writePrefs(prefs: Prefs, storage: SaveStorage | null): void {
  try {
    storage?.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Private windows may refuse storage; the choice still holds for this session.
  }
}
