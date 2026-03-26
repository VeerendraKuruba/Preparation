import { useState } from 'react';

// VirtualList — renders only the visible rows of a potentially huge list.
// For 10,000 items only ~12 DOM nodes exist at any time, not 10,000.
// Assumes all rows have the same fixed rowHeight (uniform virtualization).
//
// Props:
//   items      — the FULL data array (all items, not just visible)
//   rowHeight  — fixed height in px for every row (must be uniform)
//   height     — height of the scrollable viewport in px
//   renderRow  — (item, index) => ReactNode
//   getKey     — (item, index) => string | number

export function VirtualList({ items, rowHeight, height, renderRow, getKey }) {
  // scrollTop — pixels scrolled from the top.
  // Stored in state: every scroll event triggers a re-render that
  // recalculates which rows belong in the DOM.
  const [scrollTop, setScrollTop] = useState(0);

  // total — height the container would need if ALL items were rendered.
  // This makes the scrollbar behave as if every item exists.
  const total = items.length * rowHeight;

  // start — index of the first row that is fully or partially visible.
  // Math.floor: include rows partially scrolled off the top.
  const start = Math.floor(scrollTop / rowHeight);

  // overscan — extra rows above/below the visible window.
  // Prevents a flash of empty space during fast scrolling.
  const overscan = 2;

  // visibleCount — rows that fit in the viewport, plus overscan buffer.
  // Math.ceil: include the partially-visible row at the bottom.
  const visibleCount = Math.ceil(height / rowHeight) + overscan;

  // end — exclusive upper bound of the rendered slice, clamped to array length.
  const end = Math.min(items.length, start + visibleCount);

  return (
    // Outer container: fixed height + overflow:auto = the scroll box.
    // onScroll updates scrollTop → triggers re-render → slides the window.
    <div
      style={{ height, overflow: 'auto', border: '1px solid #ccc' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {/* Full-height spacer: scrollbar is sized to total list height,
          not just the ~12 rendered rows.
          position:relative is required so the inner translateY child
          is offset from this element, not the page. */}
      <div style={{ height: total, position: 'relative' }}>

        {/* Rendered slice container: GPU-composited translateY positions
            the visible rows at the correct scroll offset without triggering
            a layout reflow on every scroll event.
            translateY = start * rowHeight pixels from the top of the spacer. */}
        <div style={{ transform: `translateY(${start * rowHeight}px)` }}>
          {items.slice(start, end).map((item, i) => {
            // i is relative to the slice (0, 1, 2…).
            // Compute the absolute index so renderRow and getKey receive
            // the correct position within the full items array.
            const index = start + i;

            return (
              // Fixed height on each row keeps the math above correct.
              // boxSizing:border-box: padding/border don't add to the height.
              <div
                key={getKey(item, index)}
                style={{ height: rowHeight, boxSizing: 'border-box' }}
              >
                {renderRow(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
