import { describe, expect, it } from 'vitest';
import { GamepadReader } from '../src/core/gamepad';

/** A standard-mapping pad whose buttons and stick the test sets. */
function fakePad() {
  const pad = {
    mapping: 'standard',
    buttons: Array.from({ length: 17 }, () => ({ pressed: false })),
    axes: [0, 0, 0, 0],
  };
  const reader = new GamepadReader(() => [null, pad]);
  const press = (...indices: number[]): void => {
    pad.buttons.forEach((button, index) => (button.pressed = indices.includes(index)));
  };
  return { pad, reader, press };
}

describe('gamepad (§5, standard mapping)', () => {
  it('maps A to flying, X to use, Y to enter, L and R to the slots, Start to pause', () => {
    const { reader, press } = fakePad();
    press(0, 2, 3, 4, 5, 9);
    const poll = reader.poll();
    expect([...poll.held].sort()).toEqual(['enter', 'pause', 'slotNext', 'slotPrev', 'up', 'use']);
    expect(poll.pressed.has('up')).toBe(true);
  });

  it('counts a press once, while the button stays held', () => {
    const { reader, press } = fakePad();
    press(2);
    expect(reader.poll().pressed.has('use')).toBe(true);
    const again = reader.poll();
    expect(again.held.has('use')).toBe(true);
    expect(again.pressed.has('use')).toBe(false);
  });

  it('drives and drills with the left stick past the dead zone, and with the D-pad', () => {
    const { pad, reader, press } = fakePad();
    pad.axes[0] = -0.3;
    expect(reader.poll().held.has('left')).toBe(false);
    pad.axes[0] = -0.9;
    pad.axes[1] = 0.8;
    const stick = reader.poll();
    expect([...stick.held].sort()).toEqual(['down', 'left']);
    pad.axes[0] = 0;
    pad.axes[1] = 0;
    press(15);
    expect(reader.poll().held.has('right')).toBe(true);
  });

  it('gives menus the D-pad, A to choose and B to go back', () => {
    const { reader, press } = fakePad();
    press(13, 0);
    expect([...reader.poll().menu].sort()).toEqual(['confirm', 'down']);
    press(1);
    expect([...reader.poll().menu]).toEqual(['back']);
  });

  it('ignores pads without the standard mapping', () => {
    const reader = new GamepadReader(() => [
      { mapping: '', buttons: [{ pressed: true }], axes: [] },
    ]);
    expect(reader.poll().held.size).toBe(0);
    expect(reader.connected).toBe(false);
  });
});
