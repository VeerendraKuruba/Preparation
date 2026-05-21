/**
 * LFU Cache Implementation using Map
 * Evicts least frequently used; within same frequency, evicts least recently used (Map order).
 * Function-based implementation using closures
 */
function createLFUCache(capacity) {
  const keyToNode = new Map();   // key -> { key, value, freq }
  const freqToMap = new Map();   // freq -> Map(key -> node), Map order = LRU (first = evict)
  let minFreq = 0;

  function getFreqMap(freq) {
    if (!freqToMap.has(freq)) {
      freqToMap.set(freq, new Map());
    }
    return freqToMap.get(freq);
  }

  function promote(node) {
    const oldFreq = node.freq;
    const map = getFreqMap(oldFreq);
    map.delete(node.key);

    if (oldFreq === minFreq && map.size === 0) {
      minFreq = oldFreq + 1;
    }

    node.freq++;
    getFreqMap(node.freq).set(node.key, node);
  }

  function evictOne() {
    const map = getFreqMap(minFreq);
    const lruKey = map.keys().next().value;
    map.delete(lruKey);
    keyToNode.delete(lruKey);
  }

  /**
   * Get value by key
   * Time Complexity: O(1)
   */
  const get = (key) => {
    if (capacity === 0) return -1;

    const node = keyToNode.get(key);
    if (!node) return -1;

    promote(node);
    return node.value;
  };

  /**
   * Put key-value pair
   * Time Complexity: O(1)
   */
  const put = (key, value) => {
    if (capacity === 0) return;

    const existing = keyToNode.get(key);
    if (existing) {
      existing.value = value;
      promote(existing);
      return;
    }

    if (keyToNode.size >= capacity) {
      evictOne();
    }

    const node = { key, value, freq: 1 };
    keyToNode.set(key, node);
    getFreqMap(1).set(key, node);
    minFreq = 1;
  };

  /**
   * Check if key exists
   */
  const has = (key) => {
    return keyToNode.has(key);
  };

  /**
   * Get current size
   */
  const size = () => {
    return keyToNode.size;
  };

  /**
   * Clear all entries
   */
  const clear = () => {
    keyToNode.clear();
    freqToMap.clear();
    minFreq = 0;
  };

  /**
   * Get all keys in order (most frequent to least frequent, then most recent first within same freq)
   */
  const keys = () => {
    const freqs = Array.from(freqToMap.keys()).sort((a, b) => b - a);
    const result = [];
    for (const f of freqs) {
      const map = freqToMap.get(f);
      result.push(...Array.from(map.keys()).reverse());
    }
    return result;
  };

  /**
   * Get all entries in order
   */
  const entries = () => {
    return keys().map((key) => {
      const node = keyToNode.get(key);
      return [key, node.value];
    });
  };

  // Return public API
  return {
    get,
    put,
    has,
    size,
    clear,
    keys,
    entries
  };
}

/**
 * LFU Cache Implementation using Array and Map
 * Alternative implementation using arrays for frequency tracking
 * Function-based implementation using closures
 */
function createLFUCacheArray(capacity) {
  const cache = new Map();   // key -> { value, freq }

  /**
   * Get value by key
   * Time Complexity: O(1)
   */
  const get = (key) => {
    if (!cache.has(key)) return -1;
    const entry = cache.get(key);
    entry.freq++;
    return entry.value;
  };

  /**
   * Put key-value pair
   * Time Complexity: O(n) - eviction scans to find LFU
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
      let minKey = null;
      let minF = Infinity;
      for (const [k, v] of cache) {
        if (v.freq < minF) {
          minF = v.freq;
          minKey = k;
        }
      }
      if (minKey !== null) cache.delete(minKey);
    }

    cache.set(key, { value, freq: 1 });
  };

  const has = (key) => cache.has(key);
  const size = () => cache.size;
  const clear = () => cache.clear();

  /**
   * Get all keys (most frequent to least)
   */
  const keys = () => {
    return Array.from(cache.entries())
      .sort((a, b) => b[1].freq - a[1].freq)
      .map(([k]) => k);
  };

  const entries = () => keys().map((key) => [key, cache.get(key).value]);

  return {
    get,
    put,
    has,
    size,
    clear,
    keys,
    entries
  };
}

// Export all implementations
export { createLFUCache, createLFUCacheArray };

// Example usage:
/*
// Using Map-based implementation (recommended) - O(1) get/put
const cache = createLFUCache(2);

cache.put(1, 1);
cache.put(2, 2);
console.log(cache.get(1));    // 1 (freq: 2 for 1, 1 for 2)
cache.put(3, 3);              // Evicts 2 (lower freq)
console.log(cache.get(2));    // -1
console.log(cache.get(3));    // 3
cache.put(4, 4);              // Evicts 1 (freq 2 vs 1, but 1 is LRU in same bucket or 1 has same freq as 3 - evicts 1)
console.log(cache.get(1));    // -1
console.log(cache.get(3));    // 3
console.log(cache.get(4));    // 4

// Using Array-based implementation
const cacheArray = createLFUCacheArray(3);
cacheArray.put('a', 1);
cacheArray.put('b', 2);
cacheArray.put('c', 3);
console.log(cacheArray.get('a')); // 1
cacheArray.put('d', 4);           // Evicts 'b' or 'c' (lowest freq)
*/
