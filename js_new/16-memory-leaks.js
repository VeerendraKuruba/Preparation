/**
 * Q16. Memory leaks — event listeners, closures, and detached DOM nodes
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT IS A MEMORY LEAK?
 * ───────────────────────
 * A memory leak in JavaScript = objects that are no longer needed
 * but are still reachable from a GC root, preventing garbage collection.
 *
 * GC roots include: global object (window), call stack, active event listeners,
 * closures in scope, and any live references.
 *
 * COMMON CAUSES
 * ──────────────
 *  1. Event listeners not removed on cleanup
 *  2. Closures holding references to large objects
 *  3. Detached DOM nodes referenced in JS
 *  4. Timers (setInterval) not cleared
 *  5. Global variables accumulating data
 *  6. React: effects without cleanup, stale state refs
 *  7. Map/Set growing unboundedly
 *  8. WeakMap/WeakSet misuse (not using them when you should)
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. EVENT LISTENERS NOT REMOVED
// ─────────────────────────────────────────────────────────────────────────────

// ❌ LEAK — listener added on every render/mount, never removed
class BadComponent extends HTMLElement {
  connectedCallback() {
    window.addEventListener("resize", this.handleResize); // accumulates!
    document.addEventListener("keydown", this.handleKey);
  }

  handleResize() { /* ... */ }
  handleKey() { /* ... */ }
  // disconnectedCallback() missing → listeners stay after element removed
}

// ✅ FIXED — remove listeners on cleanup
class GoodComponent extends HTMLElement {
  connectedCallback() {
    this._resize = this.handleResize.bind(this);
    this._key    = this.handleKey.bind(this);
    window.addEventListener("resize", this._resize);
    document.addEventListener("keydown", this._key);
  }

  disconnectedCallback() {
    window.removeEventListener("resize", this._resize);
    document.removeEventListener("keydown", this._key);
  }

  handleResize() {}
  handleKey() {}
}

// ✅ AbortController pattern (cleaner multi-listener cleanup)
class ComponentWithAbort extends HTMLElement {
  connectedCallback() {
    this._controller = new AbortController();
    const { signal } = this._controller;

    window.addEventListener("resize", this.handleResize.bind(this), { signal });
    document.addEventListener("keydown", this.handleKey.bind(this), { signal });
    window.addEventListener("scroll", this.handleScroll.bind(this), { signal });
    // All three removed at once with one abort()
  }

  disconnectedCallback() {
    this._controller.abort(); // removes all listeners at once
  }

  handleResize() {}
  handleKey() {}
  handleScroll() {}
}

// React cleanup
import { useEffect } from "react";
function useWindowResize(handler) {
  useEffect(() => {
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler); // ← cleanup
  }, [handler]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CLOSURE RETAINING LARGE OBJECTS
// ─────────────────────────────────────────────────────────────────────────────

// ❌ LEAK — closure captures a reference to a large array
function createLeakyHandler() {
  const hugeData = new Array(1_000_000).fill("data"); // 8 MB+

  return function handleClick() {
    console.log("clicked"); // uses nothing from hugeData
    // BUT: hugeData is still kept alive because the closure was created in scope
    // Even though hugeData is never referenced in the function body,
    // in some JS engines the entire enclosing scope is retained.
  };
}

const leakyHandler = createLeakyHandler();
document.getElementById("btn")?.addEventListener("click", leakyHandler);

// ✅ FIXED — extract only what you need
function createHandler(message) {
  return function handleClick() {
    console.log(message); // only the small `message` string is retained
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DETACHED DOM NODES
// ─────────────────────────────────────────────────────────────────────────────

// ❌ LEAK — removed from DOM but still referenced in JS
let detachedTree;

function cacheNode() {
  const element = document.getElementById("menu");
  detachedTree = element; // holds reference
  document.body.removeChild(element); // removed from DOM
  // `element` is now a "detached" DOM node — still in memory via `detachedTree`
}

// ✅ FIXED — null out the reference when done
function removeAndFree() {
  const element = document.getElementById("menu");
  document.body.removeChild(element);
  detachedTree = null; // GC can now collect it
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. INTERVAL / TIMER NOT CLEARED
// ─────────────────────────────────────────────────────────────────────────────

// ❌ LEAK — interval keeps running and holds closure reference forever
function startPolling() {
  const data = fetchInitialData(); // large object
  setInterval(() => {
    updateUI(data); // closure retains `data` forever
  }, 1000);
}

// ✅ FIXED — store ID, clear on cleanup
function startPollingGood() {
  let data = fetchInitialData();
  const id = setInterval(() => {
    if (!document.getElementById("app")) {
      clearInterval(id); // stop if element gone
      data = null;       // release the reference
      return;
    }
    updateUI(data);
  }, 1000);

  return () => { clearInterval(id); data = null; }; // cleanup function
}

// React pattern
function usePoll(fn, interval) {
  useEffect(() => {
    const id = setInterval(fn, interval);
    return () => clearInterval(id); // cleanup on unmount
  }, [fn, interval]);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. REACT-SPECIFIC LEAKS
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";

// ❌ LEAK — async effect sets state after unmount
function BadFetch() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then((d) => setData(d)); // can fire after unmount!
  }, []);

  return <div>{JSON.stringify(data)}</div>;
}

// ✅ FIXED — use AbortController to cancel fetch on unmount
function GoodFetch() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/data", { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((err) => {
        if (err.name !== "AbortError") throw err;
      });

    return () => controller.abort(); // cleanup
  }, []);

  return <div>{JSON.stringify(data)}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. USING WeakMap/WeakSet FOR METADATA (prevents leaks)
// ─────────────────────────────────────────────────────────────────────────────

// ❌ MAP — holds strong reference; DOM node never GC'd
const elementDataBad = new Map();
function setMetaBad(el, data) {
  elementDataBad.set(el, data); // el stays alive in Map even after removal from DOM
}

// ✅ WEAKMAP — holds weak reference; if el is GC'd, entry is auto-removed
const elementDataGood = new WeakMap();
function setMetaGood(el, data) {
  elementDataGood.set(el, data); // no leak — GC'd with the element
}

// ─────────────────────────────────────────────────────────────────────────────
// DETECTING MEMORY LEAKS IN DEVTOOLS
// ─────────────────────────────────────────────────────────────────────────────
/*
  Chrome DevTools → Memory tab:

  1. Heap Snapshot
     • Take snapshot before action, perform action, take snapshot after
     • Compare → look for objects that shouldn't still exist
     • Filter for "Detached" in the class filter → detached DOM nodes

  2. Allocation Timeline
     • Record and interact with the page
     • Look for memory that allocates but never gets GC'd (saw-tooth vs stepwise)

  3. Allocation Sampling
     • Shows which functions allocated the most memory

  4. Performance monitor (DevTools → More tools → Performance monitor)
     • Watch JS heap size live — should plateau, not grow indefinitely

  Automation:
    • puppeteer + memwatch-next for leak detection in CI
    • jest-leak-detector for unit-level memory tests
*/

/**
 * CHECKLIST
 * ─────────
 *  [ ] Every addEventListener has a corresponding removeEventListener
 *  [ ] Use AbortController for multi-listener cleanup
 *  [ ] Every setInterval/setTimeout has a cleanup path
 *  [ ] React useEffect returns a cleanup function
 *  [ ] Async operations use AbortController to cancel on unmount
 *  [ ] Detached DOM nodes are null'd after removal
 *  [ ] Use WeakMap/WeakSet for DOM element metadata
 *  [ ] Don't store large datasets in global variables
 *  [ ] Use DevTools Memory tab to verify after changes
 */

function fetchInitialData() { return {}; }
function updateUI(data) {}
function div({ children }) { return null; }
