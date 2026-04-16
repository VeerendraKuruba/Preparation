/**
 * Q3. will-change and compositing layers — when they help and when they hurt
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE COMPOSITOR THREAD MODEL
 * ────────────────────────────
 * The browser splits a page into "layers" (bitmaps). Each layer is uploaded
 * to the GPU. The compositor thread can scroll, zoom, or animate these bitmaps
 * entirely off the main thread — no JS, no Style, no Layout, no Paint needed.
 *
 * Only two CSS properties trigger compositor-only animations:
 *   • transform   (translate, scale, rotate, skew, perspective)
 *   • opacity
 *
 * Everything else (width, height, color, box-shadow, top/left…) requires
 * the main thread and triggers at least Paint, possibly Layout.
 *
 * WHAT IS A COMPOSITING LAYER?
 * ─────────────────────────────
 * A layer is a separate GPU texture for part of the page. The compositor
 * combines ("composites") all layers to produce the final frame.
 * Having an element on its own layer means animating it is cheap —
 * the compositor just moves/transforms the texture.
 *
 * HOW TO PROMOTE AN ELEMENT TO ITS OWN LAYER
 * ────────────────────────────────────────────
 * 1. Implicit promotion (browser decides):
 *    - Element has a CSS animation/transition on transform or opacity
 *    - Element has position:fixed or position:sticky
 *    - Element is a <canvas>, <video>, <iframe>
 *    - 3D transforms are applied
 *
 * 2. Explicit promotion:
 *    - will-change: transform | opacity | scroll-position
 *    - transform: translateZ(0)  ← the "GPU hack" (legacy)
 *    - transform: translate3d(0,0,0)  ← same hack, different syntax
 */

// ─────────────────────────────────────────────────────────────────────────────
// WHEN will-change HELPS
// ─────────────────────────────────────────────────────────────────────────────
/*
  Use it when:
  ✅ An element WILL animate frequently (not just once).
  ✅ The animation is triggered by user interaction (hover, scroll).
  ✅ You want to avoid the "first frame jank" — browser must promote the layer
     before the animation starts; will-change does this in advance.

  Example: a modal overlay that animates in/out on every open
*/

/* CSS — promote the layer ahead of time */
/*
.modal {
  will-change: transform, opacity;
}
.modal.open {
  animation: slideIn 0.3s ease;
}
*/

// ─────────────────────────────────────────────────────────────────────────────
// WHEN will-change HURTS
// ─────────────────────────────────────────────────────────────────────────────
/*
  ❌ Applied to too many elements at once — each layer = GPU memory (VRAM).
     On mobile with 2GB RAM, exhausting VRAM is real.
  ❌ Applied globally (e.g., * { will-change: transform }) — catastrophic.
  ❌ Left on permanently after animation finishes — layer never freed.
  ❌ Used for properties that don't actually animate (wasted allocation).
  ❌ Elements with will-change are excluded from browser's layer-squashing
     optimizations, resulting in MORE layers than needed.
*/

// ─────────────────────────────────────────────────────────────────────────────
// CORRECT PATTERN: Add will-change just before animation, remove after
// ─────────────────────────────────────────────────────────────────────────────
function animateElement(el) {
  // Step 1: promote the layer BEFORE the animation starts
  el.style.willChange = "transform";

  // Step 2: wait one frame so the promotion takes effect
  requestAnimationFrame(() => {
    el.classList.add("animate");

    // Step 3: remove will-change after the animation ends
    el.addEventListener("transitionend", () => {
      el.style.willChange = "auto";
      el.classList.remove("animate");
    }, { once: true });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CHECKING LAYERS IN DEVTOOLS
// ─────────────────────────────────────────────────────────────────────────────
/*
  Chrome DevTools:
    • Rendering tab → "Layer borders" (green = composited layer, blue = tile)
    • Layers panel → 3D view of all layers + memory size
    • Performance panel → "Compositing" entries

  Too many green borders on non-animated elements = too many layers.
*/

// ─────────────────────────────────────────────────────────────────────────────
// CONTAIN: ANOTHER COMPOSITING TOOL
// ─────────────────────────────────────────────────────────────────────────────
/*
  CSS `contain` limits the scope of browser calculations:

  contain: layout  → element's layout doesn't affect outside elements
  contain: paint   → element clips its children; enables layer creation
  contain: size    → element size doesn't depend on children
  contain: strict  → all of the above + content-visibility
  contain: content → layout + paint (most useful combo)

  contain: layout paint → common pattern for isolated widgets like cards or
  sidebar panels where internal changes shouldn't trigger outside reflows.
*/

// ─────────────────────────────────────────────────────────────────────────────
// CSS isolation PROPERTY
// ─────────────────────────────────────────────────────────────────────────────
/*
  isolation: isolate → creates a new stacking context WITHOUT compositing.
  Useful to prevent mix-blend-mode from bleeding to the parent.
  Does NOT create a GPU layer. Cheap.
*/

// ─────────────────────────────────────────────────────────────────────────────
// QUICK REFERENCE: GPU-accelerated vs not
// ─────────────────────────────────────────────────────────────────────────────
/*
  ✅ GPU (compositor-only):
      transform: translate/scale/rotate/skew
      opacity
      filter (on promoted layers)

  ❌ Main thread (triggers Paint at minimum):
      color, background-color, box-shadow
      border, outline
      clip-path (most cases)

  ❌ Main thread (triggers Layout + Paint):
      width, height, padding, margin
      top, left, right, bottom (with position:relative)
      font-size, line-height
      display, float, position

  🔎 csstriggers.com lists every property and what it triggers.
     (Archived at chromestatus.com or web.dev)
*/

/**
 * SUMMARY
 * ───────
 *  • will-change = budget reservation — use sparingly, not globally.
 *  • Add it just before the animation, remove it after.
 *  • transform + opacity = the only fully GPU-resident properties.
 *  • contain: layout paint = cheap isolation for widget-like components.
 *  • Use DevTools Layers panel to verify you're not over-promoting.
 */
