import type { AudioEngine } from '../audio/engine';
import type { AudioVolumes } from '../data/audio';
import { getLanguage, setLanguage, t, type TextKey } from '../i18n';
import type { PanelAction, PanelView } from './panel';

const STEPS = [0, 0.25, 0.5, 0.75, 1];

/** The next volume step, wrapping from 100 % back to 0. */
function nextStep(value: number): number {
  const index = STEPS.findIndex((step) => step > value + 0.01);
  return index < 0 ? 0 : (STEPS[index] ?? 0);
}

function percent(value: number): string {
  return `${Math.round(value * 100)} %`;
}

/**
 * The pause menu (Esc or Start, §5): continue, the volume mixer (§8), the language and a reminder
 * of the controls. It is a panel, so the keyboard and the gamepad work in it the same way.
 */
export function pauseView(audio: AudioEngine, resume: () => void): PanelView {
  const volume = (channel: keyof AudioVolumes, key: TextKey): PanelAction => ({
    label: t(key),
    detail: percent(audio.volumes[channel]),
    run: () => audio.setVolume(channel, nextStep(audio.volumes[channel])),
  });
  const help = document.createElement('div');
  help.className = 'pause-help';
  for (const key of ['pause.keys', 'pause.pad'] as const) {
    const line = document.createElement('p');
    line.textContent = t(key);
    help.append(line);
  }
  return {
    title: t('pause.title'),
    color: '#BDE0FE',
    line: t('pause.line'),
    body: help,
    noClose: true,
    actions: [
      { label: t('pause.continue'), run: resume },
      volume('master', 'pause.master'),
      volume('music', 'pause.music'),
      volume('sfx', 'pause.sfx'),
      {
        label: t('pause.language'),
        detail: t('pause.languageName'),
        run: () => setLanguage(getLanguage() === 'en' ? 'sk' : 'en'),
      },
    ],
  };
}
