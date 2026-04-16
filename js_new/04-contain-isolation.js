/**
 * Q4. Reducing paint areas with contain and isolation
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE PROBLEM: PAINT STORMS
 * ─────────────────────────
 * By default, changing one element can trigger a repaint across a large area —
 * sometimes the entire viewport — because the browser doesn't know if the
 * change could affect neighbouring elements.
 *
 * contain and isolation tell the browser where changes CAN'T escape,
 * letting it skip repainting the rest of the page.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CSS `contain` PROPERTY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * contain: layout
 *   - Element's internal layout changes DO NOT affect the outside document.
 *   - Changing a child's size won't cause the parent or siblings to reflow.
 *   - Use for: independent widgets, feed cards, comment threads.
 *
 * contain: paint
 *   - Children cannot visually overflow the element's border box.
 *   - Browser can skip painting this element when it's off-screen.
 *   - Automatically creates a new stacking context, block formatting context,
 *     and containing block for fixed-position descendants.
 *
 * contain: size
 *   - Element size is independent of its children.
 *   - You MUST set an explicit size; without it the element collapses.
 *   - Enables the browser to skip child size calculations for this element.
 *
 * contain: style
 *   - Counter properties (CSS counters) don't escape the element.
 *   - Rarely needed; mostly theoretical at this point.
 *
 * contain: strict    = size + layout + paint + style  (most aggressive)
 * contain: content   = layout + paint + style          (safe default for cards)
 * contain: layout paint  (common useful combo — no size constraint)
 */

/* CSS examples */
/*
  ─── Article card (independent layout + paint) ───────────────────────────────
  .card {
    contain: content;       / ← layout + paint + style /
    border-radius: 8px;
    overflow: hidden;
  }

  ─── Virtualized list item (full containment) ────────────────────────────────
  .list-item {
    contain: strict;        / ← size + layout + paint + style /
    height: 48px;           / ← required because of contain:size /
    width: 100%;
  }

  ─── Sidebar widget ──────────────────────────────────────────────────────────
  .sidebar-widget {
    contain: layout paint;
  }

  ─── Feed with hundreds of posts ─────────────────────────────────────────────
  .feed-post {
    contain: content;
  }
*/

// ─────────────────────────────────────────────────────────────────────────────
// content-visibility: auto  (Chrome 85+)
// ─────────────────────────────────────────────────────────────────────────────
/*
  content-visibility: auto
    - Combines contain: strict with lazy rendering.
    - Elements off-screen are NOT painted or laid out at all.
    - When the user scrolls them into view, they render on-demand.
    - Dramatically speeds up initial page load for long pages.

  GOTCHA: The element's size collapses to 0 when not rendered,
  causing CLS (layout shift) as items come into view.

  FIX: pair with `contain-intrinsic-size` to give a placeholder size:
*/
/*
  .article-section {
    content-visibility: auto;
    contain-intrinsic-size: auto 500px;  / estimated height as placeholder /
  }
*/

// ─────────────────────────────────────────────────────────────────────────────
// CSS `isolation` PROPERTY
// ─────────────────────────────────────────────────────────────────────────────
/*
  isolation: isolate
    - Creates a new stacking context WITHOUT triggering GPU layer creation.
    - Primary use: prevent mix-blend-mode from blending with the background
      outside the element.
    - Also useful to stop z-index bleed between independent UI sections.

  isolation: auto  (default) — no stacking context created.
*/

/*
  Example — button with blend mode that shouldn't affect the page background:

  .blend-button {
    mix-blend-mode: multiply;
    isolation: isolate;    / ← blending stops here, doesn't affect parent /
  }

  Example — independent modal stacking context:

  .app-shell    { isolation: isolate; }   / tooltips/modals stack correctly inside /
  .modal-portal { isolation: isolate; }
*/

// ─────────────────────────────────────────────────────────────────────────────
// MEASURING PAINT AREAS IN DEVTOOLS
// ─────────────────────────────────────────────────────────────────────────────
/*
  Chrome DevTools:
    1. Rendering tab → "Paint flashing" — green overlay shows repainted areas
    2. Performance panel → record interaction → look for large green "Paint" blocks
    3. Layers panel → inspect layer boundaries and promotion reasons

  A well-contained page shows small, targeted green flashes only where
  the change occurred — not large swaths of the page.
*/

// ─────────────────────────────────────────────────────────────────────────────
// PRACTICAL EXAMPLE: News feed with contain
// ─────────────────────────────────────────────────────────────────────────────
/*
  <ul class="feed">
    <li class="feed-post">...</li>   ← contain: content applied here
    <li class="feed-post">...</li>
    ...1000 more items...
  </ul>

  Without contain:
    • Updating one post's like-count may repaint every post below it
      because the layout engine doesn't know children can't affect siblings.

  With contain: content on .feed-post:
    • Browser knows changes inside .feed-post can't affect neighbours.
    • Only the changed post is repainted.
    • Off-screen posts with content-visibility: auto aren't even laid out.
*/

/**
 * DECISION GUIDE
 * ──────────────
 *
 *  Scenario                                  Recommended
 *  ─────────────────────────────────────────────────────────────────
 *  Independent card/widget (no fixed size)   contain: content
 *  Virtualized list item (known height)      contain: strict + height
 *  Long scrollable page                      content-visibility: auto + contain-intrinsic-size
 *  blend-mode isolation                      isolation: isolate
 *  Stacking context (no compositing)         isolation: isolate
 *  GPU layer for animation                   will-change: transform  (different tool!)
 *
 * KEY TAKEAWAYS
 * ─────────────
 *  1. contain reduces the browser's work by scoping style, layout, and paint.
 *  2. content-visibility: auto is the most powerful paint-reduction tool for
 *     long pages (can cut initial rendering time by 7×).
 *  3. isolation: isolate ≠ GPU layer — it's purely a stacking/blending fence.
 *  4. Verify impact with DevTools "Paint flashing" before shipping.
 */
