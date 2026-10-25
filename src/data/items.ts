/** Supply Depot items (GAME_SPEC §6): consumables, each taking a slot until it is used. */
export const ITEM_IDS = [
  'fuelCell',
  'repairKit',
  'charge',
  'megaCharge',
  'beacon',
  'anchor',
] as const;

export type ItemId = (typeof ITEM_IDS)[number];

export interface ItemConfig {
  id: ItemId;
  /** i18n key of the name; the effect text is `${key}.effect`. */
  key: string;
  price: number;
}

export const ITEMS: Readonly<Record<ItemId, ItemConfig>> = {
  fuelCell: { id: 'fuelCell', key: 'item.fuelCell', price: 300 },
  repairKit: { id: 'repairKit', key: 'item.repairKit', price: 500 },
  charge: { id: 'charge', key: 'item.charge', price: 900 },
  megaCharge: { id: 'megaCharge', key: 'item.megaCharge', price: 2500 },
  beacon: { id: 'beacon', key: 'item.beacon', price: 2000 },
  anchor: { id: 'anchor', key: 'item.anchor', price: 3000 },
};

/** Effects and the slot count (§6). */
export const SUPPLY = {
  slots: 5,
  fuelCellLiters: 15,
  repairKitHp: 40,
  /** Blocks around the pod: 1 is the 3 × 3 square, 2 the 5 × 5 one. */
  chargeRadius: 1,
  megaChargeRadius: 2,
} as const;
