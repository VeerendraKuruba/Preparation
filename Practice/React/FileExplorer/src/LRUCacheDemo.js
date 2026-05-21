import { createLRUCache, createLRUCacheArray, createLRUCachePureArray } from './LRUCache';

/**
 * Demo and test functions for LRU Cache implementations
 */

// Demo for Map-based LRU Cache (Recommended - O(1) operations)
export function demoMapBasedLRU() {
  console.log('=== Map-based LRU Cache Demo ===');
  const cache = createLRUCache(3);

  cache.put(1, 'one');
  cache.put(2, 'two');
  cache.put(3, 'three');
  console.log('After adding 1, 2, 3:', cache.keys()); // [3, 2, 1]

  console.log('Get(1):', cache.get(1)); // 'one' - moves 1 to most recent
  console.log('After get(1):', cache.keys()); // [1, 3, 2]

  cache.put(4, 'four'); // Removes 2 (least recently used)
  console.log('After adding 4:', cache.keys()); // [4, 1, 3]
  console.log('Get(2):', cache.get(2)); // -1 (not found, was evicted)
  console.log('Get(3):', cache.get(3)); // 'three'
  console.log('Final keys:', cache.keys()); // [3, 4, 1]
}

// Demo for Array+Map based LRU Cache
export function demoArrayMapLRU() {
  console.log('\n=== Array+Map based LRU Cache Demo ===');
  const cache = createLRUCacheArray(3);

  cache.put('a', 1);
  cache.put('b', 2);
  cache.put('c', 3);
  console.log('After adding a, b, c:', cache.keys()); // ['c', 'b', 'a']

  console.log('Get(a):', cache.get('a')); // 1
  console.log('After get(a):', cache.keys()); // ['a', 'c', 'b']

  cache.put('d', 4); // Removes 'b'
  console.log('After adding d:', cache.keys()); // ['d', 'a', 'c']
  console.log('Get(b):', cache.get('b')); // -1
  console.log('Has(c):', cache.has('c')); // true
}

// Demo for Pure Array-based LRU Cache
export function demoPureArrayLRU() {
  console.log('\n=== Pure Array-based LRU Cache Demo ===');
  const cache = createLRUCachePureArray(3);

  cache.put('x', 10);
  cache.put('y', 20);
  cache.put('z', 30);
  console.log('After adding x, y, z:', cache.keys()); // ['z', 'y', 'x']

  console.log('Get(x):', cache.get('x')); // 10
  console.log('After get(x):', cache.keys()); // ['x', 'z', 'y']

  cache.put('w', 40); // Removes 'y'
  console.log('After adding w:', cache.keys()); // ['w', 'x', 'z']
  console.log('Get(y):', cache.get('y')); // -1
  console.log('Size:', cache.size()); // 3
}

// Run all demos
export function runAllDemos() {
  demoMapBasedLRU();
  demoArrayMapLRU();
  demoPureArrayLRU();
}

// Uncomment to run demos
// runAllDemos();

