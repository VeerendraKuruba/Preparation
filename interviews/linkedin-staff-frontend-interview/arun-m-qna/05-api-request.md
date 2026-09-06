# Q31–Q36 — API Request Patterns

> Highest LinkedIn phone-screen overlap: debounce, throttle, memoize, retry, concurrency.

**Repo:** [01-debounce-throttle.js](../../../javascript-machine-coding/01-debounce-throttle.js) · [05-retry-api.js](../../../javascript-machine-coding/05-retry-api.js) · [practice/memoize.js](../practice/memoize.js) · [11-map-limit.js](../../../javascript-machine-coding/11-map-limit.js)

---

## Q31. Auto-retry on failure ★ P0

```javascript
async function retry(fn, { retries = 3, delayMs = 300, factor = 2 } = {}) {
  let attempt = 0;
  let wait = delayMs;
  while (true) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (attempt >= retries) throw err;
      await new Promise((r) => setTimeout(r, wait));
      wait *= factor;
      attempt++;
    }
  }
}

// Usage
await retry(() => fetch("/api").then((r) => {
  if (!r.ok) throw new Error(r.status);
  return r.json();
}), { retries: 3 });
```

**Follow-ups:** Retry only on 5xx/network (not 4xx). Jitter. AbortController cancel. Idempotent methods only.

---

## Q32. Throttle API calls by batching (mapLimit) ★ P0

**Ask:** Run at most `limit` async tasks concurrently.

```javascript
async function mapLimit(items, limit, iteratorFn) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await iteratorFn(items[i], i);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
```

**Talking point:** LinkedIn feed / notifications — don't fire 100 parallel fetches.

---

## Q33. Debounce with `cancel` ★ P0

```javascript
function debounce(fn, wait) {
  let timer;
  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  }
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  debounced.flush = (...args) => {
    debounced.cancel();
    fn.apply(this, args);
  };
  return debounced;
}
```

**Use:** Search autocomplete — wait until typing pauses.

**Follow-up:** Leading vs trailing edge.

---

## Q34. Throttle with `cancel` ★ P0

```javascript
function throttle(fn, wait) {
  let last = 0;
  let timer;
  let lastArgs;
  let lastThis;

  function invoke() {
    last = Date.now();
    timer = undefined;
    fn.apply(lastThis, lastArgs);
  }

  function throttled(...args) {
    lastArgs = args;
    lastThis = this;
    const remaining = wait - (Date.now() - last);
    if (remaining <= 0 || remaining > wait) {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      invoke();
    } else if (!timer) {
      timer = setTimeout(invoke, remaining);
    }
  }

  throttled.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    last = 0;
  };
  return throttled;
}
```

**Use:** Scroll / resize handlers. Infinite scroll boundary checks.

---

## Q35. Memoize / cache identical API requests ★ P0

**Ask:** Concurrent identical in-flight requests share one Promise (dedupe).

```javascript
function memoizeAsync(fn, keyFn = JSON.stringify) {
  const cache = new Map();

  return function (...args) {
    const key = keyFn(args);
    if (cache.has(key)) return cache.get(key);

    const promise = Promise.resolve()
      .then(() => fn.apply(this, args))
      .catch((err) => {
        cache.delete(key); // allow retry after failure
        throw err;
      });

    cache.set(key, promise);
    return promise;
  };
}
```

**Why cache the Promise?** Two parallel `fetchUser(1)` calls → one network request.

**Follow-ups:** TTL eviction, LRU max size — see [practice/memoize.js](../practice/memoize.js).

---

## Q36. Memoize (sync / Lodash style) ★ P0

```javascript
function memoize(fn, resolver) {
  const cache = new Map();
  function memoized(...args) {
    const key = resolver ? resolver(...args) : args[0];
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  }
  memoized.cache = cache;
  return memoized;
}
```

**LinkedIn reported:** Memoize I + II on Senior FE screens — expect multi-arg keys + maxSize.

---

## Comparison: debounce vs throttle vs memoize

| Utility | When it runs | Typical UI |
|---------|--------------|------------|
| Debounce | After quiet period | Search box |
| Throttle | At most once per window | Scroll listener |
| Memoize | Cache by args | Expensive pure fn / API dedupe |

**Testing aloud (debounce):**
1. Call 5 times in 100ms with wait=200 → fn runs once with last args
2. `cancel()` before wait ends → never runs
3. Preserve `this`
