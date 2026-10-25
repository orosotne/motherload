/** Hazards (GAME_SPEC §3, §7). Values the spec leaves open are in DECISIONS.md. */

/** Gas pocket: explodes 3 × 3 when drilled through; 15 HP in zone 2, +5 HP per deeper zone. */
export const GAS = {
  zone2Damage: 15,
  damagePerZone: 5,
  blastRadius: 1,
} as const;

/** Lava: static, never flows; contact costs 10 HP per second. */
export const LAVA = {
  damagePerSecond: 10,
  /** The pod sinks slowly through lava, which leaves time to fly out. Blocks per second. */
  sinkSpeed: 2.5,
} as const;

/**
 * Heat below the cooling limit: the overheat meter (0 to 1) fills, faster the deeper past the
 * limit; at 1 the hull loses 2 HP per second. Above the limit it cools down.
 */
export const HEAT = {
  fillPerSecond: 0.08,
  /** Extra fill per second for every metre past the limit. */
  fillPerMeter: 0.0004,
  coolPerSecond: 0.25,
  damagePerSecond: 2,
  /** Meter level of the first warning. */
  warnLevel: 0.5,
} as const;

/** Gas damage in a zone (§7). */
export function gasDamage(zone: number): number {
  return GAS.zone2Damage + GAS.damagePerZone * Math.max(zone - 2, 0);
}
