/** Minimal Node-style EventEmitter for browser interviews. */

export class EventEmitter {
  constructor() {
    this.events = Object.create(null);
  }

  on(event, handler) {
    (this.events[event] ??= []).push(handler);
    return () => this.off(event, handler);
  }

  once(event, handler) {
    const wrapped = (...args) => {
      this.off(event, wrapped);
      handler(...args);
    };
    return this.on(event, wrapped);
  }

  off(event, handler) {
    if (!handler) {
      delete this.events[event];
      return;
    }
    const list = this.events[event];
    if (!list) return;
    this.events[event] = list.filter((h) => h !== handler);
    if (this.events[event]?.length === 0) delete this.events[event];
  }

  emit(event, ...args) {
    const list = this.events[event];
    if (!list?.length) return false;
    for (const h of list.slice()) h(...args);
    return true;
  }

  listenerCount(event) {
    return this.events[event]?.length ?? 0;
  }

  removeAllListeners(event) {
    if (event == null) this.events = Object.create(null);
    else delete this.events[event];
  }
}
