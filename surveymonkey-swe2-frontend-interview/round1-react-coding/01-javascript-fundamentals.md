# Round 1 — JavaScript Fundamentals (Verbal Q&A)

Real candidates report the interviewer starts with JS theory before moving to React and then live coding.

---

## 1. Hoisting

**Q: What is hoisting in JavaScript?**

JavaScript moves variable and function declarations to the top of their scope before execution. Only declarations are hoisted, not initializations.

```js
console.log(x); // undefined (var is hoisted, initialized to undefined)
var x = 5;

console.log(y); // ReferenceError (let is hoisted but NOT initialized — TDZ)
let y = 10;

greet(); // works — function declarations are fully hoisted
function greet() { console.log("hi"); }

sayHi(); // TypeError — variable hoisted but not the function expression
var sayHi = function() { console.log("hi"); };
```

---

## 2. var vs let vs const

| Feature | var | let | const |
|---------|-----|-----|-------|
| Scope | Function | Block | Block |
| Hoisted | Yes (undefined) | Yes (TDZ) | Yes (TDZ) |
| Re-declare | Yes | No | No |
| Re-assign | Yes | Yes | No |

**Q: When would you still use `var`?**
Almost never in modern code. Only edge case: intentionally function-scoped variables or legacy browser support without transpilers.

---

## 3. Temporal Dead Zone (TDZ)

**Q: What is the Temporal Dead Zone?**

The period between entering a scope and the variable's declaration being evaluated. `let` and `const` exist in TDZ — accessing them throws `ReferenceError`.

```js
{
  console.log(a); // ReferenceError: Cannot access 'a' before initialization
  let a = 1;
}
```

Why it exists: prevents using variables before they're meaningfully initialized — a safety net.

---

## 4. Event Loop

**Q: Explain the JavaScript event loop.**

JS is single-threaded. The event loop coordinates:
- **Call Stack** — currently executing code
- **Web APIs** — setTimeout, fetch, DOM events (browser-handled)
- **Microtask Queue** — Promises, queueMicrotask (higher priority)
- **Macrotask Queue** — setTimeout, setInterval, I/O

**Order of execution:**
1. Execute current call stack to empty
2. Drain entire microtask queue (Promises)
3. Pick ONE macrotask (setTimeout callback)
4. Repeat

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');

// Output: 1, 4, 3, 2
// Why: sync first → microtasks (Promise) → macrotasks (setTimeout)
```

---

## 5. Promises — Promise.all vs Promise.allSettled

**Q: What's the difference between Promise.all and Promise.allSettled?**

```js
const p1 = Promise.resolve(1);
const p2 = Promise.reject('error');
const p3 = Promise.resolve(3);

// Promise.all — FAILS FAST: rejects as soon as one rejects
Promise.all([p1, p2, p3])
  .catch(err => console.log(err)); // 'error' — p3 result is lost

// Promise.allSettled — WAITS FOR ALL: always resolves with status of each
Promise.allSettled([p1, p2, p3])
  .then(results => console.log(results));
// [
//   { status: 'fulfilled', value: 1 },
//   { status: 'rejected', reason: 'error' },
//   { status: 'fulfilled', value: 3 }
// ]
```

**When to use which:**
- `Promise.all` — when ALL must succeed (e.g., parallel API calls where you need all data)
- `Promise.allSettled` — when you want results from all regardless of failures (e.g., batch operations, dashboard widgets)

**Other Promise combinators:**
- `Promise.race` — resolves/rejects as soon as the first one settles
- `Promise.any` — resolves when the first one fulfills (ignores rejections unless all reject)

---

## 6. Closures

**Q: What is a closure and give a real-world use case?**

A closure is a function that remembers the variables from its outer scope even after that scope has finished executing.

```js
function makeCounter() {
  let count = 0;
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
```

Real-world: memoization, currying, private state, event handlers with captured state.

---

## 7. this keyword

**Q: How does `this` work in JavaScript?**

`this` is determined by how a function is called, not where it's defined (except arrow functions).

```js
// Regular function — this = caller
const obj = {
  name: 'SM',
  greet() { console.log(this.name); } // 'SM'
};

// Arrow function — this = enclosing lexical scope
const obj2 = {
  name: 'SM',
  greet: () => console.log(this.name) // undefined (this = global/window)
};

// In class methods — use arrow functions to avoid binding issues
class Button {
  handleClick = () => { // arrow = no need to bind
    console.log(this); // always the class instance
  }
}
```

---

## 8. Prototype & Inheritance

**Q: How does prototypal inheritance work?**

Every object has an internal `[[Prototype]]` link. When you access a property, JS walks the prototype chain until it finds it or hits null.

```js
function Animal(name) { this.name = name; }
Animal.prototype.speak = function() { return `${this.name} speaks`; };

const dog = new Animal('Dog');
dog.speak(); // 'Dog speaks' — found on prototype, not on dog itself
```

ES6 classes are syntactic sugar over this.

---

## 9. Async/Await vs Promises

```js
// Same operation, different syntax:
fetch('/api/user')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

async function getUser() {
  try {
    const res = await fetch('/api/user');
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
```

**Parallel with async/await (common mistake to avoid):**
```js
// WRONG — sequential, slow
const a = await fetchA();
const b = await fetchB();

// CORRECT — parallel
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

---

## 10. Debounce vs Throttle

**Q: Implement debounce.**

```js
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
// Use: search input — fires after user stops typing
```

**Q: Implement throttle.**

```js
function throttle(fn, limit) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}
// Use: scroll/resize — fires at most once per interval
```
