# DSA — Freshworks Staff Frontend Q&A

Confirmed questions from Freshworks interview reports. Difficulty: Medium–Hard for Staff/Lead level.

---

## Q1: Find Peak Element (CONFIRMED)

**Problem:** A peak element is one that is greater than its neighbors. Find any peak index.

```js
// O(log n) — Binary Search
function findPeakElement(nums) {
  let lo = 0, hi = nums.length - 1;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);

    if (nums[mid] > nums[mid + 1]) {
      hi = mid;       // peak is on the left (including mid)
    } else {
      lo = mid + 1;   // peak is on the right
    }
  }
  return lo;
}

findPeakElement([1, 2, 3, 1]); // 2 (index of 3)
findPeakElement([1, 2, 1, 3, 5, 6, 4]); // 5 (index of 6)
```

**Why binary search works:** If `nums[mid] < nums[mid+1]`, then the right side is "ascending" — a peak must exist to the right (boundary or local max).

---

## Q2: Search in Rotated Sorted Array (CONFIRMED)

```js
function search(nums, target) {
  let lo = 0, hi = nums.length - 1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (nums[mid] === target) return mid;

    // Left half is sorted
    if (nums[lo] <= nums[mid]) {
      if (nums[lo] <= target && target < nums[mid]) {
        hi = mid - 1; // target in left sorted half
      } else {
        lo = mid + 1; // target in right half
      }
    } else {
      // Right half is sorted
      if (nums[mid] < target && target <= nums[hi]) {
        lo = mid + 1; // target in right sorted half
      } else {
        hi = mid - 1; // target in left half
      }
    }
  }
  return -1;
}

search([4, 5, 6, 7, 0, 1, 2], 0); // 4
search([4, 5, 6, 7, 0, 1, 2], 3); // -1
```

**Time:** O(log n)

---

## Q3: Nearest Smaller Element to the Left (CONFIRMED)

**Problem:** For each element, find the nearest element to its left that is smaller than it.

```js
function nearestSmallerLeft(arr) {
  const stack = [];
  const result = [];

  for (const num of arr) {
    // Pop elements >= current — they can never be the "nearest smaller" for future elements
    while (stack.length && stack[stack.length - 1] >= num) {
      stack.pop();
    }
    result.push(stack.length ? stack[stack.length - 1] : -1);
    stack.push(num);
  }
  return result;
}

nearestSmallerLeft([4, 5, 2, 10, 8]); // [-1, 4, -1, 2, 2]
```

**Time:** O(n) — each element is pushed/popped at most once.

---

## Q4: LRU Cache (CONFIRMED — multiple rounds, also an LLD question)

```js
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map(); // Map maintains insertion order — keys are sorted by access time
  }

  get(key) {
    if (!this.map.has(key)) return -1;

    // Move to end (most recently used)
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.map.has(key)) this.map.delete(key); // remove old position

    this.map.set(key, value); // add at end (most recently used)

    if (this.map.size > this.capacity) {
      // Delete least recently used — first key in Map
      this.map.delete(this.map.keys().next().value);
    }
  }
}

const cache = new LRUCache(2);
cache.put(1, 1);
cache.put(2, 2);
cache.get(1);    // 1 (1 is now MRU)
cache.put(3, 3); // evicts key 2 (LRU)
cache.get(2);    // -1 (evicted)
```

**Why JS Map works for LRU:** `Map` maintains insertion order. Delete + re-insert = move to end = mark as most recently used. `map.keys().next().value` = first key = LRU.

**Time:** O(1) for both `get` and `put`.

**Alternative:** Doubly linked list + HashMap for O(1) in all languages.

---

## Q5: Meeting Rooms — can a person attend all? (CONFIRMED)

```js
// Given intervals, return true if a person can attend all (no overlaps)
function canAttendMeetings(intervals) {
  intervals.sort((a, b) => a[0] - b[0]); // sort by start time

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] < intervals[i - 1][1]) {
      return false; // current start < previous end → overlap
    }
  }
  return true;
}

canAttendMeetings([[0, 30], [5, 10], [15, 20]]); // false — [0,30] overlaps [5,10]
canAttendMeetings([[7, 10], [2, 4]]);             // true
```

**Extension — minimum rooms needed:**
```js
function minMeetingRooms(intervals) {
  const starts = intervals.map(i => i[0]).sort((a, b) => a - b);
  const ends   = intervals.map(i => i[1]).sort((a, b) => a - b);

  let rooms = 0, maxRooms = 0, end = 0;

  for (let start of starts) {
    if (start < ends[end]) {
      rooms++; // need a new room
    } else {
      end++;   // a meeting ended — reuse its room
    }
    maxRooms = Math.max(maxRooms, rooms);
  }
  return maxRooms;
}
```

---

## Q6: Longest Substring Without Repeating Characters (CONFIRMED)

```js
function lengthOfLongestSubstring(s) {
  const seen = new Map(); // char → last seen index
  let maxLen = 0;
  let start = 0;

  for (let end = 0; end < s.length; end++) {
    const ch = s[end];
    if (seen.has(ch) && seen.get(ch) >= start) {
      start = seen.get(ch) + 1; // shrink window from left
    }
    seen.set(ch, end);
    maxLen = Math.max(maxLen, end - start + 1);
  }
  return maxLen;
}

lengthOfLongestSubstring('abcabcbb'); // 3 (abc)
lengthOfLongestSubstring('pwwkew');   // 3 (wke)
```

**Pattern:** Sliding window with a Map to track last position.

---

## Q7: Maximum Subarray Sum — Kadane's Algorithm (CONFIRMED)

```js
function maxSubArray(nums) {
  let maxSum = nums[0];
  let curr = nums[0];

  for (let i = 1; i < nums.length; i++) {
    // Either extend current subarray or start fresh at nums[i]
    curr = Math.max(nums[i], curr + nums[i]);
    maxSum = Math.max(maxSum, curr);
  }
  return maxSum;
}

maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]); // 6 ([4,-1,2,1])
```

**Time:** O(n), **Space:** O(1)

---

## Q8: Reverse First K Elements of Queue/Array (CONFIRMED)

```js
function reverseFirstK(arr, k) {
  // Reverse the first k elements, keep the rest in order
  let lo = 0, hi = k - 1;
  while (lo < hi) {
    [arr[lo], arr[hi]] = [arr[hi], arr[lo]];
    lo++;
    hi--;
  }
  return arr;
}

reverseFirstK([1, 2, 3, 4, 5], 3); // [3, 2, 1, 4, 5]
```

---

## Q9: Trapping Rain Water (Hard — reported in Freshworks DSA set)

```js
function trap(height) {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0;
  let water = 0;

  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) {
        leftMax = height[left];
      } else {
        water += leftMax - height[left]; // trapped between leftMax and current
      }
      left++;
    } else {
      if (height[right] >= rightMax) {
        rightMax = height[right];
      } else {
        water += rightMax - height[right];
      }
      right--;
    }
  }
  return water;
}

trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]); // 6
```

**Time:** O(n), **Space:** O(1) — two-pointer approach.

---

## Quick Tips for Freshworks Staff DSA Round

1. **Start with brute force, then optimize** — state O(n²) approach first, then optimize
2. **Talk through invariants** — e.g., "The stack will always be monotonically increasing"
3. **Binary search pattern** — anytime sorted array + O(log n) hint → binary search
4. **Sliding window** — substring/subarray problems with constraints → sliding window
5. **Monotonic stack** — "nearest smaller/larger" questions → monotonic stack
6. **Staff signal** — interviewers want to see you explain WHY an approach works, not just code it
