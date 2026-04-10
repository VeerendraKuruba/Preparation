# eBay-Specific Node.js Interview Questions & Answers

---

## Q1: How does SSR improve performance on an e-commerce listing page?

### The Core Problem SSR Solves

On a product listing page (think eBay search results), a pure CSR (Client-Side Rendered) approach does this:

```
Browser → GET /search?q=iphone
Server  → sends empty <div id="root"></div> + JS bundle (~500KB+)
Browser → parses + executes JS bundle
Browser → JS makes API call to fetch listings
Browser → JS renders 48 product cards
User    → finally sees content (~3-4 seconds)
```

SSR flips this:

```
Browser → GET /search?q=iphone
Server  → fetches listings data + renders full HTML in Node.js
Server  → sends complete HTML with 48 product cards
Browser → paints immediately (Time to First Paint ~300ms)
Browser → downloads JS in background
Browser → hydrates (attaches event listeners)
User    → sees content instantly, interacts after hydration
```

### Specific Performance Gains for eBay-Scale Listing Pages

**1. Time to First Contentful Paint (FCP)**
- SSR sends pre-rendered HTML — the browser can start painting immediately
- At eBay scale: FCP drops from ~3s → ~0.5s on fast connections

**2. Core Web Vitals — LCP (Largest Contentful Paint)**
- The hero product image or first listing card is the LCP element
- With SSR, that element is in the initial HTML payload — no JS needed to render it
- Google uses LCP for SEO ranking → directly impacts eBay's organic traffic

**3. SEO — Critical for eBay**
- Search crawlers (Googlebot) index HTML, not JS-rendered content
- SSR ensures all 48 listing titles, prices, and item IDs are in the raw HTML
- Without SSR: Googlebot might miss dynamic content → lower rankings → less traffic

**4. Perceived Performance on Slow Connections / Low-End Devices**
- Emerging markets use mid-range Android phones with slow CPUs
- Parsing a 500KB JS bundle on a low-end phone takes 2-5 seconds
- SSR shifts that computation from browser (varying hardware) to server (consistent, powerful hardware)

### How eBay Does SSR in Practice

eBay uses **Marko** (their own SSR framework) which enables:

```js
// Marko template — server renders this to HTML stream
<for|item| of=state.listings>
  <listing-card
    title=item.title
    price=item.price
    imageUrl=item.imageUrl
    condition=item.condition
  />
</for>
```

The Node.js server:
1. Receives the request
2. Calls internal services (search API, pricing service) in parallel
3. Streams the HTML to the browser as data arrives (progressive rendering)
4. Browser starts rendering top of page before the server finishes the bottom

### SSR vs. Static Generation for Listing Pages

| Approach | Use Case | eBay Fit |
|---|---|---|
| Full SSR | Dynamic, personalized | Product listing pages — prices change every second |
| Static (SSG) | Rarely changes | Category landing pages |
| ISR | Semi-dynamic | Top-100 item pages, refreshed every 60s |
| CSR | Highly interactive | Cart, checkout, seller dashboard |

### Trade-offs to Mention

- **Server CPU cost**: Every request triggers a render. eBay handles millions of requests/min — requires horizontal scaling + render caching
- **TTFB (Time to First Byte)** can increase slightly vs pure CDN-served static files
- **Hydration cost**: After SSR, the browser still downloads JS and "hydrates" — if done naively, this re-renders everything (double work). Marko's partial hydration solves this (see Q3)

---

## Q2: How would you implement progressive rendering with Node.js streams?

### What is Progressive Rendering?

Instead of waiting for all data before sending HTML, the server **streams HTML chunks** to the browser as soon as each piece is ready. The browser renders each chunk immediately.

```
Traditional SSR:
Server: [wait 300ms for all data] → send full 48KB HTML at once
Browser: receives all → renders all

Progressive Rendering:
Server: [0ms]   → send <head>, nav, search bar HTML immediately
Server: [50ms]  → send first 12 product cards as they arrive
Server: [150ms] → send remaining 36 cards
Browser: paints header in 50ms, first cards in 100ms, rest in 200ms
```

### Implementation with Node.js Streams

#### Basic Express + Readable Stream

```js
const express = require('express');
const { Readable } = require('stream');
const app = express();

app.get('/listings', async (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Transfer-Encoding', 'chunked');

  // Flush HTML shell immediately — browser starts rendering
  res.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>eBay Search Results</title>
      <link rel="stylesheet" href="/styles.css">
    </head>
    <body>
      <nav>eBay Nav</nav>
      <h1>Search Results</h1>
      <div id="listings">
  `);

  // Fetch data while browser is already rendering the shell
  const listings = await fetchListingsFromSearchService(req.query.q);

  // Stream each listing card as HTML
  for (const item of listings) {
    res.write(renderListingCard(item)); // sends each card immediately
  }

  // Close the HTML
  res.write(`
      </div>
      <script src="/hydrate.js" defer></script>
    </body>
    </html>
  `);

  res.end();
});

function renderListingCard(item) {
  return `
    <div class="listing-card" data-item-id="${item.id}">
      <img src="${item.imageUrl}" alt="${item.title}" loading="lazy">
      <h3>${item.title}</h3>
      <span class="price">$${item.price}</span>
      <span class="condition">${item.condition}</span>
    </div>
  `;
}
```

#### Advanced: Interleaving Multiple Async Data Sources

In real eBay listings, you need data from multiple services simultaneously:

```js
app.get('/listings', async (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.write(getHTMLShell()); // instant: nav, filters, skeleton

  // Kick off parallel data fetches
  const [listingsPromise, recommendationsPromise, adPromise] = [
    fetchListings(req.query.q),        // takes ~150ms
    fetchRecommendations(req.user),    // takes ~80ms
    fetchSponsoredAd(req.query.q),     // takes ~50ms
  ];

  // Send sponsored ad chunk as soon as it resolves (fastest)
  const ad = await adPromise;
  res.write(renderSponsoredAd(ad));    // browser renders ad at ~50ms

  // Send main listings when ready
  const listings = await listingsPromise;
  res.write(renderListings(listings)); // browser renders listings at ~150ms

  // Send recommendations last (slowest, below fold anyway)
  const recs = await recommendationsPromise;
  res.write(renderRecommendations(recs));

  res.end();
});
```

#### React 18 / Suspense Streaming Pattern (modern approach)

```js
import { renderToPipeableStream } from 'react-dom/server';

app.get('/listings', (req, res) => {
  const { pipe } = renderToPipeableStream(
    <App query={req.query.q} />,
    {
      bootstrapScripts: ['/hydrate.js'],
      onShellReady() {
        // Shell = everything outside <Suspense> boundaries
        // Sent immediately before data loads
        res.setHeader('Content-Type', 'text/html');
        pipe(res);
      },
      onError(error) {
        console.error(error);
      }
    }
  );
});

// In the React component:
function ListingsPage({ query }) {
  return (
    <>
      <Nav />                          {/* Renders immediately */}
      <SearchBar query={query} />     {/* Renders immediately */}
      <Suspense fallback={<Skeleton />}>
        <ListingsGrid query={query} /> {/* Streams when data ready */}
      </Suspense>
      <Suspense fallback={<AdSkeleton />}>
        <SponsoredAds query={query} /> {/* Streams independently */}
      </Suspense>
    </>
  );
}
```

### Out-of-Order Streaming (Marko's approach)

Marko can stream HTML out of order using placeholder + swap technique:

```html
<!-- Server sends placeholder immediately -->
<div id="listings-placeholder">
  <skeleton-loader count=48 />
</div>

<!-- Later, when data is ready, server sends the actual content
     plus a script to swap it in -->
<div id="listings-data" hidden>
  <!-- actual listing cards -->
</div>
<script>
  document.getElementById('listings-placeholder')
    .replaceWith(document.getElementById('listings-data'));
</script>
```

This allows the footer (which is simple HTML) to arrive and render before slow-loading data above it.

---

## Q3: What is partial hydration and why does eBay's Marko use it?

### The Hydration Problem

Standard SSR sends full HTML to the browser, but then the JS framework re-takes control by "hydrating" — attaching event listeners, restoring component state, and making the app interactive. The problem:

```
Standard Hydration (React 17 / Vue 2):
1. Server renders full page to HTML              ← fast
2. Browser downloads entire JS bundle (500KB+)  ← slow
3. Framework replays/renders ALL components     ← expensive
4. Event listeners attached to everything       ← wasted if user never scrolls to footer
```

On eBay's listing page with 48 product cards, a search bar, filters, pagination, nav, footer, etc. — hydrating everything eagerly is enormously wasteful.

### What Partial Hydration Is

**Partial hydration = only hydrate the components that actually need JavaScript interactivity**

```
Page with 100 components:
- Nav with dropdown menus            → HYDRATE (needs JS)
- Search bar with autocomplete       → HYDRATE (needs JS)
- 48 static listing card images      → SKIP (pure HTML, no interaction)
- "Add to watchlist" button per card → HYDRATE (needs JS)
- Static footer links                → SKIP (pure HTML)
- Breadcrumb navigation              → SKIP (pure HTML)

Result: hydrate 5 components instead of 100
        JS bundle shrinks from 500KB → 50KB
```

### Why Marko Uses It — eBay's Specific Architecture

Marko was built at eBay specifically because standard frameworks hydrated too much. Marko's compiler analyzes templates at **build time** and automatically determines which components need hydration:

```marko
<!-- This component has NO state or event handlers -->
<!-- Marko compiler: SKIP hydration, emit zero JS -->
<listing-image src=item.imageUrl alt=item.title />

<!-- This component has onClick → needs hydration -->
<!-- Marko compiler: include this component's JS in bundle -->
<watchlist-button itemId=item.id userId=user.id />

<!-- This component reads reactive state -->
<!-- Marko compiler: hydrate this one -->
<price-display price=item.price isAuction=item.isAuction />
```

Marko emits JS **only for interactive components**, automatically. No developer annotation required (unlike React's `"use client"` / `"use server"` directives).

### The Numbers at eBay Scale

```
Traditional SSR + full hydration:
  - JS bundle: 400-600KB (all component logic)
  - Time to Interactive (TTI): 3-5s on 4G
  - CPU parse time on mid-range phone: 2-4s

Marko partial hydration:
  - JS bundle: 20-80KB (only interactive components)
  - TTI: 0.5-1.5s on 4G
  - CPU parse time: 0.2-0.5s
```

For eBay, which serves pages to budget phones in Southeast Asia and Latin America, this difference directly impacts conversion rate.

### Islands Architecture (Modern Equivalent)

Marko's approach predates and inspired the "Islands Architecture" popularized by Astro:

```
[  Static HTML Ocean                              ]
[ ┌──────────┐  ┌─────────────┐  ┌────────────┐ ]
[ │  Island  │  │   Island    │  │   Island   │ ]
[ │ (Search) │  │(Watchlist   │  │  (Cart     │ ]
[ │ hydrated │  │  Button)    │  │  Widget)   │ ]
[ │  40KB JS │  │  hydrated   │  │  hydrated  │ ]
[ └──────────┘  └─────────────┘  └────────────┘ ]
[                                                 ]
[ 48 listing cards = pure HTML, zero JS           ]
```

Each "island" is independently hydrated, potentially lazily (only when visible in viewport).

### Lazy Hydration — Taking It Further

Marko and modern frameworks support hydrating islands only when needed:

```js
// Hydrate only when component enters viewport
<lazy-hydrate when="visible">
  <below-fold-recommendations />
</lazy-hydrate>

// Hydrate only on user interaction
<lazy-hydrate when="idle">
  <chat-widget />
</lazy-hydrate>

// Hydrate immediately (above fold, critical)
<watchlist-button />
```

---

## Q4: How does backpressure in Node.js streams apply to serving HTML chunks?

### What Backpressure Is

In Node.js streams, **backpressure** is the mechanism that prevents a fast producer (your server generating HTML) from overwhelming a slow consumer (the browser receiving data over the network or the OS TCP buffer).

Without backpressure:
```
Server generates 10MB of HTML in 10ms
Network can only send 100KB/s
→ Node.js buffers 9.9MB in memory
→ On thousands of concurrent connections: OUT OF MEMORY → crash
```

### How Node.js Streams Signal Backpressure

The key is `writable.write()` returning `false`:

```js
const isBufferFull = writableStream.write(chunk);
// returns true  → buffer has space, keep writing
// returns false → buffer is full, STOP writing, wait for 'drain' event
```

When the buffer is drained, the stream emits `'drain'`:

```js
writableStream.on('drain', () => {
  // Buffer has space again, resume writing
  resumeProduction();
});
```

### Backpressure in HTML Streaming (The Problem)

```js
// WRONG — ignores backpressure, can OOM under load
app.get('/listings', async (req, res) => {
  for (let i = 0; i < 10000; i++) {
    res.write(generateListingHTML(i)); // keeps writing even if buffer is full
  }
  res.end();
});
```

Under high concurrency, this will buffer gigabytes of HTML in memory and crash.

### Correct Implementation: Respecting Backpressure

#### Manual backpressure handling:

```js
app.get('/listings', async (req, res) => {
  const listings = await fetchAllListings();

  function writeWithBackpressure(index) {
    if (index >= listings.length) {
      res.end('</body></html>');
      return;
    }

    const html = renderListingCard(listings[index]);
    const canContinue = res.write(html);

    if (canContinue) {
      // Buffer has space — continue synchronously (use setImmediate to avoid stack overflow)
      setImmediate(() => writeWithBackpressure(index + 1));
    } else {
      // Buffer full — wait for drain before continuing
      res.once('drain', () => writeWithBackpressure(index + 1));
    }
  }

  res.write('<html><body>');
  writeWithBackpressure(0);
});
```

#### Using Node.js pipeline() — the idiomatic approach:

```js
const { pipeline, Readable, Transform } = require('stream');
const { promisify } = require('util');
const pipelineAsync = promisify(pipeline);

app.get('/listings', async (req, res) => {
  const listings = await fetchAllListings();

  // Create a Readable stream from the listings array
  const listingStream = Readable.from(listings);

  // Transform: converts listing objects to HTML strings
  const htmlTransform = new Transform({
    objectMode: true,
    transform(listing, encoding, callback) {
      callback(null, renderListingCard(listing));
    }
  });

  res.write('<html><body>');

  // pipeline() automatically handles backpressure between all streams
  await pipelineAsync(listingStream, htmlTransform, res);
  // No need to call res.end() — pipeline handles it
});
```

`pipeline()` is preferred because it:
1. Automatically propagates backpressure from `res` (slow consumer) back to `listingStream` (fast producer)
2. Properly cleans up all streams on error
3. Prevents memory accumulation

#### Practical eBay scenario — streaming from a database cursor:

```js
app.get('/seller-inventory/:sellerId', async (req, res) => {
  res.write('<html><body><div id="inventory">');

  // MongoDB / Postgres cursor — fetches data in batches, stream-friendly
  const cursor = db.collection('listings')
    .find({ sellerId: req.params.sellerId })
    .stream(); // returns a Node.js Readable stream

  const htmlTransform = new Transform({
    objectMode: true,
    transform(doc, _, cb) {
      cb(null, renderListingCard(doc));
    }
  });

  // pipeline respects backpressure end-to-end:
  // if res is slow (network) → htmlTransform pauses → cursor pauses
  // → database stops fetching rows → minimal memory usage
  await pipelineAsync(cursor, htmlTransform, res);

  // Note: pipeline calls res.end() automatically
});
```

### Backpressure in the Context of React renderToPipeableStream

```js
const { pipe, abort } = renderToPipeableStream(<App />, {
  onShellReady() {
    // pipe() internally uses Node.js streams pipeline semantics
    // React's streaming renderer respects res backpressure automatically
    // If the client is slow, React pauses rendering — no memory buildup
    res.statusCode = 200;
    pipe(res);
  },
  onError(err) {
    abort(); // abort render, clean up resources
  }
});

// Request timeout: abort render after 10s to free resources
setTimeout(abort, 10000);
```

### Memory Impact at eBay Scale

```
Without backpressure handling:
  1000 concurrent slow-network connections
  Each buffers 500KB HTML in Node.js memory
  = 500MB memory pressure → OOM crash

With backpressure:
  1000 concurrent connections
  Each buffers only what the OS TCP window allows (~64KB)
  = ~64MB memory pressure → sustainable
```

---

## Q5: How do you scale a Node.js BFF layer that serves millions of concurrent product page requests?

### What a BFF Is in eBay's Architecture

The **Backend for Frontend (BFF)** is a Node.js layer that:
- Receives browser requests for product pages
- Fans out to multiple microservices (inventory, pricing, reviews, shipping, recommendations)
- Aggregates and transforms the responses
- Renders HTML (via Marko/SSR) or returns JSON to the client

```
Browser
  ↓
[Node.js BFF]  ← the layer we're scaling
  ↓  ↓  ↓  ↓  ↓
[Inventory] [Pricing] [Reviews] [Shipping] [Recommendations]
(Java/Go microservices at eBay)
```

### Strategy 1: Horizontal Scaling + Load Balancing

Node.js is single-threaded — one process uses one CPU core. On a 32-core server, run 32 Node.js processes:

```js
// cluster.js — master/worker process model
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length; // e.g., 32
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, forking replacement`);
    cluster.fork(); // auto-restart crashed workers
  });
} else {
  // Each worker is a full Express server
  require('./server');
}
```

In Kubernetes (eBay's infra):
```yaml
# Deploy many pods, auto-scale based on CPU/RPS
spec:
  replicas: 50  # base
  autoscaling:
    minReplicas: 20
    maxReplicas: 500
    targetCPUUtilizationPercentage: 60
```

### Strategy 2: Efficient Async — Never Block the Event Loop

The BFF's job is I/O coordination. The cardinal rule: **never block the event loop**.

```js
// BAD — synchronous JSON.parse on large payload blocks event loop
app.get('/product/:id', async (req, res) => {
  const rawData = await fetchProductData(req.params.id);
  const parsed = JSON.parse(rawData); // blocks if rawData is 1MB
  res.json(parsed);
});

// GOOD — offload CPU work to worker threads
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

function parseInWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./parse-worker.js', { workerData: data });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

// parse-worker.js
parentPort.postMessage(JSON.parse(workerData));
```

For SSR rendering (CPU-intensive), use a worker thread pool:

```js
const { StaticPool } = require('node-worker-threads-pool');

// Pool of 8 worker threads dedicated to SSR rendering
const renderPool = new StaticPool({
  size: 8,
  task: './ssr-worker.js'
});

app.get('/product/:id', async (req, res) => {
  const data = await fetchAllProductData(req.params.id); // I/O: fast
  const html = await renderPool.exec(data);              // CPU: offloaded
  res.send(html);
});
```

### Strategy 3: Parallel Data Fetching — Minimize Latency

The biggest BFF performance win: fetch all downstream services in parallel.

```js
app.get('/product/:id', async (req, res) => {
  const { id } = req.params;

  // BAD — sequential: 100ms + 80ms + 60ms + 70ms = 310ms total
  const product    = await fetchProduct(id);
  const price      = await fetchPrice(id);
  const reviews    = await fetchReviews(id);
  const shipping   = await fetchShipping(id, req.user.location);

  // GOOD — parallel: max(100, 80, 60, 70) = 100ms total
  const [product, price, reviews, shipping] = await Promise.all([
    fetchProduct(id),
    fetchPrice(id),
    fetchReviews(id),
    fetchShipping(id, req.user.location),
  ]);

  // BETTER — critical path vs non-critical
  // Don't make user wait for recommendations
  const [criticalData] = await Promise.all([
    Promise.all([fetchProduct(id), fetchPrice(id)]),  // critical
    fetchReviews(id).then(r => storeForLater(r)),     // non-critical, don't await
  ]);

  res.write(renderCriticalHTML(criticalData));
  // Stream recommendations when ready, out-of-order
});
```

### Strategy 4: Multi-Layer Caching

```
Browser Cache (Cache-Control headers)
      ↓ miss
CDN Cache (Fastly/Akamai — eBay uses this)
      ↓ miss
Node.js In-Process Cache (node-cache / LRU)
      ↓ miss
Redis Shared Cache (across all BFF pods)
      ↓ miss
Downstream Microservices
```

```js
const LRU = require('lru-cache');
const redis = require('ioredis');

const localCache = new LRU({ max: 10000, ttl: 5000 }); // 5s local cache
const redisClient = redis.createClient({ host: 'redis-cluster' });

async function fetchProductWithCache(id) {
  // L1: in-process cache (0ms latency)
  if (localCache.has(id)) {
    return localCache.get(id);
  }

  // L2: Redis shared cache (~1ms latency)
  const cached = await redisClient.get(`product:${id}`);
  if (cached) {
    const data = JSON.parse(cached);
    localCache.set(id, data); // populate L1
    return data;
  }

  // L3: actual service call (~50-100ms)
  const data = await fetchProductFromService(id);

  // Populate both caches
  redisClient.setex(`product:${id}`, 30, JSON.stringify(data)); // 30s TTL
  localCache.set(id, data);

  return data;
}
```

### Strategy 5: Circuit Breakers — Fail Fast, Don't Cascade

When a downstream service is slow/down, don't let it bring down the BFF:

```js
const CircuitBreaker = require('opossum');

const reviewsBreaker = new CircuitBreaker(fetchReviews, {
  timeout: 2000,         // if fetchReviews takes >2s, it fails
  errorThresholdPercentage: 50, // open circuit if 50% of requests fail
  resetTimeout: 10000,   // try again after 10s
});

reviewsBreaker.fallback(() => ({ reviews: [], count: 0 })); // graceful degradation

app.get('/product/:id', async (req, res) => {
  const [product, price, reviews] = await Promise.all([
    fetchProduct(req.params.id),
    fetchPrice(req.params.id),
    reviewsBreaker.fire(req.params.id), // won't hang if reviews service is down
  ]);
  // Page still renders even if reviews are unavailable
  res.send(renderPage({ product, price, reviews }));
});
```

### Strategy 6: Connection Pooling to Downstream Services

Each Node.js process maintains HTTP connection pools:

```js
const http = require('http');
const https = require('https');

// Reuse TCP connections — critical at high RPS
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 100,        // max 100 concurrent connections to each service
  maxFreeSockets: 10,     // keep 10 idle connections warm
  timeout: 5000,
});

const reviewsClient = axios.create({
  baseURL: 'http://reviews-service',
  httpAgent,
  timeout: 2000,
});
```

Without `keepAlive`, every request creates a new TCP connection (3-way handshake = ~10-30ms overhead × millions of requests = massive latency).

### Strategy 7: Observability — Know Before You're Paged

```js
const prometheus = require('prom-client');

const httpDuration = new prometheus.Histogram({
  name: 'bff_request_duration_ms',
  help: 'BFF request duration',
  labelNames: ['route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000],
});

const downstreamErrors = new prometheus.Counter({
  name: 'downstream_errors_total',
  help: 'Errors from downstream services',
  labelNames: ['service'],
});

app.use((req, res, next) => {
  const end = httpDuration.startTimer({ route: req.path });
  res.on('finish', () => end({ status_code: res.statusCode }));
  next();
});
```

Key metrics to monitor at eBay scale:
- **P99 latency** per route (not just average — tail latency kills UX)
- **Event loop lag** (if > 100ms, something is blocking the event loop)
- **Heap memory** per pod (memory leaks are common in long-lived Node processes)
- **Circuit breaker state** per downstream service
- **Cache hit rate** per cache layer

### Summary: Scaling Checklist for eBay BFF

| Layer | Technique |
|---|---|
| CPU | Cluster (N workers = N cores) + worker threads for CPU tasks |
| I/O latency | Parallel `Promise.all()` for all downstream calls |
| Memory | Backpressure in streams, LRU caches with TTLs |
| Throughput | HTTP connection pooling with `keepAlive` |
| Resilience | Circuit breakers + graceful degradation fallbacks |
| Caching | Local LRU → Redis → downstream (multi-layer) |
| Deployment | Kubernetes HPA (auto-scale pods based on CPU/RPS) |
| Observability | Prometheus metrics, P99 latency tracking, event loop lag |
