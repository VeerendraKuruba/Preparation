# Round 4: Live Coding & Code Review (Super Day — Round 1)

**Duration:** 45–60 minutes  
**Interviewer:** Senior Engineer (SDE3) or VP-level  
**Format:** Live coding + possibly a code review scenario  
**Eliminates:** Yes

---

## Structure of This Round

| Part | Time | Content |
|---|---|---|
| Problem introduction | 5 min | Read problem, ask clarifying questions |
| Coding | 25–30 min | Write solution live |
| Code review scenario | 10–15 min | Review a mock PR for bugs/security issues |
| Questions for interviewer | 5 min | Ask about team, tech challenges |

---

## Part 1: Live Coding

### How to Approach Any Problem

1. **Repeat the problem** in your own words — confirms understanding
2. **Ask 2–3 clarifying questions:**
   - What are the input constraints? (size, type, null/empty?)
   - What should I return if no solution exists?
   - Should I optimize for time or space?
3. **Discuss your approach** before writing code — interviewers want to see thinking
4. **Start with brute force**, state its complexity, then optimize
5. **Write clean, readable code** — name variables meaningfully
6. **Test with examples and edge cases** before saying "done"

---

### Common Problem Types at JPMC

#### Problem 1: Implement Debounce

```javascript
/**
 * Implement a debounce function that delays the execution of fn
 * until after `delay` milliseconds have elapsed since the last call.
 * 
 * Use case: search input, resize handler
 */
function debounce(fn, delay) {
  let timerId = null;

  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// Usage:
const debouncedSearch = debounce((query) => fetchResults(query), 300);
input.addEventListener('input', (e) => debouncedSearch(e.target.value));

// Interview talking points:
// - Debounce: fires ONCE after the user stops; throttle: fires at regular intervals
// - Use debounce for: search, autocomplete, form validation
// - Use throttle for: scroll events, resize, real-time price feeds
```

---

#### Problem 2: Implement Throttle

```javascript
/**
 * Implement a throttle function that ensures fn is called at most
 * once every `limit` milliseconds.
 * 
 * Use case: scroll handlers, resize handlers, live market data
 */
function throttle(fn, limit) {
  let lastCallTime = 0;

  return function (...args) {
    const now = Date.now();
    if (now - lastCallTime >= limit) {
      lastCallTime = now;
      fn.apply(this, args);
    }
  };
}

// Leading + trailing edge version (more complete):
function throttleAdvanced(fn, limit) {
  let lastCallTime = 0;
  let timerId = null;

  return function (...args) {
    const now = Date.now();
    const remaining = limit - (now - lastCallTime);

    if (remaining <= 0) {
      clearTimeout(timerId);
      lastCallTime = now;
      fn.apply(this, args);
    } else if (!timerId) {
      timerId = setTimeout(() => {
        lastCallTime = Date.now();
        timerId = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}
```

---

#### Problem 3: Deep Clone an Object

```javascript
/**
 * Implement a deep clone function without using JSON.stringify
 * (because JSON.stringify fails on functions, undefined, Dates, circular refs)
 */
function deepClone(obj, visited = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj);
  if (visited.has(obj)) return visited.get(obj); // handle circular refs

  const clone = Array.isArray(obj) ? [] : {};
  visited.set(obj, clone);

  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key], visited);
  }

  return clone;
}

// Interview talking points:
// - WeakMap handles circular reference detection
// - Special handling needed for Date, RegExp, Map, Set
// - structuredClone() is the modern native alternative (ES2022)
// - JSON.parse(JSON.stringify(obj)) fails for functions, undefined, Dates
```

---

#### Problem 4: Flatten a Nested Array

```javascript
/**
 * Flatten a nested array to any specified depth.
 */
function flattenArray(arr, depth = Infinity) {
  if (depth === 0) return arr.slice();
  return arr.reduce((acc, val) => {
    if (Array.isArray(val)) {
      acc.push(...flattenArray(val, depth - 1));
    } else {
      acc.push(val);
    }
    return acc;
  }, []);
}

// Examples:
// flattenArray([1, [2, [3, [4]]]]) => [1, 2, 3, 4]
// flattenArray([1, [2, [3]]], 1) => [1, 2, [3]]

// Modern: arr.flat(Infinity) — but know the manual implementation
```

---

#### Problem 5: Implement Promise.all

```javascript
/**
 * Implement Promise.all from scratch.
 * Resolves when all promises resolve; rejects if any reject.
 */
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    if (promises.length === 0) {
      resolve([]);
      return;
    }

    const results = new Array(promises.length);
    let resolved = 0;

    promises.forEach((promise, index) => {
      Promise.resolve(promise).then((value) => {
        results[index] = value;
        resolved++;
        if (resolved === promises.length) {
          resolve(results);
        }
      }).catch(reject);
    });
  });
}

// Follow-up: implement Promise.allSettled, Promise.race, Promise.any
```

---

#### Problem 6: Find Duplicates in an Array

```javascript
/**
 * Return all duplicate elements in an array.
 */
function findDuplicates(arr) {
  const seen = new Set();
  const duplicates = new Set();

  for (const item of arr) {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  }

  return [...duplicates];
}

// Time: O(n), Space: O(n)
// Edge cases: empty array, no duplicates, all duplicates
```

---

## Part 2: Code Review Scenario

JPMC may show you a piece of code (a React component, an API call, or a utility function) and ask you to:
1. Identify bugs
2. Identify security issues
3. Suggest improvements

### Example: Code Review Challenge

**Given code:**
```jsx
// Flagged code for review
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => setUser(data));
  }, []);

  const handleDelete = () => {
    fetch(`/api/users/delete?id=${userId}`, { method: 'POST' });
  };

  return (
    <div>
      <h1>{user.name}</h1>
      <div dangerouslySetInnerHTML={{ __html: user.bio }} />
      <button onClick={handleDelete}>Delete Account</button>
    </div>
  );
}
```

**Issues to identify:**

1. **Bug: Missing dependency in useEffect**
   - `userId` is used inside useEffect but not in the dependency array
   - Fix: `useEffect(() => { ... }, [userId]);`

2. **Bug: Null access before data loads**
   - `user.name` will throw if `user` is null on initial render
   - Fix: Add loading state or use optional chaining: `user?.name`

3. **Security: XSS via dangerouslySetInnerHTML**
   - `user.bio` from API is rendered as raw HTML — attacker can inject script tags
   - Fix: Sanitize with DOMPurify before rendering, or render as text only

4. **Security: Missing CSRF protection on delete**
   - POST request with no CSRF token — vulnerable if cookies are used for auth
   - Fix: Include CSRF token in headers or use SameSite cookies

5. **UX/Safety: No confirmation before destructive action**
   - "Delete Account" has no confirmation dialog — accidental clicks destroy data
   - Fix: Add confirmation modal or at minimum a `window.confirm()`

6. **Security: No error handling**
   - If fetch fails, `user` stays null and the component crashes
   - Fix: Add `.catch()` and show an error state

---

## Preparation Checklist

- [ ] Implement debounce and throttle from memory
- [ ] Implement deep clone without JSON.stringify
- [ ] Implement Promise.all, Promise.race, Promise.allSettled
- [ ] Practice identifying XSS, null dereference, and missing deps in code reviews
- [ ] Practice explaining time/space complexity as you code
- [ ] Review async/await error handling patterns
