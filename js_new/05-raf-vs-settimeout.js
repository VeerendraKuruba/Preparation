/**
 * Q5. requestAnimationFrame vs setTimeout for visual updates
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE CORE DIFFERENCE
 * ────────────────────
 *  setTimeout(fn, 0)        → fires "as soon as possible" in the task queue,
 *                             but NOT synchronised to the display refresh rate.
 *
 *  requestAnimationFrame(fn) → fires exactly once, just before the browser
 *                              is about to repaint — perfectly synchronised
 *                              to the display's refresh rate (60/90/120 Hz).
 *
 * WHY setTimeout IS WRONG FOR ANIMATIONS
 * ────────────────────────────────────────
 *  1. Drift — setTimeout fires based on the JS timer resolution (~1–4 ms),
 *     not the display's vsync signal. Frames pile up or skip.
 *
 *  2. Double-frame problem — if your 16.7 ms timer fires at 17 ms,
 *     you've already missed the frame; the update shows 2 frames late.
 *
 *  3. Invisible tab waste — setTimeout keeps firing even when the tab
 *     is hidden. rAF is automatically paused by the browser.
 *
 *  4. No timestamp — rAF passes a high-resolution DOMHighResTimeStamp,
 *     making physics / easing calculations accurate.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ❌ BAD: setTimeout-based animation (drifts, wastes CPU in hidden tabs)
// ─────────────────────────────────────────────────────────────────────────────
let pos = 0;
function animateWithTimeout() {
  pos += 1;
  document.getElementById("box").style.transform = `translateX(${pos}px)`;
  if (pos < 200) setTimeout(animateWithTimeout, 16); // ~60 fps, but approximate
}

// ─────────────────────────────────────────────────────────────────────────────
// ✅ GOOD: rAF-based animation (vsync-locked, auto-pauses in hidden tabs)
// ─────────────────────────────────────────────────────────────────────────────
let rafId;
let start = null;
const duration  = 1000; // ms
const distance  = 200;  // px

function animateWithRAF(timestamp) {
  if (!start) start = timestamp;
  const elapsed  = timestamp - start;
  const progress = Math.min(elapsed / duration, 1);

  // Easing function (ease-out cubic)
  const eased = 1 - Math.pow(1 - progress, 3);

  document.getElementById("box").style.transform = `translateX(${eased * distance}px)`;

  if (progress < 1) {
    rafId = requestAnimationFrame(animateWithRAF);
  }
}

// Start / cancel
requestAnimationFrame(animateWithRAF);
// cancelAnimationFrame(rafId); // to stop early

// ─────────────────────────────────────────────────────────────────────────────
// WHEN setTimeout IS APPROPRIATE
// ─────────────────────────────────────────────────────────────────────────────
/*
  setTimeout IS the right tool when:
    ✅ You're delaying non-visual work (API calls, lazy setup, debounce)
    ✅ You want to defer work to a later task (break up long tasks)
    ✅ You need a fallback for environments without rAF (SSR, Node.js)
    ✅ Intentional delay (show tooltip after 500 ms, hide after 3000 ms)
*/

// ─────────────────────────────────────────────────────────────────────────────
// rAF TRICK: defer to AFTER paint (double rAF)
// ─────────────────────────────────────────────────────────────────────────────
// A single rAF fires BEFORE paint. To run code AFTER the browser has painted:
function afterPaint(fn) {
  requestAnimationFrame(() => {
    // This fires before paint
    requestAnimationFrame(() => {
      // This fires before the NEXT paint = after the previous one has happened
      fn();
    });
  });
}

// Common use case: measuring an element's size after a CSS class is applied
function applyAndMeasure(el) {
  el.classList.add("expanded");
  afterPaint(() => {
    console.log("Height after expansion:", el.offsetHeight);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// rAF + IDLE CALLBACK COMBO
// ─────────────────────────────────────────────────────────────────────────────
// rAF   → "do this before next paint" (visual priority)
// rIC   → "do this when the browser has idle time" (low priority)

function scheduleVisualThenAnalytics(visualFn, analyticsFn) {
  requestAnimationFrame(visualFn);                  // high priority visual
  requestIdleCallback(analyticsFn, { timeout: 2000 }); // low priority analytics
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE COMPARISON
// ─────────────────────────────────────────────────────────────────────────────
/*
  Feature                     setTimeout(fn,0)    requestAnimationFrame
  ────────────────────────── ──────────────────  ──────────────────────
  Synchronised to display?    ❌ No               ✅ Yes (vsync)
  Pauses in background tab?   ❌ No               ✅ Yes (auto-throttled)
  High-res timestamp?         ❌ No               ✅ Yes (DOMHighResTimeStamp)
  Batched with paint?         ❌ No               ✅ Yes
  Good for animations?        ❌ Poor             ✅ Ideal
  Good for delayed logic?     ✅ Yes              ❌ Overkill
  Available in Web Workers?   ✅ Yes              ❌ No (no DOM access)
*/

// ─────────────────────────────────────────────────────────────────────────────
// setInterval note
// ─────────────────────────────────────────────────────────────────────────────
// setInterval(fn, 16) is even worse than setTimeout for animation:
//   • Runs even when the tab is hidden
//   • Callbacks can pile up if the main thread is busy
//   • No vsync alignment
//   → Always use rAF loops for animation instead

/**
 * RULES
 * ─────
 *  Use rAF when: changing the DOM/CSS for visual output.
 *  Use setTimeout when: delaying non-visual work.
 *  Use rIC when: doing background/analytics/low-priority work.
 *  Use CSS transitions/animations when: you can — they're cheapest of all.
 */
