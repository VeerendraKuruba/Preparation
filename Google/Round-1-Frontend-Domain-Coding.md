# Round 1 — Front End Domain + Coding (Stage 1, Virtual, 45 mins)

> Combined round: ~20 mins frontend domain Q&A + ~25 mins coding problem in JS.
> Interviewer wants depth in browser internals, JS engine, security, performance — plus clean live coding.

---

## PART A: Frontend Domain Q&A

---

### 1. JavaScript Engine & Runtime

**Q: Explain how JavaScript executes code — the execution context and call stack.**

**A:**
Every time JS runs a function, an **Execution Context** is created. It has:
- **Variable Environment** — stores `var` declarations and function declarations (hoisted)
- **Lexical Environment** — stores `let`/`const`, outer scope reference (for closures)
- **`this` binding**

The **Call Stack** is a LIFO stack of execution contexts. When a function is called, its context is pushed. When it returns, it's popped.

```js
function a() { b(); }
function b() { c(); }
function c() { console.log('deep'); }
a();
// Stack: global → a → b → c → pops back
```

**Hoisting**: `var` declarations and function declarations are moved to the top of their scope during the creation phase. `let`/`const` are in the "temporal dead zone" until their line is reached.

---

**Q: Describe the JavaScript Event Loop in detail. What is the difference between microtasks and macrotasks?**

**A:**
JavaScript is single-threaded. The Event Loop coordinates:

1. **Call Stack** — synchronous code runs here
2. **Web APIs** — browser handles async (setTimeout, fetch, DOM events) off-thread
3. **Macrotask Queue (Task Queue)** — callbacks from setTimeout, setInterval, I/O, UI events
4. **Microtask Queue** — Promise `.then`/`.catch`/`.finally`, `queueMicrotask`, MutationObserver

**Order of execution per tick:**
1. Run everything on the call stack until empty
2. **Drain the entire microtask queue** (including any microtasks added during draining)
3. Render (if needed by browser)
4. Pick one macrotask from the queue, push to call stack
5. Repeat

```js
console.log('1');                          // sync
setTimeout(() => console.log('2'), 0);    // macrotask
Promise.resolve().then(() => console.log('3')); // microtask
queueMicrotask(() => console.log('4'));   // microtask
console.log('5');                          // sync

// Output: 1, 5, 3, 4, 2
```

**Key insight**: microtasks always run before the next macrotask — this is why Promise chains resolve before the next setTimeout fires.

---

**Q: What are closures? Explain a real use case.**

**A:**
A closure is a function that **captures variables from its enclosing scope** even after that scope has returned.

```js
function createMultiplier(factor) {
  return function(n) { return n * factor; }; // `factor` is captured
}
const double = createMultiplier(2);
double(5); // 10 — `factor` still accessible
```

**Real use cases:**
1. **Module pattern** — encapsulate private state
2. **Memoization** — cache is in closure
3. **Partial application / currying**
4. **Event handlers** retaining context

**Classic gotcha:**
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // prints 3, 3, 3
}
// Fix: use let (block-scoped), or IIFE to capture i
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 0, 1, 2
}
```

---

**Q: Explain prototypal inheritance. How does it differ from classical (class-based) inheritance?**

**A:**
In JS, objects have an internal `[[Prototype]]` link. Property lookup walks this chain until `null`.

```js
const animal = {
  speak() { return `${this.name} makes a sound`; }
};
const dog = Object.create(animal);
dog.name = 'Rex';
dog.speak(); // "Rex makes a sound" — found on prototype
```

`class` is syntactic sugar — it still uses prototypes under the hood:
```js
class Animal { speak() { return 'sound'; } }
class Dog extends Animal { bark() { return 'woof'; } }
// Dog.prototype.__proto__ === Animal.prototype
```

**Difference from classical**:
- Classical (Java/C++): classes are blueprints; objects are instances; rigid hierarchy
- JS prototypal: objects delegate to other objects directly; more flexible; you can change prototypes at runtime (though you shouldn't)

---

**Q: What is `this`? Explain all binding rules.**

**A:**
`this` is determined at **call time**, not definition time (except arrow functions).

| Rule | How `this` is set |
|------|--------------------|
| Default | `globalThis` (non-strict) or `undefined` (strict) |
| Implicit | Object to the left of the dot: `obj.method()` → `this = obj` |
| Explicit | `fn.call(ctx)`, `fn.apply(ctx)`, `fn.bind(ctx)` |
| `new` | Newly created object |
| Arrow | Lexically inherited — no own `this`, uses enclosing context |

```js
const obj = {
  name: 'Google',
  greet() { console.log(this.name); },           // 'Google'
  greetArrow: () => console.log(this.name),       // undefined (lexical this = global)
  greetDelayed() {
    setTimeout(function() { console.log(this.name); }, 0); // undefined (lost)
    setTimeout(() => console.log(this.name), 0);           // 'Google' (arrow)
  }
};
```

---

### 2. DOM & Browser

**Q: What happens when you type a URL and press Enter? (Browser rendering pipeline)**

**A:**
1. **DNS Resolution** — domain → IP address (checked: browser cache → OS cache → DNS server)
2. **TCP Connection** — 3-way handshake (SYN → SYN-ACK → ACK); TLS handshake if HTTPS
3. **HTTP Request** — browser sends GET request with headers (Host, Accept, Cookie, etc.)
4. **Server Response** — HTML bytes arrive
5. **DOM Construction** — HTML parsed → DOM tree; `<script>` blocks parsing (unless `defer`/`async`)
6. **CSSOM Construction** — CSS parsed → CSSOM tree
7. **Render Tree** — DOM + CSSOM merged (only visible nodes)
8. **Layout (Reflow)** — compute exact size and position of every element
9. **Paint** — fill pixels layer by layer
10. **Compositing** — GPU combines layers and displays

**Key optimization hooks:**
- `defer` → parse in parallel, execute after DOM ready
- `async` → parse in parallel, execute immediately when ready (may block DOM)
- CSS in `<head>` → unblock rendering
- Preload critical resources: `<link rel="preload">`

---

**Q: What is event delegation? Why is it important?**

**A:**
Event delegation attaches **one listener to a parent** rather than individual listeners to each child. It works because DOM events bubble up.

```js
document.getElementById('list').addEventListener('click', (e) => {
  const item = e.target.closest('li');
  if (!item) return;
  console.log('Clicked:', item.dataset.id);
});
```

**Why it matters:**
- **Performance**: 1 listener instead of 1000 (e.g., large tables)
- **Dynamic elements**: works for items added after the listener was registered
- **Memory**: fewer listener references = fewer potential leaks

---

**Q: What is a memory leak in the browser? Give 3 examples and how to fix them.**

**A:**

1. **Detached DOM nodes**
```js
let node = document.createElement('div');
document.body.appendChild(node);
document.body.removeChild(node);
// `node` variable still holds reference — GC can't collect it
// Fix: node = null;
```

2. **Unremoved event listeners**
```js
function setup() {
  const btn = document.getElementById('btn');
  btn.addEventListener('click', handleClick); // never removed
}
// Fix: removeEventListener on cleanup, or use AbortController
```

3. **setInterval not cleared**
```js
const id = setInterval(() => { doWork(); }, 1000);
// If component unmounts without clearInterval(id), handler + closure stays alive
```

**Detection**: Chrome DevTools → Memory → Take heap snapshot → look for Detached HTMLElement nodes.

---

### 3. Performance

**Q: How do you measure and improve Core Web Vitals?**

**A:**

| Metric | What it measures | Good threshold |
|--------|-----------------|----------------|
| **LCP** (Largest Contentful Paint) | Load time of largest visible element | < 2.5s |
| **FID** / **INP** (Interaction to Next Paint) | Responsiveness to user input | INP < 200ms |
| **CLS** (Cumulative Layout Shift) | Visual stability | < 0.1 |

**Improve LCP:**
- Preload hero image: `<link rel="preload" as="image">`
- Use CDN, compress images (WebP/AVIF)
- Remove render-blocking resources
- SSR or prerender for initial HTML

**Improve INP:**
- Break long tasks with `setTimeout(0)` or `scheduler.yield()`
- Move heavy computation to Web Worker
- Avoid forced synchronous layouts (read then write DOM, never interleave)

**Improve CLS:**
- Always set explicit `width`/`height` on images and iframes
- Reserve space for dynamic content (ads, embeds)
- Use `transform` instead of changing `top`/`left`

---

**Q: What is the difference between `defer` and `async` on script tags?**

**A:**
```html
<!-- Normal: blocks HTML parsing -->
<script src="app.js"></script>

<!-- async: downloads in parallel, executes IMMEDIATELY when ready (may interrupt parsing) -->
<script async src="analytics.js"></script>

<!-- defer: downloads in parallel, executes AFTER HTML is fully parsed, in order -->
<script defer src="app.js"></script>
```

- Use `defer` for scripts that depend on the DOM or each other
- Use `async` for independent scripts (analytics, ads)
- Both only work on external scripts

---

### 4. Security

**Q: Explain XSS. What are its types and how do you prevent it?**

**A:**
XSS (Cross-Site Scripting) — attacker injects malicious JS into a page, executed in victim's browser.

**Types:**
1. **Stored (Persistent)**: script saved in database, served to all users
2. **Reflected**: script in URL parameter, echoed in response (e.g., `?q=<script>alert(1)</script>`)
3. **DOM-based**: client-side JS writes attacker-controlled data to DOM unsafely

**Prevention:**
```js
// Bad — injects raw HTML
element.innerHTML = userInput;

// Good — text only, no HTML parsing
element.textContent = userInput;

// If HTML is needed, sanitize with DOMPurify
element.innerHTML = DOMPurify.sanitize(userInput);
```

- **CSP (Content Security Policy)**: `Content-Security-Policy: default-src 'self'` — blocks inline scripts
- **HttpOnly cookies**: prevents JS from reading session tokens
- Encode output: `&lt;` instead of `<`

---

**Q: What is CORS and how does it work?**

**A:**
CORS (Cross-Origin Resource Sharing) — browser security mechanism preventing a page at `a.com` from making requests to `b.com` unless `b.com` explicitly allows it.

**Simple requests** (GET/POST with standard headers): browser adds `Origin` header; server must respond with `Access-Control-Allow-Origin: *` or specific origin.

**Preflight** (for PUT/DELETE, custom headers, JSON content-type): browser sends `OPTIONS` request first; server must respond with allowed methods/headers before actual request is sent.

```
// Server response headers
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true  // if cookies needed
```

**Key**: CORS is enforced by the **browser**, not the server. Server-to-server requests are never blocked.

---

## PART B: Live Coding Problem (25 mins)

### Problems confirmed in this combined round format:

---

### Problem 1: Implement `debounce` with immediate option
```js
/**
 * debounce(fn, delay, immediate)
 * immediate=true: fire on leading edge, not trailing
 */
function debounce(fn, delay, immediate = false) {
  let timer;
  return function(...args) {
    const callNow = immediate && !timer;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!immediate) fn.apply(this, args);
    }, delay);
    if (callNow) fn.apply(this, args);
  };
}

// Test
const log = debounce(console.log, 300);
log('a'); log('b'); log('c'); // only 'c' fires after 300ms
```

---

### Problem 2: Flatten a nested object (asked at Google)
```js
function flattenObject(obj, prefix = '', result = {}) {
  for (const [key, val] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      flattenObject(val, newKey, result);
    } else {
      result[newKey] = val;
    }
  }
  return result;
}

flattenObject({ a: { b: { c: 1 }, d: 2 }, e: 3 });
// { 'a.b.c': 1, 'a.d': 2, 'e': 3 }
```

---

### Problem 3: Select all DOM nodes within a timeline range
*(Confirmed Google question: "Given a timeline, write JS to select all nodes within a selection")*

```js
/**
 * Given elements with data-start and data-end attributes (timestamps),
 * return all elements whose range overlaps with [selStart, selEnd]
 */
function selectNodesInRange(container, selStart, selEnd) {
  return Array.from(container.querySelectorAll('[data-start]'))
    .filter(el => {
      const start = Number(el.dataset.start);
      const end = Number(el.dataset.end ?? el.dataset.start);
      // Overlap: not (end < selStart || start > selEnd)
      return !(end < selStart || start > selEnd);
    });
}

// Mark selected
function highlightRange(container, selStart, selEnd) {
  container.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
  selectNodesInRange(container, selStart, selEnd)
    .forEach(el => el.classList.add('selected'));
}
```

---

### Problem 4: Implement `Array.prototype.reduce` from scratch
```js
Array.prototype.myReduce = function(callback, initialValue) {
  const hasInitial = arguments.length >= 2;
  let acc = hasInitial ? initialValue : this[0];
  let startIdx = hasInitial ? 0 : 1;

  if (!hasInitial && this.length === 0) {
    throw new TypeError('Reduce of empty array with no initial value');
  }

  for (let i = startIdx; i < this.length; i++) {
    if (i in this) { // skip holes in sparse arrays
      acc = callback(acc, this[i], i, this);
    }
  }
  return acc;
};
```

---

## Interview Strategy for This Round

**Opening (2 mins):** Interviewer may ask 1-2 quick conceptual questions. Answer concisely — don't over-elaborate.

**Coding (25 mins):**
1. Restate the problem: "So I need to..."
2. Clarify edge cases: "What should happen with empty input / null?"
3. State your approach before typing: "I'll use a closure with a setTimeout..."
4. Write clean, readable code — name variables well
5. Walk through a test case before saying done
6. Discuss time/space complexity unprompted
7. Mention what you'd improve with more time

**Time split target:** ~20 min coding + 5 min complexity + edge case discussion
