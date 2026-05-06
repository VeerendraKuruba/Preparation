# 01 — System Design Fundamentals

The vocabulary you need before everything else. Each term is paired with
"what it means here" — i.e. how it shows up in `the-app` — so you can
*answer interviews with examples*, not just definitions.

---

## 1. Latency, throughput, availability, durability

| Term | Definition | In this app |
|---|---|---|
| **Latency** | Time for one request to complete | Allocation page bootstrap fans out to ~10 GraphQL endpoints; latency = max of parallel calls |
| **Throughput** | Requests/sec the system can handle | Per-tenant; bounded by the slowest endpoint (often Identity or the orchestrator) |
| **Availability** | % of time the system is up (e.g. 99.9% = ~8h downtime/year) | Composite: a 99.9% endpoint × 10 in series = 99.0% page availability |
| **Durability** | % of writes that survive (e.g. 11 nines for S3) | Mostly a backend concern; FE relies on backend write acks |

**Interview-ready insight:** "When my page calls 10 services in parallel, my
availability isn't the average — it's the *product* of each service's
availability. Adding a service degrades the whole page's reliability."

---

## 2. Scalability — vertical vs horizontal

- **Vertical** = bigger machine (faster CPU, more RAM).
- **Horizontal** = more machines.

For a frontend plugin, "scaling" usually means:
- **CDN/edge caching** of the JS bundle (horizontal — more edge POPs).
- **Backend orchestrator** (`<MultiEntityOrchestrator>`, `<BIZ_ORCHESTRATOR>`) horizontally
  scaled behind a load balancer.
- **Per-tenant load** — one giant accountant firm with 1000 companies hits
  endpoints differently than a single SMB. Multi-tenant rate limits matter.

---

## 3. CAP theorem (for FE engineers)

In a partition (network split), a system picks **C**onsistency or
**A**vailability.

- Most user-facing FEs want **AP** — show stale data rather than show an error.
- Most finance writes want **CP** — refuse the write rather than risk a
  duplicate.

**In this app:** the Allocation save path is CP (it'll fail loudly rather
than retry blindly — see the `noRetry: true` default in
[src/restClient.ts](../../../multi-entity-ui/src/restClient.ts)). The hierarchy *read* path
should be AP (show last-known data when refresh fails) — and the recent
`caching-eh` PR seems to lean that way.

---

## 4. Eventual consistency

Two services with their own DBs converge over time. The user sees stale data
in between.

**Where you see it here:**
- User updates entity name in the Hierarchy widget. The Allocation widget
  cached the old name. Until Allocation refetches, names disagree.
- The `switchCompany` mutation
  ([IdentityService.ts:113](../../../multi-entity-ui/src/js/services/IdentityService.ts#L113))
  changes the *Identity* service's view of the active company. Other
  endpoints (COA, the orchestrator) read that lazily — there's a window where they see
  the previous company.

**Mitigation patterns:**
- **Read-your-writes:** after mutating, refetch from the *same* endpoint
  before navigating.
- **Cache invalidation by event:** publish "entity.updated" → all widgets
  refetch. (Not implemented here.)
- **Pessimistic UI:** disable buttons until backend confirms.

---

## 5. Consistency models, ranked

| Model | Meaning |
|---|---|
| **Strong** | Every read sees the latest write (single DB, transactions) |
| **Linearizable** | Writes appear in a single global order |
| **Sequential** | Each client sees a consistent order, but clients may differ |
| **Causal** | If A happens-before B, everyone sees A before B |
| **Eventual** | Eventually all replicas converge |

A multi-endpoint app like ours is *at best* **causal** within one tenant, and
**eventual** across tenants/regions. Never claim "strong consistency" for
anything spanning two services.

---

## 6. Caching layers

```
Browser memory   ──►  Service Worker  ──►  CDN edge  ──►  App server  ──►  DB
   (per-page)         (offline-first)     (static       (in-process)     (Redis,
                                            JS/CSS)                       memcached)
```

**Where this app caches:**
- **CDN:** the plugin's JS bundle is served from a CDN — the company's plugin
  delivery pipeline.
- **In-page memo:** React `useMemo`, the `Connect` HOC's memoization.
- **Apollo cache:** *intended* but not wired up — see
  [GQLProvider.tsx](../../../multi-entity-ui/src/js/providers/GQLProvider.tsx).
- **Browser HTTP cache:** governed by `Cache-Control` headers on each GraphQL
  endpoint. Most GraphQL POSTs are uncacheable by default.

**Cache invalidation** is the famous hard problem. The two strategies are:
- **TTL** — expires after N seconds. Good for "good enough" data.
- **Event-driven** — invalidate on a write. Requires a pub/sub.

**Pattern to remember: cache key must include the tenant ID.** Otherwise
company A's data leaks into company B. The `caching-eh` PR specifically must
get this right.

---

## 7. Load balancing

Backend concept, but FE engineers should know the basics:
- **Round robin** — simple, no state.
- **Least connections** — best when requests have varying durations.
- **Sticky / session affinity** — needed when servers hold session state;
  generally an anti-pattern.
- **Weighted** — for canary deploys (1% to new version).

In multi-region apps like Intuit, **GeoDNS** routes the user to the closest
region. The `region` field in
[loggerUtil.ts](../../../multi-entity-ui/src/js/utils/common/loggerUtil.ts) hints at multi-region
deployment.

---

## 8. Database fundamentals (FE relevant subset)

You don't run the DB, but interviews still ask. Keep these straight:

- **OLTP vs OLAP** — transactional (one-row reads/writes) vs analytical
  (aggregations over millions of rows).
- **SQL vs NoSQL** — joins+ACID vs scale+flexible schema. Most enterprise
  finance is SQL. A reporting cube might be NoSQL/columnar.
- **Indexes** — speed reads, slow writes. Always have an index on tenant_id.
- **Sharding** — split data across machines by a key (e.g. tenant_id).
- **Replication** — master/replica for read scaling and HA.

---

## 9. APIs

- **REST** — resource-oriented, multiple endpoints per resource, HTTP verbs.
- **GraphQL** — single endpoint per service, client picks fields. **This
  app's choice.** Reduces over-fetching; complicates caching.
- **gRPC** — binary, schema-first, server-server.
- **WebSocket / Server-Sent Events** — push from server to client.

**Your app uses GraphQL across ~13 endpoints.** That's unusual — typically
GraphQL is *one* endpoint that fans out internally. Having many GraphQL
endpoints means each domain team owns its schema, but you lose the
single-roundtrip benefit. See
[04-data-and-apis.md](04-data-and-apis.md) for why.

---

## 10. Idempotency

A request is idempotent if making it twice has the same effect as once.

- `GET` is naturally idempotent.
- `PUT`, `DELETE` should be idempotent.
- `POST` usually isn't — that's why
  [src/restClient.ts](../../../multi-entity-ui/src/restClient.ts) defaults `noRetry: true`.

For non-idempotent calls, the standard pattern is an **idempotency key** —
the client generates a UUID, the server stores results keyed by that UUID, so
retries return the same response. The plugin sets `generateIntuitTid: true`
which is a *trace* ID, not an idempotency key.

---

## 11. Backpressure & rate limiting

When the client outpaces the server:
- **Server-side rate limit** by API key or user → 429 response.
- **Client-side backoff** with jitter on 429/5xx.
- **Queue + worker** with bounded concurrency.

Risk in this app: an Allocation page mounting fans out 10 calls *immediately*.
A list of 50 allocations rendering 50 widgets fans out 500 calls. The
backend's per-tenant rate limit gets hit.

---

## 12. Observability — the three pillars

| Pillar | What it answers | In this app |
|---|---|---|
| **Logs** | What happened? | `sandbox.logger.info/error` ([loggerUtil.ts](../../../multi-entity-ui/src/js/utils/common/loggerUtil.ts)) |
| **Metrics** | How often? How fast? | Aggregated server-side from logs + perf framework (`@app-foundations/mmreadiness-perf-framewrk`) |
| **Traces** | Where did time go? | `generateIntuitTid: true` adds trace IDs to every request |

**Interaction tracking** is a fourth pillar specific to product engineering —
see [interactionUtils.ts](../../../multi-entity-ui/src/js/utils/common/interactionUtils.ts). It
measures user-flow latency end-to-end.

---

## 13. Security primitives

- **AuthN (authentication)** = "who are you?" → cookie/token.
- **AuthZ (authorization)** = "what can you do?" → policy decision.
- **CSRF** = trick a logged-in user's browser into making a request. Cookie
  auth + `credentials: 'include'` is exposed; mitigate with SameSite cookies
  + anti-CSRF tokens.
- **XSS** = inject script into the page. Mitigate with output encoding (React
  does this by default), CSP headers, and `@sbg/htmlescaper` (in deps).
- **SSRF, IDOR, etc.** — backend concerns mostly.

---

## 14. Distributed-system gotchas you should know by name

- **Thundering herd** — cache expires, all clients hit the origin at once.
- **Cache stampede** — same as above; mitigate with `stale-while-revalidate`
  or single-flight.
- **Hot key** — one tenant generates 90% of traffic; sharding by tenant
  doesn't help.
- **Split-brain** — network partition, both sides think they're primary.
- **Retry storm** — every client retries on 5xx, multiplying load.
- **Cascading failure** — one service slow → everyone holds connections →
  everything falls over. Mitigate with timeouts + circuit breakers.

You don't build the backend, but if interviewers ask "what would you do if
endpoint X starts failing for 5% of requests?" — your answer should reach
for **circuit breaker** and **bulkhead** patterns.

---

## 15. Numbers every engineer should know (Jeff Dean's latency table, abbreviated)

| Operation | Time |
|---|---|
| L1 cache | 0.5 ns |
| RAM | 100 ns |
| SSD random read | 150 µs |
| Round trip in same DC | 500 µs |
| **Round trip cross-region** | **150 ms** |
| HTTP request to typical API | 50–500 ms |

**Interview use:** "If my page makes 10 sequential cross-region calls, that's
1.5 seconds *just in network latency*. So I parallelize, and I co-locate
endpoints when I can."

---

## What to be able to do at the end of this file

- Define each term without looking.
- Give one concrete example from this codebase for each.
- Reach for the right pattern when an interviewer says "what if X scales /
  fails / slows down?"
