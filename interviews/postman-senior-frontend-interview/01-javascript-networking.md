# JavaScript, Networking & OS Fundamentals — Postman

> Postman's Round 2 phone screen tests JS fundamentals more deeply than typical frontend roles because engineers work across Electron main (Node.js) and renderer (browser) — both environments matter. Networking and OS questions appear because the product IS an API client.

---

## 1. JavaScript Fundamentals — Postman Focus Areas

### Event Delegation (confirmed question)

**Q: What is event delegation? When do you use it?**

**Verbal answer:**
> "Event delegation is the pattern of attaching a single event listener to a parent element instead of individual listeners on each child. It works because DOM events bubble up the tree — a click on a child element will propagate up to the parent where our single handler catches it. You inspect `event.target` to determine which child was actually clicked.
>
> In Postman's context this is critical — our collections sidebar can have thousands of requests. Attaching one click listener to the sidebar container and checking which request was clicked is O(1) memory cost vs O(n) listeners. We use `closest()` to walk up from the actual target to the meaningful ancestor."

```javascript
// Without delegation — O(n) listeners
document.querySelectorAll('.request-item').forEach(item => {
  item.addEventListener('click', handleRequestClick); // adds listener for every item
});

// With delegation — O(1) listener
document.querySelector('.collection-list').addEventListener('click', (e) => {
  const requestItem = e.target.closest('[data-request-id]');
  if (!requestItem) return; // click was on the container, not a request

  const requestId = requestItem.dataset.requestId;
  openRequest(requestId);
});

// Real-world: handle multiple actions from one listener
document.querySelector('.collection-list').addEventListener('click', (e) => {
  const runBtn = e.target.closest('[data-action="run"]');
  const deleteBtn = e.target.closest('[data-action="delete"]');
  const item = e.target.closest('[data-request-id]');

  if (runBtn) { runRequest(runBtn.closest('[data-request-id]').dataset.requestId); return; }
  if (deleteBtn) { deleteRequest(deleteBtn.closest('[data-request-id]').dataset.requestId); return; }
  if (item) { openRequest(item.dataset.requestId); }
});
```

---

### Event Bubbling vs Capturing (confirmed question)

**Q: Explain event bubbling and capturing. How do you stop propagation?**

**Verbal answer:**
> "DOM events travel in three phases: capture (top-down), target (at the element), and bubble (bottom-up). By default, `addEventListener` runs on the bubble phase. You opt into capture with the third argument `true` or `{ capture: true }`.
>
> `stopPropagation()` prevents the event from traveling further in whichever phase it's in. `stopImmediatePropagation()` also prevents other listeners on the same element from firing. `preventDefault()` prevents the browser's default action but does NOT stop propagation — these are independent."

```javascript
// Capture phase (fires first, as event travels DOWN)
document.addEventListener('click', captureHandler, true);   // or { capture: true }

// Bubble phase (fires second, as event travels UP) — default
document.addEventListener('click', bubbleHandler, false);

// Stop propagation
button.addEventListener('click', (e) => {
  e.stopPropagation();     // prevents parent listeners from firing
  e.preventDefault();      // prevents <a> navigation, <form> submit, etc.
  // Both together is common for custom context menus, modal overlays
});

// Critical difference:
outerDiv.addEventListener('click', () => console.log('outer')); // DOES fire with stopPropagation on button? NO
innerButton.addEventListener('click', (e) => {
  e.stopPropagation();
  console.log('button'); // only this fires
});
```

---

### Closures & Loop Gotcha (always asked)

```javascript
// Classic gotcha
for (var i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100); // prints 5,5,5,5,5 — all reference same `i`
}

// Fix 1: let (block scoping creates a new binding per iteration)
for (let i = 0; i < 5; i++) {
  setTimeout(() => console.log(i), 100); // 0,1,2,3,4
}

// Fix 2: IIFE (captures i by value in its own scope)
for (var i = 0; i < 5; i++) {
  (function(j) {
    setTimeout(() => console.log(j), 100);
  })(i);
}

// Fix 3: bind
for (var i = 0; i < 5; i++) {
  setTimeout(console.log.bind(null, i), 100);
}
```

---

### Prototype & Inheritance

**Q: How does prototypal inheritance work?**

```javascript
// Every object has [[Prototype]] (accessible via __proto__ or Object.getPrototypeOf)
// Property lookup walks the chain until null

function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  return `${this.name} makes a sound`;
};

function Dog(name, breed) {
  Animal.call(this, name); // steal constructor
  this.breed = breed;
}

// Set up prototype chain: Dog.prototype → Animal.prototype → Object.prototype → null
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog; // fix constructor reference

Dog.prototype.bark = function() {
  return `${this.name} barks`;
};

const rex = new Dog('Rex', 'German Shepherd');
rex.speak(); // found on Animal.prototype via chain
rex.bark();  // found on Dog.prototype
rex.toString(); // found on Object.prototype

// Modern equivalent
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} makes a sound`; }
}
class Dog extends Animal {
  constructor(name, breed) {
    super(name); // calls Animal constructor
    this.breed = breed;
  }
  bark() { return `${this.name} barks`; }
}
// `extends` sets up the prototype chain automatically
```

---

### `this` Binding Rules

```javascript
// Rule 1: Default binding — strict mode = undefined, sloppy = global
function foo() { console.log(this); }
foo(); // window (browser) or global (Node) in sloppy; undefined in strict

// Rule 2: Implicit binding — object before the dot
const obj = {
  name: 'Postman',
  greet() { console.log(this.name); }
};
obj.greet(); // 'Postman' — `this` = obj

// Pitfall: implicit binding lost
const greet = obj.greet; // detached from obj
greet(); // undefined — no object before the dot

// Rule 3: Explicit binding — call/apply/bind
greet.call(obj);       // forces this = obj, runs immediately
greet.apply(obj, []); // same but args as array
const bound = greet.bind(obj); // returns NEW function with this locked
bound();

// Rule 4: new binding — constructor call
function Request(url) {
  this.url = url; // `this` = newly created object
}
const r = new Request('https://api.postman.com'); // this = r

// Arrow functions: no own `this` — lexically inherit from enclosing scope
class Timer {
  constructor() { this.seconds = 0; }
  start() {
    setInterval(() => {
      this.seconds++; // `this` = Timer instance, not the interval callback's `this`
    }, 1000);
  }
}
```

---

### Async/Await & Event Loop

**Q: What is the event loop? How do microtasks differ from macrotasks?**

**Verbal answer:**
> "JavaScript is single-threaded with a call stack and an event loop. The event loop's job: when the call stack is empty, pick the next task from the queue and push it onto the stack. There are two types of queues with different priorities.
>
> Macrotasks: setTimeout, setInterval, setImmediate, I/O. One macrotask executes per event loop turn.
>
> Microtasks: Promise `.then`/`.catch`, `queueMicrotask`, MutationObserver. After EVERY macrotask (and after the initial synchronous code), the microtask queue is drained completely before moving to the next macrotask.
>
> This matters for Postman because our request execution pipeline is async — if we chain too many promises, they all run before any UI update can happen. We use `setImmediate` or `setTimeout(fn, 0)` strategically to yield to the UI thread."

```javascript
console.log('1 - sync');

setTimeout(() => console.log('2 - macrotask'), 0);

Promise.resolve().then(() => console.log('3 - microtask 1'));
Promise.resolve().then(() => console.log('4 - microtask 2'));

console.log('5 - sync');

// Output order: 1, 5, 3, 4, 2
// Reason: sync runs first, then ALL microtasks drain, then macrotask

// Microtask starvation — infinite microtasks block the macrotask queue
function doMicrotaskLoop() {
  Promise.resolve().then(doMicrotaskLoop); // ⚠️ starves setTimeout, UI updates, I/O
}

// Safe: yield periodically
async function processLargeDataset(items) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);
    if (i % 1000 === 0) {
      await new Promise(r => setTimeout(r, 0)); // yield to event loop every 1000 items
    }
  }
}
```

---

### Memory Leaks in JavaScript

**Q: How do you detect and fix memory leaks?**

**Verbal answer:**
> "In Postman's long-running Electron app, memory leaks matter more than a typical SPA because the app runs for hours or days without page reload. Common causes: event listeners not removed when components unmount, closures retaining large request history objects, timers not cleared, and detached DOM nodes still referenced by JavaScript.
>
> Detection: Chrome DevTools Memory panel, take heap snapshots before/after an action, look for objects that persist. In the timeline, a sawtooth memory graph that never returns to baseline means leaks."

```javascript
// Leak 1: event listener not cleaned up
class RequestPanel {
  constructor() {
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize); // ← leak if never removed
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize); // ← fix
  }
}

// Leak 2: timer not cleared
class PollingMonitor {
  start() {
    this.interval = setInterval(this.poll.bind(this), 5000);
  }
  stop() {
    clearInterval(this.interval); // must call this on unmount
  }
}

// Leak 3: closure retaining large object
function createHandler(largeRequest) {
  // `largeRequest` (10MB of response data) is kept alive as long as `handler` exists
  return function handler() {
    console.log(largeRequest.url); // only need URL, but entire object kept
  };
}
// Fix: extract only what you need
function createHandler(largeRequest) {
  const url = largeRequest.url; // copy primitive
  return function handler() { console.log(url); };
}

// React: cleanup in useEffect
useEffect(() => {
  const subscription = requestEvents.subscribe(handleEvent);
  return () => subscription.unsubscribe(); // cleanup on unmount or dep change
}, []);
```

---

## 2. Networking — HTTP Deep Dive

### HTTP Methods & Status Codes

**Q: What's the difference between PUT and PATCH?**

> "PUT replaces the entire resource — if you PUT to `/users/1` you must send all fields; missing fields become null or are removed. PATCH applies a partial update — only fields in the request body are changed. In Postman's REST API, we use PATCH for updating environment variables (you don't want to overwrite all variables just to change one)."

| Method | Idempotent | Safe | Body | Use Case |
|--------|-----------|------|------|----------|
| GET | Yes | Yes | No | Fetch resource |
| POST | No | No | Yes | Create resource |
| PUT | Yes | No | Yes | Replace resource entirely |
| PATCH | No | No | Yes | Partial update |
| DELETE | Yes | No | No | Delete resource |
| HEAD | Yes | Yes | No | Check if resource exists (headers only) |
| OPTIONS | Yes | Yes | No | CORS preflight, allowed methods |

**Status codes to know:**

```
2xx Success:
  200 OK — standard success
  201 Created — POST that created a resource (set Location header)
  204 No Content — success with no body (DELETE, empty PATCH)
  206 Partial Content — range request (video streaming)

3xx Redirect:
  301 Moved Permanently — browser caches, use for SEO
  302 Found — temporary redirect (don't cache)
  304 Not Modified — conditional GET, ETag matched — use cached version

4xx Client Errors:
  400 Bad Request — malformed syntax, invalid body
  401 Unauthorized — not authenticated (send WWW-Authenticate header)
  403 Forbidden — authenticated but not authorized
  404 Not Found — resource doesn't exist
  409 Conflict — state conflict (optimistic concurrency failed)
  422 Unprocessable Entity — syntactically valid but semantically invalid
  429 Too Many Requests — rate limited (include Retry-After header)

5xx Server Errors:
  500 Internal Server Error — generic server failure
  502 Bad Gateway — upstream server returned invalid response
  503 Service Unavailable — overloaded or maintenance
  504 Gateway Timeout — upstream didn't respond in time
```

---

### HTTP/1.1 vs HTTP/2 vs HTTP/3

**Q: Why did HTTP/2 matter for Postman?**

```
HTTP/1.1:
- One request per TCP connection (or pipelining, poorly supported)
- Head-of-line blocking: request 2 waits for request 1 to complete
- No header compression
- Postman problem: testing many APIs simultaneously = many TCP connections

HTTP/2:
- Multiplexing: multiple streams over ONE TCP connection
- Header compression (HPACK) — reduces overhead for repeated headers (Authorization, Content-Type)
- Server push (deprecated but was interesting for pre-sending responses)
- Binary framing — more efficient than text
- Postman benefit: collection runner with 50 requests uses fewer connections

HTTP/3:
- QUIC protocol (UDP-based, not TCP)
- No TCP head-of-line blocking (lost packet only blocks ONE stream, not all)
- Faster connection establishment (0-RTT for known servers)
- Better on mobile/lossy networks
- Postman added HTTP/3 support to test HTTP/3 APIs
```

---

### CORS — Deep Understanding

**Q: Explain CORS. Why does it exist? What is a preflight?**

**Verbal answer:**
> "CORS (Cross-Origin Resource Sharing) is a browser security mechanism that restricts which origins can make requests to a different origin. It exists because browsers implement the same-origin policy — scripts from `example.com` shouldn't be able to silently read data from `bank.com` using the user's cookies.
>
> A preflight is an HTTP OPTIONS request the browser sends automatically before certain 'non-simple' requests (those with custom headers like Authorization, or methods like PUT/DELETE). The server responds with which origins, methods, and headers are allowed. If the server approves, the actual request is sent.
>
> Postman's desktop app doesn't have CORS restrictions — it sends requests from the Electron main process (Node.js), not from a browser context. This is why Postman can make requests that would fail in a browser. But our web app version DOES have CORS constraints, which is a key difference."

```javascript
// Simple request — no preflight (GET/POST with simple headers)
fetch('https://api.example.com/data'); // immediate, no OPTIONS first

// Non-simple request — triggers preflight
fetch('https://api.example.com/users/1', {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer token123' } // custom header = preflight
});

// Browser first sends:
// OPTIONS /users/1 HTTP/1.1
// Origin: https://app.postman.com
// Access-Control-Request-Method: DELETE
// Access-Control-Request-Headers: Authorization

// Server must respond:
// Access-Control-Allow-Origin: https://app.postman.com
// Access-Control-Allow-Methods: GET, POST, DELETE
// Access-Control-Allow-Headers: Authorization
// Access-Control-Max-Age: 86400  (cache preflight for 24h)

// Server-side CORS middleware (Node.js/Express)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://app.postman.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200); // end preflight
  next();
});
```

---

### WebSockets

**Q: How do WebSockets work? How do they differ from HTTP polling?**

**Verbal answer:**
> "WebSockets provide full-duplex, persistent communication over a single TCP connection. The connection starts as HTTP with an Upgrade handshake — the client sends `Upgrade: websocket` headers and the server responds with `101 Switching Protocols`. After that, both sides can send frames at any time with very low overhead (2-byte minimum frame header vs HTTP's heavy headers).
>
> Postman uses WebSockets heavily — for real-time collaboration (multiple people editing a collection), for the Bifrost gateway handling pub/sub events, and as a feature that Postman lets you TEST directly (WebSocket requests in the Postman app).
>
> Long polling: client sends request, server holds it open until data is ready. Inefficient — new HTTP request for every update, heavy headers each time.
> Short polling: client polls every N seconds — wasteful when no updates.
> WebSocket: one connection, push from server as soon as data is ready. Best for high-frequency updates."

```javascript
// Client
const ws = new WebSocket('wss://bifrost.postman.com/realtime');

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'SUBSCRIBE', channel: 'collection:abc123' }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'REQUEST_UPDATED') {
    updateRequestInStore(message.payload);
  }
};

ws.onerror = (error) => console.error('WebSocket error', error);
ws.onclose = (event) => {
  console.log('Closed:', event.code, event.reason);
  if (!event.wasClean) scheduleReconnect(); // exponential backoff
};

// Reconnection with exponential backoff
let reconnectAttempts = 0;
function scheduleReconnect() {
  const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
  reconnectAttempts++;
  setTimeout(connect, delay + Math.random() * 1000); // add jitter
}
```

---

## 3. OS / Browser Concepts (Confirmed at Postman)

### Browser Storage Comparison

| | Cookie | localStorage | sessionStorage | IndexedDB |
|--|--------|-------------|----------------|-----------|
| Capacity | ~4KB | ~5MB | ~5MB | Hundreds of MB |
| Persistence | Expires date | Until cleared | Tab session | Until cleared |
| HTTP access | Yes (sent in headers) | No | No | No |
| Synchronous | Yes | Yes | Yes | No (async) |
| Structured data | No | JSON string | JSON string | Objects, binary |
| Postman use | Auth session | User preferences | Temp form state | Collections, requests, history |

**Q: Why does Postman use IndexedDB?**

> "Postman stores your entire collection library locally — thousands of requests, environments, test scripts. IndexedDB supports large amounts of structured data, binary blobs (response bodies), and indexed queries (find all requests in collection X). localStorage's 5MB limit and string-only storage won't scale. IndexedDB also supports transactions, which is important for keeping collections and environments consistent."

---

### TCP vs UDP

> "TCP is reliable, ordered, and connection-oriented. It guarantees delivery through acknowledgments and retransmission. UDP is connectionless and fire-and-forget — no guarantees but much lower overhead.
>
> For API testing (Postman's core use case), we use TCP-based protocols: HTTP runs over TCP, WebSocket runs over TCP. HTTP/3 runs over QUIC which is built on UDP but adds its own reliability per-stream — it gets the benefits of UDP's speed (no TCP handshake overhead) while maintaining reliability for individual streams."

---

### DNS Resolution

> "When you type `api.postman.com` in Postman, the resolution goes: browser/OS cache → local DNS resolver cache → recursive resolver (usually your ISP or `8.8.8.8`) → authoritative nameservers for the TLD → authoritative nameserver for `postman.com` → returns the A record (IP address). This takes milliseconds but it's a real overhead — Postman caches DNS resolution results and shows you connection timings in the response breakdown."

---

## Quick-Fire JS Questions

| Question | Answer |
|----------|--------|
| `==` vs `===`? | `==` coerces types (1 == '1' is true). `===` checks type AND value. Always use `===`. |
| `null` vs `undefined`? | `undefined` = declared but not assigned. `null` = explicitly set to "no value". `typeof null === 'object'` is a bug in JS. |
| `typeof NaN`? | `'number'`. Use `Number.isNaN()` not `isNaN()` (global isNaN coerces strings). |
| `0.1 + 0.2 === 0.3`? | False (0.30000000000000004). Floating point precision issue. Fix: `Math.abs(a - b) < Number.EPSILON`. |
| `[] == false`? | True — because `[]` coerces to `''`, then to `0`, and `false` coerces to `0`. |
| Shallow vs deep copy? | `{ ...obj }` / `Object.assign` = shallow (nested objects are still references). `structuredClone(obj)` or JSON round-trip = deep. |
| What is a Promise? | An object representing a future value. States: pending → fulfilled or rejected. `.then` chains, `.catch` handles rejection, `.finally` runs regardless. |
| What is a Symbol? | Unique, immutable primitive. `Symbol('x') !== Symbol('x')`. Used for unique object keys (no name collision). |
