/** Topic-based pub/sub (string keys). */

export class PubSub {
  constructor() {
    this.subs = new Map();
  }

  subscribe(topic, handler) {
    let set = this.subs.get(topic);
    if (!set) {
      set = new Set();
      this.subs.set(topic, set);
    }
    set.add(handler);
    return () => {
      const s = this.subs.get(topic);
      if (!s) return;
      s.delete(handler);
      if (s.size === 0) this.subs.delete(topic);
    };
  }

  publish(topic, payload) {
    const set = this.subs.get(topic);
    if (!set) return;
    for (const h of set) h(payload);
  }

  clearTopic(topic) {
    this.subs.delete(topic);
  }

  clear() {
    this.subs.clear();
  }
}
