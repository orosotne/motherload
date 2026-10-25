import { describe, expect, it } from 'vitest';
import { newGameChoices, type NewGameContext, type NewGameState } from '../src/ui/titleMenu';

function panel(played: boolean): {
  state: NewGameState;
  started: number[];
  context: NewGameContext;
} {
  const started: number[] = [];
  let next = 100;
  const context: NewGameContext = {
    played,
    start: (seed) => started.push(seed),
    back: () => undefined,
    randomSeed: () => next++,
  };
  return { state: { seed: '', armed: null, random: null, missing: false }, started, context };
}

describe('a new game (F6)', () => {
  it('starts a random world at once when no game would be lost', () => {
    const { state, started, context } = panel(false);
    newGameChoices(context, state).random();
    expect(started).toEqual([100]);
  });

  it('asks before a random world wipes a game in progress, and starts the same one next', () => {
    const { state, started, context } = panel(true);
    const choose = newGameChoices(context, state);
    choose.random();
    expect(started).toEqual([]);
    expect(state.armed).toBe(100);
    choose.random();
    expect(started).toEqual([100]);
  });

  it('asks again for a typed seed after a random world was offered', () => {
    const { state, started, context } = panel(true);
    const choose = newGameChoices(context, state);
    choose.random();
    state.seed = ' 4242 ';
    choose.typed();
    expect(started).toEqual([]);
    choose.typed();
    expect(started).toEqual([4242]);
  });

  it('asks for a seed when nothing is typed', () => {
    const { state, started, context } = panel(false);
    newGameChoices(context, state).typed();
    expect(state.missing).toBe(true);
    expect(started).toEqual([]);
  });
});
