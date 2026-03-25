# 17. Implement list virtualization

## Idea

The scroll container has a **full scroll height** (e.g. `rowCount * rowHeight`), but only **visible rows + overscan** are mounted. `scrollTop` maps to `startIndex`; slice `items[startIndex:endIndex]`; translate the inner wrapper by `startIndex * rowHeight`.

## Fixed vs variable height

- **Fixed height** — simplest math, easy in interviews.
- **Variable height** — measure and cache row sizes (`ResizeObserver`), or use a library (`@tanstack/react-virtual`).

## Reference implementation

See runnable example: [`../../react-hands-on-45min/virtualized-list.jsx`](../../react-hands-on-45min/virtualized-list.jsx) or duplicate a minimal window in the app.

## Pitfalls

- Scroll-to-index / keyboard focus into unloaded rows needs special handling.
- `position: sticky` inside virtual lists is harder.

## Minute summary

“**Outer scroll, inner spacer, translateY offset, slice + overscan**; for dynamic rows I’d use measured size cache or a proven virtualizer.”
