# JavaScript — Core Concepts (Detailed Answers)

> Principal-level standard: explain the internal mechanism, the edge case, and the real-world implication — not just the syntax.

---

## 1. Closures

**Q: What is a closure? Give a real-world use case.**

**Verbal answer:**
> "A closure is a combination of a function and the lexical environment in which it was declared. When an inner function references variables from an outer function's scope, those variables are kept alive in memory even after the outer function has returned. JavaScript implements this via the scope chain — every function object holds a reference to its outer environment (the `[[Environment]]` internal slot in the spec). So it's not just a syntax feature, it's the way JS manages scope lifetime."

```js
// Closure in action — outer function returns, but 'count' lives on
function makeCounter(initial = 0) {
  let count = initial; // lives in the closure, not the stack

  return {
    increment: () => ++count,
    decrement: () => --count,
    reset:     () => { count = initial; },
    value:     () => count,
  };
}

const counter = makeCounter(10);
counter.increment(); // 11
counter.increment(); // 12
counter.reset();     // back to 10

// Two counters are fully independent — each has its OWN closure
const c1 = makeCounter(0);
const c2 = makeCounter(100);
c1.increment(); // 1
c2.increment(); // 101  — c1 and c2 don't share 'count'
```

**Common closure gotcha — loop variable capture:**
```js
// BUG: all callbacks close over the SAME 'i' (var is function-scoped)
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // prints 3, 3, 3
}

// FIX 1: use let (block-scoped — new binding per iteration)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 0, 1, 2
}

// FIX 2: IIFE to create a new scope per iteration
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 100))(i); // 0, 1, 2
}
```

**Real-world uses:**
- **Module pattern** — encapsulate private state; only expose a public API
- **Memoization** — cache function results in a closure-held Map
- **Partial application / currying** — freeze some arguments
- **React `useState`** — the dispatcher in React hooks is a closure over the fiber's hook list

**Follow-up: "Can closures cause memory leaks?"**
Yes. If a closure references a large object (like a DOM node or a large dataset), and that closure is long-lived (attached to an event listener or stored globally), the object can never be garbage collected even if you no longer need it. Always remove event listeners in cleanup and avoid closures over unnecessarily large scopes.

---

## 2. Event Loop & Concurrency

**Q: Explain the event loop in depth. What is the difference between microtask and macrotask queues?**

**Verbal answer:**
> "JavaScript is single-threaded — there's only one call stack. The runtime manages concurrency through an event loop. The loop continuously checks: is the call stack empty? If yes, pick the next task from the queue and push it to the stack. But there are two types of queues with different priorities. Microtasks — Promises, queueMicrotask, MutationObserver — are drained completely after each task before the browser renders or picks a new macrotask. Macrotasks — setTimeout, setInterval, I/O — are processed one per loop iteration. This means a chain of resolving Promises can starve the render pipeline if it runs too long."

```
[Call Stack]  →  empty?
                    ↓ yes
             [Microtask Queue]  ← drain ALL (Promise.then, queueMicrotask)
                    ↓ empty
             [Render] (requestAnimationFrame, style recalc, paint)
                    ↓
             [Macrotask Queue] ← take ONE (setTimeout, setInterval, I/O)
                    ↓
             [back to Call Stack]
```

```js
// Order of execution quiz
console.log('sync 1');                          // 1 (sync)

setTimeout(() => console.log('timeout'), 0);    // last (macrotask)

Promise.resolve()
  .then(() => console.log('micro 1'))           // 3 (microtask)
  .then(() => console.log('micro 2'));          // 4 (microtask — chained)

queueMicrotask(() => console.log('micro 3'));   // 5 (microtask)

console.log('sync 2');                          // 2 (sync)

// Output: sync 1, sync 2, micro 1, micro 2, micro 3, timeout
```

**Why rendering can be blocked:**
```js
// This infinite microtask loop FREEZES the browser — no render ever happens
function infiniteMicrotask() {
  Promise.resolve().then(infiniteMicrotask);
}
infiniteMicrotask();
```

**`requestAnimationFrame` — frame-rate-aware scheduling:**
```js
// Better than setTimeout for animations — fires just before next paint
function animate(timestamp) {
  element.style.transform = `translateX(${timestamp * 0.1}px)`;
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
```

**`setTimeout(fn, 0)` vs `Promise.resolve().then(fn)`:**
- `setTimeout(fn, 0)` — minimum ~4ms delay, macrotask — renders can happen between
- `Promise.resolve().then(fn)` — microtask — runs before any render, synchronously after current task

**Follow-up: "What happens if you throw inside a Promise?"**
An unhandled rejection is emitted. In Node.js it was a crash (now a warning then exit); in browsers it fires `window.onunhandledrejection`. Always attach `.catch()` or use `try/catch` inside async functions.

---

## 3. Prototype Chain & Inheritance

**Q: How does prototypal inheritance work under the hood?**

**Verbal answer:**
> "In JavaScript every object has an internal `[[Prototype]]` slot (accessible via `Object.getPrototypeOf(obj)` or the legacy `__proto__`). When you access a property, JS first looks on the object itself. If not found, it follows the prototype chain — checking `[[Prototype]]`, then its prototype, up to `Object.prototype`, then `null`. ES6 `class` syntax is purely syntactic sugar over this mechanism. There's no classical inheritance — no copying of methods. Objects delegate to their prototype at runtime."

```js
// --- Manual prototype chain ---
const animalProto = {
  breathe() { return `${this.name} breathes`; },
  toString() { return `[Animal: ${this.name}]`; },
};

const dogProto = Object.create(animalProto); // dogProto.__proto__ === animalProto
dogProto.bark = function() { return `${this.name} barks`; };

function createDog(name, breed) {
  const dog = Object.create(dogProto);
  dog.name = name;
  dog.breed = breed;
  return dog;
}

const rex = createDog('Rex', 'Labrador');
rex.bark();     // 'Rex barks'     — found on dogProto
rex.breathe();  // 'Rex breathes'  — found on animalProto (2 hops)
rex.toString(); // '[Animal: Rex]' — found on animalProto

// Prove the chain
Object.getPrototypeOf(rex) === dogProto;    // true
Object.getPrototypeOf(dogProto) === animalProto; // true

// --- ES6 class (same result, cleaner syntax) ---
class Animal {
  constructor(name) { this.name = name; }
  breathe() { return `${this.name} breathes`; }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }
  bark() { return `${this.name} barks`; }
}

// Under the hood: Dog.prototype.__proto__ === Animal.prototype
```

**Property shadowing:**
```js
const base = { x: 1 };
const child = Object.create(base);
child.x = 99; // shadows base.x — doesn't mutate base
console.log(base.x);  // 1
console.log(child.x); // 99
```

**`instanceof` vs `Object.getPrototypeOf`:**
```js
const d = new Dog('Rex', 'Lab');
d instanceof Dog;    // true — checks prototype chain
d instanceof Animal; // true — Dog.prototype is in the chain

// hasOwnProperty — check own (not inherited)
d.hasOwnProperty('name');  // true
d.hasOwnProperty('bark');  // false — bark is on Dog.prototype
```

---

## 4. `this` Keyword — All Binding Rules

**Q: Explain every `this` binding rule with examples. Where do developers get confused?**

**Verbal answer:**
> "The value of `this` is not about where a function is defined — it's about how it is called. There are four rules, applied in priority order: new binding beats explicit binding beats implicit binding beats default binding. Arrow functions are different — they don't have their own `this` at all, they inherit from their enclosing lexical scope at definition time."

```js
// --- RULE 1: Default binding ---
function showThis() { console.log(this); }
showThis();               // global (window) in non-strict, undefined in strict mode

// --- RULE 2: Implicit binding ---
const obj = { name: 'CV', greet() { return this.name; } };
obj.greet();              // 'CV' — this = obj

// Implicit binding LOST:
const fn = obj.greet;     // reference without call site context
fn();                     // undefined — this = global/undefined in strict

// Common bug in callbacks:
setTimeout(obj.greet, 0); // undefined — same reason

// --- RULE 3: Explicit binding ---
function greet(greeting) { return `${greeting}, ${this.name}`; }
greet.call({ name: 'Veerendra' }, 'Hello');   // 'Hello, Veerendra'
greet.apply({ name: 'Veerendra' }, ['Hi']);   // 'Hi, Veerendra'

const boundGreet = greet.bind({ name: 'Veerendra' });
boundGreet('Hey');         // 'Hey, Veerendra' — permanently bound

// --- RULE 4: new binding ---
function Person(name) {
  // 'this' is a brand-new empty object, returned automatically
  this.name = name;
  this.greet = function() { return `Hi, I'm ${this.name}`; };
}
const p = new Person('Veerendra'); // this = {}; → { name, greet }

// --- ARROW FUNCTIONS — lexical this ---
class Timer {
  constructor() {
    this.seconds = 0;
  }
  start() {
    // Without arrow, 'this' inside setInterval would be undefined/global
    setInterval(() => {
      this.seconds++; // 'this' = Timer instance — captured from start()
    }, 1000);
  }
}

// --- Priority order ---
const o = { name: 'obj' };
function fn2() { return this.name; }

// new > explicit > implicit > default
const bound = fn2.bind(o);
bound();            // 'obj'  — explicit wins
new bound();        // ''     — new wins over bind (new creates fresh object)
```

**Tricky interview question:**
```js
const obj2 = {
  value: 42,
  getValue: function() {
    return (() => this.value)(); // arrow inside regular method
  },
};
obj2.getValue(); // 42 — arrow captures 'this' from getValue's call context (obj2)
```

---

## 5. Memory Management & Garbage Collection

**Q: How does JavaScript's garbage collector work? What causes memory leaks and how do you diagnose them?**

**Verbal answer:**
> "JavaScript uses a mark-and-sweep garbage collector. Starting from root objects (window, stack variables), it marks all reachable objects. Anything not reachable is collected. A memory leak happens when you unintentionally keep a reference to an object you no longer need — making it 'reachable' even though it's logically dead. Common sources: detached DOM nodes, unremoved event listeners, accidental globals, uncleared timers and intervals, and closures capturing large scopes."

```js
// LEAK 1: Detached DOM nodes
let detachedList;
function createLeak() {
  const list = document.createElement('ul');
  for (let i = 0; i < 1000; i++) list.appendChild(document.createElement('li'));
  detachedList = list; // still referenced via JS variable
  document.body.removeChild(document.body.appendChild(list)); // removed from DOM
}
// Fix: set detachedList = null when done

// LEAK 2: Forgotten event listeners
function addListeners() {
  const btn = document.getElementById('btn');
  btn.addEventListener('click', handleClick); // if btn is removed, listener isn't GC'd
}
// Fix: btn.removeEventListener('click', handleClick) before removal
// Or: use AbortController
const controller = new AbortController();
btn.addEventListener('click', handleClick, { signal: controller.signal });
controller.abort(); // removes ALL listeners registered with this signal

// LEAK 3: Closure over large data
function processLargeData(data) {
  const HUGE_ARRAY = new Array(1_000_000).fill(0); // 8MB
  return function() {
    // HUGE_ARRAY is never used here, but closure holds reference
    return data.length; // only 'data' is needed
  };
}
// Fix: destructure only what you need, or scope carefully

// LEAK 4: uncleared setInterval in React
useEffect(() => {
  const id = setInterval(syncStatus, 5000);
  return () => clearInterval(id); // MUST clean up

  // Without cleanup: on unmount, setInterval callback still fires,
  // holds reference to setState, which holds reference to component fiber
}, []);

// LEAK 5: Global accumulation
window.cache = {}; // grows unboundedly if you keep adding to it
```

**Chrome DevTools diagnosis workflow:**
```
1. DevTools → Memory tab → Take Heap Snapshot (baseline)
2. Perform the suspected leaking action N times
3. Take another Heap Snapshot
4. Click "Comparison" view between snapshots
5. Sort by '# Delta' — look for Detached HTMLElement or growing constructor counts
6. Click on a suspect node → see retaining paths in the lower panel
```

---

## 6. Async/Await — Deep Internals

**Q: What happens under the hood with async/await? How do Promises relate to generators?**

**Verbal answer:**
> "async/await is syntactic sugar that the engine desugars into a state machine using Promises. Under the hood it's conceptually similar to a generator function — `await` is like `yield`, suspending execution at that point and resuming when the awaited Promise resolves. But unlike generators, you don't need to manually call `.next()` — the engine handles that. Every async function returns a Promise. If you throw inside an async function, the returned Promise is rejected."

```js
// async/await desugared manually (conceptual — not actual engine output)
async function fetchUserProfile(id) {
  const user = await fetchUser(id);
  const posts = await fetchPosts(user.id);
  return { user, posts };
}

// Equivalent Promise chain:
function fetchUserProfile(id) {
  return fetchUser(id).then(user =>
    fetchPosts(user.id).then(posts => ({ user, posts }))
  );
}

// --- Error handling patterns ---

// Pattern 1: try/catch (most readable)
async function loadData() {
  try {
    const data = await fetchData();
    return data;
  } catch (err) {
    logger.error('fetchData failed', err);
    return null; // graceful degradation
  }
}

// Pattern 2: helper to avoid repetitive try/catch
async function safeAwait(promise) {
  try {
    const data = await promise;
    return [null, data];
  } catch (err) {
    return [err, null];
  }
}
const [err, user] = await safeAwait(fetchUser(id));
if (err) { handle(err); return; }

// --- Parallelism ---

// WRONG — sequential (each awaits before starting next)
async function sequential() {
  const a = await fetch('/api/a');
  const b = await fetch('/api/b'); // waits for a to finish first
  return [a, b];
}

// RIGHT — parallel
async function parallel() {
  const [a, b] = await Promise.all([fetch('/api/a'), fetch('/api/b')]);
  return [a, b];
}

// CAREFUL — Promise.all rejects if ANY fails
// Use Promise.allSettled for independent failures
const results = await Promise.allSettled([fetch('/a'), fetch('/b')]);
results.forEach(r => {
  if (r.status === 'fulfilled') process(r.value);
  else logError(r.reason);
});

// --- Timeout wrapper ---
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

const data = await withTimeout(fetch('/api/slow'), 3000);
```

**Promise combinators summary:**
| Combinator | Resolves when | Rejects when |
|------------|--------------|--------------|
| `Promise.all` | ALL resolve | ANY rejects |
| `Promise.allSettled` | ALL settle (never rejects) | Never |
| `Promise.race` | FIRST settles (resolve or reject) | FIRST rejects |
| `Promise.any` | FIRST resolves | ALL reject |

---

## 7. Debounce vs Throttle — Full Implementations

**Q: Implement debounce and throttle. Handle edge cases: leading edge, trailing edge, cancellation.**

```js
// --- Complete Debounce with leading/trailing options ---
function debounce(fn, delay, { leading = false, trailing = true } = {}) {
  let timer = null;
  let lastArgs = null;

  function debounced(...args) {
    lastArgs = args;
    const shouldCallLeading = leading && !timer;

    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      timer = null;
      if (trailing && lastArgs) {
        fn.apply(this, lastArgs);
        lastArgs = null;
      }
    }, delay);

    if (shouldCallLeading) {
      fn.apply(this, args);
    }
  }

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timer && lastArgs) {
      clearTimeout(timer);
      fn.apply(this, lastArgs);
      timer = null;
      lastArgs = null;
    }
  };

  return debounced;
}

// --- Complete Throttle with trailing call support ---
function throttle(fn, limit) {
  let inThrottle = false;
  let lastArgs = null;

  return function throttled(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) { // execute the last skipped call
          throttled.apply(this, lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args; // save latest args for trailing call
    }
  };
}

// --- Usage examples ---
// Debounce: search input — fire after 300ms of no typing
const handleSearch = debounce((query) => fetchResults(query), 300);

// Debounce with leading: button click — fire immediately, ignore rapid clicks
const handleSubmit = debounce(submitForm, 500, { leading: true, trailing: false });

// Throttle: scroll event — max once per 100ms
window.addEventListener('scroll', throttle(updateScrollIndicator, 100));

// Throttle: resize handler
window.addEventListener('resize', throttle(recalcLayout, 200));
```

**When to use which:**
| Scenario | Debounce | Throttle |
|----------|----------|---------|
| Search autocomplete | ✅ Wait for pause | |
| Form validation while typing | ✅ | |
| Save as you type (auto-save) | ✅ | |
| Scroll position tracking | | ✅ Max rate |
| Mousemove drawing/hover | | ✅ |
| API rate limiting | | ✅ |
| Window resize handler | ✅ After done resizing | |

---

## 8. WeakMap, WeakSet & WeakRef

**Q: When do you need WeakMap? What problem does it solve that Map can't?**

**Verbal answer:**
> "The core issue is memory ownership. If you use a Map with an object as a key, the Map holds a strong reference to that object — it can NEVER be garbage collected as long as the Map exists. WeakMap holds a weak reference — if the object has no other strong references, it can be collected and the WeakMap entry vanishes automatically. This is critical when you want to associate metadata with objects you don't own the lifecycle of."

```js
// Problem with Map: component is removed from DOM but Map keeps it alive
const componentData = new Map();
function mountComponent(el) {
  componentData.set(el, { state: {}, handlers: [] }); // strong reference!
}
// Even if el is removed from DOM and all other code forgets it,
// componentData still holds it in memory — LEAK

// Solution with WeakMap: no extra memory ownership
const componentData = new WeakMap();
function mountComponent(el) {
  componentData.set(el, { state: {}, handlers: [] });
}
// When el is GC'd (no other references), WeakMap entry is automatically removed

// --- Private class fields (pre-# syntax) ---
const _privateData = new WeakMap();
class BankAccount {
  constructor(balance) {
    _privateData.set(this, { balance });
  }
  deposit(amount) {
    const data = _privateData.get(this);
    data.balance += amount;
  }
  get balance() {
    return _privateData.get(this).balance;
  }
}

// --- WeakRef — hold a reference that doesn't prevent GC ---
class Cache {
  constructor() {
    this.store = new Map(); // key → WeakRef<value>
    this.registry = new FinalizationRegistry((key) => {
      this.store.delete(key); // cleanup when value is collected
    });
  }

  set(key, value) {
    this.store.set(key, new WeakRef(value));
    this.registry.register(value, key);
  }

  get(key) {
    const ref = this.store.get(key);
    return ref?.deref(); // returns value or undefined if collected
  }
}
```

**Key restrictions of WeakMap:** Keys must be objects (not primitives), not iterable, no `.size` property — because the GC can run at any time and entries can disappear.

---

## 9. Generators & Async Iterators

**Q: What are generators and async generators? Where are they useful beyond basic iteration?**

```js
// --- Basic generator ---
function* range(start, end, step = 1) {
  for (let i = start; i <= end; i += step) yield i;
}

const evens = [...range(0, 10, 2)]; // [0, 2, 4, 6, 8, 10]

// Lazy evaluation — values computed only when needed
function* fibonacciSequence() {
  let [a, b] = [0, 1];
  while (true) { // infinite, but lazy
    yield a;
    [a, b] = [b, a + b];
  }
}

function take(n, iterable) {
  const result = [];
  for (const val of iterable) {
    result.push(val);
    if (result.length >= n) break;
  }
  return result;
}

take(8, fibonacciSequence()); // [0, 1, 1, 2, 3, 5, 8, 13]

// --- Async generator — paginate API lazily ---
async function* fetchAllJobs(baseUrl) {
  let cursor = null;
  do {
    const url = cursor ? `${baseUrl}?cursor=${cursor}` : baseUrl;
    const { jobs, nextCursor } = await fetch(url).then(r => r.json());
    yield* jobs; // yield each job individually
    cursor = nextCursor;
  } while (cursor);
}

// Consumer — process each job without loading all into memory
for await (const job of fetchAllJobs('/api/backup-jobs')) {
  await processJob(job);
}

// --- Generator for cancellable async flows (Redux-Saga style) ---
function* fetchUserSaga(action) {
  try {
    yield put(setLoading(true));
    const user = yield call(fetchUser, action.userId); // yield = wait for effect
    yield put(setUser(user));
  } catch (err) {
    yield put(setError(err.message));
  } finally {
    yield put(setLoading(false));
  }
}
```

---

## 10. JavaScript Modules — ESM vs CJS Deep Dive

**Q: Explain the module systems in depth. What is the dual module hazard?**

**Verbal answer:**
> "ESM and CommonJS are fundamentally different. CJS `require` is synchronous and dynamic — you can call it anywhere, conditionally. ESM `import` is static — analyzed at parse time. This static analysis is what enables tree-shaking: bundlers know at build time which exports are used and which aren't. The dual module hazard is when a library ships both CJS and ESM (via `package.json` `exports` field), and a consumer accidentally loads both — you end up with two instances of the module, which breaks singletons."

```js
// package.json exports field — proper dual-module config
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",   // ESM
      "require": "./dist/index.cjs",  // CJS
      "types": "./dist/index.d.ts"
    }
  }
}

// ESM — static, tree-shakeable
import { specific } from './utils'; // bundler sees ONLY this import is used
// import { everything } from './utils'; // vs this — static analysis

// Dynamic import — ESM supports runtime conditional loading
const module = await import(`./locales/${lang}.js`);

// Top-level await (ESM only)
const config = await loadConfig(); // valid in .mjs modules
export { config };
```

**Tree-shaking example:**
```js
// utils.js
export function used() { return 'I am used'; }
export function unused() { return 'I am dead code'; }

// main.js
import { used } from './utils'; // bundler eliminates 'unused' from output

// With CJS — bundler can't do this:
const utils = require('./utils'); // requires the whole module
```

---

## 11. Proxy & Reflect

**Q: What are Proxy and Reflect? Give a production use case.**

```js
// Proxy — intercept and redefine fundamental operations on objects
function createReactiveObject(target, onChange) {
  return new Proxy(target, {
    set(obj, prop, value) {
      const oldValue = obj[prop];
      obj[prop] = value; // perform the actual set
      if (oldValue !== value) onChange(prop, value, oldValue);
      return true; // indicate success
    },
    get(obj, prop) {
      const value = obj[prop];
      // Auto-wrap nested objects
      if (typeof value === 'object' && value !== null) {
        return createReactiveObject(value, onChange);
      }
      return value;
    },
    deleteProperty(obj, prop) {
      if (prop in obj) {
        delete obj[prop];
        onChange(prop, undefined, obj[prop]);
      }
      return true;
    },
  });
}

const state = createReactiveObject({ count: 0, user: { name: 'Veerendra' } }, (key, val) => {
  console.log(`${key} changed to ${val}`);
});

state.count = 1;         // logs: "count changed to 1"
state.user.name = 'VK'; // logs: "name changed to VK"

// This is essentially how Vue 3's reactivity system works (with Proxy)

// Reflect — provides default behavior for Proxy traps
// Always use Reflect inside Proxy to avoid breaking class inheritance
const handler = {
  get(target, prop, receiver) {
    console.log(`Getting ${prop}`);
    return Reflect.get(target, prop, receiver); // correct 'this' for getters
  },
};
```

---

## 12. Quick-Fire Q&A (Extended)

| Question | Detailed Answer |
|----------|----------------|
| `null == undefined`? | `true` — spec defines them as loosely equal. `null === undefined` is `false`. |
| `typeof null`? | `"object"` — a 32-bit type tag bug from JS v1 that was never fixed for backwards compat. |
| `typeof NaN`? | `"number"` — NaN is the only value not equal to itself. Use `Number.isNaN(x)`. |
| `var` vs `let` vs `const`? | `var` = function-scoped, hoisted (initialized to undefined); `let/const` = block-scoped, TDZ (hoisted but not initialized). |
| Temporal Dead Zone? | The period between entering the block and the `let/const` declaration. Accessing during this period throws `ReferenceError`. |
| `Object.freeze` vs `const`? | `const` makes the binding immutable (can't reassign). `freeze` makes the object's own properties immutable (shallow). Deep freeze needs recursion. |
| `structuredClone` vs JSON round-trip? | `structuredClone` handles circular refs, Date, RegExp, Map, Set, ArrayBuffer. JSON.parse/stringify loses those. |
| Optional chaining `?.`? | Short-circuits if left-hand is null/undefined instead of throwing. `obj?.a?.b?.c` returns undefined, not TypeError. |
| Nullish coalescing `??`? | Returns right-hand if left is null/undefined (not falsy). `0 ?? 'default'` → `0`; `0 \|\| 'default'` → `'default'`. |
| `Symbol`? | Unique primitive. `Symbol('x') !== Symbol('x')`. Used for non-enumerable object keys, well-known protocols (`Symbol.iterator`). |
| Tagged template literals? | Function called with array of string parts + interpolated values. Used by GraphQL `gql\`...\``, CSS-in-JS `css\`...\``. |
