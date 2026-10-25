import { PCFShadowMap, WebGLRenderer } from 'three';
import { RENDER } from '../data/render';

/** Creates the WebGL2 renderer on the game canvas. */
export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  // Counters cover a whole frame, also once a frame needs several render passes (bloom, §8).
  // The frame callback resets them.
  renderer.info.autoReset = false;
  // The sun's shadows on the surface (§8: at most two shadowed lights; it is the only one).
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  return renderer;
}

/**
 * Keeps the drawing buffer in sync with the canvas' CSS size and the display's pixel ratio.
 * Calls `onResize` with the new CSS size and returns a function that stops observing.
 */
export function bindResize(
  renderer: WebGLRenderer,
  onResize: (width: number, height: number) => void,
): () => void {
  const canvas = renderer.domElement;
  const apply = (): void => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.maxPixelRatio));
    renderer.setSize(width, height, false);
    onResize(width, height);
  };
  const observer = new ResizeObserver(apply);
  observer.observe(canvas);
  apply();
  return () => observer.disconnect();
}
