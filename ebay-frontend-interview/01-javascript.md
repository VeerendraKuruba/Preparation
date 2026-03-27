# JavaScript — eBay Frontend Interview Q&A

---

## Q1: What is a closure? Give a practical example.

**Answer:**
A closure is a function that retains access to its outer scope even after the outer function has returned.

```js
function makeCounter() {
  let count = 0;
  return function () {
    count++;
    return count;
  };
}

const counter = makeCounter();
counter(); // 1
counter(); // 2
// `count` is not accessible from outside — that's the closure
```

**Why it matters:** Used for data encapsulation, factory functions, memoization, and event handler creation in loops.

---

## Q2: Explain the JavaScript event loop.

**Answer:**
JS is single-threaded. The event loop coordinates:

- **Call Stack** — executes synchronous code
- **Web APIs** — handles async (setTimeout, fetch, DOM events)
- **Callback/Task Queue** — macrotasks (setTimeout, setInterval)
- **Microtask Queue** — Promises (`.then`), `queueMicrotask` — runs before macrotasks

**Execution order:**
1. Run all synchronous code (call stack empties)
2. Drain microtask queue completely
3. Pick one macrotask from task queue
4. Repeat

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// Output: 1, 4, 3, 2
```

---

## Q3: What is hoisting?

**Answer:**
Variable and function declarations are moved to the top of their scope at compile time.

```js
console.log(x); // undefined (not ReferenceError) — var is hoisted
var x = 5;

foo(); // works — function declarations are fully hoisted
function foo() { return 'bar'; }

console.log(y); // ReferenceError — let/const are hoisted but in Temporal Dead Zone
let y = 10;
```

**Rule:** `var` hoisted + initialized to `undefined`. `let`/`const` hoisted but not initialized (TDZ). Function declarations fully hoisted.

---

## Q4: Explain `this` binding — how does it work?

**Answer:**
`this` is determined at call time, not definition time.

| Context | `this` value |
|---------|-------------|
| Global (non-strict) | `window` |
| Global (strict) | `undefined` |
| Method call (`obj.fn()`) | `obj` |
| Arrow function | Lexically inherited from enclosing scope |
| `call` / `apply` / `bind` | Explicitly set |
| `new` keyword | Newly created object |

```js
const obj = {
  name: 'eBay',
  greet() { return this.name; },              // 'eBay'
  greetArrow: () => this.name,               // undefined — arrow captures outer `this`
};
```

---

## Q5: What is prototypal inheritance?

**Answer:**
Every JS object has a `[[Prototype]]` chain. Property lookup walks up the chain until found or `null`.

```js
function Animal(name) { this.name = name; }
Animal.prototype.speak = function () { return `${this.name} makes a sound`; };

function Dog(name) { Animal.call(this, name); }
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;

const d = new Dog('Rex');
d.speak(); // 'Rex makes a sound' — found via prototype chain
```

ES6 `class` syntax is syntactic sugar over this.

---

## Q6: `==` vs `===` — when does type coercion happen?

**Answer:**
- `===` (strict equality): no coercion — checks type AND value
- `==` (loose equality): coerces types before comparing

```js
0 == false   // true  — false → 0
'' == false  // true  — both → 0
null == undefined // true — special case
null == 0    // false — null only equals undefined with ==
```

**Rule:** Always use `===`. The only common exception is `x == null` to check for both `null` and `undefined`.

---

## Q7: What are Promises? How does async/await relate?

**Answer:**
A Promise is an object representing the eventual completion or failure of an async operation.

```js
// Promise chain
fetch('/api/items')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// async/await — syntactic sugar over Promises
async function loadItems() {
  try {
    const res = await fetch('/api/items');
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(err);
  }
}
```

`async/await` doesn't make code synchronous — it just makes async code read top-to-bottom.

---

## Q8: What is the difference between `var`, `let`, and `const`?

| | `var` | `let` | `const` |
|--|-------|-------|---------|
| Scope | Function | Block | Block |
| Hoisting | Yes (undefined) | Yes (TDZ) | Yes (TDZ) |
| Re-declare | Yes | No | No |
| Re-assign | Yes | Yes | No |

`const` prevents re-assignment, not mutation — you can still push to a `const` array.

---

## Q9: What happens when you type a URL into the browser? (Confirmed eBay question)

**Answer:**
1. **DNS resolution** — browser cache → OS cache → recursive DNS lookup → IP address
2. **TCP connection** — 3-way handshake (SYN, SYN-ACK, ACK)
3. **TLS handshake** (for HTTPS) — certificate exchange, cipher negotiation
4. **HTTP request** — GET request sent with headers (Host, Accept, cookies)
5. **Server response** — HTML document returned
6. **DOM parsing** — HTML parsed into DOM tree; parser blocks on `<script>` without `defer`/`async`
7. **CSSOM construction** — CSS parsed in parallel into CSSOM tree
8. **Render tree** — DOM + CSSOM combined (only visible nodes)
9. **Layout** — browser calculates sizes and positions
10. **Paint** — pixels drawn to screen
11. **Composite** — layers composited by GPU

---

## Q10: Explain `call`, `apply`, and `bind`.

**Answer:**
All three set `this` explicitly.

```js
function greet(greeting) {
  return `${greeting}, ${this.name}`;
}

const user = { name: 'Alice' };

greet.call(user, 'Hello');          // 'Hello, Alice' — args as comma-separated
greet.apply(user, ['Hello']);       // 'Hello, Alice' — args as array
const boundGreet = greet.bind(user); // returns new function, doesn't call it
boundGreet('Hi');                   // 'Hi, Alice'
```

---

## Q11: What is debouncing vs throttling?

**Answer:**
- **Debounce** — delays execution until after N ms of inactivity. Good for search input.
- **Throttle** — allows execution at most once every N ms. Good for scroll events.

```js
// Debounce
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Throttle
function throttle(fn, limit) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    }
  };
}
```

---

## Q12: What is the difference between `null` and `undefined`?

- `undefined` — variable declared but not assigned; missing function argument; missing object property
- `null` — intentional absence of value; must be explicitly set

```js
typeof undefined // 'undefined'
typeof null      // 'object' — famous JS bug, kept for legacy compatibility

null == undefined  // true
null === undefined // false
```
