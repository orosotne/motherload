import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json';
import sk from '../src/i18n/sk.json';

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();
}

describe('translations (§9.10)', () => {
  it('have the same keys in English and Slovak', () => {
    expect(Object.keys(sk).sort()).toEqual(Object.keys(en).sort());
  });

  it('use the same placeholders in both languages', () => {
    for (const [key, text] of Object.entries(en)) {
      const slovak = (sk as Record<string, string>)[key] ?? '';
      expect(placeholders(slovak), key).toEqual(placeholders(text));
    }
  });

  it('leave no text empty', () => {
    for (const text of [...Object.values(en), ...Object.values(sk)]) {
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });
});
