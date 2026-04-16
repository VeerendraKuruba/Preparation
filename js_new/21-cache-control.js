/**
 * Q21. Cache-Control headers and how to version assets correctly
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY CACHING MATTERS
 * ────────────────────
 * A cached resource costs 0 bytes of bandwidth and ~0ms of network latency.
 * Correct caching is one of the highest-ROI performance optimisations.
 *
 * THE CACHE-CONTROL HEADER
 * ─────────────────────────
 * Cache-Control is the primary mechanism to control how browsers and
 * CDN/proxy servers cache HTTP responses.
 *
 * DIRECTIVES
 * ───────────
 *  max-age=N           → Cache for N seconds (relative to response time)
 *  s-maxage=N          → Same, but for shared caches (CDN) only
 *  no-cache            → ALWAYS revalidate with server before using cache
 *  no-store            → Never cache (sensitive data)
 *  public              → Any cache (browser + CDN) can store it
 *  private             → Only the browser can store (not CDN)
 *  immutable           → Resource will NEVER change; skip revalidation
 *  stale-while-revalidate=N → Use stale cache while fetching fresh version
 *  stale-if-error=N    → Use stale cache if server errors (for N seconds)
 *  must-revalidate     → Must revalidate after max-age expires
 */

// ─────────────────────────────────────────────────────────────────────────────
// ASSET TYPES AND THEIR IDEAL CACHE STRATEGY
// ─────────────────────────────────────────────────────────────────────────────

/*
  ┌────────────────────────────┬──────────────────────────────────────────────┐
  │ Asset                      │ Cache-Control Header                         │
  ├────────────────────────────┼──────────────────────────────────────────────┤
  │ Hashed JS/CSS bundles      │ max-age=31536000, immutable                  │
  │  (e.g., app.a1b2c3d4.js)  │ (1 year; hash guarantees uniqueness)         │
  ├────────────────────────────┼──────────────────────────────────────────────┤
  │ Hashed images              │ max-age=31536000, immutable                  │
  │  (e.g., logo.a1b2.webp)   │                                              │
  ├────────────────────────────┼──────────────────────────────────────────────┤
  │ HTML documents             │ no-cache                                     │
  │  (e.g., index.html)       │ (always revalidate; it has the asset refs)   │
  ├────────────────────────────┼──────────────────────────────────────────────┤
  │ API responses (dynamic)    │ no-store  OR  max-age=60, stale-while-       │
  │                            │ revalidate=300  (depends on data freshness)  │
  ├────────────────────────────┼──────────────────────────────────────────────┤
  │ Fonts (hashed)             │ max-age=31536000, immutable                  │
  ├────────────────────────────┼──────────────────────────────────────────────┤
  │ Service Worker script      │ no-cache  (must check for updates)           │
  └────────────────────────────┴──────────────────────────────────────────────┘
*/

// ─────────────────────────────────────────────────────────────────────────────
// ASSET VERSIONING (CACHE BUSTING)
// ─────────────────────────────────────────────────────────────────────────────
/*
  PROBLEM: If you cache app.js for 1 year, users won't get updates.
  SOLUTION: Content hashing — include a hash of the file content in the filename.

  When the file changes, its hash changes → new URL → cache miss → fresh download.
  When the file doesn't change, URL stays the same → cache hit → no download.

  ❌ Query string versioning (unreliable — some proxies ignore query strings)
     app.js?v=1.2.3     → may be cached without the version

  ✅ Content hash in filename (reliable — different URL = different resource)
     app.a1b2c3d4.js    → hash changes only when content changes
     app.a1b2c3d4.js → app.e5f6a7b8.js on next deploy (new URL)
*/

// ─────────────────────────────────────────────────────────────────────────────
// WEBPACK: Content hashing setup
// ─────────────────────────────────────────────────────────────────────────────
/*
  // webpack.config.js
  module.exports = {
    output: {
      filename:       "[name].[contenthash:8].js",   // app.a1b2c3d4.js
      chunkFilename:  "[name].[contenthash:8].js",   // vendor.e5f6a7b8.js
      assetModuleFilename: "[name].[contenthash:8][ext]",
    },
    optimization: {
      moduleIds:  "deterministic",  // stable module IDs (prevents hash changes)
      chunkIds:   "deterministic",  // stable chunk IDs
      runtimeChunk: "single",       // extract runtime to prevent vendor hash changes
    },
  };
*/

// Vite uses [hash] by default in production builds.

// ─────────────────────────────────────────────────────────────────────────────
// THE HTML PROBLEM
// ─────────────────────────────────────────────────────────────────────────────
/*
  index.html must NOT be cached long-term because it references the hashed assets.
  If index.html is cached, old users never load new asset URLs.

  ✅ Correct strategy for HTML:
     Cache-Control: no-cache
     (= revalidate every time, but use cache if ETag/Last-Modified matches)

  Or for slightly more tolerance:
     Cache-Control: max-age=0, must-revalidate
*/

// ─────────────────────────────────────────────────────────────────────────────
// NGINX CONFIGURATION EXAMPLE
// ─────────────────────────────────────────────────────────────────────────────
/*
  # Hashed static assets — cache forever
  location ~* \.(js|css|woff2|webp|avif|png|jpg)$ {
    if ($uri ~* "\.[a-f0-9]{8,}\.(js|css)$") {
      add_header Cache-Control "public, max-age=31536000, immutable";
    }
  }

  # HTML — always revalidate
  location ~* \.html$ {
    add_header Cache-Control "no-cache";
  }

  # API responses
  location /api/ {
    add_header Cache-Control "no-store";
  }
*/

// ─────────────────────────────────────────────────────────────────────────────
// stale-while-revalidate (SWR) PATTERN
// ─────────────────────────────────────────────────────────────────────────────
/*
  Cache-Control: max-age=60, stale-while-revalidate=600

  Behaviour:
  • For 60 seconds: serve from cache (fresh)
  • 60-660 seconds: serve stale from cache IMMEDIATELY, AND revalidate in background
  • After 660 seconds: must revalidate before serving

  Perfect for API responses where slightly stale data is acceptable.
  Gives instant response (from cache) while keeping data fresh.

  Example: news feed, product listings, user profile data
*/

// ─────────────────────────────────────────────────────────────────────────────
// ETag and Last-Modified (conditional requests)
// ─────────────────────────────────────────────────────────────────────────────
/*
  When Cache-Control: no-cache, the browser still stores the response
  but MUST revalidate with the server.

  Server sends:  ETag: "abc123"  and/or  Last-Modified: Thu, 01 Jan 2026 00:00:00 GMT
  Browser sends: If-None-Match: "abc123"  or  If-Modified-Since: ...

  If file unchanged:  Server responds 304 Not Modified (no body = 0 bytes transferred)
  If file changed:    Server responds 200 with new content

  This makes no-cache efficient — only transfers data when content actually changed.
*/

// ─────────────────────────────────────────────────────────────────────────────
// CDN CONSIDERATIONS
// ─────────────────────────────────────────────────────────────────────────────
/*
  s-maxage overrides max-age for shared caches (CDNs) only:

  Cache-Control: max-age=3600, s-maxage=86400
  → Browser caches 1 hour
  → CDN caches 1 day
  → Useful when CDN can serve stale longer than browsers should

  CDN Purge vs hash-based invalidation:
  • Hash-based: no purge needed; new hash = new URL (preferred)
  • Purge API: CDN-specific; can be slow to propagate globally
*/

// ─────────────────────────────────────────────────────────────────────────────
// VERIFYING CACHE HEADERS
// ─────────────────────────────────────────────────────────────────────────────
/*
  Chrome DevTools → Network tab:
  • Click resource → Headers → Response Headers
  • "Cache-Control", "ETag", "Last-Modified" should be present
  • "(from memory cache)" / "(from disk cache)" = cache hit ✅
  • "304 Not Modified" = revalidation, no bytes transferred ✅
  • "200" every time = not caching properly ❌

  Check with curl:
  curl -I https://example.com/app.a1b2c3d4.js
  → Should show: Cache-Control: max-age=31536000, immutable
*/

/**
 * GOLDEN RULES
 * ────────────
 *  1. HTML → no-cache (always revalidate, but use ETags)
 *  2. Hashed assets (JS/CSS/fonts/images) → max-age=31536000, immutable
 *  3. Non-hashed assets → short max-age + stale-while-revalidate
 *  4. Sensitive API data → no-store
 *  5. Always use content hashing, never query strings, for cache busting
 *  6. Never cache the service worker script long-term
 */
