import type { BlockId } from '../data/blocks';
import type { ItemId } from '../data/items';
import type { UpgradeBranch } from '../data/upgrades';
import type { DrillDir } from './pod';

export type DamageSource = 'fall' | 'gas' | 'lava' | 'heat';

/** Why an item could not be used right now. */
export type ItemRefusal = 'tankFull' | 'hullFull' | 'surface' | 'busy' | 'noAnchor' | 'empty';

/**
 * Facts the simulation announces (GAME_SPEC §9.5). Renderer, audio and UI react to them; they
 * never feed back into the simulation.
 */
export interface GameEvents {
  DrillStarted: { col: number; row: number; dir: DrillDir; seconds: number; hardness: number };
  BlockBroken: { col: number; row: number; block: BlockId; mineral: number };
  /** `speed` is the downward speed at touchdown; `fallHeight` counts blocks since the fall top. */
  Landed: { speed: number; fallHeight: number };
  /** The engine started from idle. */
  EngineStarted: Record<string, never>;
  MineralCollected: { mineral: number; value: number; col: number; row: number };
  /** The cargo hold was full, so the mineral shattered without gain (§3). */
  CargoFull: { mineral: number; col: number; row: number };
  Damaged: { amount: number; source: DamageSource; hull: number };
  /** The tank dropped below 20 % (level 1) or 10 % (level 2). */
  FuelAlert: { level: 1 | 2 };
  /** `first` is true the first time the pod ever reaches this zone. */
  ZoneEntered: { zone: number; first: boolean };
  RescueStarted: Record<string, never>;
  /** The drone towed the pod to the surface (§3). */
  Rescued: { fee: number; lostUnits: number };
  Destroyed: { cause: DamageSource };
  Respawned: { fee: number; lostUnits: number };
  Sold: { units: number; value: number };
  Refueled: { liters: number; cost: number; free: boolean };
  Repaired: { hp: number; cost: number };
  /** Drilling into a gas pocket started: it hisses (§5.11). */
  GasHiss: { col: number; row: number };
  /** The player let go in time and the drilling of a gas pocket stopped (§5.11). */
  DrillAborted: { col: number; row: number };
  /** A gas pocket or a charge went off; `radius` 1 is 3 × 3. */
  Explosion: { col: number; row: number; radius: number; source: 'gas' | 'charge' };
  /** The pod touched lava. */
  LavaContact: Record<string, never>;
  /** The overheat meter passed half (level 1) or is full and hurting the hull (level 2). */
  Overheat: { level: 1 | 2 };
  /** A relic was found (§7); `index` 0 to 9 in order of depth. */
  RelicFound: { index: number; bonus: number; col: number; row: number };
  /** `tier` is the new tier, 0-based (1 is T2). */
  UpgradeBought: { branch: UpgradeBranch; tier: number; price: number };
  ItemBought: { item: ItemId; price: number; slot: number };
  /** `auto` when the pod used it by itself to avoid a rescue or destruction. */
  ItemUsed: { item: ItemId; slot: number; auto: boolean };
  ItemRefused: { item: ItemId | null; reason: ItemRefusal };
  SlotSelected: { slot: number };
  /** An elevator anchor was set at a cell. */
  AnchorSet: { col: number; row: number };
  /** The pod jumped elsewhere: back to the surface (beacon) or down to an anchor. */
  Teleported: { cause: 'beacon' | 'anchor' };
}
