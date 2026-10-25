import { GameAudio } from './audio/gameAudio';
import { EventBus } from './core/events';
import { Input } from './core/input';
import { GameLoop } from './core/loop';
import type { BuildingId } from './data/buildings';
import { Block } from './data/blocks';
import { mineralById } from './data/minerals';
import { HEART } from './data/story';
import { money } from './i18n';
import { WORLD } from './data/world';
import { GameView } from './render/view';
import { newGame, restore, serialize, settled } from './save/save';
import { clearSave, readSave, writeSave, type SaveStorage } from './save/storage';
import { buildingAt } from './sim/buildings';
import type { GameEvents } from './sim/events';
import { defaultSettings, stepGame } from './sim/game';
import { createPod } from './sim/pod';
import { StoryDirector } from './story/director';
import { abandonFinale, escapeSeconds } from './story/finale';
import { albumView } from './ui/album';
import type { DebugTools } from './ui/debug/debugPanel';
import { endingView } from './ui/ending';
import { EscapeTimer } from './ui/escapeTimer';
import { Fade } from './ui/fade';
import { HeatGlow } from './ui/heatGlow';
import { Hud } from './ui/hud';
import { showNotices } from './ui/notices';
import { PanelHost } from './ui/panel';
import { pauseView } from './ui/pauseMenu';
import { Popups } from './ui/popups';
import { Radio } from './ui/radio';
import { retryView } from './ui/retry';
import { Rumble } from './ui/rumble';
import { shopView } from './ui/shops';
import { Toasts } from './ui/toasts';

/** Seconds of play between autosaves. */
const AUTOSAVE_SECONDS = 10;
/** Seconds of celebration on the surface before the ending opens (§7). */
const ENDING_DELAY_SECONDS = 2.5;

/** Debug tools: always in dev mode; in a production build with ?debug, or #debug where the
 * query string never reaches the page (the claude.ai preview). */
function debugRequested(): boolean {
  if (import.meta.env.DEV) return true;
  return (
    new URLSearchParams(window.location.search).has('debug') || window.location.hash === '#debug'
  );
}

/** localStorage, unless the browser refuses it (sandboxed frames, some private windows). */
function browserStorage(): SaveStorage | null {
  try {
    const storage = window.localStorage;
    storage.getItem('hlbina.save');
    return storage;
  } catch {
    return null;
  }
}

/** Wires simulation, saves, input, view, UI and the game loop together. */
export function startApp(canvas: HTMLCanvasElement, ui: HTMLElement): void {
  const settings = defaultSettings();
  const storage = browserStorage();
  const saved = storage ? readSave(storage) : null;
  // A new world gets a random seed; from then on everything is deterministic (§4).
  const { state, baseline } = saved
    ? restore(saved, settings)
    : newGame(Math.floor(Math.random() * 2 ** 32), settings);
  const events = new EventBus<GameEvents>();
  const input = new Input(window);
  const view = new GameView(canvas, state, settings, events);
  const hud = new Hud(ui);
  const heatGlow = new HeatGlow(ui);
  const fade = new Fade(ui, events);
  const audio = new GameAudio(state, settings, events);
  const panels = new PanelHost(ui, () => audio.sfx.click());
  const rumble = new Rumble(input.pad, settings.feel, events);
  const popups = new Popups(
    ui,
    settings.feel,
    (x, y) => view.project(x, y),
    () => hud.cargoRect(),
  );
  showNotices(events, new Toasts(ui));
  const radio = new Radio(ui, (speaker) => audio.story.radio(speaker));
  events.on('Radio', ({ message }) => radio.say(message));
  const escapeTimer = new EscapeTimer(ui, settings.pod.halfSize);
  let debug: DebugTools | null = null;

  // During a tow or a respawn the save holds its outcome, so a reload neither repeats nor
  // skips it (§9.8). The finale is never saved: a reload goes back to before the Heart was lit.
  let keepSaving = true;
  const save = (): void => {
    if (!storage || !keepSaving || state.finale) return;
    writeSave(serialize(settled(state, settings.pod.halfSize), baseline), storage);
  };
  // A new world from a new seed (§7): this game must not come back, not even from leaving the
  // page, which saves.
  const startNewGame = (): void => {
    keepSaving = false;
    if (storage) clearSave(storage);
    window.location.reload();
  };
  let sinceSave = 0;
  events.on('RelicFound', save);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });

  const afterPanel = (): void => {
    // The key that closes the panel must not count as a game press afterwards.
    input.clearPresses();
    save();
  };
  const openAlbum = (): void => {
    const note = { text: '' };
    panels.open(() => albumView(state, note), afterPanel);
  };
  const openPause = (): void => {
    const confirm = { armed: false };
    const actions = { resume: () => panels.close(), album: openAlbum, newGame: startNewGame };
    panels.open(() => pauseView(audio.engine, actions, confirm), afterPanel);
  };
  const openShop = (id: BuildingId): void => {
    const note = { text: '' };
    panels.open(() => shopView(id, { state, events, note, openAlbum }), afterPanel);
  };
  const openEnding = (): void => {
    const confirm = { armed: false };
    const actions = { keepMining: () => panels.close(), newGame: startNewGame };
    panels.open(() => endingView(state, actions, confirm), afterPanel);
  };
  // After the lava wins: another try, or a free tow home (pillar 4).
  events.on('EscapeFailed', ({ attempts }) => {
    const next = { attempt: attempts + 1, seconds: escapeSeconds(attempts + 1) };
    const actions = {
      again: () => panels.close(),
      giveUp: () => {
        abandonFinale(state, settings.pod.halfSize, events);
        panels.close();
      },
    };
    panels.open(() => retryView(next, actions), afterPanel);
  });
  // The ending, after a moment of fireworks; finding the last relic later shows the epilogue.
  let endingIn = Infinity;
  events.on('FinaleWon', () => {
    save();
    endingIn = ENDING_DELAY_SECONDS;
  });
  events.on('RelicFound', () => {
    if (state.story.finished && state.relics.every(Boolean)) endingIn = ENDING_DELAY_SECONDS;
  });

  // A valuable mineral (§5.5) holds the game still for a moment; every one flies to the HUD (§5.6).
  events.on('MineralCollected', ({ mineral, value, col, row }) => {
    const { hitstop } = settings.feel;
    if (hitstop.enabled && value >= hitstop.minValue) loop.freeze(hitstop.ms);
    popups.show(`+${money(value)}`, col, -row, mineralById(mineral)?.color ?? '#ffffff');
  });

  const loop: GameLoop = new GameLoop({
    update: (dt) => {
      const frame = input.sample();
      const commands = input.takeMenuCommands();
      // Shops and the pause menu stop the game (§3: every trip ends with a decision what to buy).
      if (panels.isOpen) {
        for (const command of commands) panels.command(command);
        return;
      }
      if (frame.pressed.pause) {
        openPause();
        return;
      }
      if (frame.pressed.skip) radio.skip();
      endingIn -= dt;
      if (endingIn <= 0) {
        endingIn = Infinity;
        openEnding();
        return;
      }
      const building = state.status.kind === 'play' ? buildingAt(state.pod) : null;
      if (frame.pressed.enter && building) {
        openShop(building.id);
        return;
      }
      stepGame(state, frame, dt, settings, events);
      sinceSave += dt;
      if (sinceSave >= AUTOSAVE_SECONDS) {
        sinceSave = 0;
        save();
      }
    },
    render: (alpha, frameSeconds) => {
      const renderStart = performance.now();
      view.render(alpha, frameSeconds, panels.isOpen);
      audio.update(panels.isOpen);
      rumble.update(state, frameSeconds, panels.isOpen);
      hud.update(state);
      escapeTimer.update(state);
      radio.update(frameSeconds, panels.isOpen);
      heatGlow.update(state);
      fade.update(state, frameSeconds);
      debug?.perf.frame(frameSeconds, loop.lastUpdateMs + performance.now() - renderStart);
    },
  });
  // The director speaks through the radio from the first message on (§7).
  const director = new StoryDirector(state, events);
  director.start();
  loop.start();

  if (!debugRequested()) return;
  // Console and test access to the live game while debugging.
  Object.assign(window, { hlbina: { state, settings, loop, events, save } });
  void import('./ui/debug/debugPanel')
    .then(({ createDebugTools }) => {
      debug = createDebugTools({
        loop,
        camera: view.rig,
        renderInfo: view.renderer.info,
        settings,
        state,
        view,
        resetPod: () => {
          state.pod = createPod(WORLD.spawnCol, -1, settings.pod.halfSize);
          view.snapCamera();
        },
        teleport: (row) => {
          // Never into the Heart: in its chamber the pod lands right beside it.
          const col = row >= HEART.chamber.firstRow ? HEART.cols[0] - 1 : WORLD.spawnCol;
          state.grid.set(col, row, Block.Empty);
          state.pod = createPod(col, row, settings.pod.halfSize);
          view.snapCamera();
        },
        newGame: startNewGame,
      });
    })
    .catch((error: unknown) => console.error('Debug tools failed to load', error));
}
