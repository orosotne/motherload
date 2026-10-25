/** Simulation timing (GAME_SPEC §9.1). */
export interface EngineConfig {
  /** Fixed simulation rate in Hz. Rendering runs at the display rate and interpolates. */
  simHz: number;
  /**
   * Longest real-time gap the simulation catches up on in one frame. Longer gaps (tab switch,
   * breakpoint, hitch) are dropped, so the world never lurches forward.
   */
  maxFrameMs: number;
}

export const ENGINE: Readonly<EngineConfig> = {
  simHz: 60,
  maxFrameMs: 100,
};
