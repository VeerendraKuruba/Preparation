# Sections 7-9 — Web Performance, CMS & A/B Testing

---

## Section 7 — Web Performance

### Q101. What are Core Web Vitals? Name the three metrics, their thresholds, and how to improve each.

Core Web Vitals are Google's standardized metrics for measuring real-world user experience. They directly influence Google Search rankings and are measured using field data (CrUX dataset) from real users.

**The three metrics:**

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | ≤ 2.5s | 2.5s – 4.0s | > 4.0s |
| INP (Interaction to Next Paint) | ≤ 200ms | 200ms – 500ms | > 500ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | 0.1 – 0.25 | > 0.25 |

**LCP improvements:**
- Preload the hero image with `<link rel="preload">`
- Serve images in modern formats (WebP, AVIF)
- Use a CDN to reduce TTFB
- Remove render-blocking resources above the fold
- Use SSR/SSG so the LCP element is in the initial HTML

**INP improvements:**
- Break up long tasks using `scheduler.yield()` or `setTimeout`
- Move heavy computation to web workers
- Debounce/throttle expensive event handlers
- Reduce JS parse/execution time (code splitting, lazy loading)
- Avoid forced synchronous layouts (layout thrashing)

**CLS improvements:**
- Always set explicit `width` and `height` on images and videos
- Reserve space for ads/embeds with min-height
- Avoid inserting content above existing content (banners, cookie notices)
- Use `font-display: optional` or preload fonts to prevent FOUT

**Measurement tools:**
- Chrome DevTools > Lighthouse / Performance panel
- `web-vitals` npm package for real-user monitoring
- Google Search Console > Core Web Vitals report
- PageSpeed Insights API

```js
// Measuring all Core Web Vitals with the web-vitals library
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP(metric => sendToAnalytics('LCP', metric.value));
onINP(metric => sendToAnalytics('INP', metric.value));
onCLS(metric => sendToAnalytics('CLS', metric.value));
```

---

### Q102. What is LCP? What are the most common causes of poor LCP and how do you fix them?

**LCP (Largest Contentful Paint)** measures how long it takes for the largest visible element in the viewport (image, video poster, or a block of text) to finish rendering from when the page navigation started. It is a user-centric metric for perceived load speed.

**Common causes of poor LCP:**

1. **Slow server response (high TTFB)**
   - Fix: Use SSG/ISR, add a CDN (Cloudflare, Fastly), optimize DB queries, enable HTTP/2

2. **Render-blocking resources**
   - Fix: Move CSS critical path inline, defer non-critical JS, remove unused CSS

3. **Slow resource load time (hero image not prioritized)**
   - Fix: `<link rel="preload" as="image" href="/hero.webp">`, use `fetchpriority="high"` on the `<img>` tag

4. **Client-side rendering (LCP element not in initial HTML)**
   - Fix: Use SSR or SSG so the LCP element is painted from the initial HTML response

5. **Unoptimized images (wrong format, no compression, no CDN)**
   - Fix: Serve WebP/AVIF, use `srcset` for responsive images, use an image CDN (Cloudinary, Imgix)

6. **No resource hints for third-party origins**
   - Fix: `<link rel="preconnect" href="https://cdn.example.com">`

```html
<!-- Correct approach for LCP image -->
<link rel="preload" as="image" href="/images/hero.webp" fetchpriority="high" />

<img
  src="/images/hero.webp"
  alt="Hero"
  width="1200"
  height="600"
  fetchpriority="high"
  loading="eager"
/>
```

**Next.js specific:**
```jsx
import Image from 'next/image';

// priority prop sets fetchpriority="high" and preloads the image
<Image
  src="/hero.webp"
  alt="Hero"
  width={1200}
  height={600}
  priority
/>
```

---

### Q103. What is INP (Interaction to Next Paint)? How does it differ from FID?

**INP (Interaction to Next Paint)** measures the latency of all user interactions (click, keypress, tap) throughout the entire page lifecycle — it reports the worst-case (or near-worst-case) interaction delay. It replaced FID as an official Core Web Vital in March 2024.

**FID (First Input Delay)** only measured the delay before the browser could begin processing the *first* interaction. It ignored event handler execution time and rendering time after the handler ran.

**Key differences:**

| | FID | INP |
|---|---|---|
| Scope | First interaction only | All interactions |
| What it measures | Input delay (queue wait) | Full interaction latency (delay + processing + rendering) |
| Status | Deprecated (March 2024) | Current Core Web Vital |
| Threshold (good) | ≤ 100ms | ≤ 200ms |

**Why INP is better:** A page can have a fast FID (the first click registers quickly) but terrible INP if subsequent interactions (e.g., opening a modal, filtering a list) are slow.

**Anatomy of an INP interaction:**

```
[ Input Delay ] + [ Processing Time ] + [ Presentation Delay ] = INP
     (queue)         (JS handlers)         (rendering/paint)
```

**Fixing poor INP:**

```js
// BAD: Long synchronous handler blocks the main thread
button.addEventListener('click', () => {
  const result = expensiveComputation(data); // 500ms
  updateUI(result);
});

// GOOD: Break up work, yield to browser
button.addEventListener('click', async () => {
  const result = await runInWorker(data); // off main thread
  updateUI(result);
});

// GOOD: Use scheduler.yield() to break up long tasks
async function processLargeList(items) {
  for (const item of items) {
    process(item);
    if (/* every 50 items */ true) {
      await scheduler.yield(); // yield to browser for input handling
    }
  }
}
```

---

### Q104. What is CLS? List 3 common causes and their fixes.

**CLS (Cumulative Layout Shift)** measures the total sum of all unexpected layout shift scores that occur during a page's lifetime. A layout shift happens when a visible element changes its position from one rendered frame to the next without user interaction.

**Score formula:** `layout shift score = impact fraction × distance fraction`

**Cause 1: Images and media without dimensions**

The browser cannot reserve space if it doesn't know the size, so when the image loads the content below jumps down.

```html
<!-- BAD -->
<img src="/photo.jpg" alt="Photo" />

<!-- GOOD: explicit dimensions or aspect-ratio -->
<img src="/photo.jpg" alt="Photo" width="800" height="600" />
```

```css
/* Or use aspect-ratio container */
.image-wrapper {
  aspect-ratio: 4 / 3;
  width: 100%;
}
```

**Cause 2: Dynamically injected content (ads, banners, cookie notices) above existing content**

When a banner appears at the top, everything below shifts down.

```css
/* FIX: Reserve space for the ad slot before it loads */
.ad-slot {
  min-height: 90px;  /* known banner height */
  width: 728px;
}
```

```js
// FIX: Append new content below the fold, not above
// Or use transform animations instead of layout-triggering changes
element.style.transform = 'translateY(-10px)'; // no layout shift
```

**Cause 3: Web fonts causing FOUT / FOIT**

When a fallback font swaps to the custom font, text reflows and shifts surrounding content.

```css
/* FIX: font-display: optional — won't swap if font not ready */
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: optional;
}
```

```html
<!-- FIX: Preload the font so it's ready before first render -->
<link rel="preload" href="/fonts/myfont.woff2" as="font" type="font/woff2" crossorigin />
```

**Bonus fix:** Use the `size-adjust` descriptor and `ascent-override`/`descent-override` in the fallback font to match metrics and eliminate the visual jump.

---

### Q105. Explain the Critical Rendering Path. What blocks it and how do you optimize it?

The **Critical Rendering Path (CRP)** is the sequence of steps the browser must complete before it can paint pixels to the screen:

```
1. Parse HTML → Build DOM
2. Parse CSS → Build CSSOM
3. Combine DOM + CSSOM → Render Tree
4. Layout (Reflow) — calculate geometry of each node
5. Paint — fill in pixels
6. Composite — layer management (GPU)
```

**What blocks the CRP:**

- **CSS is render-blocking by default.** The browser cannot build the Render Tree until the CSSOM is complete. All `<link rel="stylesheet">` files block rendering.
- **Synchronous `<script>` tags are parser-blocking.** When the parser encounters a `<script>`, it stops, downloads, and executes it before continuing to parse HTML.
- **Large HTML payloads** increase DOM construction time.

**Optimizations:**

```html
<!-- 1. Inline critical CSS (above-the-fold styles) -->
<style>
  /* critical styles for first viewport */
  header { ... }
  .hero { ... }
</style>

<!-- 2. Load non-critical CSS asynchronously -->
<link rel="preload" href="/styles/main.css" as="style" onload="this.rel='stylesheet'" />
<noscript><link rel="stylesheet" href="/styles/main.css" /></noscript>

<!-- 3. Defer non-critical JS -->
<script defer src="/bundle.js"></script>

<!-- 4. Async for independent scripts (analytics, etc.) -->
<script async src="/analytics.js"></script>

<!-- 5. Preload key resources the browser would discover late -->
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
```

**Reduce render-blocking CSS:**
- Use critical CSS extraction tools (Critters, penthouse)
- Split CSS into media-query-specific files: `<link rel="stylesheet" href="print.css" media="print">` — only blocking for matching media

**Minimize DOM size:** Keep it under ~1500 nodes. Avoid deeply nested structures.

---

### Q106. What is the difference between defer and async for script loading?

Both `defer` and `async` prevent a `<script>` tag from blocking HTML parsing while the script downloads. They differ in *when* execution happens.

| | `async` | `defer` |
|---|---|---|
| Download | Parallel with parsing | Parallel with parsing |
| Execution | As soon as downloaded (interrupts parsing) | After HTML fully parsed, before `DOMContentLoaded` |
| Order guaranteed | No — whichever downloads first runs first | Yes — scripts execute in document order |
| Use case | Independent scripts (analytics, ads) | Application scripts that need the DOM |

```html
<!-- async: downloads in parallel, executes immediately when ready -->
<!-- Order is NOT guaranteed -->
<script async src="/analytics.js"></script>
<script async src="/chatbot.js"></script>

<!-- defer: downloads in parallel, executes after HTML parsed -->
<!-- Order IS guaranteed: app.js runs before vendor.js would be wrong -->
<script defer src="/vendor.js"></script>
<script defer src="/app.js"></script>  <!-- runs after vendor.js -->
```

**Execution timeline:**

```
async:
HTML parsing: [=============|      |============]
Script fetch:               [======]
Script exec:                        [===] ← interrupts parsing

defer:
HTML parsing: [=================================]
Script fetch:  [=========]
Script exec:                                   [===] → after parsing
```

**Key rule:** Use `defer` for almost all application scripts. Use `async` only for truly independent scripts that don't rely on the DOM or other scripts (e.g., Google Analytics, ads).

Inline `<script>` blocks without `async`/`defer` — always parser-blocking. Avoid unless it's critical inline code.

---

### Q107. What is the difference between preload, prefetch, preconnect, and dns-prefetch?

All four are resource hints that tell the browser to do work early. They differ in urgency, scope, and purpose.

| Hint | Purpose | Priority | When to use |
|------|---------|----------|-------------|
| `preload` | Download a resource needed by *current* page | High | LCP image, critical font, script needed early |
| `prefetch` | Download a resource needed for *future* navigation | Idle/Low | Next page's JS bundle, likely-visited route |
| `preconnect` | Establish TCP + TLS + DNS to an origin | Medium | CDN, API server, font host you'll fetch from |
| `dns-prefetch` | Only resolve DNS for an origin | Very Low | Third-party origins you'll eventually connect to |

```html
<!-- preload: fetch this NOW for current page -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/images/hero.webp" as="image" fetchpriority="high" />
<link rel="preload" href="/api/critical-data" as="fetch" crossorigin />

<!-- prefetch: browser fetches this at idle time for future navigation -->
<link rel="prefetch" href="/checkout.js" as="script" />

<!-- preconnect: open the connection now (DNS + TCP + TLS) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://cdn.example.com" crossorigin />

<!-- dns-prefetch: lightweight — only resolve DNS -->
<link rel="dns-prefetch" href="https://third-party-analytics.com" />
```

**Gotchas:**
- `preload` without using the resource causes a browser warning — "resource was preloaded but not used"
- `preconnect` to more than 4-6 origins can hurt performance (wastes connections)
- For cross-origin fonts, always add `crossorigin` attribute to both `preload` and `preconnect`
- In Next.js, the `<Image priority>` prop automatically adds a preload link for you

---

### Q108. How do you reduce JavaScript bundle size? What tools do you use to analyze it?

**Analysis tools:**

```bash
# Next.js built-in bundle analyzer
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
module.exports = withBundleAnalyzer({});

# Run: ANALYZE=true npm run build
```

Other tools: `webpack-bundle-analyzer`, `source-map-explorer`, `bundlephobia.com` (check npm package cost), Vite's `rollup-plugin-visualizer`.

**Techniques to reduce bundle size:**

**1. Code splitting and lazy loading**
```js
// React lazy loading — splits the bundle at this boundary
const HeavyChart = React.lazy(() => import('./HeavyChart'));

function Dashboard() {
  return (
    <Suspense fallback={<Spinner />}>
      <HeavyChart />
    </Suspense>
  );
}
```

**2. Dynamic imports for non-critical features**
```js
// Only load when user clicks
button.addEventListener('click', async () => {
  const { openModal } = await import('./modal');
  openModal();
});
```

**3. Replace heavy libraries with lighter alternatives**
```bash
# moment.js (72KB) → date-fns (tree-shakeable) or dayjs (2KB)
# lodash (72KB) → lodash-es (tree-shakeable) or native JS
# axios → fetch API
```

**4. Import only what you need**
```js
// BAD: imports entire lodash
import _ from 'lodash';
_.debounce(fn, 300);

// GOOD: imports only debounce
import debounce from 'lodash/debounce';
// or with lodash-es (fully tree-shakeable)
import { debounce } from 'lodash-es';
```

**5. Next.js specific**
```js
// next.config.js — enable SWC minification (default in Next.js 13+)
module.exports = {
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@mui/icons-material'],
  },
};
```

**6. Remove polyfills for modern browsers**

Ensure `browserslist` in `package.json` targets only modern browsers to avoid shipping unnecessary polyfills.

**7. Avoid barrel files (re-export indexes) that prevent tree shaking**
```js
// BAD: index.js re-exports everything — tree shaking breaks
export { Button } from './Button';
export { Modal } from './Modal';

// GOOD: import directly from source
import { Button } from './components/Button/Button';
```

---

### Q109. What is tree shaking? What prevents it from working?

**Tree shaking** is the process by which bundlers (Webpack, Rollup, esbuild) statically analyze `import`/`export` statements to identify and eliminate unused (dead) code from the final bundle.

It works by building a graph of all imports and removing any exports that are never imported anywhere in the application.

**What prevents tree shaking:**

**1. CommonJS modules (`require`/`module.exports`)**
```js
// CommonJS — NOT tree-shakeable (dynamic, evaluated at runtime)
const utils = require('./utils');
utils.doSomething();

// ESM — tree-shakeable (static, analyzed at compile time)
import { doSomething } from './utils';
doSomething();
```

**2. Side effects in modules**
```js
// package.json — telling bundler "all files have side effects" (default)
// This prevents tree shaking
{ "sideEffects": true }

// Tell bundler which files have side effects
{
  "sideEffects": ["*.css", "*.scss", "./src/polyfills.js"]
}

// Mark package as side-effect free
{ "sideEffects": false }
```

**3. Dynamic imports at the top level aren't tree-shakeable**
```js
// BAD: dynamic require — bundler can't analyze statically
const fn = require(`./handlers/${type}`);
```

**4. Class methods are not always tree-shaken**
Classes are tricky — bundlers often keep entire classes even if only one method is used because methods can have side effects.

**5. Barrel files (index.ts) re-exporting everything**
```ts
// components/index.ts — often breaks tree shaking
export * from './Button';
export * from './Modal';
export * from './DataGrid'; // DataGrid may be pulled in even if unused
```

**Checking if tree shaking works:**
Use `webpack-bundle-analyzer` or the `--analyze` flag to visually confirm unused code is not in the bundle.

---

### Q110. How does image optimization work in Next.js? What formats should you use and why?

Next.js provides a built-in **Image Optimization API** via the `next/image` component and an on-demand image optimization server endpoint (`/_next/image`).

**What Next.js Image does automatically:**
- Serves images in modern formats (WebP, AVIF) based on browser `Accept` header
- Resizes images to the exact size needed (responsive)
- Lazy loads images by default (`loading="lazy"`)
- Prevents CLS by requiring `width`/`height` (or `fill` layout)
- Caches optimized images at the CDN or server level
- Adds `fetchpriority="high"` when `priority` prop is set

```jsx
import Image from 'next/image';

// Fixed size image
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority          // preload + fetchpriority=high (use for LCP image)
  quality={85}      // default is 75
/>

// Responsive fill (parent must have position: relative)
<div style={{ position: 'relative', height: '400px' }}>
  <Image
    src="/banner.jpg"
    alt="Banner"
    fill
    sizes="(max-width: 768px) 100vw, 50vw"
    style={{ objectFit: 'cover' }}
  />
</div>

// Remote images — must whitelist domain in next.config.js
```

```js
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        pathname: '/images/**',
      },
    ],
    formats: ['image/avif', 'image/webp'], // preferred order
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

**Image formats comparison:**

| Format | Compression | Transparency | Animation | Browser Support |
|--------|-------------|-------------|-----------|-----------------|
| JPEG | Lossy, good | No | No | Universal |
| PNG | Lossless | Yes | No | Universal |
| WebP | 25-34% smaller than JPEG | Yes | Yes | 95%+ |
| AVIF | 50% smaller than JPEG | Yes | Yes | ~90% (growing) |
| SVG | Vector (infinite scale) | Yes | Yes | Universal |

**Why AVIF and WebP:** Significantly smaller file sizes at equivalent visual quality means faster downloads, lower bandwidth costs, and better LCP scores. Next.js serves AVIF to browsers that support it and falls back to WebP, then the original format.

---

### Q111. What is a service worker? How does caching with a service worker work?

A **service worker** is a JavaScript file that runs in a separate thread (not the main thread) as a proxy between your web app and the network. It can intercept network requests, cache responses, and serve cached content — enabling offline functionality and improved performance.

**Key characteristics:**
- Runs in background, separate from the page
- No DOM access (communicates via `postMessage`)
- HTTPS only (except localhost)
- Lifecycle: install → activate → fetch (intercept)

**Service Worker Lifecycle:**

```js
// sw.js — Service Worker file

const CACHE_NAME = 'my-app-v1';
const STATIC_ASSETS = ['/index.html', '/styles.css', '/app.js', '/logo.png'];

// Install: pre-cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting(); // activate immediately
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: intercept network requests
self.addEventListener('fetch', event => {
  event.respondWith(
    // Cache-first strategy: serve from cache, fallback to network
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache new responses
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
```

**Common caching strategies:**

| Strategy | Description | Use case |
|----------|-------------|----------|
| Cache First | Serve from cache, fall back to network | Static assets |
| Network First | Try network, fall back to cache | API responses |
| Stale While Revalidate | Serve cache immediately, update in background | Frequent but non-critical updates |
| Cache Only | Only cache, error if not cached | Offline shell |
| Network Only | Always network | Real-time data |

**In Next.js:** Use `next-pwa` or Workbox to generate service workers automatically.

```js
// next.config.js with next-pwa
const withPWA = require('next-pwa')({
  dest: 'public',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.example\.com\/.*/,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache', expiration: { maxAgeSeconds: 60 } },
    },
  ],
});
```

---

### Q112. What is the difference between HTTP/1.1, HTTP/2, and HTTP/3 from a performance standpoint?

**HTTP/1.1** (1997)
- One request per TCP connection (blocking)
- Browsers open 6-8 parallel connections per domain to workaround this
- Head-of-line blocking: if one request stalls, subsequent ones wait
- Headers sent as plain text, repeated on every request
- **Workarounds needed:** Domain sharding, bundling, sprites, inlining

**HTTP/2** (2015)
- **Multiplexing:** Multiple requests and responses over a single TCP connection simultaneously
- **Header compression (HPACK):** Headers are compressed and shared state reduces repetition
- **Server Push:** Server can proactively send resources (rarely used in practice)
- **Binary protocol:** More efficient than text-based HTTP/1.1
- **Eliminates:** Need for domain sharding, image sprites (bundling still useful for fewer requests)
- **Still has:** TCP-level head-of-line blocking (one lost packet blocks all streams)

**HTTP/3** (2022)
- Built on **QUIC** (UDP-based), not TCP
- **Eliminates TCP head-of-line blocking:** Each stream is independent at transport layer
- **Faster connection setup:** 0-RTT or 1-RTT handshake vs 3-way TCP + TLS handshake
- **Connection migration:** Connection survives IP changes (switching WiFi to mobile)
- Better performance on high-latency / lossy networks (mobile)

**Performance impact summary:**

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---------|----------|--------|--------|
| Multiplexing | No (6 connections) | Yes (1 connection) | Yes |
| Head-of-line blocking | TCP + App level | TCP level | None |
| Header compression | No | HPACK | QPACK |
| Connection setup | TCP + TLS (2-3 RTTs) | TCP + TLS (2-3 RTTs) | QUIC (0-1 RTT) |
| Binary protocol | No | Yes | Yes |

**Practical impact on bundling:** With HTTP/2+, you can be less aggressive about bundling since multiplexing handles many small files efficiently. However, bundling still helps reduce request overhead.

---

### Q113. How do you implement infinite scroll vs pagination? What are the performance tradeoffs?

**Pagination Implementation:**
```jsx
function PaginatedList({ totalItems }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useFetch(`/api/items?page=${page}&limit=20`);

  return (
    <>
      {data?.items.map(item => <ItemCard key={item.id} item={item} />)}
      <div className="pagination">
        <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>Prev</button>
        <span>Page {page} of {Math.ceil(totalItems / 20)}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={!data?.hasMore}>Next</button>
      </div>
    </>
  );
}
```

**Infinite Scroll with Intersection Observer:**
```jsx
function InfiniteList() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(p => p + 1);
      }
    }, { rootMargin: '200px' }); // trigger 200px before sentinel is visible

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  useEffect(() => {
    fetch(`/api/items?page=${page}&limit=20`)
      .then(r => r.json())
      .then(data => {
        setItems(prev => [...prev, ...data.items]);
        setHasMore(data.hasMore);
      });
  }, [page]);

  return (
    <>
      {items.map(item => <ItemCard key={item.id} item={item} />)}
      {hasMore && <div ref={sentinelRef}>Loading...</div>}
    </>
  );
}
```

**Performance problem with infinite scroll — DOM bloat:**

As items accumulate, the DOM grows unboundedly, causing:
- Increasing memory usage
- Slower layouts and reflows
- Janky scrolling

**Solution: Virtual/windowed lists**
```jsx
import { FixedSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

// Only renders visible rows + a small overscan buffer
<InfiniteLoader isItemLoaded={isItemLoaded} itemCount={totalCount} loadMoreItems={loadMore}>
  {({ onItemsRendered, ref }) => (
    <FixedSizeList
      height={600}
      itemCount={totalCount}
      itemSize={80}
      onItemsRendered={onItemsRendered}
      ref={ref}
    >
      {({ index, style }) => (
        <div style={style}>
          <ItemCard item={items[index]} />
        </div>
      )}
    </FixedSizeList>
  )}
</InfiniteLoader>
```

**Tradeoffs:**

| | Pagination | Infinite Scroll |
|---|---|---|
| Shareability | URL contains page state | No URL state (hard to share position) |
| SEO | Better — crawlers follow pagination links | Harder — content may not be discovered |
| DOM size | Small and bounded | Grows unboundedly (need virtualizing) |
| Accessibility | Better — users can bookmark/return | Users lose scroll position on back navigation |
| UX | Explicit user control | Effortless browsing (good for social feeds) |
| Use case | Search results, e-commerce | Social feeds, news, media galleries |

---

### Q114. What is a web worker? When would you offload work to one?

A **web worker** runs JavaScript in a background thread separate from the main thread, enabling CPU-intensive work without blocking the UI or user interactions.

**Communication is via message passing (no shared memory by default):**

```js
// worker.js
self.addEventListener('message', event => {
  const { data } = event;
  const result = heavyComputation(data); // runs in background thread
  self.postMessage(result);
});

function heavyComputation(data) {
  // parse large CSV, sort/filter huge arrays, encrypt data, etc.
  return data.map(n => n * 2).filter(n => n > 100);
}
```

```js
// main.js
const worker = new Worker('/worker.js');

worker.postMessage(largeDataArray);

worker.addEventListener('message', event => {
  console.log('Result from worker:', event.data);
  updateUI(event.data);
});

worker.addEventListener('error', err => console.error(err));
```

**When to use web workers:**

- Parsing large files (CSV, JSON, XML)
- Image processing (canvas pixel manipulation, compression)
- Cryptography (hashing, encryption)
- Complex data transformations or sorting large datasets
- Running ML inference (TensorFlow.js)
- Real-time text processing (markdown parsing, syntax highlighting)

**In React with comlink (cleaner API):**
```js
// worker.js
import { expose } from 'comlink';

const api = {
  async processData(rows) {
    return rows.map(parseRow).filter(isValid);
  }
};
expose(api);

// main.js
import { wrap } from 'comlink';
const worker = new Worker('./worker.js', { type: 'module' });
const api = wrap(worker);

const result = await api.processData(rawRows); // feels like async function
```

**Limitations:**
- No DOM access
- Data is copied (structured clone) by default — use `SharedArrayBuffer` + `Atomics` for shared memory
- Large data transfer can be slow — use `Transferable` objects (ArrayBuffer) to transfer without copying

---

### Q115. How do you measure and monitor web performance in production?

**Lab vs Field data:**
- **Lab (synthetic):** Controlled environment (Lighthouse, WebPageTest) — great for debugging, not real users
- **Field (real user monitoring / RUM):** Actual user data — reflects real conditions

**Real User Monitoring (RUM) with web-vitals:**

```js
// src/utils/vitals.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

type MetricName = 'CLS' | 'INP' | 'LCP' | 'FCP' | 'TTFB';

function sendToAnalytics(metric: { name: MetricName; value: number; id: string }) {
  // Send to your analytics endpoint
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    }),
    keepalive: true, // survives page unload
  });

  // Or send to DataDog, New Relic, Sentry, etc.
  // datadog.trackCustomEvent('web_vital', { name: metric.name, value: metric.value });
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

**Next.js built-in reporting:**
```js
// pages/_app.js or app/layout.js
export function reportWebVitals(metric) {
  if (metric.label === 'web-vital') {
    console.log(metric); // { id, name, startTime, value, label }
  }
}
```

**Performance Observer API for custom metrics:**
```js
// Measure custom user timing
performance.mark('cart-open-start');
openCart();
performance.mark('cart-open-end');
performance.measure('cart-open', 'cart-open-start', 'cart-open-end');

const [measure] = performance.getEntriesByName('cart-open');
console.log(`Cart opened in ${measure.duration}ms`);
```

**Monitoring stack in production:**

| Tool | Type | Use case |
|------|------|----------|
| Google Search Console | Field (CrUX) | CWV monitoring for SEO |
| Lighthouse CI | Lab | PR-gated performance budgets |
| WebPageTest | Lab | Deep waterfall analysis |
| Sentry Performance | RUM | Transaction tracing + CWV |
| Datadog RUM | RUM | Production dashboards + alerting |
| New Relic Browser | RUM | Enterprise monitoring |
| Vercel Speed Insights | RUM | Next.js apps on Vercel |

**Performance budgets in CI:**
```json
// lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "interactive": ["warn", { "maxNumericValue": 3800 }]
      }
    }
  }
}
```

---

## Section 8 — CMS & Headless Architecture

### Q116. What is a headless CMS? How does it differ from a traditional coupled CMS?

**Traditional (coupled) CMS** (WordPress, Drupal, Joomla):
- CMS manages both content storage AND presentation layer
- Content is tightly coupled to a specific frontend (PHP templates, themes)
- Content is delivered as fully rendered HTML pages
- Frontend is constrained to the CMS's templating system

**Headless CMS** (Contentful, Sanity, Strapi, Prismic):
- CMS manages ONLY content (the "body") — no presentation layer (no "head")
- Content is exposed via APIs (REST or GraphQL)
- Any frontend (Next.js, mobile app, kiosk) can consume the same content
- Frontend team has full control over technology and architecture

```
Traditional CMS:
[Content Database] → [CMS + Templates] → [HTML Page]

Headless CMS:
[Content Database] → [CMS API (REST/GraphQL)]
                              ↓            ↓          ↓
                        [Next.js]    [iOS App]   [Digital Signage]
```

**Headless CMS advantages:**
- Freedom to use any frontend framework
- Better performance (no server-side rendering by the CMS)
- Omnichannel content delivery (web, mobile, voice, IoT)
- Developer experience (work with familiar tools)
- Content as structured data, not raw HTML

**Headless CMS disadvantages:**
- Higher initial complexity (need to build the frontend)
- Content editors lose WYSIWYG experience (unless CMS provides visual preview)
- Higher cost (especially managed SaaS headless CMSes)
- No built-in SEO plugins like WordPress has

**API-first vs Git-based headless CMS:**
- API-first: Contentful, Sanity — content stored in cloud, accessed via API
- Git-based: Netlify CMS, Tina CMS — content stored in Git repo as Markdown/JSON

---

### Q117. What are the tradeoffs between Contentful, Sanity, and Strapi?

**Contentful**
- Mature, enterprise-focused SaaS headless CMS
- Strong content modeling UI, good editorial experience
- Generous CDN caching, reliable infrastructure
- GraphQL and REST APIs
- Rich ecosystem of integrations
- **Tradeoffs:** Expensive at scale, less flexible for complex content models, rigid schema editing (can't delete fields easily), vendor lock-in

**Sanity**
- Highly flexible, developer-centric
- Real-time collaborative editing (like Google Docs)
- Portable Text (structured content format instead of raw HTML)
- GROQ query language (powerful, Sanity-specific)
- Open Studio (the editor is a customizable React app)
- Content Lake with generous free tier
- **Tradeoffs:** Steeper learning curve (GROQ), Sanity Studio customization requires React knowledge, overkill for simple sites

**Strapi**
- Open source, self-hosted (full control over data)
- Auto-generated REST and GraphQL APIs from content types
- No vendor lock-in, no per-seat pricing
- Plugin ecosystem
- **Tradeoffs:** Requires infrastructure management (hosting, backups, scaling), slower feature development than SaaS options, not as polished an editorial UX

**Quick comparison:**

| | Contentful | Sanity | Strapi |
|---|---|---|---|
| Hosting | SaaS (managed) | SaaS (managed) | Self-hosted |
| Pricing model | Per space/usage | Per dataset/seat | Free (open source) |
| Query language | GraphQL / REST | GROQ / GraphQL | REST / GraphQL |
| Real-time collab | No | Yes | No |
| Content preview | Via preview API | Via presentation tool | Manual setup |
| Best for | Enterprise, large teams | Flexible/complex models | Full data control, cost-conscious |

**My recommendation:** Sanity for a new project where content structure evolves, Contentful for large enterprise teams that need reliability and good editorial UX, Strapi when data sovereignty or cost is a priority.

---

### Q118. How do you build a CMS-driven page with Next.js where pages are defined by content editors?

The pattern is: content editors create "pages" in the CMS with a slug + an array of component/section definitions. The frontend fetches those definitions and renders the right component for each section.

**CMS content model (e.g., Contentful/Sanity):**
```
Page {
  slug: "about-us"
  title: "About Us"
  sections: [
    { _type: "HeroBanner", heading: "We build the future", cta: { text: "Learn more", href: "/work" } }
    { _type: "TextBlock", body: [...portable text...] }
    { _type: "TeamGrid", members: [...] }
  ]
}
```

**Next.js: Dynamic route with ISR**
```ts
// app/[slug]/page.tsx  (App Router)
import { ComponentRegistry } from '@/components/ComponentRegistry';
import { fetchPage } from '@/lib/cms';

export async function generateStaticParams() {
  const slugs = await fetchAllSlugs();
  return slugs.map(slug => ({ slug }));
}

export default async function DynamicPage({ params }: { params: { slug: string } }) {
  const page = await fetchPage(params.slug);

  if (!page) notFound();

  return (
    <main>
      {page.sections.map((section, i) => (
        <ComponentRegistry key={i} section={section} />
      ))}
    </main>
  );
}

export const revalidate = 60; // ISR: revalidate every 60 seconds
```

**Component Registry:**
```tsx
// components/ComponentRegistry.tsx
import HeroBanner from './HeroBanner';
import TextBlock from './TextBlock';
import TeamGrid from './TeamGrid';

const registry: Record<string, React.ComponentType<any>> = {
  HeroBanner,
  TextBlock,
  TeamGrid,
};

export function ComponentRegistry({ section }: { section: { _type: string; [key: string]: any } }) {
  const Component = registry[section._type];

  if (!Component) {
    console.warn(`No component registered for type: ${section._type}`);
    return process.env.NODE_ENV === 'development'
      ? <div style={{ border: '2px dashed red' }}>Unknown: {section._type}</div>
      : null;
  }

  return <Component {...section} />;
}
```

**CMS fetch with error handling:**
```ts
// lib/cms.ts
export async function fetchPage(slug: string) {
  const query = `*[_type == "page" && slug.current == $slug][0]{
    title,
    "sections": sections[]{
      _type,
      ...
    }
  }`;
  return sanityClient.fetch(query, { slug });
}
```

---

### Q119. How do you handle rich text/structured content from a CMS (not raw HTML)?

**Why not raw HTML:** Dangerously setting innerHTML is an XSS risk, prevents applying design system styles, and makes content non-portable across platforms.

**Contentful: `@contentful/rich-text-react-renderer`**
```tsx
import { documentToReactComponents } from '@contentful/rich-text-react-renderer';
import { BLOCKS, INLINES } from '@contentful/rich-text-types';

const renderOptions = {
  renderNode: {
    [BLOCKS.PARAGRAPH]: (node, children) => (
      <p className="prose-p">{children}</p>
    ),
    [BLOCKS.HEADING_2]: (node, children) => (
      <h2 className="text-2xl font-bold mt-8">{children}</h2>
    ),
    [BLOCKS.EMBEDDED_ASSET]: (node) => {
      const { file, title } = node.data.target.fields;
      return (
        <Image src={`https:${file.url}`} alt={title} width={800} height={400} />
      );
    },
    [INLINES.HYPERLINK]: (node, children) => (
      <a href={node.data.uri} className="text-blue-600 underline">{children}</a>
    ),
  },
};

export function RichText({ content }) {
  return (
    <div className="prose max-w-none">
      {documentToReactComponents(content, renderOptions)}
    </div>
  );
}
```

**Sanity: Portable Text with `@portabletext/react`**
```tsx
import { PortableText } from '@portabletext/react';
import Image from 'next/image';

const components = {
  types: {
    image: ({ value }) => (
      <Image
        src={urlFor(value).url()}
        alt={value.alt || ''}
        width={800}
        height={500}
        className="rounded-lg my-8"
      />
    ),
    callout: ({ value }) => (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-6">
        {value.text}
      </div>
    ),
  },
  marks: {
    highlight: ({ children }) => <mark className="bg-yellow-200">{children}</mark>,
    internalLink: ({ value, children }) => (
      <Link href={`/${value.slug.current}`}>{children}</Link>
    ),
  },
  block: {
    h2: ({ children }) => <h2 className="text-3xl font-bold mt-10">{children}</h2>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-400 pl-4 italic">{children}</blockquote>
    ),
  },
};

export function PortableTextRenderer({ value }) {
  return <PortableText value={value} components={components} />;
}
```

**Key principle:** Treat CMS content as **structured data** (an AST), not a string. Render it using your design system components, not raw HTML. This gives you: security, consistent styling, custom embeds, and platform portability.

---

### Q120. What is Draft Mode in Next.js and how do you use it for CMS content preview?

**Draft Mode** (called Preview Mode in Pages Router, renamed in App Router) allows Next.js to bypass static generation for specific requests, fetch unpublished/draft content, and render it live. It uses cookies to identify "preview" requests.

**Flow:**
1. CMS sends editor to `/api/draft?secret=TOKEN&slug=/about`
2. Route Handler validates the secret, enables Draft Mode cookie
3. Editor is redirected to the actual page (`/about`)
4. The page detects Draft Mode, fetches draft content from CMS

**App Router implementation:**

```ts
// app/api/draft/route.ts
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const slug = searchParams.get('slug');

  // Validate the secret token
  if (secret !== process.env.PREVIEW_SECRET_TOKEN) {
    return new Response('Invalid token', { status: 401 });
  }

  // Enable draft mode — sets a cookie
  draftMode().enable();

  // Redirect to the requested page
  redirect(slug || '/');
}

// app/api/disable-draft/route.ts
export async function GET() {
  draftMode().disable();
  redirect('/');
}
```

```tsx
// app/[slug]/page.tsx
import { draftMode } from 'next/headers';
import { fetchPage, fetchDraftPage } from '@/lib/cms';

export default async function Page({ params }) {
  const { isEnabled } = draftMode();

  // Fetch draft or published content based on draft mode
  const page = isEnabled
    ? await fetchDraftPage(params.slug)   // includes unpublished content
    : await fetchPage(params.slug);       // published only

  return (
    <>
      {isEnabled && (
        <div className="fixed top-0 bg-yellow-400 text-black px-4 py-2 z-50">
          Draft Mode — <a href="/api/disable-draft">Exit</a>
        </div>
      )}
      <PageContent page={page} />
    </>
  );
}
```

```ts
// lib/cms.ts
export async function fetchDraftPage(slug: string) {
  // Sanity: use a token with read access to drafts
  const client = sanityClient.withConfig({
    token: process.env.SANITY_API_READ_TOKEN,
    perspective: 'previewDrafts', // Sanity v3+ — returns draft documents
  });
  return client.fetch(pageQuery, { slug });
}
```

---

### Q121. How do you handle ISR with CMS webhooks for instant content updates?

**The problem:** ISR with a `revalidate` interval means content updates in the CMS might not appear on the site for minutes or hours. For time-sensitive content, this is unacceptable.

**Solution: On-demand revalidation via webhooks**

When content is published in the CMS, the CMS sends a webhook to your Next.js API. You call `revalidatePath` or `revalidateTag` to immediately invalidate and regenerate the affected page.

**Next.js App Router — On-demand revalidation:**

```ts
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  // Validate the webhook secret to prevent unauthorized cache busting
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();

  try {
    // Option 1: Revalidate a specific path
    const slug = payload.slug || payload.fields?.slug?.['en-US'];
    if (slug) {
      revalidatePath(`/${slug}`);
      revalidatePath('/'); // also revalidate home if it shows latest posts
    }

    // Option 2: Revalidate by tag (more flexible)
    const contentType = payload._type || payload.sys?.contentType?.sys?.id;
    revalidateTag(contentType);        // e.g., "post", "page"
    revalidateTag(`page-${slug}`);    // specific page tag

    return Response.json({ revalidated: true, slug });
  } catch (err) {
    return Response.json({ error: 'Revalidation failed' }, { status: 500 });
  }
}
```

**Tag-based caching in fetch calls:**
```ts
// lib/cms.ts
export async function fetchPage(slug: string) {
  const res = await fetch(`https://cdn.sanity.io/...?query=${encodeURIComponent(query)}`, {
    next: {
      tags: ['page', `page-${slug}`], // associate response with these tags
    },
  });
  return res.json();
}
```

**CMS webhook configuration (Contentful example):**
```
URL: https://your-site.com/api/revalidate
Method: POST
Headers:
  Content-Type: application/json
  X-Webhook-Secret: <your-secret>
Triggers: Entry.publish, Entry.unpublish
```

**Full flow:**
```
Editor publishes page in Contentful
→ Contentful sends POST to /api/revalidate
→ Next.js calls revalidateTag('page-about-us')
→ Next background-regenerates /about-us with fresh data
→ Next visitor sees updated content immediately
```

---

### Q122. How do you design a component registry for CMS-driven dynamic sections?

A component registry is a mapping from CMS content type names to React components, enabling dynamic rendering without hard-coded conditionals.

**Basic registry pattern:**
```tsx
// components/registry/index.ts
import { lazy, Suspense, ComponentType } from 'react';

// Static imports for above-the-fold sections
import HeroBanner from './HeroBanner';
import NavigationBar from './NavigationBar';

// Lazy imports for below-the-fold sections (code split)
const TextBlock = lazy(() => import('./TextBlock'));
const ImageGallery = lazy(() => import('./ImageGallery'));
const PricingTable = lazy(() => import('./PricingTable'));
const VideoEmbed = lazy(() => import('./VideoEmbed'));
const TestimonialCarousel = lazy(() => import('./TestimonialCarousel'));

type SectionType = {
  _type: string;
  _key: string;
  [key: string]: any;
};

const registry: Record<string, ComponentType<any>> = {
  // CMS type name → React component
  heroBanner: HeroBanner,
  navigationBar: NavigationBar,
  textBlock: TextBlock,
  imageGallery: ImageGallery,
  pricingTable: PricingTable,
  videoEmbed: VideoEmbed,
  testimonialCarousel: TestimonialCarousel,
};

export function DynamicSection({ section }: { section: SectionType }) {
  const Component = registry[section._type];

  if (!Component) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div style={{ border: '2px dashed red', padding: '1rem', margin: '1rem 0' }}>
          <strong>Unregistered component type:</strong> {section._type}
          <pre>{JSON.stringify(section, null, 2)}</pre>
        </div>
      );
    }
    return null; // graceful degradation in production
  }

  return (
    <Suspense fallback={<SectionSkeleton />}>
      <Component {...section} />
    </Suspense>
  );
}

export function PageSections({ sections }: { sections: SectionType[] }) {
  return (
    <>
      {sections.map((section) => (
        <DynamicSection key={section._key} section={section} />
      ))}
    </>
  );
}
```

**Type-safe registry with Zod validation:**
```ts
import { z } from 'zod';

const HeroBannerSchema = z.object({
  _type: z.literal('heroBanner'),
  heading: z.string(),
  subheading: z.string().optional(),
  cta: z.object({ text: z.string(), href: z.string() }).optional(),
});

// Validate CMS data before rendering
function DynamicSection({ section }) {
  const schema = sectionSchemas[section._type];
  if (schema) {
    const result = schema.safeParse(section);
    if (!result.success) {
      console.error('Invalid section data:', result.error);
      return null;
    }
  }
  // ...render
}
```

**Advanced: variant support**
```ts
// Support variants like "heroBanner--centered", "heroBanner--split"
const registry = {
  heroBanner: HeroBanner,
  'heroBanner--centered': HeroBannerCentered,
  'heroBanner--split': HeroBannerSplit,
};

function getComponent(section) {
  const variantKey = `${section._type}--${section.variant}`;
  return registry[variantKey] || registry[section._type];
}
```

---

### Q123. What are the challenges of personalization with a headless CMS?

Personalization means showing different content to different users based on attributes (location, device, user segment, behavior, authentication state). With a headless CMS, this adds significant complexity.

**Challenge 1: Static content doesn't support dynamic personalization**

ISR/SSG generates one version of a page. Personalized content requires dynamic decisions per user.

**Solutions:**
- **Edge-side personalization:** Use edge middleware (Next.js Middleware, Cloudflare Workers) to rewrite/redirect based on user attributes *before* the page loads. Serve different static variants.

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const country = request.geo?.country || 'US';
  const segment = request.cookies.get('user_segment')?.value || 'anonymous';

  // Rewrite to country/segment-specific page variant
  const url = request.nextUrl.clone();
  url.pathname = `/${country.toLowerCase()}${url.pathname}`;

  return NextResponse.rewrite(url);
}
```

- **Client-side personalization:** Load the base page statically, then fetch personalized content via API on the client (accepted CLS/layout shift risk)
- **Partial personalization:** Only personalize specific sections (a banner, a CTA) while keeping the rest static

**Challenge 2: Cache fragmentation**

Personalizing content breaks CDN caching effectiveness — you can't cache one version for all users.

**Solution:** Cache the static "shell" and fetch personalized content via a fast API with short cache TTLs. Use `Vary` headers sparingly.

**Challenge 3: Preview and testing**

How does a content editor preview personalized content for different segments?

**Solution:** CMS preview tools (Sanity Presentation, Contentful Preview) need to simulate user segments.

**Challenge 4: Content authoring complexity**

Content editors need to create and manage multiple content variants without a confusing interface.

**Solution:** Use CMS audience/targeting features (Contentful Experiences, Ninetailed, Uniform) that layer personalization on top of base content.

**Challenge 5: Analytics attribution**

Tracking which personalized variant the user saw and attributing conversions correctly.

**Solution:** Log the variant served with every analytics event, integrate with A/B testing tools.

**Architecture pattern for personalization:**
```
1. User requests /product/widget
2. Edge middleware reads segment cookie → rewrites to /product/widget?segment=power-user
3. Page Server Component fetches base content (cached) + segment-specific overrides (short TTL)
4. Merge and render
5. Track which variant was shown
```

---

## Section 9 — Experimentation & A/B Testing

### Q124. What is A/B testing? Walk through how you'd implement it end to end.

**A/B testing** is a controlled experiment where users are randomly split into groups (control = A, variant = B) and exposed to different versions of a feature. Statistical analysis then determines which version performs better on a defined metric (conversion rate, click-through rate, revenue).

**End-to-end implementation:**

**Step 1: Define the hypothesis and metrics**
```
Hypothesis: Changing the CTA button from "Sign Up" to "Start Free Trial" 
            will increase sign-up conversion rate.
Primary metric: Sign-up conversion rate
Guardrail metrics: Page load time, bounce rate (shouldn't degrade)
Minimum detectable effect: 5% relative lift
Required sample size: ~10,000 users per variant (calculated via power analysis)
```

**Step 2: User assignment (consistent bucketing)**
```ts
// utils/experiment.ts
import { createHash } from 'crypto';

function getExperimentVariant(userId: string, experimentId: string): 'control' | 'variant' {
  // Deterministic: same user always gets same variant
  const hash = createHash('md5').update(`${userId}:${experimentId}`).digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100; // 0-99
  return bucket < 50 ? 'control' : 'variant';
}
```

**Step 3: Implement the experiment**
```tsx
// components/SignUpButton.tsx
import { useExperiment } from '@/hooks/useExperiment';

export function SignUpButton() {
  const { variant, isLoaded } = useExperiment('cta-copy-test');

  if (!isLoaded) return <button>Sign Up</button>; // fallback

  const label = variant === 'variant' ? 'Start Free Trial' : 'Sign Up';

  return (
    <button
      onClick={() => {
        // Track the conversion event
        trackEvent('cta_clicked', { variant, experiment: 'cta-copy-test' });
        router.push('/signup');
      }}
    >
      {label}
    </button>
  );
}
```

**Step 4: Track exposure and conversions**
```ts
// Track when user is exposed to the experiment (not just when they convert)
function useExperiment(experimentId: string) {
  const variant = getVariant(experimentId); // from SDK or cookie

  useEffect(() => {
    // Log exposure immediately — critical for correct analysis
    trackEvent('experiment_exposed', {
      experiment: experimentId,
      variant,
      userId: currentUser.id,
      timestamp: Date.now(),
    });
  }, [experimentId, variant]);

  return { variant };
}
```

**Step 5: Analyze results**

After reaching statistical significance, compare conversion rates between control and variant using a chi-squared test or z-test for proportions.

**Step 6: Ship or kill**
- If statistically significant positive lift → ship variant to 100%
- If negative → kill, revert to control
- If inconclusive → extend test duration or abandon

**Step 7: Clean up**
- Remove experiment code
- Remove feature flag
- Document findings in experiment log

---

### Q125. What is a feature flag? What problems does it solve beyond A/B testing?

A **feature flag** (also called feature toggle or feature switch) is a mechanism to enable or disable functionality without deploying new code — using configuration instead of code changes.

**Beyond A/B testing, feature flags solve:**

**1. Continuous deployment / Trunk-based development**
Merge incomplete features to main behind a flag — CI/CD runs, feature is invisible to users. No long-lived feature branches.

```ts
if (featureFlags.isEnabled('new-checkout-flow', user)) {
  return <NewCheckoutFlow />;
}
return <LegacyCheckoutFlow />;
```

**2. Kill switches / Circuit breakers**
Instantly disable a failing feature in production without a deployment.
```ts
// If new recommendation engine is down, fall back to legacy
const engine = featureFlags.isEnabled('ai-recommendations')
  ? AIRecommendationEngine
  : LegacyRecommendationEngine;
```

**3. Canary / Gradual rollouts**
Release to 1% → 5% → 25% → 100% of users, monitoring metrics at each step.

**4. Beta programs / Early access**
Enable features for specific user groups (beta users, internal team, enterprise tier).
```ts
featureFlags.isEnabled('advanced-analytics', {
  userId: user.id,
  attributes: { plan: user.plan, beta: user.isBeta }
});
```

**5. Operational flags (ops toggles)**
Control system behavior: maintenance mode, cache bypass, debug logging.

**6. Permission-based features**
Gate features by subscription tier without code changes.

**7. Dark launches**
Run new code in production alongside old code, compare results in logs — without showing anything to users.

**Feature flag types (by lifecycle):**

| Type | Lifespan | Example |
|------|----------|---------|
| Release toggle | Short (days/weeks) | New feature rollout |
| Experiment toggle | Short (weeks) | A/B test |
| Ops toggle | Short/Medium | Kill switch |
| Permission toggle | Long | Premium feature gate |
| Infrastructure toggle | Medium | DB migration |

---

### Q126. How do you prevent the "flash of original content" (FOOC) in client-side A/B tests?

FOOC (also called "flash of original content") occurs when the page renders with the control version, then JavaScript loads, determines the user is in a variant, and swaps the content — causing a visible flicker.

**Why it happens:**
1. HTML arrives from server with default (control) content
2. Page paints → user briefly sees control content
3. JS bundle loads and executes → variant content is rendered
4. Visible content swap (flash)

**Solutions:**

**1. Server-side variant assignment (best solution)**
```ts
// middleware.ts — assign variant at the edge before page renders
export function middleware(request: NextRequest) {
  let variant = request.cookies.get('experiment_variant')?.value;

  if (!variant) {
    variant = Math.random() < 0.5 ? 'control' : 'variant';
  }

  const response = NextResponse.next();
  response.cookies.set('experiment_variant', variant, { maxAge: 30 * 24 * 60 * 60 });

  // Pass to page via header
  response.headers.set('x-experiment-variant', variant);
  return response;
}
```

```tsx
// Page Server Component reads the cookie — no flash
import { cookies } from 'next/headers';

export default function Page() {
  const variant = cookies().get('experiment_variant')?.value || 'control';
  return variant === 'variant' ? <VariantCTA /> : <ControlCTA />;
}
```

**2. Anti-flicker snippet (client-side fallback)**

A synchronous blocking script that hides the page until the variant is determined, then reveals it.

```html
<head>
  <!-- Anti-flicker snippet: must be synchronous and inline -->
  <script>
    (function() {
      var variant = document.cookie.match(/experiment_variant=([^;]+)/)?.[1];
      if (!variant) {
        // Hide page body until variant is known
        document.documentElement.style.visibility = 'hidden';
        // Reveal after 300ms max to avoid blank page
        setTimeout(function() {
          document.documentElement.style.visibility = '';
        }, 300);
      }
    })();
  </script>
</head>
```

This is the approach used by Optimizely's synchronous snippet — it blocks rendering briefly but eliminates flicker.

**3. Render placeholder / skeleton**
```tsx
// Show skeleton until variant is resolved
function ExperimentCTA() {
  const { variant, isLoaded } = useExperiment('cta-test');

  if (!isLoaded) return <div className="skeleton h-12 w-32 rounded" />;

  return variant === 'variant' ? <VariantCTA /> : <ControlCTA />;
}
```

**4. CSS-based hiding (Optimizely/VWO approach)**
```css
/* Anti-flicker CSS: hide specific elements until experiment applies */
.hero-cta { opacity: 0 !important; }
```
JS then removes this class after applying the variant.

**Best practice:** Use server-side (edge) assignment whenever possible — it completely eliminates FOOC and doesn't require hacks.

---

### Q127. How do you implement A/B testing at the CDN/edge layer?

Edge A/B testing runs variant assignment logic at the CDN (e.g., Cloudflare Workers, Vercel Edge Middleware, AWS Lambda@Edge) — before the request even reaches your origin server. This provides:
- Zero FOOC (variant is decided before HTML is generated)
- No performance penalty from JS loading
- Works with fully static sites

**Vercel Edge Middleware:**
```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const EXPERIMENT_COOKIE = 'exp_homepage_hero';
const VARIANTS = ['control', 'variant-a', 'variant-b'] as const;

function assignVariant(): typeof VARIANTS[number] {
  const rand = Math.random();
  if (rand < 0.34) return 'control';
  if (rand < 0.67) return 'variant-a';
  return 'variant-b';
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Only run experiment on homepage
  if (url.pathname !== '/') return NextResponse.next();

  const response = NextResponse.next();

  // Read existing assignment or create new one
  let variant = request.cookies.get(EXPERIMENT_COOKIE)?.value as typeof VARIANTS[number];

  if (!variant || !VARIANTS.includes(variant)) {
    variant = assignVariant();
    // Persist for 30 days
    response.cookies.set(EXPERIMENT_COOKIE, variant, {
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  // Pass variant to the page via header
  response.headers.set('x-experiment-variant', variant);

  return response;
}

export const config = {
  matcher: ['/', '/landing/:path*'],
};
```

**Page reads the variant from header/cookie (Server Component):**
```tsx
// app/page.tsx
import { headers, cookies } from 'next/headers';

export default function HomePage() {
  // Read from header set by middleware
  const variant = headers().get('x-experiment-variant') || 'control';

  return (
    <main>
      {variant === 'variant-a' && <HeroVariantA />}
      {variant === 'variant-b' && <HeroVariantB />}
      {variant === 'control' && <HeroControl />}
    </main>
  );
}
```

**Cloudflare Workers approach:**
```js
// worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const cookie = getCookie(request, 'ab_variant');
  const variant = cookie || (Math.random() < 0.5 ? 'a' : 'b');

  // Fetch variant-specific page
  const url = new URL(request.url);
  url.pathname = variant === 'b' ? '/variant-b' + url.pathname : url.pathname;

  const response = await fetch(url.toString());
  const newResponse = new Response(response.body, response);

  // Set cookie for consistency
  if (!cookie) {
    newResponse.headers.append('Set-Cookie', `ab_variant=${variant}; Max-Age=2592000`);
  }

  return newResponse;
}
```

**Key advantages of edge A/B testing:**
- Variant is decided before the origin generates the page
- No client-side JS needed for assignment
- Can serve different static HTML files per variant
- No FOOC possible

---

### Q128. How do you track experiment exposure correctly? What mistakes cause bad data?

**Correct exposure tracking:**

Log an exposure event *at the moment the user is shown the variant*, not when they convert or when the page loads (if the experiment element might be below the fold).

```ts
// Exposure tracking hook
function useExperiment(experimentId: string) {
  const variant = getVariant(experimentId);
  const exposureTracked = useRef(false);

  // Track exposure when variant is first determined
  useEffect(() => {
    if (!exposureTracked.current && variant) {
      trackEvent('experiment_exposure', {
        experimentId,
        variant,
        userId: user.id,
        sessionId: session.id,
        timestamp: Date.now(),
        page: window.location.pathname,
      });
      exposureTracked.current = true;
    }
  }, [variant, experimentId]);

  return { variant };
}
```

**Common mistakes that cause bad data:**

**1. Tracking conversion without exposure**
If a user converts but was never tracked as exposed (e.g., came from a cached page), they inflate or deflate conversion rates for a variant they never saw.

**2. Logging exposure multiple times per session**
Each page load triggers an exposure event → inflated "exposed" count → diluted conversion rate.
Fix: Use `sessionStorage` or a `useRef` flag to track once per session.

**3. Novelty effect — running tests too short**
Users react differently to new things. A variant might show a temporary lift because it's new. Run tests long enough (minimum 1-2 business cycles) to account for day-of-week and user novelty effects.

**4. Simpson's Paradox / Segmentation bias**
An experiment shows positive lift overall but negative lift in every user segment — happens when variant is disproportionately shown to high-converting segments.
Fix: Always analyze by segment, not just overall.

**5. Interaction effects (no mutex groups)**
Two simultaneous experiments on the same page interact with each other, contaminating results.
Fix: Use mutex groups (see Q130).

**6. Peeking at results and stopping early**
If you stop the experiment as soon as you see statistical significance, you dramatically increase false positive rates (the "peeking problem").
Fix: Pre-register the experiment duration, use sequential testing methods, or set minimum sample sizes.

**7. Survivor bias — only tracking completers**
Tracking conversions only for users who complete a funnel, not all who were exposed.
Fix: Use exposure as the denominator, not "engaged users".

**8. Bot / crawler traffic in experiments**
Bots inflate exposed counts without converting.
Fix: Filter by user-agent, require JS execution, use authenticated user IDs.

---

### Q129. What is statistical significance in A/B testing? What is p-value?

**Statistical significance** tells you whether the observed difference between control and variant is likely due to the treatment (real effect) or just random chance (sampling variation).

**P-value:**

The p-value is the probability of observing results as extreme as (or more extreme than) what you measured, *assuming the null hypothesis is true* (i.e., assuming there is no real difference between variants).

- Low p-value (e.g., p = 0.02) → unlikely to see this result by chance → reject null hypothesis → result is statistically significant
- High p-value (e.g., p = 0.4) → this result is plausible by chance → cannot reject null hypothesis

**Common threshold:** p < 0.05 (5% significance level) — you accept a 5% chance of a false positive.

**Example:**
```
Control: 1,000 users, 50 sign-ups (5% conversion rate)
Variant: 1,000 users, 65 sign-ups (6.5% conversion rate)

Observed lift: +30% relative

Z-test calculation:
p1 = 0.05, p2 = 0.065
p_pooled = (50 + 65) / (1000 + 1000) = 0.0575
z = (p2 - p1) / sqrt(p_pooled * (1 - p_pooled) * (1/n1 + 1/n2))
z ≈ 2.1 → p-value ≈ 0.036

Since p < 0.05, the result is statistically significant at 95% confidence.
```

**Confidence interval:**

More useful than p-value alone. Report results as: "Variant B increased conversion by **+30%** (95% CI: +4% to +60%, p=0.036)".

**Common misconceptions:**
- p < 0.05 does NOT mean "95% chance the variant is better"
- Statistical significance ≠ practical significance (a 0.01% lift might be significant but worthless)
- p-value is NOT the probability that the null hypothesis is true

**Power analysis (before running):**
```
Required sample size depends on:
- Baseline conversion rate (e.g., 5%)
- Minimum detectable effect (e.g., 20% relative lift → 1% absolute)
- Statistical power (80% = probability of detecting a real effect)
- Significance level (5%)
→ ~3,900 users per variant
```

---

### Q130. What are mutex experiment groups and why are they needed?

**Mutex experiment groups** (mutually exclusive groups) ensure that a user can only be in one experiment from a defined group at a time. Experiments in the same mutex group cannot overlap — if a user is assigned to Experiment A, they cannot also be in Experiment B.

**Why they're needed:**

When two experiments modify the same part of the user experience simultaneously, their effects **interact** with each other, making it impossible to attribute a result to either experiment independently.

**Example of the problem:**
```
Experiment 1: Test CTA button copy ("Sign Up" vs "Start Free Trial")
Experiment 2: Test CTA button color (blue vs green)

Without mutex:
- User A: sees "Start Free Trial" + green button
- User B: sees "Sign Up" + blue button
- User C: sees "Start Free Trial" + blue button
- User D: sees "Sign Up" + green button

You can't determine: Is the lift from the copy, the color, or their interaction?
```

**Solution: Mutex groups**
```ts
// User is hashed into a bucket (0-99)
// Mutex group splits the bucket space between experiments

const MUTEX_GROUP = 'homepage-cta';

// Experiment 1 owns buckets 0-49
// Experiment 2 owns buckets 50-99

function assignMutexExperiment(userId: string, mutexGroup: string) {
  const bucket = hashToBucket(userId, mutexGroup); // 0-99

  if (bucket < 50) {
    // User is in Experiment 1's pool
    return { experiment: 'cta-copy-test', variant: bucket < 25 ? 'control' : 'variant' };
  } else {
    // User is in Experiment 2's pool (bucket 50-99)
    return { experiment: 'cta-color-test', variant: bucket < 75 ? 'control' : 'variant' };
  }
}
```

**LaunchDarkly / GrowthBook approach:**
Most experimentation platforms have a built-in concept of mutex layers/namespaces. Experiments within the same layer are mutually exclusive.

**When NOT to use mutex:**
If two experiments affect completely independent parts of the UI (e.g., one tests the header, one tests the checkout form), they don't need to be mutually exclusive — they can run in parallel without interaction.

**Cost of mutex groups:**
They reduce the available traffic for each experiment (slower to reach significance). Only use them when experiments genuinely interact.

---

### Q131. What is a holdout group in experimentation?

A **holdout group** is a set of users who are intentionally excluded from all (or a specific set of) experiments for an extended period — sometimes permanently. They continue to see the original, baseline experience.

**Purpose:**

1. **Measure cumulative impact of experimentation:** By comparing holdout users against the rest of the population over time, you can quantify the total lift delivered by all shipped features.

2. **Detect long-term effects:** Some experiments show short-term gains that fade (or reverse) over time. The holdout group lets you measure long-term user behavior differences.

3. **Canary for bugs:** Holdout users can serve as a reference group to detect regressions caused by shipped features.

**Example:**

```
Total users: 100,000
Holdout group: 5,000 users (5%) — always see old experience
Active users: 95,000 — eligible for all experiments

After 6 months of shipping features:
- Holdout group: 12% monthly active users, $42 ARPU
- Active group: 14% monthly active users, $47 ARPU

Cumulative impact of 6 months of experiments:
+16.7% MAU, +11.9% ARPU
```

**Holdout group vs control group:**
- Control group: temporary, per-experiment, sees the old version of *one specific feature*
- Holdout group: long-lived, global, excluded from *all* experiments

**Implementation:**
```ts
function isUserInGlobalHoldout(userId: string): boolean {
  const bucket = hashToBucket(userId, 'global-holdout');
  return bucket < 5; // 5% of users are in holdout
}

function getExperimentVariant(userId: string, experimentId: string) {
  if (isUserInGlobalHoldout(userId)) {
    return 'holdout'; // excluded from all experiments
  }
  return assignVariant(userId, experimentId);
}
```

**Tradeoff:** The holdout group doesn't benefit from improvements for the holdout period. This is acceptable as a small percentage, but ethically and business-wise you can't hold users back indefinitely from real improvements.

---

### Q132. How do you clean up feature flags? What is flag debt?

**Flag debt** is the accumulation of stale, unused, or poorly documented feature flags in a codebase. Like technical debt, it compounds over time and causes:

- **Cognitive overhead:** Developers must understand flag conditions to reason about code paths
- **Testing complexity:** Each flag doubles the number of code paths to test (2^n for n flags)
- **Bugs:** Unexpected flag interactions, flags left permanently on/off by accident
- **Dead code:** Code guarded by a flag that's permanently enabled is never cleaned up

**Feature flag lifecycle:**

```
Create → Deploy → Ramp → Analyze → Ship/Kill → REMOVE FLAG
                                                ^^^^^^^^^^^
                                           Most teams skip this step
```

**Flag cleanup strategies:**

**1. Set an expiration date at creation**
```ts
// Flag definition with metadata
const flags = {
  'new-checkout-flow': {
    description: 'Test redesigned checkout UX',
    owner: 'checkout-team',
    created: '2026-01-15',
    expires: '2026-03-01', // flag should be cleaned up by this date
    jira: 'CHECKOUT-1234',
  },
};
```

**2. Automated stale flag detection**
```bash
# Find flags that haven't been modified in 90+ days
grep -r "featureFlags.isEnabled" src/ | grep "old-feature-name"

# Or use LaunchDarkly's "flag lifecycle" or custom scripts
# to find flags with no evaluation in 30+ days
```

**3. Cleanup process when shipping**
```tsx
// BEFORE shipping (flag exists):
function CheckoutButton() {
  const { isEnabled } = useFlag('new-checkout-flow');
  return isEnabled ? <NewButton /> : <OldButton />;
}

// AFTER shipping (flag removed, variant becomes default):
function CheckoutButton() {
  return <NewButton />;
}
// Delete OldButton component too
```

**4. PR template for flag removal:**
```markdown
## Flag Cleanup Checklist
- [ ] Flag removed from all component code
- [ ] Old variant code deleted
- [ ] Flag deleted from LaunchDarkly/GrowthBook
- [ ] Tests updated to reflect new default behavior
- [ ] Monitored for 48h post-removal
```

**5. "Boy Scout" rule:**
When you touch a file that has a flag check for a shipped feature, clean it up in the same PR.

**6. Naming conventions that encode lifecycle:**
```
temp_  → temporary flags (auto-expire in 30 days)
exp_   → experiment flags (expire after test)
ops_   → operational flags (long-lived but documented)
perm_  → permanent permission flags
```

**LaunchDarkly Code References:** Automatically scans your codebase to identify which code references each flag, making it easy to find and remove flag usages.

---

### Q133. What tools have you used for feature flags / experimentation? (LaunchDarkly, Optimizely, GrowthBook, Split)

**LaunchDarkly**

The industry standard for feature flag management. Extremely reliable, fast SDK (streaming updates via SSE), and rich targeting rules.

```ts
import { LDClient, init } from 'launchdarkly-node-server-sdk';

const client = init(process.env.LAUNCHDARKLY_SDK_KEY);
await client.waitForInitialization();

const user = { key: userId, email: user.email, custom: { plan: 'enterprise' } };
const isEnabled = await client.variation('new-dashboard', user, false);

// React client SDK
import { useLDClient, useFlags } from 'launchdarkly-react-client-sdk';

function MyComponent() {
  const { newDashboard } = useFlags();
  return newDashboard ? <NewDashboard /> : <OldDashboard />;
}
```

**Pros:** Battle-tested, excellent uptime SLA, code references, experimentation add-on, streaming updates.
**Cons:** Expensive at scale, all data goes to LaunchDarkly servers.

---

**GrowthBook (Open Source)**

Open-source feature flags + experimentation platform. Self-hostable, with a generous free cloud tier. Strong statistical engine (Bayesian and frequentist).

```ts
import { GrowthBook } from '@growthbook/growthbook-react';

const gb = new GrowthBook({
  apiHost: 'https://cdn.growthbook.io',
  clientKey: process.env.NEXT_PUBLIC_GROWTHBOOK_CLIENT_KEY,
  trackingCallback: (experiment, result) => {
    // Log exposure to your analytics
    analytics.track('Experiment Viewed', {
      experimentId: experiment.key,
      variationId: result.variationId,
    });
  },
});

await gb.loadFeatures();

// React
import { GrowthBookProvider, useFeatureIsOn, useFeatureValue } from '@growthbook/growthbook-react';

function CTAButton() {
  const variant = useFeatureValue('cta-copy', 'Sign Up');
  return <button>{variant}</button>;
}
```

**Pros:** Open source, great for startups/self-hosting, strong experimentation analysis, integrates with any data warehouse.
**Cons:** Smaller ecosystem than LaunchDarkly, less polished UI.

---

**Split.io**

Enterprise-grade feature flags and experimentation with built-in data platform.

```ts
import { SplitFactory } from '@splitsoftware/splitio';

const factory = SplitFactory({
  core: { authorizationKey: process.env.SPLIT_API_KEY },
});
const client = factory.client();

await client.ready();
const treatment = client.getTreatment(userId, 'hero_banner_test');
// treatment is 'control', 'variant_a', 'variant_b', or 'control' (default)
```

**Pros:** Strong data integration, impressions tracking, excellent analytics.
**Cons:** Expensive, complex setup.

---

**Optimizely**

Full-stack experimentation platform (web, server-side, mobile). Historically known for client-side testing with anti-flicker snippet.

```ts
// Server-side with Optimizely Full Stack
const optimizely = createInstance({ sdkKey: process.env.OPTIMIZELY_SDK_KEY });
await optimizely.onReady();

const decision = optimizely.decide('homepage_hero', { userId });
// decision.variationKey: 'control' | 'variant'
// decision.enabled: true/false
```

**Pros:** Best-in-class web editor for marketer-driven tests, strong enterprise features.
**Cons:** Most expensive, overkill for developer-first teams.

---

**Comparison summary:**

| Tool | Type | Best for | Pricing |
|------|------|----------|---------|
| LaunchDarkly | SaaS | Enterprise, reliability-critical | $$$ |
| GrowthBook | Open source / SaaS | Startups, self-hosting, cost | Free / $ |
| Split.io | SaaS | Data-driven, analytics integration | $$$ |
| Optimizely | SaaS | Marketer-driven experiments | $$$$ |
| Unleash | Open source | Self-hosted, simple flags | Free |
| Vercel Flags | SaaS | Next.js apps on Vercel | $ |

**My default recommendation:** GrowthBook for most teams (great value, open source, strong stats). LaunchDarkly if the team needs guaranteed uptime SLA and richer SDK ecosystem.
