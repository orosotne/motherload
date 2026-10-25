import { parseSeed } from '../core/rng';
import { money, t } from '../i18n';
import { depthMeters } from '../sim/buildings';
import type { GameState } from '../sim/game';
import type { PanelView } from './panel';

/** The version shown on the title screen, from package.json. */
const VERSION = __APP_VERSION__;

export interface TitleActions {
  /** Into the game on screen: the saved one, or the new world made at start. */
  play: () => void;
  newGame: () => void;
  settings: () => void;
  credits: () => void;
}

function small(text: string, className: string): HTMLElement {
  const node = document.createElement('p');
  node.className = className;
  node.textContent = text;
  return node;
}

/**
 * The title screen (GAME_SPEC F6): the world waits behind it. Continue shows where the saved
 * game stands; a world nobody has played yet just starts.
 */
export function titleView(state: GameState, played: boolean, actions: TitleActions): PanelView {
  const relics = state.relics.filter(Boolean).length;
  return {
    title: 'HLBINA',
    color: '',
    line: t('title.tagline'),
    variant: 'title',
    back: null,
    noClose: true,
    body: small(t('title.version', { version: VERSION }), 'title-version'),
    actions: [
      played
        ? {
            label: t('title.continue'),
            sub: t('title.continueSub', {
              depth: t('unit.meters', { value: depthMeters(state.pod) }),
              cash: money(state.cash),
              relics,
              total: state.relics.length,
            }),
            run: actions.play,
          }
        : { label: t('title.play'), run: actions.play },
      { label: t('newGame.label'), sub: t('newGame.sub'), run: actions.newGame },
      { label: t('settings.title'), run: actions.settings },
      { label: t('credits.title'), run: actions.credits },
    ],
  };
}

export interface NewGameContext {
  /** True when a game in progress would be wiped. */
  played: boolean;
  start: (seed: number) => void;
  back: () => void;
  /** A random seed for a random world. */
  randomSeed: () => number;
}

/** What the new-game panel remembers between redraws. */
export interface NewGameState {
  seed: string;
  /** The seed that waits for the second press, when a game in progress would be wiped. */
  armed: number | null;
  /** The seed button was chosen with nothing typed. */
  missing: boolean;
}

/**
 * A new game (GAME_SPEC §7, F6): a random world, or the world of a seed the player types (a
 * number shown in the game, or any word). Wiping a game in progress takes a second press.
 */
export function newGameView(context: NewGameContext, state: NewGameState): PanelView {
  const start = (seed: number): void => {
    if (context.played && state.armed !== seed) {
      state.armed = seed;
      return;
    }
    context.start(seed);
  };
  const field = document.createElement('label');
  field.className = 'seed-field';
  const caption = document.createElement('span');
  caption.textContent = t('newGame.seedLabel');
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 32;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = t('newGame.seedHint');
  input.value = state.seed;
  input.addEventListener('input', () => {
    state.seed = input.value;
  });
  input.addEventListener('keydown', (event) => {
    if (event.code !== 'Enter' || state.seed.trim() === '') return;
    event.preventDefault();
    start(parseSeed(state.seed));
  });
  field.append(caption, input);
  let note = state.armed === null ? '' : t('newGame.confirm');
  if (state.missing) note = t('newGame.typeSeed');
  return {
    title: t('newGame.label'),
    color: '#FFD166',
    line: t('newGame.line'),
    body: field,
    note,
    noClose: true,
    back: context.back,
    actions: [
      {
        label: t('newGame.random'),
        run: () => {
          state.missing = false;
          state.armed = state.armed ?? context.randomSeed();
          start(state.armed);
        },
      },
      {
        label: t('newGame.fromSeed'),
        run: () => {
          // What is typed now, not what was typed when the panel was drawn.
          const seed = state.seed.trim();
          state.missing = seed === '';
          if (seed !== '') start(parseSeed(seed));
        },
      },
      { label: t('menu.back'), run: context.back },
    ],
  };
}

/** Who made the game (GAME_SPEC F6, CREDITS.md). */
export function creditsView(back: () => void): PanelView {
  const body = document.createElement('div');
  body.className = 'ending';
  for (const key of ['credits.idea', 'credits.made', 'credits.libraries'] as const) {
    body.append(small(t(key), ''));
  }
  return {
    title: t('credits.title'),
    color: '#F4F1DE',
    line: t('credits.line'),
    body,
    noClose: true,
    back,
    actions: [{ label: t('menu.back'), run: back }],
  };
}
