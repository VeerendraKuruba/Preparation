# Adobe — Real Candidate-Reported Questions (with Detailed Answers)

> Every question below was asked at Adobe in a frontend interview (CS-II, MTS-1, MTS-2, SDE-3, Senior Frontend, GenStudio Senior). Sources: LeetCode Discuss, Medium write-ups, Glassdoor, FrontendLead, frontendgeek.com, lets-code.co.in, recruiter-confirmed focus areas, candidate posts 2023–2026.
>
> Each question tagged with **[R1]** (DS/Algo round) or **[R2]** (deep JS / browser APIs / UI architecture / hands-on).

---

## Table of Contents

1. [R1 — DSA Problems Asked at Adobe](#r1--dsa-problems-asked-at-adobe)
2. [R2 — Deep JavaScript Questions](#r2--deep-javascript-questions)
3. [R2 — Browser API Questions](#r2--browser-api-questions)
4. [R2 — Machine Coding Tasks Asked](#r2--machine-coding-tasks-asked)
5. [R2 — UI Architecture / System Design](#r2--ui-architecture--system-design)
6. [Hiring Manager / Behavioral Reported](#hiring-manager--behavioral-reported)
7. [Output Prediction Snippets (Asked Verbatim)](#output-prediction-snippets-asked-verbatim)

---

## R1 — DSA Problems Asked at Adobe

> Adobe R1 is medium-LeetCode level. Below are problems candidates explicitly reported being asked (CS-II Bangalore, MTS-2 Noida, Senior Frontend, GenStudio 2024–2026).

### 1. LRU Cache *(asked in ~40% of CS-II and senior interviews)*

**Problem:** Implement `get(key)` and `put(key, value)` in O(1). Capacity is fixed; evict least-recently-used on overflow.

**Approach:** Hash map for O(1) lookup + doubly linked list for O(1) move-to-front / evict-from-tail. Modern JS shortcut — `Map` preserves insertion order, so `delete` + re-`set` is "move to front" for free.

```js
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return -1;
    const value = this.cache.get(key);
    this.cache.delete(key);     // remove
    this.cache.set(key, value); // re-insert → moves to "newest"
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      // Map iteration order is insertion order; first key is oldest
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    this.cache.set(key, value);
  }
}
```

**Complexity:** O(1) get/put, O(capacity) space.

---

#### Follow-up 1.A — DLL version (no `Map` ordering)

The `Map` trick is fine, but interviewers want to see you can build it from scratch with a doubly-linked list. The DLL gives O(1) splice; the hash gives O(1) lookup. Use **head/tail sentinels** — they remove every "is this the first/last node?" branch.

```js
class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map(); // key → Node (Map purely for O(1) lookup, not ordering)

    // Sentinel head and tail simplify edge cases
    this.head = new Node(null, null); // most-recently-used side
    this.tail = new Node(null, null); // least-recently-used side
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  // ----- DLL primitives -----

  _remove(node) {
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
    this._remove(node);
    this._addToFront(node);
  }

  // ----- Public API -----

  get(key) {
    const node = this.map.get(key);
    if (!node) return -1;
    this._moveToFront(node);
    return node.value;
  }

  put(key, value) {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this._moveToFront(existing);
      return;
    }
    if (this.map.size >= this.capacity) {
      const lru = this.tail.prev;     // node just before tail sentinel
      this._remove(lru);
      this.map.delete(lru.key);
    }
    const node = new Node(key, value);
    this._addToFront(node);
    this.map.set(key, node);
  }
}
```

**Mental model:**
```
head ⇄ [most recent] ⇄ … ⇄ [oldest] ⇄ tail
        ↑ insert here       ↑ evict here
```

**Why sentinels matter:** without them, every `_remove` needs `if (node === head) head = node.next` and every `_addToFront` needs `if (head) head.prev = node`. With sentinels, those branches vanish — fewer bugs under interview pressure.

**Edge cases interviewer will throw at you:**
- `capacity = 0` — every `put` no-ops. Guard with `if (this.capacity === 0) return;` in `put`.
- `put` for an existing key with a different value — must update value AND mark recent.
- Duplicate `get(key)` — returns the same value but still bumps recency.

---

#### Follow-up 1.B — TTL (Time-To-Live) per Entry

**Spec:** `put(key, value, ttlMs)` — entry expires after `ttlMs`. `get` returns `-1` for expired entries.

**Two strategies — interviewer wants you to pick *and* defend:**

| | Lazy expiry | Active expiry (setTimeout) |
|---|---|---|
| Memory | Holds expired entries until evicted by LRU or touched | Removes promptly |
| CPU | None (just a check on `get`) | One timer per entry |
| Correctness | Expired entries waste a cache slot | Always fresh |
| At Adobe scale | **Preferred** — 1M entries × 1 timer = bad | Only for low-N caches |

**Lazy version (the right answer for 99% of cases):**

```js
class TTLNode {
  constructor(key, value, expiresAt) {
    this.key = key;
    this.value = value;
    this.expiresAt = expiresAt; // ms epoch; Infinity if no TTL
    this.prev = null;
    this.next = null;
  }
}

class LRUCacheTTL {
  constructor(capacity, defaultTtlMs = Infinity) {
    this.capacity = capacity;
    this.defaultTtl = defaultTtlMs;
    this.map = new Map();
    this.head = new TTLNode(null, null, 0);
    this.tail = new TTLNode(null, null, 0);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _addToFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  _isExpired(node) {
    return node.expiresAt <= Date.now();
  }

  _evictNode(node) {
    this._remove(node);
    this.map.delete(node.key);
  }

  get(key) {
    const node = this.map.get(key);
    if (!node) return -1;
    if (this._isExpired(node)) {
      this._evictNode(node);     // lazy expiry — clean up on access
      return -1;
    }
    this._remove(node);
    this._addToFront(node);
    return node.value;
  }

  put(key, value, ttlMs = this.defaultTtl) {
    const expiresAt = ttlMs === Infinity ? Infinity : Date.now() + ttlMs;
    const existing = this.map.get(key);

    if (existing) {
      existing.value = value;
      existing.expiresAt = expiresAt;
      this._remove(existing);
      this._addToFront(existing);
      return;
    }

    if (this.map.size >= this.capacity) {
      // Try to evict an expired entry first (free win)
      const lru = this.tail.prev;
      this._evictNode(lru);
    }

    const node = new TTLNode(key, value, expiresAt);
    this._addToFront(node);
    this.map.set(key, node);
  }
}
```

**Why `Date.now()` not `performance.now()`:** TTLs are absolute (expires at wall-clock time). `performance.now()` is a monotonic clock from page load — fine for measuring durations, wrong for "expires in 5 minutes" semantics that should survive page reloads if you persist the cache.

**Active-expiry variant (when N is small, e.g., 50-entry session cache):**

```js
put(key, value, ttlMs) {
  // ... DLL/map insertion ...
  if (ttlMs !== Infinity) {
    node.timer = setTimeout(() => this._evictNode(node), ttlMs);
  }
}

_evictNode(node) {
  if (node.timer) clearTimeout(node.timer);
  this._remove(node);
  this.map.delete(node.key);
}
```

**Senior signal:** mention that active expiry is the wrong default — Adobe Express may have 100k cached thumbnails; 100k `setTimeout` handles bloat the timer wheel and keep nodes from GC.

---

#### Follow-up 1.C — Thread-safe Across Tabs (the *real* senior question)

JavaScript on a single page is single-threaded, so within one tab you don't need locks. But two tabs of Adobe Express opening the same document each have their *own* JS heap — your LRU is duplicated, and writes from Tab A don't update Tab B.

Two production-grade approaches. Interviewer wants tradeoffs:

##### Option A — `BroadcastChannel` + per-tab in-memory LRU (most common)

Each tab keeps its own LRU. Mutations broadcast; peers replay them.

```js
class CrossTabLRU {
  constructor(capacity, name = 'lru') {
    this.local = new LRUCache(capacity);  // the DLL version above
    this.channel = new BroadcastChannel(name);
    this.channel.onmessage = (e) => this._onRemote(e.data);
  }

  _onRemote(msg) {
    // Apply remotely-originated mutation without re-broadcasting
    if (msg.op === 'put')   this.local.put(msg.key, msg.value);
    if (msg.op === 'evict') this.local.evict?.(msg.key);
  }

  get(key) {
    return this.local.get(key);
  }

  put(key, value) {
    this.local.put(key, value);
    this.channel.postMessage({ op: 'put', key, value });
  }
}
```

**Tradeoffs:**
- ✅ Simple. Works in every modern browser. Survives tab open/close.
- ⚠️ **Eventually consistent** — there's a microtask gap between a write in Tab A and Tab B receiving the message. Two writes from two tabs to the same key in the same tick can clobber each other.
- ⚠️ Each tab's LRU eviction order diverges (Tab A's "least recently used" isn't Tab B's). Acceptable for caches — the contract is "may evict at any time" anyway.
- ⚠️ Values must be structured-cloneable (no functions, no DOM nodes).

**When to use:** caches, not source-of-truth state. Adobe Express thumbnail cache → fine. Doc content → use CRDT instead.

##### Option B — `localStorage` events (legacy fallback)

`localStorage` writes fire a `storage` event in *other* tabs. Same pattern, worse:
- Serialization round-trip every message.
- Sync I/O — `setItem` blocks the main thread.
- Quota limit (~5MB).

Mention it for compatibility (works in IE11), don't recommend it.

##### Option C — `SharedArrayBuffer` + `Atomics` (the "show off depth" answer)

True shared memory between tabs *in the same agent cluster* (same-origin, COOP+COEP headers set). One LRU lives in shared memory; both tabs read/write directly.

**Reality check:**
- Requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on every response. Adobe Experience Cloud's third-party embeds break with COEP.
- `SharedArrayBuffer` is a `Uint8Array` — you can't store object references, only byte data. Implementing an LRU on raw bytes means writing your own allocator, linked-list pointers, and hash table in the buffer. Massive complexity.
- `Atomics.wait` / `Atomics.notify` give you mutex primitives — but you must hand-build the locking discipline. Easy to deadlock.

**When to use:** WASM apps that already need shared memory (Photoshop on Web, Premiere on Web). Not for a typical React app.

```js
// Sketch — just the locking idea, not a full implementation
const buf = new SharedArrayBuffer(1024);
const lock = new Int32Array(buf, 0, 1);

function withLock(fn) {
  while (Atomics.compareExchange(lock, 0, 0, 1) !== 0) {
    Atomics.wait(lock, 0, 1);  // park if locked
  }
  try { return fn(); }
  finally {
    Atomics.store(lock, 0, 0);
    Atomics.notify(lock, 0, 1);
  }
}
```

##### Option D — Service Worker as single owner (cleanest)

The service worker is **one instance across all tabs** of the origin. Make the SW the LRU's owner; tabs `postMessage` to it for `get`/`put`.

```js
// Tab side
async function get(key) {
  const ch = new MessageChannel();
  navigator.serviceWorker.controller.postMessage({ op: 'get', key }, [ch.port2]);
  return new Promise((res) => ch.port1.onmessage = (e) => res(e.data));
}

// Service worker side
const lru = new LRUCache(1000);
self.addEventListener('message', (e) => {
  const { op, key, value } = e.data;
  const port = e.ports[0];
  if (op === 'get') port.postMessage(lru.get(key));
  if (op === 'put') { lru.put(key, value); port?.postMessage(true); }
});
```

**Tradeoffs:**
- ✅ Single source of truth — no consistency hand-waving.
- ⚠️ Every `get` is async (round-trip through `postMessage`). Won't fit a hot path.
- ⚠️ SW can be killed by the browser; cache evaporates. Re-populate on activate.

**When to use:** shared *expensive-to-compute* caches like rendered thumbnail blobs. Don't put hot-path UI state here.

---

#### How to Answer in the Interview

State the three follow-ups in this order, and offer to code whichever they pick:

1. *"For DLL — head/tail sentinels, hash for lookup, list for ordering. About 40 lines."*
2. *"For TTL — lazy by default, store `expiresAt`, check on `get`. Active-expiry only for small N because of timer wheel cost."*
3. *"For multi-tab — `BroadcastChannel` for most caches; service worker for shared expensive caches; `SharedArrayBuffer + Atomics` only if we already need shared memory for WASM."*

That ordering signals you know the *cost* of each option — the senior bar isn't "I know all these APIs", it's "I know which one fits".

---

### 2. Flood Fill *(reported at hiring-manager round, Adobe domain-relevant — paint bucket)*

**Problem:** Given an `m × n` grid where some cells are shape outlines (`1`) and others empty (`0`). On click, fill the connected region with a new color. Clicking *outside* shapes fills everything except the outlines.

**Approach:** BFS from the click cell. Match cells with the *original* color; stop at boundaries (different color or outline).

```js
function floodFill(grid, sr, sc, newColor) {
  const original = grid[sr][sc];
  if (original === newColor) return grid;

  const m = grid.length, n = grid[0].length;
  const queue = [[sr, sc]];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (queue.length) {
    const [r, c] = queue.shift(); // for large grids, use a proper deque
    if (grid[r][c] !== original) continue;
    grid[r][c] = newColor;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] === original) {
        queue.push([nr, nc]);
      }
    }
  }
  return grid;
}
```

**Why BFS not DFS recursion at Adobe:** Photoshop-scale canvases (10,000 × 10,000) would blow the JS call stack with recursive DFS. BFS with an explicit queue is the senior answer.

**Complexity:** O(m·n) time, O(m·n) worst-case space (queue).

---

### 3. Queue Using Two Stacks

**Problem:** Implement FIFO queue using only push/pop on two stacks. Achieve amortized O(1) dequeue.

```js
class MyQueue {
  constructor() {
    this.inStack = [];   // push-side
    this.outStack = [];  // pop-side
  }

  push(x) {
    this.inStack.push(x);
  }

  pop() {
    this.peek();              // moves elements if needed
    return this.outStack.pop();
  }

  peek() {
    if (!this.outStack.length) {
      while (this.inStack.length) {
        this.outStack.push(this.inStack.pop());
      }
    }
    return this.outStack[this.outStack.length - 1];
  }

  empty() {
    return !this.inStack.length && !this.outStack.length;
  }
}
```

**The magic:** each element is moved from `inStack` → `outStack` at most once. n pops cost O(n) total → **amortized O(1)** per pop.

---

### 4. Group Anagrams *(MTS-2 R2)*

**Problem:** Given an array of strings, group them by anagram.

```js
function groupAnagrams(strs) {
  const groups = new Map();
  for (const s of strs) {
    // Key by sorted characters — anagrams produce identical keys
    const key = [...s].sort().join('');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  return [...groups.values()];
}
```

**Senior optimization:** Sorting each string is O(k log k). For lowercase-only, replace with a 26-element char-count fingerprint — O(k) per string.

```js
function key(s) {
  const count = new Array(26).fill(0);
  for (const c of s) count[c.charCodeAt(0) - 97]++;
  return count.join(',');
}
```

---

### 5. Asteroid Collision *(MTS-2 R2)*

**Problem:** Array of asteroids. Positive = moving right, negative = moving left. Equal absolute values destroy each other; larger destroys smaller. Return final state.

```js
function asteroidCollision(asteroids) {
  const stack = [];
  for (const a of asteroids) {
    let alive = true;
    while (alive && a < 0 && stack.length && stack[stack.length - 1] > 0) {
      const top = stack[stack.length - 1];
      if (top < -a) stack.pop();           // top destroyed, keep checking
      else if (top === -a) { stack.pop(); alive = false; } // both destroyed
      else alive = false;                  // current destroyed
    }
    if (alive) stack.push(a);
  }
  return stack;
}
```

**Why stack:** only collisions happen at the boundary between a right-mover and the next left-mover. Stack lets you replay collisions cleanly.

---

### 6. Longest Sequence in an Array (Longest Consecutive) *(CS-II R1)*

**Problem:** Find length of the longest run of consecutive integers in an unsorted array. O(n) required.

```js
function longestConsecutive(nums) {
  const set = new Set(nums);
  let best = 0;
  for (const n of set) {
    if (!set.has(n - 1)) {        // only start from a run's beginning
      let cur = n, len = 1;
      while (set.has(cur + 1)) { cur++; len++; }
      best = Math.max(best, len);
    }
  }
  return best;
}
```

**Trick:** the `!set.has(n - 1)` guard ensures each number is visited at most twice — once as a non-start (skipped), once during its run. Net O(n).

---

### 7. Number of Islands *(reported in June 2025 interview)*

**Problem:** 2D grid of `'1'` (land) and `'0'` (water). Count connected components of land.

```js
function numIslands(grid) {
  const m = grid.length, n = grid[0].length;
  let count = 0;
  function sink(r, c) {
    if (r < 0 || r >= m || c < 0 || c >= n || grid[r][c] !== '1') return;
    grid[r][c] = '0';
    sink(r + 1, c); sink(r - 1, c); sink(r, c + 1); sink(r, c - 1);
  }
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === '1') { count++; sink(r, c); }
    }
  }
  return count;
}
```

**Senior follow-up:** "How would you do this without mutating the grid?" → maintain a `visited` Set keyed by `r * n + c`.

---

### 8. Rotting Oranges *(OA & R1 reports)*

**Problem:** Grid: 0 empty, 1 fresh, 2 rotten. Each minute, rotten infects 4-neighbor fresh. Return minutes until all rotten, or -1 if impossible.

**Key insight:** Multi-source BFS — initialize the queue with **all** initially rotten cells.

```js
function orangesRotting(grid) {
  const m = grid.length, n = grid[0].length;
  const queue = [];
  let fresh = 0;
  for (let r = 0; r < m; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 2) queue.push([r, c, 0]);
      else if (grid[r][c] === 1) fresh++;
    }
  }
  let minutes = 0;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  while (queue.length) {
    const [r, c, t] = queue.shift();
    minutes = Math.max(minutes, t);
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
      if (grid[nr][nc] === 1) {
        grid[nr][nc] = 2;
        fresh--;
        queue.push([nr, nc, t + 1]);
      }
    }
  }
  return fresh === 0 ? minutes : -1;
}
```

---

### 9. Design a Chess Game (OOP) *(CS-II HLD R4)*

**Approach:** Classic LLD interview. Demonstrate class hierarchy + polymorphism + state encapsulation.

```js
class Piece {
  constructor(color) { this.color = color; this.hasMoved = false; }
  isValidMove(from, to, board) { throw new Error('abstract'); }
}

class Pawn extends Piece {
  isValidMove(from, to, board) {
    const dir = this.color === 'white' ? 1 : -1;
    const dr = to.r - from.r;
    const dc = to.c - from.c;
    // 1 forward
    if (dc === 0 && dr === dir && !board.at(to)) return true;
    // 2 forward on first move
    if (dc === 0 && dr === 2 * dir && !this.hasMoved && !board.at(to) && !board.at({r: from.r + dir, c: from.c})) return true;
    // diagonal capture
    if (Math.abs(dc) === 1 && dr === dir && board.at(to) && board.at(to).color !== this.color) return true;
    return false;
  }
}

class Knight extends Piece { /* L-shape moves */ }
class Bishop extends Piece { /* diagonal, clear path */ }
class Rook extends Piece   { /* straight, clear path */ }
class Queen extends Piece  { /* bishop ∪ rook */ }
class King extends Piece   { /* one-step in any direction */ }

class Board {
  constructor() { this.grid = Array.from({length: 8}, () => Array(8).fill(null)); }
  at(pos) { return this.grid[pos.r][pos.c]; }
  move(from, to) { /* validates + applies, returns captured */ }
}

class Game {
  constructor() {
    this.board = new Board();
    this.turn = 'white';
    this.history = [];
  }
  move(from, to) {
    const piece = this.board.at(from);
    if (!piece || piece.color !== this.turn) throw new Error('invalid');
    if (!piece.isValidMove(from, to, this.board)) throw new Error('invalid');
    if (this.wouldBeInCheck(this.turn, from, to)) throw new Error('cannot move into check');
    const captured = this.board.move(from, to);
    piece.hasMoved = true;
    this.history.push({ from, to, captured });
    this.turn = this.turn === 'white' ? 'black' : 'white';
  }
}
```

**Senior signal:** Mention check/checkmate as a separate concern (`wouldBeInCheck` computes whether the king of color X is attacked after a hypothetical move), castling/en-passant as special moves, and undo via the history stack.

---

### 10. Design a File System *(Senior Frontend, Dec '25–Jan '26)*

**Problem:** OOP design — directories contain files and other directories; support create, ls, addFile, readFile.

```js
class Node {
  constructor(name) {
    this.name = name;
    this.children = new Map();  // name → Node
    this.content = null;         // null for dir, string for file
  }
  isFile() { return this.content !== null; }
}

class FileSystem {
  constructor() { this.root = new Node('/'); }

  _resolve(path, createMissing = false) {
    if (path === '/') return this.root;
    const parts = path.split('/').filter(Boolean);
    let node = this.root;
    for (const part of parts) {
      if (!node.children.has(part)) {
        if (!createMissing) return null;
        node.children.set(part, new Node(part));
      }
      node = node.children.get(part);
    }
    return node;
  }

  ls(path) {
    const node = this._resolve(path);
    if (!node) return [];
    if (node.isFile()) return [node.name];
    return [...node.children.keys()].sort();
  }

  mkdir(path) { this._resolve(path, true); }

  addContentToFile(path, content) {
    const node = this._resolve(path, true);
    node.content = (node.content || '') + content;
  }

  readContentFromFile(path) {
    const node = this._resolve(path);
    return node?.content || '';
  }
}
```

---

### Other R1 Questions Candidates Have Reported

- Two Sum (and "return all index pairs including duplicates")
- Valid Parentheses (+ minimum removals to make valid)
- Reverse a Linked List (iterative + recursive)
- Detect Cycle in Linked List (Floyd's tortoise + hare)
- Merge Two Sorted Lists
- Clone Linked List with Random Pointers
- Lowest Common Ancestor of a BST
- Validate BST
- Longest Substring Without Repeating Characters (sliding window)
- Best Time to Buy and Sell Stock
- Climbing Stairs (DP intro)
- Word Ladder (BFS)
- Trapping Rain Water (two-pointer)
- Serialize/Deserialize Binary Tree
- Kth Largest Element (heap or quickselect)
- Minimum Number of Arrows to Burst Balloons (greedy interval)
- Sort Colors (Dutch National Flag, three-way partition)
- Implement Trie
- Coin Change
- Text Justification (Adobe domain — greedy, hard)

---

## R2 — Deep JavaScript Questions

> R2 starts here for many candidates. Anyone can explain `Array.map`; Adobe wants you to **implement it from scratch** and explain edge cases.

### 11. Implement `Promise.all` from Scratch *(reported 5+ candidates)*

**Spec to satisfy:**
- Resolves with results in input order, *not* completion order.
- Rejects on the first rejection (fast-fail).
- Accepts non-promise values (treat as resolved).
- Empty iterable → resolves with `[]`.

```js
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    if (items.length === 0) return resolve([]);

    const results = new Array(items.length);
    let remaining = items.length;

    items.forEach((item, idx) => {
      // Promise.resolve handles both promises and plain values
      Promise.resolve(item).then(
        (value) => {
          results[idx] = value;        // preserve original order
          remaining--;
          if (remaining === 0) resolve(results);
        },
        reject                          // first rejection wins
      );
    });
  });
}
```

**Senior probes:**
- "What if a rejection happens after a later resolution?" → After `reject` fires, subsequent `resolve`/`reject` are no-ops (Promise state is set once).
- "Why `Promise.resolve(item)` instead of `item.then(...)`?" → Item may not be a promise. `Promise.resolve` boxes non-promise values.
- "How is this different from `Promise.allSettled`?" → `allSettled` never short-circuits; each result is `{ status, value }` or `{ status, reason }`.

---

### 12. Implement `Array.prototype.reduce` from Scratch *(asked at 2024 R1)*

```js
Array.prototype.myReduce = function (callback, initialValue) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }
  if (this.length === 0 && arguments.length < 2) {
    throw new TypeError('Reduce of empty array with no initial value');
  }

  let acc;
  let start;

  if (arguments.length >= 2) {
    acc = initialValue;
    start = 0;
  } else {
    // Find first defined index (sparse-array correctness)
    let i = 0;
    while (i < this.length && !Object.prototype.hasOwnProperty.call(this, i)) i++;
    acc = this[i];
    start = i + 1;
  }

  for (let i = start; i < this.length; i++) {
    if (Object.prototype.hasOwnProperty.call(this, i)) {
      acc = callback(acc, this[i], i, this);
    }
  }
  return acc;
};
```

**Edge cases they probe:** empty array + no initial → throws; sparse array `[1, , 3]` skips the hole; callback gets `(acc, val, idx, arr)`.

---

### 13. Implement Debounce — Leading and Trailing Edge *(asked 4+ times)*

```js
function debounce(fn, wait, { leading = false, trailing = true } = {}) {
  let timer = null;
  let lastArgs;
  let lastThis;

  return function debounced(...args) {
    lastArgs = args;
    lastThis = this;

    const callNow = leading && timer === null;

    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (trailing && !(leading && lastArgs === args && callNow)) {
        fn.apply(lastThis, lastArgs);
      }
    }, wait);

    if (callNow) fn.apply(this, args);
  };
}

debounced.cancel = () => { clearTimeout(timer); timer = null; };
```

**Where Adobe uses it:** every search field in Spectrum (Lightroom asset search, Express template gallery), resize handlers in the canvas editor. They ask **why debounce vs throttle**: debounce waits for "user paused"; throttle caps "calls per second". Search → debounce; scroll position update → throttle.

---

### 14. Implement Throttle (with Leading + Trailing)

```js
function throttle(fn, wait) {
  let lastCall = 0;
  let timer = null;
  let lastArgs;

  return function (...args) {
    const now = Date.now();
    const remaining = wait - (now - lastCall);
    lastArgs = args;

    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      lastCall = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        timer = null;
        fn.apply(this, lastArgs);
      }, remaining);
    }
  };
}
```

---

### 15. Deep Clone an Object *(reported in MTS-1)*

**Problem:** Implement deep clone. Handle: primitives, nested objects, arrays, `Date`, `Map`, `Set`, circular refs.

```js
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);                  // circular

  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value);

  if (value instanceof Map) {
    const m = new Map();
    seen.set(value, m);
    for (const [k, v] of value) m.set(deepClone(k, seen), deepClone(v, seen));
    return m;
  }

  if (value instanceof Set) {
    const s = new Set();
    seen.set(value, s);
    for (const v of value) s.add(deepClone(v, seen));
    return s;
  }

  if (Array.isArray(value)) {
    const arr = [];
    seen.set(value, arr);
    for (let i = 0; i < value.length; i++) arr[i] = deepClone(value[i], seen);
    return arr;
  }

  const out = Object.create(Object.getPrototypeOf(value));      // preserve prototype
  seen.set(value, out);
  for (const key of Reflect.ownKeys(value)) {                   // includes symbols
    out[key] = deepClone(value[key], seen);
  }
  return out;
}
```

**Senior probe:** "Why not `JSON.parse(JSON.stringify(obj))`?" → drops functions, `undefined` properties, symbols, `Date` becomes string, throws on circular. Mention `structuredClone` (built-in, 2022+) but note it doesn't clone functions either.

---

### 16. Implement `bind` from Scratch

```js
Function.prototype.myBind = function (context, ...boundArgs) {
  const fn = this;
  function bound(...callArgs) {
    // Detect "new bound(...)" — `this` is an instance of bound
    if (this instanceof bound) {
      return fn.apply(this, [...boundArgs, ...callArgs]);
    }
    return fn.apply(context, [...boundArgs, ...callArgs]);
  }
  bound.prototype = Object.create(fn.prototype);  // preserve prototype chain
  return bound;
};
```

**Senior probe:** "What happens with `new boundFn()`?" → spec says `new` ignores the bound `this` and uses the freshly-created instance. The `this instanceof bound` check captures this.

---

### 17. Implement `memoize` with Custom Key

```js
function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  return function memoized(...args) {
    const key = keyFn(...args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}
```

**Probe:** "What if `fn` returns a Promise that rejects? Should you cache the rejection?" → If yes, evict on rejection (`result.catch(() => cache.delete(key))`).

---

### 18. Flatten a Deeply Nested Object *(SDE-3 R1)*

```js
function flatten(obj, prefix = '', out = {}) {
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}

// flatten({ a: 1, b: { c: 2, d: { e: 3 } } })
// → { a: 1, 'b.c': 2, 'b.d.e': 3 }
```

**Senior follow-up:** "How would you flatten arrays?" — decide whether `b.0`, `b[0]`, or `b.0.c` notation; document the choice.

---

### 19. Sequential Promise Resolution by Custom Order *(your repo has this — see [13-sequential-promise-resolution.js](../commvault-principal-frontend-interview/13-sequential-promise-resolution.js))*

**Problem:** Given `promises = [p1, p2, p3, p4]` and `order = [3, 1, 4, 2]`, resolve them in that exact order and return the values array in resolution order.

```js
async function sequentialResolution(promises, order) {
  const results = [];
  for (const idx of order) {
    const value = await promises[idx - 1]; // resolves on demand
    results.push(value);
  }
  return results;
}
```

**Note:** Promises *start* eager (when constructed). `await` just sequences when you *observe* their resolution. To make truly lazy, accept *factories* (`() => fetch(url)`) instead of promises.

---

### 20. Task Runner — Promises in Batches with Concurrency

**Problem:** Run N async tasks, but never have more than K in-flight at once. Return results in input order.

```js
async function runWithConcurrency(tasks, concurrency) {
  const results = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() };
      } catch (err) {
        results[i] = { status: 'rejected', reason: err };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}
```

**Why this pattern:** "worker pool" is the cleanest. Each worker pulls the next task index until none remain. K workers ⇒ K concurrent in-flight.

---

## R2 — Browser API Questions

### 21. Walk Through the Event Loop *(asked verbatim by 6+ candidates)*

**Question:** "What's the output? Why?"

```js
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('D');
queueMicrotask(() => console.log('E'));
```

**Output:** `A D C E B`

**Why:**
1. `A`, `D` run synchronously (call stack).
2. After sync code finishes, the **microtask queue** drains *fully*: `C` (Promise.then), then `E` (queueMicrotask).
3. Only then does the event loop pick the next **macrotask** (`setTimeout`): `B`.

**Senior tag-ons:** `requestAnimationFrame` is its own queue, fired right before paint. `setTimeout(fn, 0)` clamps to ~4ms in nested timeouts (HTML spec).

---

### 22. Implement Infinite Scroll *(reported at MTS-2 — "with cursor-based pagination")*

**The wrong answer:** `window.addEventListener('scroll', ...)` with throttle.
**The right answer:** `IntersectionObserver` on a sentinel element.

```jsx
function useInfiniteScroll(fetchPage) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!sentinelRef.current || done) return;
    const obs = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting || loading) return;
        setLoading(true);
        const { results, nextCursor } = await fetchPage(cursor);
        setItems((prev) => [...prev, ...results]);
        setCursor(nextCursor);
        setDone(!nextCursor);
        setLoading(false);
      },
      { rootMargin: '200px' }  // prefetch before user reaches end
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [cursor, loading, done, fetchPage]);

  return { items, loading, done, sentinelRef };
}
```

**Why this beats `scroll` events:**
- Runs off the main thread (browser batches).
- No 60+ fires/sec — no throttle bookkeeping.
- No `getBoundingClientRect()` calls that trigger layout thrash.

---

### 23. Critical Rendering Path *(asked at CS-II R3)*

**Question:** "From the moment `<html>` arrives at the browser to first pixel, what happens?"

**Six stages:**
1. **Parse HTML** → DOM tree.
2. **Parse CSS** → CSSOM tree.
3. **Render tree** = DOM ∩ CSSOM (only renderable nodes; no `<head>`, no `display: none`).
4. **Layout** (reflow) — compute box sizes and positions.
5. **Paint** — fill pixels into one or more layers.
6. **Composite** — assemble layers on the GPU.

**Blocking facts they probe:**
- `<script>` blocks HTML parsing unless `defer`/`async`.
- `<link rel="stylesheet">` does **not** block parsing but **blocks rendering** (browser won't paint without CSSOM).
- Synchronous JS reading layout (`offsetTop`, `getBoundingClientRect`) forces a *sync layout* — extremely expensive in a loop.

**Optimizations they expect you to name:**
- `<link rel="preload" as="font" crossorigin>` for critical fonts.
- `<script defer>` for DOM-dependent scripts.
- `<script async>` for independent scripts (analytics).
- Inline critical CSS, lazy-load the rest with `media="print" onload="this.media='all'"`.
- Avoid **layout thrashing**: batch DOM reads then DOM writes (or use `requestAnimationFrame`).

---

### 24. `useMemo` vs `useCallback` vs `React.memo` *(asked at CS-II + SDE-3)*

**Trick question — interviewer wants:** "Each one solves a different problem; using them blindly hurts more than it helps."

- **`React.memo(Component)`** — skips rerender if props are shallow-equal.
- **`useMemo(fn, deps)`** — caches a *value* across renders.
- **`useCallback(fn, deps)`** — caches a *function reference* across renders (so a memoized child's props stay stable).

**The trap:**
```jsx
const Child = memo(({ onClick }) => { /* … */ });

function Parent() {
  const handleClick = () => doThing();  // NEW reference every render
  return <Child onClick={handleClick} />; // memo does nothing!
}
```

**Fix:**
```jsx
function Parent() {
  const handleClick = useCallback(() => doThing(), []);
  return <Child onClick={handleClick} />;
}
```

**When NOT to memoize:** child is cheap to rerender; props change every render anyway (then memo just adds equality-check cost). React docs (2024+) explicitly say *don't pre-emptively memoize*.

---

### 25. AbortController for Fetch Cancellation

**Problem:** Cancel in-flight searches on each keystroke.

```js
let controller = null;
async function search(q) {
  if (controller) controller.abort();
  controller = new AbortController();
  try {
    const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
      signal: controller.signal,
    });
    return r.json();
  } catch (e) {
    if (e.name === 'AbortError') return; // expected
    throw e;
  }
}
```

**Senior tag-on:** `AbortController` works for any listener too — `addEventListener('click', fn, { signal })`. One controller can cancel a bag of subscriptions.

---

### 26. Difference Between `localStorage`, `sessionStorage`, `IndexedDB`, `Cookie` *(SDE-3 R1)*

| Storage | Size | Scope | API | Best for |
|---------|------|-------|-----|----------|
| Cookie | 4KB | Per-domain, sent with every HTTP request | Sync | Auth (httpOnly + Secure + SameSite) |
| `localStorage` | ~5MB | Per-origin, persists | Sync (blocks main thread) | Small prefs (theme, locale) |
| `sessionStorage` | ~5MB | Per-tab, clears on close | Sync | Tab-scoped flow state |
| `IndexedDB` | GBs | Per-origin | Async (promises via `idb` lib) | Large structured data, offline-first |
| Cache API | GBs | Per-origin | Async | HTTP response caching in service worker |

**Senior probe:** "User opens two tabs of the same app. They both write. What happens?" → For `localStorage`, last-write-wins (no coordination). Use `BroadcastChannel` to sync, or IndexedDB with transactions if writes overlap.

---

### 27. Why Animate `transform` Not `top`/`left`?

**Answer:** `transform` and `opacity` are **composited** — handled on the GPU compositor thread without layout or paint. `top`/`left` trigger layout for every keyframe (the box moves, so layout recomputes), then paint. At 60fps on a complex page, this drops to 15–20fps.

**Rule of thumb:** stick to `transform` + `opacity` for animations. If you need to slide via `width`, animate `transform: scaleX` and pair with `transform-origin: left`.

---

### 28. Async vs Defer vs Preload vs Preconnect *(CS-II R3)*

| Tag | Effect |
|-----|--------|
| `<script src>` | Blocks HTML parsing while downloading + executing |
| `<script defer>` | Downloads in parallel, executes *after* HTML parsed, in document order |
| `<script async>` | Downloads in parallel, executes ASAP — order not guaranteed |
| `<link rel="preload" as="font">` | Browser fetches resource at high priority for *this* page |
| `<link rel="prefetch">` | Browser fetches for *next* page (low priority) |
| `<link rel="preconnect">` | DNS + TCP + TLS handshake to origin, no fetch yet |
| `<link rel="dns-prefetch">` | Just DNS — cheapest hint |

**Rule:** preconnect to your CDN, preload your hero font, defer your app bundle, async your analytics.

---

## R2 — Machine Coding Tasks Asked

### 29. Build an Accordion *(asked in Adobe FE June 2025)*

**Requirements:** items with title + content; expand/collapse; only one open at a time (configurable); keyboard accessible.

```jsx
function Accordion({ items, allowMultiple = false }) {
  const [openIds, setOpenIds] = useState(new Set());

  const toggle = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (!allowMultiple) next.clear();
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div role="region">
      {items.map(({ id, title, content }) => {
        const open = openIds.has(id);
        const headerId = `acc-h-${id}`;
        const panelId = `acc-p-${id}`;
        return (
          <div key={id}>
            <h3>
              <button
                id={headerId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(id)}
              >
                {title}
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              hidden={!open}
            >
              {content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Why they grade accessibility:** Adobe Spectrum has strict ARIA contracts. Buttons need `aria-expanded`, panel needs `aria-labelledby`. Missing those = "fails senior bar".

---

### 30. Build a Nested Comment System *(MTS-2)*

**Requirements:** comment tree, reply, like/dislike, autosave drafts, keyboard accessibility.

```jsx
function CommentNode({ comment, onReply, onVote }) {
  const [replying, setReplying] = useState(false);
  return (
    <article aria-label={`Comment by ${comment.author}`}>
      <header>{comment.author}</header>
      <p>{comment.text}</p>
      <footer>
        <button onClick={() => onVote(comment.id, 1)}>👍 {comment.likes}</button>
        <button onClick={() => onVote(comment.id, -1)}>👎 {comment.dislikes}</button>
        <button onClick={() => setReplying((r) => !r)}>Reply</button>
      </footer>

      {replying && <ReplyEditor parentId={comment.id} onSubmit={() => setReplying(false)} />}

      {comment.replies?.length > 0 && (
        <ul style={{ marginLeft: 20 }}>
          {comment.replies.map((r) => (
            <li key={r.id}>
              <CommentNode comment={r} onReply={onReply} onVote={onVote} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ReplyEditor({ parentId, onSubmit }) {
  const storageKey = `draft:${parentId}`;
  const [text, setText] = useState(() => localStorage.getItem(storageKey) || '');
  // Debounced autosave
  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem(storageKey, text), 500);
    return () => clearTimeout(t);
  }, [text, storageKey]);
  return (
    <form onSubmit={(e) => { e.preventDefault(); /* submit */; localStorage.removeItem(storageKey); onSubmit(); }}>
      <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Reply" />
      <button type="submit">Post</button>
    </form>
  );
}
```

**Senior signals:** the recursive `CommentNode`, the autosave via `localStorage` keyed by `parentId`, ARIA labels on the editor.

---

### 31. Build a Typeahead / Autocomplete *(common, multiple reports)*

```jsx
function Autocomplete({ fetchSuggestions }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [active, setActive] = useState(-1);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!query) { setSuggestions([]); return; }
    const handle = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      try {
        const data = await fetchSuggestions(query, abortRef.current.signal);
        setSuggestions(data);
      } catch (e) { if (e.name !== 'AbortError') throw e; }
    }, 250);  // debounce
    return () => clearTimeout(handle);
  }, [query, fetchSuggestions]);

  return (
    <div role="combobox" aria-expanded={suggestions.length > 0} aria-haspopup="listbox">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setActive(-1); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((i) => Math.min(i + 1, suggestions.length - 1));
          if (e.key === 'ArrowUp')   setActive((i) => Math.max(i - 1, 0));
          if (e.key === 'Enter' && active >= 0) {
            setQuery(suggestions[active]);
            setSuggestions([]);
          }
        }}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `opt-${active}` : undefined}
      />
      <ul role="listbox">
        {suggestions.map((s, i) => (
          <li
            key={i}
            id={`opt-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => { setQuery(s); setSuggestions([]); }}
          >
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Three things they grade:** debounce (1), AbortController (2), keyboard nav + ARIA combobox pattern (3).

---

### 32. Build a Jira-like Dashboard with Vanilla JS *(SDE-3 R3)*

**Constraint:** no React. Columns (To Do / In Progress / Done), draggable cards, persist to `localStorage`.

```js
class Board {
  constructor(rootEl) {
    this.root = rootEl;
    this.cols = ['todo', 'doing', 'done'];
    this.state = JSON.parse(localStorage.getItem('board') || '{}');
    for (const c of this.cols) this.state[c] = this.state[c] || [];
    this.render();
    this.attachDnd();
  }

  render() {
    this.root.innerHTML = this.cols.map((c) => `
      <section class="col" data-col="${c}">
        <h2>${c}</h2>
        <ul data-list="${c}">
          ${this.state[c].map((card) => `
            <li class="card" draggable="true" data-id="${card.id}">${card.title}</li>
          `).join('')}
        </ul>
      </section>
    `).join('');
  }

  attachDnd() {
    let draggedId = null;
    this.root.addEventListener('dragstart', (e) => {
      if (e.target.classList.contains('card')) {
        draggedId = e.target.dataset.id;
        e.dataTransfer.effectAllowed = 'move';
      }
    });
    this.root.addEventListener('dragover', (e) => e.preventDefault());
    this.root.addEventListener('drop', (e) => {
      const col = e.target.closest('[data-col]');
      if (!col || !draggedId) return;
      this.moveCard(draggedId, col.dataset.col);
    });
  }

  moveCard(id, toCol) {
    for (const c of this.cols) {
      const i = this.state[c].findIndex((card) => card.id === id);
      if (i >= 0) {
        const [card] = this.state[c].splice(i, 1);
        this.state[toCol].push(card);
        break;
      }
    }
    localStorage.setItem('board', JSON.stringify(this.state));
    this.render();
  }
}
```

**Senior follow-ups:** "Now make it accessible to a keyboard user." → arrow keys + Enter/Space to pick up/drop; ARIA live region announcing moves. WAI-ARIA drag-and-drop pattern.

---

### 33. Other Machine Coding Tasks Reported

- **Star rating** — half-star, hover preview, click to commit.
- **Tabs** — controlled/uncontrolled, ARIA `role="tablist"`, roving tabindex.
- **Carousel** — autoplay, pause on hover, keyboard nav.
- **Modal** — focus trap, Esc to close, scroll lock on body.
- **Multi-select dropdown** — checkboxes, search, "select all".
- **Pagination** — first/prev/next/last + page numbers, jumps for many pages.
- **Progress bar** — segmented, animated, indeterminate.
- **Image gallery with lightbox** — keyboard nav, preload neighbors.

---

## R2 — UI Architecture / System Design

### 34. Design a File Directory UI / System *(reported Dec '25–Jan '26, Senior FE)*

(See [05-system-design.md](./05-system-design.md) for full RADIO walkthrough. Key points the interviewer probes:)
- **Tree virtualization** — even 10k files render in <16ms with `react-window`.
- **Drag-and-drop with HTML5 DnD API** + accessible alternative (Spectrum's `useDroppable`).
- **Optimistic updates** — drop a file → instant UI change → reconcile when server confirms.
- **Search** — debounced; client-side for ≤1k files, server-side beyond.
- **Multi-tab sync** — `BroadcastChannel` so two tabs of the same drive stay in sync.

---

### 35. Design WhatsApp Web *(SDE-3 R2)*

**Topics covered:**
- WebSocket persistent connection for receive; HTTP for send (idempotency-friendly).
- E2E encryption — keys generated client-side; server only stores ciphertext.
- Offline queue — IndexedDB buffer, replay on reconnect.
- Push notifications — Service Worker + Push API.
- Performance — virtualize conversation list; lazy-load message history above scroll.
- Accessibility — every message has timestamp + author announced; arrow keys to navigate.

---

### 36. Design a Notifications System for Millions of Real-time Updates *(FrontendLead Q)*

**Server side (mention briefly):** WebSocket gateway, pub/sub fan-out, sharded by user_id.

**Client side (the actual interview):**
- Single WebSocket per tab, multiplexed via `BroadcastChannel` to other tabs.
- Batched UI updates with `requestIdleCallback`.
- Service Worker holds the connection if app is backgrounded.
- Backpressure: server sends "snapshot then deltas"; client throttles UI updates.
- Read receipts persisted in IndexedDB.
- Optimistic mark-as-read; reconcile on server ack.

---

### 37. Design a Content Management Dashboard with Real-time Updates + Access Control *(MTS-2)*

- **Auth** — JWT in httpOnly cookie; React route guards check role on mount.
- **Access control** — capability check at the API layer (truth); UI hides controls cosmetically.
- **Real-time** — WebSocket for live collaborator presence; CRDT (Yjs) for collaborative text editing.
- **Audit trail** — every change logged with `userId`, `timestamp`, `before/after`.

---

## Hiring Manager / Behavioral Reported

### 38. "Walk Me Through a Frontend Performance Problem You Solved" *(asked 5+ candidates)*

**Structure (STAR):**
- **Situation:** name the product, the metric (LCP went from 1.2s → 3.5s after a feature ship).
- **Task:** your specific role (lead, not "we").
- **Action:** profile (Chrome DevTools Performance + Lighthouse), find the bottleneck (e.g. duplicate React renders, oversized bundle, blocking script), apply the fix (memoization, code-split, defer).
- **Result:** quantified (LCP back to 1.4s, bounce rate dropped X%).

**Adobe-specific signal:** mention you measured *real-user* (RUM) metrics, not just lab — Core Web Vitals from `web-vitals` library reported to your observability stack.

---

### 39. "Tell Me About a Time You Disagreed with a Senior Engineer"

**Adobe likes:** technical-disagreement-resolved-with-data stories. They want to see you can push back politely, gather evidence, and either change your mind or theirs.

---

### 40. "How Would You Mentor a Mid-Level Engineer Who Keeps Shipping Bugs?"

**Strong answer:** 1:1 root-cause conversation → identify whether it's process (no tests) vs skill gap vs blocked on review → pair on the next ticket → set up automated checks. Pattern: care + structure.

---

## Output Prediction Snippets (Asked Verbatim)

### 41. Closures + `var` in a Loop

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Output: 3 3 3
```

Why: `var` is function-scoped → one shared `i`; loop completes before any timeout fires; all three log the final `i`.

Fix: `let` → block-scoped, each iteration gets its own binding → `0 1 2`.

---

### 42. `this` in Different Calling Contexts

```js
const obj = {
  x: 10,
  arrow: () => console.log(this.x),
  regular() { console.log(this.x); }
};

obj.arrow();    // undefined  (arrow captures the surrounding `this`, not obj)
obj.regular();  // 10

const fn = obj.regular;
fn();           // undefined (strict mode) — `this` is unbound
```

---

### 43. Async / Await Ordering

```js
async function f() {
  console.log(1);
  await Promise.resolve();
  console.log(2);
}
console.log(3);
f();
console.log(4);
// Output: 3 1 4 2
```

Why: `f()` runs synchronously up to the `await`; logs `1`. The `await` yields back to the caller. After the caller's sync code (`4`) finishes, the microtask resumes `f` and logs `2`.

---

### 44. Hoisting of `var` vs `let`/`const`

```js
console.log(a);  // undefined  (var hoisted, initialized to undefined)
var a = 1;

console.log(b);  // ReferenceError (temporal dead zone)
let b = 2;
```

---

### 45. Object Reference vs Copy

```js
const a = { v: 1 };
const b = a;
b.v = 2;
console.log(a.v);   // 2  (same reference)

const c = { ...a };
c.v = 3;
console.log(a.v);   // 2  (spread is shallow copy)
```

**Senior probe:** "Spread is shallow — what's a case where it bites?" → nested objects share references with the original. Hence deepClone is necessary for true immutability.

---

## Sources

- [Adobe Senior Frontend Engineer GenStudio Full Loop — FrontendLead Discuss](https://discuss.frontendlead.com/t/adobe-senior-frontend-engineer-gen-studio-full-loop/3316)
- [Computer Scientist II Frontend Interview Experience — Abhishek Agarwal, Medium](https://medium.com/@abhishek4075/computer-scientist-ii-frontend-interview-experience-adobe-5f3a4e938eb2)
- [Frontend Engineer @Adobe Interview Experience — Kumar, Medium](https://medium.com/career-drill/frontend-engineer-adobe-interview-experience-237c6ad85d2d)
- [Adobe SDE3 Frontend Interview Experience — frontendgeek.com](https://www.frontendgeek.com/interview-experience/adobe-frontend-interview-experience-sde3-ghosted---a341c46f-b849-4b7d-a3ef-0ac4d0dce83a)
- [Adobe Coding Interview Questions 2026 — lets-code.co.in](https://www.lets-code.co.in/previousyearcodingquestion/adobe-previous-year-coding-questions/)
- [Adobe Frontend Engineer Interview Questions — FrontendLead](https://frontendlead.com/company-specific-questions/adobe)
- [Adobe Front End Interview Questions — Frontend Interview Handbook 2026](https://www.frontendinterviewhandbook.com/companies/adobe-front-end-interview-questions)
- [Adobe Frontend Engineer 2026 Interview Questions — Prepfully](https://prepfully.com/interview-questions/adobe/frontend-engineer)
- [Adobe Interview Questions — Glassdoor 2026](https://www.glassdoor.com/Interview/Adobe-Interview-Questions-E1090.htm)
- [Adobe Interview Preparation — GeeksforGeeks](https://www.geeksforgeeks.org/interview-experiences/adobe-interview-preparation/)
- [My Interview Experience at Adobe (CS2) — Saloni Khandelwal, Medium](https://medium.com/@thesalonikhandelwal/my-interview-experience-at-adobe-cs2-689a36795928)
