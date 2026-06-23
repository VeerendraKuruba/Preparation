/** Token-bucket rate limiter — N requests per interval (default 1s). */

export function createRateLimiter(limit, interval = 1000) {
  const queue = [];
  let tokens = limit;

  function drain() {
    while (tokens > 0 && queue.length) {
      tokens--;
      queue.shift()();
    }
  }

  setInterval(() => {
    tokens = limit;
    drain();
  }, interval);

  function schedule(task) {
    return new Promise((resolve, reject) => {
      queue.push(() => {
        task().then(resolve, reject);
      });
      drain(); // run immediately if tokens are available
    });
  }

  return schedule;
}

/** Wrap a single async fn under a shared limiter. */
export function rateLimit(fn, limit, interval = 1000) {
  const schedule = createRateLimiter(limit, interval);
  return (...args) => schedule(() => fn(...args));
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const schedule = createRateLimiter(3, 1000); // 3 req/s

  const tasks = Array.from({ length: 7 }, (_, i) =>
    schedule(async () => {
      console.log(`request ${i + 1} at ${Date.now()}`);
      return i + 1;
    })
  );

  Promise.all(tasks).then((ids) => {
    console.log("done:", ids);
    process.exit(0);
  });
}
