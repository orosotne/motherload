import { migrate } from './migrations';
import type { SaveData } from './schema';

/** localStorage, or a stand-in for it in tests. */
export type SaveStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const KEY = 'hlbina.save';

/** Stores a save; false when the browser refuses (private mode, full storage). */
export function writeSave(data: SaveData, storage: SaveStorage): boolean {
  try {
    storage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** The stored save in the current format, or null when there is none or it cannot be read. */
export function readSave(storage: SaveStorage): SaveData | null {
  try {
    const text = storage.getItem(KEY);
    return text === null ? null : migrate(JSON.parse(text));
  } catch {
    return null;
  }
}

export function clearSave(storage: SaveStorage): void {
  try {
    storage.removeItem(KEY);
  } catch {
    // Nothing stored that could be removed.
  }
}
