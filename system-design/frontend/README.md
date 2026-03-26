# Frontend System Design — Interview Prep

Everything you need for a FAANG-level frontend system design round: 12 core question files, 20+ topic deep dives, product case studies, and a master reference — all structured so you can navigate in under 30 seconds.

---

## How to use this folder

A typical frontend system design loop is **dialogue + depth**, not a monologue. Pause for questions. Pick two areas to go deep.

| Phase | Time | What you do |
|---|---|---|
| Clarify & requirements | 8–12 min | Ask scope; write functional + non-functional list; agree on MVP vs nice-to-have |
| High-level architecture | 12–18 min | Browser → CDN/BFF → services diagram; narrate the critical user path end-to-end |
| Deep dive × 2 | 25–35 min | Pick two areas the interviewer steers toward; each: problem → approach → trade-off → failure mode |
| Trade-offs, wrap | 8–12 min | State what you'd cut for v1, one observability point, one a11y/security note, 60-second summary |

---

## Start here — by what you're preparing

| Preparing for | Start with |
|---|---|
| Social feed, timeline | [Q1](./q01-infinite-feed-social-timeline.md) → [23](./23-infinite-scroll-millions-of-items.md) → [instagram-frontend-design.md](./instagram-frontend-design.md) |
| Chat, messaging | [Q3](./q03-web-chat-dms.md) → [25](./25-frontend-architecture-chat-apps.md) |
| Video player | [Q4](./q04-video-watch-player.md) |
| Maps, geospatial UI | [Q5](./q05-maps-markers-clustering.md) → [google-maps-zoom-frontend.md](./google-maps-zoom-frontend.md) |
| E-commerce, PLP/PDP | [Q6](./q06-ecommerce-plp-pdp-cart.md) → [zomato-frontend-design.md](./zomato-frontend-design.md) |
| B2B dashboard, RBAC | [Q7](./q07-b2b-dashboard-rbac.md) → [22](./22-scalable-dashboard.md) → [38](./scalability-architecture/38-permissions-rbac-frontend.md) |
| Real-time / live data | [Q11](./q11-real-time-dashboard.md) → [22](./22-scalable-dashboard.md) → [24](./24-real-time-notification-system.md) |
| Offline-first, PWA | [Q12](./q12-offline-first-app.md) → [27](./27-client-side-caching-strategies.md) |
| Design system | [Q9](./q09-design-system-frontend-platform.md) → [airbnb-design-system.md](./airbnb-design-system.md) → [39](./scalability-architecture/39-reusable-component-systems.md) |
| Forms, schema-driven UI | [survey-form-system-design.md](./survey-form-system-design.md) |
| Homepage, global shell | [Q10](./q10-global-shell-homepage.md) → [scalable-homepage](./scalable-homepage/homepage-millions-users.md) |
| Micro-frontends | [micro-frontends.md](./micro-frontends.md) → [micro-fe-module-federation](./micro-fe-module-federation/README.md) |
| Performance | [20](./performance-engineering/20-reduce-bundle-size.md) → [19](./performance-engineering/19-optimize-expensive-computations.md) → [performance-engineering/](./performance-engineering/README.md) |
| Caching strategies | [27](./27-client-side-caching-strategies.md) → [Q12](./q12-offline-first-app.md) |
| State management | [36](./scalability-architecture/36-state-management-at-scale.md) |
| RBAC, permissions | [38](./scalability-architecture/38-permissions-rbac-frontend.md) → [Q7](./q07-b2b-dashboard-rbac.md) |
| Analytics, event tracking | [28](./28-analytics-event-tracking-pipeline.md) |
| Error monitoring | [29](./29-error-logging-and-monitoring.md) |
| Feature flags | [26](./26-feature-flag-system.md) |
| Search, typeahead | [Q2](./q02-search-typeahead-autocomplete.md) |
| Collaborative editing | [Q8](./q08-collaborative-editor-docs-lite.md) |

---

## Core Interview Questions (Q1–Q12)

One file per question. Each covers: mental model → clarify → architecture → mechanics → trade-offs → failure modes → a11y → summary + ~60 min of material.

| # | Topic | Key themes | File |
|---|---|---|---|
| Q1 | Infinite feed / social timeline | virtualization, pagination, optimistic UI | [q01-infinite-feed-social-timeline.md](./q01-infinite-feed-social-timeline.md) |
| Q2 | Search + typeahead / autocomplete | debounce, caching, a11y | [q02-search-typeahead-autocomplete.md](./q02-search-typeahead-autocomplete.md) |
| Q3 | Web chat / DMs | WebSocket, reconnect, message ordering | [q03-web-chat-dms.md](./q03-web-chat-dms.md) |
| Q4 | Video watch page / player | adaptive streaming, buffering, preload | [q04-video-watch-player.md](./q04-video-watch-player.md) |
| Q5 | Maps-heavy UI (markers, clustering) | tile loading, clustering, interaction | [q05-maps-markers-clustering.md](./q05-maps-markers-clustering.md) |
| Q6 | E-commerce (filters, PLP, PDP, cart) | SEO, filter state, cart correctness | [q06-ecommerce-plp-pdp-cart.md](./q06-ecommerce-plp-pdp-cart.md) |
| Q7 | B2B dashboard (tables, RBAC) | RBAC, dense tables, live updates | [q07-b2b-dashboard-rbac.md](./q07-b2b-dashboard-rbac.md) |
| Q8 | Collaborative editor (docs-lite) | OT/CRDT, presence, conflict resolution | [q08-collaborative-editor-docs-lite.md](./q08-collaborative-editor-docs-lite.md) |
| Q9 | Design system / frontend platform | tokens, versioning, a11y, adoption | [q09-design-system-frontend-platform.md](./q09-design-system-frontend-platform.md) |
| Q10 | Global shell / homepage at scale | SSR/SSG, islands, CDN, personalization | [q10-global-shell-homepage.md](./q10-global-shell-homepage.md) |
| Q11 | Real-time dashboard (live metrics) | SSE/WS, rAF batching, back-pressure | [q11-real-time-dashboard.md](./q11-real-time-dashboard.md) |
| Q12 | Offline-first app (SW, IDB, outbox) | Service Worker, IndexedDB, sync queue | [q12-offline-first-app.md](./q12-offline-first-app.md) |

---

## Topic Deep Dives

### Dashboard & Real-time

| # | Topic | File |
|---|---|---|
| 22 | Scalable dashboard | [22-scalable-dashboard.md](./22-scalable-dashboard.md) |
| Q11 | Real-time dashboard (live metrics) | [q11-real-time-dashboard.md](./q11-real-time-dashboard.md) |
| Q7 | B2B dashboard with RBAC | [q07-b2b-dashboard-rbac.md](./q07-b2b-dashboard-rbac.md) |

### Lists & Scroll

| # | Topic | File |
|---|---|---|
| 23 | Infinite scroll at millions of items | [23-infinite-scroll-millions-of-items.md](./23-infinite-scroll-millions-of-items.md) |
| 16 | Optimize large lists | [performance-engineering/16-optimize-large-lists.md](./performance-engineering/16-optimize-large-lists.md) |
| 17 | List virtualization | [performance-engineering/17-list-virtualization.md](./performance-engineering/17-list-virtualization.md) |

### Communication & Real-time

| # | Topic | File |
|---|---|---|
| Q3 | Web chat / DMs | [q03-web-chat-dms.md](./q03-web-chat-dms.md) |
| 24 | Real-time notification system | [24-real-time-notification-system.md](./24-real-time-notification-system.md) |
| 25 | Frontend architecture for chat apps | [25-frontend-architecture-chat-apps.md](./25-frontend-architecture-chat-apps.md) |

### Caching & Offline

| # | Topic | File |
|---|---|---|
| 27 | Client-side caching strategies | [27-client-side-caching-strategies.md](./27-client-side-caching-strategies.md) |
| Q12 | Offline-first app (SW, IDB, outbox) | [q12-offline-first-app.md](./q12-offline-first-app.md) |

### Performance

| # | Topic | File |
|---|---|---|
| 20 | Reduce bundle size | [performance-engineering/20-reduce-bundle-size.md](./performance-engineering/20-reduce-bundle-size.md) |
| 19 | Optimize expensive computations | [performance-engineering/19-optimize-expensive-computations.md](./performance-engineering/19-optimize-expensive-computations.md) |
| 18 | Prevent unnecessary React re-renders | [performance-engineering/18-prevent-unnecessary-react-rerenders.md](./performance-engineering/18-prevent-unnecessary-react-rerenders.md) |
| 21 | Heavy API data without blocking UI | [performance-engineering/21-heavy-api-data-without-blocking-ui.md](./performance-engineering/21-heavy-api-data-without-blocking-ui.md) |
| 16 | Optimize large lists | [performance-engineering/16-optimize-large-lists.md](./performance-engineering/16-optimize-large-lists.md) |
| 17 | List virtualization | [performance-engineering/17-list-virtualization.md](./performance-engineering/17-list-virtualization.md) |

Full collection: [performance-engineering/](./performance-engineering/README.md)

### Architecture & Scale

| # | Topic | File |
|---|---|---|
| 36 | State management at scale | [scalability-architecture/36-state-management-at-scale.md](./scalability-architecture/36-state-management-at-scale.md) |
| 37 | Structuring large React codebases | [scalability-architecture/37-structuring-large-react-codebases.md](./scalability-architecture/37-structuring-large-react-codebases.md) |
| 38 | Permissions & RBAC on the frontend | [scalability-architecture/38-permissions-rbac-frontend.md](./scalability-architecture/38-permissions-rbac-frontend.md) |
| 39 | Reusable component systems | [scalability-architecture/39-reusable-component-systems.md](./scalability-architecture/39-reusable-component-systems.md) |
| 40 | Handling API failures gracefully | [scalability-architecture/40-api-failures-gracefully.md](./scalability-architecture/40-api-failures-gracefully.md) |
| — | Micro-frontends | [micro-frontends.md](./micro-frontends.md) · [micro-fe-module-federation/](./micro-fe-module-federation/README.md) |

Full collection: [scalability-architecture/](./scalability-architecture/README.md)

### Reliability

| # | Topic | File |
|---|---|---|
| 29 | Error logging and monitoring | [29-error-logging-and-monitoring.md](./29-error-logging-and-monitoring.md) |
| 28 | Analytics and event tracking pipeline | [28-analytics-event-tracking-pipeline.md](./28-analytics-event-tracking-pipeline.md) |
| 40 | Handling API failures gracefully | [scalability-architecture/40-api-failures-gracefully.md](./scalability-architecture/40-api-failures-gracefully.md) |
| 26 | Feature flag system | [26-feature-flag-system.md](./26-feature-flag-system.md) |

---

## Product Case Studies

Real-world product prompts with specific company context.

| Product / Company | What it covers | File |
|---|---|---|
| Instagram-style UI | Feed, stories, infinite scroll, media optimization | [instagram-frontend-design.md](./instagram-frontend-design.md) |
| Zomato-style discovery | Search, filters, maps, listing scale | [zomato-frontend-design.md](./zomato-frontend-design.md) |
| Freshworks dynamic dashboard | MFE + WebSocket + Offline + Role-based views | [freshworks-dynamic-role-based-dashboard.md](./freshworks-dynamic-role-based-dashboard.md) |
| Survey form system | Schema-driven forms, conditional logic, offline draft, file upload | [survey-form-system-design.md](./survey-form-system-design.md) |
| Airbnb design system | Design language system, tokens, adoption at scale | [airbnb-design-system.md](./airbnb-design-system.md) |
| Google Maps zoom | Tile loading, zoom levels, clustering, viewport math | [google-maps-zoom-frontend.md](./google-maps-zoom-frontend.md) |
| Scalable homepage | SSR/SSG, islands architecture, personalization at edge | [scalable-homepage/homepage-millions-users.md](./scalable-homepage/homepage-millions-users.md) |

---

## Master Reference

| File | What it covers |
|---|---|
| [top-fe-system-design-questions.md](./top-fe-system-design-questions.md) | 25 top questions with full answers — Kanban, File Manager, Calendar, Photo Grid, Booking, Payments, Code Editor, Video Conferencing, Notifications, Onboarding Wizard + links back to Q1–Q12 for overlap topics |

Use this for Tier 2 questions that don't appear in Q1–Q12. It's also a good scan before a broad interview where the topic is unknown.

---

## Company focus

Same question, different emphasis. Tailor your deep-dive picks accordingly.

| Company / bucket | Stress extra |
|---|---|
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
| **Shopify** | Extensibility, merchant flows, PLP filters |
| **Bloomberg** | Dense tables, keyboard, live ticks |
| **Observability vendors** | High-cardinality caution UX, pause-live UX, chart perf |

---

## v1 vs later cheat sheet

| Feature | v1 | Later |
|---|---|---|
| Feed | Virtualize + pagination | Ranking experiments, richer cards |
| Chat | WS + list + reconnect | Threads, search |
| Search | Debounce + cache + a11y | Personalization |
| Dashboard | Main table + RBAC | Saved views, export |
| Live dashboard | Snapshot + one multiplexed stream + rAF batching | Worker downsample, shared-tab connection |
| Offline-first | Read cache + write outbox + idempotency | Background Sync, conflict merges, multi-tab locks |
| Homepage | Shell + islands | Deeper edge personalization |
| Design system | Tokens + core components + docs site | Codemods, automated a11y audits, versioned changelogs |

---

*Prep material — not leaked questions. Practice one Q# file out loud with a 50-minute timer and let someone interrupt you.*
