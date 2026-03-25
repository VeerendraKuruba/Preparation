/**
 * Token bucket: refill `refillPerMs` tokens per ms up to `capacity`.
 * FIFO waiters unblock as tokens become available.
 */

export class AsyncRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly pending: Array<() => void> = [];

  constructor(
    private readonly capacity: number,
    /** tokens added per millisecond */
    private readonly refillPerMs: number
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const delta = now - this.lastRefill;
    this.lastRefill = now;
    this.tokens = Math.min(this.capacity, this.tokens + delta * this.refillPerMs);
  }

  private process() {
    this.refill();
    while (this.tokens >= 1 && this.pending.length > 0) {
      this.tokens -= 1;
      this.pending.shift()!();
    }
    if (this.pending.length === 0) return;
    const need = 1 - this.tokens;
    const waitMs = Math.max(1, Math.ceil(need / this.refillPerMs));
    setTimeout(() => this.process(), waitMs);
  }

  acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.pending.push(resolve);
      queueMicrotask(() => this.process());
    });
  }
}

/** Simple “max N calls per windowMs” sliding window (client-side guard). */

export class SlidingWindowLimiter {
  private times: number[] = [];

  constructor(
    private readonly maxCalls: number,
    private readonly windowMs: number
  ) {}

  tryCall(): boolean {
    const now = Date.now();
    this.times = this.times.filter((t) => now - t < this.windowMs);
    if (this.times.length >= this.maxCalls) return false;
    this.times.push(now);
    return true;
  }
}
