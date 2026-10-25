import { BALANCE, BALANCE_TARGETS } from '../../src/data/balance';
import type { TargetCheck } from '../economy/report';
import type { Playthrough } from './run';

/**
 * The §6 targets of the whole game, checked against games the bot played (F6): it finishes every
 * one, a player taking `playerSlowdown` times as long reaches the finale in 3 to 4 hours, and no
 * stretch of trips goes by without an upgrade to buy at the end of it.
 */
export function checkPlaytest(results: readonly Playthrough[]): TargetCheck[] {
  const finished = results.filter((result) => result.finished);
  const [earliest, latest] = BALANCE_TARGETS.finaleMinutes;
  const botMinutes = finished.reduce((sum, result) => sum + result.minutes, 0) / finished.length;
  const playerMinutes = botMinutes * BALANCE.playerSlowdown;
  const dry = Math.max(0, ...results.map((result) => result.maxDryTrips));
  const most = BALANCE_TARGETS.maxTripsPerPurchase;
  return [
    {
      name: 'every game finished',
      ok: results.length > 0 && finished.length === results.length,
      detail: `${finished.length} of ${results.length}`,
    },
    {
      name: `finale after ${earliest / 60}–${latest / 60} h for a player (bot × ${BALANCE.playerSlowdown})`,
      ok: finished.length > 0 && playerMinutes >= earliest && playerMinutes <= latest,
      detail: finished.length
        ? `${playerMinutes.toFixed(0)} min (bot ${botMinutes.toFixed(1)})`
        : 'never',
    },
    {
      name: `at most ${most} trips before the next upgrade`,
      ok: dry <= most,
      detail: `${dry} at most`,
    },
  ];
}
