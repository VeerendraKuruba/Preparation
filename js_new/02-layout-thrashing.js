/**
 * Q2. Avoiding layout thrashing by batching DOM reads and writes
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS LAYOUT THRASHING?
 * ─────────────────────────
 * Layout thrashing (a.k.a. forced synchronous layout) happens when you
 * interleave DOM reads and writes inside the same JS task.
 *
 * Whenever you READ a layout property (offsetWidth, getBoundingClientRect, etc.)
 * immediately after a WRITE, the browser is forced to flush its pending style
 * and layout work synchronously — before your JS even finishes.
 *
 * This can turn an O(n) loop into O(n²) layout work.
 *
 * LAYOUT-TRIGGERING READS (incomplete list)
 * ──────────────────────────────────────────
 *  offsetTop / offsetLeft / offsetWidth / offsetHeight
 *  scrollTop / scrollLeft / scrollWidth / scrollHeight
 *  clientTop / clientLeft / clientWidth / clientHeight
 *  getBoundingClientRect()
 *  getComputedStyle()
 *  innerText  (triggers layout to compute line-wrapping)
 *  focus()    (may trigger scroll)
 */

// ─────────────────────────────────────────────────────────────────────────────
// ❌ BAD: interleaved read → write → read → write (layout thrashing)
// ─────────────────────────────────────────────────────────────────────────────
function resizeBoxesBad(boxes) {
  boxes.forEach((box) => {
    const width = box.offsetWidth;         // READ  → flush layout
    box.style.width = width * 2 + "px";   // WRITE → invalidate layout
    // Next iteration: READ again → flush layout again  (thrashing!)
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ✅ GOOD: batch all reads first, then all writes
// ─────────────────────────────────────────────────────────────────────────────
function resizeBoxesGood(boxes) {
  // Phase 1 — READ (one layout flush for all)
  const widths = boxes.map((box) => box.offsetWidth);

  // Phase 2 — WRITE (no reads → no forced layout)
  boxes.forEach((box, i) => {
    box.style.width = widths[i] * 2 + "px";
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ✅ BETTER: wrap writes in requestAnimationFrame
// ─────────────────────────────────────────────────────────────────────────────
function resizeBoxesBetter(boxes) {
  const widths = boxes.map((box) => box.offsetWidth); // reads (sync, ok)

  requestAnimationFrame(() => {
    boxes.forEach((box, i) => {
      box.style.width = widths[i] * 2 + "px"; // writes inside rAF
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FASTDOM PATTERN — library-level read/write batching
// ─────────────────────────────────────────────────────────────────────────────
// FastDOM (github.com/wilsonpage/fastdom) automates the pattern:
//
//   fastdom.measure(() => {
//     const width = el.offsetWidth;      // scheduled READ batch
//     fastdom.mutate(() => {
//       el.style.width = width * 2 + "px"; // scheduled WRITE batch
//     });
//   });
//
// All measures run before any mutates in the same frame.

// ─────────────────────────────────────────────────────────────────────────────
// DIY batch scheduler (simplified FastDOM concept)
// ─────────────────────────────────────────────────────────────────────────────
const batcher = (() => {
  const reads  = [];
  const writes = [];
  let rafPending = false;

  function flush() {
    // all reads first
    reads.splice(0).forEach((fn) => fn());
    // then all writes
    writes.splice(0).forEach((fn) => fn());
    rafPending = false;
  }

  function schedule() {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(flush);
    }
  }

  return {
    read(fn)  { reads.push(fn);  schedule(); },
    write(fn) { writes.push(fn); schedule(); },
  };
})();

// Usage:
// batcher.read(() => { const h = el.offsetHeight; batcher.write(() => el.style.height = h + 'px'); });

// ─────────────────────────────────────────────────────────────────────────────
// DETECTING THRASHING IN DEVTOOLS
// ─────────────────────────────────────────────────────────────────────────────
// In Chrome DevTools > Performance:
//   • Purple "Layout" blocks immediately following JS blocks = thrashing
//   • "Forced reflow while executing script" warning in the call tree
//   • Filter by "Layout" in the Bottom-Up view to find the offending call

// ─────────────────────────────────────────────────────────────────────────────
// REAL-WORLD SCENARIO: sticky header height compensation
// ─────────────────────────────────────────────────────────────────────────────

// ❌ Called on every scroll event — 60 reads + 60 writes per second
window.addEventListener("scroll", () => {
  const headerH = document.querySelector("header").offsetHeight; // READ
  document.querySelector("main").style.paddingTop = headerH + "px"; // WRITE
});

// ✅ Cache the read; only write on scroll
const header = document.querySelector("header");
let cachedHeaderH = header?.offsetHeight ?? 0;

// Re-read only when header might change size
const ro = new ResizeObserver(([entry]) => {
  cachedHeaderH = entry.contentRect.height; // READ (from observer, not layout)
});
if (header) ro.observe(header);

window.addEventListener("scroll", () => {
  if (document.querySelector("main")) {
    document.querySelector("main").style.paddingTop = cachedHeaderH + "px"; // WRITE only
  }
}, { passive: true });

/**
 * KEY RULES
 * ─────────
 *  1. Read all layout properties at once, before any writes.
 *  2. Never read a layout property inside a write loop.
 *  3. Use rAF to defer writes to the next frame.
 *  4. Cache layout values that don't change (or use ResizeObserver).
 *  5. Use CSS custom properties or CSS Grid instead of JS-computed layouts.
 */
