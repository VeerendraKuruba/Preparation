# 16. Optimize rendering of large lists

## What interviewers want

A clear plan: **measure first**, then reduce work per frame (DOM nodes, reconciliation, style/layout thrash).

## Tactics

1. **Virtualize** the list — only mount rows in/near the viewport (`react-window`, `@tanstack/react-virtual`, or a hand-rolled window). See `17-list-virtualization.md`.
2. **Stable list identity** — `key` from domain id, never index, to minimize reorder cost.
3. **Cheap rows** — memoize row components with `React.memo` when props are stable; avoid inline object/array literals passed as props.
4. **Trim work in row** — don’t run heavy formatters per row per render; precompute or memoize per id.
5. **CSS containment** where safe — `content-visibility: auto` on very long static sections (know trade-offs vs accessibility of off-screen content).
6. **Pagination / incremental** render if virtualization is out of scope — “good enough” product UX.

## Talking line

“We cut **rendered DOM** and **diff cost** with virtualization + stable keys; row components are memoized and avoid prop churn.”
