/** Receives the payload of one event type. */
export type Handler<T> = (payload: T) => void;

/**
 * Typed synchronous event bus (GAME_SPEC §9.5). The simulation emits facts such as BlockBroken or
 * MineralCollected; renderer, audio and UI subscribe. Subscribers must never change game state.
 *
 * `Events` maps each event name to its payload type, e.g. `{ ZoneEntered: { zone: number } }`.
 */
export class EventBus<Events extends object> {
  private readonly handlers: { [K in keyof Events]?: Set<Handler<Events[K]>> } = {};

  /** Subscribes to `type` and returns a function that unsubscribes. */
  on<K extends keyof Events>(type: K, handler: Handler<Events[K]>): () => void {
    const set = (this.handlers[type] ??= new Set<Handler<Events[K]>>());
    set.add(handler);
    return () => this.off(type, handler);
  }

  off<K extends keyof Events>(type: K, handler: Handler<Events[K]>): void {
    this.handlers[type]?.delete(handler);
  }

  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = this.handlers[type];
    if (!set) return;
    // Deliver to a snapshot: handlers subscribed during this emit start with the next one.
    for (const handler of [...set]) handler(payload);
  }

  /** Removes every handler, e.g. when a new game starts. */
  clear(): void {
    for (const type in this.handlers) delete this.handlers[type];
  }
}
