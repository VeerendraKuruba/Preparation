# Node.js for Frontend Engineers — Interview Q&A

> Scope: Node.js as used by **frontend engineers** — tooling, SSR, build pipelines, BFF (Backend for Frontend), and lightweight REST APIs. Not a backend/microservices deep-dive, but you must know these concepts cold.

---

## eBay-Specific Context

eBay migrated from a Java stack to a **Node.js stack starting in 2012**. Key facts that may surface in interviews:

- eBay built and open-sourced **Marko.js**, a streaming SSR UI framework designed to replace Dust.js
- Marko was designed specifically for **progressive/async rendering** and **partial hydration** — eBay's answer to performance at scale
- eBay's Node.js apps power nearly 20,000 UI components
- Confirmed eBay interview topics: Promises, JavaScript recursion, React, and questions on **full-stack Node.js + React** when hired as a frontend/full-stack engineer
- eBay shifted from pure React Sr. roles to full-stack maintainers who own both Node.js server layers and client-side code

**Likely eBay-specific Node.js questions:**
- "How does SSR improve performance on an e-commerce listing page?"
- "How would you implement progressive rendering with Node.js streams?"
- "What is partial hydration and why does eBay's Marko use it?"
- "How does backpressure in Node.js streams apply to serving HTML chunks?"
- "How do you scale a Node.js BFF layer that serves millions of concurrent product page requests?"

---

## Section 1: What Node.js Topics Frontend Engineers Are Tested On

**Q: Why do frontend engineers need Node.js knowledge?**

A: Modern frontend engineering extends into the server layer in multiple ways:
1. **SSR/SSG**: Frameworks like Next.js, Nuxt, and Remix run Node.js servers to pre-render HTML
2. **Build tooling**: Webpack, Vite, Babel, ESLint, PostCSS all run in Node.js
3. **BFF pattern**: Frontend teams own a "Backend for Frontend" Node.js service that aggregates APIs for the UI
4. **npm/package ecosystem**: Dependency management, monorepos (Turborepo, Nx), publishing packages
5. **Scripting**: Node scripts in `package.json` for CI/CD, test runners, code generators

**Q: What Node.js knowledge is NOT typically tested for frontend engineers?**

A: Deep backend topics like raw TCP sockets, database ORM design, complex microservices orchestration, or message queues (Kafka, RabbitMQ) are generally out of scope. Focus is on I/O handling, SSR patterns, tooling, and REST API fundamentals.

---

## Section 2: Node.js Event Loop vs Browser Event Loop

**Q: What is the Node.js event loop?**

A: The event loop is the mechanism that allows Node.js to perform non-blocking I/O despite being single-threaded. It offloads I/O operations to the OS or libuv's thread pool, then picks up their callbacks once complete. The main thread is free to handle other requests while waiting.

**Q: What are the phases of the Node.js event loop (in order)?**

A:
1. **Timers** — executes `setTimeout()` and `setInterval()` callbacks whose delay has expired
2. **Pending Callbacks** — executes I/O callbacks deferred from the previous iteration
3. **Idle / Prepare** — internal use only
4. **Poll** — retrieves new I/O events; executes I/O callbacks (most of the work happens here)
5. **Check** — executes `setImmediate()` callbacks
6. **Close Callbacks** — executes close events (e.g., `socket.on('close', ...)`)

Between each phase, Node.js drains the **microtask queues**: first `process.nextTick()` queue, then the Promise microtask queue (`.then()` / `await`).

**Q: What is the difference between `process.nextTick()` and `setImmediate()`?**

A:
- `process.nextTick()` fires **before** the event loop proceeds to the next phase — it is not technically part of the event loop. It drains completely before any I/O or timer callbacks run.
- `setImmediate()` fires in the **check phase**, after the poll phase completes.

```js
setImmediate(() => console.log('setImmediate'));
process.nextTick(() => console.log('nextTick'));
// Output: nextTick, setImmediate
```

**Q: What is the execution order for `setTimeout`, `setImmediate`, `Promise.resolve()`, and `process.nextTick()` when called from the top level?**

A:
```
Synchronous code
  → process.nextTick callbacks (all of them)
  → Promise microtasks (.then / async-await)
  → setTimeout (timers phase)
  → setImmediate (check phase — order vs setTimeout is non-deterministic at top level)
```

From within an **I/O callback**, `setImmediate` always fires before `setTimeout`.

**Q: How does the Node.js event loop differ from the browser event loop?**

| Aspect | Browser | Node.js |
|--------|---------|---------|
| Phases | Microtask queue + macrotask queue (simple two-tier) | 6 distinct phases with separate queues |
| `process.nextTick` | Does not exist | Highest-priority queue, runs before I/O |
| `setImmediate` | Does not exist (IE only, deprecated) | Runs in check phase after poll |
| Rendering | Has a "rendering step" between tasks | No rendering — no layout/paint |
| Web APIs | setTimeout, fetch, DOM events, requestAnimationFrame | libuv I/O, child processes, file system |
| Thread pool | No (single JS thread + browser internals) | libuv provides 4-thread pool (configurable via `UV_THREADPOOL_SIZE`) |

**Q: Predict the output of this code:**

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
process.nextTick(() => console.log('4'));
console.log('5');
```

A: `1, 5, 4, 3, 2`
- Sync runs first: 1, 5
- `process.nextTick` runs before Promise microtasks: 4
- Promise `.then()` microtask: 3
- `setTimeout` macrotask (timers phase): 2

**Q: What happens when `process.nextTick()` is called recursively?**

A: It can starve the event loop. Since `nextTick` callbacks are fully drained before the event loop moves on, a recursive `nextTick` call will prevent I/O from being processed. Use `setImmediate()` for recursive async work instead.

---

## Section 3: Express.js and Middleware

**Q: What is Express.js and why is it relevant for frontend engineers?**

A: Express is a minimal, unopinionated Node.js web framework. Frontend engineers use it for: BFF services, SSR servers (Next.js uses its own server but you build custom Express SSR setups), dev proxies, and mock API servers.

**Q: What is middleware in Express?**

A: A middleware function has the signature `(req, res, next)` and sits in the request-response pipeline. It can:
- Read/modify `req` and `res`
- End the request cycle (send a response)
- Call `next()` to pass control to the next middleware
- Call `next(error)` to pass to error-handling middleware

```js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // must call this or request hangs
});
```

**Q: What are the types of middleware in Express?**

A:
1. **Application-level**: `app.use()` — runs for every request
2. **Router-level**: `router.use()` — scoped to a router
3. **Error-handling**: `(err, req, res, next)` — 4 parameters, handles errors
4. **Built-in**: `express.json()`, `express.urlencoded()`, `express.static()`
5. **Third-party**: `cors`, `helmet`, `morgan`, `express-rate-limit`, `passport`

**Q: What does `next(err)` do vs `next()`?**

A: `next()` moves to the next regular middleware. `next(err)` skips all regular middleware and jumps directly to the next **error-handling middleware** (a function with 4 parameters: `err, req, res, next`).

**Q: How do you implement authentication middleware?**

```js
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: 'Forbidden' });
  }
};

app.get('/protected', authenticate, (req, res) => {
  res.json({ user: req.user });
});
```

**Q: What is the difference between `app.use()` and `app.get()`?**

A:
- `app.use('/path', fn)` matches **any HTTP method** and is prefix-matched (so `/path/anything` also matches)
- `app.get('/path', fn)` matches **only GET requests** and is exact-path matched
- `app.use()` is used for middleware; `app.get/post/put/delete()` for route handlers

**Q: How does Express handle errors?**

A: Define a 4-argument middleware at the end of the middleware stack:

```js
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message });
});
```

Any middleware that calls `next(err)` will skip to this handler.

**Q: How do you handle CORS in Express?**

```js
const cors = require('cors');
app.use(cors({
  origin: ['https://www.ebay.com', 'https://staging.ebay.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
```

**Q: What is `express.Router()` and when do you use it?**

A: A mini Express application for grouping related routes. Used to organize large apps into modules:

```js
// routes/products.js
const router = express.Router();
router.get('/', getProducts);
router.get('/:id', getProductById);
module.exports = router;

// app.js
app.use('/api/products', require('./routes/products'));
```

---

## Section 4: Streams, Buffer, and the `fs` Module

**Q: What are Node.js streams and why do they matter for frontend engineers?**

A: Streams process data in **chunks** rather than loading everything into memory at once. This is critical for:
- **SSR**: Streaming HTML responses to the browser (`renderToPipeableStream` in React 18)
- **File processing**: Reading large config files, logs, assets in build tooling
- **Proxying**: Piping API responses directly to the client

**Q: What are the four types of streams?**

| Type | Description | Example |
|------|-------------|---------|
| Readable | Data can be read from it | `fs.createReadStream()`, HTTP request |
| Writable | Data can be written to it | `fs.createWriteStream()`, HTTP response |
| Duplex | Both readable and writable | TCP socket |
| Transform | Modifies data as it passes through | `zlib.createGzip()` (compression) |

**Q: What is stream piping?**

A: `readable.pipe(writable)` connects two streams, automatically handling data flow and backpressure. Example — serve a compressed file:

```js
const fs = require('fs');
const zlib = require('zlib');

app.get('/file', (req, res) => {
  fs.createReadStream('./large-file.txt')
    .pipe(zlib.createGzip())
    .pipe(res);
});
```

**Q: What is backpressure in streams?**

A: Backpressure occurs when a writable stream's internal buffer fills up (consumer is slower than producer). If ignored:
- Memory usage grows unboundedly
- GC pressure increases
- Application may crash

Node.js handles this automatically with `.pipe()`. If manually writing, check the return value of `writable.write()` — if `false`, pause the readable and wait for the `'drain'` event before resuming.

**Q: What is a Buffer in Node.js?**

A: A `Buffer` is a fixed-size allocation of raw binary memory **outside the V8 heap**. Used for:
- Handling binary data (images, files, network packets)
- Working with streams (data arrives as Buffer chunks)
- Encoding/decoding (UTF-8, base64, hex)

```js
const buf = Buffer.from('Hello', 'utf8');
console.log(buf);           // <Buffer 48 65 6c 6c 6f>
console.log(buf.toString()); // 'Hello'
console.log(buf.toString('base64')); // 'SGVsbG8='
```

**Q: What is the difference between `fs.readFile()` and `fs.createReadStream()`?**

| | `fs.readFile()` | `fs.createReadStream()` |
|---|---|---|
| Loads entire file | Yes — into memory | No — chunks at a time |
| Memory usage | High for large files | Constant, low |
| Use case | Small config files, JSON | Large files, logs, media |
| Returns | Buffer or string in callback | Readable stream |

**Q: What is the difference between synchronous and asynchronous `fs` methods?**

A: Sync methods (e.g., `fs.readFileSync()`) **block the event loop** until the operation completes — all other incoming requests wait. Async methods (`fs.readFile()`, `fs.promises.readFile()`) use callbacks/Promises and don't block. **Never use sync methods in a production server request handler.** They are acceptable in startup scripts or CLI tools.

**Q: How do you use `fs` with Promises (modern approach)?**

```js
const { readFile, writeFile } = require('fs/promises');

async function processFile() {
  const data = await readFile('./data.json', 'utf8');
  const parsed = JSON.parse(data);
  await writeFile('./output.json', JSON.stringify(parsed, null, 2));
}
```

---

## Section 5: npm, package.json, and Module System

**Q: What is the difference between `dependencies`, `devDependencies`, and `peerDependencies` in package.json?**

A:
- `dependencies`: Required at **runtime** — shipped to production (e.g., `express`, `react`)
- `devDependencies`: Required only during **development/build** — not in production bundle (e.g., `webpack`, `jest`, `eslint`)
- `peerDependencies`: Expected to be installed by the **consumer** of your package (e.g., a React component library listing `react` as a peer dependency)

**Q: What is `package-lock.json` and why does it exist?**

A: It records the **exact resolved version and integrity hash** of every installed package (including transitive dependencies). This guarantees reproducible installs across machines and CI environments. You should always commit `package-lock.json`.

**Q: What is the difference between `npm install` and `npm ci`?**

A:
- `npm install`: Installs packages, may update `package-lock.json` if it drifts
- `npm ci`: **Clean install** — deletes `node_modules` entirely and installs exactly what is in `package-lock.json`. Fails if lock file is out of sync. Always use `npm ci` in CI/CD pipelines for reproducibility.

**Q: What is the difference between CommonJS (CJS) and ES Modules (ESM)?**

| Feature | CommonJS | ESM |
|---------|----------|-----|
| Syntax | `require()` / `module.exports` | `import` / `export` |
| Loading | **Synchronous** | **Asynchronous** |
| Static analysis | No (dynamic require possible) | Yes (imports are statically analyzed) |
| Tree shaking | Not supported | Supported by bundlers |
| Top-level `await` | Not supported | Supported (Node.js v14.8+) |
| `__dirname` / `__filename` | Available automatically | Must derive from `import.meta.url` |
| Default in Node.js | Yes (`.js` files default to CJS) | Opt-in via `"type": "module"` in package.json or `.mjs` extension |

**Q: How do you configure a Node.js project to use ESM?**

A: Two options:
1. Add `"type": "module"` to `package.json` — all `.js` files treated as ESM
2. Use `.mjs` extension for ESM files without changing `package.json`

For libraries that need to support both, use the `exports` field with conditional exports:
```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

**Q: How do you import a CommonJS module from ESM and vice versa?**

A:
- **ESM importing CJS**: Works natively — `import foo from './foo.cjs'`
- **CJS importing ESM**: Cannot use `require()` for ESM. Must use dynamic `import()` inside an async function:
  ```js
  async function load() {
    const { default: foo } = await import('./foo.mjs');
  }
  ```
  Node.js 23+ allows `require()` for ESM modules that don't use top-level await.

**Q: What is the `exports` field in package.json?**

A: The `exports` field provides a modern way to define public package entry points. It:
- Restricts what files can be imported (encapsulation)
- Supports conditional exports (CJS vs ESM, development vs production)
- Takes precedence over `main` and `module` fields for Node.js 12+

**Q: What does `npm run` do and what are lifecycle scripts?**

A: `npm run <script>` executes scripts defined in `package.json` under `"scripts"`. Built-in lifecycle scripts run automatically:
- `preinstall` / `postinstall` — before/after `npm install`
- `prebuild` / `build` / `postbuild` — before/after `npm run build`
- `test`, `start` — run with `npm test` and `npm start` directly

---

## Section 6: Server-Side Rendering (SSR) with Node.js

**Q: What is SSR and how does Node.js enable it?**

A: In SSR, the HTML for a page is **generated on the server** (in Node.js) and sent to the browser as a complete document, rather than sending an empty shell and letting JavaScript build the UI on the client. Node.js runs the same JavaScript framework (React, Vue, etc.) on the server side.

**Q: What are the benefits of SSR for an e-commerce site like eBay?**

A:
1. **Faster First Contentful Paint (FCP)** — browser receives pre-rendered HTML, no JS parsing needed to show content
2. **Better SEO** — search engine crawlers see full HTML content immediately
3. **Social sharing / link previews** — Open Graph tags are server-rendered with correct data
4. **Performance on low-power devices** — server offloads rendering work from client

**Q: What is hydration?**

A: Hydration is the process where the browser takes server-rendered HTML and **attaches React's event listeners and state** to it, making it interactive. React reconciles its virtual DOM with the existing DOM rather than re-rendering from scratch.

Without hydration: static HTML, no interactivity
With hydration: same HTML, but now React controls it

**Q: What is a hydration mismatch and how do you fix it?**

A: A hydration mismatch occurs when the server-rendered HTML differs from what React would render on the client (e.g., using `Date.now()`, `Math.random()`, or `window` on the server). React throws a warning and falls back to client-side rendering.

Fixes:
- Use `suppressHydrationWarning` for intentionally different content (timestamps)
- Use `useEffect` for client-only code (runs only in browser)
- Use `next/dynamic` with `{ ssr: false }` for components that must be client-only

**Q: What is the difference between SSR, SSG, and ISR?**

| | SSR | SSG | ISR |
|---|---|---|---|
| When rendered | Per request, on server | At build time | At build time + revalidated on schedule |
| Freshness | Always fresh | Stale until rebuild | Fresh within revalidation window |
| Performance | Slower TTFB | Fastest (CDN-served) | Fast (CDN) with freshness |
| Use case | Personalized pages (cart, user profile) | Marketing pages, docs | Product listings, blog posts |
| Node.js role | Runs on every request | Runs once at build | Runs at build + revalidation |

**Q: How does React 18 streaming SSR work with Node.js?**

A: React 18's `renderToPipeableStream` (Node.js) sends HTML in **chunks** as components resolve, rather than waiting for all data to load before sending anything:

```js
import { renderToPipeableStream } from 'react-dom/server';

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  const { pipe } = renderToPipeableStream(<App />, {
    onShellReady() {
      res.statusCode = 200;
      pipe(res); // starts streaming HTML
    },
    onError(err) {
      res.statusCode = 500;
    }
  });
});
```

Components wrapped in `<Suspense>` stream their content as data becomes available. This improves Time to First Byte (TTFB).

**Q: What is partial hydration and why did eBay implement it in Marko?**

A: Partial hydration means **only interactive components are hydrated** on the client — static parts of the page ship zero JavaScript. This drastically reduces the JavaScript bundle size. eBay's Marko framework pioneered this for their product pages, where the majority of content (description, images) is static and doesn't need a JavaScript runtime to be interactive.

**Q: How do you implement caching in a Node.js SSR server?**

A:
1. **In-memory cache** (e.g., `node-cache`) for rendered HTML keyed by URL + params
2. **Redis cache** for distributed environments (multiple Node.js instances)
3. **HTTP caching headers** — set `Cache-Control: s-maxage=60` for CDN caching
4. **Incremental Static Regeneration** (Next.js) — regenerate pages on background after TTL

---

## Section 7: Node.js Performance, Clustering, and Worker Threads

**Q: Why is Node.js single-threaded and what does that mean for performance?**

A: The **main JS thread** is single-threaded — only one piece of JavaScript executes at a time. This is fine for I/O-bound work (waiting for DB, network) because the event loop handles concurrency without threads. It becomes a problem for **CPU-intensive tasks** (image processing, complex calculations) which block the event loop and prevent other requests from being handled.

**Q: What is the Node.js cluster module?**

A: The `cluster` module spawns **multiple OS processes** (workers), each running their own event loop and memory. They share the same server port. This lets Node.js utilize all CPU cores:

```js
const cluster = require('cluster');
const os = require('os');
const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork(); // spawn worker process
  }
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, respawning`);
    cluster.fork();
  });
} else {
  require('./server'); // each worker runs the server
}
```

**Q: What is the difference between clustering and worker threads?**

| | Cluster | Worker Threads |
|---|---|---|
| Unit | Separate OS **processes** | Separate **threads** within one process |
| Memory | Separate memory per process | Can share memory (`SharedArrayBuffer`) |
| Use case | Scale request handling across CPUs | Offload CPU-intensive computation |
| Communication | IPC (slower, serialized) | Faster (shared memory possible) |
| Isolation | High (crash doesn't affect others) | Lower (shared process memory) |
| V8 instance | One per process | One per thread |

**Q: When would you use worker threads in a frontend context?**

A: When your Node.js SSR server or build tool needs to perform CPU-heavy operations without blocking the event loop:
- **Image optimization** during SSR (resize, convert formats)
- **Syntax highlighting** for large code blocks
- **Heavy template compilation** at request time
- **Webpack/Vite** uses worker threads internally for parallel transforms

```js
const { Worker } = require('worker_threads');

function runWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./heavy-task.js', { workerData: data });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}
```

**Q: What is PM2 and how is it used with Node.js?**

A: PM2 is a process manager for Node.js. It handles clustering automatically, restarts crashed processes, manages logs, and supports zero-downtime reloads. Frontend teams use it to deploy SSR servers and BFF services:

```bash
pm2 start server.js -i max    # cluster mode, use all CPUs
pm2 reload app --update-env   # zero-downtime reload
```

**Q: How do you prevent the event loop from being blocked?**

A:
1. Never use synchronous I/O (`readFileSync`, `execSync`) in request handlers
2. Offload CPU work to worker threads
3. Use streaming for large data
4. Use `setImmediate()` to yield between chunks of heavy processing
5. Use clustering/PM2 to isolate process crashes
6. Profile with `--prof` or `clinic.js` to detect event loop lag

---

## Section 8: Building REST APIs with Node.js (Frontend Engineer Scope)

**Q: How do you build a simple REST API with Express for a BFF?**

```js
const express = require('express');
const app = express();

app.use(express.json());
app.use(cors());

// GET all products
app.get('/api/products', async (req, res) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    const products = await fetchProducts({ page, limit, category });
    res.json({ data: products, page, limit });
  } catch (err) {
    next(err);
  }
});

// GET single product
app.get('/api/products/:id', async (req, res, next) => {
  try {
    const product = await fetchProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
```

**Q: What is the difference between route parameters, query parameters, and request body?**

A:
- **Route params** (`req.params`): Part of the URL path, required — `/products/:id` → `req.params.id`
- **Query params** (`req.query`): Optional key-value pairs after `?` — `/products?page=2&category=shoes` → `req.query.page`
- **Request body** (`req.body`): Data sent in POST/PUT/PATCH requests, requires `express.json()` middleware

**Q: What HTTP status codes should a REST API return?**

| Status | Meaning | When to use |
|--------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST that created a resource |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input, missing required fields |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

**Q: How do you implement API versioning in Express?**

A: Three common approaches:
1. **URI versioning** (most common): `/api/v1/products`, `/api/v2/products`
2. **Header versioning**: `Accept-Version: 1` or `API-Version: 2` header
3. **Query param versioning**: `/api/products?version=2`

URI versioning is preferred for its explicitness and cacheability.

**Q: How do you implement rate limiting in Express?**

```js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // max 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api/', limiter);
```

**Q: What is the BFF (Backend for Frontend) pattern and why is it used at eBay?**

A: A BFF is a dedicated server (Node.js) that acts as an API gateway for a specific frontend (mobile app, desktop web, etc.). It:
- **Aggregates** multiple backend microservices into a single request
- **Transforms** data into exactly the shape the UI needs (no over/under-fetching)
- **Handles authentication** and token forwarding
- **Server-renders** the initial HTML using aggregated data

eBay uses this pattern because their product pages require data from dozens of backend services (pricing, inventory, seller info, recommendations), and the BFF assembles all of this before rendering.

**Q: How do you proxy API requests from a Node.js SSR server?**

```js
const { createProxyMiddleware } = require('http-proxy-middleware');

app.use('/api', createProxyMiddleware({
  target: 'https://internal-api.ebay.com',
  changeOrigin: true,
  pathRewrite: { '^/api': '' },
  on: {
    error: (err, req, res) => res.status(502).json({ error: 'Bad gateway' })
  }
}));
```

---

## Section 9: Tricky / Advanced Questions

**Q: What is the difference between `spawn()`, `exec()`, `execFile()`, and `fork()` in Node.js child_process?**

A:
- `spawn(command, args)` — streams stdout/stderr; best for large output or long-running processes
- `exec(command, callback)` — buffers output; use for short commands where you need the full result
- `execFile(file, args)` — like `exec` but runs a file directly (no shell), safer for user input
- `fork(modulePath)` — spawns a new Node.js process with a built-in IPC channel; used by the `cluster` module

**Q: What is a memory leak in Node.js and how do you detect one?**

A: Memory leaks occur when objects are retained in memory longer than needed, preventing garbage collection. Common causes:
- Global variables that grow unboundedly
- Event listener accumulation (forgetting `removeEventListener`)
- Closures holding references to large objects
- Uncleared intervals/timeouts

Detection: `node --inspect`, Chrome DevTools heap snapshots, or `clinic.js heapprofiler`.

**Q: What is `global` in Node.js and how does it differ from `window`?**

A: `global` is Node.js's global object (equivalent to `window` in browsers). Variables declared without `var/let/const` in non-module files attach to `global`. In ESM, there is no implicit global scope — you must explicitly use `globalThis` (which works in both environments). In browser code, `globalThis === window`; in Node.js, `globalThis === global`.

**Q: How do you handle environment variables in Node.js?**

A:
- Access via `process.env.VARIABLE_NAME`
- Load from `.env` files using `dotenv` library: `require('dotenv').config()`
- Node.js 20.6+ has built-in `.env` loading: `node --env-file=.env server.js`
- Never commit `.env` files; use `.env.example` as a template
- Validate env vars at startup (fail fast if required vars are missing)

**Q: What is the difference between `__dirname` and `process.cwd()`?**

A:
- `__dirname` (CJS only): The directory of the **current module file** — stays constant regardless of where Node.js was launched from
- `process.cwd()`: The **current working directory** of the Node.js process — where `node` was invoked from

For path resolution in modules, always use `__dirname` (or `import.meta.url` in ESM) rather than `process.cwd()`, because `cwd()` changes if the process is started from a different directory.

**Q: How does `require()` resolution work in Node.js?**

A: When you call `require('some-module')`:
1. Check if it's a core module (e.g., `fs`, `path`) — return immediately
2. If starts with `./`, `../`, or `/` — resolve as a file path
3. Otherwise, search `node_modules` — starting from the current directory, walking up to the root
4. Check `package.json` `main` field (or `exports` field in newer packages)
5. Cache the result in `require.cache` — subsequent calls return the cached module

---

## Quick Reference: Key npm Commands

```bash
npm init -y                    # Create package.json with defaults
npm install <pkg>              # Install and add to dependencies
npm install -D <pkg>           # Install and add to devDependencies
npm ci                         # Clean install (CI/CD)
npm run <script>               # Run a script from package.json
npm list --depth=0             # List top-level installed packages
npm outdated                   # Show packages with newer versions
npm audit                      # Check for security vulnerabilities
npm audit fix                  # Auto-fix vulnerabilities
npm publish                    # Publish package to registry
npx <command>                  # Run a package without installing globally
```

---

## Sources

- [eBay Frontend Interview Questions - Glassdoor](https://www.glassdoor.com/Interview/eBay-Front-End-Developer-Interview-Questions-EI_IE7853.0,4_KO5,24.htm)
- [How eBay Built Their First Node.js Application - eBay Tech Blog](https://tech.ebayinc.com/engineering/how-we-built-ebays-first-node-js-application/)
- [The Future of Marko - eBay Innovation](https://innovation.ebayinc.com/stories/the-future-of-marko/)
- [Node.js Interview Questions - roadmap.sh](https://roadmap.sh/questions/nodejs)
- [Top 80+ Node.js Interview Questions - InterviewBit](https://www.interviewbit.com/node-js-interview-questions/)
- [Top 50+ Node.js Interview Questions - GeeksforGeeks](https://www.geeksforgeeks.org/node-js/node-interview-questions-and-answers/)
- [Top 50+ Express.js Interview Questions - GeeksforGeeks](https://www.geeksforgeeks.org/node-js/top-50-express-js-interview-questions-and-answers/)
- [CommonJS vs ESM - Better Stack](https://betterstack.com/community/guides/scaling-nodejs/commonjs-vs-esm/)
- [Mastering Event Loop Interview Questions - LinkedIn](https://www.linkedin.com/pulse/mastering-event-loop-tricky-node-interview-questions-aayush-patniya-lbobf)
- [Difference Between Event Loop in Browser and Node.js - DEV Community](https://dev.to/jasmin/difference-between-the-event-loop-in-browser-and-node-js-1113)
- [SSR vs CSR Interview Questions - Medium](https://medium.com/@ellen31725/the-series-of-commonly-asked-interview-questions-revolves-around-basic-concepts%E2%85%B1-49ba952aa492)
- [Node.js Interview Questions for Experienced Developers - Medium](https://medium.com/@rvislive/top-nodejs-interview-questions-and-answers-for-experienced-developers-05c03b05d7bc)
- [Express.js Interview Questions - GitHub (Devinterview-io)](https://github.com/Devinterview-io/express-interview-questions)
- [100 Node.js Interview Questions - Simplilearn](https://www.simplilearn.com/tutorials/nodejs-tutorial/nodejs-interview-questions)
- [Node.js Clustering vs Worker Threads - GeeksforGeeks](https://www.geeksforgeeks.org/node-js/differentiate-between-worker-threads-and-clusters-in-node-js/)
- [eBay Frontend Engineer Interview Questions - Prepfully](https://prepfully.com/interview-questions/ebay/frontend-engineer)
