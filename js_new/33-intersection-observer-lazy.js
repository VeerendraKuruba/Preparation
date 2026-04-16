/**
 * Q33. Intersection Observer vs native loading="lazy"
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * NATIVE loading="lazy"
 * ─────────────────────
 * Browser-native solution. Add the attribute, done.
 *
 *   <img src="photo.jpg" loading="lazy" alt="Photo" width="800" height="600">
 *   <iframe src="/embed" loading="lazy"></iframe>
 *
 * How it works:
 *   • Browser determines a "lazy loading distance threshold" — a distance
 *     from the viewport (e.g., 1250px on fast 4G in Chrome)
 *   • Resources outside this threshold are not fetched
 *   • When user scrolls toward the threshold, fetch begins
 *   • Threshold adapts: larger on slow connections, smaller on fast
 *
 * Browser support:
 *   • Chrome 77+, Firefox 75+, Safari 15.4+ = ~95%+ support
 *
 * INTERSECTION OBSERVER API
 * ──────────────────────────
 * A JavaScript API that fires callbacks when elements enter/exit the viewport.
 * More powerful but requires JavaScript.
 *
 *   const io = new IntersectionObserver(callback, options);
 *   io.observe(element);
 *
 * Options:
 *   root:        Ancestor element to use as viewport (null = browser viewport)
 *   rootMargin:  Expand/shrink the root's bounding box (e.g., "200px 0px")
 *   threshold:   Fraction of element visible to trigger (0 = any pixel, 1 = fully visible)
 */

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE COMPARISON
// ─────────────────────────────────────────────────────────────────────────────
/*
  Feature                         loading="lazy"        IntersectionObserver
  ─────────────────────────────  ─────────────────     ────────────────────────
  Setup complexity                None (HTML only)      20+ lines JS
  Custom load threshold            ❌                   ✅ rootMargin
  Works for CSS backgrounds        ❌                   ✅
  Trigger animations on enter      ❌                   ✅
  Works for React components       ❌                   ✅
  Works for arbitrary elements     ❌ (img/iframe only)  ✅
  Data-fetching on scroll          ❌                   ✅ (infinite scroll)
  Analytics on visibility          ❌                   ✅
  SSR compatibility                ✅ (HTML attribute)  ⚠️  (needs hydration)
  Performance                      Native (fastest)     JS overhead (small)
  Browser support                  95%+                 97%+
*/

// ─────────────────────────────────────────────────────────────────────────────
// WHEN TO USE loading="lazy"
// ─────────────────────────────────────────────────────────────────────────────
/*
  ✅ Simple image lazy loading — the default choice for most images
  ✅ Lazy iframes (YouTube embeds, maps, etc.)
  ✅ SSR environments (works without JavaScript)
  ✅ When you don't need custom animation or callbacks

  ❌ NOT for the LCP image (use loading="eager" or fetchpriority="high")
  ❌ NOT for CSS background images
  ❌ NOT when you need custom behavior (animations, tracking)
*/

// ─────────────────────────────────────────────────────────────────────────────
// WHEN TO USE IntersectionObserver
// ─────────────────────────────────────────────────────────────────────────────
/*
  ✅ CSS background images
  ✅ React/Vue components that should render only when visible
  ✅ Infinite scroll / pagination
  ✅ Scroll-triggered animations (fade-in, slide-in)
  ✅ Analytics: track how long users view content (impression tracking)
  ✅ Lazy loading anything that isn't an <img> or <iframe>
  ✅ Custom loading thresholds (e.g., load when 300px away instead of browser default)
*/

// ─────────────────────────────────────────────────────────────────────────────
// INTERSECTION OBSERVER PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Lazy load images with custom threshold
function lazyLoadImages() {
  const images = document.querySelectorAll("img[data-src]");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        img.src    = img.dataset.src;
        img.srcset = img.dataset.srcset ?? "";
        img.onload = () => img.classList.add("loaded");
        io.unobserve(img);
      });
    },
    { rootMargin: "300px 0px" } // load 300px before entering viewport
  );
  images.forEach((img) => io.observe(img));
}

// 2. Scroll-triggered animation
function observeAnimations() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
          io.unobserve(entry.target); // animate once
        }
      });
    },
    { threshold: 0.1 } // fire when 10% of element is visible
  );
  document.querySelectorAll(".animate-on-scroll").forEach((el) => io.observe(el));
}

// 3. Infinite scroll
function observeLoadMoreTrigger(loadMore) {
  const sentinel = document.querySelector("#load-more-sentinel");
  if (!sentinel) return;

  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        loadMore(); // fetch next page
      }
    },
    { rootMargin: "100px" } // trigger 100px before sentinel is visible
  );

  io.observe(sentinel);
  return () => io.disconnect();
}

// 4. Impression tracking (analytics)
function trackImpressions(adElements) {
  const seen = new Set();

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !seen.has(entry.target.dataset.adId)) {
          const id = entry.target.dataset.adId;
          seen.add(id);
          trackAdImpression(id, entry.intersectionRatio);
          // Don't unobserve — continue tracking
        }
      });
    },
    { threshold: [0, 0.5, 1.0] } // fire at 0%, 50%, and 100% visibility
  );

  adElements.forEach((el) => io.observe(el));
}

// 5. React hook for visibility detection
import { useState, useEffect, useRef } from "react";

function useIntersectionObserver(options = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) setHasBeenVisible(true);
      },
      { rootMargin: options.rootMargin ?? "0px", threshold: options.threshold ?? 0 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [options.rootMargin, options.threshold]);

  return { ref, isVisible, hasBeenVisible };
}

// Usage: render a component only when near viewport
function LazyCard({ children }) {
  const { ref, hasBeenVisible } = useIntersectionObserver({ rootMargin: "200px" });
  return (
    <div ref={ref} style={{ minHeight: 200 }}>
      {hasBeenVisible ? children : <div>Loading…</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMBINING BOTH: native lazy for simple images, IO for complex cases
// ─────────────────────────────────────────────────────────────────────────────
/*
  Recommended approach:
  • <img loading="lazy"> for all regular below-fold images (simple, no JS)
  • IntersectionObserver for components, animations, CSS backgrounds, analytics
  • Never use IO as a polyfill for loading="lazy" — use the native attribute

  Example:
  <img
    src="/photos/card.webp"
    loading="lazy"            ← native lazy for the image itself
    alt="Card"
    width="400" height="300"
    data-track-id="card-1"   ← IO will handle impression tracking separately
  >
*/

/**
 * SUMMARY
 * ───────
 *  loading="lazy"         → simple, fast, native, zero JS for img/iframe
 *  IntersectionObserver   → flexible, JS-based, for everything else
 *
 *  Use native loading="lazy" as your default.
 *  Reach for IntersectionObserver when you need more control or custom behavior.
 */

function trackAdImpression(id, ratio) {}
