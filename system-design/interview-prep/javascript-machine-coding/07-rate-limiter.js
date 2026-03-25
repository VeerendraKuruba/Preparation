/**
 * Token bucket: refill refillPerMs tokens/ms up to capacity.
 */

export class AsyncRateLimiter {
  constructor(capacity, refillPerMs) {
    this.capacity = capacity;
    this.refillPerMs = refillPerMs;
    this.tokens = capacity;
    this.lastRefill = Date.now();
    this.pending = [];
  }

  refill() {
    const now = Date.now();
    const delta = now - this.lastRefill;
    this.lastRefill = now;
    this.tokens = Math.min(this.capacity, this.tokens + delta * this.refillPerMs);
  }

  process() {
    this.refill();
    while (this.tokens >= 1 && this.pending.length > 0) {
      this.tokens -= 1;
      this.pending.shift()();
    }
    if (this.pending.length === 0) return;
    const need = 1 - this.tokens;
    const waitMs = Math.max(1, Math.ceil(need / this.refillPerMs));
    setTimeout(() => this.process(), waitMs);
  }

  acquire() {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.pending.push(resolve);
      queueMicrotask(() => this.process());
    });
  }
}

export class SlidingWindowLimiter {
  constructor(maxCalls, windowMs) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
    this.times = [];
  }

  tryCall() {
    const now = Date.now();
    this.times = this.times.filter((t) => now - t < this.windowMs);
    if (this.times.length >= this.maxCalls) return false;
    this.times.push(now);
    return true;
  }
}
