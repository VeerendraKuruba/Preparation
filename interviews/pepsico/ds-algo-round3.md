# PepsiCo — Principal Frontend Engineer: DS/Algo Round (Round 3)

> Status: Online Assessment ✅ | Tech Screening ✅ | DS/Algo Round ← You are here

---

## What to Expect

- Duration: ~60–90 min
- Format: Live coding (CoderPad / shared editor) + explanation
- Difficulty: Medium → Medium-Hard (LeetCode scale)
- Language: JavaScript preferred (they may let you choose)
- ~2 coding problems + follow-up optimization questions
- Expect: "What's the time/space complexity?" after every solution
- At principal level: expect you to spot edge cases and optimize unprompted

---

## Confirmed Questions Asked at PepsiCo (Aggregated from LeetCode + desiqna.in)

These were explicitly mentioned across multiple real interview reports:

| Problem | Type | Difficulty | Source |
|---|---|---|---|
| Tree BFS Traversal (build tree + test) | Tree | Medium | desiqna.in Lead SWE |
| Substring DP + Backtracking (Word Break / Palindrome Partition) | DP | Medium-Hard | desiqna.in Lead SWE |
| Left View of Binary Tree | Tree | Easy-Medium | LeetCode discuss Hyderabad |
| Merge Sort implementation | Sorting | Medium | LeetCode discuss |
| URL Shortener (System Design) | Design | — | LeetCode discuss |
| WhatsApp-like Communication System | System Design | — | desiqna.in |

---

## Mettle OA Format (What to Expect in Online Assessment)

PepsiCo uses **Mettle** for OA (not HackerRank). Format observed:
- Frontend MCQ section: HTML/CSS, JS concepts, browser APIs
- Problem solving section: 1-2 coding problems (medium difficulty)
- Time-boxed per section

**MCQ topics confirmed covered:**
- CSS specificity, box model, flexbox/grid
- JS: hoisting, closures, `this`, event loop, promises
- Browser: DOM events, event delegation, debounce/throttle
- React: reconciliation, hooks rules, component lifecycle

---

## JavaScript Conceptual Questions (Asked as Warm-Up or MCQ)

These are high-probability before or alongside coding problems. At principal level, expect deep follow-ups.

---

### JS1. What is the event loop? How does it work?

```
Call Stack → Web APIs → Callback Queue → Microtask Queue
```

**Execution order:**
1. Synchronous code runs on the call stack
2. `setTimeout`/`setInterval` callbacks go to the Callback Queue (macrotask)
3. `Promise.then`, `queueMicrotask`, `MutationObserver` go to Microtask Queue
4. After each task, microtask queue drains completely before next macrotask

**Classic trick question:**
```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// Output: 1, 4, 3, 2
// Why: sync first (1,4) → microtask (3) → macrotask (2)
```

**Principal follow-up:** *"What's the difference between microtask and macrotask queues?"*
> Microtasks (Promises, queueMicrotask) drain completely after every task before the next macrotask runs. This means a recursive Promise chain can starve the render loop — it's why React batches state updates.

---

### JS2. Explain closures with a real-world example

A closure is a function that retains access to its outer scope even after the outer function has returned.

```js
function makeCounter(initial = 0) {
  let count = initial; // closed over
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}
const c = makeCounter(10);
c.increment(); c.increment();
console.log(c.value()); // 12
```

**Classic closure bug (and fix):**
```js
// BUG: all logs print 3
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}

// FIX 1: use let (block scope)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 0, 1, 2
}

// FIX 2: IIFE closure (older way)
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 100))(i);
}
```

**Real-world use:** module pattern, memoization, partial application, event handlers that remember state.

---

### JS3. What is `this` in JavaScript?

`this` is determined at call time, not definition time (except arrow functions).

| Context | `this` value |
|---|---|
| Global scope (non-strict) | `window` |
| Regular function call | `window` / `undefined` (strict) |
| Method call `obj.fn()` | `obj` |
| `new Fn()` | newly created object |
| Arrow function | inherits from enclosing scope |
| `call/apply/bind` | explicitly set |

```js
const obj = {
  name: 'PepsiCo',
  greet() { console.log(this.name); },         // 'PepsiCo'
  greetArrow: () => console.log(this.name),    // undefined (lexical this)
};

const fn = obj.greet;
fn(); // undefined — lost context

const bound = obj.greet.bind(obj);
bound(); // 'PepsiCo'
```

**Principal follow-up:** *"How does React handle `this` in class components vs hooks?"*
> Class components require `.bind(this)` or arrow class fields to avoid losing context in event handlers. Hooks use closures over state instead — no `this` at all. Arrow class fields are syntactic sugar that compiles to a bound method in the constructor.

---

### JS4. Promises — implement Promise.all, Promise.race from scratch

```js
// Promise.all — resolves when ALL resolve, rejects on first rejection
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let remaining = promises.length;
    if (!remaining) return resolve([]);

    promises.forEach((p, i) => {
      Promise.resolve(p).then(val => {
        results[i] = val;
        if (--remaining === 0) resolve(results);
      }).catch(reject);
    });
  });
}

// Promise.race — settles with first to settle
function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(p => Promise.resolve(p).then(resolve).catch(reject));
  });
}

// Promise.allSettled — waits for all, never rejects
function promiseAllSettled(promises) {
  return promiseAll(
    promises.map(p =>
      Promise.resolve(p)
        .then(value => ({ status: 'fulfilled', value }))
        .catch(reason => ({ status: 'rejected', reason }))
    )
  );
}
```

**Principal follow-up:** *"What's the difference between Promise.all and Promise.allSettled?"*
> `Promise.all` short-circuits on first rejection — useful when all results are required (API calls with dependencies). `Promise.allSettled` always waits — useful for fire-and-forget parallel operations where you want all outcomes regardless (logging, cleanup tasks).

---

### JS5. Hoisting — `var` vs `let` vs `const` vs function declarations

```js
console.log(a); // undefined (var hoisted, not initialized)
var a = 5;

console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 5;      // TDZ — Temporal Dead Zone

foo(); // works — function declarations fully hoisted
function foo() { console.log('foo'); }

bar(); // TypeError: bar is not a function
var bar = function() {}; // var hoisted as undefined, not as function
```

**TDZ (Temporal Dead Zone):** `let`/`const` are hoisted but stay in TDZ until the declaration line is reached — accessing them throws a ReferenceError, which is safer than `var`'s silent `undefined`.

---

### JS6. Prototypal Inheritance

```js
// Every object has a [[Prototype]] chain ending at null
const animal = { breathe() { return 'breathing'; } };
const dog = Object.create(animal);
dog.bark = function() { return 'woof'; };

console.log(dog.breathe()); // found on animal via prototype chain
console.log(dog.hasOwnProperty('bark')); // true
console.log(dog.hasOwnProperty('breathe')); // false — inherited

// Class syntax is sugar over this
class Animal { breathe() { return 'breathing'; } }
class Dog extends Animal { bark() { return 'woof'; } }
// Dog.prototype.__proto__ === Animal.prototype
```

**Principal follow-up:** *"How does `instanceof` work?"*
> It walks the prototype chain of the object checking if `Constructor.prototype` appears anywhere. So `dog instanceof Animal` is true because `Dog.prototype.__proto__ === Animal.prototype`.

---

### JS7. Left View of Binary Tree (Confirmed Asked at PepsiCo)

**Problem:** Print the first node visible from the left side at each level.

```js
function leftView(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];

  while (queue.length) {
    const size = queue.length;
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      if (i === 0) result.push(node.val); // first node of each level
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
  }
  return result;
}

// DFS approach (recursive)
function leftViewDFS(root, level = 0, result = []) {
  if (!root) return result;
  if (result.length === level) result.push(root.val); // first visit at this depth
  leftViewDFS(root.left, level + 1, result);
  leftViewDFS(root.right, level + 1, result);
  return result;
}

// Tests
const tree = buildTree([1, 2, 3, 4, 5, null, 6]);
console.assert(JSON.stringify(leftView(tree)) === JSON.stringify([1, 2, 4]), 'Test 1');
console.assert(JSON.stringify(leftView(null)) === JSON.stringify([]), 'Test 2 — null root');
```

**Complexity:** Time O(n), Space O(n) for queue

**Variants:** Right view → take last node of each level; Top view, Bottom view → track horizontal distance

---

### JS8. Merge Sort Implementation (Confirmed Asked at PepsiCo)

```js
function mergeSort(arr) {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return result.concat(left.slice(i)).concat(right.slice(j));
}

// Tests
console.assert(JSON.stringify(mergeSort([3,1,4,1,5,9,2,6])) === JSON.stringify([1,1,2,3,4,5,6,9]));
console.assert(JSON.stringify(mergeSort([])) === JSON.stringify([]));
console.assert(JSON.stringify(mergeSort([1])) === JSON.stringify([1]));
```

**Complexity:** Time O(n log n) all cases, Space O(n) — stable sort

**Why merge sort over quicksort?** Stable, guaranteed O(n log n), better for linked lists and external sort. Quicksort has O(n²) worst case without good pivot selection.

**Follow-up:** *"How would you sort a nearly-sorted array efficiently?"* → Insertion sort O(n) for nearly sorted, or Timsort (what JS `Array.sort` uses) which combines merge + insertion.

---

## Real Interview Experience (Source: desiqna.in)

> PepsiCo | Lead Software Engineer | Frontend | 2023
> The process at Lead level is very similar to Principal — Principal will just have harder variants.

### Process Overview (Lead level — expect 1 more round at Principal)

| Round | Type | Duration | What They Asked |
|---|---|---|---|
| OA | Mettle test | ~60 min | Frontend MCQs + Problem Solving |
| R1 | Problem Solving | 60 min | Tree BFS + Substring (DP + Backtracking) |
| R2 | System Design | 60 min | WhatsApp-like communication system |
| R3 | Hiring Manager | 60 min | Resume + Scenario/Behavioral |
| R4 | HR | ~30 min | Comp + Role expectations |

**Your current position:** You've cleared OA + Tech Screening → You're heading into the Problem Solving round (R1 equivalent).

---

### Actual Questions Asked (R1 — Problem Solving)

#### Question 1: Tree BFS Traversal
- Asked to **create the tree structure from scratch** (no pre-built node class)
- Then implement BFS traversal on it
- **Had to write test cases** and validate output — not just solve the algorithm

**What this means for you:**
- Don't just know the algorithm — know how to build `class TreeNode` and populate a tree
- Be ready to write `console.assert` style checks or a manual test runner

**Full prep:**
```js
class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Build tree from array (level-order) — interviewers often ask this too
function buildTree(arr) {
  if (!arr.length) return null;
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  while (queue.length && i < arr.length) {
    const node = queue.shift();
    if (arr[i] != null) { node.left = new TreeNode(arr[i]); queue.push(node.left); }
    i++;
    if (i < arr.length && arr[i] != null) { node.right = new TreeNode(arr[i]); queue.push(node.right); }
    i++;
  }
  return root;
}

function levelOrder(root) {
  if (!root) return [];
  const result = [], queue = [root];
  while (queue.length) {
    const size = queue.length;
    const level = [];
    for (let i = 0; i < size; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}

// Test cases — write these in the interview
const tree = buildTree([3, 9, 20, null, null, 15, 7]);
console.assert(JSON.stringify(levelOrder(tree)) === JSON.stringify([[3],[9,20],[15,7]]), 'Test 1 failed');
console.assert(JSON.stringify(levelOrder(null)) === JSON.stringify([]), 'Test 2 failed');
console.assert(JSON.stringify(levelOrder(buildTree([1]))) === JSON.stringify([[1]]), 'Test 3 failed');
console.log('All tests passed');
```

---

#### Question 2: Substring Problem — DP + Backtracking
- Described as **"way complex despite looking simple"**
- Solved iteratively (avoided recursion to handle edge case)
- One edge case failed first; resolved with interviewer hint

**Most likely problem: Word Break** (LC 139) or **Palindrome Partitioning** (LC 131)

**Word Break (DP approach):**
```js
// "Given a string and a dictionary, can the string be segmented into dict words?"
// "leetcode" + ["leet","code"] → true
function wordBreak(s, wordDict) {
  const set = new Set(wordDict);
  const dp = new Array(s.length + 1).fill(false);
  dp[0] = true; // empty string is always valid

  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && set.has(s.slice(j, i))) {
        dp[i] = true;
        break;
      }
    }
  }
  return dp[s.length];
}

// Tests
console.assert(wordBreak("leetcode", ["leet","code"]) === true, 'Test 1 failed');
console.assert(wordBreak("applepenapple", ["apple","pen"]) === true, 'Test 2 failed');
console.assert(wordBreak("catsandog", ["cats","dog","sand","and","cat"]) === false, 'Test 3 failed');
console.assert(wordBreak("", ["a"]) === true, 'Edge: empty string failed');
```

**Palindrome Partitioning (Backtracking — LC 131):**
```js
// "Partition string such that every substring is a palindrome. Return all partitions."
// "aab" → [["a","a","b"],["aa","b"]]
function partition(s) {
  const result = [];

  function isPalin(str, l, r) {
    while (l < r) { if (str[l++] !== str[r--]) return false; }
    return true;
  }

  function backtrack(start, path) {
    if (start === s.length) { result.push([...path]); return; }
    for (let end = start + 1; end <= s.length; end++) {
      if (isPalin(s, start, end - 1)) {
        path.push(s.slice(start, end));
        backtrack(end, path);
        path.pop();
      }
    }
  }

  backtrack(0, []);
  return result;
}

// Tests
console.assert(JSON.stringify(partition("aab")) === JSON.stringify([["a","a","b"],["aa","b"]]), 'Test 1 failed');
console.assert(JSON.stringify(partition("a")) === JSON.stringify([["a"]]), 'Test 2 failed');
```

**Edge case that trips people up:** empty string, single character, string with no valid partition.

---

### Key Takeaways from Real Experience

1. **Build the data structure yourself** — don't assume TreeNode class exists; write it
2. **Write test cases during the interview** — they explicitly asked for it
3. **Iterative beats recursive** when an edge case fails — easier to debug in live coding
4. **One hint is normal** — they're not looking for perfection, they're checking how you respond to feedback
5. **System Design will cover real-time** — know WebSockets, polling, SSE tradeoffs (see R2 above)

---

## Priority Topics (Frontend-Weighted)

### 🔴 Must Know
| Topic | Why It Matters for Frontend |
|---|---|
| Arrays & Strings | Most common; used in data manipulation |
| Hash Maps / Sets | Frequency counts, deduplication, lookups |
| Trees (BFS/DFS) | DOM is a tree — very likely to appear |
| Sliding Window | Substring problems, throttle/debounce logic |
| Two Pointers | Sorted arrays, palindrome, container problems |
| Recursion | Tree traversal, component trees |

### 🟡 Should Know (Principal Level)
| Topic | Notes |
|---|---|
| Graphs (BFS/DFS) | Dependency resolution, route finding |
| Binary Search | Rotated arrays, search in answer space |
| Stack / Queue | Balanced parentheses, BFS, undo/redo |
| Linked Lists | Less common but possible |
| Sorting | Merge sort, custom comparators |

### 🟢 Nice to Know
- Dynamic Programming (simpler 1D problems: climb stairs, house robber)
- Tries (autocomplete — very frontend-relevant!)
- Heap/Priority Queue (top-K elements)

---

## High-Probability Question Patterns

### 1. Array / String Manipulation
- Two Sum, Three Sum
- Longest substring without repeating characters
- Valid anagram / group anagrams
- Product of array except self
- Rotate array / spiral matrix

### 2. Tree Problems (HIGH priority — DOM = tree)
- Binary tree level order traversal (BFS)
- Maximum depth of binary tree
- Lowest common ancestor
- Serialize and deserialize binary tree
- Path sum problems
- Flatten nested structure (mirrors flattening DOM)

### 3. Hash Map Problems
- Top K frequent elements
- Two sum / four sum
- Subarray sum equals K
- Longest consecutive sequence

### 4. Sliding Window / Two Pointers
- Minimum window substring
- Longest substring with K distinct chars
- Container with most water
- Move zeros / remove duplicates

### 5. Graph / BFS
- Number of islands
- Clone graph
- Word ladder
- Rotten oranges

### 6. Stack
- Valid parentheses
- Evaluate reverse Polish notation
- Min stack
- Daily temperatures

---

## Frontend-Specific DS Questions (High Chance)

These bridge DS/Algo with frontend context — expect at least one:

1. **Flatten nested array/object** — mirrors JSON parsing
2. **Deep clone an object** — recursive tree traversal
3. **Implement a trie for autocomplete**
4. **Parse and evaluate a math expression** — stack problem
5. **DOM traversal** — find all nodes matching a selector (BFS/DFS)
6. **LRU Cache** — linked list + hash map (classic principal-level question)
7. **Throttle / Debounce from scratch** — sliding window logic
8. **Virtual DOM diff algorithm** — tree diff (if they want to go deep)

---

## LeetCode Problems to Solve Before the Interview

### Easy (warm-up)
- [1] Two Sum
- [20] Valid Parentheses
- [104] Maximum Depth of Binary Tree
- [21] Merge Two Sorted Lists
- [206] Reverse Linked List

### Medium (main focus)
- [3] Longest Substring Without Repeating Characters
- [49] Group Anagrams ← already done ✅
- [102] Binary Tree Level Order Traversal
- [200] Number of Islands
- [238] Product of Array Except Self
- [146] LRU Cache ← principal-level classic
- [56] Merge Intervals
- [15] 3Sum
- [424] Longest Repeating Character Replacement
- [76] Minimum Window Substring
- [235] Lowest Common Ancestor of BST
- [98] Validate Binary Search Tree
- [297] Serialize and Deserialize Binary Tree

### Hard (stretch goals)
- [42] Trapping Rain Water
- [23] Merge K Sorted Lists
- [124] Binary Tree Maximum Path Sum

---

## JavaScript Patterns to Have Ready

```js
// BFS Template
function bfs(root) {
  const queue = [root];
  while (queue.length) {
    const node = queue.shift();
    // process node
    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
  }
}

// DFS Template (iterative)
function dfs(root) {
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    // process node
    if (node.right) stack.push(node.right);
    if (node.left) stack.push(node.left);
  }
}

// Sliding Window Template
function slidingWindow(s, k) {
  let left = 0, maxLen = 0;
  const map = new Map();
  for (let right = 0; right < s.length; right++) {
    map.set(s[right], (map.get(s[right]) || 0) + 1);
    while (/* window invalid */) {
      map.set(s[left], map.get(s[left]) - 1);
      left++;
    }
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}

// Two Pointers Template
function twoPointers(arr) {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    // process
    left++;
    right--;
  }
}
```

---

## Tips for Principal-Level Expectations

1. **Think out loud** — narrate your approach before coding
2. **Mention brute force first**, then optimize — shows problem-solving process
3. **Proactively state complexity** — O(n) time, O(1) space etc.
4. **Handle edge cases unprompted** — null inputs, empty arrays, single element
5. **Write clean JS** — use `const`/`let`, meaningful variable names, no `var`
6. **Ask clarifying questions** — "Can input be negative?", "Is array sorted?"
7. **Discuss trade-offs** — time vs space, readability vs performance

---

## Quick Complexity Cheat Sheet

| Operation | Array | Hash Map | BST | Heap |
|---|---|---|---|---|
| Access | O(1) | O(1) | O(log n) | O(1) top |
| Search | O(n) | O(1) | O(log n) | O(n) |
| Insert | O(n) | O(1) | O(log n) | O(log n) |
| Delete | O(n) | O(1) | O(log n) | O(log n) |

---

## Q&A — Detailed Problem Walkthroughs

---

### Q1. Two Sum
**Problem:** Given an array of integers and a target, return indices of the two numbers that add up to target.

**Clarify first:**
- Can there be duplicates? Yes
- Exactly one solution guaranteed? Yes (per LC constraints)
- Can I use the same element twice? No

**Approach:**
- Brute force: O(n²) — nested loops, check every pair
- Optimal: Single pass hash map — store `complement = target - nums[i]`, check if it exists

```js
function twoSum(nums, target) {
  const seen = new Map(); // value → index
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) return [seen.get(complement), i];
    seen.set(nums[i], i);
  }
}
```

**Edge cases:** negative numbers ✓, target = 0 ✓, same value twice (e.g. [3,3], target=6) ✓ — map stores index so it still works

**Complexity:** Time O(n), Space O(n)

**Follow-ups the interviewer will ask:**
- *"What if we want all pairs, not just one?"* → remove early return, collect all
- *"What if the array is sorted?"* → Two pointers, O(1) space
- *"What about Three Sum?"* → Sort + fix one, two-pointer for the rest, O(n²)

---

### Q2. Longest Substring Without Repeating Characters
**Problem:** Find length of longest substring with all unique characters.

**Approach:** Sliding window — expand right, shrink left when duplicate found.

```js
function lengthOfLongestSubstring(s) {
  const seen = new Map(); // char → last index
  let left = 0, maxLen = 0;

  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (seen.has(char) && seen.get(char) >= left) {
      left = seen.get(char) + 1; // jump left past the duplicate
    }
    seen.set(char, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }
  return maxLen;
}
```

**Edge cases:** empty string → 0, all same chars → 1, all unique → full length

**Complexity:** Time O(n), Space O(min(n, charset))

**Follow-ups:**
- *"What if only lowercase letters?"* → use array[26] instead of Map, O(1) space
- *"At most K distinct characters?"* → track count in map, shrink when `map.size > k`

---

### Q3. Group Anagrams ✅ (already solved)
**Problem:** Group strings that are anagrams of each other.

**Approach:** Sort each word as key → group into hash map.

```js
function groupAnagrams(strs) {
  const map = new Map();
  for (const str of strs) {
    const key = str.split('').sort().join('');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(str);
  }
  return [...map.values()];
}
```

**Optimal approach (no sort):** Use char frequency array as key — O(n * k) vs O(n * k log k)

```js
function groupAnagrams(strs) {
  const map = new Map();
  for (const str of strs) {
    const count = new Array(26).fill(0);
    for (const c of str) count[c.charCodeAt(0) - 97]++;
    const key = count.join(',');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(str);
  }
  return [...map.values()];
}
```

**Complexity:** Time O(n * k), Space O(n * k) where k = avg string length

---

### Q4. Product of Array Except Self
**Problem:** Return array where each element is product of all others. No division. O(n) time.

**Approach:** Two passes — left products prefix, right products suffix.

```js
function productExceptSelf(nums) {
  const n = nums.length;
  const result = new Array(n).fill(1);

  // left pass: result[i] = product of everything to the left
  let leftProduct = 1;
  for (let i = 0; i < n; i++) {
    result[i] = leftProduct;
    leftProduct *= nums[i];
  }

  // right pass: multiply by product of everything to the right
  let rightProduct = 1;
  for (let i = n - 1; i >= 0; i--) {
    result[i] *= rightProduct;
    rightProduct *= nums[i];
  }

  return result;
}
// Example: [1,2,3,4] → [24,12,8,6]
```

**Edge cases:** zeros in array — if one zero: only the zero's position gets non-zero product; two zeros: all zeros

**Complexity:** Time O(n), Space O(1) extra (result array doesn't count)

**Follow-ups:**
- *"What if there's a zero?"* → walk through with [1,0,3] — result[1]=3, others=0 ✓
- *"What if division was allowed?"* → total product / element, but breaks with zeros

---

### Q5. Binary Tree Level Order Traversal
**Problem:** Return nodes level by level as array of arrays.

**Approach:** BFS with queue. Track level size to batch process each level.

```js
function levelOrder(root) {
  if (!root) return [];
  const result = [];
  const queue = [root];

  while (queue.length) {
    const levelSize = queue.length; // snapshot current level
    const level = [];

    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      level.push(node.val);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    result.push(level);
  }
  return result;
}
```

**Edge cases:** null root → [], single node → [[val]], skewed tree works fine

**Complexity:** Time O(n), Space O(n) for queue (widest level)

**Follow-ups:**
- *"Zigzag order?"* → alternate direction of push per level (use flag + reverse odd levels)
- *"Right side view?"* → take last element of each level
- *"Average of each level?"* → sum level / levelSize

---

### Q6. Lowest Common Ancestor (BST)
**Problem:** Find LCA of two nodes p and q in a BST.

**Key insight:** In BST — if both p,q < node → go left. If both > node → go right. Otherwise current node IS the LCA.

```js
function lowestCommonAncestor(root, p, q) {
  let node = root;
  while (node) {
    if (p.val < node.val && q.val < node.val) {
      node = node.left;
    } else if (p.val > node.val && q.val > node.val) {
      node = node.right;
    } else {
      return node; // split point = LCA
    }
  }
}
```

**For generic Binary Tree (not BST):**

```js
function lowestCommonAncestor(root, p, q) {
  if (!root || root === p || root === q) return root;
  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);
  if (left && right) return root; // p in one subtree, q in other
  return left || right;
}
```

**Complexity:** BST O(h), Binary Tree O(n) — Space O(h) call stack

**Follow-ups:**
- *"What if one node might not exist in tree?"* → track found flags, return only if both found

---

### Q7. Number of Islands
**Problem:** Count connected groups of '1's in a 2D grid.

**Approach:** DFS flood-fill — when we find a '1', increment count and sink the island (mark visited as '0').

```js
function numIslands(grid) {
  let count = 0;

  function dfs(r, c) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] === '0') return;
    grid[r][c] = '0'; // sink it
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  }

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === '1') {
        count++;
        dfs(r, c);
      }
    }
  }
  return count;
}
```

**Edge cases:** empty grid, all water, all land (one island), single cell

**Complexity:** Time O(m*n), Space O(m*n) worst case call stack

**Follow-ups:**
- *"Can't mutate the grid?"* → use a visited Set with key `${r},${c}`
- *"BFS instead?"* → use queue, same flood-fill logic
- *"Max area of an island?"* → return size from dfs, track max

---

### Q8. Valid Parentheses
**Problem:** Check if string of `()[]{}` is valid (properly opened and closed).

**Approach:** Stack — push open brackets, pop and verify on close.

```js
function isValid(s) {
  const stack = [];
  const map = { ')': '(', ']': '[', '}': '{' };

  for (const char of s) {
    if (!map[char]) {
      stack.push(char); // opening bracket
    } else {
      if (stack.pop() !== map[char]) return false;
    }
  }
  return stack.length === 0;
}
```

**Edge cases:** empty string → true, single char → false, `([)]` → false (order matters)

**Complexity:** Time O(n), Space O(n)

**Follow-ups:**
- *"Minimum removals to make valid?"* → count unmatched open/close brackets
- *"Generate all valid combinations of n pairs?"* → backtracking

---

### Q9. LRU Cache (Principal-Level Classic)
**Problem:** Design a data structure that supports `get(key)` and `put(key, value)` in O(1), evicting Least Recently Used when capacity exceeded.

**Approach:** Doubly linked list (tracks order) + Hash Map (O(1) access)
- Most recent → head, Least recent → tail
- On get/put: move node to head
- On evict: remove tail

```js
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map(); // key → node
    // sentinel head/tail to avoid null checks
    this.head = { key: 0, val: 0, prev: null, next: null };
    this.tail = { key: 0, val: 0, prev: null, next: null };
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _insertFront(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    if (!this.map.has(key)) return -1;
    const node = this.map.get(key);
    this._remove(node);
    this._insertFront(node);
    return node.val;
  }

  put(key, value) {
    if (this.map.has(key)) {
      this._remove(this.map.get(key));
    }
    const node = { key, val: value, prev: null, next: null };
    this._insertFront(node);
    this.map.set(key, node);

    if (this.map.size > this.capacity) {
      const lru = this.tail.prev;
      this._remove(lru);
      this.map.delete(lru.key);
    }
  }
}
```

**Edge cases:** capacity 1, get on missing key → -1, update existing key

**Complexity:** Time O(1) both ops, Space O(capacity)

**Follow-ups:**
- *"Why not just use an array?"* → O(n) removal — defeats the purpose
- *"JS has Map which maintains insertion order — can you use that?"* → Yes! `Map` in JS preserves order, so you can use it as an ordered set. Move on access = delete + re-set.

```js
// Elegant JS-only solution using Map's insertion order
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, val); // move to end = most recent
    return val;
  }
  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      this.map.delete(this.map.keys().next().value); // delete first = LRU
    }
  }
}
```

---

### Q10. Minimum Window Substring
**Problem:** Find smallest window in s that contains all chars of t.

**Approach:** Sliding window with two frequency maps — expand right to satisfy, shrink left to minimize.

```js
function minWindow(s, t) {
  if (!s || !t || s.length < t.length) return '';

  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);

  let have = 0, required = need.size;
  let left = 0, minLen = Infinity, minStart = 0;
  const window = new Map();

  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    window.set(c, (window.get(c) || 0) + 1);

    if (need.has(c) && window.get(c) === need.get(c)) have++;

    while (have === required) {
      if (right - left + 1 < minLen) {
        minLen = right - left + 1;
        minStart = left;
      }
      const leftChar = s[left];
      window.set(leftChar, window.get(leftChar) - 1);
      if (need.has(leftChar) && window.get(leftChar) < need.get(leftChar)) have--;
      left++;
    }
  }
  return minLen === Infinity ? '' : s.slice(minStart, minStart + minLen);
}
```

**Edge cases:** t longer than s → '', t chars not in s → '', s === t → s

**Complexity:** Time O(s + t), Space O(s + t)

---

### Q11. Subarray Sum Equals K
**Problem:** Count number of subarrays with sum equal to k.

**Key insight:** Use prefix sum. If `prefixSum[j] - prefixSum[i] = k`, then subarray [i+1..j] sums to k.

```js
function subarraySum(nums, k) {
  const prefixCount = new Map([[0, 1]]); // sum → count; seed with 0
  let sum = 0, count = 0;

  for (const num of nums) {
    sum += num;
    if (prefixCount.has(sum - k)) count += prefixCount.get(sum - k);
    prefixCount.set(sum, (prefixCount.get(sum) || 0) + 1);
  }
  return count;
}
```

**Edge cases:** negative numbers ✓ (sliding window wouldn't work here), k = 0 ✓, single element equals k ✓

**Complexity:** Time O(n), Space O(n)

**Follow-ups:**
- *"Why can't we use sliding window?"* → negative numbers break the monotonic assumption

---

### Q12. Top K Frequent Elements
**Problem:** Return k most frequent elements in an array.

**Approach 1:** Sort by frequency — O(n log n)
**Approach 2:** Bucket sort — O(n) using frequency as index

```js
function topKFrequent(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1);

  // bucket[i] = list of numbers with frequency i
  const bucket = Array.from({ length: nums.length + 1 }, () => []);
  for (const [num, count] of freq) bucket[count].push(num);

  const result = [];
  for (let i = bucket.length - 1; i >= 0 && result.length < k; i--) {
    result.push(...bucket[i]);
  }
  return result.slice(0, k);
}
```

**Complexity:** Time O(n), Space O(n)

---

### Q13. Flatten Nested Array/Object (Frontend-Specific)
**Problem:** Flatten arbitrarily nested array. `[1, [2, [3, [4]]]] → [1,2,3,4]`

**Recursive:**
```js
function flatten(arr) {
  return arr.reduce((acc, val) =>
    Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val), []);
}
```

**Iterative (stack-based, avoids call stack overflow on deep nesting):**
```js
function flatten(arr) {
  const stack = [...arr];
  const result = [];
  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      stack.push(...item); // unpack back onto stack
    } else {
      result.unshift(item); // maintain order (or push + reverse at end)
    }
  }
  return result;
}
```

**Flatten nested object (for interview variation):**
```js
function flattenObject(obj, prefix = '', result = {}) {
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      flattenObject(obj[key], fullKey, result);
    } else {
      result[fullKey] = obj[key];
    }
  }
  return result;
}
// { a: { b: { c: 1 } } } → { 'a.b.c': 1 }
```

**Complexity:** Time O(n), Space O(depth) call stack

---

### Q14. Deep Clone an Object
**Problem:** Clone a nested object/array without reference sharing.

```js
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (Array.isArray(obj)) return obj.map(deepClone);

  const clone = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  return clone;
}
```

**Edge cases:** null → null, primitives → as-is, Date objects, circular references (need a WeakMap)

**Circular reference safe version:**
```js
function deepClone(obj, seen = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (seen.has(obj)) return seen.get(obj);
  const clone = Array.isArray(obj) ? [] : {};
  seen.set(obj, clone);
  for (const key of Object.keys(obj)) clone[key] = deepClone(obj[key], seen);
  return clone;
}
```

**Follow-ups:**
- *"Why not `JSON.parse(JSON.stringify(obj))`?"* → loses functions, undefined, Date becomes string, breaks on circular refs
- *"What about structuredClone?"* → built-in in modern browsers, handles circular refs and Date — use it in production, not in interviews

---

### Q15. DOM Traversal — Find All Nodes Matching Selector (Frontend-Specific)
**Problem:** Implement `querySelectorAll` for a single class name using BFS.

```js
function findByClass(root, className) {
  const result = [];
  const queue = [root];

  while (queue.length) {
    const node = queue.shift();
    if (node.classList && node.classList.contains(className)) {
      result.push(node);
    }
    queue.push(...(node.children || []));
  }
  return result;
}
```

**DFS version (returns in depth-first order):**
```js
function findByClass(node, className, result = []) {
  if (!node) return result;
  if (node.classList?.contains(className)) result.push(node);
  for (const child of node.children || []) findByClass(child, className, result);
  return result;
}
```

**Follow-ups:**
- *"How would you match nested selectors like `.parent .child`?"* → split by space, verify ancestor chain
- *"DFS vs BFS — which matches browser's querySelectorAll order?"* → DFS (depth-first, document order)

---

### Q16. Trapping Rain Water (Hard Stretch)
**Problem:** Given heights, compute total water trapped.

**Two pointer approach (optimal):**

```js
function trap(height) {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0, water = 0;

  while (left < right) {
    if (height[left] < height[right]) {
      height[left] >= leftMax ? (leftMax = height[left]) : (water += leftMax - height[left]);
      left++;
    } else {
      height[right] >= rightMax ? (rightMax = height[right]) : (water += rightMax - height[right]);
      right--;
    }
  }
  return water;
}
```

**Key insight:** Water at any position = min(maxLeft, maxRight) - height[i]. Two pointers let us know which side's max is the bottleneck.

**Complexity:** Time O(n), Space O(1)

---

### Q17. Merge Intervals
**Problem:** Merge overlapping intervals. `[[1,3],[2,6],[8,10]] → [[1,6],[8,10]]`

```js
function merge(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  const result = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const last = result[result.length - 1];
    const curr = intervals[i];
    if (curr[0] <= last[1]) {
      last[1] = Math.max(last[1], curr[1]); // extend
    } else {
      result.push(curr);
    }
  }
  return result;
}
```

**Edge cases:** single interval, all overlapping (one result), no overlap (same as input)

**Complexity:** Time O(n log n) sort, Space O(n)

---

### Common Follow-Up Questions at Principal Level

---

#### On Any Solution

---

**Q: "How would this behave with 1 billion elements? What breaks?"**

This is a scalability probe — they want to see you think beyond the algorithm itself.

What actually breaks:
- **Memory**: A hash map with 1B entries at ~50 bytes/entry = ~50GB RAM. Single machine can't hold it.
- **Call stack**: Recursive DFS on a tree of depth 1B → stack overflow. Node.js default stack ~10K frames.
- **Time**: O(n log n) sort on 1B elements takes minutes even if memory holds.

**How to answer well:**
> "For 1B elements I'd think about distributing the work. If it's a frequency count problem, I'd shard the data — partition by key hash across N machines, each machine builds a local map, then merge. This is essentially the MapReduce model. For tree problems with extreme depth, I'd convert recursion to iterative using an explicit stack on the heap, so I'm not limited by call stack size. I'd also consider streaming the data rather than loading it all at once — process chunks, maintain running state."

Key terms to drop: **sharding, MapReduce, streaming, pagination, chunking, external sort (merge sort on disk)**.

---

**Q: "How would you test this function?"**

Shows engineering maturity. Structure your answer in layers:

```
1. Unit tests — pure input/output
   - Happy path: normal valid input
   - Edge cases: empty, null, single element, max size
   - Boundary: duplicates, negatives, zeros, all-same values

2. Property-based tests (e.g. fast-check)
   - "For any array, twoSum result indices should be distinct"
   - "Flattened output length equals total leaf count"
   - Generate 1000 random inputs, verify invariants hold

3. Performance tests
   - Does it stay within time budget at n=100K?
   - Memory profiling — does it leak?

4. Regression tests
   - Pin the exact output for known tricky inputs
```

**Example answer for Two Sum:**
> "I'd test: empty array, array with one element, target not achievable, negative numbers, both numbers are the same value like [3,3] with target 6, and very large arrays. I'd also write a property test: pick any two indices, set target = their sum, verify the function returns those indices."

---

**Q: "Is this thread-safe?"**

JS is single-threaded — the event loop means only one piece of JS runs at a time, so race conditions on shared state don't happen in normal execution.

**But the follow-up they're probing for:**

> "However, if we move computation to Web Workers, each worker has its own memory — they communicate via `postMessage` which is serialized (structured clone). Shared state between workers requires `SharedArrayBuffer` + `Atomics`, which is where thread-safety becomes real. For example, two workers incrementing a counter on a SharedArrayBuffer simultaneously would need `Atomics.add()` to avoid lost updates."

**When it matters in frontend:**
- Incrementing a shared counter across workers
- Building a concurrent cache in a Service Worker
- Offloading hash map building to a worker, then merging results

**Answer template:**
> "Standard JS is single-threaded, so this function is inherently safe. If we parallelized with Workers sharing a `SharedArrayBuffer`, we'd need `Atomics` for any write operations to avoid race conditions. For this specific problem I'd prefer message-passing — each worker processes a shard and returns results — avoiding shared memory entirely."

---

**Q: "Can this be parallelized?"**

Show you understand the MapReduce pattern and where parallelism helps vs hurts.

**Framework:**
1. **Can the problem be split independently?** — Map phase: yes if each chunk doesn't depend on others
2. **Can partial results be merged?** — Reduce phase: merge local results into a global answer
3. **Is parallelism worth the overhead?** — For small n, coordination cost > gain

**For common problems:**

| Problem | Parallelizable? | How |
|---|---|---|
| Two Sum | Partially | Shard array across workers, each builds local map, broadcast and cross-check |
| Group Anagrams | Yes | Each worker processes a subset, merge maps by key |
| Number of Islands | Hard | Grid partitioning with border reconciliation — complex |
| Subarray Sum = K | Partially | Split array, but subarrays crossing boundaries need extra pass |
| Top K Frequent | Yes | Local frequency maps per shard → merge → final top-K with heap |

**Answer template:**
> "For top-K frequent, yes — classic map-reduce. Split the array across N workers, each builds a local frequency map, sends it back. The main thread merges by summing frequencies for each key, then picks top-K. This is O(n/N) per worker in parallel, then O(unique_keys) to merge. The communication overhead is bounded by the number of unique keys, not n."

---

#### On Tree Problems

---

**Q: "Iterative vs recursive — when would you choose each?"**

**Recursive — when to use:**
- Tree depth is bounded and small (e.g., balanced BST, depth ≤ log n)
- Code readability matters more than micro-optimization
- Interview context — cleaner to write and explain

**Iterative — when to use:**
- Deep or skewed trees (linked-list-style tree has depth n → stack overflow)
- Production code where input is untrusted/unbounded
- Tail recursion isn't optimized by the runtime (JS doesn't do TCO)

**Concrete threshold:**
> "Node.js has a default call stack of roughly 10,000–15,000 frames. A skewed tree of 15,000 nodes would overflow recursively. My rule: if depth is guaranteed O(log n) and n is bounded, recursion is fine. Otherwise, I convert to iterative with an explicit stack."

**Iterative DFS — the pattern:**
```js
function dfsIterative(root) {
  const stack = [[root, false]]; // [node, processed]
  while (stack.length) {
    const [node, processed] = stack.pop();
    if (!node) continue;
    if (processed) {
      // post-order logic here
    } else {
      stack.push([node, true]);       // revisit after children
      stack.push([node.right, false]);
      stack.push([node.left, false]);
    }
  }
}
```

---

**Q: "How would you handle a tree with millions of nodes?"**

- **Recursion** → convert to iterative to avoid stack overflow
- **Memory** → if tree doesn't fit in RAM, use disk-based B-tree structures (databases do this)
- **Traversal** → stream results instead of building a full result array; use a generator

```js
function* inorderGenerator(root) {
  const stack = [];
  let curr = root;
  while (curr || stack.length) {
    while (curr) { stack.push(curr); curr = curr.left; }
    curr = stack.pop();
    yield curr.val; // consumer pulls one at a time — no giant array
    curr = curr.right;
  }
}
```

---

#### On Hash Maps

---

**Q: "What's the worst case for hash map lookups?"**

Average case is O(1) but worst case is O(n) due to **hash collisions** — all keys map to the same bucket, degrading to a linked list traversal.

**How JS engines handle it:**
- V8 uses open addressing with linear probing for small maps, chaining for larger ones
- Load factor triggers rehashing (typically at ~75% capacity) → O(n) rehash but amortized O(1)

**Hash collision attacks:**
> "In server-side contexts, an attacker who knows the hash function can craft inputs that all collide — this causes O(n) lookups and is a DoS vector. Mitigated by using a randomized seed per-process (V8 does this with Map). This is why you should never use plain objects as hash maps for untrusted user keys in old JS — use `Map` instead, which has better collision resistance."

**When to use Map vs plain object `{}`:**

| | `{}` | `Map` |
|---|---|---|
| Key types | Strings/Symbols only | Any type |
| Prototype pollution | Risky (`__proto__` key) | Safe |
| Iteration order | Not guaranteed pre-ES2015 | Insertion order guaranteed |
| Size | `Object.keys().length` O(n) | `.size` O(1) |
| Performance | Slightly faster for string keys | Better for frequent add/delete |

---

**Q: "When would a hash map be the wrong choice?"**

- When you need **ordered traversal** by key → use a sorted structure (BST, sorted array + binary search)
- When keys are **integers in a small range** → plain array is faster (direct index)
- When **memory is extremely tight** → hash map has overhead per bucket; a sorted array with binary search uses less memory
- When you need **range queries** ("all keys between 10 and 20") → hash map can't do this; BST or skip list can

---

#### On Graphs

---

**Q: "How would you detect cycles?"**

**Undirected graph:**
```js
function hasCycle(graph) {
  const visited = new Set();

  function dfs(node, parent) {
    visited.add(node);
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, node)) return true;
      } else if (neighbor !== parent) {
        return true; // back edge = cycle
      }
    }
    return false;
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node) && dfs(node, null)) return true;
  }
  return false;
}
```

**Directed graph (3-color DFS):**
- White (0): unvisited
- Gray (1): in current DFS path (on the stack)
- Black (2): fully processed

```js
function hasCycleDirected(graph) {
  const color = {}; // 0=white, 1=gray, 2=black

  function dfs(node) {
    color[node] = 1; // gray — currently exploring
    for (const neighbor of graph[node] || []) {
      if (color[neighbor] === 1) return true; // back edge = cycle
      if (color[neighbor] !== 2 && dfs(neighbor)) return true;
    }
    color[node] = 2; // black — done
    return false;
  }

  for (const node of Object.keys(graph)) {
    if (!color[node] && dfs(node)) return true;
  }
  return false;
}
```

**Complexity:** Time O(V + E), Space O(V)

**Follow-up: "Where is cycle detection used in frontend?"**
> "Circular dependency detection in module bundlers like webpack/Rollup — they build a dependency graph and detect cycles, which cause undefined imports. Also in React's useEffect dependency arrays — while React doesn't explicitly cycle-detect, circular state updates can cause infinite render loops."

---

**Q: "BFS vs DFS — when would you pick each?"**

| Scenario | Pick |
|---|---|
| Shortest path (unweighted) | BFS — guarantees shortest path level by level |
| Detect if path exists | Either |
| Topological sort | DFS |
| Level-order / nearest neighbor | BFS |
| Memory-constrained, deep graph | DFS (stack vs queue) |
| Cycle detection in directed graph | DFS (gray/black coloring) |
| Find all connected components | Either |

**Memory comparison:**
- BFS queue holds all nodes at the widest level — bad for wide graphs
- DFS stack holds one path — bad for very deep graphs (stack overflow risk)

> "For shortest path in a social network graph (millions of nodes, shallow depth), I'd use BFS — it finds the answer at the nearest level and stops. For dependency resolution in a build system (deep dependency chains, narrow), DFS with memoization."

---

## Sources & Research

- [PepsiCo Software Engineer Interview Experience — LeetCode Discuss](https://leetcode.com/discuss/interview-experience/2884447/)
- [PepsiCo Principal Software Engineer Interview Questions — NodeFlair](https://nodeflair.com/companies/pepsico/interviews/principal-software-engineer)
- [Algorithms in Front End Interviews — Frontend Interview Handbook](https://www.frontendinterviewhandbook.com/coding/algorithms)
- [Cracking DSA for Frontend — GreatFrontEnd](https://www.greatfrontend.com/front-end-interview-playbook/algorithms)
- [PepsiCo Software Engineer Interview Guide — InterviewQuery](https://www.interviewquery.com/interview-guides/pepsico-software-engineer)
