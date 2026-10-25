import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../src/core/events';

interface TestEvents {
  BlockBroken: { x: number; y: number };
  ZoneEntered: { zone: number };
}

describe('EventBus', () => {
  it('delivers the payload only to subscribers of that event', () => {
    const bus = new EventBus<TestEvents>();
    const broken = vi.fn();
    const zone = vi.fn();
    bus.on('BlockBroken', broken);
    bus.on('ZoneEntered', zone);

    bus.emit('BlockBroken', { x: 3, y: 7 });

    expect(broken).toHaveBeenCalledExactlyOnceWith({ x: 3, y: 7 });
    expect(zone).not.toHaveBeenCalled();
  });

  it('stops delivering after unsubscribe', () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    const unsubscribe = bus.on('ZoneEntered', handler);

    unsubscribe();
    bus.emit('ZoneEntered', { zone: 2 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('lets a handler unsubscribe itself mid-emit without skipping the others', () => {
    const bus = new EventBus<TestEvents>();
    const calls: string[] = [];
    const unsubscribeFirst = bus.on('ZoneEntered', () => {
      calls.push('first');
      unsubscribeFirst();
    });
    bus.on('ZoneEntered', () => calls.push('second'));

    bus.emit('ZoneEntered', { zone: 3 });
    bus.emit('ZoneEntered', { zone: 4 });

    expect(calls).toEqual(['first', 'second', 'second']);
  });

  it('starts handlers subscribed during an emit from the next emit', () => {
    const bus = new EventBus<TestEvents>();
    const late = vi.fn();
    bus.on('ZoneEntered', () => bus.on('ZoneEntered', late));

    bus.emit('ZoneEntered', { zone: 1 });
    expect(late).not.toHaveBeenCalled();

    bus.emit('ZoneEntered', { zone: 2 });
    expect(late).toHaveBeenCalledExactlyOnceWith({ zone: 2 });
  });

  it('ignores events nobody listens to', () => {
    const bus = new EventBus<TestEvents>();
    expect(() => bus.emit('ZoneEntered', { zone: 5 })).not.toThrow();
  });

  it('removes every handler on clear()', () => {
    const bus = new EventBus<TestEvents>();
    const broken = vi.fn();
    const zone = vi.fn();
    bus.on('BlockBroken', broken);
    bus.on('ZoneEntered', zone);

    bus.clear();
    bus.emit('BlockBroken', { x: 0, y: 0 });
    bus.emit('ZoneEntered', { zone: 1 });

    expect(broken).not.toHaveBeenCalled();
    expect(zone).not.toHaveBeenCalled();
  });

  it('rejects payloads of the wrong shape at compile time', () => {
    const bus = new EventBus<TestEvents>();
    // @ts-expect-error ZoneEntered carries { zone }, not block coordinates.
    bus.emit('ZoneEntered', { x: 1, y: 2 });
    // @ts-expect-error Unknown event names are rejected.
    bus.on('NoSuchEvent', () => undefined);
  });
});
