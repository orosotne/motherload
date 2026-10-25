/** Prices and penalties (GAME_SPEC §3, §6). */
export interface EconomyConfig {
  startCash: number;
  fuelPricePerLiter: number;
  repairPricePerHp: number;
  /** Share of a mineral's value the buyer pays. */
  sellShare: number;
  /** Rescue drone after an empty tank: share of cash and of cargo lost. */
  rescueFeeShare: number;
  rescueCargoLossShare: number;
  /** Destroyed pod: share of cash; all cargo is lost. */
  destroyFeeShare: number;
  /**
   * Pip tops a broke pilot up to this many litres for free, so a new run can always start
   * (pillar 4: mistakes cost money and time, never progress).
   */
  emergencyFuelLiters: number;
}

export const ECONOMY: Readonly<EconomyConfig> = {
  startCash: 0,
  fuelPricePerLiter: 2,
  repairPricePerHp: 10,
  sellShare: 1,
  rescueFeeShare: 0.15,
  rescueCargoLossShare: 0.5,
  destroyFeeShare: 0.25,
  emergencyFuelLiters: 4,
};

/** Fuel use per second by activity, and the warning levels (§3). */
export const FUEL = {
  idlePerSecond: 0.01,
  drivePerSecond: 0.04,
  drillPerSecond: 0.08,
  flyPerSecond: 0.12,
  /** Share of the tank: first warning, then the urgent one. */
  warnShare: 0.2,
  criticalShare: 0.1,
} as const;

/** Fall damage (§3, §7): free up to 3 blocks, then 4 HP for every further block. */
export const FALL = {
  safeBlocks: 3,
  hpPerBlock: 4,
} as const;

/** How long the rescue drone and the respawn take, in seconds. */
export const RECOVERY = {
  rescueSeconds: 2.6,
  respawnSeconds: 2.2,
} as const;
