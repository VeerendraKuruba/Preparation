# DSA — Detailed Solutions with Explanations

> At Principal level: DSA is a filter. Solve correctly, state complexity clearly, discuss trade-offs, and show clean code.
> Commvault confirmed topics: trees, graphs, arrays, DP, OOP design, scheduling/retry problems.

---

## How to Approach a Coding Question (Spoken Framework)

```
1. Restate the problem (30s) — "So we want to..."
2. Clarify edge cases (1 min) — empty input? Negative numbers? Duplicates?
3. State approach + complexity BEFORE coding (1 min)
4. Code cleanly — named variables, no abbreviations
5. Test with example + edge case
6. State what you'd improve given more time
```

---

## 1. Two Sum — Hash Map Pattern

**Q: Given an array, return indices of two numbers that add up to a target.**

**Approach:** Single-pass hash map. For each number, check if its complement exists in the map.

```js
// Time: O(n) | Space: O(n)
function twoSum(nums, target) {
  const seen = new Map(); // value → index

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(nums[i], i);
  }
  return []; // no solution found
}

// Test cases
twoSum([2, 7, 11, 15], 9); // [0, 1] — 2 + 7 = 9
twoSum([3, 2, 4], 6);      // [1, 2] — 2 + 4 = 6
twoSum([3, 3], 6);          // [0, 1] — 3 + 3 = 6

// Edge cases to mention:
// - What if no solution? Return [] or -1 per problem statement
// - What if multiple solutions? Return first found (or all, if asked)
// - Negative numbers? Works with the map approach
```

**Follow-up: All pairs that sum to target (not just indices):**
```js
function allPairs(nums, target) {
  const seen = new Set();
  const result = [];

  for (const num of nums) {
    const complement = target - num;
    if (seen.has(complement)) {
      result.push([complement, num]);
    }
    seen.add(num);
  }
  return result;
}
```

---

## 2. Sliding Window — Longest Substring Without Repeating Characters

**Q: Find length of longest substring with no repeating characters.**

**Approach:** Expand right pointer; when duplicate found, move left pointer past the previous occurrence.

```js
// Time: O(n) | Space: O(min(n, alphabet_size))
function lengthOfLongestSubstring(s) {
  const charLastIndex = new Map(); // char → last seen index
  let maxLen = 0;
  let left = 0;

  for (let right = 0; right < s.length; right++) {
    const char = s[right];

    // If char seen before AND its last occurrence is within current window
    if (charLastIndex.has(char) && charLastIndex.get(char) >= left) {
      left = charLastIndex.get(char) + 1; // shrink window
    }

    charLastIndex.set(char, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}

// Test cases
lengthOfLongestSubstring('abcabcbb'); // 3 — "abc"
lengthOfLongestSubstring('bbbbb');    // 1 — "b"
lengthOfLongestSubstring('pwwkew');   // 3 — "wke"
lengthOfLongestSubstring('');         // 0 — edge case

// Explanation for "abcabcbb":
// right=0(a): window="a", len=1
// right=1(b): window="ab", len=2
// right=2(c): window="abc", len=3
// right=3(a): 'a' seen at 0 >= left(0), move left to 1, window="bca", len=3
// right=4(b): 'b' seen at 1 >= left(1), move left to 2, window="cab", len=3
// right=5(c): 'c' seen at 2 >= left(2), move left to 3, window="abc", len=3 (maxLen stays 3)
```

---

## 3. Binary Search — Variations

**Q: Find the first and last position of target in a sorted array.**

```js
// Time: O(log n) | Space: O(1)
function searchRange(nums, target) {
  return [findFirst(nums, target), findLast(nums, target)];
}

function findFirst(nums, target) {
  let lo = 0, hi = nums.length - 1, result = -1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2); // avoid integer overflow
    if (nums[mid] === target) {
      result = mid;
      hi = mid - 1; // keep searching LEFT for first occurrence
    } else if (nums[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

function findLast(nums, target) {
  let lo = 0, hi = nums.length - 1, result = -1;
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (nums[mid] === target) {
      result = mid;
      lo = mid + 1; // keep searching RIGHT for last occurrence
    } else if (nums[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return result;
}

searchRange([5, 7, 7, 8, 8, 10], 8); // [3, 4]
searchRange([5, 7, 7, 8, 8, 10], 6); // [-1, -1]

// Key insight: lo + (hi - lo) / 2 instead of (lo + hi) / 2
// Prevents integer overflow for very large arrays (not an issue in JS but good practice)
```

---

## 4. Linked List — Reverse + Cycle Detection

**Q: Reverse a linked list. Then detect the start of a cycle.**

```js
// Iterative reverse — Time: O(n) | Space: O(1)
function reverseList(head) {
  let prev = null;
  let curr = head;

  while (curr) {
    const next = curr.next; // save next before overwriting
    curr.next = prev;        // reverse the pointer
    prev = curr;             // advance prev
    curr = next;             // advance curr
  }

  return prev; // prev is the new head
}

// Cycle detection — Floyd's Tortoise & Hare
function detectCycleStart(head) {
  if (!head || !head.next) return null;

  let slow = head, fast = head;

  // Phase 1: detect if cycle exists
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) break; // meeting point found
  }

  if (!fast || !fast.next) return null; // no cycle

  // Phase 2: find cycle start
  // Mathematical property: distance from head to cycle start
  // equals distance from meeting point to cycle start
  slow = head;
  while (slow !== fast) {
    slow = slow.next;
    fast = fast.next; // both move at speed 1 now
  }

  return slow; // this is the cycle start node
}

// Why phase 2 works:
// If cycle length = C, head-to-cycle-start = F, meeting point past start = a
// When they meet: slow traveled F + a, fast traveled F + a + kC (some multiple of C)
// 2(F + a) = F + a + kC → F = kC - a
// Moving slow back to head and forward: slow travels F steps, fast travels kC - a + a = F steps
// They meet at cycle start!
```

---

## 5. Trees — Full Question Set

**Q: Given a binary tree, implement: level order traversal, max depth, and validate BST.**

```js
// === Level Order Traversal (BFS) ===
// Time: O(n) | Space: O(w) where w = max width of tree
function levelOrder(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];

  while (queue.length) {
    const levelSize = queue.length;
    const level = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left)  queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}

// === Max Depth ===
// Time: O(n) | Space: O(h) call stack, where h = height
function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

// === Validate BST ===
// Key insight: use min/max bounds, NOT just left < root < right
// Every node in left subtree must be < root AND < parent's upper bound
// Time: O(n) | Space: O(h)
function isValidBST(root, min = -Infinity, max = Infinity) {
  if (!root) return true;
  if (root.val <= min || root.val >= max) return false;

  return isValidBST(root.left, min, root.val) &&  // left subtree: max = root.val
         isValidBST(root.right, root.val, max);   // right subtree: min = root.val
}

// === Lowest Common Ancestor ===
function lowestCommonAncestor(root, p, q) {
  // Base cases: if we reach p or q (or null), return that node
  if (!root || root === p || root === q) return root;

  const left  = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);

  // If both sides returned non-null, current root is the LCA
  if (left && right) return root;

  // Otherwise, LCA is in the non-null side
  return left || right;
}
```

---

## 6. Graph — BFS Shortest Path + Number of Islands

```js
// === BFS Shortest Path ===
// Time: O(V + E) | Space: O(V)
function shortestPath(graph, start, end) {
  if (start === end) return 0;
  const visited = new Set([start]);
  const queue = [[start, 0]]; // [node, distance]

  while (queue.length) {
    const [node, dist] = queue.shift();
    for (const neighbor of graph[node] ?? []) {
      if (neighbor === end) return dist + 1;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, dist + 1]);
      }
    }
  }
  return -1; // no path
}

// === Number of Islands (DFS flood fill) ===
// Time: O(m*n) | Space: O(m*n) call stack
function numIslands(grid) {
  if (!grid.length) return 0;
  const rows = grid.length, cols = grid[0].length;
  let count = 0;

  function dfs(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;
    grid[r][c] = '0'; // mark visited (in-place — avoids extra visited array)
    dfs(r + 1, c); dfs(r - 1, c);
    dfs(r, c + 1); dfs(r, c - 1);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') {
        dfs(r, c); // flood fill the island
        count++;
      }
    }
  }
  return count;
}
```

---

## 7. Dynamic Programming — Coin Change + House Robber

```js
// === Coin Change — Minimum coins to make amount ===
// Time: O(amount × coins.length) | Space: O(amount)
function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0; // 0 coins needed to make amount 0

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i) {
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);
      }
    }
  }

  return dp[amount] === Infinity ? -1 : dp[amount];
}

// Trace for coins=[1,5,11], amount=15:
// dp[5]  = min(dp[4]+1, dp[0]+1) = 1 (one 5-coin)
// dp[10] = min(dp[9]+1, dp[5]+1) = 2 (two 5-coins)
// dp[11] = min(dp[10]+1, dp[0]+1) = 1 (one 11-coin)
// dp[15] = min(dp[14]+1, dp[10]+1, dp[4]+1) = 3 (11+1+1+1 = NOT optimal, 5+5+5 = 3)

// === House Robber — max loot without adjacent houses ===
// Time: O(n) | Space: O(1)
function rob(nums) {
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];

  let prev2 = 0, prev1 = 0;

  for (const num of nums) {
    const curr = Math.max(prev1, prev2 + num);
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}

// Recurrence: dp[i] = max(dp[i-1], dp[i-2] + nums[i])
// Either skip this house (take dp[i-1]) or rob it (take dp[i-2] + nums[i])
```

---

## 8. LRU Cache — O(1) Implementation

**Q: Implement an LRU cache with O(1) get and put.**

**Approach:** Map + doubly linked list. Map for O(1) lookup; DLL for O(1) insertion/deletion order.

```js
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map(); // key → node

    // Sentinel head/tail nodes — no null checks needed
    this.head = { key: null, val: null, prev: null, next: null };
    this.tail = { key: null, val: null, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._moveToFront(node); // mark as recently used
    return node.val;
  }

  put(key, value) {
    if (this.map.has(key)) {
      const node = this.map.get(key);
      node.val = value;
      this._moveToFront(node);
    } else {
      if (this.map.size >= this.capacity) {
        // Evict LRU item (just before tail)
        const lru = this.tail.prev;
        this._removeNode(lru);
        this.map.delete(lru.key);
      }
      const node = { key, val: value, prev: null, next: null };
      this._addToFront(node);
      this.map.set(key, node);
    }
  }

  _removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addToFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  _moveToFront(node) {
    this._removeNode(node);
    this._addToFront(node);
  }
}

// Test
const cache = new LRUCache(2);
cache.put(1, 1); // cache: {1=1}
cache.put(2, 2); // cache: {1=1, 2=2}
cache.get(1);    // 1 — also moves 1 to front; cache: {2=2, 1=1}
cache.put(3, 3); // evicts 2 (LRU); cache: {1=1, 3=3}
cache.get(2);    // -1 — not found (was evicted)
```

---

## 9. Machine Coding Classics — Frontend Specific

### Event Emitter / PubSub

```js
class EventEmitter {
  constructor() {
    this.events = new Map(); // event → Set of handlers
  }

  on(event, handler) {
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event).add(handler);
    return () => this.off(event, handler); // return unsubscribe function
  }

  once(event, handler) {
    const wrapper = (...args) => {
      handler(...args);
      this.off(event, wrapper);
    };
    return this.on(event, wrapper);
  }

  off(event, handler) {
    this.events.get(event)?.delete(handler);
  }

  emit(event, ...args) {
    this.events.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (err) {
        console.error(`Error in handler for "${event}":`, err);
        // Don't let one handler's error kill others
      }
    });
  }

  clear(event) {
    if (event) this.events.delete(event);
    else this.events.clear();
  }
}
```

### Retry with Exponential Backoff

```js
// Retry with exponential backoff — common for API calls in data protection systems
async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelayMs = 200,
    maxDelayMs = 10_000,
    multiplier = 2,
    jitter = true, // add randomness to prevent thundering herd
    retryOn = (err) => true, // retry all errors by default
  } = options;

  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts || !retryOn(err)) throw err;

      const jitterMs = jitter ? Math.random() * delay * 0.2 : 0;
      const waitMs = Math.min(delay + jitterMs, maxDelayMs);

      console.log(`Attempt ${attempt} failed. Retrying in ${Math.round(waitMs)}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));

      delay = Math.min(delay * multiplier, maxDelayMs);
    }
  }
}

// Usage
const result = await retryWithBackoff(
  () => fetch('/api/backup-jobs').then(r => r.json()),
  {
    maxAttempts: 4,
    initialDelayMs: 500,
    retryOn: (err) => err.status >= 500 || err.code === 'NETWORK_ERROR',
  }
);
```

---

## 10. OOP Design — BackupJob Class Hierarchy

**Q: Design a class hierarchy for backup jobs at Commvault.**

```js
// Base class
class BackupJob {
  #id;
  #status;
  #startedAt;

  constructor({ id, clientId, type }) {
    this.#id = id;
    this.clientId = clientId;
    this.type = type;
    this.#status = 'queued';
    this.#startedAt = null;
    this.progress = 0;
  }

  get id() { return this.#id; }
  get status() { return this.#status; }

  start() {
    if (this.#status !== 'queued') throw new Error(`Cannot start job in ${this.#status} state`);
    this.#status = 'running';
    this.#startedAt = new Date();
    this.onStart();
  }

  complete() {
    this.#status = 'success';
    this.progress = 100;
    this.onComplete();
  }

  fail(error) {
    this.#status = 'failed';
    this.error = error;
    this.onFail(error);
  }

  // Template method pattern — subclasses customize behavior
  onStart() {}
  onComplete() {}
  onFail(error) {}

  toJSON() {
    return {
      id: this.#id,
      status: this.#status,
      clientId: this.clientId,
      type: this.type,
      progress: this.progress,
      startedAt: this.#startedAt?.toISOString(),
    };
  }
}

class IncrementalBackupJob extends BackupJob {
  constructor(config) {
    super({ ...config, type: 'incremental' });
    this.baseSnapshotId = config.baseSnapshotId;
  }

  onStart() {
    console.log(`Incremental backup from snapshot ${this.baseSnapshotId}`);
  }
}

class CloudBackupJob extends BackupJob {
  constructor(config) {
    super(config);
    this.cloudProvider = config.cloudProvider; // 'aws' | 'azure' | 'gcp'
    this.region = config.region;
  }

  onComplete() {
    auditLog.record(`Cloud backup to ${this.cloudProvider}/${this.region} completed`);
  }
}
```

---

## Complexity Cheat Sheet

| Problem Type | Time | Space | Key Technique |
|-------------|------|-------|---------------|
| Find pair in array | O(n) | O(n) | Hash map |
| Sliding window max | O(n) | O(k) | Deque |
| BST operations | O(h) avg | O(h) | Recursion with bounds |
| Graph shortest path | O(V+E) | O(V) | BFS |
| Topological sort | O(V+E) | O(V) | DFS or Kahn's |
| All subsets | O(2^n) | O(n) | Backtracking |
| Coin change (DP) | O(n×m) | O(n) | Bottom-up DP |
| Merge intervals | O(n log n) | O(n) | Sort + sweep |
| LRU Cache | O(1) | O(n) | HashMap + DLL |
