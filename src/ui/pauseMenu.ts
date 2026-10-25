import { REBINDABLE, type Rebindable } from '../data/controls';
import { t } from '../i18n';
import type { PanelView } from './panel';
import { keyLabel } from './settingsMenu';

export interface PauseActions {
  resume: () => void;
  /** The Album of relics (§7). */
  album: () => void;
  settings: () => void;
  /** Back to the title screen, the game saved. */
  mainMenu: () => void;
}

/**
 * The pause menu (Esc or Start, §5): continue, the Album, the settings and the title screen,
 * with the world's seed to share and a reminder of the controls as chosen. It is a panel, so
 * the keyboard and the gamepad work in it the same way.
 */
export function pauseView(
  seed: number,
  keys: Readonly<Record<Rebindable, string>>,
  actions: PauseActions,
): PanelView {
  const labels: Record<string, string> = {};
  for (const action of REBINDABLE) labels[action] = keyLabel(keys[action]);
  const help = document.createElement('div');
  help.className = 'pause-help';
  for (const text of [t('pause.seed', { seed }), t('pause.keys', labels), t('pause.pad')]) {
    const line = document.createElement('p');
    line.textContent = text;
    help.append(line);
  }
  return {
    title: t('pause.title'),
    color: '#BDE0FE',
    line: t('pause.line'),
    body: help,
    noClose: true,
    back: actions.resume,
    actions: [
      { label: t('pause.continue'), run: actions.resume },
      { label: t('pause.album'), run: actions.album },
      { label: t('pause.settings'), run: actions.settings },
      { label: t('pause.mainMenu'), run: actions.mainMenu },
    ],
  };
}
