# Round 4 — Technical Phone Screen (45–60 min)

| | |
|---|---|
| **Format** | CoderPad / shared editor |
| **Eliminates?** | Yes |
| **Focus** | 1 DSA medium + 2–4 JS/React concept questions |

---

## Interview Flow (What to Say)

```
1. "Let me repeat the problem back…"           (30 sec)
2. "Can I ask — empty input allowed? Duplicates?" (30 sec)
3. "Brute force would be O(n³)… optimal is O(n) sliding window because…" (60 sec)
4. Code while narrating
5. "Trace with 'abcabcbb'… window expands… max is 3" (60 sec)
6. "Time O(n), space O(min(n, alphabet))"     (15 sec)
```

---

## DSA — Detailed Questions & Answers

### Q1: Longest substring without repeating characters

**Problem:** Given string `s`, return length of longest substring with all unique characters.

**Clarifying questions:**
- Empty string? → return 0
- Case sensitive? → usually yes
- ASCII only? → clarify; affects space complexity

**Approach (say aloud):**
> Brute force: all O(n²) substrings, check uniqueness O(n) → O(n³).
> Better: sliding window with `[start, end]` — expand `end`, when duplicate inside window, move `start` past last occurrence of that char. Track max window size.

**Solution:**
```js
function lengthOfLongestSubstring(s) {
  const lastSeen = new Map(); // char → last index
  let maxLen = 0;
  let start = 0;

  for (let end = 0; end < s.length; end++) {
    const char = s[end];

    if (lastSeen.has(char) && lastSeen.get(char) >= start) {
      // Duplicate inside current window — shrink from left
      start = lastSeen.get(char) + 1;
    }

    lastSeen.set(char, end);
    maxLen = Math.max(maxLen, end - start + 1);
  }

  return maxLen;
}
```

**Walkthrough `s = "abcabcbb"`:**
```
end=0 'a' → window [0,0] len=1 max=1
end=1 'b' → [0,1] len=2 max=2
end=2 'c' → [0,2] len=3 max=3
end=3 'a' → duplicate 'a' at index 0 → start=1 → [1,3] len=3 max=3
end=4 'b' → duplicate at 1 → start=2 → [2,4] len=3
end=5 'c' → start=3 → [3,5] len=3
end=6 'b' → start=5 → [5,6] len=2
end=7 'b' → start=7 → len=1
return 3
```

**Complexity:** Time O(n) — each char visited once. Space O(min(n, m)) where m = charset size.

**Follow-up:** Return the substring itself, not just length?
```js
// Track maxStart when updating maxLen
let maxStart = 0;
// when maxLen updates: maxStart = start;
return s.slice(maxStart, maxStart + maxLen);
```

---

### Q2: Course Schedule — can you finish all courses?

**Problem:** `numCourses` labeled 0..n-1, `prerequisites[i] = [a, b]` means take `b` before `a`. Return true if all courses completable.

**Approach (say aloud):**
> This is cycle detection in a directed graph. If there's a cycle, impossible. Use Kahn's algorithm — repeatedly take courses with indegree 0. If we process all n courses, no cycle.

**Solution:**
```js
function canFinish(numCourses, prerequisites) {
  const graph = Array.from({ length: numCourses }, () => []);
  const indegree = Array(numCourses).fill(0);

  for (const [course, prereq] of prerequisites) {
    graph[prereq].push(course);
    indegree[course]++;
  }

  const queue = [];
  for (let i = 0; i < numCourses; i++) {
    if (indegree[i] === 0) queue.push(i);
  }

  let processed = 0;
  while (queue.length > 0) {
    const course = queue.shift();
    processed++;

    for (const next of graph[course]) {
      indegree[next]--;
      if (indegree[next] === 0) queue.push(next);
    }
  }

  return processed === numCourses;
}
```

**Walkthrough:** `numCourses=3`, prereqs `[[1,0],[2,1]]`
- Graph: 0→1→2, indegrees [0,1,1]
- Queue starts [0], process 0 → unlock 1, process 1 → unlock 2, process 2 → processed=3 ✓

**Cycle example:** `[[1,0],[0,1]]` → processed=2 < 3 → false

**Follow-up — return valid order:**
```js
const order = [];
// inside loop after dequeue:
order.push(course);
// return order.length === numCourses ? order : [];
```

**Note:** `queue.shift()` is O(n) in JS arrays — mention you'd use index pointer at scale; fine for interview.

---

### Q3: Binary search on rotated sorted array

**Problem:** Sorted array rotated at unknown pivot, find `target` index or -1.

**Approach:**
> Standard binary search, but one half is always sorted. Check which half is sorted, then decide if target lies in that half.

```js
function search(nums, target) {
  let lo = 0, hi = nums.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;

    // Left half sorted
    if (nums[lo] <= nums[mid]) {
      if (target >= nums[lo] && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {
      // Right half sorted
      if (target > nums[mid] && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}
```

**Example:** `nums = [4,5,6,7,0,1,2], target = 0`
- mid=7, left [4,5,6,7] sorted, target 0 not in range → lo=mid+1
- Eventually find index 4

**Complexity:** O(log n) time, O(1) space.

---

### Q4: Card game with deque (reported 2025)

**Full solution with explanation:**

```js
class Deck {
  constructor() {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    this.cards = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        this.cards.push({ suit, rank });
      }
    }
    this.shuffle();
  }

  // Fisher-Yates — unbiased O(n)
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw() {
    return this.cards.pop() ?? null; // O(1) — top of deck
  }

  get remaining() {
    return this.cards.length;
  }
}

class CardGame {
  constructor() {
    this.deck = new Deck();
    this.hand = [];
    this.discard = []; // top = end of array
  }

  deal(n = 5) {
    this.hand = [];
    for (let i = 0; i < n; i++) {
      const card = this.deck.draw();
      if (card) this.hand.push(card);
    }
    return [...this.hand];
  }

  discardFromHand(index) {
    if (index < 0 || index >= this.hand.length) return null;
    const [card] = this.hand.splice(index, 1);
    this.discard.push(card);
    return card;
  }

  drawToHand() {
    const card = this.deck.draw();
    if (card) this.hand.push(card);
    return card;
  }
}
```

**Say aloud:** "Array as deque — `push`/`pop` O(1) at end. Avoid `shift()` for draw-from-front at scale."

---

## JavaScript — Detailed Q&A

### Q5: Event loop output

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
queueMicrotask(() => console.log('4'));
console.log('5');
```

**Output:** `1 5 3 4 2`

**Detailed explanation:**
1. **Call stack (sync):** `1`, then `5`
2. **Microtask queue:** Promise.then → `3`, queueMicrotask → `4`
3. **Macrotask queue:** setTimeout → `2`

**Follow-up:** Why does UI freeze if microtasks never end?
> Microtasks drain completely before next paint/macrotask. Infinite Promise chain starves rendering — break with setTimeout(0) or requestAnimationFrame.

---

### Q6: Implement debounce (with leading edge option)

```js
function debounce(fn, delay, { leading = false } = {}) {
  let timer = null;

  return function (...args) {
    const invoke = () => {
      timer = null;
      fn.apply(this, args);
    };

    if (leading && !timer) {
      fn.apply(this, args);
    }

    clearTimeout(timer);
    timer = setTimeout(invoke, delay);
  };
}
```

**When to use:** Search autocomplete — wait until user stops typing (~300ms).

**Pair with fetch:**
```js
const controllerRef = { current: null };

async function search(q) {
  controllerRef.current?.abort();
  controllerRef.current = new AbortController();
  const res = await fetch(`/api/search?q=${q}`, { signal: controllerRef.current.signal });
  return res.json();
}
```

**Debounce vs throttle:** Throttle = max once per interval (scroll). Debounce = after pause (search).

---

### Q7: Implement `Promise.all`

```js
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const promises = Array.from(iterable);
    const n = promises.length;

    if (n === 0) return resolve([]);

    const results = new Array(n);
    let settled = 0;

    promises.forEach((p, i) => {
      Promise.resolve(p).then(
        value => {
          results[i] = value;
          settled++;
          if (settled === n) resolve(results);
        },
        reject // fail-fast on first rejection
      );
    });
  });
}
```

**Semantics to mention:**
- Empty iterable → `[]` immediately
- Non-promises wrapped via `Promise.resolve`
- Order preserved even if later promises resolve first
- First rejection rejects entire `Promise.all`

**Follow-up — `Promise.allSettled`:**
```js
// Never reject outer promise; each result { status, value|reason }
```

---

### Q8: Closures — fix var loop

```js
// Output: 3 3 3
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}

// Fix 1: let (block scope per iteration)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}

// Fix 2: IIFE
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 0))(i);
}
```

**Explain:** `var` is function-scoped — one shared `i` after loop ends at 3. `let` creates new binding per iteration.

---

### Q9: `this` binding

```js
const obj = {
  name: 'Model Y',
  getName() { return this.name; },
  getNameArrow: () => this?.name,
};

obj.getName();           // 'Model Y'
const fn = obj.getName;
fn();                    // undefined (strict) — lost context
fn.call(obj);            // 'Model Y'
obj.getNameArrow();      // undefined — arrow uses lexical this
```

---

## React — Detailed Q&A

### Q10: What causes re-renders?

**Detailed answer:**

1. **State update** in this component — always re-renders self
2. **Parent re-render** — child re-renders unless `React.memo` and props shallow-equal
3. **Context value change** — all consumers re-render (unless split context / selector pattern)

**Example fix — search page:**
```jsx
// Problem: ResultsList re-renders on every keystroke in query input
function SearchPage() {
  const [query, setQuery] = useState('');
  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <HeavyResultsList filter={query} />
    </>
  );
}

// Fix: colocate query state in child, or memo HeavyResultsList
const HeavyResultsList = React.memo(function HeavyResultsList({ filter }) {
  // only re-renders when filter prop changes
});
```

**When memo doesn't help:** Unstable props `onClick={() => ...}` or `style={{}}` — new reference every parent render.

---

### Q11: `useEffect` pitfalls

**Bug 1 — stale closure:**
```jsx
useEffect(() => {
  fetchUser(userId); // missing userId in deps
}, []);
```

**Bug 2 — infinite loop:**
```jsx
useEffect(() => {
  setData(transform(items));
}, [items]); // if setData causes items to change → loop
```

**Correct fetch pattern:**
```jsx
useEffect(() => {
  let cancelled = false;
  const ac = new AbortController();

  (async () => {
    try {
      const res = await fetch(`/api/user/${userId}`, { signal: ac.signal });
      const data = await res.json();
      if (!cancelled) setUser(data);
    } catch (e) {
      if (!cancelled && e.name !== 'AbortError') setError(e.message);
    }
  })();

  return () => {
    cancelled = true;
    ac.abort();
  };
}, [userId]);
```

---

### Q12: Why not index as `key`?

**Detailed answer:**

> React uses `key` to match component instances across renders. Index keys break when list order changes:
>
> - Insert at front → all keys shift → wrong component state reused
> - Filter removes item → remaining components get wrong keys
> - Example: todo checkbox state "jumps" to wrong row
>
> Use stable unique id from data. Index only OK for static lists that never reorder/filter.

---

## Common Mistakes

| Mistake | Impact |
|---------|--------|
| Silent coding 3+ min | Interviewer thinks you're stuck |
| No clarifying questions | Wrong assumptions |
| Wrong complexity | Senior red flag |
| `shift()` in BFS at scale | Mention O(n) — shows depth |

---

## Prep Checklist

- [ ] Longest substring — code + trace from memory
- [ ] Course Schedule — code + explain cycle detection
- [ ] Event loop + debounce + Promise.all from memory
- [ ] Explain re-render causes with fix
- [ ] Warm up one easy problem morning of call

**Next round:** [05-onsite-coding-dsa.md](./05-onsite-coding-dsa.md)
