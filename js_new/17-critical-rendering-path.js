/**
 * Q17. Critical rendering path and how to shorten it
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS THE CRITICAL RENDERING PATH (CRP)?
 * ────────────────────────────────────────────
 * The sequence of steps a browser must complete before it can paint the
 * first pixels to the screen.
 *
 *  HTML → DOM → CSSOM → Render Tree → Layout → Paint
 *
 * Step-by-step:
 *  1. HTML parsing  → DOM (Document Object Model)
 *  2. CSS parsing   → CSSOM (CSS Object Model)
 *  3. DOM + CSSOM   → Render Tree (only visible nodes)
 *  4. Render Tree   → Layout (position + size of each node)
 *  5. Layout        → Paint (pixels)
 *
 * BLOCKING RESOURCES
 * ───────────────────
 *  CSS is "render-blocking": the browser WON'T paint until all CSS is loaded
 *  and the CSSOM is built.
 *
 *  JS is "parser-blocking" by default: the browser STOPS parsing HTML when
 *  it encounters a <script> tag without async/defer.
 *
 *  JS is also "render-blocking" because it may modify both DOM and CSSOM.
 *
 * KEY METRICS AFFECTED
 * ─────────────────────
 *  FCP (First Contentful Paint)  → first content pixel
 *  LCP (Largest Contentful Paint) → largest element visible
 *  TTI (Time to Interactive)     → page usable
 *  TTFB (Time to First Byte)     → server response time
 */

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO SHORTEN THE CRP
// ─────────────────────────────────────────────────────────────────────────────

// 1. MINIMIZE RENDER-BLOCKING RESOURCES
// ──────────────────────────────────────
/*
  ❌ Render-blocking CSS in <head>:
     <link rel="stylesheet" href="all-styles.css">  <!-- 300 KB — blocks render -->

  ✅ Split CSS into critical (inline) + non-critical (async):
     <style>/* above-the-fold styles inlined *\/</style>
     <link rel="preload" href="full-styles.css" as="style" onload="this.rel='stylesheet'">
     <noscript><link rel="stylesheet" href="full-styles.css"></noscript>
*/

// 2. INLINE CRITICAL CSS
// ──────────────────────
/*
  Extract and inline only the CSS needed for above-the-fold content.
  Tools: critical (npm), critters (webpack plugin), penthouse

  Result: browser can paint first meaningful content without any CSS request.

  <head>
    <style>
      /* Critical CSS for above-the-fold content */
      body { margin: 0; font-family: sans-serif; }
      .hero { ... }
      .nav  { ... }
    </style>
    <link rel="preload" href="/styles/full.css" as="style" onload="this.rel='stylesheet'">
  </head>
*/

// 3. ELIMINATE RENDER-BLOCKING SCRIPTS
// ──────────────────────────────────────
/*
  ❌ Blocking:       <script src="app.js"></script>
  ✅ Deferred:       <script src="app.js" defer></script>
  ✅ Async:          <script src="analytics.js" async></script>
  ✅ Module:         <script type="module" src="app.mjs"></script>
*/

// 4. REDUCE CRITICAL RESOURCE COUNT AND SIZE
// ───────────────────────────────────────────
/*
  Critical resource = any resource needed to render above-the-fold content.
  Goal: minimize their number AND size.

  Techniques:
  • Code-split JS (only load what's needed for current route)
  • Remove unused CSS (PurgeCSS / Lightning CSS)
  • Minify + compress everything (Brotli > gzip)
  • Use system fonts for instant FCP (no font download needed)
*/

// 5. REDUCE CRITICAL PATH LENGTH (round trips)
// ─────────────────────────────────────────────
/*
  Each sequential resource request = one network round trip.
  On 4G: ~100ms RTT → 5 sequential requests = 500ms before paint.

  ✅ Preload critical resources so they download in parallel:
     <link rel="preload" href="/hero.webp" as="image">
     <link rel="preload" href="/font.woff2" as="font" crossorigin>
     <link rel="preload" href="/critical.css" as="style">

  ✅ HTTP/2 push (server-side): server proactively sends resources
     before the browser even requests them.

  ✅ Preconnect: start the TCP/TLS handshake early:
     <link rel="preconnect" href="https://fonts.gstatic.com">
*/

// 6. REDUCE TTFB (Time to First Byte)
// ────────────────────────────────────
/*
  TTFB = time from request to first byte of HTML response.
  Everything else depends on TTFB — it's the starting gun for the CRP.

  How to reduce TTFB:
  • Use a CDN (serve from edge node near user)
  • Enable HTTP caching for HTML (with stale-while-revalidate)
  • Server-side rendering (SSR) with streaming
  • Optimize server-side queries and computation
  • Use edge functions (Vercel Edge, Cloudflare Workers)
*/

// ─────────────────────────────────────────────────────────────────────────────
// CRITICAL PATH OPTIMIZATION CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────
/*
  HTML:
  [ ] HTML minified and served with Brotli
  [ ] Server sends response quickly (TTFB < 200ms)
  [ ] Streaming SSR where possible

  CSS:
  [ ] Critical CSS extracted and inlined in <head>
  [ ] Non-critical CSS loaded asynchronously (preload trick)
  [ ] CSS minified and compressed
  [ ] Remove unused CSS with PurgeCSS / Lightning CSS

  JavaScript:
  [ ] All scripts use defer or async
  [ ] No JS in <head> without defer/async
  [ ] Initial bundle < 100 KB compressed
  [ ] Code-split by route

  Fonts:
  [ ] font-display: swap or optional
  [ ] Preload critical fonts
  [ ] Subset fonts to only needed characters

  Images:
  [ ] Hero image has <link rel="preload" as="image">
  [ ] Hero image is fetchpriority="high"
  [ ] Images sized correctly (no layout shift)

  Network:
  [ ] <link rel="preconnect"> for critical origins
  [ ] HTTP/2 enabled on server
  [ ] CDN for static assets
*/

// ─────────────────────────────────────────────────────────────────────────────
// MEASUREMENT
// ─────────────────────────────────────────────────────────────────────────────
/*
  Chrome DevTools:
  • Performance panel → Timeline shows each CRP step
  • Network panel → "Waterfall" view shows sequential vs parallel loading
  • Coverage panel → unused JS and CSS per file

  Lighthouse:
  • "Eliminate render-blocking resources" audit
  • "Reduce critical request chains" audit
  • "Avoid large network payloads" audit

  WebPageTest (webpagetest.org):
  • Shows full waterfall with blocking analysis
  • "Priority" column shows which resources the browser prioritised

  web.dev/measure
  • Runs Lighthouse remotely
*/

/**
 * MENTAL MODEL
 * ────────────
 *  Fast CRP = "browser sees HTML → can paint meaningful content quickly"
 *
 *  Every render-blocking resource adds MINIMUM one RTT to FCP.
 *  Your goal: make the critical path as short as possible by:
 *    1. Reducing bytes (compress, minify, code-split)
 *    2. Reducing round trips (preload, preconnect, HTTP/2)
 *    3. Unblocking render (async/defer JS, async CSS loading)
 */
