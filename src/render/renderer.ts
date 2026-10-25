import { WebGLRenderer } from 'three';
import { RENDER } from '../data/render';

/** Creates the WebGL2 renderer on the game canvas. */
export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  return new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
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
