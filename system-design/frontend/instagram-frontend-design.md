# Design the frontend for Instagram (interview framing)

 [← Frontend prep index](./README.md)

A mobile-first **consumer media** product: infinite visual feed, **Stories**, short video (**Reels**), **DMs**, profiles, and lightweight creation flows. Interviewers care about **media performance**, **scroll smoothness**, **real-time hints**, and **deep links**.

---

## 1. Clarify scope (first 2 minutes)

- **Surfaces:** Home feed, Explore, Reels, Stories tray, profile grid, post detail, compose (camera / upload), **direct messages** — web vs native priorities? (Often “focus mobile native + mention web constraints.”)
- **Auth:** Logged-in only for core feed; public **permalink** viewers (`/p/…`, `/reel/…`) may exist on web.
- **Constraints:** Offline browsing of cached feed? Data caps / metered networks?

**Non-functional:** **LCP** for first paint of profile/post; **jank-free** scroll at 60 fps; **battery** on video; **a11y** for alt text and reduced motion; **safe areas** and notches.

---

## 2. High-level architecture

| Layer | Role |
|--------|------|
| **Shell** | Auth gate, tab bar / nav, design tokens, analytics, feature flags. |
| **Feed & media** | Virtualized list, image/video pipeline, **prefetch** next items. |
| **Stories / Reels** | Full-screen players, **decoders**, preload policy, gesture conflicts. |
| **Realtime** | WebSocket (or equivalent) for **DMs**, story “seen”, typing; fallback long-poll if needed. |
| **Data** | BFF or GraphQL/REST: **cursor-based** pages for feed; **signed CDN URLs** for media. |

**Rendering:** Native (**preferred** for camera, GPU, background); web often **CSR shell + SSR** for permalinks/SEO where needed.

---

## 3. Core UX flows (talk track)

1. **Home feed** — User-specific **ranked** stream (ranking is server-side). Client: **pagination/cursor**, **placeholder/skeleton**, **pull-to-refresh**, **stale-while-revalidate** for cached slice.
2. **Stories** — Horizontal tray + **ephemeral** full-screen viewer; preload neighbor stories; **seen state** synced (optimistic mark + server reconciliation).
3. **Reels** — Vertical **pager** + autoplay next; aggressive **memory** caps; downshift quality on thermal/network hints if product allows.
4. **Post detail / permalink** — Deep link lands on **one post** + comment thread; comment list virtualized.
5. **Create** — Capture / picker → upload with **resumable** or chunked upload if large; **optimistic** “posting…” with rollback on failure.

---

## 4. Deep dives (pick 2 in a 45 min round)

### A. Images & CDN

Multi-resolution variants, **lazy decode**, **blur hash / LQIP**, **WebP/HEIF** where supported; **CDN caching** and **cache busting** on profile updates. **Aspect ratio** reserved up front to avoid CLS.

### B. Feed list performance

**Virtualization** (or aggressive recycling on native); **stable keys** (post id); **debounce** layout work; **separate “window”** for off-screen videos (pause, release surfaces). **Prefetch** next page when user nears end; **cancel** in-flight requests on blur or tab switch.

### C. Real-time & DMs

Connection manager: **auth**, **heartbeat**, **backoff** reconnect; **idempotent** message IDs for **optimistic** sends; **cursor** for history + **gap sync** after reconnect. **Notification** permission UX separate from core transport.

### D. State management

**Server state** in a cache (TanStack Query / SWR / native equivalent): keyed by feed cursor, profile id. **UI state** local (which story index, reel volume). Avoid duplicating **full feed** in a second global store.

---

## 5. Trade-offs & failure modes

| Choice | Upside | Cost |
|--------|--------|------|
| Autoplay video | Engagement | Battery, thermal throttling, data usage |
| Aggressive prefetch | Feels instant | Wasted bandwidth if user bounces |
| Optimistic like/post | Snappy | Must reconcile counts on mismatch |

**Degradation:** Show **cached feed** + banner on outage; **retry** uploads; **error boundary** per post cell so one bad card doesn’t crash the feed.

---

## 6. Minute summary

“**Instagram’s frontend is a media-heavy, infinitely scrolling client:** CDN-optimized images/video, virtualized feed with **cursor pagination** and **prefetch**, **full-screen** story/reel players with tight **memory** rules, and a **real-time layer** for DMs—**ranking stays server-side**, client focuses on **smooth scroll**, **optimistic actions**, and **graceful offline-ish degradation**.”
