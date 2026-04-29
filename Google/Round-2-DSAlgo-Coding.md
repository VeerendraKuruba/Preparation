# Round 2 — DS & Algo Coding (Stage 1, Virtual, 45 mins)

> Pure algorithmic coding. 1-2 LeetCode-style problems in JavaScript.
> Interviewer looks for: optimal approach, clean code, complexity analysis, edge cases.
> 45 min = ~5 min understanding + ~30 min coding + ~10 min optimization + edge cases.

---

## How This Round Works

- You'll be given 1 problem (medium-hard) or 2 problems (1 easy + 1 medium)
- Write code in a shared editor (no IDE, no autocomplete)
- Think out loud — silence is a red flag at Google
- Interviewer may give hints or redirect — take them gracefully
- After solving, they may ask: "Can you do better?" — be ready to optimize

---

## High-Probability Topics for This Round

Based on real Google interview reports, this virtual coding round frequently tests:
- **Graphs / BFS / DFS** (76% frequency at Google L4+)
- **Arrays + Sliding Window**
- **String manipulation**
- **Hash maps**
- **Binary search**

---

## Q1: Number of Islands (Graph — BFS/DFS)
*"Count connected components of '1's in a 2D grid"*

**Approach:** DFS flood-fill — mark visited cells to avoid revisiting.

```js
function numIslands(grid) {
  if (!grid || !grid.length) return 0;
  const rows = grid.length, cols = grid[0].length;
  let count = 0;

  function dfs(r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;
    grid[r][c] = '#'; // mark visited
    dfs(r + 1, c); dfs(r - 1, c);
    dfs(r, c + 1); dfs(r, c - 1);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') { count++; dfs(r, c); }
    }
  }
  return count;
}
```

**Time:** O(m × n) — each cell visited once  
**Space:** O(m × n) worst case call stack (grid is all land)

**Follow-up at Google:** "Now count lakes (water regions enclosed by land)."
```js
// Same approach — count '0' regions that don't touch the border
// BFS/DFS from all border '0's, mark them. Then count remaining unmarked '0' islands.
function countLakes(grid) {
  const rows = grid.length, cols = grid[0].length;
  const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));

  function bfs(r, c) {
    const q = [[r, c]]; visited[r][c] = true;
    while (q.length) {
      const [cr, cc] = q.shift();
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = cr + dr, nc = cc + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
            && !visited[nr][nc] && grid[nr][nc] === '0') {
          visited[nr][nc] = true;
          q.push([nr, nc]);
        }
      }
    }
  }

  // Mark all water touching border as not a lake
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r === 0 || r === rows-1 || c === 0 || c === cols-1)
          && grid[r][c] === '0' && !visited[r][c]) bfs(r, c);
    }
  }

  let lakes = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] === '0' && !visited[r][c]) { lakes++; bfs(r, c); }

  return lakes;
}
```

---

## Q2: Longest Substring with K Unique Characters (Sliding Window)
*"Find the longest substring containing at most K distinct characters"*
*(Confirmed Google question — mentioned in prep context)*

```js
function lengthOfLongestSubstringKDistinct(s, k) {
  if (k === 0) return 0;
  const freq = new Map();
  let left = 0, maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    freq.set(char, (freq.get(char) || 0) + 1);

    while (freq.size > k) {
      const lChar = s[left++];
      freq.set(lChar, freq.get(lChar) - 1);
      if (freq.get(lChar) === 0) freq.delete(lChar);
    }

    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}

// "eceba", k=2 → "ece" → length 3
// "aa", k=1 → "aa" → length 2
```

**Time:** O(n) — each character enters and exits the window once  
**Space:** O(k) — at most k+1 entries in the map before shrinking

**Edge cases to mention:**
- `k >= s.length` — return entire string length
- Empty string — return 0
- `k = 0` — return 0

---

## Q3: Find All Subsets with a Condition (Backtracking)
*(Confirmed: asked in April 2025 Google L4 FE onsite)*

**Problem:** Find all subsets of an array of integers that sum to a target.

```js
function findSubsets(nums, target) {
  const results = [];
  nums.sort((a, b) => a - b); // sort to enable pruning

  function backtrack(start, current, remaining) {
    if (remaining === 0) {
      results.push([...current]);
      return;
    }
    for (let i = start; i < nums.length; i++) {
      if (nums[i] > remaining) break; // pruning: sorted, so rest are also > remaining
      if (i > start && nums[i] === nums[i-1]) continue; // skip duplicates
      current.push(nums[i]);
      backtrack(i + 1, current, remaining - nums[i]);
      current.pop();
    }
  }

  backtrack(0, [], target);
  return results;
}

findSubsets([10, 1, 2, 7, 6, 1, 5], 8);
// [[1,1,6], [1,2,5], [1,7], [2,6]]
```

**Time:** O(2^n) worst case  
**Space:** O(n) recursion depth + O(n) for each result

---

## Q4: LRU Cache (Hash Map + Doubly Linked List)
*(Very commonly asked at Google)*

```js
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map(); // key → node
    // Sentinel head and tail to avoid null checks
    this.head = { key: null, val: null, prev: null, next: null };
    this.tail = { key: null, val: null, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  #remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  #insertFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this.#remove(node);
    this.#insertFront(node); // move to MRU position
    return node.val;
  }

  put(key, value) {
    if (this.map.has(key)) {
      this.#remove(this.map.get(key));
    } else if (this.map.size >= this.capacity) {
      const lru = this.tail.prev; // least recently used
      this.#remove(lru);
      this.map.delete(lru.key);
    }
    const node = { key, val: value, prev: null, next: null };
    this.#insertFront(node);
    this.map.set(key, node);
  }
}
```

**Time:** O(1) for both `get` and `put`  
**Space:** O(capacity)

**Why doubly linked list?** Need O(1) removal — singly linked requires O(n) to find previous node.
**Why Map?** O(1) node lookup by key.

---

## Q5: Merge Intervals
*(Frequently asked, tests sorting + greedy)*

```js
function merge(intervals) {
  if (intervals.length <= 1) return intervals;
  intervals.sort((a, b) => a[0] - b[0]);

  const result = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = result[result.length - 1];
    if (intervals[i][0] <= last[1]) {
      last[1] = Math.max(last[1], intervals[i][1]); // merge
    } else {
      result.push(intervals[i]);
    }
  }
  return result;
}

merge([[1,3],[2,6],[8,10],[15,18]]); // [[1,6],[8,10],[15,18]]
merge([[1,4],[4,5]]);                // [[1,5]]
```

**Time:** O(n log n) — dominated by sort  
**Space:** O(n) for output

---

## Q6: Course Schedule — Cycle Detection in Directed Graph
*(Tests topological sort + DFS)*

```js
function canFinish(numCourses, prerequisites) {
  const graph = Array.from({ length: numCourses }, () => []);
  for (const [course, pre] of prerequisites) graph[pre].push(course);

  // 0 = unvisited, 1 = visiting (in current DFS path), 2 = done
  const state = new Array(numCourses).fill(0);

  function hasCycle(node) {
    if (state[node] === 1) return true;  // back edge = cycle
    if (state[node] === 2) return false; // already processed

    state[node] = 1;
    for (const neighbor of graph[node]) {
      if (hasCycle(neighbor)) return true;
    }
    state[node] = 2;
    return false;
  }

  for (let i = 0; i < numCourses; i++) {
    if (hasCycle(i)) return false;
  }
  return true;
}
```

**Time:** O(V + E)  
**Space:** O(V + E) for graph + O(V) for state

---

## Q7: Word Ladder (BFS Shortest Path)

```js
function ladderLength(beginWord, endWord, wordList) {
  const wordSet = new Set(wordList);
  if (!wordSet.has(endWord)) return 0;

  const queue = [[beginWord, 1]];
  const visited = new Set([beginWord]);

  while (queue.length) {
    const [word, steps] = queue.shift();
    for (let i = 0; i < word.length; i++) {
      for (let c = 97; c <= 122; c++) { // 'a' to 'z'
        const newWord = word.slice(0, i) + String.fromCharCode(c) + word.slice(i + 1);
        if (newWord === endWord) return steps + 1;
        if (wordSet.has(newWord) && !visited.has(newWord)) {
          visited.add(newWord);
          queue.push([newWord, steps + 1]);
        }
      }
    }
  }
  return 0;
}
```

**Time:** O(M² × N) where M = word length, N = wordList size  
**Space:** O(M² × N)

---

## Patterns Summary — Know By Heart

| Pattern | When to use | Complexity |
|---------|-------------|-----------|
| Sliding window | Contiguous subarray/substring with constraint | O(n) |
| Two pointers | Sorted array pair problems | O(n) |
| BFS | Shortest path, level order, multi-source spread | O(V+E) |
| DFS | Connectivity, paths, backtracking, cycle detection | O(V+E) |
| Monotonic stack | Next greater/smaller element | O(n) |
| Binary search on answer | "Find minimum X such that..." | O(n log n) |
| Backtracking | All combinations/permutations/subsets | O(2^n) or O(n!) |
| DP | Optimal substructure + overlapping subproblems | varies |

---

## Code Quality Checklist for This Round

- [ ] Handle empty/null input first
- [ ] Use descriptive variable names (`left`/`right` not `i`/`j` for two pointers)
- [ ] State time/space complexity out loud
- [ ] Test with the given example AND one edge case
- [ ] If you get stuck: state the approach first, then code — partial credit counts
