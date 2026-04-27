/**
 * TTL-based localStorage wrapper
 * Stores: { value, expiresAt } under a namespaced key
 * Expired items are lazily removed on get, and proactively flushed via cleanup
 *
 * Data shape in localStorage (one key per cache entry):
 *   localStorage['app:session'] → '{"value":{...},"expiresAt":1700007200000}'
 *   localStorage['app:theme']  → '{"value":"dark","expiresAt":null}'
 */

// Level 0 — factory: call once to get a namespaced API for localStorage
//   createTTLCache() → { set, get, delete, has, clear, flush, startCleanup, stopCleanup }
//   createTTLCache({ prefix: 'app:', cleanupIntervalMs: 5000 })  // 5s periodic flush
const createTTLCache = (options = {}) => {
  //   createTTLCache()  —  options is {}  →  prefix 'ttl:' , cleanup off (0)
  const prefix = options.prefix ?? 'ttl:';
  const cleanupIntervalMs = options.cleanupIntervalMs ?? 0;

  // Level 1 — key: user key → localStorage key (avoids collisions between caches)
  //   prefix 'app:'  +  'session'  →  'app:session'
  const toKey = (key) => `${prefix}${key}`;

  // Level 1 — wire format: one JSON string per item (what setItem / getItem see)
  //   serialize({ userId: 1 }, 2000)  →  '{"value":{"userId":1},"expiresAt":<now+2000>}'
  //   serialize('dark', 0)           →  '{"value":"dark","expiresAt":null}'  (no TTL)
  const serialize = (value, ttlMs) => JSON.stringify({
    value,
    expiresAt: ttlMs > 0 ? Date.now() + ttlMs : null, // null = no expiry
  });

  //   deserialize('{"value":"x","expiresAt":null}')  →  { value: 'x', expiresAt: null }
  //   deserialize('not json')  →  null
  const deserialize = (raw) => {
    try { return JSON.parse(raw); } catch { return null; }
  };

  //   isExpired({ expiresAt: null })              →  false  (never expires)
  //   isExpired({ expiresAt: past })              →  true
  //   isExpired({ expiresAt: future })            →  false
  const isExpired = (entry) => entry.expiresAt !== null && Date.now() > entry.expiresAt;

  // --- Level 2 — public API (values in/out, not the raw localStorage string) ---

  //   set('theme', 'dark')              →  stores under toKey('theme'); returns undefined
  const set = (key, value, ttlMs = 0) => {
    localStorage.setItem(toKey(key), serialize(value, ttlMs));
  };

  //   get('theme')     →  'dark'  |  null (missing, corrupt, or expired)
  //   (if expired, key is removed and get returns null)
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

  //   has('k')  →  true  if get('k') would return a value; else false
  const has = (key) => get(key) !== null;

  // Removes only keys in this namespace (key starts with prefix)
  //   clear()  →  all 'app:…' keys removed; other localStorage keys untouched
  const clear = () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
  };

  // Proactively evict expired keys in this namespace (get also deletes lazily)
  //   flush()  →  undefined; localStorage has no expired 'app:…' entries left
  const flush = () => {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => {
        const entry = deserialize(localStorage.getItem(k));
        if (entry && isExpired(entry)) localStorage.removeItem(k);
      });
  };

  // Optional periodic flush; pair with stopCleanup() when done
  let intervalId = null;

  //   startCleanup(5000)  →  setInterval(flush, 5000); returns undefined; second call is no-op
  const startCleanup = (intervalMs = cleanupIntervalMs) => {
    if (intervalId !== null) return; // already running
    intervalId = setInterval(flush, intervalMs);
  };

  //   stopCleanup()  →  clears the interval; returns undefined
  const stopCleanup = () => {
    clearInterval(intervalId);
    intervalId = null;
  };

  // Level 0: auto-start background flush if a positive interval was set in options
  if (cleanupIntervalMs > 0) startCleanup();

  // Sample:  { set: f, get: f, delete: f, has: f, clear: f, flush: f, startCleanup: f, stopCleanup: f }
  return { set, get, delete: del, has, clear, flush, startCleanup, stopCleanup };
};


// ─── Demo: sample console output (run in browser with DevTools open) ─────────
//
//   has session: true
//   get session: { userId: 42, role: 'admin' }
//   get theme: dark
//   (after ~2.1s)
//   after 2s — get session: null
//   after 2s — has theme: true
//   (after ~3s: flush + stopCleanup run; no extra log by default)
//

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
