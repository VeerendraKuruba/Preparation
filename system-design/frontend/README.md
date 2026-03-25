# Frontend system design (interview prep)

 [← **Parent: all prep in one folder**](../README.md)

Notes for rounds where you **design a web client** (not backend-heavy distributed systems). Interviewers care about **user experience, performance, accessibility, maintainability, and how the UI integrates** with APIs and other teams.

## How to structure your answer (5–10 minutes)

1. **Clarify scope**  
   Product type (dashboard, content site, real-time app)? Primary users and devices? Offline needs? SEO critical? Auth model (public, logged-in, B2B)?

2. **Non-functional requirements**  
   Call out **latency** (TTI, LCP), **scale** (concurrent users, bundle size budget), **consistency** (design system), **accessibility** (WCAG), **security** (XSS, CSP, token storage).

3. **High-level diagram**  
   Browser, CDN, BFF/API gateway (if any), services. Where **HTML is produced** (SSR, static, SPA shell) and where **state** lives.

4. **Deep dive on 1–2 areas**  
   Pick what matters for the prompt: routing, data fetching, caching, real-time, **micro frontends**, image/media, internationalization.

5. **Trade-offs and failure modes**  
   What breaks first under load? How do you degrade gracefully? What would you simplify for v1?

## Frontend angles interviewers probe

| Area | What to mention |
|------|------------------|
| **Rendering** | SSR vs SSG vs CSR vs islands; hydration cost; streaming HTML |
| **Routing** | Code splitting per route; deep links; auth guards |
| **Data** | REST vs GraphQL; cache layers (HTTP, SWR/React Query, service worker) |
| **State** | Server vs client state; URL as state; when global store is justified |
| **Performance** | Bundle budget, lazy loading, images (lazy, responsive, CDN), prefetch |
| **DX & scale** | Monorepo vs polyrepo; design system; **micro frontends** when many teams own UI |
| **Observability** | RUM, Web Vitals, error boundaries, source maps |
| **Security** | CSP, sanitization, cookie vs memory token trade-offs |

## Docs in this folder

- [Micro frontends](./micro-frontends.md) — definition, integration patterns, small example, trade-offs, talking points.
- [Google Maps zoom (frontend)](./google-maps-zoom-frontend.md) — tile pyramid, gestures, scheduling, caching, rendering trade-offs.
- [Airbnb Design Language System (DLS)](./airbnb-design-system.md) — principles, multi-platform mapping, governance, interview framing, references.
- [Scalable homepage](./scalable-homepage/homepage-millions-users.md) — shell vs dynamic blocks, CDN/caching, origin/personalization, reliability, observability.
- [Instagram (frontend)](./instagram-frontend-design.md) — feed, Stories, Reels, DMs, media pipeline, virtualization, real-time.
- [Scalable chat UI](./scalable-chat-ui-design.md) — WebSocket transport, cursor history, optimistic send, virtualization, presence.
- [Twitter / X–like feed](./twitter-like-feed-frontend.md) — ranked timeline, pagination, realtime merge, compose & threads.
- [Zomato (frontend)](./zomato-frontend-design.md) — discovery, map + list, menu/cart/checkout, low-network performance.
- [Frontend system design round](./system-design-round/README.md) — **Q1–Q12** (e‑commerce filters/listing, **real-time dashboard**, **offline-first**, …); topic finder in index. ([Old combined file stub →](./faang-top-tier-frontend-system-design-answers.md))

## Code & machine-coding (same repo folder)

- [React hands-on drills (~45 min)](../react-hands-on-45min/) — JSX components (virtual list, forms, …).
- [Interview prep: JS + JSX + perf + briefs](../interview-prep/) — debounce, tables, modals, system-design one-pagers.

Add new topics here as separate markdown files (e.g. `design-system.md`, `real-time-frontend.md`) when you extend your prep.
