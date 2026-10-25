import { GameAudio } from './audio/gameAudio';
import { EventBus } from './core/events';
import { Input } from './core/input';
import { GameLoop } from './core/loop';
import type { BuildingId } from './data/buildings';
import { Block } from './data/blocks';
import { mineralById } from './data/minerals';
import { money } from './i18n';
import { WORLD } from './data/world';
import { GameView } from './render/view';
import { newGame, restore, serialize, settled } from './save/save';
import { clearSave, readSave, writeSave, type SaveStorage } from './save/storage';
import { buildingAt } from './sim/buildings';
import type { GameEvents } from './sim/events';
import { defaultSettings, stepGame } from './sim/game';
import { createPod } from './sim/pod';
import type { DebugTools } from './ui/debug/debugPanel';
import { Fade } from './ui/fade';
import { HeatGlow } from './ui/heatGlow';
import { Hud } from './ui/hud';
import { showNotices } from './ui/notices';
import { PanelHost } from './ui/panel';
import { pauseView } from './ui/pauseMenu';
import { Popups } from './ui/popups';
import { Rumble } from './ui/rumble';
import { shopView } from './ui/shops';
import { Toasts } from './ui/toasts';

/** Seconds of play between autosaves. */
const AUTOSAVE_SECONDS = 10;

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
  let debug: DebugTools | null = null;

  // During a tow or a respawn the save holds its outcome, so a reload neither repeats nor
  // skips it (§9.8).
  let keepSaving = true;
  const save = (): void => {
    if (!storage || !keepSaving) return;
    writeSave(serialize(settled(state, settings.pod.halfSize), baseline), storage);
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
  const openPause = (): void =>
    panels.open(() => pauseView(audio.engine, () => panels.close()), afterPanel);
  const openShop = (id: BuildingId): void => {
    const note = { text: '' };
    panels.open(() => shopView(id, { state, events, note }), afterPanel);
  };

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
      view.render(alpha, frameSeconds);
      audio.update();
      rumble.update(state, frameSeconds);
      hud.update(state);
      heatGlow.update(state);
      fade.update(state, frameSeconds);
      debug?.perf.frame(frameSeconds, loop.lastUpdateMs + performance.now() - renderStart);
    },
  });
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
          state.grid.set(WORLD.spawnCol, row, Block.Empty);
          state.pod = createPod(WORLD.spawnCol, row, settings.pod.halfSize);
          view.snapCamera();
        },
        newGame: () => {
          // Leaving the page saves; this game must not come back.
          keepSaving = false;
          if (storage) clearSave(storage);
          window.location.reload();
        },
      });
    })
    .catch((error: unknown) => console.error('Debug tools failed to load', error));
}
