# DSA — Postman Interview

> Postman is NOT a heavy FAANG-style DSA shop. Confirmed questions: binary search, queue from two stacks. Expect: arrays, strings, hash maps, trees/graphs, scheduling. No heavy DP. Focus on clean code and communication.

---

## 1. Binary Search (Confirmed)

**Q: Implement binary search. Then: first and last position of target.**

### Standard Binary Search

```javascript
function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2); // avoids integer overflow

    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1; // not found
}

// Test
binarySearch([1, 3, 5, 7, 9, 11], 7); // 3
binarySearch([1, 3, 5, 7, 9, 11], 4); // -1
```

### First & Last Position (LeetCode #34)

```javascript
function searchRange(nums, target) {
  return [findFirst(nums, target), findLast(nums, target)];
}

function findFirst(nums, target) {
  let left = 0, right = nums.length - 1, result = -1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] === target) {
      result = mid;      // found — but keep searching LEFT for earlier occurrence
      right = mid - 1;  // ← key: shrink right to look further left
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return result;
}

function findLast(nums, target) {
  let left = 0, right = nums.length - 1, result = -1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (nums[mid] === target) {
      result = mid;     // found — but keep searching RIGHT for later occurrence
      left = mid + 1;  // ← key: shrink left to look further right
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return result;
}

// Test: [5,7,7,8,8,10], target = 8
// findFirst → 3, findLast → 4
```

---

## 2. Queue from Two Stacks (Confirmed)

**Q: Implement a queue using only two stacks.**

**Verbal answer before coding:**
> "A stack gives us LIFO, but a queue needs FIFO. The trick: use two stacks. Push to stack1 (inbox). When we need to dequeue, if stack2 (outbox) is empty, move everything from stack1 to stack2 — this reversal gives us FIFO order. If stack2 already has items, just pop from it. This is amortized O(1) per dequeue — each element moves at most once from inbox to outbox."

```javascript
class Queue {
  constructor() {
    this.inbox = [];   // for enqueue
    this.outbox = [];  // for dequeue
  }

  // O(1) always
  enqueue(val) {
    this.inbox.push(val);
  }

  // Amortized O(1) — transfer only when outbox is empty
  dequeue() {
    if (this.outbox.length === 0) {
      // Transfer all from inbox to outbox (reverses order, giving FIFO)
      while (this.inbox.length > 0) {
        this.outbox.push(this.inbox.pop());
      }
    }
    if (this.outbox.length === 0) return null; // queue is empty
    return this.outbox.pop();
  }

  // O(1) with same logic
  peek() {
    if (this.outbox.length === 0) {
      while (this.inbox.length > 0) {
        this.outbox.push(this.inbox.pop());
      }
    }
    return this.outbox[this.outbox.length - 1] ?? null;
  }

  get size() {
    return this.inbox.length + this.outbox.length;
  }

  isEmpty() {
    return this.size === 0;
  }
}

// Trace:
const q = new Queue();
q.enqueue(1);  // inbox: [1]
q.enqueue(2);  // inbox: [1, 2]
q.enqueue(3);  // inbox: [1, 2, 3]
q.dequeue();   // outbox empty → transfer → outbox: [3,2,1] → pop → 1
q.dequeue();   // outbox: [3,2] → pop → 2
q.enqueue(4);  // inbox: [4], outbox: [3]
q.dequeue();   // outbox not empty → pop → 3
q.dequeue();   // outbox empty → transfer → outbox: [4] → pop → 4
```

---

## 3. Valid Parentheses

```javascript
function isValid(s) {
  const stack = [];
  const pairs = { ')': '(', ']': '[', '}': '{' };

  for (const char of s) {
    if ('([{'.includes(char)) {
      stack.push(char);
    } else {
      // closing bracket
      if (stack.pop() !== pairs[char]) return false;
    }
  }

  return stack.length === 0; // stack must be empty at end
}

// Extension: minimum removals to make valid
function minRemovalsForValid(s) {
  let open = 0, close = 0;

  for (const char of s) {
    if (char === '(') {
      open++;
    } else if (char === ')') {
      if (open > 0) open--; // matched
      else close++;         // unmatched closing
    }
  }

  return open + close; // open = unmatched '(', close = unmatched ')'
}
```

---

## 4. Two Sum & Variants

```javascript
// Classic: two sum (unsorted) — O(n)
function twoSum(nums, target) {
  const seen = new Map(); // value → index
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) return [seen.get(complement), i];
    seen.set(nums[i], i);
  }
  return [];
}

// Variant: all pairs that sum to target
function allPairsTwoSum(nums, target) {
  const pairs = [];
  const seen = new Set();
  const used = new Set();

  for (const num of nums) {
    const complement = target - num;
    if (seen.has(complement) && !used.has(num) && !used.has(complement)) {
      pairs.push([complement, num]);
      used.add(num);
      used.add(complement);
    }
    seen.add(num);
  }
  return pairs;
}
```

---

## 5. Flatten Nested Array

```javascript
// Recursive flatten (any depth)
function flatten(arr, depth = Infinity) {
  if (depth === 0) return arr.slice();
  return arr.reduce((acc, item) => {
    if (Array.isArray(item)) {
      acc.push(...flatten(item, depth - 1));
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
}

// Iterative (stack-based) — avoids call stack overflow for deep nesting
function flattenIterative(arr) {
  const result = [];
  const stack = [...arr];

  while (stack.length > 0) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      stack.push(...item); // push children back to process
    } else {
      result.unshift(item); // maintain order
    }
  }
  return result;
}

// Built-in (know this too)
[1, [2, [3, [4]]]].flat(Infinity); // [1, 2, 3, 4]
```

---

## 6. LRU Cache

```javascript
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map(); // LinkedHashMap equivalent in JS (Map preserves insertion order)
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key); // remove to re-insert at end
    } else if (this.cache.size >= this.capacity) {
      // Evict least recently used (first inserted = first in Map)
      const lruKey = this.cache.keys().next().value;
      this.cache.delete(lruKey);
    }
    this.cache.set(key, value);
  }
}

// Trace for capacity 2:
// put(1,1): {1:1}
// put(2,2): {1:1, 2:2}
// get(1):   {2:2, 1:1} ← 1 moved to end
// put(3,3): evict 2 (LRU) → {1:1, 3:3}
// get(2):   -1 (evicted)
```

---

## 7. Merge Intervals (Practical — Scheduling)

```javascript
// Postman context: merge overlapping time windows for monitor scheduling
function mergeIntervals(intervals) {
  if (intervals.length === 0) return [];

  intervals.sort((a, b) => a[0] - b[0]); // sort by start time
  const merged = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const [start, end] = intervals[i];
    const last = merged[merged.length - 1];

    if (start <= last[1]) {
      // Overlapping — extend the end if needed
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

// Input:  [[1,3],[2,6],[8,10],[15,18]]
// Output: [[1,6],[8,10],[15,18]]

// Variant: does a new interval overlap with any existing?
function hasOverlap(intervals, newInterval) {
  const [newStart, newEnd] = newInterval;
  return intervals.some(([start, end]) => newStart <= end && newEnd >= start);
}
```

---

## 8. Graph: Detect Cycle in Dependencies

```javascript
// Postman context: detect circular dependencies in pre-request scripts or request chains
function hasCycle(dependencies) {
  // dependencies: { 'A': ['B', 'C'], 'B': ['D'], 'D': ['A'] }  ← cycle A→B→D→A

  const WHITE = 0, GRAY = 1, BLACK = 2; // unvisited, in-progress, done
  const color = {};

  for (const node of Object.keys(dependencies)) {
    color[node] = WHITE;
  }

  function dfs(node) {
    color[node] = GRAY; // mark as in-progress

    for (const neighbor of (dependencies[node] || [])) {
      if (color[neighbor] === GRAY) return true;  // back edge = cycle
      if (color[neighbor] === WHITE && dfs(neighbor)) return true;
    }

    color[node] = BLACK; // fully processed
    return false;
  }

  return Object.keys(dependencies).some(node => color[node] === WHITE && dfs(node));
}
```

---

## 9. Event Emitter (OOP, likely asked)

```javascript
class EventEmitter {
  constructor() {
    this._listeners = new Map(); // eventName → Set of { fn, once }
  }

  on(event, fn) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    const handler = { fn, once: false };
    this._listeners.get(event).add(handler);
    return () => this.off(event, fn); // return unsubscribe function
  }

  once(event, fn) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    const handler = { fn, once: true };
    this._listeners.get(event).add(handler);
  }

  emit(event, ...args) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;

    const toRemove = [];
    handlers.forEach(handler => {
      try {
        handler.fn(...args);
      } catch (err) {
        console.error(`Error in listener for "${event}":`, err);
      }
      if (handler.once) toRemove.push(handler);
    });
    toRemove.forEach(h => handlers.delete(h));
  }

  off(event, fn) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    handlers.forEach(handler => {
      if (handler.fn === fn) handlers.delete(handler);
    });
  }

  removeAllListeners(event) {
    if (event) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }
  }
}

// Test
const emitter = new EventEmitter();
const unsub = emitter.on('request:sent', (req) => console.log('Sent:', req.url));
emitter.once('auth:expired', () => console.log('Token expired'));

emitter.emit('request:sent', { url: 'https://api.postman.com' }); // fires
emitter.emit('auth:expired'); // fires once
emitter.emit('auth:expired'); // no-op (once already fired)

unsub(); // remove the request:sent listener
```

---

## 10. Retry with Exponential Backoff

```javascript
// Postman context: retrying failed API requests in collection runner
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 500,
    maxDelay = 10000,
    backoffFactor = 2,
    retryOn = (err) => true, // which errors to retry
  } = options;

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries || !retryOn(error)) throw error;

      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );
      const jitter = delay * 0.2 * Math.random(); // ±20% jitter
      await sleep(delay + jitter);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage
const result = await retryWithBackoff(
  () => api.executeRequest(request),
  {
    maxRetries: 3,
    retryOn: (err) => err.status >= 500 || err.code === 'NETWORK_ERROR',
  }
);
```

---

## Interview Communication Framework

1. **Restate:** "So I need to [problem in my own words] and return [expected output]..."
2. **Clarify:** "A few questions: can the array have duplicates? Can I assume it's sorted? What's the expected output for empty input?"
3. **Approach first:** "I'm thinking [data structure] because [reason]. Time complexity will be O(n). Let me code it."
4. **Code with narration:** "I'm using a Map here so lookup is O(1)..."
5. **Test with example:** Walk through your code with the sample input.
6. **Edge cases:** "What about empty input? What about all duplicates? What if n = 1?"
7. **Optimize:** "This works in O(n log n), but I could do O(n) with a hash map..."
