# Browser APIs — Adobe Senior Frontend (Round 2)

> Adobe R2 explicitly tests **browser APIs**. Creative Cloud Web, Express, and Document Cloud live or die on the browser primitives: storage, network, observation, performance, workers, canvas. Expect *implement-from-scratch* and *explain-the-tradeoffs* questions, not trivia recall.

---

## 1. Event Loop, Microtasks vs Macrotasks

**Q: Walk me through the event loop. Why does this print `1 4 3 2` and not `1 2 3 4`?**

```js
console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);
```

**Answer:**
- `1` and `4` run synchronously on the call stack.
- `setTimeout` queues a **macrotask** (task queue).
- `Promise.then` queues a **microtask** (microtask queue).
- After the stack empties, the event loop **drains all microtasks** before picking the next macrotask. So `3` (microtask) runs before `2` (macrotask).

**Key rule:** Microtask queue empties to zero between every macrotask. A long microtask chain can starve the UI — `requestAnimationFrame` and rendering are macrotasks.

**Follow-up:** Where does `queueMicrotask` fit? Same queue as `Promise.then` — use it when you need "do this right after the current sync code, but before the next paint".

---

## 2. IntersectionObserver — Infinite Scroll, Lazy Load

**Q: Implement infinite scroll without listening to `scroll`.**

```js
function infiniteScroll(sentinelEl, loadMore) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) loadMore();
      });
    },
    { rootMargin: '200px' } // trigger 200px before sentinel enters viewport
  );
  observer.observe(sentinelEl);
  return () => observer.disconnect();
}
```

**Why this over `scroll` events:**
- `scroll` fires 60+ times/sec — needs throttling.
- IntersectionObserver runs **off the main thread** — the browser batches and reports asynchronously.
- No layout thrash (no calling `getBoundingClientRect` per frame).

**Follow-up:** `threshold: [0, 0.5, 1]` fires callback at 0%, 50%, 100% visible — used for view-tracking analytics.

---

## 3. MutationObserver vs ResizeObserver

**Q: When would you use each?**

| API | Watches | Use case |
|-----|---------|----------|
| MutationObserver | DOM tree changes (childList, attributes, characterData) | Detect external scripts injecting nodes; auto-init widgets in a CMS |
| ResizeObserver | Element box-size changes | Responsive components that depend on their container, not viewport |
| IntersectionObserver | Visibility relative to ancestor/viewport | Lazy-load, infinite scroll, analytics |

```js
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width } = entry.contentRect;
    entry.target.classList.toggle('compact', width < 400);
  }
});
ro.observe(cardEl);
```

**Senior signal:** Mention that `ResizeObserver` solves the *container query* problem that media queries can't — media queries only know about the viewport, not the parent.

---

## 4. Storage APIs — Cookies vs localStorage vs sessionStorage vs IndexedDB

**Q: A user opens Adobe Express in two tabs and edits a doc. Where do you store autosave drafts?**

| Storage | Size | Scope | Sync? | Best for |
|---------|------|-------|-------|----------|
| Cookie | 4KB | Per-domain, sent with every request | Sync | Auth tokens (httpOnly) |
| localStorage | ~5MB | Per-origin, persists | Sync (blocks main thread) | Small user prefs |
| sessionStorage | ~5MB | Per-tab | Sync | Tab-scoped state |
| IndexedDB | GBs | Per-origin | Async | Large structured data, offline |
| Cache API | GBs | Per-origin | Async (Promises) | HTTP response caching (SW) |

**Answer:** IndexedDB. Autosave drafts can be large (images, multi-MB documents), and localStorage's synchronous blocking will jank the UI. Two-tab problem → key by `docId + tabId`, broadcast changes via `BroadcastChannel` so tabs reconcile.

```js
const ch = new BroadcastChannel('express-doc-42');
ch.onmessage = (e) => mergeRemoteEdit(e.data);
ch.postMessage({ op: 'insert', at: 5, char: 'A' });
```

---

## 5. Web Workers — When and Why

**Q: When would you use a Web Worker in a creative tool like Adobe Express?**

**Use cases:**
- Image filters (blur, color transforms) — pixel arithmetic on a `Uint8ClampedArray`
- Large JSON parsing
- PDF parsing (Document Cloud)
- Cryptographic ops
- Diffing large documents for collaborative edit

**Pattern:**
```js
// main.js
const worker = new Worker('/filter.js');
worker.postMessage({ imageData, filter: 'blur', radius: 5 });
worker.onmessage = (e) => ctx.putImageData(e.data, 0, 0);

// filter.js
self.onmessage = (e) => {
  const { imageData, filter, radius } = e.data;
  const result = applyFilter(imageData, filter, radius);
  // Transferable — zero-copy ownership transfer
  self.postMessage(result, [result.data.buffer]);
};
```

**Senior signal:** Mention **Transferable Objects** (`ArrayBuffer`, `ImageBitmap`, `OffscreenCanvas`) — they move ownership instead of copying, critical for image data.

**Service Worker vs Web Worker:** SW intercepts network requests and powers offline/PWA; Web Worker just runs computation off the main thread.

---

## 6. requestAnimationFrame vs setTimeout vs requestIdleCallback

**Q: You're animating a sidebar slide-in. Which do you use?**

- `requestAnimationFrame(cb)` — runs before the next paint, ~16.67ms cadence at 60Hz. Browser pauses it in background tabs. **Use for animations.**
- `setTimeout(cb, 16)` — not aligned to the paint cycle, will tear and drop frames.
- `requestIdleCallback(cb)` — runs when the browser is idle. Use for analytics flushes, prefetching, low-priority work. **Never** for visible animations.

```js
function animate(el, targetX) {
  const start = performance.now();
  const startX = el.offsetLeft;
  function frame(now) {
    const t = Math.min(1, (now - start) / 300);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    el.style.transform = `translateX(${startX + (targetX - startX) * eased}px)`;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
```

**Senior signal:** Animate with `transform` and `opacity` only — those are **composited** (run on GPU, off the main thread). Animating `left`, `top`, `width` triggers layout on every frame.

---

## 7. Fetch, AbortController, Cancellation

**Q: User types in a search box. How do you cancel in-flight requests on each new keystroke?**

```js
let controller;
async function search(query) {
  if (controller) controller.abort(); // cancel previous
  controller = new AbortController();
  try {
    const res = await fetch(`/api/search?q=${query}`, { signal: controller.signal });
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') return; // expected, ignore
    throw err;
  }
}
```

**Follow-up:** `AbortController` also works with `addEventListener({ signal })` — single cleanup for many listeners. Pair it with debounce for the full pattern.

---

## 8. Performance APIs

**Q: How do you measure if your app meets Core Web Vitals?**

```js
// Largest Contentful Paint
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const last = entries[entries.length - 1];
  console.log('LCP:', last.renderTime || last.loadTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });

// Cumulative Layout Shift
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) clsScore += entry.value;
  }
}).observe({ type: 'layout-shift', buffered: true });

// Custom marks
performance.mark('editor-init-start');
initEditor();
performance.mark('editor-init-end');
performance.measure('editor-init', 'editor-init-start', 'editor-init-end');
```

**Core Web Vitals thresholds (2026):**
- **LCP** (Largest Contentful Paint): < 2.5s
- **INP** (Interaction to Next Paint, replaced FID in 2024): < 200ms
- **CLS** (Cumulative Layout Shift): < 0.1

---

## 9. Critical Rendering Path

**Q: Walk me from `<html>` arriving at the browser to first paint.**

1. **Parse HTML** → DOM tree.
2. **Parse CSS** → CSSOM tree.
3. **Render tree** = DOM ∪ CSSOM (only visible nodes).
4. **Layout** (a.k.a. reflow) — compute box geometry.
5. **Paint** — fill pixels in layers.
6. **Composite** — assemble layers on GPU.

**Blockers:**
- `<script>` (without `defer`/`async`) blocks parsing.
- `<link rel="stylesheet">` blocks rendering (not parsing).
- Synchronous JS that reads layout properties (e.g. `offsetTop`) forces a sync layout.

**Senior optimizations:**
- `<link rel="preload">` for fonts/critical CSS.
- `<script defer>` for scripts that need the DOM.
- `<script async>` for independent scripts (analytics).
- Inline critical CSS, lazy-load the rest.
- Avoid **layout thrashing**: batch reads then writes (or use `requestAnimationFrame`).

---

## 10. CORS — How It Actually Works

**Q: Why does the browser send an `OPTIONS` request before my `PUT`?**

**Answer:** Cross-origin requests are split into *simple* and *preflighted*. A request is simple only if:
- Method is `GET`, `HEAD`, or `POST`
- No custom headers (except a short safelist)
- `Content-Type` is `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain`

Anything else (PUT, DELETE, `Content-Type: application/json`, `Authorization` header) triggers a **preflight** `OPTIONS` request. Server must respond with:

```
Access-Control-Allow-Origin: https://your.app
Access-Control-Allow-Methods: PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

**Credentials gotcha:** If you send cookies (`credentials: 'include'`), the server can't reply with `Access-Control-Allow-Origin: *` — it must echo the exact origin, and add `Access-Control-Allow-Credentials: true`.

---

## 11. Canvas vs SVG vs WebGL

**Q: Adobe Express has a vector editor. Canvas, SVG, or WebGL?**

| | DOM-based | Pixel-based | GPU |
|---|---|---|---|
| SVG | Yes — each shape is a node | No | No |
| Canvas 2D | No | Yes (raster, 2D context) | No |
| WebGL / WebGL2 | No | Yes | Yes |

- **SVG**: best for <1000 shapes, accessibility (each element is in the DOM), declarative styling. Bad for animations of thousands of nodes.
- **Canvas 2D**: imperative draws, fast for many shapes, no DOM bloat. You handle hit-testing yourself.
- **WebGL**: shaders, transforms, filters — needed for Photoshop-on-web class work. Steepest learning curve.

For Adobe Express, **Canvas 2D + occasional WebGL filters** is typical. Pure SVG breaks down past a few hundred shapes.

---

## 12. Event Delegation

**Q: 10,000 list items, each with a click handler. Problem? Fix?**

**Problem:** 10,000 listener allocations = memory bloat; re-rendering tears them down and rebuilds.

**Fix:** Attach one listener on the parent, use `event.target` + `closest()`:

```js
list.addEventListener('click', (e) => {
  const item = e.target.closest('[data-id]');
  if (!item || !list.contains(item)) return;
  handleSelect(item.dataset.id);
});
```

**Senior nuances:**
- Some events don't bubble: `focus`, `blur`, `mouseenter`, `mouseleave`. Use `focusin`/`focusout` / `mouseover`/`mouseout` instead, or capture phase.
- React's synthetic event system delegates everything to the root by default (since React 17, the React root, not document).

---

## 13. Shadow DOM and Custom Elements

**Q: Why would Adobe use Web Components?**

- **Style encapsulation** — Spectrum styles don't leak; consumer styles don't bleed in.
- **Framework-agnostic distribution** — Adobe Express widget embeds in a Wix site (no React on the host page).
- **Slots** — host page passes content in declaratively.

```js
class StarRating extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  connectedCallback() {
    const max = +this.getAttribute('max') || 5;
    this.shadowRoot.innerHTML = `
      <style>:host { display: inline-flex; gap: 4px; }</style>
      ${Array.from({ length: max }, (_, i) => `<span data-i="${i}">★</span>`).join('')}
    `;
  }
}
customElements.define('star-rating', StarRating);
```

---

## What Adobe Cares About (Round 2 Signal)

When you answer browser-API questions, frame in three layers:
1. **What the API guarantees** (spec-level: when callbacks fire, what's transferable, what's async).
2. **Performance implications** (does it block the main thread? Trigger layout? GPU-composited?).
3. **Tradeoffs vs alternatives** (why IntersectionObserver vs scroll; Canvas vs SVG; IndexedDB vs localStorage).

That three-layer answer is the senior signal. Anyone can name the API; only seniors explain *why pick it*.
