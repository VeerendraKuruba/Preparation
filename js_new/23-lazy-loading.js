/**
 * Q23. Lazy loading images and components below the fold
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY LAZY LOAD?
 * ───────────────
 * On a typical page, 60-80% of images are "below the fold" — the user may
 * never scroll to them. Loading them all upfront wastes:
 *   • Bandwidth (users on metered connections)
 *   • Memory (decoded images held in RAM)
 *   • CPU (decode + paint work on load)
 *   • LCP score (bandwidth contention with hero image)
 *
 * GOLDEN RULE: Lazy load everything BELOW the initial viewport.
 *              NEVER lazy load above-the-fold resources (hurts LCP).
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. NATIVE LAZY LOADING  (loading="lazy")
// ─────────────────────────────────────────────────────────────────────────────
/*
  <img
    src="/images/product-photo.webp"
    alt="Product"
    width="640"
    height="480"
    loading="lazy"
  >

  <iframe src="/embed/video-player" loading="lazy"></iframe>

  How it works:
  • Browser defers the download until the image is near the viewport
  • The "near viewport" threshold is browser-defined (~1250px in Chrome at fast 4G,
    larger on slow connections)
  • Zero JavaScript required — works natively

  Browser support: Chrome 77+, Firefox 75+, Safari 15.4+ (all modern browsers)

  CRITICAL: Always specify width and height to prevent CLS:
  <img loading="lazy" width="640" height="480" src="...">

  Do NOT use loading="lazy" on above-the-fold images — it delays LCP!
  <img src="/hero.webp" fetchpriority="high">  ← hero image: prioritize, don't lazy load
*/

// ─────────────────────────────────────────────────────────────────────────────
// 2. INTERSECTION OBSERVER  (custom lazy loading)
// ─────────────────────────────────────────────────────────────────────────────

// More control than loading="lazy" — custom threshold, animations, callbacks
class LazyImageLoader {
  constructor({ rootMargin = "200px", threshold = 0.1 } = {}) {
    this.observer = new IntersectionObserver(
      this.onIntersect.bind(this),
      { rootMargin, threshold }
    );
  }

  observe(img) {
    if (!img.dataset.src) return;
    this.observer.observe(img);
  }

  onIntersect(entries) {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      this.loadImage(entry.target);
      this.observer.unobserve(entry.target); // stop observing once loaded
    });
  }

  loadImage(img) {
    const src    = img.dataset.src;
    const srcset = img.dataset.srcset;
    if (!src) return;

    img.src    = src;
    if (srcset) img.srcset = srcset;

    img.onload  = () => img.classList.add("loaded");
    img.onerror = () => img.classList.add("error");
    delete img.dataset.src;
    delete img.dataset.srcset;
  }

  disconnect() {
    this.observer.disconnect();
  }
}

// Usage:
// const loader = new LazyImageLoader({ rootMargin: "300px" });
// document.querySelectorAll("img[data-src]").forEach(img => loader.observe(img));

// HTML:
// <img data-src="/images/product.webp" data-srcset="/images/product@2x.webp 2x"
//      width="640" height="480" alt="Product" class="lazy">

// ─────────────────────────────────────────────────────────────────────────────
// 3. LAZY LOADING REACT COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
import { lazy, Suspense } from "react";

// Component-level lazy loading (below-fold sections)
const HeavyCommentSection = lazy(() => import("./CommentSection"));
const RelatedProducts     = lazy(() => import("./RelatedProducts"));
const NewsletterWidget    = lazy(() => import("./NewsletterWidget"));

function ProductPage({ product }) {
  return (
    <article>
      {/* Above fold: always loaded */}
      <ProductHero product={product} />
      <ProductDetails product={product} />

      {/* Below fold: lazy loaded */}
      <Suspense fallback={<div style={{ height: 300 }}>Loading comments…</div>}>
        <HeavyCommentSection productId={product.id} />
      </Suspense>

      <Suspense fallback={<div style={{ height: 200 }}>Loading related…</div>}>
        <RelatedProducts categoryId={product.categoryId} />
      </Suspense>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. LAZY LOAD COMPONENT WHEN IT ENTERS VIEWPORT (IntersectionObserver + React)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";

function LazySection({ children, fallback = null, rootMargin = "200px" }) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || shouldLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad, rootMargin]);

  return (
    <div ref={ref}>
      {shouldLoad ? children : fallback}
    </div>
  );
}

// Usage — component only mounts when it's 200px from viewport:
function App() {
  return (
    <main>
      <AboveFoldContent />
      <LazySection fallback={<div style={{ height: 400 }} />}>
        <ExpensiveBelowFoldSection />
      </LazySection>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. BACKGROUND IMAGE LAZY LOADING (CSS background-image)
// ─────────────────────────────────────────────────────────────────────────────
// loading="lazy" doesn't work for CSS background-image.
// Use IntersectionObserver to add a class that reveals the background.

/*
  CSS:
  .hero-card { background-image: none; } // no image initially
  .hero-card.loaded { background-image: url('/images/card-bg.webp'); }

  JS:
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('loaded');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '200px' });

  document.querySelectorAll('.hero-card').forEach(el => observer.observe(el));
*/

// ─────────────────────────────────────────────────────────────────────────────
// loading="lazy" vs IntersectionObserver COMPARISON
// ─────────────────────────────────────────────────────────────────────────────
/*
  Feature                      loading="lazy"          IntersectionObserver
  ─────────────────────────── ─────────────────────   ────────────────────────
  Setup                        Zero JS                 ~20 lines JS
  Custom threshold              ❌ Browser-defined     ✅ Configurable
  Works for CSS backgrounds     ❌                     ✅
  Works for iframes             ✅                     ✅ (with custom logic)
  Load animation/callback       ❌                     ✅
  Browser support               Modern (96%+)          Modern (97%+)
  SSR compatibility             ✅ (HTML attribute)    ⚠️ (needs hydration)
  Recommended for               Standard img/iframe    Custom UX, components
*/

/**
 * BEST PRACTICES
 * ──────────────
 *  1. Use loading="lazy" for all below-the-fold <img> and <iframe> tags.
 *  2. NEVER use loading="lazy" on the LCP image (hero, above-fold).
 *  3. Always specify width and height on lazy images to prevent CLS.
 *  4. Use fetchpriority="high" on the LCP image to prioritize it.
 *  5. Use Suspense + lazy() for below-fold React component sections.
 *  6. Use IntersectionObserver for CSS backgrounds and custom animation triggers.
 *  7. Set rootMargin to 200-400px to preload before the user reaches the element.
 */

function ProductHero({ product }) { return null; }
function ProductDetails({ product }) { return null; }
function AboveFoldContent() { return null; }
function ExpensiveBelowFoldSection() { return null; }
