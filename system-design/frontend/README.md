# Frontend system design round — question index

FAANG and top-tier **frontend system design** prep. Each linked file is **one question** with: **mental model → clarify → goals → architecture → mechanics → trade-offs → failures → a11y → summary**, plus **~60 min** material (**time boxes, whiteboard checklist, deep dives, follow-ups, metrics**).

**Related:** [Prep repository](../../README.md) · [System design hub](../README.md) · [Micro frontends](./micro-frontends.md) · [Google Maps zoom](./google-maps-zoom-frontend.md) · [Scalable homepage](./scalable-homepage/homepage-millions-users.md) · [Airbnb DLS](./airbnb-design-system.md) · [Performance](./performance-engineering/README.md) · [Scalability](./scalability-architecture/README.md)

### Topic finder

| You’re prepping | Start here |
|-----------------|------------|
| **E-commerce** (filters, listing scale, PLP/PDP, cart) | [Q6](./q06-ecommerce-plp-pdp-cart.md) — see **Filters & listing at scale** |
| **Real-time dashboard** | [Q11](./q11-real-time-dashboard.md) |
| **Offline-first** (SW, IDB, outbox, sync) | [Q12](./q12-offline-first-app.md) |

---

## ~60 minute interview — how to use these notes

A typical **frontend/system design** loop is **not** a 45-minute monologue. The hour is **dialogue + depth** somewhere. These files give you **enough topics** to go long; you still **pause for questions**.

| Phase | Time (guide) | What you do |
|-------|----------------|-------------|
| Clarify & requirements | ~8–12 min | Ask scope questions; write **functional + non-functional** list on the board; agree on “MVP” vs nice-to-have. |
| High-level design | ~12–18 min | **Boxes + arrows**: browser, rendering choice, CDN/BFF, main APIs, client state stores. Narrate **critical user path** once end-to-end. |
| Deep dive × 2 | ~25–35 min total | Pick **two** areas the interviewer cares about (they often steer). Each deep dive: problem → approach → trade-off → failure mode. Use **Deep dives** sections in each Q file. |
| Trade-offs, scale, wrap | ~8–12 min | Explicit **what you’d cut for v1**, **observability**, **a11y/security** one-liners, **minute summary**. |

**Reality check:** If you only recite bullets, you finish early. The **stretch** content is in **Deep dives** + **Follow-ups** + drawing **data structures** (lists, caches, state machines). Practice **one Q file out loud** with a 50-minute timer and let a friend interrupt you.

---

## How to use every round (meta-framework)

### One-line mental model

Design **what runs in the browser and at the edge**: HTML strategy, bundles, caching, client state, graceful degradation—not full backend schemas unless asked.

### Clarify scope in the interview

- **Users & devices:** mobile web, desktop, low-end hardware, regions.
- **Auth:** anonymous, consumer logged-in, B2B **RBAC**.
- **SEO:** public indexable routes vs app behind login.
- **Realtime:** poll vs **SSE** vs **WebSocket**; staleness tolerance.
- **Constraints:** offline, **WCAG**, RTL / i18n.

### Goals & requirements (name a few explicitly)

| Type | Examples |
|------|----------|
| Functional | Core user journeys on the whiteboard |
| Latency | LCP, TTI, interaction ready |
| Scale | Concurrent users, rows/items in one view |
| Reliability | Timeouts, partial UI when a service fails |
| Security | XSS, CSP, where tokens live |

### High-level frontend architecture

Browser (**SSG / SSR / CSR / islands**) → **CDN / BFF** → services. Mark **where HTML is produced**, **where cache sits**, and **source of truth**.

### What you deep-dive (pick 1–2)

Virtualization, HTTP/SWR caching, URL-as-state, streaming SSR, WebSockets, maps/tiles, images, micro-frontends.

### Failure modes & degradation

API slow/error, socket down, third-party script, bad deploy—each needs a **user-visible** fallback.

### Accessibility checklist

Keyboard paths, focus, semantics, motion preferences—**specific to the prompt**.

### Minute summary (closing)

Restate: **rendering strategy + data/caching + one risk** you mitigated.

---

## Questions (Q1–Q12)

| # | Topic | File |
|---|--------|------|
| Q1 | Infinite feed / social timeline | [q01-infinite-feed-social-timeline.md](./q01-infinite-feed-social-timeline.md) |
| Q2 | Search + typeahead / autocomplete | [q02-search-typeahead-autocomplete.md](./q02-search-typeahead-autocomplete.md) |
| Q3 | Web chat / DMs | [q03-web-chat-dms.md](./q03-web-chat-dms.md) |
| Q4 | Video watch page / player | [q04-video-watch-player.md](./q04-video-watch-player.md) |
| Q5 | Maps-heavy UI (markers, clustering) | [q05-maps-markers-clustering.md](./q05-maps-markers-clustering.md) |
| Q6 | E-commerce (filters, listing scale, PLP, PDP, cart) | [q06-ecommerce-plp-pdp-cart.md](./q06-ecommerce-plp-pdp-cart.md) |
| Q7 | B2B dashboard (tables, RBAC) | [q07-b2b-dashboard-rbac.md](./q07-b2b-dashboard-rbac.md) |
| Q8 | Collaborative editor (docs-lite) | [q08-collaborative-editor-docs-lite.md](./q08-collaborative-editor-docs-lite.md) |
| Q9 | Design system / frontend platform | [q09-design-system-frontend-platform.md](./q09-design-system-frontend-platform.md) |
| Q10 | Global shell / homepage (scale) | [q10-global-shell-homepage.md](./q10-global-shell-homepage.md) |
| Q11 | Real-time dashboard (live metrics) | [q11-real-time-dashboard.md](./q11-real-time-dashboard.md) |
| Q12 | Offline-first app (SW, IDB, outbox) | [q12-offline-first-app.md](./q12-offline-first-app.md) |

---

## Company emphasis (tailor the same question)

| Company / bucket | Stress extra |
|------------------|----------------|
| **Meta** | Feed/composer scale, optimistic UI, measurement |
| **Google** | Perf correctness, search, maps/media depth |
| **Apple** | Motion, clarity, privacy, a11y |
| **Amazon** | PLP/PDP SEO, cart correctness |
| **Netflix** | Prefetch, device tiers, personalization UX |
| **Microsoft** | Enterprise a11y, long-lived apps |
| **Airbnb** | Browse/maps, images, i18n |
| **Uber / Lyft** | Maps, live trip state, bad network |
| **Stripe / Square** | RBAC dashboards, correctness |
| **ByteDance / TikTok** | Feed/media, low-end devices |
| **Spotify** | Playback + browse continuity |
| **Shopify** | Extensibility, merchant flows, **PLP filters** |
| **Bloomberg** | Dense tables, keyboard, **live** ticks |
| **Observability vendors** (Datadog-style angle) | High-cardinality caution UX, **pause** live, chart perf |

---

## v1 vs later (cross-question)

| Feature | v1 | Later |
|---------|----|--------|
| Feed | Virtualize + pagination | Ranking experiments, richer cards |
| Chat | WS + list + reconnect | Threads, search |
| Search | Debounce + cache + a11y | Personalization |
| Dashboard | Main table + RBAC | Saved views, export |
| Live dashboard | Snapshot + one multiplexed stream + rAF batching | Worker downsample, shared-tab connection |
| Offline-first | Read cache + write outbox + idempotency | Background Sync, conflict merges, multi-tab locks |
| Homepage | Shell + islands | Deeper edge personalization |

---

## Extended topics (beyond Q1–Q12)

### Numbered deep dives (22–29)

| # | Topic | File |
|---|--------|------|
| 22 | Scalable dashboard | [22-scalable-dashboard.md](./22-scalable-dashboard.md) |
| 23 | Infinite scroll at huge scale | [23-infinite-scroll-millions-of-items.md](./23-infinite-scroll-millions-of-items.md) |
| 24 | Real-time notification system | [24-real-time-notification-system.md](./24-real-time-notification-system.md) |
| 25 | Frontend architecture for chat apps | [25-frontend-architecture-chat-apps.md](./25-frontend-architecture-chat-apps.md) |
| 26 | Feature flag system | [26-feature-flag-system.md](./26-feature-flag-system.md) |
| 27 | Client-side caching strategies | [27-client-side-caching-strategies.md](./27-client-side-caching-strategies.md) |
| 28 | Analytics and event tracking pipeline | [28-analytics-event-tracking-pipeline.md](./28-analytics-event-tracking-pipeline.md) |
| 29 | Error logging and monitoring | [29-error-logging-and-monitoring.md](./29-error-logging-and-monitoring.md) |

### Product-style scenarios

| Topic | File |
|--------|------|
| FAANG-style answer patterns | [faang-top-tier-frontend-system-design-answers.md](./faang-top-tier-frontend-system-design-answers.md) |
| Instagram-style UI | [instagram-frontend-design.md](./instagram-frontend-design.md) |
| Twitter-like feed | [twitter-like-feed-frontend.md](./twitter-like-feed-frontend.md) |
| Zomato-style discovery | [zomato-frontend-design.md](./zomato-frontend-design.md) |
| Scalable chat UI | [scalable-chat-ui-design.md](./scalable-chat-ui-design.md) |
| **Freshworks — Dynamic Role-Based Dashboard** (MFE + WS + Offline) | [freshworks-dynamic-role-based-dashboard.md](./freshworks-dynamic-role-based-dashboard.md) |
| **Survey Form System** (schema-driven, conditional logic, offline draft, file upload) | [survey-form-system-design.md](./survey-form-system-design.md) |

### Master reference

| File | What it covers |
|---|---|
| [**top-fe-system-design-questions.md**](./top-fe-system-design-questions.md) | All 25 top questions — full answers for Kanban, File Manager, Calendar, Photo Grid, Booking, Payments, Code Editor, Video Conferencing, Notifications, Onboarding Wizard + links to Q1–Q12 |

### Topic collections

- [Performance engineering](./performance-engineering/README.md)
- [Scalability architecture](./scalability-architecture/README.md)

---

*Prep material—not leaked questions. Practice one **Q#** for **50–60 minutes** with interruptions (or two **deep dives** only for ~30 min).*
