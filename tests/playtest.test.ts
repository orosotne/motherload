import { describe, expect, it } from 'vitest';
import { checkPlaytest } from '../scripts/playtest/report';
import { playthrough } from '../scripts/playtest/run';
import { mixSeed } from '../src/core/rng';
import { BALANCE } from '../src/data/balance';

describe('playtest (F6, npm run playtest)', () => {
  it(
    'finishes whole games on the real simulation within the balance targets',
    { timeout: 120_000 },
    () => {
      const results = [1, 2, 3].map((i) => playthrough(mixSeed(2026, i), BALANCE.maxHours));
      const missed = checkPlaytest(results)
        .filter((check) => !check.ok)
        .map((check) => `${check.name}: ${check.detail}`);
      expect(missed).toEqual([]);
    },
  );
});
