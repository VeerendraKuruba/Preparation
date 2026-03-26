# Q12. Offline-first web app

**Prompt variants:** **Field sales**, retail POS web, **docs** on flaky Wi-Fi, travel app, "works in the subway" — **read + write** offline with eventual sync.

[← Question index](./README.md)

---

### One-line mental model

The client treats **local storage as a replica**: user actions **append to an outbox** and update the UI **optimistically**; a **sync engine** replays mutations when online and **reconciles** conflicts — **network is optional**, not the source of instant truth for perceived UX.

---

### Clarify scope in the interview

Before committing to a design, ask:

- **Read-only vs heavy writes?** A travel itinerary viewer is mostly read; a field sales order-entry app needs durable writes.
- **Multi-device sync?** Same user on phone + laptop? Requires conflict resolution and a server-side version vector.
- **Sensitive data?** PII or HIPAA data on disk adds encryption requirements (mention but scope out for v1 unless asked).
- **Collaborative editing?** Multiple users editing the same record simultaneously requires CRDTs or operational transform — out of scope for v1.
- **Attachments / large blobs?** Images and files need different eviction policies than structured data.
- **Browser-only or wrapped WebView?** (React Native / Capacitor) — same outbox story; SQLite replaces IndexedDB.

---

### Goals & requirements

**Functional**
- Core user journeys work fully offline: browse cached data, create/edit forms, queue actions.
- Clear sync status visible at all times: `Online | Offline | Syncing | N changes pending | Conflict`.
- On reconnect, pending writes sync to server automatically without user action.
- Conflicts shown explicitly; no silent data overwrite.

**Non-functional**
- Writes are durable across tab close and browser restart (IndexedDB, not memory).
- Storage is bounded: LRU eviction with user-visible warning before quota is hit.
- No auth tokens or sensitive session data accidentally stored in Service Worker Cache Storage.
- Idempotent sync: replaying the outbox on retry never double-submits a mutation.

---

### High-level frontend architecture

```
 ┌──────────────────────────────────────────────────────────────────┐
 │  Browser                                                          │
 │                                                                  │
 │  ┌──────────────────────────────────────────────────────┐        │
 │  │  App UI (React / Vue / etc.)                          │        │
 │  │  reads from local DB first — network is background   │        │
 │  └───────────────────┬───────────────┬───────────────────┘        │
 │                      │ reads         │ writes (optimistic)        │
 │  ┌───────────────────▼───────────────▼───────────────────┐        │
 │  │  Local Data Layer                                      │        │
 │  │  ┌──────────────────────┐  ┌─────────────────────┐    │        │
 │  │  │  IndexedDB           │  │  Outbox queue       │    │        │
 │  │  │  (entities by id,    │  │  (pending mutations │    │        │
 │  │  │   query caches)      │  │   with idempotency  │    │        │
 │  │  └──────────────────────┘  │   keys)             │    │        │
 │  │                            └─────────┬───────────┘    │        │
 │  └──────────────────────────────────────┼────────────────┘        │
 │                                         │                         │
 │  ┌──────────────────────────────────────▼────────────────┐        │
 │  │  Sync Worker (Dedicated Worker or main thread v1)     │        │
 │  │  - drains outbox when online                          │        │
 │  │  - pulls deltas from server (sinceVersion)            │        │
 │  │  - handles conflicts                                  │        │
 │  │  - broadcasts status via BroadcastChannel             │        │
 │  └──────────────────────────────────────┬────────────────┘        │
 │                                         │                         │
 │  ┌──────────────────────────────────────▼────────────────┐        │
 │  │  Service Worker                                        │        │
 │  │  - precaches app shell (HTML, CSS, JS)                │        │
 │  │  - intercepts fetch() calls                           │        │
 │  │  - applies per-route caching strategies               │        │
 │  └──────────────────────────────────────┬────────────────┘        │
 └──────────────────────────────────────────┼────────────────────────┘
                                            │  network (optional)
                                            ▼
                                   ┌────────────────┐
                                   │  API / Backend │
                                   └────────────────┘
```

---

### What the client does (core mechanics)

#### 1. Service Worker caching strategies (Workbox)

Different resource types need different strategies. Using Workbox to declare these per route:

```js
// sw.js — registered in index.html as standard SW
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute }    from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin }        from 'workbox-expiration';

// 1. App shell — precached at install time, versioned by build hash
//    __WB_MANIFEST is injected by workbox-webpack-plugin / vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// 2. Static assets (JS/CSS with content hash in filename) — CacheFirst
//    These never change; the filename IS the version.
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new CacheFirst({
    cacheName: 'static-assets-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxAgeSeconds: 30 * 24 * 60 * 60 }), // 30 days
    ],
  })
);

// 3. API GET requests — StaleWhileRevalidate
//    Returns cached data immediately (offline works), updates in background
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/') && url.searchParams.get('offline') !== 'false',
  new StaleWhileRevalidate({
    cacheName: 'api-cache-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// 4. Navigation requests (HTML) — NetworkFirst with offline fallback
//    Ensures users always get the latest shell, but falls back offline
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'html-cache-v1',
    networkTimeoutSeconds: 3,
    plugins: [new CacheableResponsePlugin({ statuses: [200] })],
  })
);

// NEVER cache: auth endpoints, payment endpoints, POST/PUT/DELETE
// These go through the outbox, not the SW cache
```

**Critical pitfalls to mention:**
- Never cache `Set-Cookie` responses — SW cache ignores the `Vary: Cookie` header, so one user's session could leak to another.
- Opaque responses (cross-origin without CORS) count as 7 MB each in Chrome's quota heuristic — never put them in a bounded cache.
- On deploy, bump the `cacheName` version (`api-cache-v2`) and delete the old cache in the `activate` event.

#### 2. IndexedDB schema for offline data

```js
// db.js — database schema and migrations using idb library
import { openDB } from 'idb';

const DB_NAME    = 'field-sales-app';
const DB_VERSION = 3; // bump this when schema changes

export const db = await openDB(DB_NAME, DB_VERSION, {
  upgrade(db, oldVersion, newVersion, transaction) {
    // v1: initial schema
    if (oldVersion < 1) {
      const orders = db.createObjectStore('orders', { keyPath: 'id' });
      orders.createIndex('by-customer', 'customerId');
      orders.createIndex('by-status',   'status');

      db.createObjectStore('customers', { keyPath: 'id' });
      db.createObjectStore('products',  { keyPath: 'id' });
    }
    // v2: added outbox
    if (oldVersion < 2) {
      const outbox = db.createObjectStore('outbox', {
        keyPath: 'id', autoIncrement: false
      });
      outbox.createIndex('by-status',    'status');
      outbox.createIndex('by-resource',  'resourceId'); // for ordering per aggregate
    }
    // v3: added server version tracking
    if (oldVersion < 3) {
      db.createObjectStore('sync-meta', { keyPath: 'collection' });
      // e.g. { collection: 'orders', serverVersion: 42, lastSyncedAt: timestamp }
    }
  },
  blocked() {
    // Another tab has an older version open — prompt user to close other tabs
    showToast('Please close other tabs to update the app.');
  },
  blocking() {
    // This tab is blocking a newer version in another tab
    db.close();
    window.location.reload();
  },
});
```

**Reading from local DB first (before network):**
```js
// In React Query or custom hook
async function getOrders(customerId) {
  // 1. Read from IndexedDB immediately — renders data even offline
  const localOrders = await db.getAllFromIndex('orders', 'by-customer', customerId);

  // 2. Return local data right away so UI can render
  // 3. In background, fetch from network and update DB + UI
  fetchAndUpdate('/api/orders?customerId=' + customerId, 'orders');

  return localOrders;
}
```

#### 3. Outbox pattern for write queue

Every mutation goes through the outbox. The UI updates optimistically; the sync worker drains the outbox when online.

```js
// Outbox entry shape
// {
//   id:              string (uuid v4 — also the idempotency key)
//   op:              'CREATE' | 'UPDATE' | 'DELETE'
//   collection:      'orders'
//   resourceId:      string (entity id)
//   payload:         object (the mutation payload)
//   createdAt:       number (timestamp)
//   attempts:        number
//   lastAttemptAt:   number | null
//   status:          'PENDING' | 'RETRYING' | 'FAILED' | 'SYNCED'
//   error:           string | null
// }

// createOrder — optimistic write + outbox enqueue
export async function createOrder(orderData) {
  const localId        = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID(); // unique per mutation attempt

  const optimisticOrder = {
    ...orderData,
    id:        localId,
    status:    'DRAFT',
    _local:    true,       // flag: not yet confirmed by server
    _outboxId: idempotencyKey,
  };

  const tx = db.transaction(['orders', 'outbox'], 'readwrite');

  // 1. Write optimistic entity to local DB
  await tx.objectStore('orders').put(optimisticOrder);

  // 2. Enqueue mutation in outbox
  await tx.objectStore('outbox').put({
    id:             idempotencyKey,
    op:             'CREATE',
    collection:     'orders',
    resourceId:     localId,
    payload:        orderData,
    createdAt:      Date.now(),
    attempts:       0,
    lastAttemptAt:  null,
    status:         'PENDING',
    error:          null,
  });

  await tx.done;

  // 3. Return immediately — UI renders the optimistic order
  // 4. Notify sync worker to attempt drain
  broadcastChannel.postMessage({ type: 'OUTBOX_ITEM_ADDED' });

  return optimisticOrder;
}
```

**Sync worker draining the outbox:**
```js
// syncWorker.js
async function drainOutbox() {
  const pending = await db.getAllFromIndex('outbox', 'by-status', 'PENDING');

  for (const item of pending) {
    // Exponential backoff: don't retry if last attempt was too recent
    const backoffMs = Math.min(1000 * 2 ** item.attempts, 30_000);
    if (item.lastAttemptAt && Date.now() - item.lastAttemptAt < backoffMs) continue;

    try {
      const res = await fetch(`/api/${item.collection}`, {
        method:  item.op === 'CREATE' ? 'POST' : item.op === 'UPDATE' ? 'PUT' : 'DELETE',
        headers: {
          'Content-Type':    'application/json',
          'Idempotency-Key': item.id,   // server deduplicates by this key
        },
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        const serverEntity = await res.json();
        const tx = db.transaction(['orders', 'outbox'], 'readwrite');
        // Replace optimistic entity with confirmed server entity
        await tx.objectStore('orders').put({ ...serverEntity, _local: false });
        await tx.objectStore('outbox').delete(item.id);
        await tx.done;
        broadcastChannel.postMessage({ type: 'SYNC_SUCCESS', resourceId: item.resourceId });

      } else if (res.status === 409) {
        // Conflict — mark for user resolution, don't retry
        await db.put('outbox', { ...item, status: 'FAILED', error: 'CONFLICT_409' });
        broadcastChannel.postMessage({ type: 'CONFLICT', item });

      } else if (res.status === 401) {
        // Auth expired — stop syncing, prompt re-auth; keep queue intact
        broadcastChannel.postMessage({ type: 'AUTH_EXPIRED' });
        return; // stop draining until re-auth

      } else {
        // Transient error — increment attempts, retry later
        await db.put('outbox', {
          ...item,
          attempts:      item.attempts + 1,
          lastAttemptAt: Date.now(),
          status:        item.attempts >= 5 ? 'FAILED' : 'RETRYING',
          error:         `HTTP ${res.status}`,
        });
      }
    } catch (networkError) {
      // Network error — increment attempts
      await db.put('outbox', {
        ...item, attempts: item.attempts + 1, lastAttemptAt: Date.now(), status: 'RETRYING',
      });
    }
  }
}

// Trigger on: online event, periodic interval, BroadcastChannel message
self.addEventListener('online', drainOutbox);
setInterval(drainOutbox, 30_000); // poll as fallback
```

#### 4. Conflict resolution strategies

When a pull sync reveals the server has a newer version of a record the user also modified offline, you have three options:

```
Strategy comparison:

Last-Write-Wins (LWW) by server timestamp:
  Client local: { id: 42, price: 99, updatedAt: T+5  }   (modified offline)
  Server:       { id: 42, price: 120, updatedAt: T+10 }   (someone else updated)
  Result:       Server wins → client shows 120
  ✓ Simple  ✗ Silently discards client's change

Field-level merge (structured):
  Client local: { id: 42, price: 99,  notes: "urgent", updatedAt: T+5  }
  Server:       { id: 42, price: 120, notes: "normal",  updatedAt: T+10 }
  Merge result: { id: 42, price: 120, notes: "urgent",  updatedAt: T+10 }
  (client changed notes, server changed price — merge both)
  ✓ Preserves non-conflicting edits  ✗ More complex; needs field-level tracking

Explicit user choice (hard conflicts):
  Show diff to user: "Server has price=120, you have price=99. Keep which?"
  User selects → write that version back to server
  ✓ User is in control  ✗ Blocks workflow; bad UX for frequent conflicts
```

```js
// conflict resolution in sync worker
async function resolveConflict(localEntity, serverEntity, strategy = 'LWW') {
  switch (strategy) {
    case 'LWW':
      // Server always wins — simplest, safe for most non-financial fields
      await db.put('orders', { ...serverEntity, _local: false });
      return serverEntity;

    case 'MERGE':
      // Merge: server wins on fields it changed; client wins on fields only client changed
      const baseVersion = await db.get('sync-meta', localEntity.id + ':base');
      const merged = {};
      for (const key of Object.keys(serverEntity)) {
        const serverChanged = serverEntity[key] !== baseVersion?.[key];
        const clientChanged = localEntity[key] !== baseVersion?.[key];
        if (serverChanged && !clientChanged) merged[key] = serverEntity[key];
        else if (!serverChanged && clientChanged) merged[key] = localEntity[key];
        else if (serverChanged && clientChanged) merged[key] = serverEntity[key]; // server wins on true conflict
        else merged[key] = serverEntity[key];
      }
      await db.put('orders', { ...merged, _local: false, _conflict: false });
      return merged;

    case 'USER_CHOICE':
      // Surface to UI for user decision
      broadcastChannel.postMessage({ type: 'CONFLICT_REQUIRES_USER', localEntity, serverEntity });
      await db.put('orders', { ...localEntity, _conflict: true, _serverVersion: serverEntity });
      return null; // unresolved until user acts
  }
}
```

#### 5. Multi-tab sync via BroadcastChannel

When multiple tabs are open and one tab successfully syncs, all others should reflect the update without redundant network calls.

```js
// Single sync channel for the entire app
const broadcastChannel = new BroadcastChannel('app-sync');

// In each tab, listen for sync results from other tabs
broadcastChannel.addEventListener('message', (event) => {
  switch (event.data.type) {
    case 'SYNC_SUCCESS':
      // Another tab synced this entity — refresh from local DB
      queryCache.invalidate(['orders', event.data.resourceId]);
      break;
    case 'CONFLICT':
      // Another tab found a conflict — show conflict indicator
      setConflictBanner(event.data.item);
      break;
    case 'AUTH_EXPIRED':
      showReAuthModal();
      break;
    case 'OUTBOX_DEPTH':
      // Update pending count badge in header
      setPendingCount(event.data.count);
      break;
  }
});

// Use Web Locks API to ensure only ONE tab runs the sync drain at a time
async function exclusiveDrain() {
  await navigator.locks.request('outbox-sync', async (lock) => {
    if (!lock) return; // another tab has the lock
    await drainOutbox();
  });
}
```

---

### Trade-offs

| Choice | Upside | Trade-off / When to switch |
|--------|--------|---------------------------|
| **SW + aggressive cache** (current) | Fast repeat loads; works offline | Stale assets after deploy — requires versioned cache names + skipWaiting + clients.claim + "new version available" toast |
| **No SW (online-first with SWR)** | Simpler; no SW debugging; no stale app risk | Any network blip = spinner; field workers on 2G fail their tasks |
| **Optimistic writes + outbox** (current) | Instant perceived responsiveness; works offline | Harder cancel/undo flows; pessimistic locking for money transactions (use `pessimistic` flag per operation type) |
| **Pessimistic writes** | Safe for irreversible ops (payment, delete) | Requires network — breaks offline writes; acceptable for a single clearly-critical action |
| **Full local replica** (current) | True offline browse of all data | Build and maintenance cost; IDB migration story; PII on device (needs clear-on-logout) |
| **Read-only offline** | Much simpler; no outbox | Users can't complete their core job in the field — may fail the interview prompt requirement |
| **LWW conflict resolution** | Easy to implement; no user friction | Silently discards legitimate user changes; unacceptable if offline period is long or user effort is high |
| **User-choice conflict UX** | User always in control | Blocks workflow; users often click "whatever" on conflict modals — net quality degrades |
| **Field-level merge** | Best UX for non-overlapping edits | Requires storing the base version (before offline edit); complex to implement correctly |
| **Background Sync API** | OS-level reliability; survives browser close | Limited browser support (Chrome/Edge only as of 2025); requires SW registration; fallback to `online` event still needed |

---

### Failure modes & degradation

```
States the app must handle explicitly:

  ONLINE ──────────────────────► OFFLINE
    │                               │
    │ sync draining                 │ outbox accumulates
    ▼                               ▼
  SYNCING ◄───── reconnect ──── (waiting)
    │
    ├─► CONFLICT  ───► user resolves ───► SYNCING
    │
    └─► ERROR (5xx, timeout) ───► retry with backoff
```

- **Quota exceeded:** `QuotaExceededError` in IDB write. Before hitting quota, monitor `navigator.storage.estimate()` and proactively evict: old list page caches, thumbnails, records not accessed in 30+ days. Show user a "Storage almost full — tap to free space" banner.
- **SW bug bricks the app (white screen):** Every app needs an escape hatch URL: `/?sw_reset=1` or `/unregister-sw` that calls `registration.unregister()` and reloads. Document in support runbooks.
- **Long offline period:** Show "Last synced: 3 days ago" prominently. Block actions that require fresh policy (price lists, feature flags) with a clear message: "Prices may be outdated — connect to confirm."
- **Auth token expiry while offline:** Queue continues to accumulate. On reconnect, sync attempt returns 401. Do NOT discard the queue — retain it. Show "Session expired — please log in to sync your 7 pending changes." After re-auth, resume drain.
- **SW stuck waiting (new version blocked by open tab):** Show "App update ready — reload to apply" banner with a button that calls `registration.waiting.postMessage({ type: 'SKIP_WAITING' })`.

---

### Accessibility checklist

- **Sync status in text, not color alone:** "3 changes pending" (not just a yellow dot). Screen readers need the text.
- **Conflict modal:** when it opens, move focus into the dialog and trap it (`aria-modal="true"`, focus trap) until resolved or dismissed. Closing returns focus to the trigger element.
- **Offline banner:** use `role="status"` or `aria-live="polite"` so screen readers announce the connectivity change without interrupting ongoing narration.
- **Sync animation:** the spinning sync icon respects `prefers-reduced-motion: reduce` — show a static icon with a text label instead of continuous animation.
- **Form state during offline write:** after submit, show "Saved offline — will sync when connected" in the form confirmation area. Don't navigate away to a detail page that requires a server-confirmed ID.

---

### Minute summary (closing)

"The design rests on a single principle: the network is optional, not required. We cache the entire app shell with a Service Worker so the app loads regardless of connectivity. A local IndexedDB replica serves all reads immediately — no waiting for the network even when online. Writes go through an outbox: every mutation is written locally first, the UI updates optimistically, and a sync worker drains the outbox when online using idempotency keys so retries are safe. Conflicts are resolved by strategy — last-write-wins for most fields, field-level merge where both parties changed different fields, and explicit user choice only for high-stakes conflicts. Multiple tabs coordinate through BroadcastChannel with Web Locks ensuring only one tab drains the outbox at a time. The result: offline is a first-class state with a predictable, trustworthy UX — not a degraded error state."

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Read vs write, multi-device, sensitive data, attachment size |
| High-level architecture | 12–18 | SW + IDB + outbox diagram; state machine; v1 scope |
| Deep dive 1 | 12–18 | **Service Worker caching strategies** + deploy/versioning + pitfalls |
| Deep dive 2 | 12–18 | **Outbox + sync protocol** or **conflict resolution + security** |
| Trade-offs, failure, metrics | 8–12 | Quota, auth expiry, observability |

### What to draw (whiteboard)

- **SW** as a box sitting between browser and network; two arrows from SW: "precache" (at install) and "runtime cache" (on fetch).
- **IDB** tables: `orders`, `customers`, `outbox` with column sketches.
- **Outbox arrow** from IDB to API: `PENDING → HTTP → SYNCED` (or backoff on failure).
- **State machine:** `ONLINE | OFFLINE | SYNCING | CONFLICT | ERROR`.
- **BroadcastChannel** connecting Tab 1, Tab 2, Tab 3 — one of them holds the Web Lock for outbox drain.

### Deep dives — pick 2

**A. Service Worker caching policies** — Which resources are safe in Cache Storage vs must be network-only; `credentials: 'same-origin'` on fetch in SW; avoiding cached `Set-Cookie` surprises (auth tokens); opaque response 7MB quota gotcha; versioned cache names + `activate` cleanup; communicating the update available state to the UI.

**B. Outbox design** — Ordering per aggregate (all mutations for `orderId=42` must be sent in creation order); deduplication of redundant mutations (UPDATE followed by another UPDATE to same field — collapse); poison message handling (item permanently stuck — dead-letter UI with "Fix and retry" button); Background Sync API integration with `online` event fallback; multi-tab single writer via Web Locks.

**C. Schema & migrations** — IDB `version` upgrade callback; lazy migration for large datasets (migrate records on access, not all at once); backward compatibility: old SW may still be serving pages while new SW is waiting — both must understand the same IDB schema version.

**D. Security & privacy** — Clear all IDB stores on logout (`indexedDB.deleteDatabase()`); SW cache does not encrypt at rest — mention hardware encryption as the only viable mitigation; never store auth tokens in precached JSON or Cache Storage; CSP headers to prevent SW-level XSS; no secrets in the service worker script itself (it is readable by all origins on the page).

### Common follow-ups

- **"Race on reconnect?"** — Use server version/generation numbers. Server rejects writes with `409 Conflict` if server's `updatedAt` is newer than the client's known `updatedAt`. Client reads the 409 body (which contains the current server state), resolves the conflict, and retries with the resolved payload.
- **"Large images offline?"** — Store image URL in IDB entity; cache the image blob in Cache Storage with a separate `images-v1` cache; set an explicit `maxEntries` limit (e.g., 50 images) with LRU eviction via `ExpirationPlugin`. For very large files (> 10 MB), use OPFS (Origin Private File System) instead.
- **"Two tabs editing the same record?"** — `navigator.locks.request` with `exclusive` mode prevents concurrent writes from the same device. Declare the design: for v1, last-write-wins within the same device is acceptable; true multi-device collaboration requires operational transform or CRDT (out of scope).
- **"React Native / Expo?"** — Same outbox pattern; swap IndexedDB for SQLite (via `expo-sqlite` or `react-native-sqlite-storage`); swap Service Worker for React Native's built-in offline handling + NetInfo; the sync logic is identical.

### What you'd measure

- **Sync health:** time to drain full outbox after reconnect (p50/p95); outbox failure rate; conflict rate per collection.
- **Storage:** median IDB size per user; quota error frequency; SW cache hit rate per route (via SW `fetch` event timing).
- **Product:** task completion rate in offline regions vs always-connected regions; "pending changes" abandonment rate (proxy for user frustration with sync failures).

### v1 vs later

| v1 | Later |
|----|--------|
| Read-heavy offline + write outbox + manual sync trigger on reconnect | Background Sync API for OS-level reliability; conflict merge UI |
| Single-tab assumptions; main thread sync | `LockManager` / cross-tab coordination via BroadcastChannel |
| LWW conflict resolution for all fields | Field-level merge; CRDT for specific data types (e.g., collaborative notes) |
| IndexedDB directly | SQLite-WASM / OPFS for better query performance and larger datasets |
| Eviction by age (simple) | LRU eviction with usage-based scoring; user-controlled "pin for offline" feature |
