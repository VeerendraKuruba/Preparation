/**
 * Q24. Third-party scripts — the hidden cost and how to load them safely
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE HIDDEN COST OF THIRD-PARTY SCRIPTS
 * ────────────────────────────────────────
 * Third-party scripts (analytics, chat, A/B testing, ads, social widgets) are
 * the #1 cause of unexplained performance regressions on real websites.
 *
 * Why they're expensive:
 *
 *  1. MAIN THREAD EXECUTION
 *     Their JS runs on YOUR main thread, competing with your app's code.
 *     A single poorly-written analytics library can add 300ms to INP.
 *
 *  2. EXTRA NETWORK REQUESTS
 *     Each script adds DNS + TCP + TLS + download time.
 *     Scripts often load more scripts (daisy chains).
 *
 *  3. YOU CAN'T CONTROL THEIR UPDATES
 *     A third party can push a 300 KB update at any time without your consent.
 *     Your Lighthouse score can degrade overnight.
 *
 *  4. RENDER BLOCKING (if loaded incorrectly)
 *     Default <script> tags without async/defer block your HTML parser.
 *
 *  5. DATA PRIVACY & SECURITY RISKS
 *     Third parties have full JS execution context → can read cookies, DOM,
 *     forms, and make requests.
 *
 *  6. CACHE MISS (different origin)
 *     Browser can't share third-party resources across origins.
 *     "Leverage browser caching" Lighthouse warning is often third-party.
 *
 * TYPICAL CULPRITS AND THEIR COST
 * ─────────────────────────────────
 *  Analytics SDK (GA4, Segment)    → 30-100 KB, +20-50ms
 *  Chat widget (Intercom, Zendesk) → 150-400 KB, +200-500ms
 *  A/B testing (Optimizely, VWO)   → 100-200 KB, +100-300ms, layout blocking
 *  Ad scripts                      → multiple, unpredictable
 *  Tag Manager (GTM)               → small itself + loads many others
 *  Social sharing buttons          → 50-150 KB per platform
 *  Heatmap tools (Hotjar)          → 50-100 KB + session recording overhead
 */

// ─────────────────────────────────────────────────────────────────────────────
// SAFE LOADING TECHNIQUES
// ─────────────────────────────────────────────────────────────────────────────

// 1. ALWAYS USE async OR defer
/*
  ❌ Blocks HTML parsing:
  <script src="https://cdn.analytics.com/sdk.js"></script>

  ✅ Non-blocking:
  <script src="https://cdn.analytics.com/sdk.js" async></script>

  ✅ After HTML parsed:
  <script src="https://cdn.analytics.com/sdk.js" defer></script>

  Use async for scripts that are truly independent (analytics, ads).
  Use defer for scripts that need the DOM but should not block render.
*/

// 2. LOAD AFTER PAGE IS INTERACTIVE (not on critical path)
window.addEventListener("load", () => {
  // Wait for page to fully load, then inject non-critical scripts
  setTimeout(() => {
    const script   = document.createElement("script");
    script.src     = "https://cdn.heatmap-tool.com/tracker.js";
    script.async   = true;
    document.head.appendChild(script);
  }, 2000); // 2 second delay after load
});

// 3. LOAD ON USER INTERACTION (only if user engages)
let chatLoaded = false;
document.querySelector("#help-button")?.addEventListener("click", () => {
  if (chatLoaded) return;
  chatLoaded = true;
  const script = document.createElement("script");
  script.src   = "https://cdn.intercom.io/widget.js";
  script.async = true;
  document.head.appendChild(script);
});

// 4. LOAD BASED ON USER CONSENT (GDPR)
function loadAnalyticsAfterConsent(hasConsented) {
  if (!hasConsented) return;
  import("https://cdn.analytics.com/sdk.esm.js")
    .then((sdk) => sdk.initialize({ key: "..." }))
    .catch(console.error);
}

// 5. USE PARTYTOWN (Shopify/Next.js) — run 3rd parties in Web Worker
/*
  PartyTown moves third-party scripts to Web Workers, OFF the main thread.
  Main thread proxies calls back to the worker for DOM access.

  Next.js (built-in Script component with strategy):
  import Script from 'next/script';

  <Script
    src="https://cdn.gtm.com/gtag.js"
    strategy="lazyOnload"  // load after page is idle
  />

  <Script
    src="https://cdn.analytics.com/sdk.js"
    strategy="worker"      // PartyTown: run in Web Worker
  />

  Strategies:
    beforeInteractive → blocks: use for critical polyfills only
    afterInteractive  → after hydration (default, like defer)
    lazyOnload        → during browser idle time
    worker            → Web Worker via PartyTown
*/

// ─────────────────────────────────────────────────────────────────────────────
// SELF-HOSTING THIRD-PARTY SCRIPTS
// ─────────────────────────────────────────────────────────────────────────────
/*
  Host the script on YOUR domain instead of the third-party CDN:

  Benefits:
  ✅ No extra DNS lookup / TCP connection
  ✅ Control over caching headers
  ✅ Brotli compression on your server
  ✅ Privacy: user IP not sent to third-party

  Drawbacks:
  ❌ You're responsible for updates (can serve stale script)
  ❌ Some scripts check their origin and refuse to run if moved

  Tools:
  • gatsby-plugin-local-search for local hosting
  • netlify-plugin-locally-bundle-google-fonts
  • Manual: download, commit, update periodically
*/

// ─────────────────────────────────────────────────────────────────────────────
// PRECONNECT FOR REQUIRED THIRD PARTIES
// ─────────────────────────────────────────────────────────────────────────────
/*
  If you MUST load from a third-party origin, preconnect to warm the connection:

  <link rel="preconnect" href="https://cdn.analytics.com">
  <link rel="dns-prefetch" href="https://cdn.analytics.com">

  This saves the DNS + TCP + TLS handshake time (~200-400ms).
*/

// ─────────────────────────────────────────────────────────────────────────────
// MEASURING THIRD-PARTY IMPACT
// ─────────────────────────────────────────────────────────────────────────────
/*
  Chrome DevTools:
  1. Network tab → filter by domain → group by third-party
  2. Performance panel → "Third-party" section in bottom drawer
  3. Coverage tab → show unused bytes per third-party file

  Lighthouse:
  • "Reduce the impact of third-party code" audit
  • Shows: blocking time per script, total bytes, savings

  WebPageTest:
  • "Third Party Summary" tab
  • Shows total requests, bytes, and main thread time per third party

  DevTools → "Simulate slow 4G" → reveals how third parties affect users on mobile.
*/

// ─────────────────────────────────────────────────────────────────────────────
// AUDITING AND GOVERNANCE
// ─────────────────────────────────────────────────────────────────────────────
/*
  1. Tag Manager audit:
     • Review every tag in GTM every quarter
     • Remove tags from features/campaigns that ended

  2. Performance budget:
     • Set a budget: "third-party scripts < 100ms main thread time"
     • Fail CI if budget is exceeded (Lighthouse CI, Calibre, SpeedCurve)

  3. Subresource Integrity (SRI):
     <script
       src="https://cdn.example.com/lib.js"
       integrity="sha384-abc123..."
       crossorigin="anonymous">
     </script>
     → Browser verifies the file hasn't been tampered with.

  4. Content Security Policy (CSP):
     Content-Security-Policy: script-src 'self' https://cdn.analytics.com
     → Explicitly whitelist allowed script sources.
*/

/**
 * PRIORITY ORDER FOR THIRD-PARTY LOADING
 * ──────────────────────────────────────
 *  Tier 1: Load after hydration with afterInteractive / defer
 *    → Analytics, tag managers, A/B test frameworks
 *
 *  Tier 2: Load on user interaction
 *    → Chat widgets, video players, comment systems
 *
 *  Tier 3: Load during idle time
 *    → Heatmaps, session recording, social widgets
 *
 *  Tier 4: Evaluate if necessary at all
 *    → Social share buttons (replace with native share API)
 *    → Multiple competing analytics tools
 *    → Abandoned A/B tests still running
 *
 * The fastest third-party script is the one you don't load.
 */
