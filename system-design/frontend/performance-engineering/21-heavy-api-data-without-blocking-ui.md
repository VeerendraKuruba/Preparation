# 21. Handle heavy API data without blocking the UI

## Strategies

1. **Chunked processing** — parse JSON in slices (`requestIdleCallback`, `setTimeout(0)` breaks) or use streams (`fetch` body reader) for newline-delimited / chunked APIs.
2. **Web Worker** — fetch+parse off main thread; postMessage structured clones (watch payload size).
3. **Virtualized render** — big arrays aren’t all in the DOM at once.
4. **Pagination / cursor** APIs — never ship 100MB to the client if avoidable.
5. **Progressive disclosure** — summary first, drill-down loads detail.
6. **`startTransition`** for non-urgent state commits after data lands.

## Failure modes

Parsing multi‑MB JSON still blocks the worker’s thread — consider **smaller pages** or **binary formats** (Arrow/flatbuffers) if that’s the real constraint.

## One-liner

“**Stream or page on the wire, parse in a worker or idle slices, virtualize on screen.**”
