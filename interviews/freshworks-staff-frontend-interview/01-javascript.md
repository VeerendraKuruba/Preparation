# JavaScript — Freshworks Staff Frontend Q&A

All questions confirmed or directly sourced from Freshworks interview reports.

---

## Q1: Implement a debounce function (CONFIRMED — most asked)

**Problem:** Wrap a function so it only fires after N ms of inactivity.

```js
function debounce(fn, delay) {
  let timer = null;

  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);  // preserve `this` context
    }, delay);
  };
}

// Usage
const onSearch = debounce((query) => fetchResults(query), 300);
input.addEventListener('input', (e) => onSearch(e.target.value));
```

**Follow-up: leading edge debounce** (fire immediately, then ignore for N ms):
```js
function debounceLeading(fn, delay) {
  let timer = null;
  return function (...args) {
    if (!timer) fn.apply(this, args);  // fire immediately on first call
    clearTimeout(timer);
    timer = setTimeout(() => { timer = null; }, delay);
  };
}
```

**Why asked:** Every Freshworks product (Freshdesk search, Freshsales filters) uses debounce. Tests practical performance knowledge.

---

## Q2: Implement throttle

**Problem:** Allow function to fire at most once every N ms regardless of call rate.

```js
function throttle(fn, limit) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}
```

**Debounce vs Throttle:**
- Debounce: waits for quiet period → good for search input
- Throttle: fires at regular intervals → good for scroll, resize events

---

## Q3: Implement custom `map()` (CONFIRMED)

```js
Array.prototype.myMap = function (callback) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    // pass value, index, original array — same as native map
    result.push(callback(this[i], i, this));
  }
  return result;
};

[1, 2, 3].myMap(x => x * 2); // [2, 4, 6]
```

**Also implement `filter` and `reduce`:**
```js
Array.prototype.myFilter = function (callback) {
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (callback(this[i], i, this)) result.push(this[i]);
  }
  return result;
};

Array.prototype.myReduce = function (callback, initialValue) {
  let acc = initialValue !== undefined ? initialValue : this[0];
  const start = initialValue !== undefined ? 0 : 1;
  for (let i = start; i < this.length; i++) {
    acc = callback(acc, this[i], i, this);
  }
  return acc;
};
```

---

## Q4: Flatten a nested array (CONFIRMED)

```js
// Recursive
function flatten(arr) {
  return arr.reduce((flat, item) =>
    flat.concat(Array.isArray(item) ? flatten(item) : item), []);
}

// Iterative with stack
function flattenIterative(arr) {
  const stack = [...arr];
  const result = [];
  while (stack.length) {
    const item = stack.pop();
    if (Array.isArray(item)) {
      stack.push(...item); // spread children back onto stack
    } else {
      result.unshift(item); // maintain order
    }
  }
  return result;
}

// Native (depth control)
[1, [2, [3, [4]]]].flat(Infinity); // [1, 2, 3, 4]
```

---

## Q5: String template interpolation (CONFIRMED)

**Problem:** Implement a function that replaces `{key}` placeholders in a string with values from an object.

```js
function interpolate(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return key in values ? values[key] : match; // leave unchanged if key missing
  });
}

interpolate('Hello, {name}! You have {count} messages.', { name: 'Alice', count: 3 });
// 'Hello, Alice! You have 3 messages.'

interpolate('Hi {name}, {unknown} stays.', { name: 'Bob' });
// 'Hi Bob, {unknown} stays.'
```

---

## Q6: Implement a Store class with `set`, `get`, `has` (CONFIRMED)

**Problem:** Store class that maps DOM Nodes (or objects) to values using reference equality.

```js
class Store {
  constructor() {
    this._map = new Map(); // Map uses reference equality for object keys
  }

  set(node, value) {
    this._map.set(node, value);
    return this; // allow chaining
  }

  get(node) {
    return this._map.get(node);
  }

  has(node) {
    return this._map.has(node);
  }

  delete(node) {
    return this._map.delete(node);
  }
}

// Usage
const store = new Store();
const node = document.createElement('div');
store.set(node, { clicks: 0 });
store.has(node); // true
store.get(node); // { clicks: 0 }
```

**Follow-up:** Use `WeakMap` instead if you don't need iteration and want automatic GC when nodes are removed from DOM.

---

## Q7: Serialize/deserialize types JSON doesn't support (CONFIRMED)

JSON cannot handle: `undefined`, `Date`, `BigInt`, `Map`, `Set`, `RegExp`, circular references, functions.

```js
// Custom replacer/reviver
function serialize(data) {
  return JSON.stringify(data, (key, value) => {
    if (value instanceof Date) return { __type: 'Date', value: value.toISOString() };
    if (value instanceof Map) return { __type: 'Map', value: [...value.entries()] };
    if (value instanceof Set) return { __type: 'Set', value: [...value] };
    if (typeof value === 'bigint') return { __type: 'BigInt', value: value.toString() };
    if (value === undefined) return { __type: 'undefined' };
    return value;
  });
}

function deserialize(str) {
  return JSON.parse(str, (key, value) => {
    if (value?.__type === 'Date') return new Date(value.value);
    if (value?.__type === 'Map') return new Map(value.value);
    if (value?.__type === 'Set') return new Set(value.value);
    if (value?.__type === 'BigInt') return BigInt(value.value);
    if (value?.__type === 'undefined') return undefined;
    return value;
  });
}

const data = { createdAt: new Date(), tags: new Set(['a', 'b']), count: 42n };
const str = serialize(data);
const restored = deserialize(str);
```

---

## Q8: Async `setTimeout` in a `for` loop (CONFIRMED tricky question)

```js
// What does this print?
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// Output: 3, 3, 3
// Reason: var is function-scoped. By the time callbacks run, loop is done, i = 3.

// Fix 1: use let (block-scoped, new binding per iteration)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000);
}
// Output: 0, 1, 2

// Fix 2: IIFE to capture current value (pre-ES6)
for (var i = 0; i < 3; i++) {
  (function (j) {
    setTimeout(() => console.log(j), 1000);
  })(i);
}
// Output: 0, 1, 2
```

---

## Q9: Implement `Promise.all`, `Promise.race`, `Promise.allSettled`

```js
// Promise.all — rejects if any rejects
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let completed = 0;

    if (promises.length === 0) return resolve([]);

    promises.forEach((p, i) => {
      Promise.resolve(p).then(value => {
        results[i] = value;
        if (++completed === promises.length) resolve(results);
      }).catch(reject);
    });
  });
}

// Promise.race — resolves/rejects with first settled
function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(p => Promise.resolve(p).then(resolve).catch(reject));
  });
}

// Promise.allSettled — never rejects, gives status for each
function promiseAllSettled(promises) {
  return Promise.all(
    promises.map(p =>
      Promise.resolve(p)
        .then(value => ({ status: 'fulfilled', value }))
        .catch(reason => ({ status: 'rejected', reason }))
    )
  );
}
```

---

## Q10: Cache API responses — flag-fetching with failure handling (CONFIRMED)

```js
class APICache {
  constructor(ttl = 60_000) {
    this._cache = new Map();
    this._ttl = ttl;
    this._inFlight = new Map(); // deduplicates concurrent requests
  }

  async fetch(url) {
    // Return cached if still fresh
    const cached = this._cache.get(url);
    if (cached && Date.now() - cached.timestamp < this._ttl) {
      return cached.data;
    }

    // Deduplicate: return same promise if already in-flight
    if (this._inFlight.has(url)) return this._inFlight.get(url);

    const promise = fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        this._cache.set(url, { data, timestamp: Date.now() });
        this._inFlight.delete(url);
        return data;
      })
      .catch(err => {
        this._inFlight.delete(url);
        // Return stale data if available, else rethrow
        if (cached) return cached.data;
        throw err;
      });

    this._inFlight.set(url, promise);
    return promise;
  }

  invalidate(url) {
    this._cache.delete(url);
  }
}
```

**Points to mention:** TTL-based expiry, request deduplication (same URL fired twice simultaneously → one fetch), stale-while-revalidate pattern, circuit-breaker for repeated failures.

---

## Q11: Event loop — output prediction questions

```js
// Q: What is the output?
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

queueMicrotask(() => console.log('4'));

console.log('5');

// Output: 1, 5, 3, 4, 2
// Reason:
// Sync: 1, 5
// Microtasks (drained before macrotasks): Promise.then → 3, queueMicrotask → 4
// Macrotask: setTimeout → 2
```

**Key rule:** Microtask queue (Promises, `queueMicrotask`) always drains completely before the next macrotask (setTimeout, setInterval) runs.
