# Node.js & JavaScript Competency Round — Deep Preparation
> Based on eBay MTS2 interview feedback: passed Event Loop, failed Error Handling

---

## PART 1: EVENT LOOP (Deep Dive)

### How the Event Loop Works — Mental Model

```
┌─────────────────────────────────┐
│         Call Stack              │  ← synchronous code runs here
└─────────────────────────────────┘
           ↓ empty?
┌─────────────────────────────────┐
│       Microtask Queue           │  ← Promise.then, queueMicrotask, MutationObserver
│  (DRAINS COMPLETELY before next │     ALL microtasks run before next macrotask
│   macrotask)                    │
└─────────────────────────────────┘
           ↓ empty?
┌─────────────────────────────────┐
│  Event Loop Phases (Macrotasks) │
│                                 │
│  1. timers         ← setTimeout, setInterval callbacks
│  2. pending I/O    ← I/O errors from previous cycle
│  3. idle/prepare   ← internal use
│  4. poll           ← incoming I/O events (fs, net)
│  5. check          ← setImmediate callbacks
│  6. close          ← socket.on('close'), etc.
└─────────────────────────────────┘
```

**Key rule**: After EVERY macrotask phase, Node.js drains the ENTIRE microtask queue before moving to the next phase.

---

### Q1. Classic Output Question — What does this print?

```js
console.log('1');

setTimeout(() => console.log('2'), 0);

Promise.resolve().then(() => console.log('3'));

queueMicrotask(() => console.log('4'));

console.log('5');
```

**Answer: 1, 5, 3, 4, 2**

**Why:**
1. `console.log('1')` → sync → runs immediately → **1**
2. `setTimeout` → scheduled in macrotask queue (timers phase)
3. `Promise.resolve().then(...)` → queued in microtask queue
4. `queueMicrotask(...)` → also queued in microtask queue
5. `console.log('5')` → sync → **5**
6. Call stack empty → drain microtask queue:
   - Promise.then → **3**
   - queueMicrotask → **4**
7. Macrotask (timer) → **2**

---

### Q2. setTimeout vs setImmediate — Which runs first?

```js
setTimeout(() => console.log('setTimeout'), 0);
setImmediate(() => console.log('setImmediate'));
```

**Answer: Non-deterministic** — could be either order.

**Why:** When in the top-level context, `setTimeout(fn, 0)` vs `setImmediate` depends on which phase the event loop is in when it starts. The timer may or may not have expired by the time the loop reaches the timers phase.

**BUT — inside an I/O callback, setImmediate ALWAYS wins:**

```js
const fs = require('fs');
fs.readFile(__filename, () => {
  setTimeout(() => console.log('setTimeout'), 0);
  setImmediate(() => console.log('setImmediate'));
});
// Always prints: setImmediate, setTimeout
```

**Why:** Inside an I/O callback (poll phase), after the callback runs the loop goes to check phase (setImmediate) BEFORE looping back to timers phase.

---

### Q3. process.nextTick vs Promise.then — Which runs first?

```js
Promise.resolve().then(() => console.log('Promise'));
process.nextTick(() => console.log('nextTick'));
```

**Answer: nextTick, Promise**

**Why:** `process.nextTick` is NOT a microtask in the spec sense — it has its own queue that is processed BEFORE the Promise microtask queue.

**Priority order:**
1. Synchronous code
2. `process.nextTick` queue (drained completely)
3. Promise microtask queue (drained completely)
4. Macrotask (timers, I/O, setImmediate, etc.)

---

### Q4. Nested Promises and Microtasks

```js
Promise.resolve()
  .then(() => {
    console.log('1');
    return Promise.resolve('inner');
  })
  .then((val) => console.log('2', val));

Promise.resolve()
  .then(() => console.log('3'))
  .then(() => console.log('4'));
```

**Answer: 1, 3, 2 inner, 4**

**Why:** When a `.then` callback returns a `Promise.resolve('inner')`, the resolution of the outer promise is deferred — it requires **two microtask ticks** to resolve (one to resolve the inner promise, one to call the next `.then`). Meanwhile the other promise chain advances.

---

### Q5. Async/Await and the Event Loop

```js
async function foo() {
  console.log('A');
  await Promise.resolve();
  console.log('B');
}

console.log('C');
foo();
console.log('D');
```

**Answer: C, A, D, B**

**Why:**
- `console.log('C')` → sync → **C**
- `foo()` called:
  - `console.log('A')` → sync (inside async fn) → **A**
  - `await Promise.resolve()` → suspends foo, schedules continuation as microtask
- `console.log('D')` → sync → **D**
- Call stack empty → microtask queue → resume foo → **B**

---

### Q6. Event Loop Blocking — The Cardinal Sin

```js
// This BLOCKS the event loop for ~5 seconds
app.get('/bad', (req, res) => {
  const start = Date.now();
  while (Date.now() - start < 5000) {} // blocking loop
  res.send('done');
});
```

During those 5 seconds, ALL other requests are frozen — the entire Node.js process is stuck.

**Fix:** Offload CPU work to worker threads:

```js
const { Worker } = require('worker_threads');

app.get('/good', (req, res) => {
  const worker = new Worker('./cpu-work.js', { workerData: req.query });
  worker.on('message', (result) => res.send(result));
  worker.on('error', (err) => res.status(500).send(err.message));
});
```

---

## PART 2: ERROR HANDLING (The Area That Gets Candidates Rejected)

### The 5 Layers of Node.js Error Handling

```
1. Synchronous try/catch
2. Promise .catch() / async-await try/catch
3. EventEmitter 'error' event
4. Stream error handling
5. Process-level: uncaughtException + unhandledRejection
```

---

### Layer 1: Synchronous try/catch

```js
function parseJSON(str) {
  try {
    return JSON.parse(str);
  } catch (err) {
    // err is a SyntaxError
    console.error('Parse failed:', err.message);
    return null;
  }
}
```

**Key point:** `try/catch` only catches synchronous errors. It does NOT catch errors thrown inside async callbacks.

```js
// WRONG — this try/catch does nothing for the async error
try {
  setTimeout(() => {
    throw new Error('async error'); // UNCAUGHT — crashes process
  }, 100);
} catch (err) {
  console.log('This never runs');
}
```

---

### Layer 2: Promise Error Handling

#### 2a. Promise .catch()

```js
fetchData()
  .then(processData)
  .then(saveData)
  .catch(err => {
    // Catches errors from ANY step in the chain
    console.error('Pipeline failed:', err.message);
  });
```

#### 2b. async/await try/catch

```js
async function processOrder(orderId) {
  try {
    const order = await fetchOrder(orderId);
    const payment = await processPayment(order);
    await sendConfirmation(payment);
  } catch (err) {
    // Which step failed? You don't know unless you check err type/message
    console.error('Order processing failed:', err);
    throw err; // re-throw so caller knows it failed
  }
}
```

#### 2c. Granular error handling per step

```js
async function processOrder(orderId) {
  let order;
  try {
    order = await fetchOrder(orderId);
  } catch (err) {
    throw new OrderNotFoundError(`Order ${orderId} not found`, { cause: err });
  }

  let payment;
  try {
    payment = await processPayment(order);
  } catch (err) {
    // Payment failed — we have the order, we can retry or refund
    await markOrderAsFailed(order.id);
    throw new PaymentError('Payment failed', { cause: err });
  }

  try {
    await sendConfirmation(payment);
  } catch (err) {
    // Confirmation email failed — but payment succeeded
    // Non-critical: log it, don't fail the whole order
    logger.error('Confirmation email failed', { orderId, err });
    // Do NOT throw — payment was successful
  }
}
```

---

### Layer 3: The Silent Killer — Unhandled Promise Rejections

```js
// This looks fine but is BROKEN
async function fetchData() {
  const result = await fetch('http://bad-url'); // throws
  return result.json();
}

fetchData(); // Called without await and without .catch()
             // The rejection is UNHANDLED
```

**What happens:**
- Node.js < 15: prints warning, continues
- Node.js >= 15: **crashes the process** with exit code 1

**Fixing it:**

```js
// Option 1: await it
await fetchData();

// Option 2: attach .catch()
fetchData().catch(err => logger.error(err));

// Option 3: fire-and-forget utility
function fireAndForget(promise) {
  promise.catch(err => logger.error('Background task failed:', err));
}
fireAndForget(fetchData());
```

---

### Layer 4: EventEmitter Error Handling

```js
const EventEmitter = require('events');
const emitter = new EventEmitter();

// If NO 'error' listener is attached, an emitted error CRASHES the process
emitter.emit('error', new Error('something broke')); // CRASH if no listener

// ALWAYS attach an 'error' listener
emitter.on('error', (err) => {
  console.error('Emitter error:', err.message);
  // Handle gracefully
});
```

**Common mistake in HTTP servers:**

```js
const net = require('net');
const server = net.createServer((socket) => {
  // WRONG: no error handler on socket
  socket.write('hello');
});

// RIGHT: handle socket errors
const server = net.createServer((socket) => {
  socket.on('error', (err) => {
    if (err.code === 'ECONNRESET') return; // client disconnected, expected
    logger.error('Socket error:', err);
  });
  socket.write('hello');
});
```

---

### Layer 5: Stream Error Handling

```js
const fs = require('fs');
const { pipeline } = require('stream');

// WRONG: errors on individual streams can be missed
const readable = fs.createReadStream('input.txt');
const writable = fs.createWriteStream('output.txt');
readable.pipe(writable);
// If readable emits error, writable is NOT automatically closed → resource leak

// RIGHT: use pipeline() — handles errors and cleanup automatically
pipeline(
  fs.createReadStream('input.txt'),
  transformStream,
  fs.createWriteStream('output.txt'),
  (err) => {
    if (err) {
      console.error('Pipeline failed:', err);
    } else {
      console.log('Pipeline succeeded');
    }
  }
);

// Or with async/await using promisify:
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

try {
  await pipelineAsync(
    fs.createReadStream('input.txt'),
    transformStream,
    fs.createWriteStream('output.txt')
  );
} catch (err) {
  console.error('Pipeline failed:', err);
}
```

---

### Layer 6: Process-Level Error Handlers

```js
// Catches synchronous errors that escaped all try/catch blocks
process.on('uncaughtException', (err, origin) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  console.error('Origin:', origin);

  // After uncaughtException, the process is in an UNDEFINED STATE
  // You should:
  // 1. Log the error to an external service (synchronously if possible)
  // 2. Gracefully shut down — do NOT try to continue

  // Flush logs, close connections, then exit
  logger.fatal({ err, origin }, 'Uncaught exception — shutting down');
  process.exit(1); // Always exit after uncaughtException
});

// Catches rejected Promises with no .catch() handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);

  // In production: log it
  // Decision: crash or continue depends on your policy
  // eBay-style: treat as fatal, exit and let orchestration restart
  process.exit(1);
});

// Graceful shutdown on SIGTERM (Kubernetes sends this before killing pod)
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — starting graceful shutdown');

  // Stop accepting new requests
  server.close(() => {
    console.log('HTTP server closed');
  });

  // Wait for in-flight requests to complete
  await waitForInflightRequests();

  // Close DB connections
  await db.close();

  process.exit(0);
});
```

**Key difference:**
| | `uncaughtException` | `unhandledRejection` |
|---|---|---|
| Trigger | Synchronous throw with no catch | Promise rejection with no .catch() |
| Process state after | **Undefined** — MUST exit | Undefined in practice — best to exit |
| Safe to continue? | **NO** | **NO** |

---

### Error Handling in Express

```js
const express = require('express');
const app = express();

// Regular routes
app.get('/product/:id', async (req, res, next) => {
  try {
    const product = await fetchProduct(req.params.id);
    res.json(product);
  } catch (err) {
    next(err); // Pass to error middleware
  }
});

// Express error middleware — MUST have 4 parameters (err, req, res, next)
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message, fields: err.fields });
  }

  // Default: 500 internal server error
  res.status(500).json({ error: 'Internal server error' });
});
```

**Common mistake:** Forgetting `next` as 4th param — Express won't recognize it as error middleware:

```js
// WRONG — only 3 params, not treated as error middleware
app.use((err, req, res) => { ... });

// RIGHT — 4 params required
app.use((err, req, res, next) => { ... });
```

---

### Error Handling in async Express routes (express-async-errors)

```js
// Without wrapper: async errors are NOT caught by Express automatically
app.get('/product/:id', async (req, res) => {
  const product = await fetchProduct(req.params.id); // if this throws, Express hangs
  res.json(product);
});

// Solution 1: try/catch + next(err) in every route (verbose)
app.get('/product/:id', async (req, res, next) => {
  try {
    const product = await fetchProduct(req.params.id);
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// Solution 2: wrapper utility
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.get('/product/:id', asyncHandler(async (req, res) => {
  const product = await fetchProduct(req.params.id);
  res.json(product);
}));

// Solution 3: use 'express-async-errors' package (patches Express globally)
require('express-async-errors');
app.get('/product/:id', async (req, res) => {
  const product = await fetchProduct(req.params.id); // throws auto-forwarded to error middleware
  res.json(product);
});
```

---

### Custom Error Classes (Senior-level pattern)

```js
// Base application error
class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message, options); // options.cause supported in Node 16.9+
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true; // vs programmer errors (bugs)
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} with id ${id} not found`, 404);
    this.resource = resource;
    this.resourceId = id;
  }
}

class ValidationError extends AppError {
  constructor(message, fields) {
    super(message, 400);
    this.fields = fields;
  }
}

class ExternalServiceError extends AppError {
  constructor(service, cause) {
    super(`${service} is unavailable`, 503, { cause });
    this.service = service;
  }
}

// Usage
async function getProduct(id) {
  const product = await db.findById(id);
  if (!product) throw new NotFoundError('Product', id);
  return product;
}

// In error middleware
app.use((err, req, res, next) => {
  if (err.isOperational) {
    // Known, expected error — safe to send details to client
    return res.status(err.statusCode).json({ error: err.message });
  }
  // Unknown programmer error — don't leak details
  logger.fatal({ err }, 'Unexpected error');
  res.status(500).json({ error: 'Something went wrong' });
});
```

---

## PART 3: COMBINED TRICKY QUESTIONS

### Q: What happens here? How do you fix it?

```js
async function saveAllProducts(products) {
  products.forEach(async (product) => {
    await saveProduct(product); // async inside forEach
  });
  console.log('All saved!'); // Does this guarantee all are saved?
}
```

**Answer:** NO. `forEach` does not await async callbacks. `console.log('All saved!')` runs immediately after starting all saves, not after they complete. If any save fails, the error is silently swallowed.

**Fix:**
```js
// Option 1: for...of (sequential)
async function saveAllProducts(products) {
  for (const product of products) {
    await saveProduct(product);
  }
  console.log('All saved!');
}

// Option 2: Promise.all (parallel)
async function saveAllProducts(products) {
  await Promise.all(products.map(product => saveProduct(product)));
  console.log('All saved!');
}

// Option 3: Promise.allSettled (parallel, captures all errors)
async function saveAllProducts(products) {
  const results = await Promise.allSettled(
    products.map(product => saveProduct(product))
  );

  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.error(`${failures.length} products failed to save`);
    failures.forEach(f => console.error(f.reason));
  }

  console.log('Batch complete');
}
```

---

### Q: Promise.all vs Promise.allSettled vs Promise.race vs Promise.any

```js
const p1 = fetchInventory(id);      // resolves in 100ms
const p2 = fetchPrice(id);          // REJECTS in 50ms
const p3 = fetchReviews(id);        // resolves in 200ms

// Promise.all — fails fast on first rejection
await Promise.all([p1, p2, p3]);
// Throws immediately when p2 rejects at 50ms
// p1 and p3 results are LOST even though p1 resolved

// Promise.allSettled — waits for ALL, never throws
const results = await Promise.allSettled([p1, p2, p3]);
// After 200ms:
// results[0] = { status: 'fulfilled', value: inventoryData }
// results[1] = { status: 'rejected', reason: Error }
// results[2] = { status: 'fulfilled', value: reviewsData }

// Promise.race — first to settle (resolve OR reject) wins
await Promise.race([p1, p2, p3]);
// Rejects at 50ms when p2 rejects first
// Use case: timeout pattern

// Promise.any — first to RESOLVE wins (ignores rejections)
await Promise.any([p1, p2, p3]);
// Resolves at 100ms when p1 resolves
// Only throws AggregateError if ALL reject
// Use case: try multiple endpoints, use first success
```

**Timeout pattern with Promise.race:**
```js
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

const data = await withTimeout(fetchProduct(id), 2000);
```

---

### Q: Error handling in parallel operations — the subtle bug

```js
// WRONG — if fetchB throws, fetchA's result is ignored
// but fetchA might have side effects (e.g., incremented a counter)
async function fetchBoth() {
  const [a, b] = await Promise.all([
    fetchA(), // might succeed
    fetchB(), // might fail
  ]);
  return { a, b };
}

// If you need partial results on failure:
async function fetchBoth() {
  const [resultA, resultB] = await Promise.allSettled([fetchA(), fetchB()]);

  return {
    a: resultA.status === 'fulfilled' ? resultA.value : null,
    b: resultB.status === 'fulfilled' ? resultB.value : null,
    errors: [resultA, resultB]
      .filter(r => r.status === 'rejected')
      .map(r => r.reason),
  };
}
```

---

### Q: What is error.cause? (Node 16.9+)

```js
// Wrapping errors with context while preserving the original
async function fetchUserOrders(userId) {
  try {
    return await db.query('SELECT * FROM orders WHERE user_id = ?', [userId]);
  } catch (err) {
    throw new Error(`Failed to fetch orders for user ${userId}`, { cause: err });
    // err.cause === original database error
    // Stack trace includes both errors
  }
}

// Accessing the cause chain
try {
  await fetchUserOrders(123);
} catch (err) {
  console.error(err.message);        // "Failed to fetch orders for user 123"
  console.error(err.cause.message);  // "Connection refused" (original DB error)
}
```

---

## PART 4: INTERVIEW QUESTION PATTERNS TO EXPECT

### Pattern 1: "What does this code print?"
→ Always trace: sync → nextTick → Promise microtasks → macrotasks

### Pattern 2: "What's wrong with this code?"
→ Look for: async in forEach, missing .catch(), missing error middleware, uncaught stream errors

### Pattern 3: "How would you handle errors in X scenario?"
→ Structure your answer: try/catch + custom error class + error middleware + process-level handler + logging

### Pattern 4: "Debug this — requests are hanging"
→ Common causes: unhandled rejection silently swallowed, missing next(err) in Express, unhandled EventEmitter error

### Pattern 5: Design question — "Build a retry mechanism"

```js
async function withRetry(fn, { retries = 3, delay = 1000, backoff = 2 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === retries) break; // last attempt, don't wait

      // Exponential backoff: 1s, 2s, 4s
      const waitMs = delay * Math.pow(backoff, attempt - 1);
      console.log(`Attempt ${attempt} failed. Retrying in ${waitMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }

  throw new Error(`Failed after ${retries} attempts`, { cause: lastError });
}

// Usage
const data = await withRetry(
  () => fetchFromUnreliableService(id),
  { retries: 3, delay: 500 }
);
```

---

## PART 5: QUICK REFERENCE CHEAT SHEET

### Execution Order (Memorize This)
```
1. Synchronous code (call stack)
2. process.nextTick callbacks
3. Promise.then / async-await continuations (microtasks)
4. setImmediate (check phase)
5. setTimeout / setInterval (timers phase)
6. I/O callbacks (poll phase)
```

### Error Handling Checklist
- [ ] All async functions have try/catch or .catch()
- [ ] No async callbacks inside forEach — use for...of or Promise.all
- [ ] Express async routes use asyncHandler wrapper or express-async-errors
- [ ] Express error middleware has 4 params (err, req, res, next)
- [ ] All EventEmitters have 'error' listeners
- [ ] Streams use pipeline(), not .pipe()
- [ ] process.on('unhandledRejection') exits the process
- [ ] process.on('SIGTERM') does graceful shutdown
- [ ] Custom error classes extend Error with isOperational flag
- [ ] Error chaining uses { cause: originalError }

### Promise Methods Summary
| Method | Behavior | Use When |
|---|---|---|
| `Promise.all` | Fails fast on first rejection | All must succeed, need all results |
| `Promise.allSettled` | Waits for all, never throws | Want partial results on failure |
| `Promise.race` | First to settle wins | Timeout patterns |
| `Promise.any` | First to RESOLVE wins | Try multiple, use first success |
