# Designing a homepage for millions of users

> **Scope:** Detailed breakdown of global homepage architecture at scale. For the full interview question with trade-offs and code, see [Q10 — Global Shell / Homepage](../q10-global-shell-homepage.md).

## Goals

- **Fast first paint**: most users judge the homepage in hundreds of milliseconds.
- **High availability**: partial failure (ads, recommendations, profile) should not take down the shell.
- **Predictable cost**: traffic spikes (marketing, events) should scale mostly with **cache hits**, not origin load.

## Split the page

1. **Shell (critical path)**  
   Layout, nav, hero, primary CTA, footer—things that must work for everyone. Ship this as **small HTML + CSS + minimal JS**. Prefer **static generation** or **edge SSR** with aggressive caching.

2. **Personalized / dynamic blocks**  
   “For you”, geo, logged-in name, experiment flags—load **after** shell or in **islands**. Use **placeholders + skeletons** so LCP isn’t blocked.

3. **Third parties**  
   Load non-critical analytics/ads **deferred** or behind consent; don’t let them block rendering.

## Caching and delivery

- **CDN at the edge**: HTML (short TTL or `stale-while-revalidate`), images (long TTL, immutable filenames), fonts, JS/CSS.
- **Tiered caching**: browser → CDN → optional regional cache → origin.
- **Cache keys** must reflect **locale, device class, and experiment cohort** only where needed—avoid per-user keys for the whole page.

## Origin and compute

- **Precompute** what you can: build-time or periodic jobs for “default” homepage payloads.
- **Horizontally scaled** stateless web/API tier; **auto-scaling** for spikes.
- **Rate limiting** and **circuit breakers** on downstream calls so one bad dependency doesn’t melt the origin.

## Data and personalization

- **Read-heavy paths**: replicas, caches (Redis, etc.), eventual consistency is usually fine for recommendations.
- **Writes** (e.g. “continue watching”) off the critical path—async or client-side with reconciliation.

## Assets and UX

- **Image optimization**: responsive sizes, modern formats, priority hints only for true LCP image.
- **Code splitting**: route-level bundles; avoid huge client bundles for above-the-fold.
- **HTTP/2 or HTTP/3**, connection limits, **preload** sparingly.

## Reliability

- **Feature flags** to disable expensive modules instantly.
- **Graceful degradation**: if personalization fails, show default homepage.
- **Multi-AZ / multi-region** for durability; **health checks** and **automatic failover** for DNS/load balancers.

## Observability

- **Real User Monitoring** (Core Web Vitals, regional breakdown).
- **Synthetic checks** from several regions.
- Dashboards on **cache hit ratio, origin p95, error budget**, and **downstream latency**.

---

**Interview-style summary**: Treat the homepage as a **mostly static, CDN-served shell** with **small, cache-friendly variants**, push **personalization and risky dependencies** off the critical path, and **prove** performance with RUM—so millions of users mostly hit the edge, not your core services.
