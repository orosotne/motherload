import type { EventBus } from '../core/events';
import { ITEMS, SUPPLY, type ItemId } from '../data/items';
import { blast } from './blast';
import { buildingColumns, landingColumn } from './buildings';
import type { GameEvents, ItemRefusal } from './events';
import type { GameState } from './game';
import { colOf, createPod, rowOf } from './pod';

/** One equipment slot (§6, §8). An elevator anchor remembers where it was set. */
export interface Slot {
  item: ItemId;
  anchor: { col: number; row: number } | null;
}

export type Slots = (Slot | null)[];

export function emptySlots(): Slots {
  return new Array<Slot | null>(SUPPLY.slots).fill(null);
}

export function freeSlot(slots: Slots): number {
  return slots.findIndex((slot) => slot === null);
}

/** Buys an item into the first free slot, at most five (§6). */
export function buyItem(state: GameState, item: ItemId, events: EventBus<GameEvents>): boolean {
  const slot = freeSlot(state.slots);
  const { price } = ITEMS[item];
  if (slot < 0 || state.cash < price) return false;
  state.cash -= price;
  state.slots[slot] = { item, anchor: null };
  events.emit('ItemBought', { item, price, slot });
  return true;
}

export function selectSlot(state: GameState, slot: number, events: EventBus<GameEvents>): void {
  if (slot < 0 || slot >= state.slots.length || slot === state.selectedSlot) return;
  state.selectedSlot = slot;
  events.emit('SlotSelected', { slot });
}

/** The slot "use" acts on: the selected one, or the first filled one when that is empty. */
export function activeSlot(state: GameState): number {
  if (state.slots[state.selectedSlot]) return state.selectedSlot;
  return state.slots.findIndex((slot) => slot !== null);
}

function refusal(state: GameState, slot: Slot): ItemRefusal | null {
  const { pod } = state;
  const surface = rowOf(pod.y) < 0;
  switch (slot.item) {
    case 'fuelCell':
      return state.fuel >= state.stats.tankLiters - 0.05 ? 'tankFull' : null;
    case 'repairKit':
      return state.hull >= state.stats.maxHull ? 'hullFull' : null;
    case 'charge':
    case 'megaCharge':
    case 'beacon':
      if (pod.drill) return 'busy';
      return surface ? 'surface' : null;
    case 'anchor':
      if (pod.drill) return 'busy';
      return surface && !slot.anchor ? 'noAnchor' : null;
  }
}

/** Puts the pod on the surface or at an anchor, at rest. */
function teleport(state: GameState, col: number, row: number, half: number): void {
  state.pod = createPod(col, row, half);
  state.heat = 0;
}

/** Uses the item in a slot (§6). Returns true when it did something. */
export function useSlot(
  state: GameState,
  index: number,
  half: number,
  events: EventBus<GameEvents>,
): boolean {
  const slot = state.slots[index];
  if (!slot || state.status.kind !== 'play') return false;
  const reason = refusal(state, slot);
  if (reason) {
    events.emit('ItemRefused', { item: slot.item, reason });
    return false;
  }
  const { pod } = state;
  const col = colOf(pod.x);
  const row = rowOf(pod.y);
  switch (slot.item) {
    case 'fuelCell':
      state.fuel = Math.min(state.stats.tankLiters, state.fuel + SUPPLY.fuelCellLiters);
      break;
    case 'repairKit':
      state.hull = Math.min(state.stats.maxHull, state.hull + SUPPLY.repairKitHp);
      break;
    case 'charge':
    case 'megaCharge': {
      const radius = slot.item === 'charge' ? SUPPLY.chargeRadius : SUPPLY.megaChargeRadius;
      blast(state.grid, col, row, radius);
      events.emit('Explosion', { col, row, radius, source: 'charge' });
      break;
    }
    case 'beacon':
      teleport(state, landingColumn(state.grid, buildingColumns('buyer')), -1, half);
      events.emit('Teleported', { cause: 'beacon' });
      break;
    case 'anchor':
      if (row >= 0) {
        // Underground: set (or move) the anchor here; the item stays for the ride down.
        slot.anchor = { col, row };
        events.emit('AnchorSet', { col, row });
        return true;
      }
      if (!slot.anchor) return false;
      teleport(state, slot.anchor.col, slot.anchor.row, half);
      events.emit('Teleported', { cause: 'anchor' });
      break;
  }
  state.slots[index] = null;
  events.emit('ItemUsed', { item: slot.item, slot: index, auto: false });
  return true;
}

export function useSelected(state: GameState, half: number, events: EventBus<GameEvents>): void {
  const index = activeSlot(state);
  if (index < 0) {
    events.emit('ItemRefused', { item: null, reason: 'empty' });
    return;
  }
  useSlot(state, index, half, events);
}

/**
 * The pod uses a fuel cell on an empty tank, or a repair kit at 0 HP, by itself (pillar 4: an
 * item bought for an emergency must help in one). Returns true if it had one.
 */
export function autoUse(
  state: GameState,
  item: 'fuelCell' | 'repairKit',
  events: EventBus<GameEvents>,
): boolean {
  const index = state.slots.findIndex((slot) => slot?.item === item);
  if (index < 0) return false;
  if (item === 'fuelCell') {
    state.fuel = Math.min(state.stats.tankLiters, state.fuel + SUPPLY.fuelCellLiters);
  } else {
    state.hull = Math.min(state.stats.maxHull, state.hull + SUPPLY.repairKitHp);
  }
  state.slots[index] = null;
  events.emit('ItemUsed', { item, slot: index, auto: true });
  return true;
}
