/**
 * Q26. CLS — why layout shifts happen and the most common culprits
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS CLS?
 * ─────────────
 * Cumulative Layout Shift (CLS) measures the total amount of unexpected layout
 * shifts during the entire lifespan of a page.
 *
 * It's a Core Web Vital measuring VISUAL STABILITY.
 *
 * CLS SCORING
 * ────────────
 *   Good:         CLS ≤ 0.1
 *   Needs work:   0.1 < CLS ≤ 0.25
 *   Poor:         CLS > 0.25
 *
 * HOW THE SCORE IS CALCULATED
 * ────────────────────────────
 * Layout shift score = impact fraction × distance fraction
 *
 *  Impact fraction: what fraction of the viewport was shifted
 *  Distance fraction: how far (relative to viewport) the element moved
 *
 * Example: element moves 100px in a 1000px viewport, affecting 50% of viewport:
 *   score = 0.5 × (100/1000) = 0.05
 *
 * Only "unexpected" shifts count — shifts within 500ms of user input (click/tap)
 * are excluded (user-initiated interactions expected to cause layout changes).
 *
 * COMMON CULPRITS
 * ────────────────
 *  1. Images without dimensions (width/height)
 *  2. Ads without reserved space
 *  3. Fonts causing FOUT (Flash of Unstyled Text)
 *  4. Dynamically injected content above existing content
 *  5. Animations using non-compositor properties (top, height, margin)
 *  6. Late-loading widgets (consent banners, cookie bars, chat buttons)
 */

// ─────────────────────────────────────────────────────────────────────────────
// CULPRIT 1: IMAGES WITHOUT DIMENSIONS
// ─────────────────────────────────────────────────────────────────────────────
/*
  ❌ BAD — browser reserves 0 height until image loads → everything shifts down
  <img src="/product.jpg" alt="Product">

  ✅ GOOD — browser pre-allocates space via the aspect ratio
  <img src="/product.jpg" alt="Product" width="640" height="480">

  ✅ ALSO GOOD — CSS aspect-ratio:
  .responsive-img {
    aspect-ratio: 16 / 9;
    width: 100%;
    height: auto;
  }
  <img src="/banner.jpg" class="responsive-img" alt="Banner">

  ✅ BEST FOR FLUID IMAGES: Use intrinsic-size-aware CSS:
  img {
    max-width: 100%;
    height: auto;   // <- maintains aspect ratio
  }
  + always specify width and height attributes
*/

// ─────────────────────────────────────────────────────────────────────────────
// CULPRIT 2: ADS WITHOUT RESERVED SPACE
// ─────────────────────────────────────────────────────────────────────────────
/*
  Ads load asynchronously and push content down when they appear.

  ✅ FIX: Reserve space before the ad loads with min-height:
  .ad-slot {
    min-height: 90px;   // reserve space for a leaderboard ad
    min-width: 728px;
  }

  ✅ Or use aspect-ratio:
  .ad-slot-box {
    aspect-ratio: 16 / 9;
    width: 100%;
    background: #f5f5f5; // placeholder color
  }
*/

// ─────────────────────────────────────────────────────────────────────────────
// CULPRIT 3: FONTS — FOUT (Flash of Unstyled Text)
// ─────────────────────────────────────────────────────────────────────────────
/*
  When a web font loads late, text re-renders in the new font, causing
  a layout shift if the fallback font has different metrics (size, line-height).

  ❌ font-display: block → invisible text, then FOUT when font loads
  ❌ Different fallback font metrics → shift when web font replaces fallback

  ✅ font-display: optional → shows fallback if font doesn't load in first 100ms;
                              then uses cached font on next page load. Zero CLS.

  ✅ font-display: swap + size-adjust → use CSS @font-face size-adjust to
     match the fallback font's metrics to the web font's metrics.

  ✅ Preload the font so it loads before first paint:
  <link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin>

  @font-face with size-adjust (matching fallback to web font):
  @font-face {
    font-family: "Inter";
    src: url("/fonts/inter.woff2") format("woff2");
    font-display: swap;
  }

  @font-face {
    font-family: "Inter Fallback";
    src: local("Arial");
    size-adjust: 96%;           // adjust to match Inter's metrics
    ascent-override: 94%;
    descent-override: 27%;
    line-gap-override: normal;
  }

  body { font-family: "Inter", "Inter Fallback", sans-serif; }

  Tool: fontpie (generates override values automatically)
*/

// ─────────────────────────────────────────────────────────────────────────────
// CULPRIT 4: DYNAMICALLY INJECTED CONTENT ABOVE EXISTING CONTENT
// ─────────────────────────────────────────────────────────────────────────────

// ❌ BAD — inserting a notification banner at the top pushes all content down
function showNotification(msg) {
  const banner = document.createElement("div");
  banner.className = "notification-banner";
  banner.textContent = msg;
  document.body.insertBefore(banner, document.body.firstChild); // PUSHES CONTENT DOWN!
}

// ✅ GOOD options:
// Option A: Use position:fixed/sticky (doesn't affect document flow)
/*
  .notification-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 9999;
  }
*/

// Option B: Pre-reserve the space with min-height
/*
  .notification-slot {
    min-height: 0;           // collapsed by default
    transition: min-height 0.3s;
    overflow: hidden;
  }
  .notification-slot.visible {
    min-height: 48px;        // pre-reserved space
  }
  → Space was already there; showing the notification doesn't shift content
*/

// ─────────────────────────────────────────────────────────────────────────────
// CULPRIT 5: ANIMATIONS USING LAYOUT-AFFECTING PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────
/*
  Animating height, margin, padding, width triggers Layout → counts as CLS
  if it shifts other elements.

  ❌ BAD:
  .expand { animation: expand 0.3s; }
  @keyframes expand {
    from { height: 0; }
    to   { height: auto; }   // animating height = layout shift!
  }

  ✅ GOOD: Use transform (compositor-only, doesn't affect layout):
  .expand { transform: scaleY(0); transform-origin: top; }
  .expand.visible { transform: scaleY(1); }

  For accordion/expanding content, use max-height trick or the new
  transition-behavior: allow-discrete with CSS discrete animation.
*/

// ─────────────────────────────────────────────────────────────────────────────
// MEASURING CLS
// ─────────────────────────────────────────────────────────────────────────────

const clsObserver = new PerformanceObserver((entryList) => {
  let cls = 0;
  for (const entry of entryList.getEntries()) {
    if (!entry.hadRecentInput) {  // only unexpected shifts
      cls += entry.value;
      console.log("Layout shift:", entry.value, "sources:", entry.sources);
    }
  }
  console.log("Cumulative CLS:", cls.toFixed(4));
});
clsObserver.observe({ type: "layout-shift", buffered: true });

// ─────────────────────────────────────────────────────────────────────────────
// DEBUGGING CLS IN DEVTOOLS
// ─────────────────────────────────────────────────────────────────────────────
/*
  Chrome DevTools:
  1. Performance panel → record interaction
     → Look for red "Layout Shift" markers in the Experience row
     → Click to see which elements shifted and by how much

  2. Rendering tab → "Layout Shift Regions"
     → Blue flash shows shifted elements in real time

  3. Lighthouse → "Avoid large layout shifts" audit
     → Shows which elements contributed to CLS
*/

/**
 * CLS PREVENTION CHECKLIST
 * ─────────────────────────
 *  [ ] All <img> elements have explicit width and height attributes
 *  [ ] All <video> elements have explicit width and height
 *  [ ] Ad slots reserve space with min-height before ad loads
 *  [ ] Dynamic banners use position:fixed or pre-reserved slots
 *  [ ] Web fonts: use font-display:optional or preload+swap+size-adjust
 *  [ ] Animations use transform/opacity only (not height/margin/top)
 *  [ ] Skeleton screens match content dimensions exactly
 *  [ ] Late-loading widgets (chat, consent banner) use position:fixed
 */
