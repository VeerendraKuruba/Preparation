# Round 5 — Coding / DS & Algo In-Person #2 (Stage 2, Bangalore/Hyderabad, 45 mins)

> Second in-person coding round — often harder or more algorithmic than Round 4.
> By this point you've done 3+ rounds — stay focused. This round often includes a hard problem.
> Interviewers in different rounds can see each other's feedback — strong performance here can lift borderline earlier rounds.

---

## Topics Most Likely to Appear Here (Different from Round 4)

Google designs rounds to cover different areas. If Round 4 tested Trees/DP, Round 5 likely tests:
- **Graphs** (shortest path, cycle detection, Union-Find)
- **Heap / Priority Queue**
- **Advanced DP** (2D, interval DP)
- **Backtracking / Recursion**
- **Tries**
- **Intervals / Greedy**

---

## Q1: Dijkstra's Shortest Path (Graph — Priority Queue)
*(Tests graph + heap together — classic Google)*

```js
function dijkstra(n, edges, source) {
  // Build adjacency list: {node: [[neighbor, weight], ...]}
  const graph = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) {
    graph[u].push([v, w]);
    graph[v].push([u, w]);
  }

  const dist = new Array(n).fill(Infinity);
  dist[source] = 0;

  // Min-heap: [distance, node] — JS has no built-in, simulate with sorted array for interviews
  // In real code, use a proper MinHeap
  const heap = [[0, source]];

  while (heap.length) {
    heap.sort((a, b) => a[0] - b[0]); // O(n log n) — acceptable for interview demo
    const [d, u] = heap.shift();

    if (d > dist[u]) continue; // stale entry

    for (const [v, w] of graph[u]) {
      if (dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        heap.push([dist[v], v]);
      }
    }
  }

  return dist;
}
```

**With proper MinHeap note to interviewer:**
> "In production JS I'd implement a MinHeap for O(log n) extraction. For this interview I'll use a sorted array to keep the focus on the algorithm logic."

**Time:** O((V + E) log V) with proper min-heap  
**Space:** O(V + E)

---

## Q2: Find Median from Data Stream (Two Heaps)
*(Mentioned in Google prep context for stream processing — very commonly asked)*

```js
class MedianFinder {
  constructor() {
    // maxHeap: lower half (simulated by negating values in JS)
    this.lo = []; // max-heap (negate to simulate with min-heap logic)
    // minHeap: upper half
    this.hi = []; // min-heap
  }

  // MinHeap helper methods (JS has no built-in)
  #heapPush(heap, val, isMax = false) {
    heap.push(isMax ? -val : val);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent] <= heap[i]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  }

  #heapPop(heap) {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      while (true) {
        let smallest = i;
        const l = 2 * i + 1, r = 2 * i + 2;
        if (l < heap.length && heap[l] < heap[smallest]) smallest = l;
        if (r < heap.length && heap[r] < heap[smallest]) smallest = r;
        if (smallest === i) break;
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      }
    }
    return top;
  }

  addNum(num) {
    // Add to max-heap (lower half), stored as negatives
    this.#heapPush(this.lo, num, true);
    // Balance: move max of lower half to upper half
    const maxLo = -this.#heapPop(this.lo);
    this.#heapPush(this.hi, maxLo);
    // Ensure lo has >= hi size
    if (this.lo.length < this.hi.length) {
      const minHi = this.#heapPop(this.hi);
      this.#heapPush(this.lo, minHi, true);
    }
  }

  findMedian() {
    if (this.lo.length > this.hi.length) return -this.lo[0];
    return (-this.lo[0] + this.hi[0]) / 2;
  }
}
```

**Time:** O(log n) per `addNum`, O(1) for `findMedian`  
**Space:** O(n)

**Key insight to explain:**
- `lo` (max-heap) holds the lower half; `hi` (min-heap) holds the upper half
- We always keep `lo.length === hi.length` or `lo.length === hi.length + 1`
- Median is `lo[0]` if odd count, or average of both tops if even

---

## Q3: Word Search II (Trie + DFS Backtracking — Hard)
*(Tests Trie + graph DFS — advanced combination)*

```js
class TrieNode {
  constructor() { this.children = {}; this.word = null; }
}

function findWords(board, words) {
  const root = new TrieNode();
  for (const word of words) {
    let node = root;
    for (const c of word) {
      node.children[c] ||= new TrieNode();
      node = node.children[c];
    }
    node.word = word;
  }

  const rows = board.length, cols = board[0].length;
  const result = [];

  function dfs(r, c, node) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const ch = board[r][c];
    if (ch === '#' || !node.children[ch]) return;

    const next = node.children[ch];
    if (next.word) {
      result.push(next.word);
      next.word = null; // avoid duplicates
    }

    board[r][c] = '#'; // mark visited
    dfs(r+1, c, next); dfs(r-1, c, next);
    dfs(r, c+1, next); dfs(r, c-1, next);
    board[r][c] = ch; // restore
  }

  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      dfs(r, c, root);

  return result;
}
```

**Time:** O(M × 4 × 3^(L-1)) where M = cells, L = max word length  
**Space:** O(W × L) for Trie, O(L) for recursion

---

## Q4: Jump Game II (Greedy — Minimum Jumps)

```js
function jump(nums) {
  let jumps = 0, currentEnd = 0, farthest = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    farthest = Math.max(farthest, i + nums[i]);
    if (i === currentEnd) { // must jump here
      jumps++;
      currentEnd = farthest;
    }
  }
  return jumps;
}

// [2,3,1,1,4] → 2 (0→1→4)
// [2,3,0,1,4] → 2
```

**Time:** O(n)  
**Space:** O(1)

**Why greedy works:** At each position, we greedily extend the reachable range. We're forced to use a jump only when we've reached the end of the current range.

---

## Q5: Coin Change II — Number of Ways (2D DP)

```js
function change(amount, coins) {
  // dp[i] = number of ways to make amount i
  const dp = new Array(amount + 1).fill(0);
  dp[0] = 1; // one way to make 0: use no coins

  for (const coin of coins) {
    for (let i = coin; i <= amount; i++) {
      dp[i] += dp[i - coin];
    }
  }

  return dp[amount];
}

// amount=5, coins=[1,2,5] → 4
// [1,1,1,1,1], [1,1,1,2], [1,2,2], [5]
```

**Time:** O(amount × |coins|)  
**Space:** O(amount)

**Difference from Coin Change I (minimum coins):**
- Coin Change I: min number of coins → `dp[i] = Math.min(dp[i], dp[i-coin] + 1)`
- Coin Change II: number of combinations → `dp[i] += dp[i-coin]`
- Coin Change II: iterate coins in outer loop to count **combinations**, not permutations

---

## Q6: Reconstruct Itinerary (Eulerian Path — Graphs)

```js
function findItinerary(tickets) {
  const graph = {};
  // Sort tickets so we use lexicographically smaller destinations first
  tickets.sort((a, b) => a[1].localeCompare(b[1]));
  for (const [from, to] of tickets) {
    (graph[from] ||= []).push(to);
  }

  const result = [];
  function dfs(airport) {
    while (graph[airport]?.length) {
      dfs(graph[airport].shift());
    }
    result.unshift(airport);
  }

  dfs('JFK');
  return result;
}

// [["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]]
// → ["JFK","MUC","LHR","SFO","SJC"]
```

**Time:** O(E log E) — sorting  
**Space:** O(E)

**Key insight:** This is Hierholzer's algorithm for finding an Eulerian path. We add airports to the result in post-order (after all outgoing edges are used).

---

## Q7: Trapping Rain Water (Two Pointer)

```js
function trap(height) {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0, water = 0;

  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) leftMax = height[left];
      else water += leftMax - height[left];
      left++;
    } else {
      if (height[right] >= rightMax) rightMax = height[right];
      else water += rightMax - height[right];
      right--;
    }
  }
  return water;
}

// [0,1,0,2,1,0,1,3,2,1,2,1] → 6
```

**Time:** O(n)  
**Space:** O(1)

---

## Q8: Alien Dictionary (Topological Sort — Graph)

```js
function alienOrder(words) {
  const adj = {};
  const inDegree = {};

  // Initialize all characters
  for (const word of words)
    for (const c of word) { adj[c] ||= new Set(); inDegree[c] ||= 0; }

  // Build graph from adjacent word pairs
  for (let i = 0; i < words.length - 1; i++) {
    const [w1, w2] = [words[i], words[i+1]];
    const minLen = Math.min(w1.length, w2.length);
    if (w1.length > w2.length && w1.startsWith(w2)) return ''; // invalid
    for (let j = 0; j < minLen; j++) {
      if (w1[j] !== w2[j]) {
        if (!adj[w1[j]].has(w2[j])) {
          adj[w1[j]].add(w2[j]);
          inDegree[w2[j]]++;
        }
        break;
      }
    }
  }

  // BFS topological sort
  const queue = Object.keys(inDegree).filter(c => inDegree[c] === 0);
  let result = '';
  while (queue.length) {
    const c = queue.shift();
    result += c;
    for (const neighbor of adj[c]) {
      if (--inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  return result.length === Object.keys(adj).length ? result : '';
}
```

**Time:** O(C) where C = total characters in all words  
**Space:** O(1) — at most 26 characters

---

## Stress Management Strategy for Round 5

By this point you've done 4 rounds. Here's how to stay sharp:

1. **Take a breath before you start** — it's okay to say "give me 30 seconds to think"
2. **If you're blank**: start with brute force — "let me start with O(n²) and optimize"
3. **Partial credit is real** — a working O(n²) with a clear plan to optimize beats nothing
4. **Use the interviewer as a resource** — "I'm thinking about two approaches, can I talk through them?"
5. **Don't abandon a working solution to chase optimization** unless prompted

---

## Interview Ending Checklist

Before you say "I'm done":
- [ ] Code compiles mentally (trace through one example)
- [ ] Edge cases handled: empty array, single element, all same, negatives
- [ ] Stated time and space complexity
- [ ] Mentioned what you'd improve: "With more time I'd add error handling for X"
- [ ] Asked if the interviewer wants you to test anything specific
