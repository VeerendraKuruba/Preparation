# Q10. Global shell / homepage (millions of users)

**Prompt variants:** **Homepage + header**; experiments; mostly read-heavy.

 [← Question index](./README.md)

**Deep dive:** [Scalable homepage](../scalable-homepage/homepage-millions-users.md)

---

### One-line mental model

**Edge-deliver a small shell**; personalize in **async islands**; never let secondary calls block **first meaningful paint**.

### Clarify scope in the interview

How much **personalization**? Regulatory/marketing cookie banners? **SSR** at edge?

### Goals & requirements

Full checklist: [scalable homepage](../scalable-homepage/homepage-millions-users.md) (**Goals**, caching, reliability, observability).

### High-level frontend architecture

CDN **HTML** shell → critical CSS/JS → client **hydrates** islands → fetches per user/experiment with timeouts.

### What the client does (core mechanics)

Summarize from homepage doc: split **shell vs dynamic**; **stale-while-revalidate**; **circuit breakers**; flag fallback.

### Trade-offs

Per-user HTML cache bust vs cohort-based edge cache.

### Failure modes & degradation

Default homepage if personalization fails; kill switch for widgets.

### Accessibility checklist

Don’t auto-rotate hero without control; motion preferences.

### Minute summary (closing)

Same **interview-style summary** as homepage doc: mostly **static/CDN shell**, **small cacheable variants**, **personalization off the critical path**, prove with **RUM**.

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Anonymous vs logged-in, geo, experiments, compliance (cookies), peak traffic |
| High-level architecture | 12–18 | Edge HTML, islands, origin services, cache keys |
| Deep dive 1 | 12–18 | **CDN caching** (`stale-while-revalidate`, cohorts) |
| Deep dive 2 | 12–18 | **Personalization isolation** or **feature flags at edge** |
| Trade-offs, failure, metrics | 8–12 | Kill switches, RUM SLOs |

**Extended checklist:** [scalable homepage](../scalable-homepage/homepage-millions-users.md) — use it as a second page of talking points during the same hour.

### What to draw (whiteboard)

- **CDN** serving `shell.html` with short TTL / SWR.
- **Islands:** Hero (static), **For you** (client fetch), **Ads** (isolated).
- **Flags:** edge evaluate vs browser evaluate (trade-off).
- Breaker: widget → **timeout** → fallback placeholder.

### Deep dives — pick 2

**A. Caching** — Cache key = locale + device class + **experiment bucket** (not user id for full page); `stale-while-revalidate`; **personalized JSON** separate from HTML; purge on deploy.

**B. Critical path budget** — Minimal JS for shell; inline critical CSS; **preload** only true LCP; third-parties **deferred** / consent-gated.

**C. Resilience** — **Timeouts** per upstream; **default content** for recs failure; bulkheads so one team’s module doesn’t 500 the route; **feature flag** kill.

**D. Observability** — RUM Vitals by region; synthetic homepage; cache hit ratio dashboards; incident playbooks for **origin** overload.

### Common follow-ups

- **“Per-user HTML?”** — Usually too expensive to cache; prefer **edge cohorts** + client personalization fetch.
- **“A/B layout?”** — Assign cohort early; avoid CLS when variant swaps; **stable** skeleton dimensions.
- **“Worldwide?”** — Multi-region origins; geo DNS; regional degrades; **static** fallback page.

### What you’d measure

- **LCP/INP/CLS** on homepage by device and market.
- **Origin** dependency latency and error budget per widget.
- **Business:** engagement with personalized modules vs default.

