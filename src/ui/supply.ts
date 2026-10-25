import { ITEM_IDS, ITEMS, type ItemId } from '../data/items';
import { money, t, type TextKey } from '../i18n';
import { rowDepth } from '../sim/buildings';
import type { GameState } from '../sim/game';
import { buyItem, freeSlot, type Slot } from '../sim/items';
import { ITEM_ICONS } from './icons';
import type { ShopContent, ShopContext } from './shops';

export function itemName(item: ItemId): string {
  return t(ITEMS[item].key as TextKey);
}

/** Where an anchor waits, as a depth: "set at 640 m". */
export function anchorText(slot: Slot): string {
  if (!slot.anchor) return '';
  const depth = t('unit.meters', { value: rowDepth(slot.anchor.row) });
  return t('item.anchor.set', { depth });
}

/** The five slots as small boxes with icons, for the shop and the HUD (§8). */
export function slotRow(state: GameState, className = 'slot-row'): HTMLElement {
  const row = document.createElement('div');
  row.className = className;
  state.slots.forEach((slot, index) => {
    const box = document.createElement('div');
    box.className = `slot${slot ? '' : ' is-empty'}${index === state.selectedSlot ? ' is-selected' : ''}`;
    box.title = slot ? `${itemName(slot.item)} ${anchorText(slot)}`.trim() : '';
    const key = document.createElement('span');
    key.className = 'slot-key';
    key.textContent = String(index + 1);
    box.append(key);
    if (slot) {
      const icon = document.createElement('span');
      icon.className = `slot-icon${slot.anchor ? ' is-set' : ''}`;
      // Static SVG from icons.ts.
      icon.innerHTML = ITEM_ICONS[slot.item];
      box.append(icon);
    }
    row.append(box);
  });
  return row;
}

/** The Supply Depot: consumables for the five slots (§6). */
export function supplyDepot({ state, events, note }: ShopContext): ShopContent {
  const full = freeSlot(state.slots) < 0;
  const body = document.createElement('div');
  body.className = 'supply-slots';
  const label = document.createElement('span');
  label.textContent = t('supply.slots');
  body.append(label, slotRow(state));
  return {
    line: t('supply.greeting'),
    body,
    note: note.text || (full ? t('supply.full') : ''),
    layout: 'grid',
    actions: ITEM_IDS.map((item) => ({
      label: itemName(item),
      icon: ITEM_ICONS[item],
      sub: t(`${ITEMS[item].key}.effect` as TextKey),
      detail: money(ITEMS[item].price),
      disabled: full || state.cash < ITEMS[item].price,
      run: () => {
        const slot = freeSlot(state.slots);
        if (buyItem(state, item, events)) {
          note.text = t('supply.bought', { item: itemName(item), slot: slot + 1 });
        }
      },
    })),
  };
}
