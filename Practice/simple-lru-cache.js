/**
 * Simple LRU Cache Implementation using Functions
 * 
 * LRU (Least Recently Used) Cache evicts the least recently used item
 * when the cache reaches its capacity limit.
 */

function createLRUCache(capacity) {
  // Map maintains insertion order - perfect for LRU cache
  const cache = new Map();

  /**
   * Get a value by key
   * @param {*} key - The key to look up
   * @returns {*} The value if found, -1 if not found
   */
  function get(key) {
    if (!cache.has(key)) {
      return -1;
    }

    // Move to end (most recently used)
    const value = cache.get(key);
    cache.delete(key);
    cache.set(key, value);
    
    return value;
  }

  /**
   * Put a key-value pair into the cache
   * @param {*} key - The key
   * @param {*} value - The value to store
   */
  function put(key, value) {
    if (cache.has(key)) {
      // Update existing key - move to end
      cache.delete(key);
    } else if (cache.size >= capacity) {
      // Remove least recently used (first item in Map)
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    // Add/update at end (most recently used)
    cache.set(key, value);
  }

  /**
   * Check if key exists in cache
   * @param {*} key - The key to check
   * @returns {boolean} True if key exists, false otherwise
   */
  function has(key) {
    return cache.has(key);
  }

  /**
   * Get the current size of the cache
   * @returns {number} Number of items in cache
   */
  function size() {
    return cache.size;
  }

  /**
   * Clear all entries from the cache
   */
  function clear() {
    cache.clear();
  }

  // Return public API
  return {
    get,
    put,
    has,
    size,
    clear
  };
}

// Example usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = createLRUCache;
}

// Example:
/*
const cache = createLRUCache(3);

cache.put(1, 'one');
cache.put(2, 'two');
cache.put(3, 'three');
console.log(cache.get(1)); // 'one' - moves 1 to most recent

cache.put(4, 'four'); // Removes 2 (least recently used)
console.log(cache.get(2)); // -1 (not found, was evicted)
console.log(cache.get(3)); // 'three'
console.log(cache.get(4)); // 'four'
console.log(cache.get(1)); // 'one'
console.log(cache.size()); // 3
*/

