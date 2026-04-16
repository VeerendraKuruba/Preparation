/**
 * Q7. Yielding to the main thread with scheduler.yield
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE PROBLEM: GREEDY TASKS
 * ─────────────────────────
 * When JS runs a long task (processing, rendering, initialization), the main
 * thread is blocked — the browser can't handle user input, run animations,
 * or respond to events until the task finishes.
 *
 * The traditional workaround was:
 *   await new Promise(resolve => setTimeout(resolve, 0));
 * This "yields" by scheduling a new macrotask, but:
 *   • setTimeout has a minimum delay (~1-4ms)
 *   • It deprioritises your task — other pending macrotasks (timers, I/O) run first
 *   • No priority control
 *
 * scheduler.yield() (Chrome 115+, WICG proposal) solves this properly.
 *
 * WHAT scheduler.yield() DOES
 * ────────────────────────────
 *   • Pauses execution and hands control back to the browser
 *   • Browser can process: input events, animations, paints
 *   • Resumes your task AS SOON AS POSSIBLE — higher priority than setTimeout
 *   • Respects task priority inherited from the current scheduler.postTask context
 */

// ─────────────────────────────────────────────────────────────────────────────
// BASIC USAGE
// ─────────────────────────────────────────────────────────────────────────────

async function processWithYield(items) {
  const CHUNK = 50; // process 50 items between each yield

  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);

    // Yield every CHUNK items to let the browser breathe
    if (i % CHUNK === 0 && i > 0) {
      await scheduler.yield(); // ← hands control back, resumes ASAP
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POLYFILL / FALLBACK for older browsers
// ─────────────────────────────────────────────────────────────────────────────

async function yieldToMain() {
  if ("scheduler" in globalThis && "yield" in scheduler) {
    return scheduler.yield(); // Chrome 115+, best option
  }
  // Fallback: MessageChannel is faster than setTimeout
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = resolve;
    channel.port2.postMessage(null);
  });
}

// Or simplest fallback:
function yieldViaTimeout() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL-WORLD: Initialising a large app without blocking user input
// ─────────────────────────────────────────────────────────────────────────────

async function initApp() {
  // Step 1: critical — render above-the-fold content first
  renderHeader();
  renderHero();

  await yieldToMain(); // let browser paint the above-the-fold content

  // Step 2: non-critical — initialise analytics, prefetch, etc.
  initAnalytics();
  registerServiceWorker();

  await yieldToMain();

  // Step 3: idle work
  prefetchNextPage();
  loadNonCriticalCSS();
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL-WORLD: Large list processing (e.g., filtering 10,000 items)
// ─────────────────────────────────────────────────────────────────────────────

async function filterLargeList(items, predicate) {
  const result = [];
  const CHUNK  = 200;

  for (let i = 0; i < items.length; i++) {
    if (predicate(items[i])) result.push(items[i]);

    // Yield every chunk to keep UI responsive
    if (i % CHUNK === CHUNK - 1) {
      await yieldToMain();
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// scheduler.postTask with priorities
// ─────────────────────────────────────────────────────────────────────────────
/*
  scheduler.postTask(fn, options)
    priorities:
      "user-blocking"  → runs ASAP, same priority as user input responses
      "user-visible"   → normal priority (default)
      "background"     → runs only when main thread is idle

  scheduler.yield() inherits the priority from the surrounding postTask context,
  so it resumes at the right level in the task queue.
*/

async function tieredProcessing(criticalData, backgroundData) {
  // Critical work — must complete quickly
  await scheduler.postTask(async () => {
    for (const item of criticalData) {
      processItem(item);
      await scheduler.yield(); // yields at "user-blocking" priority
    }
  }, { priority: "user-blocking" });

  // Background work — low priority, yields at background level
  await scheduler.postTask(async () => {
    for (const item of backgroundData) {
      processItem(item);
      await scheduler.yield(); // yields at "background" priority
    }
  }, { priority: "background" });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPARING YIELD MECHANISMS
// ─────────────────────────────────────────────────────────────────────────────
/*
  Method                    Resume order     Delay     Priority control
  ─────────────────────── ──────────────   ────────  ─────────────────
  scheduler.yield()          ASAP*          ~0ms      Yes (inherited)
  MessageChannel             ASAP           ~0ms      No
  setTimeout(fn, 0)          After timers   ≥1ms      No
  requestIdleCallback        Idle time      Unknown   No
  requestAnimationFrame      Before paint   ≤16.7ms   No

  * ASAP = after input events are processed; before other pending tasks
*/

// ─────────────────────────────────────────────────────────────────────────────
// ISDEADLINE-BASED YIELDING (adaptive chunk size)
// ─────────────────────────────────────────────────────────────────────────────
// More sophisticated: yield only when we're getting close to deadline

async function adaptiveChunkedWork(items) {
  let i = 0;

  while (i < items.length) {
    const start = performance.now();

    // Process items until we've used ~5ms
    while (i < items.length && performance.now() - start < 5) {
      processItem(items[i++]);
    }

    if (i < items.length) {
      await yieldToMain(); // yield only when we've used our budget
    }
  }
}

/**
 * KEY POINTS
 * ──────────
 *  1. scheduler.yield() is the modern, correct way to yield on the main thread.
 *  2. It resumes sooner and at higher priority than setTimeout.
 *  3. Always provide a polyfill via MessageChannel for browser compatibility.
 *  4. Yield between chunks of work — don't yield after every single item.
 *  5. Use scheduler.postTask for prioritizing different types of work.
 *  6. The goal: keep any single JS execution slice < 50ms.
 */

// Placeholder functions
function processItem(item) {}
function renderHeader() {}
function renderHero() {}
function initAnalytics() {}
function registerServiceWorker() {}
function prefetchNextPage() {}
function loadNonCriticalCSS() {}
