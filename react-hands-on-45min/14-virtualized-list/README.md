# Virtualized List

## What to Build

A list of 10,000 items that scrolls smoothly without freezing the browser. The key insight: only render the ~10 rows the user can actually see, not all 10,000.

---

## The Problem with 10,000 divs

Mounting 10,000 DOM nodes:

- Takes ~2–5 seconds of main-thread work on initial render
- Consumes hundreds of MB of memory
- Makes every scroll event slow because the browser must update layout for all nodes
- Causes the tab to feel frozen or unresponsive

Virtualization solves all of these by keeping only ~12 DOM nodes alive at any time.

---

## How Virtualization Works

```
Scrollable container (400px tall)
┌─────────────────────────────┐  ← scrollTop = 1000px
│  [ Item 26 ]  (visible)     │
│  [ Item 27 ]  (visible)     │
│  [ Item 28 ]  (visible)     │
│  [ Item 29 ]  (visible)     │
│  [ Item 30 ]  (visible)     │
└─────────────────────────────┘

Full-height spacer = 10000 * rowHeight px (makes scrollbar correct)
Only items 25–32 exist in the DOM (visible range + 2 overscan)
```

---

## Props

| Prop        | Type       | Description                             |
|-------------|------------|-----------------------------------------|
| `items`     | array      | The full data array (all 10,000 items)  |
| `rowHeight` | number     | Fixed height in px for every row        |
| `height`    | number     | Height of the scrollable viewport in px |
| `renderRow` | function   | `(item, index) => ReactNode`            |
| `getKey`    | function   | `(item, index) => string\|number`       |

---

## The Math

```js
const start = Math.floor(scrollTop / rowHeight);
// scrollTop = 1000, rowHeight = 40 → start = 25

const visibleCount = Math.ceil(height / rowHeight) + overscan;
// height = 400, rowHeight = 40, overscan = 2 → visibleCount = 12

const end = Math.min(items.length, start + visibleCount);
// end = 25 + 12 = 37  (clamped to array length)
```

Only `items.slice(25, 37)` — 12 items — are ever in the DOM at this scroll position.

---

## Positioning with transform: translateY

```jsx
<div style={{ height: total, position: 'relative' }}>     {/* full-height spacer */}
  <div style={{ transform: `translateY(${start * rowHeight}px)` }}>
    {/* rendered slice — 12 items */}
  </div>
</div>
```

The rendered slice must appear at the correct position within the spacer. `translateY(start * rowHeight)` pushes it down exactly to where those rows would be if all rows were rendered.

**Why `transform` and not `marginTop` or `top`?**

`top` and `marginTop` trigger a **layout reflow** — the browser recalculates box positions for potentially many elements. `transform: translateY` is composited on the **GPU** — applied without a full layout pass. At 60 scroll events per second the difference is very noticeable on long lists.

---

## The Full-Height Spacer

```jsx
<div style={{ height: items.length * rowHeight, position: 'relative' }}>
```

The scrollbar is sized by the browser based on the total scrollable content height. This div has the height the container would need if all items were rendered. Without it, the scrollbar thumb would be enormous (sized for only 12 rows) and clicking near the bottom of the scrollbar would only jump a short distance.

---

## Overscan

```js
const overscan = 2;
const visibleCount = Math.ceil(height / rowHeight) + overscan;
```

Renders 2 extra rows above and below the visible window. When the user scrolls fast, the browser may paint a frame before React's re-render completes. Overscan ensures there is always rendered content just outside the viewport, preventing a brief flash of empty white space.

---

## Interview Questions

**Q: What is wrong with rendering 10,000 div elements?**

Mounting 10,000 DOM nodes requires the browser to parse, create, style, and lay out each one. This blocks the main thread for seconds. Memory consumption is high. Every scroll event that triggers layout recalculation must account for all 10,000 nodes. Virtualization limits the DOM to ~12 nodes regardless of list size, so mount time and scroll performance are constant.

---

**Q: How does translateY positioning work?**

The rendered slice sits inside a full-height spacer div. `translateY(start * rowHeight)` moves the slice down to the exact pixel offset where those rows would naturally sit. It is equivalent to putting `margin-top: start * rowHeight` but without the layout cost. The GPU applies the transform in a compositing step that bypasses the layout and paint phases, making it suitable for 60fps scroll handlers.

---

**Q: What is overscan?**

Overscan is a buffer of extra rows rendered above and below the currently visible range. It exists because scroll events and React re-renders are not perfectly synchronized with the browser's paint cycle. If only the exactly-visible rows were rendered, fast scrolling could briefly expose an unpainted area. Overscan fills that gap — typically 2–5 extra rows is sufficient.

---

**Q: This uses fixed row height. How would you handle variable-height rows?**

You would need to store a cumulative offset array: `offsets[i]` = sum of heights of rows `0..i-1`. The start index for a given `scrollTop` is found via binary search on `offsets`. After each row mounts, it measures its own height with a `ResizeObserver` or `ref` callback and updates the offset cache. Libraries like `react-window` (fixed) and `react-virtual` / `@tanstack/virtual` (variable) implement this pattern.
