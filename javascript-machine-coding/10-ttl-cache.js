/**
 * TTL-based localStorage wrapper
 * Stores: { value, expiresAt } under a namespaced key
 * Expired items are lazily removed on get, and proactively flushed via cleanup
 */

const createTTLCache = ({ prefix = 'ttl:', cleanupIntervalMs = 0 } = {}) => {
  const toKey = (key) => `${prefix}${key}`;
  const fromKey = (rawKey) => rawKey.slice(prefix.length);

  const serialize = (value, ttlMs) => JSON.stringify({
    value,
    expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null, // null = no expiry
  });

  const deserialize = (raw) => {
    try { return JSON.parse(raw); } catch { return null; }
  };

  const isExpired = (entry) => entry.expiresAt !== null && Date.now() > entry.expiresAt;

  // --- core methods ---

  const set = (key, value, ttlMs = 0) => {
    localStorage.setItem(toKey(key), serialize(value, ttlMs));
  };

  const get = (key) => {
    const raw = localStorage.getItem(toKey(key));
    if (raw === null) return null;

    const entry = deserialize(raw);
    if (!entry) return null;

    if (isExpired(entry)) {
      localStorage.removeItem(toKey(key));
      return null;
    }

    return entry.value;
  };

  const del = (key) => localStorage.removeItem(toKey(key));

  const has = (key) => get(key) !== null;

  // Removes only keys owned by this cache instance
  const clear = () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
  };

  // Proactively evict all expired keys in this namespace
  const flush = () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => {
        const entry = deserialize(localStorage.getItem(k));
        if (entry && isExpired(entry)) localStorage.removeItem(k);
      });
  };

  // Optional periodic cleanup — returns a stop function
  let intervalId = null;

  const startCleanup = (intervalMs = cleanupIntervalMs) => {
    if (intervalId !== null) return; // already running
    intervalId = setInterval(flush, intervalMs);
  };

  const stopCleanup = () => {
    clearInterval(intervalId);
    intervalId = null;
  };

  if (cleanupIntervalMs > 0) startCleanup();

  return { set, get, delete: del, has, clear, flush, startCleanup, stopCleanup };
};


// ─── Demo ─────────────────────────────────────────────────────────────────────

const cache = createTTLCache({ prefix: 'app:', cleanupIntervalMs: 5000 });

// set with 2-second TTL
cache.set('session', { userId: 42, role: 'admin' }, 2000);
console.log('has session:', cache.has('session'));           // true
console.log('get session:', cache.get('session'));           // { userId: 42, role: 'admin' }

// set with no expiry
cache.set('theme', 'dark');
console.log('get theme:', cache.get('theme'));               // 'dark'

setTimeout(() => {
  console.log('after 2s — get session:', cache.get('session')); // null (expired + deleted)
  console.log('after 2s — has theme:',   cache.has('theme'));   // true  (no expiry)
}, 2100);

// Manual flush (removes expired without waiting for interval)
setTimeout(() => {
  cache.flush();
  cache.stopCleanup(); // clean up the interval when done
}, 3000);
