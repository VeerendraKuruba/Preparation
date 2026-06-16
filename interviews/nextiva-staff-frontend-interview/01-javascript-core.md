# JavaScript Core — Nextiva Staff FE Q&A

---

## Q1: Event Loop — macrotasks vs microtasks

**Answer:** JavaScript is single-threaded. The event loop processes:
1. Execute synchronous code (call stack)
2. Drain **microtask queue** completely (Promises, `queueMicrotask`, `MutationObserver`)
3. Render (if needed)
4. Execute one **macrotask** (`setTimeout`, `setInterval`, I/O)
5. Repeat

**Interview trap:**
```javascript
async function foo() {
  console.log('A');
  await Promise.resolve();
  console.log('B');
}
foo();
console.log('C');
// A, C, B
```

---

## Q2: Implement `Promise.all` from scratch

```javascript
function promiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const results = [];
    let remaining = 0;
    let index = 0;

    for (const item of iterable) {
      const i = index++;
      remaining++;
      Promise.resolve(item).then(
        value => {
          results[i] = value;
          if (--remaining === 0) resolve(results);
        },
        reject
      );
    }

    if (index === 0) resolve([]);
  });
}
```

**Follow-up:** `Promise.allSettled`, `Promise.race`, error handling semantics.

---

## Q3: Implement throttle

```javascript
function throttle(fn, limit) {
  let inThrottle = false;
  let lastArgs;

  return function throttled(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn.apply(this, lastArgs);
          lastArgs = undefined;
        }
      }, limit);
    } else {
      lastArgs = args; // trailing call option
    }
  };
}
```

---

## Q4: Prototype inheritance vs class syntax

**Answer:** `class` is syntactic sugar over prototypes.

```javascript
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} speaks`; }
}

// Equivalent prototype style
function AnimalFn(name) { this.name = name; }
AnimalFn.prototype.speak = function() { return `${this.name} speaks`; };
```

**Staff insight:** Know `instanceof` checks prototype chain; understand why `arrow functions` can't be constructors.

---

## Q5: `this` binding rules (priority order)

1. `new` binding — `new Foo()` → `this` = new object
2. Explicit — `call`/`apply`/`bind`
3. Implicit — `obj.method()` → `this` = obj
4. Default — standalone function → `undefined` (strict) or `window`

**React relevance:** Class component methods needed `.bind(this)`; arrow functions in class fields capture lexical `this`.

---

## Q6: CS Fundamentals — Time/Space Complexity

Common frontend patterns:

| Operation | Typical complexity |
|-----------|-------------------|
| Array `.find` / `.filter` | O(n) |
| Binary search on sorted array | O(log n) |
| Hash map lookup | O(1) average |
| Virtual list render | O(visible items) not O(total) |
| DOM query `querySelectorAll` | O(n) DOM nodes |

**Example:** "Find duplicate contacts in a list" — use `Set` for O(n) time, O(n) space.

---

## Q7: Implement EventEmitter (pub/sub)

```javascript
class EventEmitter {
  #listeners = new Map();

  on(event, fn) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(fn);
    return () => this.#listeners.get(event)?.delete(fn);
  }

  emit(event, ...args) {
    this.#listeners.get(event)?.forEach(fn => fn(...args));
  }
}
```

**Real-time use:** Decouple WebSocket transport from UI — socket emits domain events, components subscribe.

---

## Q8: Serialization — structured clone vs JSON

| Method | Handles | Fails on |
|--------|---------|----------|
| `JSON.parse/stringify` | Plain objects, arrays | `Date`, `Map`, `undefined`, circular refs |
| `structuredClone` | Dates, Maps, Sets, typed arrays | Functions, DOM nodes |

**PostMessage / Web Workers:** Use structured clone algorithm.

---

## Q9: Memory leaks in SPAs

Common causes:
- Event listeners not removed on unmount
- `setInterval` without cleanup
- Closures holding large objects
- Detached DOM nodes referenced in JS
- Global caches without eviction (LRU needed)

**Debug:** Chrome DevTools → Memory → Heap snapshot comparison.

---

## Q10: Currying vs partial application

```javascript
// Currying — transforms f(a,b,c) into f(a)(b)(c)
const add = a => b => a + b;
add(2)(3); // 5

// Partial application — fix some arguments
const add5 = (a, b) => a + b;
const add5Partial = add5.bind(null, 5);
add5Partial(3); // 8
```

**Use in React:** Currying for configurable hooks/factories; partial for event handlers with bound IDs.
