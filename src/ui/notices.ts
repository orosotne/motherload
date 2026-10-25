import type { EventBus } from '../core/events';
import { ITEMS } from '../data/items';
import { mineralById } from '../data/minerals';
import { ZONES } from '../data/zones';
import { money, t, type TextKey } from '../i18n';
import { rowDepth } from '../sim/buildings';
import type { GameEvents } from '../sim/events';
import type { Toasts } from './toasts';

function itemName(item: keyof typeof ITEMS): string {
  return t(ITEMS[item].key as TextKey);
}

/** Turns game events into short messages for the player. */
export function showNotices(events: EventBus<GameEvents>, toasts: Toasts): void {
  events.on('MineralCollected', ({ mineral, value }) => {
    const config = mineralById(mineral);
    const name = config ? t(config.key as TextKey) : '';
    toasts.show(`+${money(value)}  ${name}`, 'good', 1600);
  });
  events.on('CargoFull', () => toasts.show(t('toast.cargoFull'), 'warn'));
  events.on('FuelAlert', ({ level }) =>
    toasts.show(
      t(level === 1 ? 'toast.fuelLow' : 'toast.fuelCritical'),
      level === 1 ? 'warn' : 'bad',
    ),
  );
  events.on('Damaged', ({ amount, source }) => {
    // Lava and heat hurt a point at a time: their own warnings say it once.
    if (source === 'fall') toasts.show(t('toast.damage', { amount }), 'bad', 1400);
    if (source === 'gas') toasts.show(t('toast.explosion', { amount }), 'bad', 1800);
  });
  events.on('RescueStarted', () => toasts.show(t('toast.outOfFuel'), 'bad', 3000));
  events.on('Rescued', ({ fee, lostUnits }) =>
    toasts.show(t('toast.rescued', { fee: money(fee), units: lostUnits }), 'warn', 4000),
  );
  events.on('Destroyed', () => toasts.show(t('toast.destroyed'), 'bad', 2500));
  events.on('Respawned', ({ fee }) =>
    toasts.show(t('toast.respawned', { fee: money(fee) }), 'warn', 4000),
  );
  events.on('ZoneEntered', ({ zone, first }) => {
    // Announce each zone the first time it is reached, not on every crossing.
    const key = ZONES[zone - 1]?.key;
    if (first && key) toasts.show(t(key as TextKey), 'info', 3200);
  });
  events.on('RelicFound', ({ index, bonus }) => {
    const name = t(`relic.${index + 1}` as TextKey);
    toasts.show(t('toast.relic', { name, bonus: money(bonus) }), 'good', 4500);
  });
  events.on('GasHiss', () => toasts.show(t('toast.gasHiss'), 'warn', 1000));
  events.on('DrillAborted', () => toasts.show(t('toast.aborted'), 'info', 1600));
  events.on('LavaContact', () => toasts.show(t('toast.lava'), 'bad', 2000));
  events.on('Overheat', ({ level }) =>
    toasts.show(
      t(level === 1 ? 'toast.heatWarn' : 'toast.heatCritical'),
      level === 1 ? 'warn' : 'bad',
      3000,
    ),
  );
  events.on('ItemUsed', ({ item, auto }) => {
    if (auto) toasts.show(t('toast.itemAuto', { item: itemName(item) }), 'good', 3000);
    else if (item === 'fuelCell' || item === 'repairKit') {
      toasts.show(t('toast.itemUsed', { item: itemName(item) }), 'good');
    }
  });
  events.on('ItemRefused', ({ reason }) =>
    toasts.show(t(`toast.refused.${reason}` as TextKey), 'warn', 1800),
  );
  events.on('AnchorSet', ({ row }) =>
    toasts.show(
      t('toast.anchorSet', { depth: t('unit.meters', { value: rowDepth(row) }) }),
      'good',
    ),
  );
  events.on('Teleported', ({ cause }) =>
    toasts.show(t(cause === 'beacon' ? 'toast.beacon' : 'toast.anchorRide'), 'good'),
  );
}
