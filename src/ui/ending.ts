import { RELICS } from '../data/relics';
import { money, t } from '../i18n';
import type { GameState } from '../sim/game';
import type { PanelView } from './panel';

/** All ten relics and the Heart burning again: the extra epilogue (GAME_SPEC §7). */
export function epilogueUnlocked(state: GameState): boolean {
  return state.story.finished && state.relics.filter(Boolean).length === RELICS.depthsMeters.length;
}

function paragraph(text: string, className = ''): HTMLElement {
  const node = document.createElement('p');
  node.className = className;
  node.textContent = text;
  return node;
}

/** Hours and minutes of play, e.g. 3:07. */
export function playTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

export interface EndingActions {
  /** Back to the game: free mining from here on (§7). */
  keepMining: () => void;
  /** A new world with a new seed; asks twice, since this game is wiped. */
  newGame: () => void;
}

/**
 * The ending (§7): the Heart beats again, the planet blooms and the station celebrates. All ten
 * relics add the epilogue; otherwise a line says it is there to find. Then free mining, or a new
 * game in a new world.
 */
export function endingView(
  state: GameState,
  actions: EndingActions,
  confirm: { armed: boolean },
): PanelView {
  const body = document.createElement('div');
  body.className = 'ending';
  body.append(paragraph(t('ending.text')));
  if (epilogueUnlocked(state)) {
    body.append(
      paragraph(t('ending.epilogueTitle'), 'ending-title'),
      paragraph(t('ending.epilogue'), 'ending-epilogue'),
    );
  } else {
    body.append(paragraph(t('ending.hint'), 'ending-hint'));
  }
  const found = state.relics.filter(Boolean).length;
  body.append(
    paragraph(
      t('ending.stats', {
        time: playTime(state.time),
        relics: found,
        total: state.relics.length,
        cash: money(state.cash),
      }),
      'ending-stats',
    ),
  );
  return {
    title: t('ending.title'),
    color: '#FFD166',
    line: t('ending.line'),
    body,
    noClose: true,
    note: confirm.armed ? t('newGame.confirm') : '',
    actions: [
      { label: t('ending.keepMining'), run: actions.keepMining },
      {
        label: t('newGame.label'),
        sub: t('newGame.sub'),
        run: () => {
          if (confirm.armed) actions.newGame();
          confirm.armed = true;
        },
      },
    ],
  };
}
