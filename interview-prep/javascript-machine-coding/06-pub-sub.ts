type Handler<T = unknown> = (payload: T) => void;

/** Topic-based pub/sub with typed channels (string keys). */

export class PubSub {
  private subs = new Map<string, Set<Handler>>();

  subscribe<T = unknown>(topic: string, handler: Handler<T>): () => void {
    let set = this.subs.get(topic);
    if (!set) {
      set = new Set();
      this.subs.set(topic, set);
    }
    set.add(handler as Handler);
    return () => {
      const s = this.subs.get(topic);
      if (!s) return;
      s.delete(handler as Handler);
      if (s.size === 0) this.subs.delete(topic);
    };
  }

  publish<T = unknown>(topic: string, payload: T): void {
    const set = this.subs.get(topic);
    if (!set) return;
    for (const h of set) (h as Handler<T>)(payload);
  }

  clearTopic(topic: string): void {
    this.subs.delete(topic);
  }

  clear(): void {
    this.subs.clear();
  }
}
