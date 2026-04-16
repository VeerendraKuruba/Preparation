/**
 * Q25. LCP — what counts as the largest element and how to optimize it
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS LCP?
 * ─────────────
 * Largest Contentful Paint (LCP) measures the time from when the page starts
 * loading to when the LARGEST content element is rendered in the viewport.
 *
 * It's a Core Web Vital: one of Google's key UX quality signals.
 * Weight in search ranking: yes (as of May 2021).
 *
 * LCP SCORING THRESHOLDS (75th percentile of page loads)
 * ──────────────────────────────────────────────────────
 *   Good:         LCP ≤ 2.5s
 *   Needs work:   2.5s < LCP ≤ 4.0s
 *   Poor:         LCP > 4.0s
 *
 * WHAT ELEMENTS COUNT AS LCP CANDIDATES?
 * ────────────────────────────────────────
 * The browser tracks the following:
 *   ✅ <img> elements (including <image> in SVG)
 *   ✅ <video> elements (poster image)
 *   ✅ CSS background images loaded via url()
 *   ✅ Block-level text elements containing text nodes (<p>, <h1>, <div>, etc.)
 *
 * The LARGEST of these by rendered area (width × height) is the LCP candidate.
 * It updates as more content loads — the final LCP is when it stops changing.
 *
 * WHAT DOES NOT COUNT
 * ────────────────────
 *   ❌ <svg> elements (only <image> inside SVG counts)
 *   ❌ <canvas> elements
 *   ❌ <video> play time (only poster)
 *   ❌ Elements with opacity: 0
 *   ❌ Overflow: hidden content that's technically "bigger" but not visible
 *
 * THE LCP ELEMENT IS TYPICALLY:
 *   • Hero image (most common)
 *   • Full-width banner/carousel
 *   • Large heading text (above the fold)
 *   • Featured article image
 */

// ─────────────────────────────────────────────────────────────────────────────
// CAUSES OF SLOW LCP
// ─────────────────────────────────────────────────────────────────────────────
/*
  1. Slow server response (high TTFB)
     → LCP can't start until HTML arrives

  2. Render-blocking resources
     → CSS/JS blocking HTML parse delays image discovery

  3. Resource load time (image is slow to download)
     → Large unoptimised image, slow origin, no CDN

  4. Client-side rendering delays
     → LCP element is rendered by JS (not in HTML) — browser has to run React first

  5. No resource priority hints
     → Browser doesn't know the LCP image is critical
*/

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO MEASURE LCP
// ─────────────────────────────────────────────────────────────────────────────

// JavaScript LCP API
new PerformanceObserver((entryList) => {
  const entries = entryList.getEntries();
  const lastEntry = entries[entries.length - 1]; // final LCP candidate

  console.log("LCP element:", lastEntry.element);
  console.log("LCP time:", lastEntry.startTime.toFixed(0), "ms");
  console.log("LCP URL:", lastEntry.url); // for images
  console.log("LCP size:", lastEntry.size);
}).observe({ type: "largest-contentful-paint", buffered: true });

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO OPTIMIZE LCP
// ─────────────────────────────────────────────────────────────────────────────

// 1. REDUCE SERVER RESPONSE TIME (TTFB)
/*
  Target: TTFB < 200ms
  Solutions:
  • Use a CDN (serve from edge node near user)
  • Enable HTTP/2
  • Use SSR with streaming (Next.js, Remix)
  • Cache HTML at CDN edge (stale-while-revalidate for dynamic pages)
  • Optimize server-side database queries
*/

// 2. ELIMINATE RENDER-BLOCKING RESOURCES
/*
  <head>
    <!-- Inline critical CSS -->
    <style>/* above-the-fold styles *\/</style>

    <!-- Async non-critical CSS -->
    <link rel="preload" href="/full.css" as="style" onload="this.rel='stylesheet'">

    <!-- Scripts at bottom or deferred -->
    <script src="/app.js" defer></script>
  </head>
*/

// 3. PRELOAD THE LCP IMAGE
/*
  The most impactful single fix for most sites.
  The browser discovers the hero image LATE (only after CSS/HTML is parsed).
  Preloading tells the browser to fetch it IMMEDIATELY.

  ✅ HTML:
  <link rel="preload" as="image" href="/hero.webp" fetchpriority="high">

  ✅ With responsive images (preload + imagesrcset):
  <link
    rel="preload"
    as="image"
    href="/hero-800.webp"
    imagesrcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
    imagesizes="100vw"
    fetchpriority="high"
  >

  ✅ On the img tag itself:
  <img
    src="/hero.webp"
    fetchpriority="high"
    decoding="sync"
    loading="eager"
    width="1200"
    height="600"
    alt="Hero"
  >
  Note: loading="eager" and fetchpriority="high" are the defaults for above-fold images.
  NEVER use loading="lazy" on the LCP element.
*/

// 4. OPTIMISE IMAGE SIZE AND FORMAT
/*
  ✅ Use WebP or AVIF (smaller than JPEG/PNG)
  ✅ Resize image to actual display size (don't serve 4000px for 800px display)
  ✅ Use srcset for responsive images
  ✅ Use CDN with image optimization (Cloudinary, imgix, Next.js Image)
  ✅ Set correct dimensions (width + height) to prevent CLS during load

  Tools: Squoosh, ImageOptim, Sharp (Node), Next.js <Image>
*/

// 5. SERVER-SIDE RENDERING THE LCP ELEMENT
/*
  If your LCP element is rendered by React/JS (CSR), the browser must:
  Download HTML → Execute JS → Render component → LCP

  With SSR:
  Download HTML → LCP visible (no JS needed)

  Use Next.js SSR/SSG for pages with critical above-fold content.
  Use React Server Components for frameworks that support them.
*/

// 6. USE REACT/NEXT.JS Image COMPONENT
/*
  Next.js <Image> automatically handles:
  ✅ WebP/AVIF conversion
  ✅ Responsive srcset
  ✅ Lazy loading (off by default for above-fold)
  ✅ Correct dimensions (no CLS)
  ✅ priority prop for LCP images

  import Image from 'next/image';
  <Image
    src="/hero.jpg"
    priority         // ← preloads + fetchpriority="high"
    width={1200}
    height={600}
    alt="Hero"
  />
*/

// ─────────────────────────────────────────────────────────────────────────────
// LCP OPTIMIZATION CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────
/*
  [ ] Identify the LCP element (DevTools → Lighthouse → "LCP element")
  [ ] Ensure the LCP element is in the initial HTML (not JS-rendered)
  [ ] Add <link rel="preload"> for the LCP image
  [ ] Add fetchpriority="high" on the LCP img element
  [ ] Remove loading="lazy" from the LCP image (it's lazy by default in some tools)
  [ ] Convert image to WebP/AVIF
  [ ] Resize image to match display size
  [ ] Eliminate render-blocking CSS/JS before the LCP element
  [ ] Reduce TTFB (CDN, caching, SSR optimization)
  [ ] Inline critical CSS for the LCP element
*/

/**
 * QUICK WINS BY IMPACT
 * ─────────────────────
 *  1. Preload LCP image         → often saves 0.5–1.5s
 *  2. Convert to WebP/AVIF      → 30-50% smaller = faster download
 *  3. Eliminate render-blocking → unblocks image discovery earlier
 *  4. CDN for the origin        → reduces TTFB + image serve time
 *  5. SSR LCP element           → removes JS execution from critical path
 */
