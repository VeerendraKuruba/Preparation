# Q1. Infinite feed / social timeline

**Prompt variants:** Design **Instagram / Twitter / LinkedIn** feed on the web.

 [← Question index](./README.md)

---

### One-line mental model

The client **never mounts all items**; it **windows** the DOM, **pages** data with stable ordering, and **merges** server pages with a thin optimistic overlay for interactions.

### Clarify scope in the interview

Media-heavy cards vs text-first? **Deep links** to one post? **Edit/delete** own posts? Live updates (polling vs push)?

### Goals & requirements

- **Functional:** infinite scroll, refresh, entry points to actions, deep link to post id.
- **Non-functional:** smooth scroll (avoid layout thrash), **10k+** items visited in a session without linear DOM growth.

### High-level frontend architecture

**Route** loads shell → fetch **cursor page** → **virtual list** renders window + overscan → optional **subscription/poll** appends or prepends. Media loaded **lazy** with reserved space.

### What the client does (core mechanics)

1. **Virtualize:** fixed or measured row heights; recycle DOM; overscan 1–3 screens.
2. **Pagination:** cursor + limit; **dedupe** by id; **abort** stale requests.
3. **State:** ordered list from server; optimistic like/comment with rollback.
4. **Prefetch:** next page near scroll end; idle prefetch post detail.
5. **Media:** `loading="lazy"`; avoid CLS (aspect ratio); one **fetchpriority** hero if needed.

### Trade-offs

| Choice upside | Trade-off |
|---------------|-----------|
| Full virtualization | Harder a11y + SEO for “full page” crawl |
| Client sort | Must not fight server ordering guarantees |

### Failure modes & degradation

First load **skeleton**; stale read with banner when offline; **retry with backoff**; don’t block whole feed on ads widget failure.

### Accessibility checklist

“Load more” escape hatch; **roving tabindex** or sensible focus in list; don’t over-announce with live regions unless product requires.

### Minute summary (closing)

“We **virtualize** the feed, **cursor-paginate** with dedupe and cancel, **lazy-load** media to protect LCP, and **isolate** optional modules so one bad block doesn’t brick the timeline.”

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Who’s logged in, media vs text, live updates, SEO needs |
| High-level architecture | 12–18 | Route → shell → feed store → API shapes; first paint path |
| Deep dive 1 | 12–18 | Usually **virtualization** or **pagination/cursors** |
| Deep dive 2 | 12–18 | **Optimistic UI** / state, or **images + CLS**, or **real-time append** |
| Trade-offs, failure, metrics | 8–12 | v1 cuts, RUM, a11y escape hatches |

### What to draw (whiteboard)

- **Timeline of requests:** scroll event → “near end?” → `GET /feed?cursor=` → merge into store.
- **Virtual window:** viewport, overscan, “recycled” row slots (conceptually).
- **State shape:** `byId` map + ordered `ids[]` (or single array); where optimistic updates attach.
- **Optional:** small box for “widgets” (ads, suggestions) **isolated** from feed core.

### Deep dives — pick 2 to carry 10–20 min each

**A. Virtualization** — Fixed vs dynamic row height; measure-and-cache vs constant-height cards; `ResizeObserver` cost; scroll anchoring when **prepend** (new posts); `content-visibility` as a lighter alternative and when it’s not enough; ballpark **mounted DOM** targets (visible + overscan vs thousands of rows).

**B. Pagination & ordering** — Cursor vs offset (why offset breaks under inserts); **dedup** when the same post appears twice; **abort** stale responses with request ids; **gap recovery** for deep links; reconciling **live prepend** with cursor pagination.

**C. Media & LCP** — Priority only for first screen; `aspect-ratio` / width-height attrs; blur-up placeholders; decoding (`decode`, worker decode); carousel-in-card vs single hero.

**D. Real-time / freshness** — Poll vs SSE/WebSocket for “new posts”; unread badge vs auto-prepend; background tab behavior (`document.visibilityState`); backoff when offline.

### Common follow-ups (short answers)

- **“How do you handle deletes/edits?”** — Server is truth; patch `byId`; remove id from list on delete; virtual list tolerates sudden height collapse.
- **“SEO for public posts?”** — SSR or SSG for **permalink** pages; feed often CSR with canonical links; if bots need full lists, offer **paginated HTML**, not infinite CSR-only scroll.
- **“How do you test scroll performance?”** — RUM: INP, long tasks; CPU-throttled profiles; measure recycler behavior and **layout thrash**.
- **“Ranking changes while scrolling?”** — Prefer **stable cursors** / server snapshot semantics; or explicit “new stories” UX; avoid silent reshuffles.

### What you’d measure (prove the design)

- **Core Web Vitals:** LCP (first card), CLS (media slots), INP (like/tap).
- **Product:** scroll depth, next-page fetch latency, feed API error/retry rates.
- **Tech:** approximate **mounted row count**, image CDN hit rate, feed API p95.

