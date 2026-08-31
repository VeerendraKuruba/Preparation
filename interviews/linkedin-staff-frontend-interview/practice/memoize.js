/**
 * LinkedIn Phone Screen — Memoize I, II, III
 * Run: node practice/memoize.js
 *
 * Reported: "Memoize I+II" on Senior FE technical screen (Frontend Interview Handbook)
 */

// ─── Memoize I — basic cache by serialized args ─────────────────────────────

function memoize(fn) {
  const cache = new Map();

  function memoized(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  }

  memoized.cache = cache;
  memoized.clear = () => cache.clear();
  return memoized;
}

// ─── Memoize II — LRU max size ──────────────────────────────────────────────

function memoizeLRU(fn, maxSize = 100) {
  const cache = new Map();

  function memoized(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      const value = cache.get(key);
      cache.delete(key);
      cache.set(key, value);
      return value;
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    if (cache.size > maxSize) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    return result;
  }

  return memoized;
}

// ─── Memoize III — TTL expiry (Staff follow-up) ─────────────────────────────

function memoizeTTL(fn, ttlMs) {
  const cache = new Map();

  function memoized(...args) {
    const key = JSON.stringify(args);
    const entry = cache.get(key);
    const now = Date.now();

    if (entry && now - entry.time < ttlMs) {
      return entry.value;
    }

    const value = fn.apply(this, args);
    cache.set(key, { value, time: now });
    return value;
  }

  memoized.purgeExpired = () => {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (now - entry.time >= ttlMs) cache.delete(key);
    }
  };

  return memoized;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

let callCount = 0;
const expensiveAdd = (a, b) => {
  callCount++;
  return a + b;
};

const memoizedAdd = memoize(expensiveAdd);
console.assert(memoizedAdd(2, 3) === 5);
console.assert(memoizedAdd(2, 3) === 5);
console.assert(callCount === 1, "cache hit should skip recompute");

// `this` binding
const obj = {
  factor: 10,
  multiply(x) {
    return x * this.factor;
  },
};
obj.multiply = memoize(obj.multiply);
console.assert(obj.multiply(5) === 50);

// LRU
callCount = 0;
const mLru = memoizeLRU(expensiveAdd, 2);
mLru(1, 1);
mLru(2, 2);
mLru(3, 3);
mLru(1, 1);
console.assert(callCount === 4, "LRU evicted (1,1), recomputed on 4th call");

// TTL
callCount = 0;
const mTtl = memoizeTTL(expensiveAdd, 50);
mTtl(1, 2);
mTtl(1, 2);
console.assert(callCount === 1);

console.log("All memoize tests passed.");

export { memoize, memoizeLRU, memoizeTTL };
