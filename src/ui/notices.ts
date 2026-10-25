import type { EventBus } from '../core/events';
import { mineralById } from '../data/minerals';
import { ZONES } from '../data/zones';
import { money, t, type TextKey } from '../i18n';
import type { GameEvents } from '../sim/events';
import type { Toasts } from './toasts';

/** Turns game events into short messages for the player. */
export function showNotices(events: EventBus<GameEvents>, toasts: Toasts): void {
  let deepestZone = 1;

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
  events.on('Damaged', ({ amount }) => toasts.show(t('toast.damage', { amount }), 'bad', 1400));
  events.on('RescueStarted', () => toasts.show(t('toast.outOfFuel'), 'bad', 3000));
  events.on('Rescued', ({ fee, lostUnits }) =>
    toasts.show(t('toast.rescued', { fee: money(fee), units: lostUnits }), 'warn', 4000),
  );
  events.on('Destroyed', () => toasts.show(t('toast.destroyed'), 'bad', 2500));
  events.on('Respawned', ({ fee }) =>
    toasts.show(t('toast.respawned', { fee: money(fee) }), 'warn', 4000),
  );
  events.on('ZoneEntered', ({ zone }) => {
    // Announce each zone the first time it is reached, not on every crossing.
    if (zone <= deepestZone) return;
    deepestZone = zone;
    const key = ZONES[zone - 1]?.key;
    if (key) toasts.show(t(key as TextKey), 'info', 3200);
  });
}
