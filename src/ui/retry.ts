import { t } from '../i18n';
import type { PanelView } from './panel';
import { PORTRAITS } from './portraits';

export interface RetryActions {
  /** The escape already starts over by the Heart; this only closes the panel. */
  again: () => void;
  /** Pip's drone tows the pod to the station and the Heart waits (pillar 4). */
  giveUp: () => void;
}

/**
 * After the lava wins (GAME_SPEC §7): the `next` try from the Heart, with more time, or a free
 * tow back to the station, so a rig too slow for the escape is never stuck in the finale.
 */
export function retryView(
  next: { attempt: number; seconds: number },
  actions: RetryActions,
): PanelView {
  const body = document.createElement('p');
  body.className = 'ending-hint';
  body.textContent = t('retry.hint');
  return {
    title: t('retry.title'),
    color: '#FF9F43',
    portrait: PORTRAITS.pip,
    line: t('retry.line', { attempt: next.attempt, seconds: Math.round(next.seconds) }),
    body,
    noClose: true,
    actions: [
      { label: t('retry.again'), run: actions.again },
      { label: t('retry.giveUp'), run: actions.giveUp },
    ],
  };
}
