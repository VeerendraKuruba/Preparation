/**
 * Q18. Resource hints — preload, prefetch, preconnect, dns-prefetch
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * OVERVIEW
 * ─────────
 * Resource hints let you tell the browser about resources it will need,
 * so it can start working on them before it discovers them naturally.
 *
 * Four hints, each with a different urgency and purpose:
 *
 *  dns-prefetch  → resolve DNS for a domain
 *  preconnect    → resolve DNS + TCP + TLS for a domain
 *  preload       → download a specific resource for the CURRENT page
 *  prefetch      → download a resource for a FUTURE page (idle time)
 *
 * URGENCY LADDER
 * ──────────────
 *  preload          → "I need this NOW on this page"       HIGH priority
 *  preconnect       → "I will make requests to this host"  MEDIUM priority
 *  dns-prefetch     → "I might make requests to this host" LOW priority
 *  prefetch         → "I might need this for next page"    LOWEST priority (idle)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. dns-prefetch
// ─────────────────────────────────────────────────────────────────────────────
/*
  <link rel="dns-prefetch" href="https://fonts.googleapis.com">
  <link rel="dns-prefetch" href="https://cdn.analytics-provider.com">

  What it does:
  • Resolves the DNS for the given hostname in the background
  • Costs: ~1 DNS lookup (~20-120ms saved later)
  • Very cheap — no connection established
  • Works for cross-origin domains

  When to use:
  ✅ Third-party domains that will be needed (analytics, CDN, fonts, ads)
  ✅ When you're not sure a connection will be made (low confidence)
  ✅ HTTP/1.1 sites (preconnect is better for HTTP/2)
  ❌ Don't use for the same origin (browser already knows it)
*/

// ─────────────────────────────────────────────────────────────────────────────
// 2. preconnect
// ─────────────────────────────────────────────────────────────────────────────
/*
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://api.myapp.com">

  What it does:
  • Performs DNS lookup + TCP handshake + TLS negotiation in advance
  • Costs: a full connection (~100-500ms saved later)
  • More expensive than dns-prefetch but saves more time

  crossorigin attribute:
  • Required when the resource will be fetched with CORS (fonts, API calls)
  • Ensures the right connection type is established

  When to use:
  ✅ Origins you are CERTAIN will be used on this page
  ✅ Critical third-party origins (Google Fonts, CDN, API server)
  ✅ Better than dns-prefetch when high confidence

  When NOT to use:
  ❌ Origins you might not actually use (wastes a TCP connection)
  ❌ More than 6-8 origins (browser has connection limit per origin)
  ❌ Same-origin resources (already connected)

  Example: Google Fonts requires TWO preconnects:
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
*/

// ─────────────────────────────────────────────────────────────────────────────
// 3. preload
// ─────────────────────────────────────────────────────────────────────────────
/*
  <link rel="preload" href="/fonts/myfont.woff2" as="font" crossorigin>
  <link rel="preload" href="/hero.webp" as="image">
  <link rel="preload" href="/critical.css" as="style">
  <link rel="preload" href="/app.js" as="script">

  What it does:
  • Downloads the resource at HIGH priority in advance
  • Resource is cached and ready when the browser needs it
  • Does NOT execute/apply it — just downloads and caches

  The `as` attribute is REQUIRED:
  • Tells browser the resource type for correct priority + caching headers
  • Values: font, image, style, script, document, fetch, track, worker

  crossorigin attribute:
  • Required for fonts and cross-origin fetch requests
  • Ensures correct CORS credentials

  When to use:
  ✅ Critical fonts (prevents FOIT/FOUT)
  ✅ Hero images (improves LCP)
  ✅ Critical CSS (avoids render-blocking request)
  ✅ Web app entry point (when bundler doesn't already prioritise it)
  ✅ Resources discovered late (inside CSS @font-face, dynamic imports)

  When NOT to use:
  ❌ Resources not needed in the CURRENT page (use prefetch)
  ❌ Too many preloads (dilutes priority; browser fetches all at HIGH priority)
  ❌ Resources already in the critical path (browser finds them naturally)
  ❌ Third-party resources on different origins (may require cookie/auth)

  Unused preload warning: if a preloaded resource isn't used within 3 seconds,
  Chrome logs: "The resource was preloaded using link preload but not used"
*/

// ─────────────────────────────────────────────────────────────────────────────
// 4. prefetch
// ─────────────────────────────────────────────────────────────────────────────
/*
  <link rel="prefetch" href="/dashboard.js" as="script">
  <link rel="prefetch" href="/dashboard.css" as="style">

  What it does:
  • Downloads resource in browser IDLE time at LOWEST priority
  • Stores in HTTP cache for future navigation
  • Does not affect current page performance

  When to use:
  ✅ Next page's resources (predictive navigation)
  ✅ Lazy-loaded chunks likely to be needed soon
  ✅ After page load is complete, during idle time

  When NOT to use:
  ❌ Current page resources (use preload)
  ❌ On slow/metered connections (respect save-data header)

  Check save-data before prefetching:
*/

function prefetchIfFastNetwork(url) {
  if (navigator.connection?.saveData) return; // respect data-saving mode
  if (navigator.connection?.effectiveType === "2g") return; // too slow

  const link = document.createElement("link");
  link.rel  = "prefetch";
  link.href = url;
  document.head.appendChild(link);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. modulepreload (for ES modules)
// ─────────────────────────────────────────────────────────────────────────────
/*
  <link rel="modulepreload" href="/app.mjs">

  Like preload for scripts, but also:
  • Parses the module graph (imports) in advance
  • Multiple modules can be modulepreloaded to avoid waterfall

  <link rel="modulepreload" href="/app.mjs">
  <link rel="modulepreload" href="/utils.mjs">
  <link rel="modulepreload" href="/components.mjs">
*/

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAMMATIC RESOURCE HINTS
// ─────────────────────────────────────────────────────────────────────────────

// Preload an image dynamically (e.g., next carousel slide)
function preloadImage(src) {
  const link   = document.createElement("link");
  link.rel     = "preload";
  link.as      = "image";
  link.href    = src;
  document.head.appendChild(link);
}

// Prefetch next page on hover
function prefetchRoute(path) {
  if (navigator.connection?.saveData) return;

  const link   = document.createElement("link");
  link.rel     = "prefetch";
  link.href    = path;
  document.head.appendChild(link);
}

// Preconnect to an API endpoint dynamically
function warmConnection(origin) {
  const link        = document.createElement("link");
  link.rel          = "preconnect";
  link.href         = origin;
  link.crossOrigin  = "anonymous";
  document.head.appendChild(link);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE HEAD EXAMPLE
// ─────────────────────────────────────────────────────────────────────────────
/*
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width">

    <!-- Preconnect to critical third-party origins -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://api.myapp.com">

    <!-- DNS prefetch for lower-confidence origins -->
    <link rel="dns-prefetch" href="https://analytics.example.com">

    <!-- Preload critical resources -->
    <link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin>
    <link rel="preload" href="/images/hero.webp" as="image">

    <!-- Critical CSS inlined -->
    <style>/* above-the-fold CSS */</style>

    <!-- Async-load full stylesheet -->
    <link rel="preload" href="/styles/main.css" as="style" onload="this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="/styles/main.css"></noscript>

    <!-- Main script deferred -->
    <script src="/app.js" defer></script>
  </head>
*/

/**
 * SUMMARY TABLE
 * ─────────────
 *
 *  Hint           Scope       Cost        Priority   Use case
 *  ────────────  ──────────  ──────────  ─────────  ─────────────────────────────
 *  dns-prefetch   Domain      DNS only    Low        Maybe-needed 3rd party origins
 *  preconnect     Domain      TCP+TLS     Medium     Certain 3rd party origins
 *  preload        Resource    Full dl     High       Current-page critical assets
 *  prefetch       Resource    Full dl     Lowest     Next-page resources (idle)
 *  modulepreload  ES module   Parse+dl    High       ES module entry points
 */
