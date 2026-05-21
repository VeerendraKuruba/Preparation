import { createLFUCache, createLFUCacheArray } from './LFUCache';

/**
 * Demo and test functions for LFU Cache implementations
 */

// Demo for Map-based LFU Cache (Recommended - O(1) operations)
export function demoMapBasedLFU() {
  console.log('=== Map-based LFU Cache Demo ===');
  const cache = createLFUCache(2);

  cache.put(1, 1);
  cache.put(2, 2);
  console.log('Get(1):', cache.get(1));       // 1 (key 1 now freq 2, key 2 freq 1)
  console.log('Keys (most freq first):', cache.keys());

  cache.put(3, 3);                             // Evicts 2 (lower freq)
  console.log('After put(3,3):', cache.keys());
  console.log('Get(2):', cache.get(2));       // -1 (evicted)
  console.log('Get(3):', cache.get(3));       // 3

  cache.put(4, 4);                             // Evicts 1 (same freq as 3, LRU)
  console.log('Get(1):', cache.get(1));       // -1
  console.log('Get(3):', cache.get(3));       // 3
  console.log('Get(4):', cache.get(4));       // 4
  console.log('Size:', cache.size());
}

// Demo for Array+Map based LFU Cache
export function demoArrayMapLFU() {
  console.log('\n=== Array+Map based LFU Cache Demo ===');
  const cache = createLFUCacheArray(3);

  cache.put('a', 1);
  cache.put('b', 2);
  cache.put('c', 3);
  console.log('Get(a):', cache.get('a'));     // 1
  console.log('Keys:', cache.keys());

  cache.put('d', 4);                          // Evicts key with min freq
  console.log('After put(d,4):', cache.keys());
  console.log('Has(b):', cache.has('b'));
  console.log('Entries:', cache.entries());
}

// Run all demos
export function runAllDemos() {
  demoMapBasedLFU();
  demoArrayMapLFU();
}

// Uncomment to run demos
// runAllDemos();
