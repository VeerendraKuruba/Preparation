# JavaScript Core — Deep Dive

**When tested:** Live coding round, technical follow-ups  
**Priority:** High — JPMC tests JS fundamentals rigorously

---

## Event Loop & Concurrency Model

### Q: Explain the JavaScript event loop.

**Answer:**

JavaScript is single-threaded but handles async operations via the event loop:

1. **Call Stack** — executes synchronous code
2. **Web APIs** — browser handles async ops (setTimeout, fetch, DOM events)
3. **Microtask Queue** — high priority: Promises, queueMicrotask, MutationObserver
4. **Macrotask Queue (Task Queue)** — lower priority: setTimeout, setInterval, I/O

**Order of execution:**
1. Run all synchronous code (call stack)
2. Drain the entire microtask queue
3. Pick ONE macrotask from the task queue
4. Repeat

```javascript
console.log('1'); // sync

setTimeout(() => console.log('2'), 0); // macrotask

Promise.resolve().then(() => console.log('3')); // microtask

console.log('4'); // sync

// Output: 1, 4, 3, 2
// Why: sync runs first (1, 4), then microtasks (3), then macrotasks (2)
```

---

## Closures

### Q: What is a closure? Give a real-world use case.

**Answer:**

A closure is a function that retains access to variables from its outer (enclosing) scope, even after that outer function has returned.

```javascript
// Basic closure
function createCounter() {
  let count = 0; // enclosed variable
  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count,
  };
}

const counter = createCounter();
counter.increment(); // 1
counter.increment(); // 2
counter.getCount();  // 2
// `count` is private — not accessible from outside

// Real-world: React useState is essentially a closure
// The state variable is enclosed in React's internal state system
```

**Common closure pitfall:**
```javascript
// Bug: all functions share the same `i` reference
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // prints 3, 3, 3
}

// Fix 1: use let (block-scoped, creates new binding per iteration)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // prints 0, 1, 2
}

// Fix 2: IIFE to capture value
for (var i = 0; i < 3; i++) {
  ((j) => setTimeout(() => console.log(j), 100))(i); // 0, 1, 2
}
```

---

## Prototypal Inheritance

### Q: Explain prototypal inheritance. How does it differ from classical?

**Answer:**

JavaScript uses prototype chains, not classes (even ES6 `class` is syntactic sugar):

```javascript
// Prototype chain
const animal = {
  breathe() { return 'breathing'; }
};

const dog = Object.create(animal); // dog.__proto__ === animal
dog.speak = function() { return 'woof'; };

dog.speak();   // 'woof' — own property
dog.breathe(); // 'breathing' — found on prototype chain

// ES6 class (syntactic sugar over prototype chain)
class Animal {
  constructor(name) {
    this.name = name;
  }
  breathe() { return `${this.name} breathing`; }
}

class Dog extends Animal {
  speak() { return 'woof'; }
}

const d = new Dog('Rex');
d.speak();   // 'woof'
d.breathe(); // 'Rex breathing' — inherited

// Object.getPrototypeOf(d) === Dog.prototype
// Object.getPrototypeOf(Dog.prototype) === Animal.prototype
```

---

## `this` Keyword

### Q: How does `this` work in JavaScript?

**Answer:**

`this` is determined by how a function is **called**, not where it's defined:

```javascript
// 1. Regular function — this = caller
const obj = {
  name: 'JPMC',
  greet() { return this.name; }
};
obj.greet(); // 'JPMC'

// 2. Standalone call — this = undefined (strict) or window (sloppy)
const fn = obj.greet;
fn(); // undefined or window.name

// 3. Arrow function — inherits this from enclosing scope
class Timer {
  constructor() { this.count = 0; }
  start() {
    setInterval(() => {
      this.count++; // arrow captures Timer instance's `this`
    }, 1000);
  }
}

// 4. Explicit binding
fn.call(obj);      // this = obj
fn.apply(obj);     // same, args as array
const bound = fn.bind(obj); // returns new function with locked this
```

---

## Async/Await & Promises

### Q: What's the difference between Promise.all, Promise.allSettled, Promise.race, Promise.any?

**Answer:**

```javascript
const p1 = Promise.resolve('data1');
const p2 = Promise.reject(new Error('failed'));
const p3 = new Promise(resolve => setTimeout(() => resolve('data3'), 1000));

// Promise.all — resolves when ALL resolve; rejects if ANY rejects
Promise.all([p1, p3]).then(([d1, d3]) => /* ... */); // OK
Promise.all([p1, p2]).catch(err => /* fails immediately */);

// Promise.allSettled — waits for ALL, never rejects
// Returns array of { status: 'fulfilled'|'rejected', value/reason }
Promise.allSettled([p1, p2]).then(results => {
  results.forEach(r => {
    if (r.status === 'fulfilled') use(r.value);
    else logError(r.reason);
  });
});

// Promise.race — resolves/rejects with whichever settles FIRST
Promise.race([p3, timeoutPromise(500)]).catch(/* timeout if p3 > 500ms */);

// Promise.any — resolves with FIRST fulfillment; rejects if ALL reject
Promise.any([p1, p2]).then(firstSuccess => /* p1 wins */);
```

---

### Q: What is async/await and how does it handle errors?

```javascript
// async/await with error handling
async function fetchPortfolio(userId) {
  try {
    const response = await fetch(`/api/portfolio/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    // Handles both network errors and HTTP errors
    console.error('Failed to fetch portfolio:', error);
    throw error; // re-throw so caller can handle
  }
}

// Parallel fetching (don't await sequentially if independent)
async function fetchDashboard(userId) {
  // Wrong: sequential — 200ms + 300ms = 500ms
  const portfolio = await fetchPortfolio(userId);
  const prices = await fetchPrices();

  // Right: parallel — max(200ms, 300ms) = 300ms
  const [portfolio, prices] = await Promise.all([
    fetchPortfolio(userId),
    fetchPrices(),
  ]);
  return { portfolio, prices };
}
```

---

## Scope & Hoisting

### Q: What is hoisting? What gets hoisted?

```javascript
// var declarations hoisted (not initialization)
console.log(x); // undefined (not ReferenceError)
var x = 5;

// let/const NOT hoisted (Temporal Dead Zone)
console.log(y); // ReferenceError
let y = 5;

// Function declarations hoisted entirely
greet(); // 'hello' — works before declaration
function greet() { return 'hello'; }

// Function expressions NOT hoisted
greet2(); // TypeError: greet2 is not a function
var greet2 = function() { return 'hello'; };
```

---

## ES6+ Features (Must Know)

```javascript
// Destructuring
const { name, role = 'engineer' } = user;
const [first, ...rest] = items;

// Spread / Rest
const merged = { ...defaults, ...overrides };
function sum(...nums) { return nums.reduce((a, b) => a + b, 0); }

// Optional chaining & nullish coalescing
const city = user?.address?.city ?? 'Unknown';

// Tagged template literals
const query = gql`
  query GetUser($id: ID!) {
    user(id: $id) { name email }
  }
`;

// WeakMap / WeakSet — don't prevent GC
const cache = new WeakMap(); // key must be object; entries GC'd when key unreachable

// Proxy — intercept object operations
const validator = new Proxy(target, {
  set(obj, prop, value) {
    if (prop === 'age' && typeof value !== 'number') throw TypeError('age must be number');
    obj[prop] = value;
    return true;
  }
});
```

---

## Critical Rendering Path

### Q: How does the browser render a page?

**Answer (6 steps):**

1. **Parse HTML** → build DOM tree
2. **Parse CSS** → build CSSOM
3. **Combine** DOM + CSSOM → Render Tree (only visible elements)
4. **Layout** (Reflow) — calculate size/position of each element
5. **Paint** — fill in pixels
6. **Composite** — layer compositing for GPU-accelerated elements

**Performance implications:**
- **Reflow triggers** (avoid in hot paths): changing width/height, reading `offsetHeight`, `getBoundingClientRect`
- **Repaint triggers:** color, visibility changes (cheaper than reflow)
- **Compositing** (cheapest): `transform`, `opacity` — these don't trigger layout or paint
- Use `will-change: transform` to promote element to its own compositor layer

---

## Preparation Checklist

- [ ] Explain event loop output for any Promise + setTimeout combination
- [ ] Write closure-based counter, private state, memoize from memory
- [ ] Explain prototypal chain and how `class` maps to it
- [ ] Implement Promise.all, Promise.race manually
- [ ] Know all Promise combinators and when to use each
- [ ] Explain hoisting for var vs let vs function declarations
- [ ] Know how `this` works in arrow functions vs regular functions
- [ ] Explain the 6 steps of the Critical Rendering Path
