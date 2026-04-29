# DSA Questions — Google Frontend Engineer

> Use JavaScript for all solutions. Google DSA rounds expect idiomatic JS.
> Complexity analysis is mandatory — state it before and after each optimization.

---

## Arrays & Strings (Appear in ~100% of loops)

### Questions Asked at Google

1. **Two Sum** (LC 1) — Hash map, O(n)
2. **3Sum** (LC 15) — Sort + two pointers
3. **Product of Array Except Self** (LC 238) — Prefix/suffix without division
4. **Maximum Subarray** (LC 53) — Kadane's algorithm
5. **Merge Intervals** (LC 56) — Sort + greedy merge
6. **Longest Substring Without Repeating Characters** (LC 3) — Sliding window
7. **Longest Substring with K Unique Characters** — Sliding window variant (asked in 2024 onsite)
8. **Find All Subsets with Given Sum** — Backtracking (asked in April 2025 Google L4 FE round)
9. **Trapping Rain Water** (LC 42) — Two pointer
10. **Rotate Image** (LC 48) — In-place matrix rotation
11. **Spiral Matrix** (LC 54) — Boundary shrink

### Key Patterns
- **Two Pointer**: sorted arrays, palindromes, pair sums
- **Sliding Window**: substrings, subarrays with a constraint
- **Prefix Sum**: range queries, subarray sums
- **Binary Search**: sorted arrays, search space problems

---

## Linked Lists

1. **Reverse a Linked List** (LC 206) — iterative and recursive
2. **Detect Cycle** (LC 141) — Floyd's fast/slow pointer
3. **Merge Two Sorted Lists** (LC 21)
4. **LRU Cache** (LC 146) — HashMap + Doubly Linked List (very common at Google)
5. **Copy List with Random Pointer** (LC 138)

---

## Stacks & Queues

1. **Valid Parentheses** (LC 20)
2. **Min Stack** (LC 155)
3. **Daily Temperatures** (LC 739) — Monotonic stack
4. **Largest Rectangle in Histogram** (LC 84)
5. **Sliding Window Maximum** (LC 239) — Deque

---

## Trees (Appear in ~70% of loops)

1. **Binary Tree Level Order Traversal** (LC 102) — BFS
2. **Maximum Depth of Binary Tree** (LC 104)
3. **Validate Binary Search Tree** (LC 98)
4. **Lowest Common Ancestor** (LC 236)
5. **Binary Tree Right Side View** (LC 199)
6. **Serialize and Deserialize Binary Tree** (LC 297) — Hard, asked at L5+
7. **Path Sum II** (LC 113) — DFS + backtracking

---

## Graphs (Appear in ~76% of Google onsite loops at L4+)

### Questions Confirmed at Google

1. **Number of Islands** (LC 200) — BFS/DFS grid traversal
2. **Find Connected Components / Count Lakes** — Grid DFS (explicitly mentioned in Google reports)
3. **Word Ladder** (LC 127) — BFS shortest path
4. **Clone Graph** (LC 133)
5. **Course Schedule** (LC 207) — Topological sort / cycle detection
6. **Pacific Atlantic Water Flow** (LC 417) — Multi-source BFS
7. **Shortest Path in Binary Matrix** (LC 1091) — BFS
8. **Minimum Spanning Tree** — Prim's / Kruskal's (conceptual)

### Graph Tips for Google
```js
// BFS template
function bfs(graph, start) {
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const node = queue.shift();
    for (const neighbor of graph[node] || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
}

// DFS template (iterative)
function dfs(graph, start) {
  const visited = new Set();
  const stack = [start];
  while (stack.length) {
    const node = stack.pop();
    if (visited.has(node)) continue;
    visited.add(node);
    for (const neighbor of graph[node] || []) stack.push(neighbor);
  }
}
```
- Know when to pick **BFS** (shortest path, level order) vs **DFS** (connectivity, backtracking)
- Use **adjacency list (Map)** over adjacency matrix for sparse graphs
- Be ready to explain hybrid BFS+DFS approaches

---

## Heaps & Priority Queues

1. **Kth Largest Element in Array** (LC 215) — Min-heap of size K
2. **Top K Frequent Elements** (LC 347) — Heap / bucket sort
3. **Merge K Sorted Lists** (LC 23) — Min-heap
4. **Find Median from Data Stream** (LC 295) — Two heaps (asked for acknowledgment system stream processing)
5. **Task Scheduler** (LC 621) — Max heap

> JS has no built-in heap — implement MinHeap class or use sorted array for interviews.

---

## Hash Tables

1. **Group Anagrams** (LC 49)
2. **Subarray Sum Equals K** (LC 560) — Prefix sum + hash map
3. **Longest Consecutive Sequence** (LC 128)
4. **4Sum II** (LC 454)
5. **First Missing Positive** (LC 41) — In-place hashing

---

## Dynamic Programming (Appear in ~20% of rounds)

### Google DP Questions

1. **Climbing Stairs / Fibonacci** — Memoization + tabulation
2. **House Robber** (LC 198)
3. **Longest Increasing Subsequence** (LC 300) — O(n log n) patience sorting
4. **0/1 Knapsack** — Classic DP
5. **Word Break** (LC 139) — DP + Trie optimization
6. **Edit Distance** (LC 72) — 2D DP
7. **Coin Change** (LC 322)
8. **Unique Paths** (LC 62)
9. **Decode Ways** (LC 91)
10. **Phone Directory / Password Generation** — DP + Trie (mentioned explicitly in Google prep context)

### DP Interview Template
```
1. Define state: dp[i] = "what does this mean?"
2. Base case
3. Recurrence relation
4. Iteration order
5. Extract answer
6. Optimize space if possible
```

---

## Recursion & Backtracking

1. **Permutations** (LC 46)
2. **Subsets** (LC 78)
3. **Combination Sum** (LC 39)
4. **N-Queens** (LC 51)
5. **Generate Parentheses** (LC 22)
6. **Word Search** (LC 79) — DFS on grid

---

## Binary Search

1. **Binary Search** (LC 704) — Know the exact template
2. **Search in Rotated Sorted Array** (LC 33)
3. **Find First and Last Position** (LC 34)
4. **Median of Two Sorted Arrays** (LC 4) — Hard
5. **Koko Eating Bananas** (LC 875) — Binary search on answer

```js
// Standard binary search template
function binarySearch(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] === target) return mid;
    else if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
```

---

## Complexity Quick Reference

| Algorithm | Time | Space |
|-----------|------|-------|
| BFS/DFS graph | O(V+E) | O(V) |
| Merge Sort | O(n log n) | O(n) |
| Quick Sort | O(n log n) avg | O(log n) |
| Heap operations | O(log n) | — |
| Binary Search | O(log n) | O(1) |
| DP (2D) | O(m*n) | O(m*n) → O(n) |
| Hash map ops | O(1) avg | O(n) |
