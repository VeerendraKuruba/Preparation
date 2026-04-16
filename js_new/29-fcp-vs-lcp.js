/**
 * Q29. FCP vs LCP — the difference and why both matter
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * FCP: First Contentful Paint
 * ───────────────────────────
 * The time from when the page starts loading to when the browser renders
 * the FIRST piece of DOM content — text, image, SVG, or non-white <canvas>.
 *
 * "First content" = any content, even a navigation bar or loading spinner.
 * It signals: "Something has appeared. The page is working."
 *
 * FCP SCORING
 *   Good:          FCP ≤ 1.8s
 *   Needs work:    1.8s < FCP ≤ 3.0s
 *   Poor:          FCP > 3.0s
 *
 * LCP: Largest Contentful Paint
 * ──────────────────────────────
 * The time until the LARGEST content element visible in the viewport is rendered.
 * Typically the hero image, banner, or main heading.
 *
 * "Largest" = largest by rendered area (width × height in viewport).
 * It signals: "The main content is visible. The page is ready to use."
 *
 * LCP SCORING
 *   Good:          LCP ≤ 2.5s
 *   Needs work:    2.5s < LCP ≤ 4.0s
 *   Poor:          LCP > 4.0s
 *
 * THE DIFFERENCE
 * ──────────────
 *   FCP = "Something appeared"    (first anything)
 *   LCP = "Main content appeared" (biggest element)
 *
 *   FCP always comes before or at the same time as LCP.
 *   LCP is usually the more meaningful metric for perceived completeness.
 *
 * WHY BOTH MATTER
 * ────────────────
 *   FCP measures perceived responsiveness — "is anything happening?"
 *   LCP measures perceived completion — "is the main content ready?"
 *
 *   The GAP between FCP and LCP tells you how long the "loading" state lasts:
 *   FCP = nav spinner appears at 0.5s
 *   LCP = hero image at 3.0s
 *   Gap = 2.5s of "something loading but main content not ready"
 *   → Bad user experience even though FCP is good
 */

// ─────────────────────────────────────────────────────────────────────────────
// MEASURING BOTH
// ─────────────────────────────────────────────────────────────────────────────

// FCP via PerformanceObserver
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name === "first-contentful-paint") {
      console.log(`FCP: ${entry.startTime.toFixed(0)}ms`);
    }
  }
}).observe({ type: "paint", buffered: true });

// LCP via PerformanceObserver
const lcpObserver = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const latest  = entries[entries.length - 1];
  console.log(`LCP: ${latest.startTime.toFixed(0)}ms`);
  console.log(`LCP element:`, latest.element);
});
lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });

// With web-vitals library (recommended):
// import { onFCP, onLCP } from 'web-vitals';
// onFCP(({ value }) => sendMetric('FCP', value));
// onLCP(({ value }) => sendMetric('LCP', value));

// ─────────────────────────────────────────────────────────────────────────────
// COMMON SCENARIOS AND WHAT THEY REVEAL
// ─────────────────────────────────────────────────────────────────────────────
/*
  Scenario 1: Both FCP and LCP are bad (FCP=3s, LCP=5s)
    → Server is slow (TTFB), render-blocking resources, no CDN
    → Fix: reduce TTFB, inline critical CSS, preload LCP image

  Scenario 2: FCP is good, LCP is bad (FCP=0.8s, LCP=4.0s)
    → Initial shell loads fast (CSR skeleton/spinner)
    → But LCP image/content is client-side rendered or slowly loaded
    → Fix: SSR the LCP element, preload the LCP image, optimize image size

  Scenario 3: FCP is bad, LCP is good relative to FCP (FCP=2.5s, LCP=2.7s)
    → Render-blocking resources delay first paint
    → But once anything renders, the LCP content was ready (e.g., server-rendered)
    → Fix: remove render-blocking resources (inline CSS, defer JS)

  Scenario 4: FCP and LCP are close (FCP=1.0s, LCP=1.2s)
    → Ideal! The main content appears almost as soon as anything does.
    → First meaningful content IS the LCP element (e.g., SSR text heading)
*/

// ─────────────────────────────────────────────────────────────────────────────
// FCP-SPECIFIC OPTIMIZATIONS
// ─────────────────────────────────────────────────────────────────────────────
/*
  FCP is blocked by:
  1. Render-blocking CSS (most common)
  2. Render-blocking JS
  3. High TTFB (server slow)

  Solutions:
  • Inline critical CSS in <head> (remove render-blocking request)
  • Use defer/async for all scripts
  • Reduce TTFB (CDN, edge rendering)
  • Preconnect to required origins
  • Avoid font loading blocking render (font-display: swap)
*/

// ─────────────────────────────────────────────────────────────────────────────
// LCP-SPECIFIC OPTIMIZATIONS (beyond FCP)
// ─────────────────────────────────────────────────────────────────────────────
/*
  LCP is additionally affected by:
  1. LCP element is not in initial HTML (JS-rendered)
  2. LCP image has no preload hint
  3. LCP image is large/unoptimised
  4. LCP image competes for bandwidth with other resources

  Solutions:
  • Ensure LCP element is SSR'd (in initial HTML)
  • Add <link rel="preload"> for the LCP image
  • Add fetchpriority="high" on LCP img element
  • Convert to WebP/AVIF (smaller = faster)
  • Use a CDN for images
  • Responsive images (don't load 4000px wide image for 800px display)
*/

// ─────────────────────────────────────────────────────────────────────────────
// THE PERCEPTION DIFFERENCE
// ─────────────────────────────────────────────────────────────────────────────
/*
  Users notice:
  • "Does the page feel alive?" → FCP
  • "Is the main content ready to consume?" → LCP
  • "Is it interactive?" → TTI / INP

  For a news article:
    FCP = headline and byline appear          (1.2s) ✅
    LCP = hero image appears                  (2.0s) ✅
    → Good experience: user reads headline while hero loads

  For an e-commerce product page:
    FCP = nav and skeleton appear             (0.8s)
    LCP = product image appears              (4.5s) ❌
    → Bad experience: user stares at skeleton for 3.7s

  React CSR (Create React App default):
    FCP = blank screen until JS loads         (2-4s)  ← very bad
    → With SSR/SSG: FCP = immediately on HTML

  This is why SSR/SSG was "re-invented" for performance — CSR's FCP is terrible.
*/

// ─────────────────────────────────────────────────────────────────────────────
// RELATED METRICS
// ─────────────────────────────────────────────────────────────────────────────
/*
  TTFB → first byte of HTML      (server speed)
  FCP  → first content painted   (above-fold render start)
  LCP  → main content painted    (perceived completeness)
  TTI  → page fully interactive  (JS parsed + hydrated)
  INP  → worst interaction delay (responsiveness)
  CLS  → cumulative layout shift (visual stability)

  Timeline for a typical page load:
  |--TTFB--|--FCP--|--------LCP--------|--TTI--|
  0ms     200ms  1200ms             2500ms  3500ms
*/

/**
 * SUMMARY
 * ───────
 *  FCP: fast to achieve with good server + inline critical CSS
 *  LCP: the meaningful metric; needs SSR + image optimization + preload
 *
 *  A good FCP with bad LCP = "skeleton/spinner experience" (frustrating)
 *  Both good = the optimal state (content appears quickly and completely)
 *
 *  Google uses LCP as a Core Web Vital (search ranking signal).
 *  FCP is a diagnostic metric (not directly in search ranking).
 */

function sendMetric(name, value) {}
