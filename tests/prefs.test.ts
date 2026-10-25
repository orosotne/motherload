import { describe, expect, it } from 'vitest';
import { bindKey, canBind, validKeys } from '../src/core/keys';
import { parseSeed, seedFromText } from '../src/core/rng';
import { DEFAULT_KEYS, keyboardMap } from '../src/data/controls';
import { defaultPrefs, readPrefs, writePrefs } from '../src/save/prefs';
import type { SaveStorage } from '../src/save/storage';

function memoryStorage(): SaveStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe('key bindings (F6 settings)', () => {
  it('keep the arrows, space, Esc and the slot keys whatever is chosen', () => {
    const map = keyboardMap({ ...DEFAULT_KEYS, left: 'KeyJ' });
    expect(map.KeyJ).toBe('left');
    expect(map.ArrowLeft).toBe('left');
    expect(map.KeyA).toBeUndefined();
    expect([map.Space, map.Escape, map.Digit3]).toEqual(['up', 'pause', 'slot3']);
  });

  it('swap keys, so every action keeps one of its own', () => {
    const keys = bindKey(DEFAULT_KEYS, 'use', 'KeyE');
    expect(keys.use).toBe('KeyE');
    expect(keys.enter).toBe('KeyF');
    expect(bindKey(DEFAULT_KEYS, 'left', 'KeyQ').left).toBe('KeyQ');
  });

  it('refuse the fixed keys and the ones the system needs', () => {
    expect(canBind('KeyQ')).toBe(true);
    expect(canBind('ShiftLeft')).toBe(true);
    for (const code of ['ArrowUp', 'Escape', 'Digit1', 'Tab', 'MetaLeft', 'F5', '']) {
      expect(canBind(code)).toBe(false);
    }
  });

  it('fall back to the defaults when the stored ones are broken or clash', () => {
    expect(validKeys({ left: 'KeyQ' })).toEqual({ ...DEFAULT_KEYS, left: 'KeyQ' });
    expect(validKeys({ left: 'Escape', right: 7 })).toEqual(DEFAULT_KEYS);
    expect(validKeys({ left: 'KeyD' })).toEqual(DEFAULT_KEYS);
    expect(validKeys('nonsense')).toEqual(DEFAULT_KEYS);
  });
});

describe('preferences', () => {
  it('survive a reload', () => {
    const storage = memoryStorage();
    const prefs = { rumble: false, shake: false, keys: bindKey(DEFAULT_KEYS, 'up', 'KeyK') };
    writePrefs(prefs, storage);
    expect(readPrefs(storage)).toEqual(prefs);
  });

  it('start from the defaults, and repair what is damaged', () => {
    expect(readPrefs(null)).toEqual(defaultPrefs());
    const storage = memoryStorage();
    storage.setItem('hlbina.prefs', '{broken');
    expect(readPrefs(storage)).toEqual(defaultPrefs());
    storage.setItem('hlbina.prefs', JSON.stringify({ rumble: 'no', keys: { use: 'Tab' } }));
    expect(readPrefs(storage)).toEqual(defaultPrefs());
  });
});

describe('seeds typed for a new game', () => {
  it('take a number as that very world, and hash any other text', () => {
    expect(parseSeed(' 12345 ')).toBe(12345);
    expect(parseSeed('4294967295')).toBe(4294967295);
    expect(parseSeed('4294967296')).toBe(seedFromText('4294967296'));
    expect(parseSeed('Tumbra')).toBe(parseSeed('tumbra '));
    expect(parseSeed('tumbra')).not.toBe(parseSeed('tumbro'));
  });
});
