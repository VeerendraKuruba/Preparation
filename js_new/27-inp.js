/**
 * Q27. INP — what interaction responsiveness actually measures
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS INP?
 * ─────────────
 * Interaction to Next Paint (INP) measures the latency of ALL user interactions
 * throughout the page's lifetime and reports the WORST one (near 98th percentile).
 *
 * INP replaced FID (First Input Delay) as a Core Web Vital in March 2024.
 * Unlike FID (which only measured the FIRST interaction), INP measures
 * the WHOLE session — every click, tap, and keypress.
 *
 * INP SCORING
 * ────────────
 *   Good:         INP ≤ 200ms
 *   Needs work:   200ms < INP ≤ 500ms
 *   Poor:         INP > 500ms
 *
 * WHAT INP MEASURES
 * ──────────────────
 * For each interaction, INP measures the time from:
 *   User action (mousedown / touchstart / keydown)
 *   →  Input delay  (event waiting for main thread)
 *   →  Processing time (event handler runs)
 *   →  Presentation delay (style → layout → paint)
 *   = Total interaction latency
 *
 * INP = the worst interaction across the session (near the 98th percentile).
 *
 * KEY DIFFERENCE from FID:
 *   FID = delay before event handler STARTS (input delay only)
 *   INP = total time from interaction to next paint (input + processing + paint)
 *
 * WHAT COUNTS AS AN "INTERACTION"?
 * ──────────────────────────────────
 *   ✅ Click (mousedown → mouseup → click)
 *   ✅ Tap on touchscreen
 *   ✅ Keyboard press (keydown → keypress → keyup)
 *   ❌ Scroll (has its own metric: scroll latency)
 *   ❌ Mouse move / hover
 *   ❌ Touch move / drag
 */

// ─────────────────────────────────────────────────────────────────────────────
// MEASURING INP
// ─────────────────────────────────────────────────────────────────────────────

// JavaScript INP API (via web-vitals library or manually)
let maxInteractionDuration = 0;

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > maxInteractionDuration) {
      maxInteractionDuration = entry.duration;
      console.log(`Worst interaction so far: ${entry.duration.toFixed(0)}ms`);
      console.log("Type:", entry.interactionType);
      console.log("Target:", entry.target);
    }
  }
}).observe({ type: "event", durationThreshold: 16, buffered: true });

// web-vitals library (recommended):
// import { onINP } from 'web-vitals';
// onINP(({ value, rating, entries }) => {
//   sendToAnalytics({ metric: 'INP', value, rating });
// });

// ─────────────────────────────────────────────────────────────────────────────
// CAUSES OF HIGH INP
// ─────────────────────────────────────────────────────────────────────────────
/*
  1. LARGE EVENT HANDLERS
     Expensive synchronous work in click/keydown handlers.
     e.g., re-sorting a 10,000-item list on every keystroke.

  2. LONG TASKS BLOCKING INPUT DISPATCH
     A running long task means the event handler can't start until the task ends.
     Even if your handler is fast, if it's queued behind a 200ms task → 200ms INP.

  3. EXCESSIVE REACT RE-RENDERS
     A click triggers a state update → entire component tree re-renders.
     Unoptimized trees with 1000+ components can take 100-300ms.

  4. SYNCHRONOUS STYLE READS AFTER WRITES (layout thrashing)
     See Q2 / Q8 — forced synchronous layouts inside event handlers.

  5. THIRD-PARTY SCRIPTS
     Analytics scripts running on the main thread can block your handler.
*/

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO OPTIMIZE INP
// ─────────────────────────────────────────────────────────────────────────────

// 1. SPLIT EXPENSIVE EVENT HANDLERS (defer non-visual work)
import { startTransition } from "react";

// ❌ BAD — everything happens synchronously in the click handler
function handleFilterBad(event) {
  const value  = event.target.value;
  const result = expensiveFilter(items, value); // 100ms on main thread
  setFilteredItems(result); // blocks paint until filter completes
}

// ✅ GOOD — show visual feedback immediately, defer expensive work
function handleFilterGood(event) {
  const value = event.target.value;
  setInputValue(value); // immediate: user sees their keystroke rendered

  startTransition(() => {
    // Non-urgent: React marks this as interruptible
    setFilteredItems(expensiveFilter(items, value));
  });
}

// 2. YIELD BETWEEN VISUAL UPDATE AND HEAVY WORK
async function handleClick(event) {
  // Step 1: Show immediate visual feedback (renders before step 2)
  setButtonState("loading");

  // Yield — lets browser paint the "loading" state
  await scheduler.yield();

  // Step 2: Do the expensive work
  const result = await processData(event.target.dataset.id);

  // Step 3: Final update
  setButtonState("done");
  setResult(result);
}

// 3. MOVE EXPENSIVE COMPUTATION TO WEB WORKERS
const worker = new Worker(new URL("./filter-worker.js", import.meta.url));

function handleSearchInput(value) {
  setInputValue(value); // immediate visual update on main thread
  worker.postMessage({ query: value, items }); // off-thread processing
}

worker.onmessage = ({ data }) => {
  setFilteredItems(data.results); // back on main thread for render
};

// 4. DEBOUNCE/THROTTLE NON-CRITICAL UPDATES
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// 5. AVOID EXPENSIVE OPERATIONS IN FREQUENT EVENTS
// ❌ BAD — heavy work on every keydown
document.addEventListener("keydown", (e) => {
  const h = document.querySelector(".header").offsetHeight; // forced layout!
  console.log(h);
});

// ✅ GOOD — cache values outside the handler
const headerH = document.querySelector(".header")?.offsetHeight ?? 0;
document.addEventListener("keydown", () => {
  console.log(headerH); // no layout work
});

// ─────────────────────────────────────────────────────────────────────────────
// INP BUDGET BREAKDOWN (target: < 200ms total)
// ─────────────────────────────────────────────────────────────────────────────
/*
  ┌────────────────────────────────┬─────────────────┬──────────────────────┐
  │ Phase                          │ Target           │ What causes latency  │
  ├────────────────────────────────┼─────────────────┼──────────────────────┤
  │ Input delay                    │ < 50ms           │ Long tasks blocking  │
  │ (user acts → handler starts)   │                  │ main thread          │
  ├────────────────────────────────┼─────────────────┼──────────────────────┤
  │ Processing time                │ < 100ms          │ Expensive handlers,  │
  │ (handler runs)                 │                  │ heavy React renders  │
  ├────────────────────────────────┼─────────────────┼──────────────────────┤
  │ Presentation delay             │ < 50ms           │ Layout thrashing,    │
  │ (style → layout → paint)       │                  │ large paint areas    │
  └────────────────────────────────┴─────────────────┴──────────────────────┘
*/

// ─────────────────────────────────────────────────────────────────────────────
// DEBUGGING INP
// ─────────────────────────────────────────────────────────────────────────────
/*
  Chrome DevTools:
  1. Performance panel → record interaction → look for interaction bar
  2. "Interactions" track shows each interaction as a bar
  3. Long bar = high INP; click to see breakdown (input delay + processing + paint)

  Chrome User Experience Report (CrUX):
  → Real field data for your domain (not lab)
  → Available via PageSpeed Insights and Search Console

  web-vitals library + Real User Monitoring:
  → Capture INP from real users
  → Send to analytics (GA4 auto-tracks INP since 2023)
*/

/**
 * KEY TAKEAWAYS
 * ─────────────
 *  1. INP ≤ 200ms → users feel the page is responsive.
 *  2. INP = worst interaction in the session (not first like FID was).
 *  3. Show visual feedback immediately, defer heavy computation.
 *  4. Use startTransition for non-urgent React state updates.
 *  5. Use scheduler.yield() to break up long event handlers.
 *  6. Break up long tasks (> 50ms) that block input dispatch.
 *  7. Move CPU-heavy work to Web Workers.
 */

function expensiveFilter(items, value) { return items; }
function processData(id) { return Promise.resolve({}); }
function setInputValue(v) {}
function setFilteredItems(items) {}
function setButtonState(s) {}
function setResult(r) {}
function useState(v) { return [v, () => {}]; }
function useEffect(fn, deps) {}
const items = [];
