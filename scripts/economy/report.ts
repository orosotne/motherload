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

/**
 * The §6 targets of the early game, checked against a game played by the model. The finale and
 * the rhythm of purchases are the playtest's (scripts/playtest/report.ts): the model mines band
 * averages and runs dry once the bands it knows are used up, the bot finds the ore that is left.
 */
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
  return checks;
}
