# 05 — Scalability & Performance

How the app holds up under load and how to keep it fast.

---

## 1. The four dimensions of scale (for an FE)

| Dimension | Question |
|---|---|
| **Users** | 100? 100k? Concurrent? |
| **Tenants** | A few big ones, or many small ones? |
| **Data per tenant** | 10 entities, or 10,000? |
| **Geographies** | One region, or globally distributed? |

This app's profile:
- Users: millions of the host app users, but **active concurrent on multi-entity** is
  a small fraction.
- Tenants: a long tail. One firm-of-firms might manage 1000+ companies; a
  small business has 1.
- Data per tenant: the **enterprise/firm** case is where lists get big —
  hierarchies of 100+ entities.
- Geographies: US, CA, UK, AU, FR/EU — multi-region.

**The scaling pain points are not "more users" — they're "one giant tenant."**

---

## 2. Identifying the slow path

```
Page Open
  │ ~50ms   DNS + TLS
  │ ~100ms  Host shell loads
  │ ~200ms  Plugin bundle download (CDN)
  │ ~50ms   Plugin parse + execute
  │ ~700ms  N parallel GraphQL fetches (slowest wins)
  │ ~100ms  React render + commit
  │ ───────
  │ ~1.2s   first usable paint
```

The **biggest variable** is the GraphQL fan-out. Cutting it has the highest
ROI.

**How to measure:**
- Chrome DevTools → Performance tab → record page load.
- The `interactionUtils` helpers
  ([src/js/utils/common/interactionUtils.ts](../../../multi-entity-ui/src/js/utils/common/interactionUtils.ts))
  emit timed events for user flows — wire them into a dashboard.
- The repo has `@app-foundations/mmreadiness-perf-framewrk` — a perf
  framework specifically for plugin readiness measurement.

---

## 3. Bundle size — the FE-specific scaling concern

A widget's bundle ships **on every page load**. A 200KB regression × 1M users
× 10 page loads/user/day = 2 PB/day extra CDN egress. That's expensive *and*
slows users.

**Tactics:**
- **Tree-shake.** `lodash-es` over `lodash` (the repo already does this).
  But two things to check:
  - `import _ from 'lodash-es'` defeats it; use named imports.
  - Same for icon libraries — `import { Icon } from '@ids-ts/icon'` not
    `import * as Icons from ...`.
- **Code-split** routes/modals.
- **Avoid duplicate deps** across MFEs (host-shared).
- **Audit** with `webpack-bundle-analyzer`.

---

## 4. Time-to-Interactive (TTI) recipe

```
1. Reduce critical bundle size
   - Code-split non-critical
   - Defer analytics
2. Parallelize fetches; remove waterfalls
   - Fire all bootstrap queries on mount, not chained
3. Server-driven hints
   - <link rel="preconnect"> to known endpoints
   - <link rel="prefetch"> to next-likely widget
4. Skeleton UI immediately
   - Return placeholders before data
5. Hydrate progressively
   - Render visible widgets first; lazy-mount the rest
```

This app's `prefetchWidgets` helper hits #3. The Apollo no-op
([GQLProvider.tsx](../../../multi-entity-ui/src/js/providers/GQLProvider.tsx)) is a missed #2 —
two components fetching the same query both fire, instead of deduping.

---

## 5. The N+1 problem on the client

Imagine a list of 20 transactions, each row fetching its category name:

```
1 query for transactions
+ 20 queries for categories
= 21 queries (the N+1)
```

Fix on the **client**: include category name in the list query (or use a
single batched lookup). Fix on the **server**: DataLoader to coalesce N
single fetches into 1 batch.

Watch for this pattern in any list rendering. It's the easiest perf bug to
ship.

---

## 6. Virtualization for large lists

Rendering 1,000 DOM nodes is slow. **Windowing** (react-window, react-virtual)
renders only what's visible plus a small overscan.

For an MFE: **don't render 100 widget instances eagerly**. Even with
virtualization, each widget's bundle parses on first render. Combine
virtualization with **lazy widget mounting**.

---

## 7. Memoization — and when it hurts

`useMemo` and `useCallback` aren't free; they have hash overhead and clutter.
Use them only when:
- The downstream tree is expensive to re-render, AND
- Reference identity matters (e.g. passed to `React.memo`'d children).

**Default to no memoization.** Profile first.

The `Connect` HOC in this repo
([allocation/store/connect.tsx](../../../multi-entity-ui/src/js/allocation/store/connect.tsx))
memoizes correctly — the `mapStateToProps` result is `useMemo`'d on
`[state, props]`. That's how `react-redux`'s `connect` historically worked.

---

## 8. Re-render avoidance in MFEs

A widget mounting causes a re-render. With ~10 widgets on a dashboard:
- Don't pass new object/array literals as props every render.
- Don't recreate sandbox-derived data each render.
- Don't put server data in a top-level state that all widgets subscribe to.

The provider in
[allocation/store/provider.tsx](../../../multi-entity-ui/src/js/allocation/store/provider.tsx)
re-renders every consumer on every state change because the context value is
a fresh object each render. For perf, split into a stable sandbox context +
a state context.

---

## 9. Image, font, and asset perf

Not heavy in this app, but for completeness:
- `<img>` should have explicit width/height to avoid CLS.
- `loading="lazy"` for offscreen images.
- WebP/AVIF over PNG when supported.
- Font: `font-display: swap` to avoid blocking text.

---

## 10. Network optimization

- **HTTP/2 multiplexing** — many requests on one connection. The browser
  already does this if the server supports it.
- **HTTP/3 (QUIC)** — faster handshake, better on lossy networks. Ask if
  your endpoints support it.
- **`<link rel="preconnect">`** to each backend origin — saves DNS+TLS for
  the first call.
- **Persisted GraphQL queries** — send a query *hash* instead of the full
  query text. Smaller upload + cacheable at edge.

---

## 11. Resilience patterns (borrowed from backend)

You can apply these client-side too:

- **Timeout** — every fetch has one. Don't rely on browser default.
- **Circuit breaker** — after N failures to endpoint X, stop calling for T
  seconds. Show degraded UI.
- **Bulkhead** — isolate failure domains. One slow endpoint shouldn't tie up
  resources used by another.
- **Hedged requests** — for read-only critical paths, fire 2 requests in
  parallel, take the first to respond. Costs 2x backend load — use sparingly.

---

## 12. Multi-region

If the user is in Frankfurt and the API is in Virginia, every call is +120ms
round trip. With 10 calls in parallel, still +120ms (parallel). With 10 in
series, +1.2s.

**Solutions:**
- **Region-pinned endpoints.** The `region` field in
  [loggerUtil.ts](../../../multi-entity-ui/src/js/utils/common/loggerUtil.ts) suggests this
  exists; verify the *data* endpoints (not just logs) are region-routed.
- **Edge compute** for stateless reads.
- **Read replicas in-region** for hot tenants.

For data-residency: the data **must** stay in region. That's not just a perf
choice; it's compliance.

---

## 13. Capacity planning numbers (interview cheat sheet)

For an estimation question:
- 1 RPS sustained ≈ 86k requests/day.
- 1KB response × 1M users × 10 calls = 10 GB/day egress (per call, per user).
- A typical NodeJS service handles ~1k RPS per instance.
- Postgres single-master scales to ~10k RPS reads with replicas.
- Redis ~100k ops/sec.

Use these as Fermi estimates when interviewers say "how would you size
this?"

---

## 14. Observability for perf

You can't optimize what you don't measure.

```
Per-flow timing (interactionUtils)
   ↓
Aggregated to time-series (Splunk/Datadog)
   ↓
Dashboards with P50/P90/P99
   ↓
Alerts on regressions (P95 > 2x of last week)
```

The interaction IDs in
[constants/interaction.ts](../../../multi-entity-ui/src/js/constants/interaction.ts) are the
glue. Every named flow gets a P95 and a budget. Regressions page on-call.

---

## 15. A perf war story you can tell

> "Our Allocation page bootstrap fans out to 10 GraphQL endpoints. Profiling
> showed the page TTI was bounded by the slowest endpoint — usually
> Bookkeeping the journal-entry service under load. Two changes helped: (1) we moved the slow
> endpoint behind a `useDeferredValue` so the page rendered the rest first
> and the slow widget showed a skeleton, and (2) we added a tenant-scoped
> Apollo cache so refresh was instant for repeat visits within a session.
> P75 TTI went from 2.4s to 1.1s; P99 from 6s to 2.8s."

You don't need this exact story to be true — you need to be able to *tell*
this kind of story, with the same shape: **measure → identify bottleneck →
two targeted changes → quantified outcome.** That's what senior interviews
listen for.
