/**
 * Assumptions about players for the economy model (`npm run sim:economy`, GAME_SPEC §6) and the
 * playtest (`npm run playtest`, F6): how a typical player plays, not rules of the game. See
 * DECISIONS.md.
 */
export const BALANCE = {
  /** Worlds measured for mineral, gas and cave statistics. */
  seeds: 6,
  /** Rows per band the player mines in. */
  bandRows: 10,
  /** Speed down an open shaft, braking for the landing included, in blocks per second. */
  descentSpeed: 6,
  descentFuelPerSecond: 0.05,
  /** Driving and short hops between the blocks drilled while mining, per block. */
  moveSecondsPerBlock: 0.5,
  /** Seconds lost per trip to accelerating, aiming at the shaft and landing at the shops. */
  tripOverheadSeconds: 15,
  /** Selling, refuelling and buying on the surface, per trip. */
  surfaceSeconds: 25,
  /** How many times more ore a player hits than random drilling, when the ore is visible. */
  targeting: 2.5,
  /** Rows of daylight (§3: down to 150 m); deeper only the headlight shows ore. */
  daylightRows: 37,
  /** Headlight reach at which the dark no longer hides ore. */
  lightFullRange: 10,
  /** Share of the tank kept back for the way home. */
  fuelReserve: 0.15,
  /** Share of gas pockets a player notices from the hiss and lets go in time. */
  gasAvoided: 0.6,
  /** Most expected damage per trip a player accepts, as a share of the hull. */
  hullRisk: 0.5,
  /** Seconds to fetch a relic near the band being mined. */
  relicDetourSeconds: 30,
  /** Engine tier (0-based) needed to outrun the lava in the finale's 90 s escape. */
  finaleEngineTier: 3,
  /** Most damage a player risks on the dive to the Heart, as a share of the hull. */
  finaleRisk: 0.6,
  /** Players go deeper as soon as a deeper band pays at least this share of the best one. */
  depthPreference: 0.6,
  /** New rows a player digs into the unknown per trip: one goes deeper step by step. */
  newRowsPerTrip: 20,
  /** An upgrade that opens one more band counts like this much more income per second. */
  reachValue: 0.04,
  /** The simulation gives up after this long. */
  maxHours: 8,
  /**
   * How many times longer a player takes than the playtest bot, which sees through rock, never
   * misses a landing and never stops to look around. An estimate until people play it (F6).
   */
  playerSlowdown: 2,
} as const;

/**
 * Balance targets (§6), in a player's minutes. The model checks the first upgrade and the zones;
 * the bot playing the real game checks the finale and how often there is something to buy.
 */
export const BALANCE_TARGETS = {
  firstUpgradeMinutes: 5,
  firstUpgradeTrips: [2, 3] as const,
  zoneMinutes: { 2: 15, 3: 45, 4: 120 } as Readonly<Record<number, number>>,
  finaleMinutes: [180, 240] as const,
  /** More identical trips than this before the next purchase is a balance bug. */
  maxTripsPerPurchase: 4,
} as const;
