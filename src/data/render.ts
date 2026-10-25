/** Renderer defaults (GAME_SPEC §8). Colors come from the zone palettes in the spec. */
export interface RenderConfig {
  /** Upper bound for devicePixelRatio: sharp on Retina without paying for 3× screens. */
  maxPixelRatio: number;
  /** Sky above the surface, zone 1 palette. */
  skyColor: string;
}

export const RENDER: Readonly<RenderConfig> = {
  maxPixelRatio: 2,
  skyColor: '#8FD3FF',
};
