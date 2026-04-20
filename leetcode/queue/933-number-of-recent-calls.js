/**
 * 933. Number of Recent Calls
 *
 * Approach: Queue
 * - Store timestamps of each ping. When ping(t) is called:
 *   1. Enqueue t.
 *   2. Dequeue all timestamps < t - 3000 (outside [t-3000, t]).
 *   3. Return the number of timestamps left in the queue.
 * - t is strictly increasing, so we only ever remove from the front.
 *
 * Time: O(1) amortized per ping (each timestamp enqueued once, dequeued at most once)
 * Space: O(k) where k = max number of pings in any 3000ms window (at most 3000 + 1)
 */

var RecentCounter = function () {
  this.queue = [];
};

/**
 * @param {number} t
 * @return {number}
 */
RecentCounter.prototype.ping = function (t) {
  this.queue.push(t);
  const minT = t - 3000;
  while (this.queue.length && this.queue[0] < minT) {
    this.queue.shift();
  }
  return this.queue.length;
};

/**
 * Your RecentCounter object will be instantiated and called as such:
 * var obj = new RecentCounter()
 * var param_1 = obj.ping(t)
 */

// Example 1:
// const counter = new RecentCounter();
// console.log(counter.ping(1));    // 1
// console.log(counter.ping(100));  // 2
// console.log(counter.ping(3001)); // 3
// console.log(counter.ping(3002)); // 3
