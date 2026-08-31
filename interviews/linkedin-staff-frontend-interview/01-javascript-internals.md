# JavaScript Internals — Phone Screen Deep Dive

> LinkedIn R1 heavily weights **mental execution** of JS. Master these patterns until you can explain without running code.

Cross-ref: [../../javascript/js-tricky-questions-answers.js](../../javascript/js-tricky-questions-answers.js)

---

## 1. Hoisting & Temporal Dead Zone

```javascript
console.log(x); // undefined (var hoisted, uninitialized)
var x = 5;

console.log(y); // ReferenceError (TDZ)
let y = 5;

foo(); // works — function declaration hoisted
function foo() {}

bar(); // TypeError — var bar hoisted as undefined
var bar = function () {};
```

**Interview tip:** Draw two phases — *Creation* (hoist) vs *Execution* (top to bottom).

---

## 2. Closures

A closure = function + reference to its outer lexical environment.

### Classic counter

```javascript
function createCounter(initial = 0) {
  let count = initial;
  return {
    increment() { return ++count; },
    get() { return count; },
  };
}
```

### Loop trap (`var` vs `let`)

```javascript
// Prints 3, 3, 3
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}

// Prints 0, 1, 2
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```

**Why:** `var` is function-scoped — one shared `i`. `let` is block-scoped — new binding per iteration.

### Closure interview patterns (recognize these)

| Pattern | Example use |
|---------|-------------|
| Function returning function | memoize, debounce, curry |
| Encapsulation without classes | module pattern, private state |
| Stateful handlers | once(), rate limiter |
| Partial application | bind-like utilities |

---

## 3. Prototypes & Inheritance

```javascript
function Person(name) {
  this.name = name;
}
Person.prototype.greet = function () {
  return `Hi, ${this.name}`;
};

const p = new Person("Ada");
// p.__proto__ === Person.prototype
// Person.prototype.constructor === Person
```

**Common questions:**
- Difference between `__proto__` and `prototype`?
- What does `new` do? (create object, set proto, call constructor, return object)
- `Object.create(proto)` vs `class extends`?
- How does method lookup work? (walk prototype chain)

---

## 4. `this` Binding

| Call style | `this` |
|------------|--------|
| `obj.method()` | `obj` |
| `fn()` strict mode | `undefined` |
| `fn()` non-strict | `globalThis` |
| `call/apply/bind` | Explicit |
| Arrow function | Lexical (outer scope) |
| DOM handler | Element (usually) |

```javascript
const obj = {
  name: "LinkedIn",
  regular() { return this.name; },
  arrow: () => this?.name,
};
obj.regular(); // "LinkedIn"
obj.arrow();   // undefined (lexical this from module/global)
```

---

## 5. Event Loop

Order: **Sync → Microtasks → Macrotasks**

```javascript
console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
queueMicrotask(() => console.log("4"));
console.log("5");
// 1, 5, 3, 4, 2
```

**Microtasks:** `Promise.then`, `queueMicrotask`, `MutationObserver`  
**Macrotasks:** `setTimeout`, `setInterval`, I/O, UI rendering

**Follow-up:** What happens if microtasks keep scheduling microtasks? (Starve macrotasks — bad in production.)

---

## 6. Type Coercion

```javascript
[] + []           // ""
[] + {}           // "[object Object]"
{} + []           // 0 (unary + coerces to number in some contexts) — know ambiguity
null == undefined // true
null === undefined // false
[] == false       // true
```

**Rule of thumb for interviews:** Walk through `ToPrimitive` → if string hint, `toString` first for objects.

---

## 7. Async Patterns

### Promises vs callbacks

| | Callback | Promise |
|---|----------|---------|
| Composition | Callback hell | `.then` / `async/await` |
| Error handling | err-first callback | `.catch` |
| Cancellation | Manual | `AbortController` (fetch) |

### `async/await` pitfalls

```javascript
async function bad() {
  items.forEach(async (item) => {
    await process(item); // forEach ignores async — doesn't await
  });
}

async function good() {
  for (const item of items) {
    await process(item);
  }
}
```

---

## 8. Higher-Order Functions (Live Coding Building Blocks)

You should implement from memory:

| Utility | Core idea |
|---------|-----------|
| `memoize(fn)` | Closure + Map cache |
| `debounce(fn, ms)` | Reset timer on each call |
| `throttle(fn, ms)` | Execute at most once per window |
| `once(fn)` | Return fn that runs only first time |
| `curry(fn)` | Partial application chain |
| `pipe(...fns)` | Compose left-to-right |

Repo: [../../javascript-machine-coding/](../../javascript-machine-coding/)

---

## 9. Guess-the-Output Drill Set

Run timed drills: [../practice/guess-the-output.js](../practice/guess-the-output.js)

Target: **8/10 in 15 minutes** with full explanation.

---

## 10. Staff-Level Follow-ups They Ask

| After you answer | They might ask |
|------------------|----------------|
| Memoize | LRU eviction? TTL? Memory leak? |
| Closure counter | Thread-safe? (JS is single-threaded — but Workers?) |
| Event loop | How would you prioritize user input vs analytics batch? |
| Prototype | Performance cost of prototype chain lookup? (negligible; hidden classes matter in V8) |
| Coercion | Why `===` is default in codebases? |

---

## Quick Reference Card (Memorize)

```
HOISTING:     var → undefined; let/const → TDZ; function decl → hoisted fully
CLOSURE:      inner fn + outer bindings (live, not copied)
EVENT LOOP:   sync → micro → macro
THIS:         arrow = lexical; else = call site
MEMOIZE:      Map + key from args + return wrapper fn
DELEGATION:   parent listener + event.target.closest(selector)
```
