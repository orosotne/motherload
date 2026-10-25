import { RELICS } from '../data/relics';
import { relicMessage } from '../data/story';
import { t, type TextKey } from '../i18n';
import type { GameState } from '../sim/game';
import { epilogueUnlocked } from './ending';
import type { PanelAction, PanelView } from './panel';
import { PORTRAITS, RELIC_GLYPHS } from './portraits';
import { radioText } from './radio';

/**
 * The Album of relics (GAME_SPEC §7): a card per relic with its short text; choosing a found
 * one shows Mira's comment. Relics not found yet show only their depth. With the ending reached
 * and all ten found, the epilogue joins them.
 */
export function albumView(state: GameState, note: { text: string }): PanelView {
  const found = state.relics.filter(Boolean).length;
  const cards: PanelAction[] = RELICS.depthsMeters.map((depth, index) => {
    const number = index + 1;
    const has = state.relics[index] === true;
    return {
      icon: RELIC_GLYPHS[index],
      label: has ? t(`relic.${number}` as TextKey) : t('album.unknown'),
      sub: has ? t(`album.relic.${number}` as TextKey) : t('album.depth', { depth }),
      detail: `#${number}`,
      run: () => {
        note.text = has
          ? t('album.mira', { text: radioText(relicMessage(index)) })
          : t('album.hint', { depth });
      },
    };
  });
  if (epilogueUnlocked(state)) {
    cards.push({
      label: t('ending.epilogueTitle'),
      sub: t('ending.epilogue'),
      run: () => {
        note.text = '';
      },
    });
  }
  return {
    title: t('album.title'),
    color: '#F4F1DE',
    portrait: PORTRAITS.mira,
    line: t('album.line', { count: found, total: state.relics.length }),
    note: note.text,
    layout: 'grid',
    actions: cards,
  };
}
