import type { AudioEngine } from '../audio/engine';
import { bindKey, canBind } from '../core/keys';
import type { AudioVolumes } from '../data/audio';
import { DEFAULT_KEYS, FIXED_KEYS, REBINDABLE, type Rebindable } from '../data/controls';
import { getLanguage, setLanguage, t, type TextKey } from '../i18n';
import type { Prefs } from '../save/prefs';
import type { PanelAction, PanelView } from './panel';

const STEP = 0.1;

/** How a key (`KeyboardEvent.code`) is written on the keyboard. */
export function keyLabel(code: string): string {
  const named: Readonly<Record<string, string>> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Space: t('key.space'),
    Escape: 'Esc',
    NumpadEnter: 'Num Enter',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Semicolon: ';',
    Quote: "'",
    Backslash: '\\',
    IntlBackslash: '<',
    Comma: ',',
    Period: '.',
    Slash: '/',
  };
  const plain = named[code];
  if (plain) return plain;
  const match = /^(Key|Digit|Numpad)(.+)$/.exec(code);
  if (match) return match[1] === 'Numpad' ? `Num ${match[2] ?? ''}` : (match[2] ?? code);
  return code.replace(/(Left|Right)$/, '');
}

export interface SettingsContext {
  audio: AudioEngine;
  prefs: Prefs;
  /** Stores the preferences and puts them to work. */
  apply: () => void;
  controls: () => void;
  back: () => void;
}

/**
 * Settings (GAME_SPEC F6): the three volumes as sliders (left and right change them), the
 * language, the controls, gamepad rumble and screen shake.
 */
export function settingsView(context: SettingsContext): PanelView {
  const { audio, prefs } = context;
  const volume = (channel: keyof AudioVolumes, key: TextKey): PanelAction => {
    const set = (value: number): void => audio.setVolume(channel, Math.round(value * 10) / 10);
    const value = audio.volumes[channel];
    return {
      label: t(key),
      detail: `${Math.round(value * 100)} %`,
      pips: { filled: Math.round(value * 10), total: 10 },
      run: () => set(value >= 1 - 1e-6 ? 0 : value + STEP),
      adjust: (step) => set(Math.min(Math.max(value + step * STEP, 0), 1)),
    };
  };
  const toggle = (key: TextKey, field: 'rumble' | 'shake'): PanelAction => {
    const flip = (): void => {
      prefs[field] = !prefs[field];
      context.apply();
    };
    return {
      label: t(key),
      detail: t(prefs[field] ? 'settings.on' : 'settings.off'),
      run: flip,
      adjust: flip,
    };
  };
  const language = (): void => setLanguage(getLanguage() === 'en' ? 'sk' : 'en');
  return {
    title: t('settings.title'),
    color: '#BDE0FE',
    line: t('settings.line'),
    noClose: true,
    back: context.back,
    actions: [
      volume('master', 'pause.master'),
      volume('music', 'pause.music'),
      volume('sfx', 'pause.sfx'),
      {
        label: t('pause.language'),
        detail: t('pause.languageName'),
        run: language,
        adjust: language,
      },
      { label: t('settings.controls'), run: context.controls },
      toggle('settings.rumble', 'rumble'),
      toggle('settings.shake', 'shake'),
      { label: t('menu.back'), run: context.back },
    ],
  };
}

/** Keys that always work besides the chosen one, e.g. the arrows. */
function alsoKeys(action: Rebindable): string[] {
  return Object.entries(FIXED_KEYS)
    .filter(([, fixed]) => fixed === action)
    .map(([code]) => keyLabel(code));
}

export interface ControlsContext {
  prefs: Prefs;
  apply: () => void;
  back: () => void;
  /** Redraws the panel once a key was caught. */
  refresh: () => void;
}

/** What the controls panel is doing: waiting for a key, and the last word for the player. */
export interface ControlsState {
  waiting: Rebindable | null;
  note: string;
  stop: (() => void) | null;
}

/** Catches the next key for `action`, before the menus and the game see it. */
function listen(action: Rebindable, context: ControlsContext, state: ControlsState): void {
  state.stop?.();
  const name = t(`action.${action}` as TextKey);
  const onKey = (event: KeyboardEvent): void => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.repeat) return;
    if (event.code === 'Escape') state.note = '';
    else if (!canBind(event.code)) {
      state.note = t('controls.reserved');
      return;
    } else {
      context.prefs.keys = bindKey(context.prefs.keys, action, event.code);
      context.apply();
      state.note = t('controls.done', { action: name, key: keyLabel(event.code) });
    }
    finish();
    context.refresh();
  };
  const finish = (): void => {
    window.removeEventListener('keydown', onKey, true);
    state.waiting = null;
    state.stop = null;
  };
  window.addEventListener('keydown', onKey, true);
  state.waiting = action;
  state.stop = finish;
  state.note = t('controls.press', { action: name });
}

/**
 * Controls (GAME_SPEC F6): every rebindable action with its key; choosing one waits for the
 * next key. The arrows, space, Esc and the slot numbers always work as well.
 */
export function controlsView(context: ControlsContext, state: ControlsState): PanelView {
  const { prefs } = context;
  const body = document.createElement('p');
  body.className = 'pause-help';
  body.textContent = t('pause.pad');
  const back = (): void => {
    state.stop?.();
    context.back();
  };
  return {
    title: t('controls.title'),
    color: '#BDE0FE',
    line: t('controls.line'),
    body,
    note: state.note,
    noClose: true,
    back,
    actions: [
      ...REBINDABLE.map((action): PanelAction => {
        const also = alsoKeys(action);
        return {
          label: t(`action.${action}` as TextKey),
          detail: state.waiting === action ? '…' : keyLabel(prefs.keys[action]),
          sub: also.length > 0 ? t('controls.also', { keys: also.join(' ') }) : undefined,
          run: () => listen(action, context, state),
        };
      }),
      {
        label: t('controls.reset'),
        run: () => {
          state.stop?.();
          prefs.keys = { ...DEFAULT_KEYS };
          context.apply();
          state.note = '';
        },
      },
      { label: t('menu.back'), run: back },
    ],
  };
}
