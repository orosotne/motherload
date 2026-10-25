/** What the story remembers between sessions (GAME_SPEC §7); saved with the game. */
export interface StoryState {
  /** One-time radio messages already played, by id. */
  seen: string[];
  /** Bit per zone whose earthquake happened. */
  quakes: number;
  /** The Heart burns again and the pod escaped: the ending was reached. */
  finished: boolean;
}

export function createStory(): StoryState {
  return { seen: [], quakes: 0, finished: false };
}

export function hasBit(mask: number, bit: number): boolean {
  return (mask & (1 << bit)) !== 0;
}

export function withBit(mask: number, bit: number): number {
  return mask | (1 << bit);
}
