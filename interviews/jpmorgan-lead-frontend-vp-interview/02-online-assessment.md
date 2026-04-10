# Round 2: Online Assessment (HackerRank)

**Duration:** 45–90 minutes  
**Format:** HackerRank — 2 coding questions  
**Difficulty:** LeetCode Easy to Medium  
**Eliminates:** Yes — must pass to proceed

---

## What to Expect

- 2 algorithmic coding problems
- Difficulty: significantly easier than FAANG
- Focus: correctness, edge cases, clean code — not raw speed
- Language: any (JavaScript is fine — preferred if applying for frontend)
- No React/browser APIs — pure algorithmic

---

## Core Topics to Prepare

### 1. Arrays & Strings
Most common category at JPMC.

**Key patterns:**
- Two pointers
- Sliding window
- Prefix sums
- Frequency maps (hash maps)

**Practice problems:**
- Two Sum (easy)
- Longest Substring Without Repeating Characters (medium)
- Maximum Subarray (Kadane's algorithm)
- Container With Most Water

---

### 2. Recursion & Backtracking

**Practice problems:**
- Combination Sum II (medium) — *reported in JPMC interviews*
- Subsets
- Permutations
- N-Queens (know the concept)

---

### 3. Dynamic Programming

**Key patterns:**
- Bottom-up tabulation
- Memoization

**Practice problems:**
- Climbing Stairs
- Longest Common Subsequence
- Coin Change
- House Robber

---

### 4. Graph / BFS / DFS

**Practice problems:**
- Number of Islands (BFS/DFS)
- Clone Graph
- Course Schedule (topological sort)
- Shortest path problems

---

### 5. Sorting & Searching

**Practice problems:**
- Binary search variations
- Merge intervals
- Find first and last position

---

## Sample Problems with Solutions (JavaScript)

### Problem 1: Two Sum
```javascript
/**
 * Given an array of integers nums and an integer target,
 * return indices of the two numbers such that they add up to target.
 */
function twoSum(nums, target) {
  const map = new Map(); // value -> index
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}

// Time: O(n), Space: O(n)
// Edge cases: empty array, no solution, duplicate values
```

---

### Problem 2: Longest Substring Without Repeating Characters
```javascript
/**
 * Given a string s, find the length of the longest substring
 * without repeating characters.
 */
function lengthOfLongestSubstring(s) {
  const charIndex = new Map();
  let maxLen = 0;
  let left = 0;

  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    if (charIndex.has(char) && charIndex.get(char) >= left) {
      left = charIndex.get(char) + 1;
    }
    charIndex.set(char, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}

// Time: O(n), Space: O(min(n, alphabet_size))
// Edge cases: empty string, all same chars, all unique chars
```

---

### Problem 3: Combination Sum II (Backtracking — reported at JPMC)
```javascript
/**
 * Given a collection of candidate numbers (candidates) and a target number,
 * find all unique combinations where the candidate numbers sum to target.
 * Each number in candidates may only be used once in the combination.
 */
function combinationSum2(candidates, target) {
  const result = [];
  candidates.sort((a, b) => a - b); // sort to handle duplicates

  function backtrack(start, current, remaining) {
    if (remaining === 0) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break; // pruning
      if (i > start && candidates[i] === candidates[i - 1]) continue; // skip duplicates
      current.push(candidates[i]);
      backtrack(i + 1, current, remaining - candidates[i]);
      current.pop();
    }
  }

  backtrack(0, [], target);
  return result;
}

// Time: O(2^n), Space: O(n) for recursion stack
```

---

### Problem 4: Maximum Subarray (Kadane's Algorithm)
```javascript
/**
 * Given an integer array nums, find the subarray with the largest sum
 * and return its sum.
 */
function maxSubArray(nums) {
  let maxSum = nums[0];
  let currentSum = nums[0];

  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }

  return maxSum;
}

// Time: O(n), Space: O(1)
// Edge cases: all negative numbers, single element
```

---

### Problem 5: Generic Memoization (Frontend-specific, may appear)
```javascript
/**
 * Implement a generic memoize function that caches results
 * based on arguments.
 */
function memoize(fn) {
  const cache = new Map();

  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Usage:
const expensiveCalc = memoize((n) => {
  // heavy computation
  return n * n;
});

// Caveats to mention in interview:
// 1. JSON.stringify won't handle circular refs or functions as args
// 2. Cache grows unbounded — could add LRU eviction
// 3. For async functions, cache the Promise, not the resolved value
```

---

## Coding Strategy During the Assessment

1. **Read the problem fully** before writing any code
2. **Clarify constraints** — input size, edge cases, what to return if no solution
3. **Think out loud** (if live) or add comments in code explaining your approach
4. **Start with brute force**, then optimize — mention time/space complexity of each
5. **Test with edge cases:** empty input, single element, negatives, duplicates
6. **Write clean code** — variable names matter; JPMC engineers review style too

---

## Preparation Checklist

- [ ] Solve 20 LeetCode Easy + 15 LeetCode Medium problems
- [ ] Focus categories: Arrays, Strings, Recursion, DP, BFS/DFS
- [ ] Practice in JavaScript (or your strongest language)
- [ ] Time yourself: aim to solve each problem in 20–30 minutes
- [ ] Review time/space complexity for every solution
- [ ] Practice explaining your approach as you code
