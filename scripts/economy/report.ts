import { BALANCE_TARGETS } from '../../src/data/balance';
import type { Timeline } from './progression';

export interface TargetCheck {
  name: string;
  ok: boolean;
  detail: string;
}

function minutes(value: number | null | undefined): string {
  return value === null || value === undefined ? 'never' : `${value.toFixed(1)} min`;
}

/** The §6 balance targets, checked against a simulated game. */
export function checkTargets(timeline: Timeline): TargetCheck[] {
  const targets = BALANCE_TARGETS;
  const first = timeline.firstUpgrade;
  const [fewest, most] = targets.firstUpgradeTrips;
  const checks: TargetCheck[] = [
    {
      name: `first upgrade after ${fewest}–${most} trips, within ${targets.firstUpgradeMinutes} min`,
      ok:
        !!first &&
        first.trips >= fewest &&
        first.trips <= most &&
        first.minutes <= targets.firstUpgradeMinutes,
      detail: first ? `${first.trips} trips, ${minutes(first.minutes)}` : 'never',
    },
  ];
  for (const [zone, limit] of Object.entries(targets.zoneMinutes)) {
    const reached = timeline.zoneMinutes[Number(zone)];
    checks.push({
      name: `zone ${zone} within ${limit} min`,
      ok: reached !== undefined && reached <= limit,
      detail: minutes(reached),
    });
  }
  const [earliest, latest] = targets.finaleMinutes;
  checks.push({
    name: `finale after ${earliest / 60}–${latest / 60} h`,
    ok:
      timeline.finaleMinutes !== null &&
      timeline.finaleMinutes >= earliest &&
      timeline.finaleMinutes <= latest,
    detail: minutes(timeline.finaleMinutes),
  });
  checks.push({
    name: `at most ${targets.maxTripsPerPurchase} trips before the next purchase`,
    ok: timeline.maxTripsPerPurchase <= targets.maxTripsPerPurchase,
    detail: `${timeline.maxTripsPerPurchase} at most`,
  });
  return checks;
}
