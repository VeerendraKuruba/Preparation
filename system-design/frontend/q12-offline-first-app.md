# Q12. Offline-first web app

**Prompt variants:** **Field sales**, retail POS web, **docs** on flaky Wi‑Fi, travel app, “works in the subway”—**read + write** offline with eventual sync.

 [← Question index](./README.md)

---

### One-line mental model

The client treats **local storage as a replica**: User actions **append to an outbox** and update UI **optimistically**; a **sync engine** replays mutations when online and **reconciles** conflicts—**network is optional**, not the source of instant truth for perceived UX.

### Clarify scope in the interview

**Read-mostly** vs **heavy writes**? **Multi-device** sync or single device? **Sensitive** data on disk (PII, HIPAA)? **Browser** only or wrapped WebView? **Collaborative** (others edit same record) or single-user? **Attachment** / large blobs?

### Goals & requirements

- **Functional:** core journeys work **offline** (browse cache, draft forms, queue actions); clear **sync status** (pending / failed / conflict).
- **Non-functional:** **durability** across tab close (where needed); **bounded** storage; **no silent data loss**; **secure** cache (no auth tokens in SW cache mistakes); **predictable** conflict UX.

### High-level frontend architecture

**App shell** (cached by **Service Worker**) → **local data layer** (**IndexedDB** / SQLite-WASM / OPFS—name your v1) → **UI** reads from local first → **sync worker** (dedicated worker or main thread **in v1**) drains **outbox** to API → server responses **mutate** local replica.

Optional: **SWR/React Query** with `persist` as lighter “read cache” without full offline writes—honest scope if only read-offline.

### What the client does (core mechanics)

1. **Service Worker strategy**
   - **App shell:** `install` precache minimal `index.html`, JS, CSS; **`runtime`** for navigations—**NetworkFirst** or **StaleWhileRevalidate** for HTML by product.
   - **API GETs:** **StaleWhileRevalidate** or **CacheFirst** for **safe**, user-scoped endpoints only—**never** cache personalized financial responses blindly without **Vary** / private cache discipline.
   - **Versioned caches:** `my-app-vN` bump on deploy; **`skipWaiting` + `clients.claim`** story; stale tab guidance.

2. **Local replica & reads**
   - **IndexedDB** stores normalized entities (`byId`, indices for lists); hydrate UI from DB **before** network on repeat visits.
   - **Pagination** results stored with query key; **evict** LRU when quota nears (handle **`QuotaExceededError`** with user messaging).

3. **Outbox (writes)**
   - Mutations enqueue: `{ id, op, payload, createdAt, idempotencyKey, status }`.
   - **Optimistic** row in UI maps to outbox id; **retry** with exponential backoff + **jitter**; **max attempts** → dead-letter UI (“fix & resend”).
   - **Idempotency** keys so replay doesn’t double-charge (server must support or accept risk for v1).

4. **Sync & conflict handling**
   - On reconnect: **pull** deltas (`sinceVersion` / `updatedAfter`) or **full refetch** per collection if cheap; **push** outbox in order **per resource** where order matters.
   - **Conflicts:** **LWW** with server `updatedAt` (simple); **merge** for structured fields; **explicit** “server wins / keep copy” UX for hard conflicts—avoid silent overwrite.

5. **Observability**
   - Client metrics: **queue depth**, sync latency, conflict rate, **storage %** used.
   - **Background Sync** (`sync` event) where supported—fallback to **online** event + backoff.

### Trade-offs

| Choice | Upside | Trade-off |
|--------|--------|-----------|
| SW + aggressive cache | Fast repeat loads | **Stale** assets after deploy—need versioned URLs + messaging |
| Optimistic everything | Feels instant | **Hard** refunds/cancel flows—may need **pessimistic** for money |
| Full local replica | True offline browse | Build cost; **migrations**; **PII** on disk |
| Read-only offline | Simpler | Users can’t complete job in field—may fail prompt |

### Failure modes & degradation

- **Quota exceeded** — Prune old media / old list pages; offer “free space” UX.
- **SW bug bricks app** — **unreg** escape hatch URL for support; extreme: cache bust query.
- **Long offline** — Stale banner with **last synced** time; block actions that need fresh policy (feature flags, **price lists**).
- **Auth expiry offline** — Queue fails with **401** on sync; user must **re-auth** online—queue retained until then.

### Accessibility checklist

- **Status:** sync state in text, not color alone (“**3 changes waiting**”).
- **Motion:** don’t animate “syncing” aggressively—**prefers-reduced-motion**.
- **Focus:** when conflict modal opens, **move focus** and trap until resolved.

### Minute summary (closing)

“We **cache the shell** with a **Service Worker**, keep a **local replica** in **IndexedDB**, put **writes through an outbox** with **idempotency**, and **sync** on reconnect with **explicit conflicts**—so offline is a **first-class state**, not an error handler.”

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Read vs write, multi-device, security, data size |
| High-level architecture | 12–18 | SW + IDB + outbox diagram; what’s v1 |
| Deep dive 1 | 12–18 | **Service Worker caching** + deploy/versioning |
| Deep dive 2 | 12–18 | **Outbox + sync protocol** or **conflicts + security** |
| Trade-offs, failure, metrics | 8–12 | Quota, auth, observability |

### What to draw (whiteboard)

- **SW** between browser and network; **precache** vs **runtime** caches.
- **IDB** tables/collections sketch; **outbox** queue arrow to API.
- **States:** `ONLINE | OFFLINE | SYNCING | ERROR | CONFLICT`.
- **Conflict** branch: user chooses or server wins with **copy**.

### Deep dives — pick 2

**A. Caching policies** — What’s safe in **Cache Storage** vs must be **network-only**; **credentials** `same-origin`; avoiding **cached** `Set-Cookie` surprises; **opaque** responses pitfall.

**B. Outbox design** — Ordering **per aggregate**; **dedupe**; poison message handling; **background sync** vs foreground flush; **multi-tab** single writer via **BroadcastChannel** / `LockManager` (optional).

**C. Schema & migrations** — IDB version bumps; **lazy migration**; backward compatibility for old SW still running.

**D. Security & privacy** — Clear sensitive DB on **logout**; encrypt-at-rest on disk (mention as hard); **CSP**; **no** secrets in precached JSON.

### Common follow-ups

- **“Flip to online: race?”** — **Generation** on sync; server rejects stale writes; client refetches authoritative row.
- **“Large images offline?”** — **Blob** in IDB vs **Cache API**; eviction policy; progressive download when online.
- **“Two tabs editing?”** — **Leader tab** for sync; or **eventual** consistency with last flush wins—call out ambiguity.
- **“Expo/React Native?”** — Same **outbox** story; **SQLite** instead of IDB; bridge—not required for web prompt.

### What you’d measure

- **Sync:** time to drain outbox after reconnect; failure/retry counts.
- **Storage:** median DB size; quota errors.
- **Product:** task completion rate **offline vs online** regions.

### v1 vs later

| v1 | Later |
|----|--------|
| Read-heavy offline + write outbox + manual sync trigger | Background Sync, conflict merges, multi-device |
| Single-tab assumptions | `LockManager` / cross-tab coordination |
| LWW conflicts | Field-level merge + CRDT for specific types |
