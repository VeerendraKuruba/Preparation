/**
 * LRU Cache Implementation using Map
 * Map maintains insertion order, making it perfect for LRU cache
 * Function-based implementation using closures
 */
function createLRUCache(capacity) {
  const cache = new Map(); // Map maintains insertion order

  /**
   * Get value by key
   * Time Complexity: O(1)
   */
  const get = (key) => {
    if (!cache.has(key)) {
      return -1; // or null/undefined based on requirements
    }

    // Move to end (most recently used)
    const value = cache.get(key);
    cache.delete(key);
    cache.set(key, value);
    
    return value;
  };

  /**
   * Put key-value pair
   * Time Complexity: O(1)
   */
  const put = (key, value) => {
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
  };

  /**
   * Check if key exists
   */
  const has = (key) => {
    return cache.has(key);
  };

  /**
   * Get current size
   */
  const size = () => {
    return cache.size;
  };

  /**
   * Clear all entries
   */
  const clear = () => {
    cache.clear();
  };

  /**
   * Get all keys in order (most recent to least recent)
   */
  const keys = () => {
    return Array.from(cache.keys()).reverse();
  };

  /**
   * Get all entries in order
   */
  const entries = () => {
    return Array.from(cache.entries()).reverse();
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
 * LRU Cache Implementation using Array and Map
 * Alternative implementation using arrays for order tracking
 * Function-based implementation using closures
 */
function createLRUCacheArray(capacity) {
  const cache = new Map(); // Store key-value pairs
  let order = []; // Array to track access order

  /**
   * Get value by key
   * Time Complexity: O(n) - due to array operations
   */
  const get = (key) => {
    if (!cache.has(key)) {
      return -1;
    }

    // Move to end of order array (most recently used)
    const index = order.indexOf(key);
    if (index > -1) {
      order.splice(index, 1);
    }
    order.push(key);

    return cache.get(key);
  };

  /**
   * Put key-value pair
   * Time Complexity: O(n) - due to array operations
   */
  const put = (key, value) => {
    if (cache.has(key)) {
      // Update existing key
      cache.set(key, value);
      // Move to end
      const index = order.indexOf(key);
      if (index > -1) {
        order.splice(index, 1);
      }
      order.push(key);
    } else {
      if (cache.size >= capacity) {
        // Remove least recently used (first item in order array)
        const lruKey = order.shift();
        cache.delete(lruKey);
      }
      cache.set(key, value);
      order.push(key);
    }
  };

  /**
   * Check if key exists
   */
  const has = (key) => {
    return cache.has(key);
  };

  /**
   * Get current size
   */
  const size = () => {
    return cache.size;
  };

  /**
   * Clear all entries
   */
  const clear = () => {
    cache.clear();
    order = [];
  };

  /**
   * Get all keys in order (most recent to least recent)
   */
  const keys = () => {
    return [...order].reverse();
  };

  // Return public API
  return {
    get,
    put,
    has,
    size,
    clear,
    keys
  };
}

/**
 * LRU Cache Implementation using only Arrays
 * Pure array-based implementation (less efficient but demonstrates array usage)
 * Function-based implementation using closures
 */
function createLRUCachePureArray(capacity) {
  let items = []; // Array of {key, value} objects

  /**
   * Get value by key
   * Time Complexity: O(n)
   */
  const get = (key) => {
    const index = items.findIndex(item => item.key === key);
    if (index === -1) {
      return -1;
    }

    // Move to end (most recently used)
    const item = items.splice(index, 1)[0];
    items.push(item);

    return item.value;
  };

  /**
   * Put key-value pair
   * Time Complexity: O(n)
   */
  const put = (key, value) => {
    const index = items.findIndex(item => item.key === key);
    
    if (index !== -1) {
      // Update existing key - move to end
      items.splice(index, 1);
    } else if (items.length >= capacity) {
      // Remove least recently used (first item)
      items.shift();
    }

    // Add/update at end (most recently used)
    items.push({ key, value });
  };

  /**
   * Check if key exists
   */
  const has = (key) => {
    return items.some(item => item.key === key);
  };

  /**
   * Get current size
   */
  const size = () => {
    return items.length;
  };

  /**
   * Clear all entries
   */
  const clear = () => {
    items = [];
  };

  /**
   * Get all keys in order (most recent to least recent)
   */
  const keys = () => {
    return items.map(item => item.key).reverse();
  };

  // Return public API
  return {
    get,
    put,
    has,
    size,
    clear,
    keys
  };
}

// Export all implementations
export { createLRUCache, createLRUCacheArray, createLRUCachePureArray };

// Example usage:
/*
// Using Map-based implementation (recommended)
const cache = createLRUCache(3);

cache.put(1, 'one');
cache.put(2, 'two');
cache.put(3, 'three');
console.log(cache.get(1)); // 'one' - moves 1 to most recent
cache.put(4, 'four'); // Removes 2 (least recently used)
console.log(cache.get(2)); // -1 (not found, was evicted)

// Using Array-based implementation
const cacheArray = createLRUCacheArray(3);
cacheArray.put('a', 1);
cacheArray.put('b', 2);
cacheArray.put('c', 3);
console.log(cacheArray.get('a')); // 1
cacheArray.put('d', 4); // Removes 'b'
console.log(cacheArray.get('b')); // -1

// Using pure Array implementation
const cachePure = createLRUCachePureArray(3);
cachePure.put('x', 10);
cachePure.put('y', 20);
cachePure.put('z', 30);
console.log(cachePure.get('x')); // 10
cachePure.put('w', 40); // Removes 'y'
console.log(cachePure.get('y')); // -1
*/

