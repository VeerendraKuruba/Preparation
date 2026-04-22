# Section 3 — JavaScript Core

---

### Q36. Write a function to flatten a deeply nested array without using Array.flat().

Three approaches: recursive, iterative (stack), and using generator functions.

```js
// 1. Recursive approach
function flattenRecursive(arr) {
  const result = [];
  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...flattenRecursive(item));
    } else {
      result.push(item);
    }
  }
  return result;
}

// 2. Iterative approach using a stack (avoids call stack overflow on deeply nested arrays)
function flattenIterative(arr) {
  const stack = [...arr];
  const result = [];
  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      // Push items back in reverse order so left-to-right order is preserved
      stack.push(...item);
    } else {
      result.unshift(item);
    }
  }
  return result;
}

// 3. Using reduce (functional style)
function flattenReduce(arr) {
  return arr.reduce((acc, item) => {
    return acc.concat(Array.isArray(item) ? flattenReduce(item) : item);
  }, []);
}

// 4. Generator-based (lazy, memory efficient)
function* flattenGenerator(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) {
      yield* flattenGenerator(item);
    } else {
      yield item;
    }
  }
}

// Tests
const nested = [1, [2, [3, [4, [5]]]], 6, [7, 8]];

console.log(flattenRecursive(nested));  // [1, 2, 3, 4, 5, 6, 7, 8]
console.log(flattenIterative(nested));  // [1, 2, 3, 4, 5, 6, 7, 8]
console.log(flattenReduce(nested));     // [1, 2, 3, 4, 5, 6, 7, 8]
console.log([...flattenGenerator(nested)]); // [1, 2, 3, 4, 5, 6, 7, 8]
```

**Key insight:** The iterative version is preferable for very deeply nested arrays because it doesn't risk a stack overflow. The generator version is best when you want lazy evaluation (e.g., only consume part of the result).

---

### Q37. Given an array of numbers, find all pairs that sum to a target value. Optimize to O(n).

```js
// Naive O(n^2) — two nested loops
function findPairsNaive(arr, target) {
  const pairs = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] + arr[j] === target) {
        pairs.push([arr[i], arr[j]]);
      }
    }
  }
  return pairs;
}

// Optimized O(n) — using a Set to track seen values
function findPairs(arr, target) {
  const seen = new Set();
  const pairs = [];
  const usedPairs = new Set(); // avoid duplicate pairs like [2,8] and [8,2]

  for (const num of arr) {
    const complement = target - num;
    if (seen.has(complement)) {
      // Normalize the pair so we don't record [2,8] and [8,2] as separate pairs
      const pairKey = [Math.min(num, complement), Math.max(num, complement)].join(',');
      if (!usedPairs.has(pairKey)) {
        pairs.push([complement, num]);
        usedPairs.add(pairKey);
      }
    }
    seen.add(num);
  }
  return pairs;
}

// Tests
const nums = [2, 7, 4, 1, 3, 8, 6, 9];
console.log(findPairs(nums, 10)); // [[2,8], [4,6], [1,9]]

const withDuplicates = [1, 5, 3, 3, 7, 5];
console.log(findPairs(withDuplicates, 8)); // [[1,7], [3,5]]
```

**Why O(n):** We traverse the array once. Each lookup and insert into a Set is O(1) on average. Total time: O(n), space: O(n).

---

### Q38. Remove duplicates from an array — using Set, filter, and reduce approaches.

```js
const arr = [1, 2, 2, 3, 4, 4, 5, 1];

// 1. Using Set (most concise, O(n))
function uniqueWithSet(arr) {
  return [...new Set(arr)];
  // Or: Array.from(new Set(arr))
}

// 2. Using filter + indexOf (O(n^2) — keeps first occurrence)
function uniqueWithFilter(arr) {
  return arr.filter((item, index) => arr.indexOf(item) === index);
}

// 3. Using reduce (O(n^2) due to includes, but clear intent)
function uniqueWithReduce(arr) {
  return arr.reduce((acc, item) => {
    if (!acc.includes(item)) acc.push(item);
    return acc;
  }, []);
}

// 4. Using reduce + Set for O(n) with reduce
function uniqueWithReduceSet(arr) {
  return arr.reduce((acc, item) => {
    acc.set(item, true);
    return acc;
  }, new Map());
  // Actually simpler:
}

function uniqueWithReduceOptimized(arr) {
  const seen = new Set();
  return arr.reduce((acc, item) => {
    if (!seen.has(item)) {
      seen.add(item);
      acc.push(item);
    }
    return acc;
  }, []);
}

// 5. For arrays of objects — remove by a key
function uniqueByKey(arr, key) {
  const seen = new Set();
  return arr.filter(item => {
    const val = item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

console.log(uniqueWithSet(arr));              // [1, 2, 3, 4, 5]
console.log(uniqueWithFilter(arr));           // [1, 2, 3, 4, 5]
console.log(uniqueWithReduce(arr));           // [1, 2, 3, 4, 5]
console.log(uniqueWithReduceOptimized(arr));  // [1, 2, 3, 4, 5]

const people = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 1, name: 'Alice (dup)' },
];
console.log(uniqueByKey(people, 'id')); // [{id:1,name:'Alice'}, {id:2,name:'Bob'}]
```

**Comparison:**
| Approach | Time | Space | Notes |
|---|---|---|---|
| Set | O(n) | O(n) | Best for primitives |
| filter+indexOf | O(n²) | O(1) | Simple but slow |
| reduce+Set | O(n) | O(n) | Functional + fast |

---

### Q39. Rotate an array to the right by k steps in-place.

```js
// Example: [1,2,3,4,5], k=2 → [4,5,1,2,3]

// Approach 1: Using slice (not in-place, but simple)
function rotateSimple(arr, k) {
  k = k % arr.length; // handle k > arr.length
  return [...arr.slice(-k), ...arr.slice(0, -k)];
}

// Approach 2: True in-place using the reverse trick — O(n) time, O(1) space
// Steps:
//   1. Reverse the entire array
//   2. Reverse the first k elements
//   3. Reverse the remaining elements
function reverse(arr, start, end) {
  while (start < end) {
    [arr[start], arr[end]] = [arr[end], arr[start]];
    start++;
    end--;
  }
}

function rotateInPlace(arr, k) {
  const n = arr.length;
  k = k % n; // normalize k
  if (k === 0) return arr;

  reverse(arr, 0, n - 1);       // Step 1: reverse all
  reverse(arr, 0, k - 1);       // Step 2: reverse first k
  reverse(arr, k, n - 1);       // Step 3: reverse the rest

  return arr;
}

// Approach 3: Using pop/unshift (O(n*k) — simple but inefficient)
function rotatePopUnshift(arr, k) {
  k = k % arr.length;
  for (let i = 0; i < k; i++) {
    arr.unshift(arr.pop());
  }
  return arr;
}

// Tests
console.log(rotateSimple([1, 2, 3, 4, 5], 2));       // [4, 5, 1, 2, 3]
console.log(rotateInPlace([1, 2, 3, 4, 5], 2));      // [4, 5, 1, 2, 3]
console.log(rotateInPlace([1, 2, 3, 4, 5, 6, 7], 3)); // [5, 6, 7, 1, 2, 3, 4]
console.log(rotateInPlace([1, 2, 3], 7));             // [3, 1, 2] (7 % 3 = 1)
```

**The reverse trick explained:** Rotating right by k is equivalent to moving the last k elements to the front. Reversing achieves a rearrangement without extra space.

---

### Q40. Find the longest substring without repeating characters (sliding window).

```js
// O(n) sliding window approach
function lengthOfLongestSubstring(s) {
  const charIndex = new Map(); // char -> last seen index
  let maxLen = 0;
  let left = 0; // left boundary of the window

  for (let right = 0; right < s.length; right++) {
    const char = s[right];

    // If char was seen and is within the current window, shrink window from left
    if (charIndex.has(char) && charIndex.get(char) >= left) {
      left = charIndex.get(char) + 1;
    }

    charIndex.set(char, right);
    maxLen = Math.max(maxLen, right - left + 1);
  }

  return maxLen;
}

// Extended version that also returns the actual substring
function longestSubstringWithoutRepeating(s) {
  const charIndex = new Map();
  let maxLen = 0;
  let maxStart = 0;
  let left = 0;

  for (let right = 0; right < s.length; right++) {
    const char = s[right];

    if (charIndex.has(char) && charIndex.get(char) >= left) {
      left = charIndex.get(char) + 1;
    }

    charIndex.set(char, right);

    if (right - left + 1 > maxLen) {
      maxLen = right - left + 1;
      maxStart = left;
    }
  }

  return {
    length: maxLen,
    substring: s.slice(maxStart, maxStart + maxLen),
  };
}

console.log(lengthOfLongestSubstring('abcabcbb')); // 3 ("abc")
console.log(lengthOfLongestSubstring('bbbbb'));    // 1 ("b")
console.log(lengthOfLongestSubstring('pwwkew'));   // 3 ("wke")
console.log(lengthOfLongestSubstring(''));          // 0

console.log(longestSubstringWithoutRepeating('abcabcbb'));
// { length: 3, substring: 'abc' }
console.log(longestSubstringWithoutRepeating('dvdf'));
// { length: 3, substring: 'vdf' }
```

**Why sliding window:** We maintain a window `[left, right]` that always contains unique characters. When a duplicate is found, we move `left` past the previous occurrence. Each character is visited at most twice (once when right advances, once when left advances), giving O(n).

---

### Q41. Group anagrams from an array of strings.

```js
// Approach 1: Sort each string as a key — O(n * k log k) where k is max string length
function groupAnagrams(strs) {
  const map = new Map();

  for (const str of strs) {
    const key = str.split('').sort().join(''); // sorted chars = canonical form
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(str);
  }

  return [...map.values()];
}

// Approach 2: Character frequency as key — O(n * k), avoids sorting
function groupAnagramsOptimized(strs) {
  const map = new Map();

  for (const str of strs) {
    // Build a 26-length frequency array for a-z
    const freq = new Array(26).fill(0);
    for (const char of str) {
      freq[char.charCodeAt(0) - 97]++;
    }
    const key = freq.join('#'); // '#' as delimiter to avoid ambiguity
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(str);
  }

  return [...map.values()];
}

// Tests
const words = ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'];
console.log(groupAnagrams(words));
// [['eat','tea','ate'], ['tan','nat'], ['bat']]

console.log(groupAnagramsOptimized(words));
// [['eat','tea','ate'], ['tan','nat'], ['bat']]

console.log(groupAnagrams(['']));        // [['']]
console.log(groupAnagrams(['a']));       // [['a']]
console.log(groupAnagrams(['ac', 'bb', 'ca'])); // [['ac','ca'], ['bb']]
```

**Key insight:** Two strings are anagrams if and only if their sorted character sequences are identical. This sorted string serves as a hash map key to group them together.

---

### Q42. Two-sum problem — return indices of two numbers that add up to target.

```js
// Naive O(n^2)
function twoSumNaive(nums, target) {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return null;
}

// Optimized O(n) with a hash map
function twoSum(nums, target) {
  const map = new Map(); // value -> index

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }

  return null; // no solution found
}

// Two-pointer approach (only works on sorted arrays, returns values not indices)
function twoSumSorted(sortedNums, target) {
  let left = 0;
  let right = sortedNums.length - 1;

  while (left < right) {
    const sum = sortedNums[left] + sortedNums[right];
    if (sum === target) return [sortedNums[left], sortedNums[right]];
    else if (sum < target) left++;
    else right--;
  }

  return null;
}

// Tests
console.log(twoSum([2, 7, 11, 15], 9));  // [0, 1]  (2+7=9)
console.log(twoSum([3, 2, 4], 6));        // [1, 2]  (2+4=6)
console.log(twoSum([3, 3], 6));           // [0, 1]  (3+3=6)

console.log(twoSumSorted([1, 2, 3, 4, 5], 8)); // [3, 5]
```

**Why O(n):** For each number we compute the complement and check the hash map in O(1). We only traverse the array once.

---

### Q43. Implement Array.prototype.flat, Array.prototype.map, Array.prototype.filter from scratch.

```js
// ─── Array.prototype.flat ─────────────────────────────────────────────────────
Array.prototype.myFlat = function(depth = 1) {
  const result = [];

  function flatHelper(arr, currentDepth) {
    for (const item of arr) {
      if (Array.isArray(item) && currentDepth > 0) {
        flatHelper(item, currentDepth - 1);
      } else {
        result.push(item);
      }
    }
  }

  flatHelper(this, depth);
  return result;
};

// ─── Array.prototype.map ──────────────────────────────────────────────────────
Array.prototype.myMap = function(callback, thisArg) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  const result = new Array(this.length);

  for (let i = 0; i < this.length; i++) {
    // Only process indices that actually exist (sparse array safe)
    if (i in this) {
      result[i] = callback.call(thisArg, this[i], i, this);
    }
  }

  return result;
};

// ─── Array.prototype.filter ───────────────────────────────────────────────────
Array.prototype.myFilter = function(callback, thisArg) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  const result = [];

  for (let i = 0; i < this.length; i++) {
    if (i in this) {
      const item = this[i];
      if (callback.call(thisArg, item, i, this)) {
        result.push(item);
      }
    }
  }

  return result;
};

// ─── Bonus: Array.prototype.reduce ───────────────────────────────────────────
Array.prototype.myReduce = function(callback, initialValue) {
  if (typeof callback !== 'function') {
    throw new TypeError(callback + ' is not a function');
  }

  let acc;
  let startIndex;

  if (arguments.length >= 2) {
    acc = initialValue;
    startIndex = 0;
  } else {
    if (this.length === 0) throw new TypeError('Reduce of empty array with no initial value');
    acc = this[0];
    startIndex = 1;
  }

  for (let i = startIndex; i < this.length; i++) {
    if (i in this) {
      acc = callback(acc, this[i], i, this);
    }
  }

  return acc;
};

// Tests
const nested = [1, [2, [3, [4]]]];
console.log(nested.myFlat());     // [1, 2, [3, [4]]]
console.log(nested.myFlat(2));    // [1, 2, 3, [4]]
console.log(nested.myFlat(Infinity)); // [1, 2, 3, 4]

const nums = [1, 2, 3, 4];
console.log(nums.myMap(x => x * 2));         // [2, 4, 6, 8]
console.log(nums.myFilter(x => x % 2 === 0)); // [2, 4]
console.log(nums.myReduce((acc, x) => acc + x, 0)); // 10
```

**Important details:**
- `i in this` checks handle sparse arrays (e.g., `[1,,3]`) correctly, skipping holes.
- `thisArg` is passed to `callback.call()` so the `this` context inside the callback is correct.
- The native `flat` with `Infinity` flattens completely; our version handles that via the `depth` parameter.

---

### Q44. Merge two sorted arrays into one sorted array.

```js
// O(n + m) time, O(n + m) space — the classic merge step from merge sort
function mergeSorted(arr1, arr2) {
  const result = [];
  let i = 0; // pointer for arr1
  let j = 0; // pointer for arr2

  while (i < arr1.length && j < arr2.length) {
    if (arr1[i] <= arr2[j]) {
      result.push(arr1[i++]);
    } else {
      result.push(arr2[j++]);
    }
  }

  // Append any remaining elements
  while (i < arr1.length) result.push(arr1[i++]);
  while (j < arr2.length) result.push(arr2[j++]);

  return result;
}

// Concise version using slice for the tail
function mergeSortedConcise(arr1, arr2) {
  const result = [];
  let i = 0, j = 0;

  while (i < arr1.length && j < arr2.length) {
    result.push(arr1[i] <= arr2[j] ? arr1[i++] : arr2[j++]);
  }

  return result.concat(arr1.slice(i)).concat(arr2.slice(j));
}

// In-place merge into arr1 (LeetCode 88 style)
// arr1 has extra space at the end for arr2 elements
function mergeSortedInPlace(arr1, m, arr2, n) {
  let i = m - 1;    // last valid element in arr1
  let j = n - 1;    // last element in arr2
  let k = m + n - 1; // last position in arr1

  while (i >= 0 && j >= 0) {
    if (arr1[i] > arr2[j]) {
      arr1[k--] = arr1[i--];
    } else {
      arr1[k--] = arr2[j--];
    }
  }

  // Copy remaining arr2 elements (arr1 elements are already in place)
  while (j >= 0) {
    arr1[k--] = arr2[j--];
  }

  return arr1;
}

// Tests
console.log(mergeSorted([1, 3, 5, 7], [2, 4, 6, 8])); // [1,2,3,4,5,6,7,8]
console.log(mergeSorted([1, 2, 3], [4, 5, 6]));        // [1,2,3,4,5,6]
console.log(mergeSorted([], [1, 2]));                   // [1,2]

const arr1 = [1, 2, 3, 0, 0, 0]; // 3 valid elements + 3 placeholders
const arr2 = [2, 5, 6];
console.log(mergeSortedInPlace(arr1, 3, arr2, 3)); // [1,2,2,3,5,6]
```

**Why fill from the back for in-place:** Filling from the front would overwrite arr1 elements before they're compared. Filling from the back (largest first) avoids this issue entirely.

---

### Q45. Check if a string is a valid palindrome (ignore non-alphanumeric).

```js
// Approach 1: Clean string then use two pointers
function isPalindrome(s) {
  // Keep only alphanumeric and lowercase
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');

  let left = 0;
  let right = cleaned.length - 1;

  while (left < right) {
    if (cleaned[left] !== cleaned[right]) return false;
    left++;
    right--;
  }

  return true;
}

// Approach 2: Two pointers without creating a cleaned string (O(1) space)
function isPalindromeOptimized(s) {
  const isAlphanumeric = (c) => /[a-z0-9]/i.test(c);

  let left = 0;
  let right = s.length - 1;

  while (left < right) {
    // Skip non-alphanumeric from the left
    while (left < right && !isAlphanumeric(s[left])) left++;
    // Skip non-alphanumeric from the right
    while (left < right && !isAlphanumeric(s[right])) right--;

    if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;

    left++;
    right--;
  }

  return true;
}

// Approach 3: Functional one-liner (not efficient but elegant)
function isPalindromeFunctional(s) {
  const cleaned = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return cleaned === cleaned.split('').reverse().join('');
}

// Tests
console.log(isPalindrome('A man, a plan, a canal: Panama')); // true
console.log(isPalindrome('race a car'));                      // false
console.log(isPalindrome(' '));                               // true (empty after clean)
console.log(isPalindrome('Was it a car or a cat I saw?'));   // true

console.log(isPalindromeOptimized('A man, a plan, a canal: Panama')); // true
console.log(isPalindromeOptimized('race a car'));                      // false
```

**Why Approach 2 is best:** O(n) time, O(1) space — it never creates a new string. The optimized version skips invalid characters in-place using two converging pointers.

---

### Q46. What is a closure? Give a real-world use case (e.g., debounce, counter, memoize).

**Definition:** A closure is a function that retains access to variables from its outer (enclosing) scope even after the outer function has returned. The inner function "closes over" those variables.

```js
// ─── Basic closure example ────────────────────────────────────────────────────
function outer() {
  let count = 0; // This variable is "closed over"

  return function inner() {
    count++;
    return count;
  };
}

const counter = outer();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
// `count` is NOT accessible outside, but `inner` keeps it alive

// ─── Real-world use case 1: Private counter (module pattern) ─────────────────
function makeCounter(initialValue = 0) {
  let count = initialValue;

  return {
    increment() { return ++count; },
    decrement() { return --count; },
    reset()     { count = initialValue; return count; },
    value()     { return count; },
  };
}

const cartCounter = makeCounter();
cartCounter.increment(); // 1
cartCounter.increment(); // 2
cartCounter.decrement(); // 1
console.log(cartCounter.value()); // 1

// ─── Real-world use case 2: Partial application / currying ───────────────────
function multiply(x) {
  return function(y) {
    return x * y; // `x` is closed over
  };
}

const double = multiply(2);
const triple = multiply(3);
console.log(double(5)); // 10
console.log(triple(5)); // 15

// ─── Real-world use case 3: Memoize ──────────────────────────────────────────
function memoize(fn) {
  const cache = {}; // closed over by the returned function

  return function(...args) {
    const key = JSON.stringify(args);
    if (key in cache) {
      console.log('Cache hit:', key);
      return cache[key];
    }
    cache[key] = fn(...args);
    return cache[key];
  };
}

const expensiveSquare = memoize((n) => {
  console.log('Computing...');
  return n * n;
});

expensiveSquare(4); // Computing... 16
expensiveSquare(4); // Cache hit: [4] → 16

// ─── Real-world use case 4: Event handler with state ─────────────────────────
function makeToggle(element) {
  let isVisible = true; // state closed over

  return function toggle() {
    isVisible = !isVisible;
    element.style.display = isVisible ? 'block' : 'none';
  };
}
// const toggle = makeToggle(document.getElementById('menu'));
// button.addEventListener('click', toggle);
```

**Key point:** Closures enable data privacy (no global state), stateful functions (counter), and factories (partial application). They are the foundation of patterns like the module pattern, debounce, memoize, and currying.

---

### Q47. Explain the classic var loop problem in closures and how to fix it with let or IIFE.

**The Problem:** `var` is function-scoped, not block-scoped. By the time the setTimeout callbacks fire, the loop has already finished and `i` is 5 in all of them.

```js
// ─── The Bug ──────────────────────────────────────────────────────────────────
for (var i = 0; i < 5; i++) {
  setTimeout(function() {
    console.log(i); // Expected: 0, 1, 2, 3, 4
  }, i * 100);
}
// Actual output: 5, 5, 5, 5, 5
// All callbacks share the SAME `i` variable in the enclosing function scope.
// By the time any callback runs, the loop has finished and i === 5.

// ─── Fix 1: Use let (block-scoped) ───────────────────────────────────────────
for (let i = 0; i < 5; i++) {
  setTimeout(function() {
    console.log(i); // 0, 1, 2, 3, 4
  }, i * 100);
}
// `let` creates a NEW binding of `i` for each loop iteration.
// Each callback closes over its own separate `i`.

// ─── Fix 2: IIFE (Immediately Invoked Function Expression) ───────────────────
for (var i = 0; i < 5; i++) {
  (function(j) {
    // `j` is a new parameter for each IIFE call — a fresh scope
    setTimeout(function() {
      console.log(j); // 0, 1, 2, 3, 4
    }, j * 100);
  })(i); // pass current value of `i` as `j`
}
// The IIFE captures the current value of `i` as its own parameter `j`,
// creating a new scope for each iteration.

// ─── Fix 3: .bind() ───────────────────────────────────────────────────────────
for (var i = 0; i < 5; i++) {
  setTimeout(console.log.bind(null, i), i * 100); // 0, 1, 2, 3, 4
}

// ─── Fix 4: Factory function ─────────────────────────────────────────────────
function makeLogger(i) {
  return function() {
    console.log(i); // closes over its own `i` parameter
  };
}

for (var i = 0; i < 5; i++) {
  setTimeout(makeLogger(i), i * 100); // 0, 1, 2, 3, 4
}
```

**Why `let` works:** ES6's `let` is block-scoped. The `for` loop is a block, and `let` creates a fresh binding of `i` for each iteration. Each setTimeout callback closes over a different `i` variable — not the same one.

**Why IIFE works:** It creates a new function scope on each iteration, immediately invokes it with the current `i` value, and the inner callback closes over the local parameter (not the outer `var i`).

---

### Q48. Implement a memoize function using closures.

```js
// Basic memoize — works for single-argument pure functions
function memoize(fn) {
  const cache = new Map(); // closed over by the returned function

  return function(arg) {
    if (cache.has(arg)) {
      return cache.get(arg);
    }
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}

// Multi-argument memoize using JSON.stringify as key
function memoizeMulti(fn) {
  const cache = new Map();

  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      console.log(`[cache hit] key=${key}`);
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Advanced memoize with custom key resolver and cache size limit
function memoizeAdvanced(fn, { keyResolver = JSON.stringify, maxSize = 100 } = {}) {
  const cache = new Map();

  return function(...args) {
    const key = keyResolver(args);

    if (cache.has(key)) return cache.get(key);

    // Evict oldest entry when cache is full (LRU-lite: just evict the first)
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
let callCount = 0;

const expensiveFibonacci = memoizeMulti(function fib(n) {
  callCount++;
  if (n <= 1) return n;
  return expensiveFibonacci(n - 1) + expensiveFibonacci(n - 2);
});

console.log(expensiveFibonacci(10)); // 55
console.log(`Calls: ${callCount}`);  // Much fewer than naive recursive fib

callCount = 0;
console.log(expensiveFibonacci(10)); // 55 (from cache — 0 new calls)
console.log(`Calls: ${callCount}`);  // 0

// Single-arg memoize
const memoSqrt = memoize(Math.sqrt);
console.log(memoSqrt(144)); // 12
console.log(memoSqrt(144)); // 12 (cached)
```

**Considerations:**
- `JSON.stringify` fails for functions, circular references, and `undefined`. For complex args, use a custom `keyResolver`.
- Memoize only pure functions (same inputs → same output, no side effects).
- Be mindful of unbounded cache growth in long-running processes.

---

### Q49. Implement a once(fn) function that runs fn only the first time it's called.

```js
// Basic once — fn runs only on first call, subsequent calls return the first result
function once(fn) {
  let called = false;
  let result;

  return function(...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result; // Always return the same first result
  };
}

// Variant: after first call, the function becomes a no-op (returns undefined)
function onceStrict(fn) {
  let called = false;

  return function(...args) {
    if (called) return;
    called = true;
    return fn.apply(this, args);
  };
}

// Variant: oncePerKey — limit calls per unique argument
function oncePerKey(fn) {
  const called = new Set();
  const results = new Map();

  return function(key, ...args) {
    if (called.has(key)) return results.get(key);
    called.add(key);
    const result = fn.call(this, key, ...args);
    results.set(key, result);
    return result;
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
const initializeApp = once(() => {
  console.log('App initialized!');
  return { initialized: true };
});

console.log(initializeApp()); // "App initialized!" → { initialized: true }
console.log(initializeApp()); // (no log)          → { initialized: true }
console.log(initializeApp()); // (no log)          → { initialized: true }

// Real-world: one-time event listener setup
const attachListeners = once(() => {
  console.log('Attaching event listeners...');
  // document.addEventListener('click', handleClick);
});

attachListeners(); // Attaching event listeners...
attachListeners(); // (silently ignored)

// Real-world: API call that should only happen once
const loadConfig = once(async () => {
  // const config = await fetch('/api/config').then(r => r.json());
  return { theme: 'dark', lang: 'en' };
});

// Both calls return the same Promise (the first call's result)
loadConfig().then(console.log); // { theme: 'dark', lang: 'en' }
loadConfig().then(console.log); // { theme: 'dark', lang: 'en' } (cached)
```

**Use cases:** Initialization routines, one-time analytics events, lazy singleton construction, preventing duplicate API calls on page load.

---

### Q50. Implement debounce(fn, delay) from scratch.

**Concept:** Debounce ensures a function is only called after a period of inactivity. It resets the timer on every new invocation. Great for search inputs, window resize, etc.

```js
function debounce(fn, delay) {
  let timerId = null;

  return function(...args) {
    // Cancel the previous pending call
    clearTimeout(timerId);

    // Schedule a new call after `delay` ms of silence
    timerId = setTimeout(() => {
      fn.apply(this, args);
      timerId = null;
    }, delay);
  };
}

// Enhanced debounce with leading edge support and cancel/flush methods
function debounceAdvanced(fn, delay, { leading = false, trailing = true } = {}) {
  let timerId = null;
  let lastArgs = null;

  function invoke(args) {
    fn.apply(this, args);
  }

  const debounced = function(...args) {
    lastArgs = args;

    if (leading && !timerId) {
      // Fire immediately on leading edge
      invoke.call(this, args);
    }

    clearTimeout(timerId);
    timerId = setTimeout(() => {
      if (trailing && (!leading || lastArgs !== args)) {
        invoke.call(this, lastArgs);
      }
      timerId = null;
      lastArgs = null;
    }, delay);
  };

  debounced.cancel = function() {
    clearTimeout(timerId);
    timerId = null;
    lastArgs = null;
  };

  debounced.flush = function() {
    if (timerId && lastArgs) {
      clearTimeout(timerId);
      invoke(lastArgs);
      timerId = null;
      lastArgs = null;
    }
  };

  return debounced;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
const handleSearch = debounce((query) => {
  console.log(`Searching for: "${query}"`);
}, 300);

// Simulating rapid keystrokes — only the last one should fire
handleSearch('h');
handleSearch('he');
handleSearch('hel');
handleSearch('hell');
handleSearch('hello'); // Only this one fires after 300ms of silence

// After 300ms: "Searching for: 'hello'"

// Real-world: debounce window resize handler
const handleResize = debounce(() => {
  console.log('Window resized — recalculate layout');
}, 200);

// window.addEventListener('resize', handleResize);
```

**How it works:**
1. Every time the debounced function is called, it clears the previous `setTimeout`.
2. It then schedules a new one for `delay` ms in the future.
3. Only when the caller "pauses" for `delay` ms does the original `fn` actually execute.

---

### Q51. Implement throttle(fn, limit) from scratch.

**Concept:** Throttle ensures a function is called at most once every `limit` milliseconds, regardless of how many times it's invoked. Great for scroll events, mousemove, etc.

```js
// Approach 1: Timestamp-based (leading edge — fires immediately, then enforces gap)
function throttle(fn, limit) {
  let lastCallTime = 0;

  return function(...args) {
    const now = Date.now();

    if (now - lastCallTime >= limit) {
      lastCallTime = now;
      return fn.apply(this, args);
    }
    // Calls within the limit period are silently dropped
  };
}

// Approach 2: Flag-based (cleaner, trailing edge optional)
function throttleFlag(fn, limit) {
  let isThrottled = false;
  let lastArgs = null;
  let lastThis = null;

  function invoke() {
    fn.apply(lastThis, lastArgs);
    lastArgs = null;
    lastThis = null;
  }

  return function(...args) {
    if (isThrottled) {
      // Save the latest call to fire after the throttle window ends
      lastArgs = args;
      lastThis = this;
      return;
    }

    fn.apply(this, args);
    isThrottled = true;

    setTimeout(() => {
      isThrottled = false;
      if (lastArgs) invoke();
    }, limit);
  };
}

// Advanced throttle with both leading and trailing support
function throttleAdvanced(fn, limit, { leading = true, trailing = true } = {}) {
  let lastCallTime = 0;
  let timerId = null;

  return function(...args) {
    const now = Date.now();
    const remaining = limit - (now - lastCallTime);

    if (remaining <= 0 || remaining > limit) {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      if (leading) {
        lastCallTime = now;
        fn.apply(this, args);
      }
    } else if (!timerId && trailing) {
      const ctx = this;
      timerId = setTimeout(() => {
        lastCallTime = leading ? Date.now() : 0;
        timerId = null;
        fn.apply(ctx, args);
      }, remaining);
    }
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
const throttledScroll = throttle(() => {
  console.log(`Scroll handler fired at ${Date.now()}`);
}, 200);

// Rapid calls — only fires every 200ms at most
// window.addEventListener('scroll', throttledScroll);

// Simulate rapid calls
let count = 0;
const throttledIncrement = throttle(() => count++, 100);

throttledIncrement(); // fires → count = 1
throttledIncrement(); // ignored (within 100ms)
throttledIncrement(); // ignored
// After 100ms:
setTimeout(() => {
  throttledIncrement(); // fires → count = 2
  console.log(count);   // 2
}, 150);
```

**Debounce vs Throttle:**
| | Debounce | Throttle |
|---|---|---|
| When fn fires | After inactivity period | At regular intervals |
| Good for | Search input, form validation | Scroll, resize, mousemove |
| Guarantees execution | Only after pause | At most once per interval |
| Risk | May never fire if always active | Drops intermediate calls |

---

### Q52. What is the JavaScript event loop? Explain the call stack, task queue, and microtask queue.

**Overview:** JavaScript is single-threaded. The event loop is the mechanism that allows JS to handle asynchronous operations without blocking.

```
  ┌─────────────────────────────────┐
  │          Call Stack             │  ← Synchronous code runs here (LIFO)
  └─────────────────────────────────┘
           ↑ pops when empty
  ┌─────────────────────────────────┐
  │       Microtask Queue           │  ← Promise.then, queueMicrotask, MutationObserver
  └─────────────────────────────────┘
           ↑ drained completely before next macrotask
  ┌─────────────────────────────────┐
  │       Macrotask Queue           │  ← setTimeout, setInterval, I/O, UI events
  └─────────────────────────────────┘
```

**The Event Loop Algorithm (simplified):**
1. Execute all synchronous code in the call stack until it's empty.
2. Drain the entire microtask queue (run all microtasks, including any newly added ones).
3. Render the UI (browser only, if needed).
4. Take one macrotask from the task queue and push it to the call stack.
5. Go back to step 2.

```js
// ─── Demonstrating event loop order ──────────────────────────────────────────
console.log('START'); // Synchronous — runs immediately

setTimeout(() => {
  console.log('setTimeout'); // Macrotask — runs last
}, 0);

Promise.resolve()
  .then(() => console.log('Promise 1')) // Microtask
  .then(() => console.log('Promise 2')); // Microtask (chained after Promise 1)

queueMicrotask(() => console.log('queueMicrotask')); // Microtask

console.log('END'); // Synchronous — runs before async

// Output order:
// START
// END
// Promise 1
// queueMicrotask
// Promise 2
// setTimeout
```

**Call Stack:** A LIFO (Last In, First Out) data structure. When a function is called, a frame is pushed. When it returns, the frame is popped. Synchronous code runs entirely in the call stack.

**Microtask Queue:** Higher priority than macrotasks. Processed completely after every task (synchronous or macrotask) before the next macrotask begins. Examples: `Promise.then/catch/finally`, `queueMicrotask()`, `MutationObserver`.

**Macrotask Queue (Task Queue):** Lower priority. Only one macrotask is processed per event loop iteration, then the microtask queue is fully drained again. Examples: `setTimeout`, `setInterval`, `setImmediate` (Node.js), I/O callbacks, UI event handlers.

---

### Q53. What is the difference between microtasks and macrotasks? Give examples of each.

```js
// ─── Macrotasks (Task Queue) ──────────────────────────────────────────────────
// Scheduled via Web APIs; one per event loop tick
setTimeout(() => {}, 0);           // After at least 0ms delay
setInterval(() => {}, 1000);       // Every 1000ms
setImmediate(() => {});            // Node.js only — after I/O
requestAnimationFrame(() => {});   // Browser — before next paint
// Also: I/O callbacks, UI events (click, keydown), MessageChannel

// ─── Microtasks ───────────────────────────────────────────────────────────────
// Run after current task, before ANY macrotask
Promise.resolve().then(() => {});  // Promise callbacks
queueMicrotask(() => {});          // Explicit microtask scheduling
// Also: async/await continuations, MutationObserver callbacks

// ─── Demonstrating priority difference ───────────────────────────────────────
console.log('1 — sync');

setTimeout(() => console.log('2 — macrotask (setTimeout)'), 0);

Promise.resolve().then(() => {
  console.log('3 — microtask (Promise)');
  // Even THIS microtask schedules another microtask synchronously!
  Promise.resolve().then(() => console.log('4 — nested microtask'));
});

queueMicrotask(() => console.log('5 — microtask (queueMicrotask)'));

console.log('6 — sync');

// Output:
// 1 — sync
// 6 — sync
// 3 — microtask (Promise)       ← microtask queue starts draining
// 5 — microtask (queueMicrotask)
// 4 — nested microtask          ← nested microtask added DURING draining
// 2 — macrotask (setTimeout)    ← only AFTER ALL microtasks are done

// ─── Starvation risk with microtasks ─────────────────────────────────────────
// If microtasks keep adding more microtasks, the macrotask queue (and rendering)
// can be starved indefinitely:
function infiniteMicrotasks() {
  Promise.resolve().then(infiniteMicrotasks); // ← Never lets setTimeout run!
}
// Don't do this in production — it freezes the browser.
```

**Key rule:** After every task (synchronous block or macrotask), the JavaScript engine drains the entire microtask queue before moving to the next macrotask or rendering step. This means microtasks can add more microtasks, and they will all run before any macrotask.

| | Microtasks | Macrotasks |
|---|---|---|
| Priority | Higher | Lower |
| When processed | After every task, all at once | One per event loop tick |
| Examples | Promise, queueMicrotask | setTimeout, setInterval, events |
| Can starve render | Yes (if you keep adding) | No (one per tick) |

---

### Q54. What is the output of this code and why?

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// Output: 1, 4, 3, 2 — explain why
```

**Output:** `1`, `4`, `3`, `2`

**Step-by-step walkthrough:**

```js
// ─── Execution trace ──────────────────────────────────────────────────────────

// Step 1: console.log('1')
// → Synchronous, runs immediately. Call stack: [console.log('1')]
// Output: "1"

// Step 2: setTimeout(() => console.log('2'), 0)
// → Registers a macrotask. The callback is sent to the Web API.
// → After 0ms (or actually ~4ms minimum), the callback joins the macrotask queue.
// → Call stack is NOT blocked. JS engine moves on immediately.

// Step 3: Promise.resolve().then(() => console.log('3'))
// → Promise.resolve() creates an already-resolved Promise.
// → .then() schedules the callback as a MICROTASK (not immediately executed).
// → The microtask is placed in the microtask queue.

// Step 4: console.log('4')
// → Synchronous, runs immediately.
// Output: "4"

// ─── Call stack is now empty ──────────────────────────────────────────────────
// The event loop checks: Are there microtasks? YES.

// Step 5: Drain microtask queue
// → () => console.log('3') runs
// Output: "3"
// Microtask queue is now empty.

// Step 6: Event loop picks next macrotask
// → () => console.log('2') from setTimeout
// Output: "2"

// Final output order: 1, 4, 3, 2
```

**The key insight:**
1. **Synchronous code** always runs first — `1` then `4`.
2. **Microtasks** (Promise `.then`) run after the call stack is empty but before any macrotask — `3`.
3. **Macrotasks** (setTimeout) run last, one per event loop tick — `2`.

`setTimeout(..., 0)` does NOT mean "run immediately." It means "schedule this in the macrotask queue," which is always lower priority than microtasks.

---

### Q55. What is Promise.all vs Promise.allSettled vs Promise.race vs Promise.any?

```js
const p1 = Promise.resolve(1);
const p2 = Promise.resolve(2);
const p3 = Promise.reject(new Error('p3 failed'));
const p4 = new Promise(resolve => setTimeout(() => resolve(4), 100));

// ─── Promise.all ──────────────────────────────────────────────────────────────
// Waits for ALL to resolve. Rejects immediately if ANY rejects (fail-fast).
// Result: array of values in the same order as input.
Promise.all([p1, p2, p4])
  .then(values => console.log('all:', values))   // all: [1, 2, 4]
  .catch(err => console.log('all error:', err.message));

Promise.all([p1, p3, p4])
  .then(values => console.log('all:', values))
  .catch(err => console.log('all error:', err.message)); // all error: p3 failed

// ─── Promise.allSettled ───────────────────────────────────────────────────────
// Waits for ALL to settle (resolve OR reject). NEVER rejects itself.
// Result: array of { status: 'fulfilled'|'rejected', value|reason }
Promise.allSettled([p1, p3, p4])
  .then(results => {
    results.forEach(r => {
      if (r.status === 'fulfilled') console.log('settled ok:', r.value);
      else console.log('settled err:', r.reason.message);
    });
  });
// settled ok: 1
// settled err: p3 failed
// settled ok: 4

// ─── Promise.race ─────────────────────────────────────────────────────────────
// Resolves/rejects as soon as the FIRST promise settles (either way).
// Use case: timeout patterns
const timeout = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Timeout!')), 50)
);

Promise.race([p4, timeout]) // p4 resolves at 100ms, timeout rejects at 50ms
  .then(v => console.log('race:', v))
  .catch(e => console.log('race error:', e.message)); // race error: Timeout!

Promise.race([p1, p4]) // p1 resolves immediately
  .then(v => console.log('race fast:', v)); // race fast: 1

// ─── Promise.any ─────────────────────────────────────────────────────────────
// Resolves as soon as ANY resolves. Rejects only if ALL reject.
// Introduced in ES2021 (ES12).
Promise.any([p3, p1, p4])
  .then(v => console.log('any:', v))    // any: 1  (first to resolve)
  .catch(e => console.log('any err:', e.message));

Promise.any([p3, Promise.reject('also bad')])
  .catch(e => {
    console.log(e instanceof AggregateError); // true
    console.log(e.errors); // [Error: p3 failed, 'also bad']
    // AggregateError contains all rejection reasons
  });

// ─── Real-world patterns ──────────────────────────────────────────────────────

// 1. Parallel data fetching (all must succeed)
async function loadDashboard() {
  const [user, posts, notifications] = await Promise.all([
    fetch('/api/user').then(r => r.json()),
    fetch('/api/posts').then(r => r.json()),
    fetch('/api/notifications').then(r => r.json()),
  ]);
  return { user, posts, notifications };
}

// 2. Report results even if some fail
async function loadWidgets(widgetIds) {
  const results = await Promise.allSettled(
    widgetIds.map(id => fetch(`/api/widget/${id}`).then(r => r.json()))
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

// 3. Timeout wrapper using Promise.race
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// 4. Try multiple sources, use the fastest
function fetchFromFastest(urls) {
  return Promise.any(urls.map(url => fetch(url).then(r => r.json())));
}
```

**Summary table:**
| Method | Resolves when | Rejects when | Use case |
|---|---|---|---|
| `Promise.all` | ALL resolve | ANY rejects | Parallel requests that must all succeed |
| `Promise.allSettled` | ALL settle | Never | Collect all results regardless of failures |
| `Promise.race` | FIRST settles (either) | FIRST rejects | Timeout patterns |
| `Promise.any` | FIRST resolves | ALL reject | Use fastest/first available source |

---

### Q56. How does async/await work under the hood? What does await actually do?

```js
// ─── async/await IS syntactic sugar over Promises ─────────────────────────────

// This async/await code:
async function fetchUser(id) {
  const response = await fetch(`/api/user/${id}`);
  const user = await response.json();
  return user;
}

// Is essentially equivalent to this Promise chain:
function fetchUserPromise(id) {
  return fetch(`/api/user/${id}`)
    .then(response => response.json())
    .then(user => user);
}

// ─── What `async` does ────────────────────────────────────────────────────────
// 1. Wraps the return value in a Promise.
// 2. Allows the use of `await` inside the function.

async function getNumber() {
  return 42; // ← Automatically wrapped: returns Promise.resolve(42)
}

getNumber().then(console.log); // 42

// An async function ALWAYS returns a Promise, even if you return a plain value or nothing.
async function nothing() {} // Returns Promise<undefined>

// ─── What `await` does ────────────────────────────────────────────────────────
// `await expression` does three things:
// 1. Evaluates `expression` (gets the Promise or value)
// 2. Suspends the async function and yields control back to the event loop
// 3. Resumes the function when the Promise settles, with the resolved value

// Under the hood, `await` is equivalent to .then():
async function demo() {
  const result = await somePromise; // suspension point
  // Code after `await` becomes a microtask `.then()` callback
  console.log(result);
}

// The generator analogy (how engines implement it internally):
function* demoGenerator() {
  const result = yield somePromise;
  console.log(result);
}

// The async runtime is essentially a generator runner:
function runAsync(generatorFn) {
  const gen = generatorFn();

  function handle(result) {
    if (result.done) return Promise.resolve(result.value);
    return Promise.resolve(result.value).then(
      value => handle(gen.next(value)),
      err   => handle(gen.throw(err))
    );
  }

  return handle(gen.next());
}

// ─── Proof that await suspends and resumes ────────────────────────────────────
async function sequential() {
  console.log('A');
  const val = await Promise.resolve('B'); // suspends here
  console.log(val); // resumes as a microtask
  console.log('C');
}

sequential();
console.log('D'); // runs BEFORE B and C

// Output: A, D, B, C
// Explanation:
// "A" — synchronous, before any await
// "D" — synchronous code outside sequential() runs while sequential() is suspended
// "B" — resumption microtask after Promise.resolve() settles
// "C" — continues in the same microtask
```

**Key points:**
- `async` functions always return Promises.
- `await` pauses the function execution (not the entire thread — just that async function).
- Code after `await` is scheduled as a microtask when the awaited Promise resolves.
- Under the hood, JS engines transform async functions into state machines using generators.

---

### Q57. What happens if you await a non-Promise value?

```js
// Awaiting a non-Promise value is ALWAYS safe — it's wrapped in Promise.resolve()

async function examples() {
  // Awaiting a plain number
  const a = await 42;
  console.log(a); // 42

  // Awaiting a string
  const b = await 'hello';
  console.log(b); // "hello"

  // Awaiting null/undefined
  const c = await null;
  console.log(c); // null

  // Awaiting an object
  const d = await { foo: 'bar' };
  console.log(d); // { foo: 'bar' }

  // Awaiting an already-resolved Promise (still works)
  const e = await Promise.resolve(99);
  console.log(e); // 99

  // Awaiting a thenable (object with .then method)
  const thenable = {
    then(resolve) {
      resolve('thenable value');
    }
  };
  const f = await thenable;
  console.log(f); // "thenable value"
  // NOTE: await treats thenables as Promises — it calls .then() on them!
}

examples();

// ─── The thenable quirk ───────────────────────────────────────────────────────
// Any object with a .then method is treated as a Promise by await.
// This can cause surprising behavior:

const notAPromise = {
  then(onFulfilled) {
    // Simulates a synchronous thenable
    onFulfilled(42);
  }
};

async function thenableDemo() {
  const val = await notAPromise; // Calls notAPromise.then(...)
  console.log(val); // 42
}

// ─── Performance note: unnecessary await ─────────────────────────────────────
// Awaiting a non-Promise introduces a microtask tick unnecessarily:
async function unnecessary() {
  // This still works, but wastes a microtask turn:
  const x = await 5; // becomes Promise.resolve(5) then awaited
  return x;
}

// vs synchronous return:
async function direct() {
  return 5; // No extra microtask — result is available immediately on resolution
}

// ─── Practical implication ────────────────────────────────────────────────────
// You can safely await anything. Very useful for functions that may or may not
// be async depending on context:
async function processItem(item) {
  const data = await getItem(item); // works whether getItem returns value or Promise
  return data;
}

function getItem(x) {
  if (x > 0) return Promise.resolve(x * 2); // async path
  return x * 2; // sync path — await still handles it correctly
}
```

**Summary:** `await expr` is equivalent to `await Promise.resolve(expr)`. If `expr` is already a Promise, `Promise.resolve()` returns it as-is. If it's a plain value, it wraps it. This makes `await` safe with any value type.

---

### Q58. How do you handle errors in async/await? What are the pitfalls?

```js
// ─── Basic error handling: try/catch ─────────────────────────────────────────
async function fetchData(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Failed to fetch:', err.message);
    throw err; // Re-throw to let caller decide how to handle it
  }
}

// ─── Pitfall 1: Unhandled promise rejections ──────────────────────────────────
// BAD: If fetchData rejects, nothing catches it → UnhandledPromiseRejection
async function badUsage() {
  const data = await fetchData('/bad-url'); // If this rejects, crashes!
  console.log(data);
}

// GOOD: Always handle at the call site
async function goodUsage() {
  try {
    const data = await fetchData('/bad-url');
    console.log(data);
  } catch (err) {
    // Handle or log the error
    console.error('Error in goodUsage:', err.message);
  }
}

// ─── Pitfall 2: Catching errors but swallowing them silently ─────────────────
// BAD: Error is swallowed — bugs become invisible
async function silentFail() {
  try {
    await doSomething();
  } catch (err) {
    // Empty catch — never do this!
  }
}

// GOOD: Always log or re-throw
async function explicitFail() {
  try {
    await doSomething();
  } catch (err) {
    console.error('doSomething failed:', err);
    // Or: send to error tracking, show user message, etc.
    throw err; // Re-throw if the caller needs to know
  }
}

// ─── Pitfall 3: async forEach — errors are not caught by outer try/catch ─────
const ids = [1, 2, 3];

// BAD: forEach's callback errors aren't caught by the outer try/catch
async function badForEach() {
  try {
    ids.forEach(async (id) => {
      const data = await fetch(`/api/${id}`); // Error here is uncaught!
    });
  } catch (err) {
    console.log('Never reaches here!');
  }
}

// GOOD: Use for...of or Promise.all
async function goodForEach() {
  try {
    for (const id of ids) {
      const data = await fetch(`/api/${id}`);
      // Error here IS caught by the outer try/catch
    }
  } catch (err) {
    console.error('Failed:', err.message);
  }
}

// Or in parallel with proper error handling:
async function parallelWithErrors() {
  try {
    const results = await Promise.all(
      ids.map(id => fetch(`/api/${id}`).then(r => r.json()))
    );
    return results;
  } catch (err) {
    console.error('One of the fetches failed:', err.message);
  }
}

// ─── Pitfall 4: Not awaiting a Promise ───────────────────────────────────────
// BAD: The try/catch cannot catch async errors if you forget await
async function missingAwait() {
  try {
    doAsyncThing(); // Forgot await! Returns Promise, not the resolved value.
    // Error in doAsyncThing() is UNCAUGHT here
  } catch (err) {
    console.log('Never runs!');
  }
}

// ─── Pattern: .catch() chaining as an alternative ────────────────────────────
async function withCatchChain() {
  const user = await fetchUser(1).catch(() => null); // fallback on error
  const posts = await fetchPosts(1).catch(() => []); // empty array on error

  if (!user) {
    console.log('Could not load user');
    return;
  }

  return { user, posts };
}

// ─── Pattern: Error boundary wrapper ─────────────────────────────────────────
async function safeRun(fn, fallback = null) {
  try {
    return await fn();
  } catch (err) {
    console.error('[safeRun]', err.message);
    return fallback;
  }
}

const user = await safeRun(() => fetchUser(1), { id: 0, name: 'Guest' });
```

**Summary of pitfalls:**
1. Forgetting `try/catch` → unhandled rejections crash the process.
2. Empty `catch` blocks → silent failures, hard-to-debug bugs.
3. Using `async` in `forEach` → errors from the callbacks are not caught.
4. Forgetting `await` → the Promise is ignored, error is swallowed.
5. Not re-throwing → callers can't react to the error.

---

### Q59. Explain JavaScript's prototype chain with an example.

**Prototype chain:** Every JavaScript object has an internal `[[Prototype]]` link to another object (or `null`). When you access a property, JS walks up this chain until it finds it or reaches `null`.

```js
// ─── Basic prototype chain ────────────────────────────────────────────────────
const animal = {
  breathe() {
    return `${this.name} breathes`;
  }
};

const dog = {
  name: 'Rex',
  bark() {
    return 'Woof!';
  }
};

// Set animal as dog's prototype
Object.setPrototypeOf(dog, animal);
// Or: const dog = Object.create(animal);

console.log(dog.bark());    // "Woof!"    — found directly on dog
console.log(dog.breathe()); // "Rex breathes" — found on animal (prototype)

// Property lookup chain:
// dog.breathe
//  → Not on dog
//  → Look at dog.__proto__ (= animal) → found! Call it with this = dog

// ─── The chain with constructor functions ─────────────────────────────────────
function Animal(name) {
  this.name = name; // own property
}

Animal.prototype.breathe = function() {
  return `${this.name} breathes`;
};

Animal.prototype.toString = function() {
  return `[Animal: ${this.name}]`;
};

function Dog(name, breed) {
  Animal.call(this, name); // call super constructor
  this.breed = breed;
}

// Set up prototype chain: Dog.prototype → Animal.prototype → Object.prototype → null
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog; // fix the constructor reference

Dog.prototype.bark = function() {
  return 'Woof!';
};

const rex = new Dog('Rex', 'Labrador');

console.log(rex.name);      // "Rex"      — own property
console.log(rex.breed);     // "Labrador" — own property
console.log(rex.bark());    // "Woof!"    — on Dog.prototype
console.log(rex.breathe()); // "Rex breathes" — on Animal.prototype
console.log(rex.toString()); // "[Animal: Rex]" — on Animal.prototype

// The full chain:
// rex → Dog.prototype → Animal.prototype → Object.prototype → null

// ─── instanceof check walks the prototype chain ───────────────────────────────
console.log(rex instanceof Dog);    // true
console.log(rex instanceof Animal); // true
console.log(rex instanceof Object); // true

// ─── hasOwnProperty distinguishes own vs inherited ───────────────────────────
console.log(rex.hasOwnProperty('name'));    // true (own)
console.log(rex.hasOwnProperty('bark'));    // false (on prototype)
console.log(rex.hasOwnProperty('breathe')); // false (on Animal.prototype)

// ─── Visualizing the chain ────────────────────────────────────────────────────
// rex.__proto__               === Dog.prototype
// rex.__proto__.__proto__     === Animal.prototype
// rex.__proto__.__proto__.__proto__     === Object.prototype
// rex.__proto__.__proto__.__proto__.__proto__ === null

console.log(Object.getPrototypeOf(rex) === Dog.prototype);      // true
console.log(Object.getPrototypeOf(Dog.prototype) === Animal.prototype); // true
```

**Key insight:** The prototype chain is a lookup mechanism. It allows objects to inherit behavior without copying it. This is JavaScript's built-in mechanism for code reuse. Modifying a prototype object affects all instances that inherit from it.

---

### Q60. What is the difference between `__proto__` and `prototype`?

```js
// ─── prototype: belongs to FUNCTIONS (constructors) ──────────────────────────
// It's the object that becomes the [[Prototype]] of instances created by `new`.

function Dog(name) {
  this.name = name;
}

Dog.prototype.bark = function() { return 'Woof!'; };

// Dog.prototype is an object with a .constructor property pointing back to Dog
console.log(Dog.prototype);             // { bark: [Function], constructor: Dog }
console.log(Dog.prototype.constructor); // Dog

const rex = new Dog('Rex');
// When `new Dog()` runs, rex's [[Prototype]] is set to Dog.prototype

// ─── __proto__: belongs to INSTANCES (objects) ───────────────────────────────
// It's the actual [[Prototype]] link — points to the prototype of the creator function.

console.log(rex.__proto__ === Dog.prototype); // true — same object!
console.log(rex.__proto__.bark === Dog.prototype.bark); // true

// The relationship:
// rex.__proto__      → Dog.prototype  (the prototype object)
// Dog.prototype      → { bark, constructor }
// Dog.prototype.__proto__ → Object.prototype
// Object.prototype.__proto__ → null

// ─── The formal (non-deprecated) APIs ────────────────────────────────────────
// __proto__ is deprecated — use these instead:
Object.getPrototypeOf(rex);           // Get prototype
Object.setPrototypeOf(rex, someObj);  // Set prototype (avoid — slow)

// ─── Summary table in code form ──────────────────────────────────────────────
function Foo() {}
const foo = new Foo();

// prototype: property on CONSTRUCTOR FUNCTIONS
console.log(typeof Foo.prototype);  // "object"
console.log(typeof foo.prototype);  // "undefined" — instances don't have .prototype!

// __proto__: property on ALL OBJECTS (instances)
console.log(typeof foo.__proto__);  // "object"
console.log(typeof Foo.__proto__);  // "object" — Foo itself is an object too!
// Foo.__proto__ === Function.prototype (because Foo is a Function instance)

// ─── Surprising: Functions have both ─────────────────────────────────────────
// As a function: Foo.prototype → the object given to instances
// As an object: Foo.__proto__ → Function.prototype (Foo inherits from Function)
console.log(Foo.__proto__ === Function.prototype); // true
console.log(Foo.prototype !== Function.prototype); // true — different objects!

// ─── Class syntax uses the same mechanism ────────────────────────────────────
class Bar {}
class Baz extends Bar {}

const baz = new Baz();
console.log(Object.getPrototypeOf(baz) === Baz.prototype);       // true
console.log(Object.getPrototypeOf(Baz.prototype) === Bar.prototype); // true
console.log(Object.getPrototypeOf(Baz) === Bar);                 // true! (class static inheritance)
```

**Summary:**
| | `prototype` | `__proto__` |
|---|---|---|
| Belongs to | Constructor functions | All objects (instances) |
| Purpose | Template for instances created by `new` | The actual [[Prototype]] link |
| Access | `Dog.prototype` | `instance.__proto__` or `Object.getPrototypeOf(instance)` |
| Relation | `Dog.prototype === new Dog().__proto__` | Always points to creator's `prototype` |

---

### Q61. How does class syntax relate to prototypal inheritance under the hood?

**Class syntax is syntactic sugar over the prototype-based system. The JavaScript engine de-sugars classes into constructor functions and prototype assignments.**

```js
// ─── ES6 Class ────────────────────────────────────────────────────────────────
class Animal {
  constructor(name) {
    this.name = name; // own property
  }

  breathe() { // placed on Animal.prototype
    return `${this.name} breathes`;
  }

  static create(name) { // placed on Animal itself (not the prototype)
    return new Animal(name);
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name); // calls Animal.call(this, name)
    this.breed = breed;
  }

  bark() { // placed on Dog.prototype
    return 'Woof!';
  }

  describe() {
    return `${super.breathe()} and barks`; // super accesses Animal.prototype
  }
}

// ─── Equivalent ES5 (what the engine essentially does) ───────────────────────
function AnimalES5(name) {
  this.name = name;
}
AnimalES5.prototype.breathe = function() {
  return `${this.name} breathes`;
};
AnimalES5.create = function(name) {
  return new AnimalES5(name);
};

function DogES5(name, breed) {
  AnimalES5.call(this, name); // super(name)
  this.breed = breed;
}
DogES5.prototype = Object.create(AnimalES5.prototype); // extends
DogES5.prototype.constructor = DogES5;
Object.setPrototypeOf(DogES5, AnimalES5); // static method inheritance

DogES5.prototype.bark = function() { return 'Woof!'; };
DogES5.prototype.describe = function() {
  return `${AnimalES5.prototype.breathe.call(this)} and barks`; // super
};

// ─── Proving they're the same under the hood ─────────────────────────────────
const rex = new Dog('Rex', 'Labrador');

// Methods are on the prototype, NOT the instance
console.log(rex.hasOwnProperty('bark'));    // false — on Dog.prototype
console.log(rex.hasOwnProperty('breathe')); // false — on Animal.prototype
console.log(rex.hasOwnProperty('name'));    // true  — own property

console.log(typeof Dog);                    // "function" — class IS a function!
console.log(typeof Animal);                 // "function"

// Prototype chain is identical to ES5
console.log(Object.getPrototypeOf(rex) === Dog.prototype);          // true
console.log(Object.getPrototypeOf(Dog.prototype) === Animal.prototype); // true

// ─── Key differences: class vs function constructors ─────────────────────────

// 1. Classes are NOT hoisted (TDZ applies)
// new MyClass(); // ReferenceError — unlike function constructors
// class MyClass {}

// 2. Class methods are non-enumerable
for (const key in rex) console.log(key); // Only name, breed — NOT bark or breathe!
// ES5 prototype methods ARE enumerable by default.

// 3. Classes require `new` — calling without it throws TypeError
// Animal(); // TypeError: Class constructor Animal cannot be invoked without 'new'

// 4. `super` in constructors is required when extending
class SubWithoutSuper extends Animal {
  constructor() {
    // `this` is not available until super() is called — throws ReferenceError
    super('test');
  }
}

// ─── Mixins — composing behavior without class inheritance ───────────────────
const Serializable = (Base) => class extends Base {
  serialize() {
    return JSON.stringify(this);
  }
};

const Validatable = (Base) => class extends Base {
  validate() {
    return Object.keys(this).every(k => this[k] !== null);
  }
};

class User extends Serializable(Validatable(Animal)) {
  constructor(name, email) {
    super(name);
    this.email = email;
  }
}

const user = new User('Alice', 'alice@example.com');
console.log(user.serialize());  // '{"name":"Alice","email":"alice@example.com"}'
console.log(user.validate());   // true
console.log(user.breathe());    // "Alice breathes"
```

**Key takeaways:**
- `class` is syntactic sugar — `typeof MyClass === 'function'`.
- Methods defined in the class body go on `ClassName.prototype`, not the instance.
- `extends` sets up the prototype chain: `Child.prototype.__proto__ === Parent.prototype`.
- `static` methods are own properties of the class function itself, not the prototype.
- `super()` in a derived constructor is required before accessing `this`.
- Class methods are non-enumerable (unlike manually adding to `prototype`).

---

### Q62. Implement your own Object.create() from scratch.

```js
// Object.create(proto, propertiesObject) creates a new object with `proto`
// as its prototype, optionally with property descriptors.

// ─── Basic implementation ─────────────────────────────────────────────────────
function myObjectCreate(proto) {
  if (proto !== null && typeof proto !== 'object' && typeof proto !== 'function') {
    throw new TypeError('Object prototype may only be an Object or null');
  }

  function Temp() {} // Temporary constructor
  Temp.prototype = proto; // Set the prototype
  return new Temp();  // `new` sets __proto__ of the result to Temp.prototype
}

// ─── Full implementation (with property descriptors support) ─────────────────
function myObjectCreateFull(proto, propertiesObject) {
  if (proto !== null && typeof proto !== 'object' && typeof proto !== 'function') {
    throw new TypeError('Object prototype may only be an Object or null');
  }

  function Temp() {}
  Temp.prototype = proto;
  const obj = new Temp();

  if (propertiesObject !== undefined) {
    // propertiesObject uses the same format as Object.defineProperties
    Object.defineProperties(obj, propertiesObject);
  }

  return obj;
}

// ─── Tests ────────────────────────────────────────────────────────────────────
const animal = {
  breathe() {
    return `${this.name} breathes`;
  }
};

// Create object with animal as prototype
const dog = myObjectCreate(animal);
dog.name = 'Rex';
dog.bark = function() { return 'Woof!'; };

console.log(dog.bark());    // "Woof!" — own method
console.log(dog.breathe()); // "Rex breathes" — inherited from animal
console.log(Object.getPrototypeOf(dog) === animal); // true

// Create object with null prototype (no inherited methods)
const pureObj = myObjectCreate(null);
console.log(pureObj.toString); // undefined — no Object.prototype!
// Useful for pure hash maps:
pureObj.key = 'value';
console.log('key' in pureObj); // true — still works

// Using property descriptors
const person = myObjectCreateFull(
  { greet() { return `Hi, I'm ${this.name}`; } },
  {
    name: {
      value: 'Alice',
      writable: true,
      enumerable: true,
      configurable: true,
    },
    age: {
      value: 30,
      writable: false,    // read-only
      enumerable: true,
      configurable: false,
    }
  }
);

console.log(person.greet());        // "Hi, I'm Alice"
console.log(person.name);           // "Alice"
console.log(person.age);            // 30
person.age = 99;                    // Silently fails (writable: false)
console.log(person.age);            // 30 (unchanged)

// ─── Using myObjectCreate for classical inheritance ───────────────────────────
function Animal(name) {
  this.name = name;
}
Animal.prototype.breathe = function() {
  return `${this.name} breathes`;
};

function Dog(name, breed) {
  Animal.call(this, name);
  this.breed = breed;
}

// The key use of Object.create in inheritance:
Dog.prototype = myObjectCreate(Animal.prototype);
Dog.prototype.constructor = Dog;

Dog.prototype.bark = function() { return 'Woof!'; };

const rex = new Dog('Rex', 'Labrador');
console.log(rex.breathe()); // "Rex breathes"
console.log(rex.bark());    // "Woof!"
console.log(rex instanceof Animal); // true
console.log(rex instanceof Dog);    // true

// ─── Why not just Dog.prototype = Animal.prototype? ──────────────────────────
// If we did that, methods added to Dog.prototype would also appear on Animal.prototype,
// because they'd be the SAME object. Object.create creates a NEW object that
// delegates to Animal.prototype, keeping the chains separate.
```

**Why `Object.create` exists:**
1. Create objects with a specific prototype without using a constructor function.
2. Create `null`-prototype objects for safe dictionaries (no inherited `toString`, `hasOwnProperty`, etc.).
3. Set up prototype chains for inheritance without calling the parent constructor.
4. The core building block of prototypal inheritance patterns.
