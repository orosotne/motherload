/** Renderer and lighting defaults (GAME_SPEC §8). Colors come from the zone palettes in the spec. */
export interface RenderConfig {
  /** Upper bound for devicePixelRatio: sharp on Retina without paying for 3× screens. */
  maxPixelRatio: number;
  /** Sky above the surface, zone 1 palette. */
  skyColor: string;
  /** Fill light: sky tint from above, ground bounce from below. */
  hemisphere: { sky: string; ground: string; intensity: number };
  /** Sun; `direction` points from the scene towards the sun. */
  sun: { color: string; intensity: number; direction: readonly [number, number, number] };
}

export const RENDER: Readonly<RenderConfig> = {
  maxPixelRatio: 2,
  skyColor: '#8FD3FF',
  hemisphere: { sky: '#8FD3FF', ground: '#8A4B2A', intensity: 1.5 },
  sun: { color: '#FFF1D6', intensity: 2.5, direction: [-0.5, 1, 0.8] },
};
