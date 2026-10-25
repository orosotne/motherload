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
  /**
   * 4. Drill life: the pod shakes while drilling, debris flies in the block's colour and the
   * drill's pitch rises with hardness.
   */
  drillLife: {
    enabled: boolean;
    /** Shake of the pod in blocks. */
    shake: number;
    /** Debris pieces per second while drilling. */
    debrisPerSecond: number;
    /** Drill pitch in Hz at hardness 1, and how much each point of hardness adds. */
    pitchBase: number;
    pitchPerHardness: number;
  };
  /** 5. Hitstop and a flash for valuable minerals; the chime rises with the value. */
  hitstop: { enabled: boolean; ms: number; minValue: number };
  /** 6. "+$150" flies from the block to the cargo readout in the HUD. */
  popup: { enabled: boolean; ms: number };
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
  /** 9. Rumble through the gamepad's vibrationActuator: soft while drilling, strong on blasts. */
  rumble: { enabled: boolean; drill: number; explosion: number };
  /**
   * 11. Forgiveness: falls up to 3 blocks cost nothing, and letting go of the direction within
   * this time after a gas pocket starts hissing stops the drilling.
   */
  forgiveness: { enabled: boolean; gasAbortMs: number };
  /** 12. Readability: dangerous blocks differ by shape and movement, not only by colour. */
  readability: { enabled: boolean };
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
  drillLife: {
    enabled: true,
    shake: 0.035,
    debrisPerSecond: 14,
    pitchBase: 70,
    pitchPerHardness: 28,
  },
  // $400 and up: the five most valuable minerals, as $900 was with the spec's prices (DECISIONS).
  hitstop: { enabled: true, ms: 60, minValue: 400 },
  popup: { enabled: true, ms: 650 },
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
  rumble: { enabled: true, drill: 0.12, explosion: 1 },
  forgiveness: { enabled: true, gasAbortMs: 300 },
  readability: { enabled: true },
};
