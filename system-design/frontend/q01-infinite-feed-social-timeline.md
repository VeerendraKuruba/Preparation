# Q1. Infinite feed / social timeline

**Prompt variants:** Design **Instagram / Twitter / LinkedIn** feed on the web.

[← Question index](./README.md)

---

### One-line mental model

The client **never mounts all items**; it **windows** the DOM, **pages** data with stable ordering, and **merges** server pages with a thin optimistic overlay for interactions.

---

### Clarify scope in the interview

Ask these before drawing anything:

- Media-heavy cards (images/video) vs text-first? Affects CLS strategy and LCP budgeting.
- Deep links to a single post? Need gap recovery for mid-feed entry.
- Edit/delete own posts? Affects state patch model.
- Live updates — polling, SSE, or WebSocket? Changes real-time architecture.
- SEO requirement? Public posts vs auth-gated feeds changes SSR/CSR choice.
- Ads or promoted content injected between feed items? Affects virtual list item type handling.

---

### Goals & requirements

**Functional**
- Infinite scroll: load next page automatically as user nears bottom.
- Pull-to-refresh or "New posts" banner for fresh content.
- Entry points: like, comment, share, save — all on the card.
- Deep link to a single post ID (`/post/:id`) navigates and highlights item.

**Non-functional**
- Smooth scroll at 60fps — no layout thrash from late-arriving images.
- 10,000+ items visited in a session with no linear DOM growth.
- LCP under 2.5s on median device; CLS < 0.1 for images.
- Graceful offline — show stale feed rather than a blank screen.

---

### High-level frontend architecture

```
Browser
┌─────────────────────────────────────────────────────────────┐
│  Route: /feed                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Shell (layout, nav, error boundary)                  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Feed Store (Zustand / Redux slice)             │  │  │
│  │  │   byId: Map<postId, Post>                       │  │  │
│  │  │   ids: string[]          ← stable order         │  │  │
│  │  │   cursor: string | null                         │  │  │
│  │  │   optimistic: Map<postId, Partial<Post>>        │  │  │
│  │  └───────────────┬─────────────────────────────────┘  │  │
│  │                  │ derived view slice                  │  │
│  │  ┌───────────────▼─────────────────────────────────┐  │  │
│  │  │  Virtual List (react-window VariableSizeList)   │  │  │
│  │  │   overscan=3  itemCount=ids.length              │  │  │
│  │  │   ┌──────────┐  ┌──────────┐  ┌──────────┐    │  │  │
│  │  │   │ PostCard │  │ PostCard │  │ PostCard │    │  │  │
│  │  │   │ [img+txt]│  │ [img+txt]│  │[skeleton]│    │  │  │
│  │  │   └──────────┘  └──────────┘  └──────────┘    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────┬───────────────────────────┬──────────────────┘
               │ GET /feed?cursor=&limit=  │ SSE/poll new
               ▼                           ▼
         Feed API (paginated)        Notification stream
```

**Data flow on first load:**
1. Route mounts → shell renders skeleton.
2. `useFeed()` hook fires `GET /feed?limit=20` — no cursor yet.
3. Response arrives: `{ items: [...], nextCursor: "eyJ..." }` stored in Feed Store.
4. Virtual list renders first 20 cards; images load lazily below fold.
5. Scroll listener detects "within 2 screens of bottom" → fetch page 2 with cursor.
6. New items appended to `ids[]`, `byId` merged — virtual list re-renders only new rows.

---

### What the client does (core mechanics)

#### 1. Virtualization with react-window

Fixed row heights are simpler but break on variable-length text. Use `VariableSizeList` with a measurement cache:

```tsx
import { VariableSizeList } from 'react-window';

const rowHeights = useRef<Record<number, number>>({});

function getItemSize(index: number) {
  return rowHeights.current[index] ?? 300; // default estimate
}

function setRowHeight(index: number, height: number) {
  if (rowHeights.current[index] !== height) {
    rowHeights.current[index] = height;
    listRef.current?.resetAfterIndex(index, false);
  }
}

// Inside PostCard — measure on mount/resize
const cardRef = useCallback((node: HTMLDivElement | null) => {
  if (!node) return;
  const ro = new ResizeObserver(([entry]) => {
    setRowHeight(index, entry.contentRect.height);
  });
  ro.observe(node);
  return () => ro.disconnect();
}, [index]);
```

**Key insight:** `resetAfterIndex` tells react-window to recompute offsets from that index down. Call it with `false` (no force re-render) to batch updates — only re-render once measurements stabilize.

#### 2. Cursor pagination with dedup and abort

```ts
const controllerRef = useRef<AbortController | null>(null);

async function fetchNextPage() {
  if (store.cursor === null) return; // exhausted

  controllerRef.current?.abort(); // cancel previous in-flight
  const controller = new AbortController();
  controllerRef.current = controller;

  try {
    const res = await fetch(
      `/api/feed?cursor=${store.cursor}&limit=20`,
      { signal: controller.signal }
    );
    const { items, nextCursor } = await res.json();

    store.dispatch(appendPage({
      items: items.filter(item => !store.byId[item.id]), // dedup
      nextCursor,
    }));
  } catch (err) {
    if ((err as Error).name === 'AbortError') return; // expected
    store.dispatch(setPageError(err));
  }
}
```

**Why cursor over offset:** If a new post inserts at position 5 while the user is at offset 20, offset-based pagination shifts everything — the user sees duplicate posts on the next page. A cursor (opaque server token encoding the last seen ID + timestamp) is stable against inserts.

#### 3. Optimistic like/unlike with rollback

```ts
function toggleLike(postId: string) {
  const prev = store.byId[postId];
  const next = { liked: !prev.liked, likeCount: prev.likeCount + (prev.liked ? -1 : 1) };

  // 1. Apply optimistic patch immediately
  store.dispatch(patchOptimistic({ postId, patch: next }));

  // 2. Fire network request
  api.post(`/posts/${postId}/like`, { liked: next.liked })
    .then(confirmed => {
      store.dispatch(confirmOptimistic({ postId, serverData: confirmed }));
    })
    .catch(() => {
      // 3. Rollback to previous state on failure
      store.dispatch(patchOptimistic({ postId, patch: prev }));
      toast.error('Could not update like. Try again.');
    });
}
```

The store merges `optimistic` over `byId` at selector time — the component always reads the merged view.

#### 4. Media lazy loading with CLS prevention

```tsx
// Reserve exact space before image loads — prevents layout shift
<div style={{ aspectRatio: `${post.imageWidth} / ${post.imageHeight}` }}>
  <img
    src={post.imageUrl}
    loading="lazy"
    decoding="async"
    width={post.imageWidth}
    height={post.imageHeight}
    // Only first visible card gets high priority
    fetchpriority={index === 0 ? 'high' : 'auto'}
    alt={post.imageAlt}
  />
</div>
```

**`aspect-ratio` CSS** (or explicit `width`/`height` attributes) tells the browser to reserve space before the image bytes arrive — this is what eliminates CLS. Without it, every image load causes a reflow that shifts everything below it.

#### 5. Real-time: polling vs SSE

```ts
// SSE approach — server pushes new post IDs
const es = new EventSource('/api/feed/live');

es.addEventListener('new_posts', (event) => {
  const { count, previewIds } = JSON.parse(event.data);

  if (isScrolledToTop()) {
    // User is live at the top — prepend silently
    store.dispatch(prependIds(previewIds));
    listRef.current?.scrollToItem(0, 'start');
  } else {
    // User is scrolled down — show badge instead of disruptive prepend
    store.dispatch(setUnreadBanner(count));
  }
});

// Pause when tab is hidden to save server connections
document.addEventListener('visibilitychange', () => {
  if (document.hidden) es.close();
  else reconnectSSE();
});
```

**Polling fallback:** If SSE is blocked by a proxy, fall back to `setInterval` polling every 30s. Exponential backoff on errors: 30s → 60s → 120s → stop and show "refresh" button.

---

### Trade-offs

| Decision | Chosen approach | Why | Cost / risk |
|---|---|---|---|
| Fixed vs dynamic row heights | Dynamic (measured) | Text length and media vary significantly; fixed height crops content | `resetAfterIndex` on every resize is O(n) in the worst case; mitigate with debounced measurements |
| Cursor vs offset pagination | Cursor | Stable under concurrent inserts; no duplicate/skipped items | Cursor is opaque — cannot jump to arbitrary pages; deep links need gap recovery |
| Optimistic vs pessimistic updates | Optimistic for likes/saves | Feels instant; these are low-stakes reversible actions | Rollback can flicker if network is fast — add a minimum display time for feedback |
| SSE vs WebSocket for new posts | SSE | Unidirectional server push is sufficient; SSE auto-reconnects; no library needed | SSE is one-directional — cannot send from client; use POST for actions |
| `content-visibility: auto` vs react-window | react-window for main feed | Full control over DOM count; predictable memory; better for complex cards | More code; requires explicit height management |
| Client-side sort vs server sort | Server sort | Server has full ranking signal (engagement, recency, personalization) | Client must not re-sort — trust server ordering and append only |

---

### Failure modes & degradation

- **First load failure:** Show skeleton for 300ms, then swap to error state with retry button. Never show blank white.
- **Offline / stale data:** Cache last successful response in `sessionStorage`. Show "Viewing cached feed" banner. Disable like/comment or queue them for when online.
- **Slow image CDN:** Images time out individually — the card text still renders, img slot shows a blurred placeholder.
- **Widget (ads/suggestions) failure:** Isolated in its own error boundary. If the ads widget throws, the feed cards continue rendering. Never let a third-party widget block `ids[]` rendering.
- **Retry strategy:** First retry immediately, then 2s, 4s, 8s, cap at 30s. Show "Something went wrong" after 3 failures.

---

### Accessibility checklist

- Provide a "Load more" button as a keyboard-accessible escape hatch alongside the scroll trigger — screen reader users cannot trigger scroll events.
- Use `role="feed"` on the list container (ARIA feed pattern) — allows AT users to navigate items with F/Shift+F.
- Avoid firing `aria-live` announcements on every new item (too noisy). Announce once: "5 new posts loaded."
- Like button: `aria-pressed="true|false"` with visible label change.
- Focus management: on deep link entry (`/post/:id`), scroll and focus the target card on mount.
- Virtual list caveat: test with NVDA + Chrome and VoiceOver + Safari — some AT struggle with `aria-setsize` on partially loaded lists.

---

### Minute summary (closing statement)

"The core insight is that a feed is an append-only sorted log — we never need the full DOM. We **virtualize** with react-window using measured row heights so the mounted DOM stays bounded regardless of session length. We **cursor-paginate** with abort controllers to prevent stale-response races and deduplicate on append. We eliminate CLS by reserving image space with aspect-ratio before bytes arrive, and we give the first card `fetchpriority=high` to protect LCP. For live updates, SSE lets the server push new-post counts; we prepend silently when the user is at the top, or badge otherwise to avoid disruptive jumps. Optimistic like/unlike with rollback keeps interactions instant while remaining honest on failure. The whole thing degrades gracefully: offline shows cached cards, ad widget failures are isolated, and every error state has a retry path. The result is a feed that feels fast, stays memory-bounded, and never leaves the user on a blank screen."

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Who's logged in, media vs text, live updates, SEO needs |
| High-level architecture | 12–18 | Route → shell → feed store → API shapes; first paint path |
| Deep dive 1 | 12–18 | Usually **virtualization** or **pagination/cursors** |
| Deep dive 2 | 12–18 | **Optimistic UI** / state, or **images + CLS**, or **real-time append** |
| Trade-offs, failure, metrics | 8–12 | v1 cuts, RUM, a11y escape hatches |

---

### What to draw (whiteboard)

- **Timeline of requests:** scroll event → "near end?" → `GET /feed?cursor=` → merge into store → virtual list re-render.
- **Virtual window diagram:** viewport box, overscan rows above/below, "recycled" DOM nodes concept (only ~10 nodes for thousands of items).
- **State shape:** `byId` map + ordered `ids[]`; where optimistic overlay attaches; how the selector merges them.
- **Real-time flow:** SSE event → check scroll position → prepend vs badge decision tree.
- **Optional:** isolated "widget" boxes (ads, follow suggestions) with their own error boundaries, positioned by index in `ids[]`.

---

### Deep dives — pick 2 to carry 10–20 min each

**A. Virtualization** — Fixed vs dynamic row height; measure-and-cache vs constant-height cards; `ResizeObserver` cost; scroll anchoring when **prepend** (new posts); `content-visibility` as a lighter alternative and when it's not enough; ballpark **mounted DOM** targets (visible + overscan vs thousands of rows).

**B. Pagination & ordering** — Cursor vs offset (why offset breaks under inserts); **dedup** when the same post appears twice; **abort** stale responses with request ids; **gap recovery** for deep links; reconciling **live prepend** with cursor pagination.

**C. Media & LCP** — Priority only for first screen; `aspect-ratio` / width-height attrs; blur-up placeholders; decoding (`decode`, worker decode); carousel-in-card vs single hero.

**D. Real-time / freshness** — Poll vs SSE/WebSocket for "new posts"; unread badge vs auto-prepend; background tab behavior (`document.visibilityState`); backoff when offline.

---

### Common follow-ups (short answers)

- **"How do you handle deletes/edits?"** — Server is truth; patch `byId`; remove id from `ids[]` on delete; virtual list tolerates sudden height collapse via `resetAfterIndex`.
- **"SEO for public posts?"** — SSR or SSG for **permalink** pages; feed often CSR with canonical links; if bots need full lists, offer **paginated HTML** sitemaps, not infinite CSR-only scroll.
- **"How do you test scroll performance?"** — RUM: INP, long tasks; CPU-throttled Lighthouse profiles; measure recycler behavior and **layout thrash** with Performance panel.
- **"Ranking changes while scrolling?"** — Prefer **stable cursors** / server snapshot semantics; or explicit "New stories available" UX; avoid silent reshuffles mid-session.

---

### What you'd measure (prove the design)

- **Core Web Vitals:** LCP (first card image), CLS (media slots should be 0), INP (like/tap response).
- **Product:** scroll depth percentile, next-page fetch latency p95, feed API error/retry rates.
- **Tech:** approximate **mounted DOM node count** (target < 50 during scroll), image CDN hit rate, feed API p95 latency.
- **Real-time:** SSE reconnect rate, new-post badge click-through (user acted on it), time from post creation to client visibility.
