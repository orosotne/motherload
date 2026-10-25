/**
 * Game feel (GAME_SPEC §5). Every item has its values here and an `enabled` switch the debug
 * panel flips, so the difference can be compared. Numbers in the spec are kept as given.
 */
export interface FeelConfig {
  /** 1. A direction pressed shortly before a block is drilled through runs right after it. */
  inputBuffer: { enabled: boolean; ms: number };
  /** 2. A drilling direction pressed shortly before touchdown runs on landing. */
  landingBuffer: { enabled: boolean; ms: number };
  /** 3. Squash on landing, stretch on lift-off. */
  squash: {
    enabled: boolean;
    landScaleY: number;
    landScaleX: number;
    landMs: number;
    /** Softer landings do not squash. */
    minLandingSpeed: number;
    liftScaleY: number;
    liftScaleX: number;
    liftMs: number;
  };
  /** 7. Screen shake: strength = trauma², trauma decays linearly. */
  shake: {
    enabled: boolean;
    decayPerSecond: number;
    /** Camera offset at full strength, in blocks. */
    maxOffset: number;
    /** Camera roll at full strength, in degrees. */
    maxRollDeg: number;
    /** How fast the shake wobbles. */
    frequency: number;
    /** Landings faster than this add trauma… */
    landingMinSpeed: number;
    /** …up to this much at the top fall speed. */
    landingMaxTrauma: number;
  };
  /** 8. Camera: smooth follow with lookahead in the direction of travel. */
  camera: {
    enabled: boolean;
    /** Exponential follow rate per second. */
    followRate: number;
    /** Blocks ahead in the driving direction. */
    lookahead: number;
    /** Blocks below the pod at the top fall speed. */
    fallLookahead: number;
    /** Blocks above the pod at the top climbing speed. */
    climbLookahead: number;
  };
  /** 10. Engine curve: thrust builds up and dies down instead of switching. */
  engine: { enabled: boolean; rampUpSeconds: number; rampDownSeconds: number };
  /**
   * 11. Forgiveness: falls up to 3 blocks cost nothing, and letting go of the direction within
   * this time after a gas pocket starts hissing stops the drilling.
   */
  forgiveness: { enabled: boolean; gasAbortMs: number };
}

export const FEEL: Readonly<FeelConfig> = {
  inputBuffer: { enabled: true, ms: 120 },
  landingBuffer: { enabled: true, ms: 150 },
  squash: {
    enabled: true,
    landScaleY: 0.85,
    landScaleX: 1.15,
    landMs: 120,
    minLandingSpeed: 3,
    liftScaleY: 1.12,
    liftScaleX: 0.92,
    liftMs: 100,
  },
  shake: {
    enabled: true,
    decayPerSecond: 1.5,
    maxOffset: 0.6,
    maxRollDeg: 2.5,
    frequency: 22,
    landingMinSpeed: 7,
    landingMaxTrauma: 0.55,
  },
  camera: { enabled: true, followRate: 8, lookahead: 3, fallLookahead: 5, climbLookahead: 1.5 },
  engine: { enabled: true, rampUpSeconds: 0.25, rampDownSeconds: 0.12 },
  forgiveness: { enabled: true, gasAbortMs: 300 },
};
