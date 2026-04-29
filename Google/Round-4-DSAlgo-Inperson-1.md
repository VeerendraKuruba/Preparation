# Round 4 — Coding / DS & Algo In-Person #1 (Stage 2, Bangalore/Hyderabad, 45 mins)

> First in-person coding round. Typically harder than the virtual round.
> Interviewer may push you with follow-ups and complexity challenges.
> Write on whiteboard OR shared laptop — know how to code without IDE.

---

## What Changes In-Person

- **Whiteboard coding**: no autocomplete, no syntax highlighting — write legibly, use pseudocode first
- **Face-to-face pressure**: interviewer can see your facial expressions and hesitation — stay calm
- **Follow-up depth**: expect "can you optimize this?", "what if the input is a stream?", "what if memory is limited?"
- **Two rounds back-to-back**: manage your energy — don't overthink Round 4 or you'll be drained for Round 5

---

## High-Frequency Topics for In-Person Rounds at Google

- **Trees** (traversals, paths, LCA, BST)
- **Graphs** (BFS/DFS, topological sort, shortest path)
- **Dynamic Programming** (1D, 2D, memoization)
- **Strings** (sliding window, two pointers, pattern matching)

---

## Q1: Binary Tree Maximum Path Sum (Hard — Trees)
*(Commonly asked at Google in-person rounds)*

**Problem:** A path in a binary tree is a sequence of nodes with no node appearing twice. Find the maximum path sum (path can start and end at any node).

```js
function maxPathSum(root) {
  let maxSum = -Infinity;

  function dfs(node) {
    if (!node) return 0;
    // Only take positive contributions from children
    const left = Math.max(0, dfs(node.left));
    const right = Math.max(0, dfs(node.right));

    // Update global max: path through this node
    maxSum = Math.max(maxSum, node.val + left + right);

    // Return max gain if we include this node as part of a path going up
    return node.val + Math.max(left, right);
  }

  dfs(root);
  return maxSum;
}

// Tree: [-10, 9, 20, null, null, 15, 7]
// Max path: 15 → 20 → 7 = 42
```

**Time:** O(n) — visit each node once  
**Space:** O(h) — recursion depth (h = tree height)

**Key insight to explain:** At each node we consider two cases:
1. The path passes through this node connecting left and right subtrees (update global max)
2. The path extends upward — we can only extend via one child (return value)

---

## Q2: Serialize and Deserialize Binary Tree (Hard — Trees)
*(Asked at Google — tests encoding/decoding design)*

```js
function serialize(root) {
  const result = [];
  function dfs(node) {
    if (!node) { result.push('null'); return; }
    result.push(String(node.val));
    dfs(node.left);
    dfs(node.right);
  }
  dfs(root);
  return result.join(',');
}

function deserialize(data) {
  const nodes = data.split(',');
  let idx = 0;

  function build() {
    if (nodes[idx] === 'null') { idx++; return null; }
    const node = new TreeNode(Number(nodes[idx++]));
    node.left = build();
    node.right = build();
    return node;
  }

  return build();
}
```

**Time:** O(n) for both  
**Space:** O(n) for the string + O(h) recursion

**Follow-up:** "Can you serialize more compactly?"
- Use BFS (level-order) — more intuitive, avoids deep recursion for skewed trees
- Use indices instead of 'null' markers for a perfect binary tree

---

## Q3: Longest Increasing Subsequence — O(n log n)
*(DP with binary search optimization — Google loves this)*

**Naive DP — O(n²):**
```js
function lisNaive(nums) {
  const dp = new Array(nums.length).fill(1);
  for (let i = 1; i < nums.length; i++)
    for (let j = 0; j < i; j++)
      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1);
  return Math.max(...dp);
}
```

**Optimized — O(n log n) using patience sorting:**
```js
function lengthOfLIS(nums) {
  const tails = []; // tails[i] = smallest tail of LIS of length i+1

  for (const num of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < num) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = num; // replace or extend
  }

  return tails.length;
}

// [10,9,2,5,3,7,101,18] → 4 ([2,3,7,101] or [2,5,7,101])
```

**Time:** O(n log n) — binary search per element  
**Space:** O(n)

**Why this works (explain to interviewer):**
`tails` doesn't store the actual LIS, but its length is always correct. We maintain the invariant that `tails` is sorted, so binary search finds the insertion point.

---

## Q4: Sliding Window Maximum (Hard — Deque/Monotonic Queue)
*(Tests knowledge of monotonic data structures)*

```js
function maxSlidingWindow(nums, k) {
  const deque = []; // stores INDICES, maintains decreasing order of values
  const result = [];

  for (let i = 0; i < nums.length; i++) {
    // Remove elements outside the window
    if (deque.length && deque[0] < i - k + 1) deque.shift();

    // Remove elements smaller than current (they can never be max)
    while (deque.length && nums[deque[deque.length - 1]] < nums[i]) deque.pop();

    deque.push(i);

    // Window is full — record max (front of deque)
    if (i >= k - 1) result.push(nums[deque[0]]);
  }

  return result;
}

// [1,3,-1,-3,5,3,6,7], k=3 → [3,3,5,5,6,7]
```

**Time:** O(n) — each element enters and exits deque once  
**Space:** O(k)

**Follow-up:** "What if k changes dynamically?"
- Maintain the same structure, just update k as needed per query

---

## Q5: Decode Ways (DP — Strings)
*(Tests 1D DP with string parsing)*

```js
function numDecodings(s) {
  if (!s || s[0] === '0') return 0;
  const n = s.length;
  // dp[i] = number of ways to decode s[0..i-1]
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1; // empty string
  dp[1] = 1; // single non-zero digit

  for (let i = 2; i <= n; i++) {
    const oneDigit = Number(s[i - 1]);
    const twoDigit = Number(s.slice(i - 2, i));

    if (oneDigit >= 1) dp[i] += dp[i - 1];
    if (twoDigit >= 10 && twoDigit <= 26) dp[i] += dp[i - 2];
  }

  return dp[n];
}

// "226" → 3 ("2 2 6", "22 6", "2 26")
// "06" → 0 (invalid)
```

**Time:** O(n)  
**Space:** O(n) → can optimize to O(1) with two variables

---

## Q6: Minimum Window Substring (Hard — Sliding Window)

```js
function minWindow(s, t) {
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);

  let have = 0, required = need.size;
  let left = 0, minLen = Infinity, minLeft = 0;
  const window = new Map();

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window.set(c, (window.get(c) || 0) + 1);
    if (need.has(c) && window.get(c) === need.get(c)) have++;

    while (have === required) {
      if (right - left + 1 < minLen) {
        minLen = right - left + 1;
        minLeft = left;
      }
      const lc = s[left++];
      window.set(lc, window.get(lc) - 1);
      if (need.has(lc) && window.get(lc) < need.get(lc)) have--;
    }
  }

  return minLen === Infinity ? '' : s.slice(minLeft, minLeft + minLen);
}

// s="ADOBECODEBANC", t="ABC" → "BANC"
```

**Time:** O(|s| + |t|)  
**Space:** O(|s| + |t|)

---

## Q7: Pacific Atlantic Water Flow (Multi-source BFS — Graphs)

```js
function pacificAtlantic(heights) {
  const rows = heights.length, cols = heights[0].length;
  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];

  function bfs(starts) {
    const visited = new Set(starts.map(([r,c]) => r * cols + c));
    const queue = [...starts];
    while (queue.length) {
      const [r, c] = queue.shift();
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        const key = nr * cols + nc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols
            && !visited.has(key)
            && heights[nr][nc] >= heights[r][c]) { // flow reversed: uphill
          visited.add(key);
          queue.push([nr, nc]);
        }
      }
    }
    return visited;
  }

  const pacificStarts = [], atlanticStarts = [];
  for (let r = 0; r < rows; r++) {
    pacificStarts.push([r, 0]);
    atlanticStarts.push([r, cols - 1]);
  }
  for (let c = 0; c < cols; c++) {
    pacificStarts.push([0, c]);
    atlanticStarts.push([rows - 1, c]);
  }

  const pacific = bfs(pacificStarts);
  const atlantic = bfs(atlanticStarts);

  return [...pacific].filter(key => atlantic.has(key))
    .map(key => [Math.floor(key / cols), key % cols]);
}
```

**Time:** O(m × n)  
**Space:** O(m × n)

---

## Whiteboard Coding Tips

1. **Write the function signature first** — shows you understand input/output
2. **Comment your approach** in 2 lines before writing code
3. **Leave space** between lines — you'll need to insert edge case handling
4. **Read your code aloud** once before saying "done"
5. **If you make a mistake**, cross it out cleanly and rewrite — don't erase everything
6. **Use meaningful names** even on whiteboard — `left/right` not `l/r`

---

## Common Follow-Up Questions for This Round

After you solve the problem, be ready for:
- "What's the time and space complexity?"
- "Can you do it in O(1) space?"
- "What if the input is a stream? (you can't store it all)"
- "What if the tree is extremely deep?" (stack overflow risk → use iterative)
- "How would you test this?" (mention: empty input, single element, all negatives, all same)
