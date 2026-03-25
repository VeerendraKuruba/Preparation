# Design a feed like Twitter / X (interview framing)

 [← Frontend prep index](./README.md)

A **high-velocity, ranked timeline** product: **short posts**, **media cards**, **social graph** actions (follow, like, repost), **compose**, and **real-time** inserts. The client must feel **fresh** without freezing the main thread.

---

## 1. Clarify scope

- **Timelines:** **For you** (algorithmic) vs **Following** (chronological-ish) — different **freshness** and cache strategy?
- **Surfaces:** Home, **reply threads**, **quote posts**, **lists**, **profile** tab (posts / replies / media), **search** typeahead.
- **Realtime:** “**N new posts**” banner vs **auto-insert** at top — product choice; both have client implications.
- **Moderation:** NSFW blur, **report** flow — layout hooks.

**Non-functional:** **Scroll performance** on long sessions; **time-to-interactive** on cold start; **a11y** (keyboard nav through tweets); **reduced motion** for animations.

---

## 2. High-level architecture

| Piece | Role |
|--------|------|
| **Shell** | Auth, nav, theme, **feature flags**, experiment bucketing (often server-influenced). |
| **Timeline service (client)** | Fetch **pages** (cursor), **merge** realtime deltas, **dedupe** by tweet id. |
| **Composer** | Draft state, **mentions/hashtags** typeahead, **media** upload pipeline, **threading** UI. |
| **Media** | **Cards** for images/video; **lazy** load; **aspect ratio** reserved; **CDN** URLs. |
| **Realtime** | **WebSocket/SSE/poll** for home updates; **fanout** is mostly server — client handles **apply patch** to feed model. |

**Rendering:** Web app historically **CSR-heavy** with **SSR/SSG** for **marketing** and some **permalink** pages; **islands** or **streaming** if moving to hybrid stack.

---

## 3. Feed mechanics (client)

1. **Pagination:** **Cursor** from last tweet id + direction; **“Load older”** at bottom; optional **“Load newer”** at top when user pulled down.
2. **Ranking:** **Opaque** to client — server returns ordered ids; client **renders** and may **prefetch** **profile/card** data for next window.
3. **Deduplication:** Same tweet from **poll + socket** → **map by id**; stable **keys** in list.
4. **Virtualization:** **Window** of rows; **estimate height** for text-only rows; **measure** when media varies — or **masonry** trade-off for media grid on profile.
5. **Prefetch:** Next page when **near viewport end**; **cancel** on fast navigation away.

---

## 4. Compose & threads

- **Draft persistence:** **localStorage** / IndexedDB for “don’t lose tweet” UX; conflict if multi-device — acceptable rare case.
- **Media upload:** **Progress**, **retry**, **server-processed** variants for display.
- **Threads:** Linked list of compose blocks → single **thread publish** API or chained ids — UI shows **connected** affordance; client validates order before submit.

---

## 5. Real-time strategy (talk track)

- **Conservative:** **“Show N new posts”** pill — user taps to **prepend** and **reconcile** with fetch (avoids scroll jump).
- **Aggressive:** Insert at top only if scroll position **y === 0**; else increment **unread counter**.
- **Reconnect:** **Gap fetch** `since_tweet_id` to fill holes after offline.

---

## 6. Deep dives (pick 2)

### A. Performance

**Main thread:** **defer** non-critical work (`requestIdleCallback` / smaller slices); **code split** routes (**Explore**, **Settings**). **Images:** responsive `srcset`, **blur placeholder**.

### B. State

**TanStack Query/SWR**-style **keyed cache** per timeline type + cursor page; **normalize** tweets `byId` optional for quote chains. **Don’t** store duplicate timeline arrays without **sync** rules.

### C. Permalinks / SEO

Tweet detail route: **meta** tags for unfurl (often **SSR** or **edge** HTML for bots); **hydration** cost vs **placeholder** shell for humans.

### D. Abuse & rate limits

**429** handling: backoff, **toast**, don’t spin forever; **read-only** mode if post fails.

---

## 7. Failure modes

| Risk | Mitigation |
|------|------------|
| Stale timeline after follow/unfollow | **Invalidate** cache keys for affected feeds |
| Incorrect order after merge | **Server sort key** wins; resort on full fetch |
| Layout thrash with variable media | **content-visibility** / fixed aspect where possible |

---

## 8. Minute summary

“A **Twitter-like feed** is a **virtualized, cursor-paginated** timeline with **opaque ranking** from the server, **deduped realtime patches**, careful **scroll + new-post** policy to avoid jumpiness, a **composer** with upload and **thread** modeling, and **aggressive media + code-splitting** to keep long scroll sessions smooth.”
