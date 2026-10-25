import en from './en.json';
import sk from './sk.json';

/** All UI text goes through keys (GAME_SPEC §9.10); English and Slovak. */
export type Lang = 'en' | 'sk';
export type TextKey = keyof typeof en;

const DICTIONARIES: Readonly<Record<Lang, Readonly<Record<TextKey, string>>>> = { en, sk };
const STORAGE_KEY = 'hlbina.lang';
const listeners = new Set<() => void>();

function readStored(): Lang | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' || stored === 'sk' ? stored : null;
  } catch {
    return null;
  }
}

/** Saved choice first, then the browser's languages; Czech readers get Slovak too. */
export function detectLanguage(): Lang {
  const stored = readStored();
  if (stored) return stored;
  const preferred = typeof navigator === 'undefined' ? [] : navigator.languages;
  return preferred.some((tag) => /^(sk|cs)\b/i.test(tag)) ? 'sk' : 'en';
}

let current: Lang = detectLanguage();

export function getLanguage(): Lang {
  return current;
}

export function setLanguage(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private windows may refuse storage; the choice still holds for this session.
  }
  for (const listener of listeners) listener();
}

export function onLanguageChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Text for `key` with `{name}` placeholders filled in. */
export function t(key: TextKey, params?: Readonly<Record<string, string | number>>): string {
  const text = DICTIONARIES[current][key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

function locale(): string {
  return current === 'sk' ? 'sk-SK' : 'en-US';
}

/** Dollars with the language's digit grouping: $1,250 or $1 250. */
export function money(value: number): string {
  return `$${Math.round(value).toLocaleString(locale())}`;
}

export function decimal(value: number, digits = 1): string {
  return value.toLocaleString(locale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
