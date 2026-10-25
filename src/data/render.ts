/** Renderer and lighting defaults (GAME_SPEC §8). Colors come from the zone palettes in the spec. */
export interface RenderConfig {
  /** Upper bound for devicePixelRatio: sharp on Retina without paying for 3× screens. */
  maxPixelRatio: number;
  /** Sky above the surface, zone 1 palette. */
  skyColor: string;
  /** Fill light: sky tint from above, ground bounce from below. */
  hemisphere: { sky: string; ground: string; intensity: number };
  /** Sun; `direction` points from the scene towards the sun. Casts the shadows on the surface. */
  sun: {
    color: string;
    intensity: number;
    direction: readonly [number, number, number];
    shadowMapSize: number;
    /** Half the size of the shadowed square around the camera, in blocks. */
    shadowExtent: number;
  };
  /** Daylight is full down to the first row and gone at the second (§3: dark below 150 m). */
  daylightRows: readonly [number, number];
  /** What is left of the light in the dark, so silhouettes still read. */
  ambientDark: number;
  /** The headlight (§8): a spot on the pod; its reach is the light upgrade in blocks. */
  headlight: { color: string; intensity: number; angle: number; penumbra: number; decay: number };
  /** Soft light right around the pod, so its own block never goes black. */
  podGlow: { color: string; intensity: number; distance: number };
  /** At most this many lava lights, the nearest to the pod (§8). */
  lavaLights: { count: number; color: string; intensity: number; distance: number };
  /** Depth haze (§8): where it starts and where it is full, in units from the camera. */
  fog: { near: number; far: number };
  /** Bloom on the glowing layer only (§8). */
  bloom: { strength: number; radius: number; threshold: number };
}

export const RENDER: Readonly<RenderConfig> = {
  maxPixelRatio: 2,
  skyColor: '#8FD3FF',
  hemisphere: { sky: '#8FD3FF', ground: '#8A4B2A', intensity: 1.6 },
  sun: {
    color: '#FFF1D6',
    intensity: 2.6,
    direction: [-0.5, 1, 0.8],
    shadowMapSize: 2048,
    shadowExtent: 22,
  },
  daylightRows: [22, 37],
  ambientDark: 0.12,
  headlight: { color: '#FFF4D6', intensity: 26, angle: 0.75, penumbra: 0.45, decay: 1.3 },
  podGlow: { color: '#FFE8C2', intensity: 3, distance: 2.6 },
  lavaLights: { count: 8, color: '#FF6B1A', intensity: 3, distance: 4.5 },
  fog: { near: 20, far: 38 },
  bloom: { strength: 0.6, radius: 0.4, threshold: 0 },
};
