# Performance Engineering (Frontend)

Interview-oriented notes on keeping React UIs fast under real-world load. This section covers five problem areas: rendering efficiency, large list handling, bundle weight, expensive computation, and async data delivery. Each file is self-contained and interview-ready.

---

## Index

| # | Topic | When to reach for it | File |
|---|---|---|---|
| 16 | Optimize large lists | You have > 100 items rendered at once and scroll feels janky | [16-optimize-large-lists.md](./16-optimize-large-lists.md) |
| 17 | List virtualization | You need to render thousands of rows/cards without DOM bloat | [17-list-virtualization.md](./17-list-virtualization.md) |
| 18 | Prevent unnecessary React re-renders | A parent re-render is cascading into expensive child renders | [18-prevent-unnecessary-react-rerenders.md](./18-prevent-unnecessary-react-rerenders.md) |
| 19 | Optimize expensive computations | A pure calculation (sort, filter, layout) is blocking the main thread | [19-optimize-expensive-computations.md](./19-optimize-expensive-computations.md) |
| 20 | Reduce bundle size | Initial page load is slow; JS parse/eval time is high | [20-reduce-bundle-size.md](./20-reduce-bundle-size.md) |
| 21 | Heavy API data without blocking the UI | A slow or large API response is freezing the page during load | [21-heavy-api-data-without-blocking-ui.md](./21-heavy-api-data-without-blocking-ui.md) |

---

## Pick the right tool — decision flowchart

```
Is the UI slow to interact with (typing, clicking, scrolling)?
  │
  ├─ Scrolling is janky with many items?
  │     → Use list virtualization (files 16, 17)
  │
  ├─ Clicking/typing triggers expensive re-renders?
  │     → Prevent unnecessary re-renders (file 18)
  │       Tools: React.memo, useMemo, useCallback, state colocation
  │
  └─ A pure calculation (sort/filter/layout) is slow?
        → Move to useMemo or a Web Worker (file 19)

Is the page slow to load?
  │
  ├─ Large JS bundle?
  │     → Code splitting, lazy imports, tree shaking (file 20)
  │
  └─ API response is huge or slow?
        → Streaming, pagination, suspense boundaries (file 21)
```

---

## Quick summary of each technique

### 16 — Optimize large lists
When you have hundreds of rendered items, the DOM itself becomes the bottleneck. The fix is to reduce DOM nodes: paginate, limit visible items, or switch to a virtualized renderer. Covers the general mental model before diving into virtualization specifics.

### 17 — List virtualization
Only render the items currently in (or near) the viewport. Libraries like `react-window` and `react-virtual` keep the DOM node count constant regardless of list length — 10,000 items render as fast as 20. Key tradeoffs: fixed vs variable row height, and the difficulty of measuring items before render.

### 18 — Prevent unnecessary React re-renders
React re-renders a component whenever its parent renders, unless you opt out. `React.memo` wraps a component so it skips re-render if props are reference-equal. `useMemo` stabilises derived values; `useCallback` stabilises function references. State colocation — keeping state as close to its consumer as possible — prevents unrelated subtrees from re-rendering.

### 19 — Optimize expensive computations
`useMemo` memoises the result of a pure function so it only recomputes when dependencies change — right choice for filtering/sorting inside the render cycle. For heavier work (image processing, layout calculations, data parsing), move it off the main thread entirely with a Web Worker and communicate results via `postMessage`.

### 20 — Reduce bundle size
Code splitting with `React.lazy` / dynamic `import()` keeps the initial bundle small by deferring non-critical code until it is needed. Tree shaking removes dead exports at build time. Lazy-loading images and fonts, auditing large dependencies (use `bundlephobia`), and analysing the bundle with `webpack-bundle-analyzer` are the core workflow.

### 21 — Heavy API data without blocking the UI
Show a skeleton/loading state immediately, fetch in the background, and stream large responses if possible. React Suspense + data-fetching libraries (React Query, SWR) coordinate loading and error boundaries cleanly. For truly huge payloads, process them in a Web Worker so parsing does not block the main thread.

---

**Also see:** [Frontend system design index](../README.md) · [Scalability architecture](../scalability-architecture/README.md) · [Prep repository](../../../README.md)
