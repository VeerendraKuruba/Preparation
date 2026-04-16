/**
 * Q28. TTFB and the role of the server in frontend performance
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS TTFB?
 * ──────────────
 * Time to First Byte (TTFB) = the time from when the browser sends the HTTP
 * request to when it receives the FIRST BYTE of the response.
 *
 * It's a server-side metric but has massive frontend impact because:
 * → Everything else (HTML parse, CSS/JS load, LCP) CANNOT START until TTFB.
 * → TTFB is the starting gun for the entire critical rendering path.
 *
 * TTFB SCORING
 * ─────────────
 *   Good:         TTFB ≤ 800ms
 *   Needs work:   800ms < TTFB ≤ 1800ms
 *   Poor:         TTFB > 1800ms
 *
 * WHAT MAKES UP TTFB?
 * ────────────────────
 *  TTFB = DNS lookup + TCP connection + TLS handshake + Server processing
 *        + Network transit (response start)
 *
 *  ┌──────────┬────────┬─────────┬──────────────────┬───────────────┐
 *  │ DNS      │ TCP    │ TLS     │ Server processing  │ First byte   │
 *  │ ~20ms    │ ~50ms  │ ~100ms  │ variable (big one)│ arrives      │
 *  └──────────┴────────┴─────────┴──────────────────┴───────────────┘
 *
 * COMPONENTS
 * ───────────
 *  1. DNS resolution:        ~20-120ms (can be preconnected away)
 *  2. TCP handshake:         1 RTT = ~50-150ms per hop from user to server
 *  3. TLS handshake:         1-2 RTTs = ~50-200ms
 *  4. Server processing:     YOUR code — DB queries, template rendering, etc.
 *  5. Network transit:       ~50ms if on CDN edge, 200ms+ for distant origin
 *
 * Reducing DNS + TCP + TLS = use CDN (already done near user).
 * Reducing server processing = the real optimization work.
 */

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO MEASURE TTFB
// ─────────────────────────────────────────────────────────────────────────────

// JavaScript Navigation Timing API
const [nav] = performance.getEntriesByType("navigation");
if (nav) {
  const ttfb = nav.responseStart - nav.requestStart;
  console.log(`TTFB: ${ttfb.toFixed(0)}ms`);

  // Breakdown
  console.log(`DNS lookup: ${(nav.domainLookupEnd - nav.domainLookupStart).toFixed(0)}ms`);
  console.log(`TCP connect: ${(nav.connectEnd - nav.connectStart).toFixed(0)}ms`);
  console.log(`TLS negotiate: ${(nav.connectEnd - nav.secureConnectionStart).toFixed(0)}ms`);
  console.log(`Server processing: ${(nav.responseStart - nav.requestStart).toFixed(0)}ms`);
}

// web-vitals library
// import { onTTFB } from 'web-vitals';
// onTTFB(({ value }) => sendToAnalytics({ metric: 'TTFB', value }));

// Chrome DevTools:
// Network tab → click the HTML request → "Timing" tab shows the breakdown

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE OPTIMIZATIONS (frontend engineer's role)
// ─────────────────────────────────────────────────────────────────────────────

// 1. CDN (most impactful)
/*
  Without CDN: User in Tokyo → Origin in New York = 150ms RTT × 2 = 300ms+ just transit
  With CDN:    User in Tokyo → Edge in Tokyo = ~5ms RTT

  CDNs reduce TCP + TLS + transit time by ~80-90%.
  Use: Cloudflare, Fastly, AWS CloudFront, Vercel Edge Network

  For dynamic pages: use CDN with edge caching or edge rendering (see below)
*/

// 2. STREAMING SSR
/*
  Traditional SSR: Server generates entire HTML → sends all at once
  Streaming SSR:   Server sends HTML in chunks as it's ready

  React 18 streaming example (Next.js App Router):
    The server sends the HTML shell immediately (<head>, above-fold content),
    then streams in the rest. FCP is unblocked by data fetching.

  Result:
    TTFB = low (first bytes arrive quickly)
    FCP  = low (above-fold renders immediately)
    LCP  = low (hero image visible on first stream)
*/

// 3. EDGE RENDERING (serverless functions at CDN edge)
/*
  Run SSR at the CDN edge node nearest to the user:

  Vercel Edge Runtime / Cloudflare Workers:
    • Function runs in V8 isolates at 200+ locations worldwide
    • Cold start: ~0ms (always warm)
    • Response time: <50ms from edge to user

  Next.js:
  // app/page.tsx
  export const runtime = 'edge'; // runs at CDN edge

  Limitations:
    • No Node.js native modules
    • Shorter execution timeout
    • No file system access
*/

// 4. CACHING DYNAMIC PAGES
/*
  Even "dynamic" pages often have the same content for many users.
  Use CDN-level caching with short TTL + stale-while-revalidate:

  Cache-Control: public, max-age=60, stale-while-revalidate=600

  Result: CDN serves cached HTML in <10ms instead of hitting origin.

  For user-specific pages: use Vary header or cache-control: private

  Next.js revalidation:
  // fetch with next.js revalidation (ISR — Incremental Static Regeneration)
  const data = await fetch('/api/data', {
    next: { revalidate: 60 } // cache for 60s, then refetch in background
  });
*/

// 5. DATABASE QUERY OPTIMIZATION
/*
  Common server-side bottlenecks for high TTFB:
    • N+1 queries (load parent → load each child in separate query)
    • Missing database indexes
    • Unoptimized joins
    • No query result caching (Redis/Memcached)

  Solutions:
    • Add database indexes on frequently queried columns
    • Use DataLoader pattern (batch + deduplicate queries)
    • Cache query results with Redis (TTL appropriate to data freshness)
    • Use connection pooling (don't open new DB connection per request)
*/

// 6. EARLY HINTS (103 status code)
/*
  The server can send resource hints BEFORE the full HTML response:

  HTTP/1.1 103 Early Hints
  Link: </styles/main.css>; rel=preload; as=style
  Link: </scripts/app.js>; rel=preload; as=script

  HTTP/1.1 200 OK
  Content-Type: text/html
  ... (full HTML follows)

  The browser can start downloading CSS and JS while the server is still
  processing the request. Saves one server processing time's worth of load time.

  Supported in: Chrome 103+, Cloudflare, Fastly, Vercel
*/

// ─────────────────────────────────────────────────────────────────────────────
// IMPACT OF TTFB ON OTHER METRICS
// ─────────────────────────────────────────────────────────────────────────────
/*
  TTFB 2000ms → FCP shifts right by 2000ms → LCP shifts right → TTI shifts right

  Every millisecond of TTFB costs a millisecond of EVERY other metric.
  This is why TTFB is called the "multiplier" metric.

  Reducing TTFB from 2s to 200ms:
    FCP improves by ~1800ms
    LCP improves by ~1800ms (on top of image-specific optimizations)
    TTI improves by ~1800ms
*/

/**
 * TTFB OPTIMIZATION PRIORITY
 * ───────────────────────────
 *  1. Deploy to CDN (most impactful; often saves 100-500ms)
 *  2. Cache HTML responses (stale-while-revalidate for dynamic pages)
 *  3. Use streaming SSR (unblocks FCP while content still loading)
 *  4. Edge rendering (serverless at CDN edge for personalized content)
 *  5. Optimize server-side DB queries and API calls
 *  6. Implement Early Hints (103 status code)
 *  7. Use HTTP/2 or HTTP/3 (reduces handshake overhead)
 */
