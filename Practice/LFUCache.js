/**
 * ========== LFU CACHE — INTERVIEW Q&A ==========
 *
 * Q: What is LFU?
 * A: Least Frequently Used — evict the item used the LEAST number of times (lowest access count).
 *
 * Q: What if two keys have the same frequency?
 * A: Evict any one of them (or the first we find). For strict LRU tie-break we’d need extra bookkeeping.
 *
 * Q: Simple approach?
 * A: One Map: key -> { value, freq }. get: O(1). put: O(1) except when full, then O(n) to find a key with min freq and evict it.
 *
 * Q: Time & space?
 * A: get O(1), put O(n) when eviction happens (n = capacity). Space O(capacity).
 */

// -----------------------------------------------------------------------------
// SIMPLE LFU CACHE — single Map, evict by scanning for minimum frequency
// -----------------------------------------------------------------------------

/**
 * Creates an LFU cache with the given capacity.
 * @param {number} capacity — max number of entries
 * @returns {{ get: (key: number) => number, put: (key: number, value: number) => void }}
 */
function createLFUCache(capacity) {
  // Map: key -> { value, freq } — one structure for lookup and frequency
  const cache = new Map();

  /**
   * get(key): return value if present and increment its frequency; else return -1.
   */
  const get = (key) => {
    if (!cache.has(key)) return -1;
    const entry = cache.get(key);
    entry.freq++;
    return entry.value;
  };

  /**
   * put(key, value): update if key exists (and bump freq); else add new entry.
   * If at capacity, evict one key with the smallest frequency (scan once).
   */
  const put = (key, value) => {
    if (capacity === 0) return;

    if (cache.has(key)) {
      const entry = cache.get(key);
      entry.value = value;
      entry.freq++;
      return;
    }

    if (cache.size >= capacity) {
      // O(n): find a key with minimum frequency
      let minKey = null;
      let minFreq = Infinity;
      for (const [k, v] of cache) {
        if (v.freq < minFreq) {
          minFreq = v.freq;
          minKey = k;
        }
      }
      cache.delete(minKey);
    }

    cache.set(key, { value, freq: 1 });
  };

  return { get, put };
}

// -----------------------------------------------------------------------------
// USAGE (same behavior as LeetCode LFU Cache)
// -----------------------------------------------------------------------------
/*
const cache = createLFUCache(2);
cache.put(1, 1);
cache.put(2, 2);
console.log(cache.get(1));   // 1
cache.put(3, 3);              // evicts 2 (lower freq)
console.log(cache.get(2));    // -1
console.log(cache.get(3));    // 3
*/
