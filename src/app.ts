import { EventBus } from './core/events';
import { Input } from './core/input';
import { GameLoop } from './core/loop';
import type { BuildingId } from './data/buildings';
import { WORLD } from './data/world';
import { GameView } from './render/view';
import { buildingAt } from './sim/buildings';
import type { GameEvents } from './sim/events';
import { createGame, defaultSettings, stepGame } from './sim/game';
import { createPod } from './sim/pod';
import type { DebugTools } from './ui/debug/debugPanel';
import { Fade } from './ui/fade';
import { Hud } from './ui/hud';
import { showNotices } from './ui/notices';
import { PanelHost } from './ui/panel';
import { shopView } from './ui/shops';
import { Toasts } from './ui/toasts';
import { generateWorld } from './world/generator';

/** Debug tools: always in dev mode; in a production build with ?debug, or #debug where the
 * query string never reaches the page (the claude.ai preview). */
function debugRequested(): boolean {
  if (import.meta.env.DEV) return true;
  return (
    new URLSearchParams(window.location.search).has('debug') || window.location.hash === '#debug'
  );
}

/** Wires simulation, input, view, UI and the game loop together. */
export function startApp(canvas: HTMLCanvasElement, ui: HTMLElement): void {
  const settings = defaultSettings();
  // A fresh world each start until saves arrive in F3.
  const seed = Math.floor(Math.random() * 2 ** 32);
  const state = createGame(generateWorld(seed), settings, seed);
  const events = new EventBus<GameEvents>();
  const input = new Input(window);
  const view = new GameView(canvas, state, settings, events);
  const hud = new Hud(ui);
  const fade = new Fade(ui, events);
  const panels = new PanelHost(ui);
  showNotices(events, new Toasts(ui));
  let debug: DebugTools | null = null;

  const openShop = (id: BuildingId): void => {
    const note = { text: '' };
    // The key that closes the panel must not count as a game press afterwards.
    panels.open(
      () => shopView(id, { state, events, note }),
      () => input.clearPresses(),
    );
  };

  const loop = new GameLoop({
    update: (dt) => {
      const frame = input.sample();
      // Shops pause the game (§3: every trip ends with a decision what to buy).
      if (panels.isOpen) return;
      const building = state.status.kind === 'play' ? buildingAt(state.pod) : null;
      if (frame.pressed.enter && building) {
        openShop(building.id);
        return;
      }
      stepGame(state, frame, dt, settings, events);
    },
    render: (alpha, frameSeconds) => {
      const renderStart = performance.now();
      view.render(alpha, frameSeconds);
      hud.update(state);
      fade.update(state, frameSeconds);
      debug?.perf.frame(frameSeconds, loop.lastUpdateMs + performance.now() - renderStart);
    },
  });
  loop.start();

  if (!debugRequested()) return;
  // Console and test access to the live game while debugging.
  Object.assign(window, { hlbina: { state, settings, loop, events } });
  void import('./ui/debug/debugPanel')
    .then(({ createDebugTools }) => {
      debug = createDebugTools({
        loop,
        camera: view.rig,
        renderInfo: view.renderer.info,
        settings,
        resetPod: () => {
          state.pod = createPod(WORLD.spawnCol, -1, settings.pod.halfSize);
          view.snapCamera();
        },
      });
    })
    .catch((error: unknown) => console.error('Debug tools failed to load', error));
}
