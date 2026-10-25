import type { AudioEngine } from '../audio/engine';
import type { EventBus } from '../core/events';
import type { Input } from '../core/input';
import type { BuildingId } from '../data/buildings';
import { keyboardMap } from '../data/controls';
import { writePrefs, type Prefs } from '../save/prefs';
import type { SaveStorage } from '../save/storage';
import type { GameEvents } from '../sim/events';
import type { GameState, SimSettings } from '../sim/game';
import { abandonFinale, escapeSeconds } from '../story/finale';
import { albumView } from './album';
import { endingView } from './ending';
import type { PanelHost, PanelView } from './panel';
import { pauseView } from './pauseMenu';
import { retryView } from './retry';
import { controlsView, settingsView, type ControlsState } from './settingsMenu';
import { shopView } from './shops';
import { creditsView, newGameView, titleView } from './titleMenu';

export interface MenuContext {
  panels: PanelHost;
  state: GameState;
  events: EventBus<GameEvents>;
  audio: AudioEngine;
  settings: SimSettings;
  input: Input;
  prefs: Prefs;
  storage: SaveStorage | null;
  /** Saves the game now; the finale's escape is never saved. */
  save: () => void;
  /** A new world from `seed`; this game is wiped. */
  newGame: (seed: number) => void;
  randomSeed: () => number;
}

/** Puts the preferences to work: the keyboard layout, rumble and screen shake (F6). */
export function applyPrefs(prefs: Prefs, settings: SimSettings, input: Input): void {
  input.setKeymap(keyboardMap(prefs.keys));
  settings.feel.rumble.enabled = prefs.rumble;
  settings.feel.shake.enabled = prefs.shake;
}

/**
 * Every panel of the game and the way between them (GAME_SPEC §3, §7, F6): the title screen,
 * new game, settings and controls, credits, pause, the Album, shops, the escape's retry and the
 * ending. Whatever panel is open, the game waits.
 */
export class Menus {
  constructor(private readonly c: MenuContext) {}

  private open(render: () => PanelView): void {
    this.c.panels.open(render, () => {
      // The key that closes a panel must not count as a game press afterwards.
      this.c.input.clearPresses();
      this.c.save();
    });
  }

  /** True once the world on screen has been played: a new game would wipe it. */
  private get played(): boolean {
    return this.c.state.time > 1;
  }

  title(): void {
    const played = this.played;
    const actions = {
      play: () => this.c.panels.close(),
      newGame: () => this.newGame(() => this.title()),
      settings: () => this.settings(() => this.title()),
      credits: () => this.open(() => creditsView(() => this.title())),
    };
    this.open(() => titleView(this.c.state, played, actions));
  }

  newGame(back: () => void): void {
    const state = { seed: '', armed: null, missing: false };
    const context = {
      played: this.played,
      start: this.c.newGame,
      back,
      randomSeed: this.c.randomSeed,
    };
    this.open(() => newGameView(context, state));
  }

  settings(back: () => void): void {
    const context = {
      audio: this.c.audio,
      prefs: this.c.prefs,
      apply: () => this.applyPrefs(),
      controls: () => this.controls(() => this.settings(back)),
      back,
    };
    this.open(() => settingsView(context));
  }

  controls(back: () => void): void {
    const state: ControlsState = { waiting: null, note: '', stop: null };
    const context = {
      prefs: this.c.prefs,
      apply: () => this.applyPrefs(),
      back,
      refresh: () => this.c.panels.refresh(),
    };
    this.open(() => controlsView(context, state));
  }

  pause(): void {
    const actions = {
      resume: () => this.c.panels.close(),
      album: () => this.album(() => this.pause()),
      settings: () => this.settings(() => this.pause()),
      mainMenu: () => this.title(),
    };
    this.open(() => pauseView(this.c.state.seed, this.c.prefs.keys, actions));
  }

  album(back?: () => void): void {
    const note = { text: '' };
    this.open(() => ({ ...albumView(this.c.state, note), ...(back ? { back } : {}) }));
  }

  shop(id: BuildingId): void {
    const note = { text: '' };
    const context = { state: this.c.state, events: this.c.events, note };
    this.open(() => shopView(id, { ...context, openAlbum: () => this.album(() => this.shop(id)) }));
  }

  /** After the lava wins: another try, or a free tow home (pillar 4). */
  retry(failedAttempts: number): void {
    const attempt = failedAttempts + 1;
    const next = { attempt, seconds: escapeSeconds(attempt) };
    const actions = {
      again: () => this.c.panels.close(),
      giveUp: () => {
        abandonFinale(this.c.state, this.c.settings.pod.halfSize, this.c.events);
        this.c.panels.close();
      },
    };
    this.open(() => retryView(next, actions));
  }

  ending(): void {
    const confirm = { armed: false };
    const actions = {
      keepMining: () => this.c.panels.close(),
      newGame: () => this.c.newGame(this.c.randomSeed()),
    };
    this.open(() => endingView(this.c.state, actions, confirm));
  }

  private applyPrefs(): void {
    applyPrefs(this.c.prefs, this.c.settings, this.c.input);
    writePrefs(this.c.prefs, this.c.storage);
  }
}
