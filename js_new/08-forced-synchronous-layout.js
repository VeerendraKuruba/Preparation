/**
 * Q8. The cost of forced synchronous layouts and how to spot them
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS A FORCED SYNCHRONOUS LAYOUT?
 * ──────────────────────────────────────
 * Normally, the browser batches all style/layout calculations until the end
 * of the JS task — just before it paints. This is lazy and efficient.
 *
 * A "forced synchronous layout" (FSL) happens when you:
 *   1. Modify the DOM/CSS  (invalidates layout)
 *   2. Immediately READ a layout property (offsetWidth, getBoundingClientRect…)
 *
 * The browser can't return a stale value, so it flushes and recalculates
 * layout synchronously right then — inside your running JS.
 *
 * COST
 * ─────
 *  • Each FSL can take 10–100 ms on a complex page.
 *  • In a loop → "layout thrashing" (O(n) FSLs = catastrophic).
 *  • Blocks the main thread, preventing paint and input handling.
 *
 * PROPERTIES THAT TRIGGER FSL WHEN READ (after a write)
 * ──────────────────────────────────────────────────────
 *  Element geometry:
 *    offsetTop, offsetLeft, offsetWidth, offsetHeight, offsetParent
 *    clientTop, clientLeft, clientWidth, clientHeight
 *    scrollTop, scrollLeft, scrollWidth, scrollHeight
 *    getBoundingClientRect()
 *    getClientRects()
 *
 *  Computed style:
 *    window.getComputedStyle(el)
 *    el.currentStyle (IE)
 *
 *  Viewport:
 *    window.innerWidth, window.innerHeight
 *    document.documentElement.clientWidth/Height
 *
 *  Text:
 *    el.innerText  (triggers layout for line-box calculations)
 *    range.getBoundingClientRect()
 *
 *  Element position/visibility:
 *    el.focus() — may trigger scroll + layout
 *    scrollIntoView()
 */

// ─────────────────────────────────────────────────────────────────────────────
// ❌ EXAMPLE 1: FSL in a simple handler
// ─────────────────────────────────────────────────────────────────────────────
function onClickBad(el) {
  el.classList.add("active");        // WRITE → invalidates layout
  const rect = el.getBoundingClientRect(); // READ  → forced synchronous layout!
  console.log(rect.width);
}

// ─────────────────────────────────────────────────────────────────────────────
// ✅ FIX: read before write
// ─────────────────────────────────────────────────────────────────────────────
function onClickGood(el) {
  const rect = el.getBoundingClientRect(); // READ  (layout is still clean)
  el.classList.add("active");              // WRITE (scheduled, not forcing layout)
  console.log(rect.width);                 // uses value we already have
}

// ─────────────────────────────────────────────────────────────────────────────
// ❌ EXAMPLE 2: Layout thrashing loop (n FSLs)
// ─────────────────────────────────────────────────────────────────────────────
function equalizeHeightsBad(cards) {
  cards.forEach((card) => {
    const h = card.offsetHeight;           // READ  → FSL #1, #2, #3…
    card.style.minHeight = h * 1.2 + "px"; // WRITE → invalidates layout for next read
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ✅ FIX: batch reads, then batch writes
// ─────────────────────────────────────────────────────────────────────────────
function equalizeHeightsGood(cards) {
  const heights = cards.map((c) => c.offsetHeight); // one layout flush, all reads
  cards.forEach((c, i) => {
    c.style.minHeight = heights[i] * 1.2 + "px";   // all writes, no reads → no FSL
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ❌ EXAMPLE 3: Resize handler causing FSL on every scroll/resize event
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener("resize", () => {
  const sidebar = document.querySelector(".sidebar");
  sidebar.style.height = "auto";                // WRITE
  const h = sidebar.scrollHeight;               // READ  → FSL!
  sidebar.style.height = h + "px";             // WRITE
});

// ─────────────────────────────────────────────────────────────────────────────
// ✅ FIX: Use ResizeObserver (gives you sizes without triggering FSL)
// ─────────────────────────────────────────────────────────────────────────────
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const h = entry.contentRect.height; // observation, not a layout query
    entry.target.style.setProperty("--content-height", h + "px");
  }
});
const sidebar = document.querySelector(".sidebar");
if (sidebar) ro.observe(sidebar);

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO SPOT FSL IN CHROME DEVTOOLS
// ─────────────────────────────────────────────────────────────────────────────
/*
  1. Open DevTools → Performance tab
  2. Record a user interaction
  3. Look in the main thread flame chart for:
     • Purple "Layout" blocks appearing INSIDE (nested under) a yellow JS block
     • This "Layout inside JS" pattern = FSL
     • Warning icon: "Forced reflow is a likely performance bottleneck"

  4. In the Bottom-Up or Call Tree view:
     • Filter by "Layout"
     • Look for entries with "self time" and a JS function as parent

  5. DevTools Console → run Lighthouse
     • "Avoid chained critical requests" and layout-related audits

  Quick grep for FSL-triggering code:
*/
// grep -rn "offsetWidth\|offsetHeight\|getBoundingClientRect\|getComputedStyle\|scrollHeight" src/

// ─────────────────────────────────────────────────────────────────────────────
// USING THE PERFORMANCE API TO MEASURE FSL IMPACT
// ─────────────────────────────────────────────────────────────────────────────
function measureFSL() {
  const mark = "before-fsl";
  performance.mark(mark);

  // Trigger FSL
  document.body.style.padding = "10px";
  const w = document.body.offsetWidth; // FSL here

  performance.measure("fsl-cost", mark);
  const [measure] = performance.getEntriesByName("fsl-cost");
  console.log(`FSL cost: ${measure.duration.toFixed(2)}ms`);
}

/**
 * PRACTICAL RULES
 * ───────────────
 *  1. NEVER read layout properties inside a write loop.
 *  2. Always: read → batch reads → batch writes (or use rAF for writes).
 *  3. Cache layout values that won't change mid-frame.
 *  4. Use ResizeObserver / IntersectionObserver instead of imperative reads.
 *  5. Prefer CSS Grid/Flexbox layout over JS-computed positions.
 *  6. If you must read after write, defer the read to the next frame:
 *       el.style.opacity = 0;
 *       requestAnimationFrame(() => {
 *         const h = el.offsetHeight; // reads after this frame's layout
 *       });
 */
