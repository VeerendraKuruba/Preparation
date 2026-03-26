# 16. Optimize Rendering of Large Lists

> **Scope:** Optimization strategy — when to virtualize, memoize, or use CSS containment. For library implementation details (react-window, measured rows, overscan), see [17 — List Virtualization](./17-list-virtualization.md).

## Problem Statement: What Goes Wrong With 10,000 Unvirtualized Rows

When you render 10,000 `<div>` or `<tr>` elements into the DOM at once, several cascading problems occur:

**Layout Thrash:** The browser must calculate the position and size of every node. A single scroll event triggers style recalculation and layout for all 10,000 nodes. Touching a DOM node's geometry inside a loop (read `offsetHeight`, write style, read again) forces the browser to flush its pending layout queue each cycle — this is layout thrashing.

**Memory Pressure:** Each mounted React component instance holds a fiber node, event listeners, refs, and associated JavaScript objects. 10,000 rows with 10 fields each easily allocates 50–100MB of live JavaScript heap, triggering frequent garbage collection pauses that show up as jank.

**Frame Drops:** Browsers target 60fps (16.67ms per frame). If a single render cycle — caused by a state change, a scroll event, or a filter input — takes 200ms to process 10,000 rows, the browser drops 11 frames. Users see a frozen UI. INP (Interaction to Next Paint) spikes to 200ms+, which is a Core Web Vital failure.

**Reconciliation Cost:** React's virtual DOM diffing is O(n) on the number of components. Every keystroke on a search input triggers a full reconciliation of 10,000 row components unless you intervene.

---

## Solution Hierarchy (Apply in This Order)

### 1. Virtualize the List (Biggest Win)

Only render rows that are visible in the viewport plus a small overscan buffer. Regardless of 10,000 or 1,000,000 rows, the DOM holds 20–40 nodes at any given time.

### 2. Memoize Row Components

Prevent rows that are already visible from re-rendering when unrelated state changes.

### 3. Use Stable Keys

Give React the information it needs to reuse existing DOM nodes during reorder/filter operations instead of destroying and recreating them.

### 4. Apply CSS Containment

For cases where full virtualization is not feasible (e.g., server-side rendered static content), `content-visibility: auto` lets the browser skip rendering off-screen sections entirely.

---

## Code: react-window VariableSizeList With Measured Row Cache

Use this when row heights differ (e.g., chat messages, cards with varying content).

```jsx
import React, { useRef, useCallback, useEffect } from 'react';
import { VariableSizeList } from 'react-window';

// Cache stores measured heights by item index.
// Pre-fill with an estimated height so unmeasured rows don't collapse.
const ESTIMATED_ROW_HEIGHT = 80;
const heightCache = new Map();

function getItemSize(index) {
  return heightCache.get(index) ?? ESTIMATED_ROW_HEIGHT;
}

// Row component: measures its own height and updates the cache + notifies the list.
const Row = React.memo(({ index, style, data }) => {
  const rowRef = useRef(null);
  const { items, onHeightChange } = data;

  useEffect(() => {
    if (!rowRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const measuredHeight = entry.contentRect.height;
      const cached = heightCache.get(index);

      // Only trigger a list reset if the height actually changed.
      if (cached !== measuredHeight) {
        heightCache.set(index, measuredHeight);
        onHeightChange(index);
      }
    });

    observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, [index, onHeightChange]);

  return (
    // The outer div uses the style from react-window (position: absolute, top, width).
    // The inner div is what we measure — it can grow freely.
    <div style={style}>
      <div ref={rowRef} className="row-content">
        <span>{items[index].id}</span>
        <p>{items[index].body}</p>
      </div>
    </div>
  );
}, (prev, next) => prev.index === next.index && prev.data.items[prev.index] === next.data.items[next.index]);

export function VirtualizedList({ items }) {
  const listRef = useRef(null);

  // When a row's height changes, tell react-window to recompute from that index downward.
  const onHeightChange = useCallback((index) => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(index, false);
    }
  }, []);

  const itemData = { items, onHeightChange };

  return (
    <VariableSizeList
      ref={listRef}
      height={600}          // viewport height of the scroll container
      itemCount={items.length}
      itemSize={getItemSize} // called per index
      itemData={itemData}
      overscanCount={5}      // render 5 extra rows above and below viewport
      width="100%"
    >
      {Row}
    </VariableSizeList>
  );
}
```

**Why `resetAfterIndex`?** react-window uses a position cache. When a row changes height, all rows below it shift down. `resetAfterIndex` invalidates the cache from that point forward so scroll positions stay correct.

---

## Code: React.memo on Row Component With Custom Comparator

The default `React.memo` does a shallow equality check on all props. If your row receives complex objects, write a custom comparator to be precise about what actually matters.

```jsx
function rowPropsAreEqual(prevProps, nextProps) {
  // Only re-render if the data for this specific row changed.
  // Ignore changes to the list's scroll position (index is stable for a given row).
  if (prevProps.index !== nextProps.index) return false;

  const prevItem = prevProps.data.items[prevProps.index];
  const nextItem = nextProps.data.items[nextProps.index];

  // Compare by a version/updatedAt field if available — much cheaper than deep equality.
  return prevItem.updatedAt === nextItem.updatedAt && prevItem.id === nextItem.id;
}

const MemoizedRow = React.memo(Row, rowPropsAreEqual);
```

**Trade-off:** A custom comparator that misses a changed field causes a stale render. Prefer this only when you have a reliable version/hash field on each item. For simpler cases, the default shallow check plus stable `itemData` reference (achieved via `useMemo` on the parent) is safer.

```jsx
// In the parent, stabilize itemData so the reference does not change on every render.
const itemData = useMemo(() => ({ items, onHeightChange }), [items, onHeightChange]);
```

---

## Code: content-visibility: auto as a CSS-Only Alternative

`content-visibility: auto` is a CSS property that instructs the browser to skip layout and paint for off-screen elements. It is a browser-level virtualization that does not remove nodes from the DOM.

```css
.list-item {
  /* Tell the browser it can skip rendering this element if it is off-screen */
  content-visibility: auto;

  /* REQUIRED: give the browser an estimated size so it can calculate scroll height
     without having to render every item. Without this, scroll position is wrong. */
  contain-intrinsic-size: auto 80px;
}
```

```jsx
function StaticList({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} className="list-item">
          <ItemCard item={item} />
        </li>
      ))}
    </ul>
  );
}
```

**Caveats and When NOT to Use This:**
- All DOM nodes are still created and exist in memory — you get paint/layout savings but not memory savings.
- `contain-intrinsic-size` is an estimate. If actual heights vary widely, the scrollbar will jump as the user scrolls through sections that get rendered for the first time.
- Off-screen content is not accessible to `Ctrl+F` in-page search until the browser renders it.
- Screen readers may not read content that has not been rendered. Use with caution for content that must be accessible.
- Not supported in Firefox prior to version 109.

**Use case:** Long, mostly-static articles or product catalog pages where DOM node count is the concern but full JS virtualization is over-engineering.

---

## When Each Technique Applies

| Scenario | Best Approach |
|---|---|
| Fixed-height rows, uniform list | `react-window` `FixedSizeList` — simplest, fastest math |
| Variable row heights (chat, feed) | `react-window` `VariableSizeList` with ResizeObserver cache |
| Truly static content (blog, docs) | `content-visibility: auto` — CSS-only, no JS runtime cost |
| SSR + SEO required | `content-visibility: auto` (DOM exists) or pagination |
| Accessibility-critical content | Skip `content-visibility`, use pagination or true virtualization with ARIA roles |
| Complex scroll behaviors (sticky, nested) | `@tanstack/react-virtual` (more flexible API than react-window) |
| 2D grid (spreadsheet) | `react-window` `FixedSizeGrid` or `VariableSizeGrid` |

---

## Metrics to Prove Improvement

After applying optimizations, measure these in Chrome DevTools and Lighthouse:

**Mounted DOM Node Count**
Open DevTools > Elements, or run `document.querySelectorAll('*').length` before and after. Target: DOM should not grow proportionally with list length. A virtualized list of 10,000 items should still show ~20–40 row nodes.

**Long Task Duration**
Open DevTools > Performance > record a scroll. Look for orange bars labelled "Long Task" (tasks > 50ms). Pre-optimization, you might see 200–500ms tasks during scroll. Post-virtualization, scroll tasks should stay under 16ms.

**INP (Interaction to Next Paint)**
Use Chrome's web-vitals library or `PerformanceObserver` with `event` entry type. Filter interactions on the list (click, keypress). Target: INP < 200ms (good), < 500ms (needs improvement), > 500ms (poor).

```js
// Measure INP in the browser
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.interactionId) {
      console.log('INP candidate:', entry.duration, 'ms', entry.name);
    }
  }
}).observe({ type: 'event', buffered: true, durationThreshold: 16 });
```

**Memory Usage**
DevTools > Memory > Take Heap Snapshot before and after mounting the list. Compare the total heap size. A correctly virtualized list should not grow significantly as item count increases.

---

## Interview Sound Bite

"The root cause is that the browser has to layout, paint, and reconcile all 10,000 nodes every frame. My fix hierarchy is: first virtualize so we only mount 20–40 DOM nodes regardless of list size — I'd reach for `react-window` with `FixedSizeList` for uniform rows or `VariableSizeList` with a `ResizeObserver` height cache for dynamic ones. Then memoize row components with `React.memo` and a custom comparator keyed on an `updatedAt` field, and stabilize `itemData` with `useMemo` to prevent prop churn. For purely static SSR content I'd add `content-visibility: auto` with `contain-intrinsic-size` as a CSS-only layer. I'd prove the improvement by measuring mounted DOM node count, long task duration in the Performance tab, and INP via `PerformanceObserver`."
