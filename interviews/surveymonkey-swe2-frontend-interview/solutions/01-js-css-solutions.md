# Solutions — JavaScript Fundamentals + CSS (Q1–Q25)

---

## Q1. What is hoisting? What is the Temporal Dead Zone (TDZ)?

**Answer:**
JavaScript moves **declarations** to the top of their scope before code runs — this is hoisting. Only the *declaration* is hoisted, not the *initialisation*.

```js
// var — hoisted AND initialised to undefined
console.log(x); // undefined (no error)
var x = 5;

// let/const — hoisted but NOT initialised → TDZ
console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 10;

// Function declarations — fully hoisted (body included)
greet(); // "hi" — works fine
function greet() { console.log('hi'); }

// Function expressions — variable hoisted, function NOT
sayHi(); // TypeError: sayHi is not a function
var sayHi = function() { console.log('hi'); };
```

**TDZ (Temporal Dead Zone):** The window between when a `let`/`const` variable is hoisted and when it's initialised. Accessing it in this window throws a `ReferenceError`. This is why `let`/`const` are safer than `var`.

---

## Q2. `var` vs `let` vs `const` — differences and when to use each

| | `var` | `let` | `const` |
|--|-------|-------|---------|
| Scope | Function | Block | Block |
| Hoisting | Yes (undefined) | Yes (TDZ) | Yes (TDZ) |
| Re-declare | Yes | No | No |
| Re-assign | Yes | Yes | No |
| Global prop | Yes | No | No |

```js
// var leaks out of blocks
if (true) { var a = 1; }
console.log(a); // 1 — leaks!

if (true) { let b = 2; }
console.log(b); // ReferenceError — block-scoped ✓

// Classic loop bug with var
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 3, 3, 3 — all share same i
}
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 0, 1, 2 — each has own i ✓
}
```

**Rule of thumb:** Always use `const`. Use `let` only when reassignment is needed. Never use `var`.

---

## Q3. JavaScript Event Loop — microtasks vs macrotasks

**The execution model:**
1. **Call Stack** — synchronous code executes here (LIFO)
2. **Web APIs** — browser handles `setTimeout`, `fetch`, `DOM events`
3. **Microtask Queue** — Promises (`.then`, `.catch`), `queueMicrotask`, `MutationObserver`
4. **Macrotask Queue** — `setTimeout`, `setInterval`, `setImmediate`, I/O, UI events

**Rule:** After each macrotask, the event loop drains the *entire* microtask queue before picking the next macrotask.

```js
console.log('1');                          // sync → stack

setTimeout(() => console.log('2'), 0);    // macrotask queue

Promise.resolve().then(() => console.log('3')); // microtask queue

console.log('4');                          // sync → stack

// Output: 1, 4, 3, 2
// Why: sync runs first (1, 4), then microtasks (3), then macrotasks (2)
```

```js
// More complex example
setTimeout(() => console.log('timeout'), 0);

Promise.resolve()
  .then(() => {
    console.log('p1');
    return Promise.resolve();
  })
  .then(() => console.log('p2'));

console.log('sync');

// Output: sync → p1 → p2 → timeout
```

---

## Q4. Promises — `Promise.all` vs `Promise.allSettled` vs `Promise.race` vs `Promise.any`

```js
const p1 = Promise.resolve(1);
const p2 = Promise.resolve(2);
const pFail = Promise.reject('error');

// Promise.all — all must succeed; rejects on first failure (fail-fast)
Promise.all([p1, p2]).then(console.log);         // [1, 2]
Promise.all([p1, pFail]).catch(console.log);     // 'error'

// Promise.allSettled — waits for ALL, never rejects
Promise.allSettled([p1, pFail]).then(console.log);
// [
//   { status: 'fulfilled', value: 1 },
//   { status: 'rejected',  reason: 'error' }
// ]

// Promise.race — resolves/rejects with FIRST settled promise
Promise.race([
  new Promise(r => setTimeout(() => r('slow'), 200)),
  new Promise(r => setTimeout(() => r('fast'), 100)),
]).then(console.log); // 'fast'

// Promise.any — resolves with FIRST fulfilled (ignores rejections)
Promise.any([pFail, p1]).then(console.log); // 1
```

**When to use:**
- `all` — parallel API calls where you need ALL results (dashboard widgets)
- `allSettled` — fire-and-forget batch ops, want results even if some fail
- `race` — timeout pattern: race a fetch against a `setTimeout` rejection
- `any` — try multiple CDN sources, use whichever responds first

---

## Q5. `async/await` — how it works under the hood

`async/await` is **syntactic sugar over Promises**. An `async` function always returns a Promise. `await` pauses execution of the async function (but NOT the thread) until the Promise settles.

```js
// This:
async function fetchUser(id) {
  const res = await fetch(`/api/users/${id}`);
  const data = await res.json();
  return data;
}

// Is equivalent to:
function fetchUser(id) {
  return fetch(`/api/users/${id}`)
    .then(res => res.json())
    .then(data => data);
}

// Error handling
async function safeFetch(id) {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Fetch failed:', err);
    return null;
  }
}

// Parallel with async/await (don't await sequentially when independent)
async function loadDashboard(userId) {
  // BAD — sequential, total time = t1 + t2
  const user    = await fetchUser(userId);
  const surveys = await fetchSurveys(userId);

  // GOOD — parallel, total time = max(t1, t2)
  const [user, surveys] = await Promise.all([
    fetchUser(userId),
    fetchSurveys(userId),
  ]);
}
```

---

## Q6. Closure — what it is + real-world examples

A **closure** is a function that remembers variables from its outer scope even after the outer function has finished executing.

```js
// Basic closure
function makeCounter() {
  let count = 0;               // captured in closure
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}
const counter = makeCounter();
counter.increment(); // 1
counter.increment(); // 2
counter.value();     // 2

// Real-world: debounce (uses closure to hold timer reference)
function debounce(fn, delay) {
  let timer;                   // closed over
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Real-world: memoize
function memoize(fn) {
  const cache = new Map();     // closed over
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Real-world: partial application
function multiply(a) {
  return (b) => a * b;         // a is closed over
}
const double = multiply(2);
double(5); // 10
```

---

## Q7. `==` vs `===`

`==` performs **type coercion** before comparing. `===` (strict equality) compares value AND type — no coercion.

```js
0 == false   // true  (false coerces to 0)
0 === false  // false (different types)

'' == false  // true  (both coerce to 0)
null == undefined  // true  (special case)
null === undefined // false

NaN == NaN   // false (NaN is not equal to anything, including itself)
NaN === NaN  // false — use Number.isNaN(val) to check
```

**Rule:** Always use `===`. The only valid use of `==` is checking `null == undefined` to catch both.

---

## Q8. `this` — regular functions vs arrow functions

`this` in regular functions is determined by **how the function is called**, not where it's defined.
Arrow functions **capture `this` from their surrounding lexical scope** — they have no own `this`.

```js
const obj = {
  name: 'SurveyMonkey',

  // Regular function — `this` depends on caller
  greet() {
    console.log(this.name); // 'SurveyMonkey' when called as obj.greet()
  },

  // Arrow — `this` is outer scope (window/undefined in strict)
  greetArrow: () => {
    console.log(this.name); // undefined — `this` is NOT obj
  },

  // Common gotcha: callbacks
  greetAfter() {
    setTimeout(function() {
      console.log(this.name); // undefined — `this` is window/undefined
    }, 100);

    setTimeout(() => {
      console.log(this.name); // 'SurveyMonkey' — arrow captures outer `this` ✓
    }, 100);
  },
};
```

---

## Q9. Prototypal inheritance

Every JavaScript object has an internal `[[Prototype]]` link. When you access a property, JS walks the chain until it finds it or hits `null`.

```js
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  return `${this.name} makes a sound`;
};

function Dog(name, breed) {
  Animal.call(this, name);   // call parent constructor
  this.breed = breed;
}
// Set up prototype chain
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;
Dog.prototype.bark = function() { return 'Woof!'; };

const d = new Dog('Rex', 'Labrador');
d.speak(); // 'Rex makes a sound' — found on Animal.prototype
d.bark();  // 'Woof!' — found on Dog.prototype

// Modern class syntax (same prototype chain under the hood)
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound`; }
}
class Dog extends Animal {
  constructor(name, breed) { super(name); this.breed = breed; }
  bark() { return 'Woof!'; }
}
```

---

## Q10. `call` vs `apply` vs `bind`

All three control what `this` refers to inside a function.

```js
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}
const user = { name: 'Alice' };

// call — invoke immediately, args spread
greet.call(user, 'Hello', '!');   // 'Hello, Alice!'

// apply — invoke immediately, args as array
greet.apply(user, ['Hello', '!']); // 'Hello, Alice!'

// bind — returns a NEW function with `this` permanently bound
const boundGreet = greet.bind(user);
boundGreet('Hi', '.');  // 'Hi, Alice.'

// Real use: bind in class methods (before arrow functions)
class Timer {
  constructor() {
    this.seconds = 0;
    // Without bind, `this` inside tick would be window
    setInterval(this.tick.bind(this), 1000);
  }
  tick() { this.seconds++; }
}
```

---

## Q11. Shallow copy vs deep copy

```js
const original = { a: 1, b: { c: 2 } };

// SHALLOW copy — nested objects still share reference
const shallow1 = { ...original };
const shallow2 = Object.assign({}, original);
shallow1.b.c = 99;
console.log(original.b.c); // 99 — mutated! ⚠️

// DEEP copy options:
// 1. structuredClone (modern, handles Dates, Maps, Sets, circular refs)
const deep1 = structuredClone(original);

// 2. JSON round-trip (breaks Dates, functions, undefined, circular refs)
const deep2 = JSON.parse(JSON.stringify(original));

// 3. Recursive clone (for custom control)
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, deepClone(v)])
  );
}
```

---

## Q12. Event delegation

Instead of attaching a listener to each child element, attach ONE listener to a parent and use `event.target` to identify which child was clicked.

```js
// WITHOUT delegation — 1000 listeners for 1000 items
document.querySelectorAll('.survey-item').forEach(item => {
  item.addEventListener('click', handleClick); // memory-heavy
});

// WITH delegation — 1 listener for all items, including future ones
document.querySelector('.survey-list').addEventListener('click', (e) => {
  const item = e.target.closest('.survey-item');
  if (!item) return;
  handleClick(item.dataset.id);
});
```

**Benefits:**
- One listener instead of N → less memory
- Works for dynamically added elements (added after listener attached)
- Simpler cleanup (remove one listener)

---

## Q13. Debounce vs Throttle

**Debounce:** Delays execution until N ms *after the last call*. Good for search input (fire API only when user stops typing).

**Throttle:** Executes at most once every N ms regardless of call frequency. Good for scroll/resize handlers (fire at a controlled rate).

```js
// Debounce
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
const onSearch = debounce((query) => fetchResults(query), 300);

// Throttle
function throttle(fn, limit) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}
const onScroll = throttle(() => updateHeader(), 100);
```

---

## Q14. `typeof null === 'object'` — why?

This is a **historical bug in JavaScript** (since ES1, 1995). In the original JS engine, values were stored with a type tag. The tag for objects was `000`. `null` was represented as a null pointer (all zeros), so its type tag was also `000` — making `typeof null` return `'object'`.

It was never fixed because fixing it would break the web.

**Safe null check:**
```js
function isObject(val) {
  return val !== null && typeof val === 'object';
}
```

---

## Q15. What does `new` do internally?

```js
function Person(name) {
  this.name = name;
}

// `new Person('Alice')` does these 4 steps:
// 1. Create a new empty object
const obj = Object.create(Person.prototype);
// 2. Bind `this` to the new object and run the constructor
const result = Person.call(obj, 'Alice');
// 3. If constructor returns an object, use it; otherwise use obj
const instance = (typeof result === 'object' && result !== null) ? result : obj;
// instance === { name: 'Alice' }

// Verify
const alice = new Person('Alice');
alice instanceof Person; // true
alice.name; // 'Alice'
```

---

## Q16. Center an element — 3 approaches

```css
/* 1. Flexbox (most common, works perfectly) */
.parent {
  display: flex;
  justify-content: center;  /* horizontal */
  align-items: center;      /* vertical */
}

/* 2. CSS Grid */
.parent {
  display: grid;
  place-items: center; /* shorthand for both axes */
}

/* 3. Position absolute + transform (no parent flex/grid needed) */
.parent { position: relative; }
.child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

---

## Q17. CSS units — `rem`, `em`, `vw`, `vh`, `%`, `px`

| Unit | Relative to | Best for |
|------|------------|----------|
| `px` | Fixed pixels | Borders, shadows, precise sizes |
| `em` | Parent element's font-size | Component-level spacing (scales with component) |
| `rem` | Root (`html`) font-size (usually 16px) | Typography, global spacing |
| `%` | Parent element's dimension | Fluid widths, padding-top hacks |
| `vw` | 1% of viewport width | Full-width sections |
| `vh` | 1% of viewport height | Full-height hero sections |
| `dvh` | Dynamic viewport height | Mobile (accounts for browser chrome) |

```css
/* Responsive typography with rem */
html { font-size: 16px; }
h1 { font-size: 2rem; }   /* 32px */
p  { font-size: 1rem; }   /* 16px */

/* Component padding scales with its own font size */
.card { padding: 1em; }   /* padding = card's font-size */

/* Full-screen hero */
.hero { height: 100dvh; } /* dvh accounts for mobile keyboard */
```

---

## Q18. CSS Box Model + `box-sizing: border-box`

**Default (`content-box`):** `width` applies to content only. Padding and border are *added on top*.
```
Total width = width + padding-left + padding-right + border-left + border-right
```

**`border-box`:** `width` *includes* padding and border. Much more intuitive.
```css
/* Set globally — always do this */
*, *::before, *::after {
  box-sizing: border-box;
}

.box {
  width: 200px;
  padding: 20px;
  border: 2px solid black;
  /* content-box: total = 200 + 40 + 4 = 244px */
  /* border-box:  total = 200px exactly ✓ */
}
```

---

## Q19. CSS positioning

| Value | Positioned relative to | Stays in flow? |
|-------|----------------------|----------------|
| `static` (default) | Normal document flow | Yes |
| `relative` | Its own original position | Yes |
| `absolute` | Nearest positioned ancestor | No (removed from flow) |
| `fixed` | Viewport | No |
| `sticky` | Scroll container (hybrid) | Yes (until threshold) |

```css
/* absolute needs a positioned ancestor */
.card { position: relative; }   /* creates positioning context */
.badge {
  position: absolute;
  top: 8px;
  right: 8px; /* positions relative to .card */
}

/* sticky stays in flow until scroll threshold */
.header {
  position: sticky;
  top: 0; /* sticks when scrolled to top */
  z-index: 100;
}
```

---

## Q20. Flexbox vs CSS Grid

**Flexbox — 1-dimensional** (one axis at a time: row OR column)
- Use for: navbars, button groups, centering, distributing items along one axis

**Grid — 2-dimensional** (rows AND columns simultaneously)
- Use for: page layouts, card grids, dashboard panels, anything with rows + columns

```css
/* Flexbox: navbar */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Grid: page layout */
.page {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 64px 1fr 40px;
  grid-template-areas:
    "sidebar header"
    "sidebar main"
    "sidebar footer";
}

/* Grid: responsive card grid */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

---

## Q21. CSS Specificity

Specificity determines which rule wins when multiple rules target the same element.

**Score (a, b, c, d):**
- `a` = inline style (`style=""`) → 1000
- `b` = ID selector (`#id`) → 100
- `c` = class, pseudo-class, attribute (`[type]`) → 10
- `d` = element, pseudo-element (`::before`) → 1

```css
/* Specificity: (0,0,0,1) */
p { color: red; }

/* Specificity: (0,0,1,0) */
.title { color: blue; }

/* Specificity: (0,1,0,0) */
#main { color: green; }

/* Specificity: (0,0,2,1) — .card .title p */
.card .title p { color: purple; }
```

**!important** overrides everything (avoid it — use higher specificity instead).

---

## Q22. CSS Stacking context

A stacking context is an independent layer in the Z-axis. A new stacking context is created by:

```css
/* These all create a new stacking context: */
position: relative/absolute/fixed/sticky + z-index (not auto)
opacity: < 1
transform: any
filter: any
isolation: isolate   /* explicit, cleanest way */
will-change: transform
```

**Why z-index "doesn't work":** An element's `z-index` only competes with siblings in the *same* stacking context. A child can never visually escape its parent stacking context.

```css
/* Fix: use isolation: isolate on the parent to contain its context */
.modal-backdrop { isolation: isolate; }
```

---

## Q23. CSS custom properties vs SASS variables

| | CSS Custom Properties | SASS Variables |
|--|----------------------|----------------|
| Resolved at | Runtime | Compile time |
| Can change at runtime | Yes (JS, media queries) | No |
| Cascade/inherit | Yes | No |
| DevTools visibility | Yes | No (compiled away) |
| Browser support | Modern only | All (compiles to CSS) |

```css
/* CSS custom properties — live, cascade, can be JS-updated */
:root {
  --color-primary: #1a56db;
  --spacing-md: 1rem;
}

.button {
  background: var(--color-primary);
  padding: var(--spacing-md);
}

/* Override in dark mode at runtime */
@media (prefers-color-scheme: dark) {
  :root { --color-primary: #6ea6ff; }
}

/* Update from JS */
document.documentElement.style.setProperty('--color-primary', '#ff6b35');
```

---

## Q24. `z-index` — why it sometimes doesn't work

1. Only works on **positioned elements** (`position` ≠ `static`)
2. Stacking contexts — a child can't exceed its parent's stacking context
3. Same stacking context required for z-index comparison

```css
/* DOESN'T WORK — static element */
.tooltip { z-index: 9999; }  /* no effect — not positioned */

/* FIX */
.tooltip { position: relative; z-index: 9999; }

/* STACKING CONTEXT TRAP */
.container { opacity: 0.99; }  /* creates new stacking context! */
.container .modal { z-index: 9999; }  /* trapped inside container */
/* Fix: remove opacity hack, use rgba() instead */
```

---

## Q25. `display: none` vs `visibility: hidden` vs `opacity: 0`

| Property | Visible | Takes up space | Events | Accessible |
|----------|---------|----------------|--------|------------|
| `display: none` | No | No (removed from layout) | No | No (hidden from AT) |
| `visibility: hidden` | No | Yes | No | No |
| `opacity: 0` | No | Yes | **Yes** | Yes (still focusable) |

```css
/* display: none — completely removed, no space, accessible hide */
.hidden { display: none; }

/* visibility: hidden — invisible but holds space (e.g., skeleton loaders) */
.invisible { visibility: hidden; }

/* opacity: 0 — invisible but still interactive! (trap for modals) */
.transparent { opacity: 0; } /* pointer-events: none to prevent clicks */

/* Accessible hiding — visually hidden but available to screen readers */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
```
