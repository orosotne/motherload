import { describe, expect, it } from 'vitest';
import { measureBands } from '../scripts/economy/bands';
import { simulateProgression } from '../scripts/economy/progression';
import { checkTargets } from '../scripts/economy/report';
import { bestTrip } from '../scripts/economy/trip';
import { startTiers, statsFor } from '../src/sim/stats';

const bands = measureBands();

describe('economy simulation (§6, npm run sim:economy)', () => {
  it('meets the balance targets of the early game', () => {
    const checks = checkTargets(simulateProgression(bands));
    const missed = checks.filter((check) => !check.ok).map((c) => `${c.name}: ${c.detail}`);
    expect(missed).toEqual([]);
  });

  it('pays more per trip deeper down and with better equipment', () => {
    const start = statsFor(startTiers());
    const zone1 = bestTrip(bands, start, 20, 1);
    const zone2 = bestTrip(bands, start, 120, 2);
    expect(zone1?.net).toBeGreaterThan(0);
    expect(zone2?.net).toBeGreaterThan(zone1?.net ?? 0);
    const better = statsFor({ ...startTiers(), cargo: 2, tank: 2, drill: 2 });
    expect(bestTrip(bands, better, 120, 2)?.net).toBeGreaterThan(zone2?.net ?? 0);
  });

  it('keeps the start of the game out of reach of the deep zones', () => {
    const start = statsFor(startTiers());
    expect(bestTrip(bands, start, 499, 4)).toBeNull();
    expect(bestTrip(bands, start, 499, 5)).toBeNull();
  });
});
