type Handler = (...args: any[]) => void;

type EventMap = Record<string, Handler[]>;

/** Minimal Node-style EventEmitter for browser interviews. */

export class EventEmitter {
  private events: EventMap = Object.create(null);

  on(event: string, handler: Handler): () => void {
    (this.events[event] ??= []).push(handler);
    return () => this.off(event, handler);
  }

  once(event: string, handler: Handler): () => void {
    const wrapped: Handler = (...args) => {
      this.off(event, wrapped);
      handler(...args);
    };
    return this.on(event, wrapped);
  }

  off(event: string, handler?: Handler): void {
    if (!handler) {
      delete this.events[event];
      return;
    }
    const list = this.events[event];
    if (!list) return;
    this.events[event] = list.filter((h) => h !== handler);
    if (this.events[event]?.length === 0) delete this.events[event];
  }

  emit(event: string, ...args: any[]): boolean {
    const list = this.events[event];
    if (!list?.length) return false;
    for (const h of list.slice()) h(...args);
    return true;
  }

  listenerCount(event: string): number {
    return this.events[event]?.length ?? 0;
  }

  removeAllListeners(event?: string): void {
    if (event == null) this.events = Object.create(null);
    else delete this.events[event];
  }
}
