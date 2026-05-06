# 04 — Data & APIs

How data moves between the FE and the ~13 backend services. The deepest
section because most interview pressure lands here.

---

## 1. GraphQL vs REST — the real tradeoff

| | REST | GraphQL |
|---|---|---|
| Endpoint shape | Many | One per service |
| Client picks fields | No (BFF or trim) | Yes |
| Caching | HTTP cache (URL is the key) | Manual / normalized (POST is uncacheable) |
| Discoverability | OpenAPI/Swagger | Introspection |
| Versioning | URL `/v1/` | Schema evolution + deprecation |
| Tooling | Mature, simple | Powerful, complex |

**Why this app picked GraphQL:** the data is *graph-shaped* (companies have
hierarchies, transactions have line items, allocations span multiple
companies). REST would mean N+1 calls or bespoke aggregation endpoints.

**Why having 13 GraphQL endpoints is unusual:** typically GraphQL is *one*
endpoint per app, with a federation gateway behind it. Here, each domain
team owns their own GraphQL — so the FE plays the federation role.

---

## 2. Why so many endpoints? (And what to do about it)

```
Domain team   →  owns service  →  owns GraphQL endpoint
─────────────────────────────────────────────────────────
Identity team →  identity      →  identity.api.example.com
Account team  →  accounts      →  accounts.example.com/identity-api
COA team      →  COA           →  coa-core.api.example.com
…
```

**Pros of this org structure:**
- Strong ownership.
- Independent deploy + schema evolution.

**Cons for clients:**
- Round-trip explosion.
- Auth must be re-validated everywhere.
- No cross-service consistency.

**Mitigations the industry uses:**
1. **Federation gateway** (Apollo Federation, Hasura) — one URL, internal
   fan-out, schema stitching. The team can keep ownership of subschemas.
2. **BFF per UI surface** — a dedicated team owns the orchestrator that the
   FE calls. The orchestrator calls all the underlying services. That's
   what `<MultiEntityOrchestrator>` looks like for new flows here.
3. **Edge cache + persisted queries** — even with many endpoints, persisted
   queries let the edge identify a query by hash and cache it.

**Recommendation for this app:** consolidate page-bootstrap fan-out behind
the orchestrator. Keep direct calls only for late, user-triggered actions where the
fan-out cost is low.

---

## 3. The request lifecycle (full path)

For one read: `getBusinessInfoForCompany(companyId, sandbox)` from
[IdentityService.ts](../../../multi-entity-ui/src/js/services/IdentityService.ts).

```
Component
   │ calls service function
   ▼
Service layer (IdentityService.ts)
   │ calls getGQLClient(sandbox, {}, IDENTITY)
   ▼
restClient.ts → getGQLClient
   │ - reads sandbox.appContext.getEnvironment() → "prod"
   │ - reads sandbox.pluginConfig...apiKey       → "abc..."
   │ - picks IDENTITY_URL[env]                   → identity.api.example.com
   │ - builds config { authType, credentials, apiKey, sandbox }
   │ - returns new GraphqlClient
   ▼
GraphqlClient.query(GET_COMPANY_INFO, vars, headers)
   │ POST to graphql endpoint
   │ Headers: Cookie: session=…       (auto from browser)
   │          trace_id: <traceId>   (added by client)
   │          x-app-id: <apiKey>      (or whatever the lib calls it)
   │ Body: { query: GET_COMPANY_INFO, variables: {...} }
   ▼
Edge / WAF
   │ - TLS termination
   │ - rate limiting per (apiKey, ip)
   │ - DDoS shielding
   ▼
Identity service
   │ - validates session cookie via cookie auth filter
   │ - resolves user → tenant context
   │ - validates AuthZ on the field paths in the query
   │ - executes resolvers
   ▼
Response (200 + GraphQL JSON, or 4xx/5xx)
   │ Component handles via .then / await
   │ On error → handleNetworkErrors → reject with structured error
   │ On success → response.json() → dispatch into store
```

**Where things commonly go wrong:**
- Client sends to wrong env URL → CORS error.
- Cookie not attached → 401 (forgot `credentials: 'include'`).
- Cookie attached but expired → 401 → no auto-refresh logic in the plugin.
- Network blip → `noRetry: true` means hard fail.
- 200 but `{ errors: [...] }` payload → must check;
  [common.ts](../../../multi-entity-ui/src/js/services/common.ts) does.

---

## 4. Retries — read vs write

A retry is **only** safe on idempotent operations.

```
Reads (queries):
  ✅ retry on 5xx, network error, timeout
  ✅ exponential backoff with jitter
  ✅ cap retries (3-5)
  ✅ honor Retry-After on 429

Writes (mutations):
  ❌ never blind-retry
  ✅ allow retry IF you provide an idempotency key
     (server stores result keyed by the key, returns same response)
```

**This app's default is `noRetry: true`** — safe for writes, wasteful for
reads. The right design is **two factory methods**: `getQueryClient` (with
retries) and `getMutationClient` (no retries unless idempotency-keyed).

---

## 5. Idempotency keys

```
Client                                Server
   │                                    │
   │ generate UUID v4: idem-key-X       │
   │                                    │
   │ POST /allocations                  │
   │ Idempotency-Key: idem-key-X        │
   │ {body}                             │
   │ ─────────────────────────────────► │
   │                                    │ check key store
   │                                    │ - if exists → return stored response
   │                                    │ - if new → execute, store result
   │ ◄─────────────────────────────────│ 201 Created
   │                                    │
   │ (network blip — no response seen)  │
   │                                    │
   │ retry POST /allocations            │
   │ Idempotency-Key: idem-key-X        │ ← same key
   │ ─────────────────────────────────► │
   │                                    │ key exists → return cached 201
   │ ◄─────────────────────────────────│
```

This is how **Stripe** does it. Any finance-grade write should have it.

---

## 6. Concurrency control

When two users edit the same entity:

- **Last write wins** — simplest, dangerous for finance.
- **Optimistic concurrency** — client sends `version: N`, server rejects if
  current version != N. (HTTP equivalent: `If-Match: etag`.)
- **Pessimistic locking** — server takes a lock on read; rare in HTTP APIs.

**For Allocation:** if two users open the same transaction and both
allocate, what happens? The interview answer: optimistic concurrency with a
`lastModified` token. The save mutation fails on conflict; the client
shows "this changed elsewhere, refresh."

---

## 7. Long-running operations (saga patterns)

Some operations span many services and can't be done in one request:
- "Migrate company from single-entity to multi-entity" — touches Identity,
  Account, COA, Bookkeeping.

You'd model this as a **saga**:
- Step 1: provision in Identity.
- Step 2: enroll Account.
- Step 3: copy COA.
- Step N: emit completion event.

If step K fails, run **compensating transactions** for steps 1..K-1.

**On the client side**, the FE needs:
- A way to poll progress (`migration-progress` widget!).
- A way to resume if the user closes the tab.
- A way to handle a half-failed migration.

---

## 8. Pagination

Three styles:
- **Offset/limit** — `?page=3&size=20`. Simple, slow on large tables, drift
  on inserts.
- **Cursor-based** — `?after=opaque_cursor&first=20`. Stable, scales.
- **Keyset** — `?after_id=12345`. Fast on indexed columns.

This app uses **cursor-based pagination** — see
`pagination: { first: 2000 }` in
[IdentityService.ts](../../../multi-entity-ui/src/js/services/IdentityService.ts).

`first: 2000` is a *page size*, but 2000 is huge. That's a "fetch all" with
a safety cap. For lists where data may grow, replace with proper paging.

---

## 9. Real-time updates

Sometimes polling isn't enough.

| Approach | When |
|---|---|
| **Polling** | Simple, fine for slow updates |
| **Long-polling** | Backwards-compatible, fewer tools |
| **WebSocket** | Bi-directional, persistent, complex |
| **Server-Sent Events (SSE)** | Server→client only, simpler than WS |
| **GraphQL Subscriptions** | Built on WS, schema-typed |

This app doesn't use any of these — every refresh is a manual refetch. For
collaborative editing or real-time dashboards, you'd add WS.

---

## 10. Caching, the important details

### 10.1 Where to cache

```
1. CDN — bundles only (POSTs aren't cached at the edge by default)
2. Apollo / React Query memory cache — server data
3. localStorage — user preferences (NEVER tokens)
4. IndexedDB — large or offline-first data
5. Service Worker — offline + cache
```

### 10.2 Cache key design — multi-tenant safety

The non-negotiable rule: **every cache key includes the tenant identifier**.

```
WRONG: cache.set('user:123', user)
RIGHT: cache.set('tenant:456:user:123', user)
```

Otherwise: user Alice in tenant A views entity 7. User Bob in tenant B views
the same id 7 (different data). Without tenant-scoped keys, Bob sees
Alice's data.

### 10.3 Stale-while-revalidate

```
T0: cached → return immediately, kick off refetch
T1: refetch returns → update cache → re-render
```

Best-of-both: instant UI + freshness. React Query and Apollo (with
`fetchPolicy: 'cache-and-network'`) do this out of the box.

### 10.4 Invalidation

Two strategies:
- **TTL** — `staleTime: 30s`. Easy.
- **Event-driven** — after a mutation, evict queries that depend on the
  changed type. Apollo supports this via `cache.evict({fieldName})` and
  `refetchQueries`.

This app does *neither* today, because the cache layer is missing.

---

## 11. Backpressure on the client

A list of 50 entities each fetching 5 pieces of data = 250 simultaneous
calls. Even if the backend can handle it, the browser's per-origin
concurrent connection cap is ~6 (HTTP/1.1) or higher (HTTP/2).

**Mitigations:**
- **Batch:** GraphQL is naturally one query for many fields.
- **DataLoader pattern** server-side to coalesce.
- **Client concurrency cap:** queue requests, run N at a time.
- **Virtualization:** don't render 50 widgets at once; render visible.

---

## 12. Error responses — agree on a shape

Every team's GraphQL schema may return errors differently. A consistent
client-side error envelope makes life easier:

```ts
type AppError = {
  code: 'AUTH_EXPIRED' | 'PERMISSION_DENIED' | 'VALIDATION' | 'INTERNAL';
  message: string;       // for logs, not UI
  userMessage?: string;  // i18n-keyed, safe for UI
  details?: unknown;
  traceId?: string;
};
```

[src/js/services/common.ts](../../../multi-entity-ui/src/js/services/common.ts) is the place
to centralize this.

---

## 13. Sample interview question + reference answer

> **Q: Walk me through how you'd design the data layer for a page that
> fetches from 10 different services on load.**

**A:** I'd put a BFF in front of the 10 services — one round-trip from the
client. The BFF fans out, applies parallelism caps, retries idempotent
calls with jitter, and returns a single consolidated payload. The client
uses Apollo (or React Query) with a tenant-scoped cache, so the same query
during the session doesn't re-hit the BFF. Mutations go through the BFF
too, but with idempotency keys so client retries are safe. For the cases
where a BFF doesn't exist, the FE makes parallel calls and renders
progressively — a slow service shouldn't block the others. Failure modes:
each call has a per-section error boundary so one out of ten failing only
breaks one section. Observability: each call is tagged with a trace ID
threaded from the page bootstrap. Logs/metrics dashboards alert when P95 of
the page bootstrap exceeds budget.

That's about 90 seconds spoken. It hits: BFF, caching, idempotency,
parallelism, error isolation, observability.
