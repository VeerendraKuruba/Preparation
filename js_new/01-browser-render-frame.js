/**
 * Q1. How the browser renders a frame and where you can interrupt it
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE PIXEL PIPELINE (one 16.7 ms budget at 60 fps)
 * ──────────────────────────────────────────────────
 *
 *  JS  →  Style  →  Layout  →  Paint  →  Composite
 *
 * 1. JavaScript
 *    - Event handlers, rAF callbacks, microtasks, and timers fire here.
 *    - Any DOM mutation or style change is queued for the next stage.
 *
 * 2. Style (Recalculate Styles)
 *    - Browser matches CSS selectors to DOM nodes and computes the
 *      "computed style" for every element.
 *    - Changing a class or inline style triggers this.
 *
 * 3. Layout (Reflow)
 *    - Browser calculates the size and position of every element.
 *    - Only triggered if a "layout-affecting" property changed
 *      (width, height, top, margin, padding, font-size, etc.).
 *    - Most expensive step; touches the whole document tree.
 *
 * 4. Paint
 *    - Browser fills in pixels: text, colours, images, borders, shadows.
 *    - Produces "paint records" per layer; does NOT touch the GPU yet.
 *
 * 5. Composite
 *    - Compositor thread merges all layers and sends bitmaps to the GPU.
 *    - Happens OFF the main thread — transforms and opacity only cost this step.
 *
 * WHERE YOU CAN INTERRUPT / SKIP STAGES
 * ──────────────────────────────────────
 *
 *  - Skip Layout + Paint → use `transform` / `opacity` only
 *    (goes straight from JS to Composite; full GPU path)
 *
 *  - Skip Layout → change colour, background, box-shadow
 *    (JS → Style → Paint → Composite)
 *
 *  - Skip everything after JS → read-only DOM access
 *    (no visual side-effects)
 *
 * ENTRY POINTS YOU CONTROL
 * ────────────────────────
 *
 *  requestAnimationFrame(cb)
 *    - cb fires just before Style calculation — ideal for visual mutations.
 *
 *  MutationObserver / ResizeObserver
 *    - Fire after Layout (post-layout microtask).
 *
 *  IntersectionObserver
 *    - Fire after Composite; never blocks paint.
 *
 *  queueMicrotask / Promise.then
 *    - Fire after the current task, before the next rAF.
 *    - Good for deferred logic; bad for bulk DOM writes (still blocks paint).
 *
 *  scheduler.yield() (Chrome 115+)
 *    - Explicitly yields to the browser mid-task so it can paint / handle input.
 *
 * PRACTICAL EXAMPLE
 * ─────────────────
 */

// ❌ BAD — forced synchronous layout inside a loop (layout thrashing)
function badAnimate(elements) {
  elements.forEach((el) => {
    const h = el.offsetHeight; // READ  → forces layout
    el.style.height = h + 1 + "px"; // WRITE → invalidates layout
    // next iteration forces layout again!
  });
}

// ✅ GOOD — batch reads before writes, then use rAF
function goodAnimate(elements) {
  // Phase 1: read all values in one go
  const heights = elements.map((el) => el.offsetHeight);

  // Phase 2: write inside rAF — browser applies all writes before next paint
  requestAnimationFrame(() => {
    elements.forEach((el, i) => {
      el.style.height = heights[i] + 1 + "px";
    });
  });
}

// ✅ BEST for motion — skip Layout AND Paint entirely
function bestAnimate(element) {
  // transform goes Composite-only; the compositor thread handles it
  element.style.transform = "translateX(100px)";
  element.style.opacity   = "0.5";
}

/**
 * DIAGRAM OF A FULL FRAME
 * ───────────────────────
 *
 *  ┌───────────────────────────────────────────────────── 16.7 ms ──┐
 *  │  [Input events]  [JS (rAF)]  [Style]  [Layout]  [Paint]       │
 *  │                                                    ↑           │
 *  │                                            ← main thread       │
 *  │                                                                │
 *  │  [Composite]  ← compositor thread (GPU) — can run in parallel │
 *  └────────────────────────────────────────────────────────────────┘
 *
 * KEY TAKEAWAYS
 * ─────────────
 *  1. 60 fps = 16.7 ms per frame; 120 fps = 8.3 ms per frame.
 *  2. Long JS tasks eat into Style/Layout/Paint time → jank.
 *  3. Only `transform` and `opacity` are fully GPU-accelerated.
 *  4. Use Chrome DevTools > Performance panel to see each pipeline stage.
 *  5. "Rendering" tab in DevTools can highlight paint/layout regions in real-time.
 */
