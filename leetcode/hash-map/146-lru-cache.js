/**
 * 146. LRU Cache
 * https://leetcode.com/problems/lru-cache/
 *
 * Approach: Map preserves insertion order. On every access (get/put),
 * delete and re-insert the key so it moves to the "end" (most recently used).
 * The first key() is always the least recently used → O(1) eviction.
 *
 * Time: O(1) for get and put
 * Space: O(capacity)
 */

/**
 * @param {number} capacity
 */
var LRUCache = function(capacity) {
    this.capacity = capacity;
    this.map = new Map();
};

/**
 * @param {number} key
 * @return {number}
 */
LRUCache.prototype.get = function(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val);
    return val;
};

/**
 * @param {number} key
 * @param {number} value
 * @return {void}
 */
LRUCache.prototype.put = function(key, value) {
    if (this.map.has(key)) {
        this.map.delete(key);
    }
    if (this.map.size >= this.capacity) {
        // First key is the least recently used
        const lruKey = this.map.keys().next().value;
        this.map.delete(lruKey);
    }
    this.map.set(key, value);
};
