/**
 * Q6. Long tasks and why anything over 50ms blocks the main thread
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE MAIN THREAD IS SINGLE-THREADED
 * ────────────────────────────────────
 * JavaScript runs on a single main thread that also handles:
 *   • Style recalculation
 *   • Layout (reflow)
 *   • Paint
 *   • Compositing instructions
 *   • Event handling (clicks, keystrokes, scroll)
 *   • Parsing HTML and CSS
 *   • Running microtasks and macrotasks
 *
 * When your JS task runs, ALL of the above are blocked.
 *
 * WHY 50ms IS THE THRESHOLD (The "Long Task" definition)
 * ───────────────────────────────────────────────────────
 * Human perception of "instant" response = < 100 ms from action to feedback.
 * The browser needs ~50 ms to process and paint after your JS yields.
 * So any task longer than 50 ms risks exceeding the 100 ms budget.
 *
 * Google/W3C defines a "Long Task" as: any task > 50ms on the main thread.
 * This is what the Long Tasks API reports.
 *
 *  0ms ──────────── 50ms ──────────── 100ms ──────────── 300ms
 *  "Instant"        Long task         Noticeable delay    "Slow"
 *
 * HOW IT CAUSES JANK
 * ──────────────────
 *  • 60 fps = 16.7 ms per frame budget
 *  • A 200 ms task = 12 skipped frames (200 / 16.7 ≈ 12)
 *  • User clicks/taps/types during the task — response is queued
 *  • INP (Interaction to Next Paint) shoots up
 *  • Page feels frozen or unresponsive
 */

// ─────────────────────────────────────────────────────────────────────────────
// DETECTING LONG TASKS
// ─────────────────────────────────────────────────────────────────────────────

// 1. Long Tasks API
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn(`Long task detected: ${entry.duration.toFixed(1)}ms`, entry);
  }
});
observer.observe({ type: "longtask", buffered: true });

// 2. Chrome DevTools → Performance panel
//    • Red "Long task" indicator on the main thread flame chart
//    • Filter: "Long Tasks" checkbox in the toolbar

// 3. Lighthouse audit
//    • "Avoid long main-thread tasks" in the Diagnostics section

// ─────────────────────────────────────────────────────────────────────────────
// COMMON CAUSES OF LONG TASKS
// ─────────────────────────────────────────────────────────────────────────────
/*
  1. Synchronous, large data processing
     e.g., sorting 50,000 items, parsing a large JSON string

  2. Hydration in SSR frameworks (React, Next.js)
     e.g., reconciling a large server-rendered DOM

  3. Large bundle execution (script parse + evaluate)
     e.g., a 2 MB uncompressed JS bundle

  4. Layout thrashing (forced synchronous layouts in a loop)

  5. Third-party scripts (analytics, chat widgets, A/B testing)

  6. Large React renders without virtualization
*/

// ─────────────────────────────────────────────────────────────────────────────
// BREAKING UP LONG TASKS
// ─────────────────────────────────────────────────────────────────────────────

// ❌ BAD — one giant synchronous task (blocks for entire duration)
function processAllBad(items) {
  return items.map((item) => heavyTransform(item)); // could take 500ms
}

// ✅ GOOD — chunked processing with setTimeout yielding
async function processInChunks(items, chunkSize = 100) {
  const results = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    results.push(...chunk.map(heavyTransform));

    // Yield to the main thread between chunks
    await yieldToMainThread();
  }
  return results;
}

function yieldToMainThread() {
  return new Promise((resolve) => setTimeout(resolve, 0));
  // Note: scheduler.yield() (Chrome 115+) is better — see Q7
}

// ─────────────────────────────────────────────────────────────────────────────
// USING scheduler.postTask (Chrome 94+)
// ─────────────────────────────────────────────────────────────────────────────
// scheduler.postTask allows you to queue work at specific priorities:
//   "user-blocking" → highest (< 50ms budget, reserved for UI)
//   "user-visible"  → normal (background rendering work)
//   "background"    → lowest (analytics, prefetching)

async function scheduledProcessing(items) {
  // Split work by priority
  await scheduler.postTask(
    () => items.slice(0, 10).forEach(renderVisibleItem),
    { priority: "user-blocking" }
  );

  await scheduler.postTask(
    () => items.slice(10).forEach(prerenderOffScreenItem),
    { priority: "background" }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REACT CONCURRENT MODE APPROACH
// ─────────────────────────────────────────────────────────────────────────────
// React 18's concurrent mode automatically breaks rendering into chunks,
// yielding to the browser between renders.
// startTransition marks state updates as non-urgent (interruptible):

// import { startTransition } from 'react';
// startTransition(() => {
//   setSearchResults(filterResults(query)); // won't block typing
// });

// ─────────────────────────────────────────────────────────────────────────────
// MOVING WORK OFF MAIN THREAD: Web Workers
// ─────────────────────────────────────────────────────────────────────────────
// For truly CPU-heavy work, use a Web Worker (see Q15):
const worker = new Worker("heavy-worker.js");
worker.postMessage({ items: largeDataset });
worker.onmessage = ({ data }) => {
  renderResults(data.results); // back on main thread, just for rendering
};

// ─────────────────────────────────────────────────────────────────────────────
// THE 50ms BUDGET BREAKDOWN
// ─────────────────────────────────────────────────────────────────────────────
/*
  RAIL model (Google):
    Response    → < 100ms total (so JS ≤ 50ms to leave buffer for paint)
    Animation   → each frame ≤ 16ms (60fps)
    Idle        → use idle callbacks for non-urgent work
    Load        → < 5s TTI on 4G / mid-tier mobile

  Within a 50ms JS task budget:
    ~10ms  →  typical event handler + state update
    ~15ms  →  React reconciliation for moderate tree
    ~5ms   →  paint/composite instructions
    ────────
    ~30ms  safe budget; 50ms maximum before users notice
*/

/**
 * CHECKLIST TO AVOID LONG TASKS
 * ──────────────────────────────
 *  [ ] Break loops > 100 items into chunks with yield points
 *  [ ] Move heavy computation to Web Workers
 *  [ ] Lazy-load non-critical JS (code splitting)
 *  [ ] Use React startTransition for non-urgent UI updates
 *  [ ] Defer third-party scripts (async/defer attributes)
 *  [ ] Monitor with Long Tasks API in production (send to analytics)
 *  [ ] Profile with DevTools before and after optimization
 */

// Placeholder functions for the code examples above
function heavyTransform(item) { return item; }
function renderVisibleItem(item) {}
function prerenderOffScreenItem(item) {}
function renderResults(results) {}
const largeDataset = [];
