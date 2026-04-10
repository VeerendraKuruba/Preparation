# DSA — eBay Frontend Interview Q&A

Difficulty: LeetCode Easy–Medium. All confirmed or highly likely for eBay frontend roles.

---

## Q1: Valid Parentheses / Balanced Brackets (Confirmed eBay question)

**Problem:** Given a string with `()[]{}`, return true if all brackets are properly closed.

```js
function isValid(s) {
  const stack = [];
  const map = { ')': '(', ']': '[', '}': '{' };

  for (const ch of s) {
    if ('([{'.includes(ch)) {
      stack.push(ch);
    } else {
      if (stack.pop() !== map[ch]) return false;
    }
  }
  return stack.length === 0;
}

isValid("()[]{}"); // true
isValid("([)]");   // false
```

**Approach:** Stack — push open brackets, pop and match on close brackets.
**Time:** O(n), **Space:** O(n)

---

## Q2: Reverse a Linked List (Confirmed eBay question)

```js
function reverseList(head) {
  let prev = null;
  let curr = head;

  while (curr) {
    const next = curr.next; // save next before overwriting
    curr.next = prev;       // reverse the pointer
    prev = curr;            // move prev forward
    curr = next;            // move curr forward
  }
  return prev; // prev is now the new head
}
```

**Time:** O(n), **Space:** O(1)

---

## Q3: Maximum Depth of Binary Tree (Confirmed eBay question)

```js
function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}
```

**Time:** O(n), **Space:** O(h) — h = height of tree (O(log n) balanced, O(n) worst)

---

## Q4: Merge Two Sorted Lists (Confirmed eBay question)

```js
function mergeTwoLists(l1, l2) {
  const dummy = { next: null };
  let curr = dummy;

  while (l1 && l2) {
    if (l1.val <= l2.val) {
      curr.next = l1;
      l1 = l1.next;
    } else {
      curr.next = l2;
      l2 = l2.next;
    }
    curr = curr.next;
  }
  curr.next = l1 ?? l2; // attach remaining
  return dummy.next;
}
```

**Time:** O(m + n), **Space:** O(1)

---

## Q5: Single Number — find the lonely element (Confirmed eBay question)

**Problem:** Every element appears twice except one. Find the unique one.

```js
// XOR approach — a ^ a = 0, a ^ 0 = a
function singleNumber(nums) {
  return nums.reduce((acc, n) => acc ^ n, 0);
}

singleNumber([2, 2, 1]);       // 1
singleNumber([4, 1, 2, 1, 2]); // 4
```

**Time:** O(n), **Space:** O(1). XOR cancels paired elements, leaving the unique one.

---

## Q6: Swap Every Two Nodes in a Linked List (Confirmed eBay question)

```js
function swapPairs(head) {
  if (!head || !head.next) return head;

  const second = head.next;
  head.next = swapPairs(second.next); // recursively handle rest
  second.next = head;                 // swap
  return second;                      // second is now the new head of this pair
}
// 1→2→3→4 becomes 2→1→4→3
```

**Time:** O(n), **Space:** O(n) — recursion stack. Iterative version is O(1) space.

---

## Q7: Coin Change (Dynamic Programming — Confirmed eBay question)

**Problem:** Given coins and an amount, return the minimum number of coins to make the amount. Return -1 if not possible.

```js
function coinChange(coins, amount) {
  // dp[i] = min coins needed for amount i
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;

  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i && dp[i - coin] + 1 < dp[i]) {
        dp[i] = dp[i - coin] + 1;
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}

coinChange([1, 5, 10, 25], 36); // 3 (25 + 10 + 1)
```

**Time:** O(amount × coins), **Space:** O(amount)

---

## Q8: Check if a String is a Palindrome (Confirmed eBay question)

```js
// Two-pointer — O(n) time, O(1) space
function isPalindrome(s) {
  // Only consider alphanumeric, lowercase
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  let left = 0, right = clean.length - 1;

  while (left < right) {
    if (clean[left] !== clean[right]) return false;
    left++;
    right--;
  }
  return true;
}

isPalindrome("A man, a plan, a canal: Panama"); // true
```

---

## Q9: Find Kth Smallest in Sorted Matrix (Confirmed eBay question)

**Problem:** Given an n×n matrix where rows and columns are sorted, find the kth smallest element.

```js
function kthSmallest(matrix, k) {
  const n = matrix.length;
  let lo = matrix[0][0];
  let hi = matrix[n-1][n-1];

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    // Count elements <= mid
    let count = 0, j = n - 1;
    for (let i = 0; i < n; i++) {
      while (j >= 0 && matrix[i][j] > mid) j--;
      count += j + 1;
    }
    if (count >= k) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
```

**Time:** O(n log(max-min)), **Space:** O(1)

---

## Q10: Two Sum (Likely warm-up)

```js
function twoSum(nums, target) {
  const seen = new Map(); // value → index

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (seen.has(complement)) return [seen.get(complement), i];
    seen.set(nums[i], i);
  }
  return [];
}
```

**Time:** O(n), **Space:** O(n)

---

## Quick Tips for eBay Coding Round

1. **Clarify first** — ask about null inputs, empty arrays, integer overflow
2. **State brute force, then optimize** — show you understand the tradeoff
3. **Talk through your approach** before coding — interviewers want to hear your thinking
4. **Test with examples** including edge cases (empty, single element, already sorted)
5. **Nothing LeetCode Hard** — if it seems like a Hard problem, you've probably misunderstood the constraints
