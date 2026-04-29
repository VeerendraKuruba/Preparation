# Frontend Domain Questions — Google

> The dedicated Frontend round tests depth in JS, DOM, browser internals, CSS, and performance.
> Google confirmed topics: prototypal inheritance, closures, event loop, DOM API, XSS/CSRF, HTTP.

---

## JavaScript Fundamentals

### Closures
**Q: What is a closure? Give a practical example.**
```js
function makeCounter() {
  let count = 0;
  return {
    increment() { count++; },
    get() { return count; }
  };
}
// count is captured in the closure — not accessible from outside
```

**Q: What is the classic closure loop bug and how do you fix it?**
```js
// Bug
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // prints 3,3,3
}
// Fix 1: let (block scope)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 0,1,2
}
// Fix 2: IIFE
for (var i = 0; i < 3; i++) {
  (function(j) { setTimeout(() => console.log(j), 100); })(i);
}
```

---

### Prototypal Inheritance
**Q: Explain prototypal inheritance in JS.**
- Every object has `[[Prototype]]` accessible via `Object.getPrototypeOf(obj)`
- Property lookup walks the chain until `null`
- `class` syntax is syntactic sugar over prototype-based delegation

**Q: Difference between `Object.create`, `new`, and class?**
```js
// Object.create — explicit prototype setting
const animal = { speak() { return 'sound'; } };
const dog = Object.create(animal);

// new — calls constructor, sets prototype to Constructor.prototype
function Dog() {}
Dog.prototype.bark = function() {};
const d = new Dog();

// class — same as above, cleaner syntax
class Dog extends Animal {}
```

---

### `this` Keyword
**Q: What are the 4 rules for `this` binding?**
1. **Default**: `undefined` in strict mode, `globalThis` otherwise
2. **Implicit**: object before the dot (`obj.method()`)
3. **Explicit**: `call`, `apply`, `bind`
4. **new**: newly created object
5. **Arrow**: lexically inherited — no own `this`

**Q: What does `bind` return?**
Returns a new function with `this` permanently bound. Cannot be overridden even by `new`.

---

### Event Loop & Concurrency
**Q: Explain the event loop. What is the difference between microtasks and macrotasks?**
- **Call stack**: synchronous execution
- **Microtask queue**: Promise callbacks, `queueMicrotask`, MutationObserver — runs after each task, before rendering
- **Macrotask queue**: `setTimeout`, `setInterval`, I/O — one per event loop tick

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// Output: 1, 4, 3, 2
```

**Q: What are Web Workers? When would you use them?**
- Separate thread for CPU-intensive work (image processing, parsing large JSON)
- No DOM access; communicate via `postMessage`
- Use `SharedArrayBuffer` + `Atomics` for shared memory

---

### Async / Promises
**Q: Implement `Promise.all` from scratch.**
```js
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let remaining = promises.length;
    if (remaining === 0) return resolve([]);
    promises.forEach((p, i) => {
      Promise.resolve(p).then(val => {
        results[i] = val;
        if (--remaining === 0) resolve(results);
      }).catch(reject);
    });
  });
}
```

**Q: Difference between `Promise.all`, `Promise.allSettled`, `Promise.race`, `Promise.any`?**
| Method | Resolves when | Rejects when |
|--------|--------------|--------------|
| `all` | all resolve | any rejects |
| `allSettled` | all settle | never |
| `race` | first settles | first rejects |
| `any` | first resolves | all reject |

---

### Memory Management
**Q: What causes memory leaks in JavaScript?**
1. Detached DOM nodes referenced in JS variables
2. Event listeners not removed on component unmount
3. Closures holding large objects
4. Global variables
5. `setInterval` callbacks not cleared

---

## DOM & Browser

### DOM Manipulation
**Q: What is the difference between `innerHTML`, `textContent`, and `innerText`?**
- `innerHTML`: parses HTML (XSS risk if user input is used)
- `textContent`: raw text, no HTML parsing, faster
- `innerText`: layout-aware (respects CSS `display:none`), triggers reflow

**Q: Implement `getElementsByClassName` using only the DOM API.**
```js
function getElementsByClassName(root, className) {
  const result = [];
  const walk = (node) => {
    if (node.classList && node.classList.contains(className)) result.push(node);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return result;
}
```

---

### Event Handling
**Q: Explain event bubbling, capturing, and delegation.**
- **Capturing**: event travels from `document` down to target
- **Bubbling**: event travels from target up to `document`
- `addEventListener(type, handler, true)` — capturing phase
- **Delegation**: attach one listener to parent, use `event.target` to identify source
  - Benefits: fewer listeners, works for dynamically added elements

**Q: How do you stop event propagation?**
- `event.stopPropagation()` — stops bubbling/capturing
- `event.stopImmediatePropagation()` — also stops other listeners on same element
- `event.preventDefault()` — cancels default browser action only

---

### Browser Rendering Pipeline
**Q: Describe the Critical Rendering Path.**
1. Parse HTML → DOM tree
2. Parse CSS → CSSOM tree
3. Combine → Render tree (only visible nodes)
4. Layout (Reflow) — compute geometry
5. Paint — fill pixels
6. Composite — layer compositing on GPU

**Q: What triggers reflow vs repaint?**
- **Reflow**: changing size, position, layout (`width`, `height`, `margin`, `top`)
- **Repaint**: visual change without geometry (`color`, `background`, `visibility`)
- Use `transform` and `opacity` for animations — compositor-only, no reflow/repaint

---

## CSS

**Q: Explain the CSS Box Model.**
- `content` → `padding` → `border` → `margin`
- `box-sizing: border-box` — width/height includes padding + border

**Q: How does CSS specificity work?**
- Inline styles: 1000
- ID selectors: 100
- Class/attribute/pseudo-class: 10
- Element/pseudo-element: 1
- `!important` overrides all (avoid)

**Q: Flexbox vs Grid — when to use each?**
- **Flexbox**: 1D layout (row OR column), dynamic sizing, nav bars, centering
- **Grid**: 2D layout (rows AND columns), page layout, complex alignment

**Q: What is a stacking context?**
Created by: `position` + `z-index`, `opacity < 1`, `transform`, `filter`.
Children are painted relative to their stacking context, not the document.

---

## Web Security

### XSS (Cross-Site Scripting)
**Q: What are the types of XSS?**
1. **Stored/Persistent**: malicious script saved in DB, served to all users
2. **Reflected**: malicious script in URL, reflected in response
3. **DOM-based**: script executed via client-side JS (e.g., `innerHTML`)

**Prevention:**
- Sanitize and encode user input (use `textContent`, not `innerHTML`)
- Content Security Policy (CSP) headers
- `HttpOnly` cookies prevent JS from reading session tokens

### CSRF (Cross-Site Request Forgery)
**Q: How does CSRF work and how do you prevent it?**
- Attacker tricks authenticated user into making unintended request
- **Prevention**: CSRF tokens, `SameSite=Strict` cookies, check `Origin`/`Referer` headers

### Clickjacking
- Overlay invisible iframe over legit page
- **Prevention**: `X-Frame-Options: DENY` or CSP `frame-ancestors 'none'`

---

## Performance Optimization

**Q: How would you optimize a slow-rendering page?**
1. Reduce bundle size — code splitting, tree shaking
2. Lazy load routes and heavy components
3. Debounce/throttle expensive event handlers
4. Virtualize long lists (only render visible rows)
5. Optimize images — WebP, lazy loading, correct sizes
6. Use `requestAnimationFrame` for animations
7. Cache API responses (HTTP caching, Service Workers)
8. Avoid layout thrashing — batch DOM reads then writes
9. Use CDN for static assets

**Q: Implement debounce and throttle.**
```js
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function throttle(fn, interval) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}
```

---

## Networking & HTTP

**Q: What is the difference between HTTP/1.1, HTTP/2, and HTTP/3?**
- HTTP/1.1: text-based, head-of-line blocking, keep-alive
- HTTP/2: binary framing, multiplexing (multiple requests on one TCP connection), header compression (HPACK), server push
- HTTP/3: QUIC protocol (UDP-based), eliminates TCP head-of-line blocking

**Q: CORS — what is it and how does it work?**
- Browser security mechanism — restricts cross-origin HTTP requests
- Simple requests: no preflight
- Complex requests: browser sends `OPTIONS` preflight; server must respond with `Access-Control-Allow-Origin`

**Q: Cookies vs LocalStorage vs SessionStorage vs IndexedDB**
| | Cookies | LocalStorage | SessionStorage | IndexedDB |
|--|---------|-------------|----------------|-----------|
| Size | 4KB | 5-10MB | 5-10MB | Large |
| Sent with requests | Yes | No | No | No |
| Expiry | Set by server | Never | Tab close | Never |
| Accessible from JS | Yes (unless HttpOnly) | Yes | Yes | Yes |

---

## React / Component Architecture

**Q: Virtual DOM — how does diffing work?**
- React creates VDOM tree in memory
- On state change, creates new VDOM and diffs against previous (reconciliation)
- Only actual DOM changes are applied (batched in React 18)
- Keys help reconciler identify stable list items

**Q: When would you use `useMemo` vs `useCallback`?**
- `useMemo`: memoize expensive computed value
- `useCallback`: memoize function reference (prevents child re-renders when passed as prop)

**Q: What is the difference between controlled and uncontrolled components?**
- **Controlled**: React state is the source of truth (`value` + `onChange`)
- **Uncontrolled**: DOM is source of truth (`ref` + `defaultValue`)

**Q: Explain React reconciliation and the role of `key`.**
- `key` must be stable and unique within a list
- Changing `key` forces React to unmount and remount the component
- Using array index as key causes subtle bugs when list order changes

---

## Module Systems & Build Tools

**Q: CommonJS vs ES Modules?**
- CJS: `require/module.exports`, synchronous, runtime resolution
- ESM: `import/export`, static (analyzable at build time), enables tree shaking
- ESM is the standard; Node supports both

**Q: What does a bundler (Webpack/Vite) do?**
- Resolves module dependency graph
- Transforms (Babel, TypeScript, CSS)
- Code splits for lazy loading
- Tree shakes unused exports (ESM only)
- Outputs optimized bundles with hashing for cache busting
