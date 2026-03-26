# 17. List Virtualization Deep Dive

> **Scope:** Virtualization implementation — react-window library, dynamic heights, scroll anchoring. For the broader optimization strategy (when to virtualize vs other options), see [16 — Optimize Large Lists](./16-optimize-large-lists.md).

## What Virtualization Is

Virtualization is the technique of maintaining only a small window of rendered DOM nodes that corresponds to the visible portion of a scrollable list. No matter how many items are in the data array — 1,000 or 1,000,000 — the browser only creates, layouts, and paints the nodes that are currently visible plus a small buffer above and below (the overscan).

The scroll container reports a full scroll height as if all items were rendered (achieved via a spacer element or padding), so the scrollbar behaves correctly and users can scroll naturally. As the user scrolls, the component replaces invisible rows with newly-visible ones by updating the `transform: translateY(...)` of the inner wrapper and re-slicing the data array.

**What it is NOT:** Virtualization does not lazily fetch data. It is purely a rendering optimization. The full data array is expected to be in memory; only the DOM representation is limited.

---

## Fixed-Height Virtualization From Scratch

Fixed-height virtualization is the simplest case and the one you should be able to implement live in an interview. Every row is the same pixel height, so the math is pure arithmetic.

```jsx
import { useState, useRef, useCallback } from 'react';

const ROW_HEIGHT = 48;    // pixels — every row is exactly this tall
const OVERSCAN = 3;       // extra rows to render above and below the viewport

function VirtualList({ items, containerHeight }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const onScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // --- The Core Math ---

  // How many rows fit in the viewport (partial rows count, so ceil)
  const visibleRowCount = Math.ceil(containerHeight / ROW_HEIGHT);

  // The index of the first row that intersects the viewport.
  // scrollTop / ROW_HEIGHT gives the exact float — floor gives the first fully/partially visible row.
  const firstVisible = Math.floor(scrollTop / ROW_HEIGHT);

  // Clamp start with overscan: render OVERSCAN rows above the viewport too.
  const startIndex = Math.max(0, firstVisible - OVERSCAN);

  // Clamp end with overscan: render OVERSCAN rows below the viewport too.
  const endIndex = Math.min(items.length - 1, firstVisible + visibleRowCount + OVERSCAN);

  // The slice we actually render.
  const visibleItems = items.slice(startIndex, endIndex + 1);

  // Total height of the scroll content — the scrollbar uses this.
  const totalHeight = items.length * ROW_HEIGHT;

  // Offset to push rendered rows to their correct position.
  // Row 0 → translateY(0). Row 50 → translateY(2400px).
  const offsetY = startIndex * ROW_HEIGHT;

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{ height: containerHeight, overflow: 'auto', position: 'relative' }}
    >
      {/* Spacer: makes the scrollbar reflect total content height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Inner wrapper shifted down to where the visible window starts */}
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div
              key={item.id}
              style={{ height: ROW_HEIGHT, boxSizing: 'border-box' }}
            >
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Walkthrough of the math:**
- `scrollTop = 0` → `firstVisible = 0`, `startIndex = 0`, render rows 0 to `visibleRowCount + OVERSCAN`.
- `scrollTop = 480` (row height 48px, 10 rows scrolled) → `firstVisible = 10`, `startIndex = 7`, `endIndex = 10 + visibleRowCount + 3`. Rows 7–26 are mounted; rows 0–6 and 27+ don't exist in the DOM.
- `offsetY = 7 * 48 = 336px` → the rendered block is pushed down exactly where those rows should visually appear.

---

## Dynamic-Height Virtualization

When rows have different heights (chat bubbles, expandable cards, multi-line text), the fixed-row-height formula breaks. You need to measure each row and accumulate offsets.

### Strategy: Measure With ResizeObserver, Cache Heights, Estimate for Unmeasured

```jsx
import { useRef, useState, useCallback, useLayoutEffect } from 'react';

const ESTIMATED_HEIGHT = 80; // Used for rows not yet measured

function useMeasuredHeights(itemCount) {
  // heightMap: index → measured pixel height
  const heightMap = useRef(new Map());
  // Force a re-render when heights change so the list recomputes positions
  const [, forceUpdate] = useState(0);

  const measureRef = useCallback((index, el) => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const h = entry.contentRect.height;
      if (heightMap.current.get(index) !== h) {
        heightMap.current.set(index, h);
        forceUpdate(n => n + 1);
      }
    });
    observer.observe(el);
    // Return cleanup so the row component can disconnect on unmount
    return () => observer.disconnect();
  }, []);

  // Precompute cumulative offsets (prefix sums) so lookups are O(1)
  const getOffset = useCallback((index) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += heightMap.current.get(i) ?? ESTIMATED_HEIGHT;
    }
    return offset;
  }, []);

  const getHeight = useCallback((index) => {
    return heightMap.current.get(index) ?? ESTIMATED_HEIGHT;
  }, []);

  const totalHeight = Array.from({ length: itemCount }, (_, i) =>
    heightMap.current.get(i) ?? ESTIMATED_HEIGHT
  ).reduce((a, b) => a + b, 0);

  return { measureRef, getOffset, getHeight, totalHeight };
}
```

**Production note:** Computing `getOffset` with a for-loop is O(n). For very large lists, precompute a prefix-sum array and binary-search for the `firstVisible` index. `@tanstack/react-virtual` and `react-window` both do this internally.

### Finding firstVisible With Variable Heights

```js
// Given a scrollTop, binary search the prefix sum array for the first visible index.
function findFirstVisibleIndex(prefixSums, scrollTop) {
  let lo = 0, hi = prefixSums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (prefixSums[mid] <= scrollTop) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}
```

---

## Overscan: Why It Exists and How Much

**Why it exists:** Without overscan, a user scrolling quickly would see a flash of blank space. The browser needs time to render newly-entered rows. Overscan pre-renders rows just outside the viewport so they are ready before the user reaches them.

**How much:** The typical default in production virtualizers is 3–5 rows above and below. `react-window` defaults to `overscanCount={2}`. `@tanstack/react-virtual` uses `overscan={3}`.

**Trade-off table:**

| Overscan Count | Pro | Con |
|---|---|---|
| 0 | Minimum DOM nodes | Visible blank gap on fast scroll |
| 3–5 | Good balance for typical scroll speed | Slightly more DOM nodes |
| 10+ | Rarely sees blank gaps | Approaches unvirtualized cost; defeats the purpose |

For momentum scroll on touch devices, consider a higher overscan (5–8) because the browser can scroll several hundred pixels per frame during a flick gesture.

---

## Scroll Anchoring for Prepend (New Messages at Top)

This is a classic chat application problem: new messages arrive at the top of the list, but the user is reading message #500 in the middle. Inserting items at index 0 shifts all indices and would jump the scroll position by `newItems.length * rowHeight` pixels unless you compensate.

**Approach 1: Scroll position correction**

```jsx
function prependItems(newItems) {
  // Capture scroll position and total height before the state update
  const prevScrollHeight = containerRef.current.scrollHeight;
  const prevScrollTop = containerRef.current.scrollTop;

  setItems(current => [...newItems, ...current]);

  // After React updates the DOM, restore the user's position
  requestAnimationFrame(() => {
    const newScrollHeight = containerRef.current.scrollHeight;
    const heightAdded = newScrollHeight - prevScrollHeight;
    containerRef.current.scrollTop = prevScrollTop + heightAdded;
  });
}
```

**Approach 2: CSS `overflow-anchor`**

By default, browsers implement scroll anchoring — they try to keep the visible content stable when content is inserted above. However this does not work reliably in virtualized lists because the DOM nodes are replaced, not repositioned. Explicit correction (as above) is more reliable.

**Approach 3: Reverse the list**

Render the list in reverse order (most recent at top, `flex-direction: column-reverse`) so new items append at the logical "bottom" of the flex container, which is visually the top. No scroll correction needed. Trade-off: keyboard navigation and accessibility landmark order is reversed.

---

## Common Pitfalls

### Keys by Index (Breaks Recycling)
```jsx
// BAD: React reuses DOM nodes but in the wrong order.
// When startIndex changes from 0 to 10, the key "0" now maps to items[10].
// React sees the same key and reuses the component with wrong data.
visibleItems.map((item, i) => <Row key={i} item={item} />)

// GOOD: Key by stable domain id, not render-time index.
visibleItems.map(item => <Row key={item.id} item={item} />)
```

### Inline Styles That Force Layout
```jsx
// BAD: Reading clientHeight inside render synchronously forces layout flush.
const height = rowRef.current?.clientHeight; // triggers layout
return <div style={{ height }}>...</div>;

// GOOD: Measure in a useLayoutEffect or ResizeObserver callback,
// store in state/ref, and use the cached value.
```

### Measuring in Render
Do not call any DOM measurement API (`getBoundingClientRect`, `offsetHeight`, `scrollHeight`) during the render phase. Measurements must happen in `useLayoutEffect` (synchronous after paint) or in a `ResizeObserver` callback (asynchronous).

### Forgetting to Account for Padding/Border in Row Height
If your row CSS includes `padding: 16px` and `border-bottom: 1px solid`, the total height is `content + 32 + 1 = content + 33px`. Measure `entry.borderBoxSize[0].blockSize` from ResizeObserver (not `contentRect.height`) if you have padding/border to account for.

---

## When NOT to Virtualize

| Situation | Why Skip Virtualization |
|---|---|
| Fewer than ~100 items | The overhead of scroll event handling + position math is not worth it. A simple flat list renders in < 16ms. |
| SEO requires full DOM | Virtualized content is not in the DOM when the page loads. Google's crawler may not scroll to trigger rendering of items 200+. Use SSR with pagination instead. |
| `Ctrl+F` in-page search | Browser find-in-page only searches rendered DOM. Virtualized items out of view are invisible to the find bar. |
| Accessibility-heavy content | Screen readers traverse the DOM tree. A NVDA/VoiceOver user navigating a virtualized list by arrow key will skip items that are not mounted. Use `aria-rowcount` + `aria-rowindex` attributes and test thoroughly, or use pagination. |
| `position: sticky` headers inside rows | Sticky positioning requires the element to exist in the scroll container's ancestor chain. Virtual lists replace DOM nodes and sticky headers will disappear when their row scrolls out of the render window. |
| Print stylesheets | `@media print` renders the full document. A virtualized list will only print ~20 rows. Provide a separate print-friendly view. |

---

## Interview Sound Bite

"Virtualization means keeping only ~20–40 DOM nodes alive while showing a list of any length. The scroll container gets its full height from a spacer element so the scrollbar works correctly, and the visible slice is positioned with `translateY(startIndex * rowHeight)`. For fixed-height rows the math is `floor(scrollTop / rowHeight)` for the first visible index — I can implement that from scratch in 30 lines. For dynamic heights I'd use a ResizeObserver to measure each row, cache the heights in a Map, and binary-search a prefix-sum array to find the first visible row. Overscan of 3–5 rows prevents blank flashes during fast scroll. I'd skip virtualization entirely for lists under 100 items, SEO-critical content, or accessibility-heavy interfaces where the DOM presence matters to screen readers."
