import { describe, expect, it } from 'vitest';
import { Input } from '../src/core/input';

function key(type: 'keydown' | 'keyup', code: string, repeat = false): Event {
  return Object.assign(new Event(type, { cancelable: true }), { code, repeat });
}

function setup(): { source: EventTarget; input: Input } {
  const source = new EventTarget();
  return { source, input: new Input(source) };
}

describe('Input', () => {
  it('holds an action while its key is down', () => {
    const { source, input } = setup();
    source.dispatchEvent(key('keydown', 'KeyA'));
    expect(input.sample().held.left).toBe(true);
    expect(input.sample().held.left).toBe(true);

    source.dispatchEvent(key('keyup', 'KeyA'));
    expect(input.sample().held.left).toBe(false);
  });

  it('reports a press once, on the first tick after it', () => {
    const { source, input } = setup();
    source.dispatchEvent(key('keydown', 'ArrowDown'));
    expect(input.sample().pressed.down).toBe(true);
    expect(input.sample().pressed.down).toBe(false);
  });

  it('keeps a tap shorter than one tick', () => {
    const { source, input } = setup();
    source.dispatchEvent(key('keydown', 'KeyS'));
    source.dispatchEvent(key('keyup', 'KeyS'));
    const frame = input.sample();
    expect(frame.pressed.down).toBe(true);
    expect(frame.held.down).toBe(false);
  });

  it('does not treat keyboard auto-repeat as new presses', () => {
    const { source, input } = setup();
    source.dispatchEvent(key('keydown', 'KeyD'));
    input.sample();
    source.dispatchEvent(key('keydown', 'KeyD', true));
    expect(input.sample().pressed.right).toBe(false);
  });

  it('keeps an action held while any of its keys is down', () => {
    const { source, input } = setup();
    source.dispatchEvent(key('keydown', 'KeyW'));
    source.dispatchEvent(key('keydown', 'Space'));
    source.dispatchEvent(key('keyup', 'KeyW'));
    expect(input.sample().held.up).toBe(true);
  });

  it('releases every key when the window loses focus', () => {
    const { source, input } = setup();
    source.dispatchEvent(key('keydown', 'KeyA'));
    source.dispatchEvent(new Event('blur'));
    expect(input.sample().held.left).toBe(false);
  });

  it('claims mapped keys from the page and leaves the others alone', () => {
    const { source } = setup();
    const space = key('keydown', 'Space');
    const letter = key('keydown', 'KeyQ');
    source.dispatchEvent(space);
    source.dispatchEvent(letter);
    expect(space.defaultPrevented).toBe(true);
    expect(letter.defaultPrevented).toBe(false);
  });
});
