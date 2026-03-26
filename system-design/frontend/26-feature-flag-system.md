# 26. Design a Feature Flag System

## Clarifying Questions

Before designing, I would ask:

- **Targeting granularity**: Do we need boolean on/off, or multivariate flags (A/B/C variants)? Should targeting be per-user, per-tenant, per-region, or percentage rollout?
- **Update latency**: Does a kill switch need to reflect instantly (SSE), or is a 30-second polling interval acceptable?
- **Evaluation side**: Should flags be evaluated on the client (SDK receives rules and evaluates), or should the server return a pre-evaluated snapshot per user? Pre-evaluation leaks less rule logic to the client.
- **Flag volume**: 10 flags or 10,000? Determines whether we can embed all flags in the HTML or must lazy-load.
- **Authorization sensitivity**: Are any flags used to hide premium features? If yes, server must re-enforce — the client flag is only a UI hint.

For this answer I will assume: boolean and string-variant flags, per-user and percentage targeting evaluated server-side into a per-user snapshot, SSE for live updates with polling fallback, and a React frontend.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Flag Admin UI                                                               │
│  (create / target / rollout %)                                               │
└──────────────────┬───────────────────────────────────────────────────────────┘
                   │ writes rules
                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Flag Service  (server-side evaluation)                                      │
│  ┌────────────┐   ┌────────────────┐   ┌───────────────────────────────┐    │
│  │ Rules DB   │──▶│ Evaluator      │──▶│ Snapshot API  GET /flags      │    │
│  │ (Postgres) │   │ (% hash, rules)│   │ returns {flagKey: variant}    │    │
│  └────────────┘   └────────────────┘   └───────────────────────────────┘    │
│                                         ┌───────────────────────────────┐    │
│                                         │ SSE endpoint  GET /flags/live │    │
│                                         │ emits delta on rule change    │    │
│                                         └───────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
                   │ evaluated snapshot embedded in HTML at SSR
                   │ or fetched at client boot
                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Browser                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  FlagSDK                                                             │   │
│  │  ┌─────────────────┐   ┌───────────────┐   ┌──────────────────────┐ │   │
│  │  │ Bootstrap loader │──▶│ In-memory     │◀──│ SSE listener /       │ │   │
│  │  │ (HTML or fetch) │   │ flag store    │   │ polling fallback TTL  │ │   │
│  │  └─────────────────┘   └──────┬────────┘   └──────────────────────┘ │   │
│  └─────────────────────────────── │ ────────────────────────────────────┘   │
│                                   │ provides context                         │
│                                   ▼                                          │
│                          ┌────────────────┐                                  │
│                          │  FlagContext   │  (React context)                 │
│                          └───────┬────────┘                                  │
│                                  │                                           │
│                    ┌─────────────┴──────────────┐                           │
│                    ▼                             ▼                           │
│           ┌────────────────┐           ┌─────────────────────────┐          │
│           │  useFlag hook  │           │  <FeatureGate>           │          │
│           │  typed access  │           │  wraps route/component   │          │
│           └────────────────┘           │  code-splits on import   │          │
│                                        └─────────────────────────┘          │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Mechanics

### 1. Flag Bootstrap — Embed in HTML to Eliminate FOUC

The worst user experience with feature flags is a flash of old content (FOUC) where the default UI renders, then the flag loads and the UI jumps. The fix is to embed the evaluated flag snapshot directly into the server-rendered HTML so the client has flags before the first paint.

```html
<!-- Server injects this into the HTML shell during SSR -->
<script id="__FLAGS__" type="application/json">
  {"new_checkout": true, "search_v2": false, "pricing_variant": "B"}
</script>
```

```typescript
// flagSdk.ts — bootstrap reads the embedded snapshot first
function readBootstrap(): Record<string, unknown> {
  const el = document.getElementById('__FLAGS__');
  if (!el) return {};
  try {
    return JSON.parse(el.textContent ?? '{}');
  } catch {
    return {};
  }
}

// Fallback: fetch from server if no embedded snapshot (SPA with no SSR)
async function fetchSnapshot(userId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/flags?userId=${userId}`, {
    credentials: 'include',
  });
  if (!res.ok) return {}; // fail open — show default experience
  return res.json();
}
```

The rule: **embedded HTML snapshot for SSR apps** (zero extra round-trip), **fetch on boot for pure SPAs** (one round-trip before first render, accept brief loading state or skeleton).

---

### 2. SDK: In-Memory Store, SSE for Live Updates, Polling Fallback

```typescript
// flagStore.ts
type FlagStore = {
  flags: Record<string, unknown>;
  listeners: Set<() => void>;
  set(key: string, value: unknown): void;
  merge(patch: Record<string, unknown>): void;
  subscribe(fn: () => void): () => void;
};

function createFlagStore(initial: Record<string, unknown>): FlagStore {
  const store: FlagStore = {
    flags: { ...initial },
    listeners: new Set(),
    set(key, value) {
      store.flags = { ...store.flags, [key]: value };
      store.listeners.forEach((fn) => fn());
    },
    merge(patch) {
      store.flags = { ...store.flags, ...patch };
      store.listeners.forEach((fn) => fn());
    },
    subscribe(fn) {
      store.listeners.add(fn);
      return () => store.listeners.delete(fn);
    },
  };
  return store;
}

// sseUpdater.ts — listen for server-pushed flag changes
function startSSE(store: FlagStore, userId: string): () => void {
  const es = new EventSource(`/api/flags/live?userId=${userId}`);

  es.addEventListener('flag-update', (event) => {
    const patch = JSON.parse(event.data) as Record<string, unknown>;
    store.merge(patch); // React context re-renders automatically
  });

  es.onerror = () => {
    es.close();
    // Polling fallback: if SSE fails, poll every 30 seconds
    startPolling(store, userId);
  };

  return () => es.close();
}

function startPolling(store: FlagStore, userId: string): void {
  const id = setInterval(async () => {
    const fresh = await fetchSnapshot(userId);
    store.merge(fresh);
  }, 30_000);

  // Clean up if SSE reconnects
  window.addEventListener('beforeunload', () => clearInterval(id));
}
```

Key design choice: SSE is preferred over WebSockets for this use case because it is unidirectional (server → client), uses standard HTTP, and automatically reconnects. Polling is the fallback for environments where SSE is blocked (some corporate proxies).

---

### 3. FlagContext and useFlag Hook

```typescript
// FlagContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { createFlagStore, startSSE, readBootstrap, fetchSnapshot } from './flagSdk';

type FlagContextValue = {
  getFlag<T>(key: string, defaultValue: T): T;
};

const FlagContext = createContext<FlagContextValue | null>(null);

export function FlagProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [store] = useState(() => createFlagStore(readBootstrap()));
  const [, forceRender] = useState(0);

  useEffect(() => {
    // Hydrate from server if bootstrap was empty
    if (Object.keys(store.flags).length === 0) {
      fetchSnapshot(userId).then((flags) => store.merge(flags));
    }
    const unsubscribe = store.subscribe(() => forceRender((n) => n + 1));
    const stopSSE = startSSE(store, userId);
    return () => {
      unsubscribe();
      stopSSE();
    };
  }, [userId]);

  const value: FlagContextValue = {
    getFlag<T>(key: string, defaultValue: T): T {
      return key in store.flags ? (store.flags[key] as T) : defaultValue;
    },
  };

  return <FlagContext.Provider value={value}>{children}</FlagContext.Provider>;
}

// Typed hook — the single access point for all flag reads
export function useFlag<T>(key: string, defaultValue: T): T {
  const ctx = useContext(FlagContext);
  if (!ctx) throw new Error('useFlag must be inside FlagProvider');
  return ctx.getFlag(key, defaultValue);
}
```

---

### 4. FeatureGate Component — Wraps Routes and Code-Splits

```typescript
// FeatureGate.tsx
import React, { Suspense, lazy } from 'react';
import { useFlag } from './FlagContext';

type FeatureGateProps = {
  flag: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

export function FeatureGate({ flag, fallback = null, children }: FeatureGateProps) {
  const enabled = useFlag<boolean>(flag, false);
  return enabled ? <>{children}</> : <>{fallback}</>;
}

// Usage: wrapping an entire route with code-splitting
// The dynamic import only runs if the flag is true.
// If the flag is false, the NewCheckout bundle is NEVER downloaded.

const NewCheckout = lazy(() => import('./features/NewCheckout'));

function CheckoutRoute() {
  return (
    <FeatureGate flag="new_checkout" fallback={<LegacyCheckout />}>
      <Suspense fallback={<CheckoutSkeleton />}>
        <NewCheckout />
      </Suspense>
    </FeatureGate>
  );
}
```

---

### 5. Code-Splitting Behind Flags — Dead Features Don't Ship

When a feature is disabled, the dynamic `import()` inside `lazy()` never executes. The webpack/Vite chunk for `NewCheckout` is never requested. This is the critical difference from a simple `if (flag) return <NewFeature />` with a static import at the top of the file — a static import always downloads the bundle regardless of the flag value.

```typescript
// WRONG: static import — bundle always ships, flag only hides UI
import { NewCheckout } from './NewCheckout';

function Checkout() {
  const enabled = useFlag('new_checkout', false);
  return enabled ? <NewCheckout /> : <LegacyCheckout />;
}

// RIGHT: dynamic import — bundle only ships when flag is true
const NewCheckout = React.lazy(() => import('./NewCheckout'));

function Checkout() {
  const enabled = useFlag('new_checkout', false);
  if (!enabled) return <LegacyCheckout />;
  return (
    <Suspense fallback={<Skeleton />}>
      <NewCheckout />
    </Suspense>
  );
}
```

---

### 6. Kill Switch — Instant Rollback Without a Deploy

When a bad deploy ships, the on-call engineer flips the flag off in the admin UI. The flag service emits an SSE event to all connected clients within milliseconds. The in-memory store updates, React re-renders, and every user sees the old code path — no deployment needed, no CDN cache to bust, no rollback PR.

```
Engineer toggles flag off in Admin UI
  → Flag Service writes to DB
  → Flag Service publishes to internal event bus
  → SSE handler sends: data: {"new_checkout": false}
  → All connected browser tabs receive event
  → store.merge({"new_checkout": false})
  → React re-renders FeatureGate → shows LegacyCheckout
  → NewCheckout chunk is no longer requested
```

---

### 7. Authorization Warning — Flags Are Never a Security Boundary

Client-side flags are readable by any user who opens DevTools. A malicious user can read `window.__FLAGS__` or intercept the SSE stream. Never use a client flag as the sole gating mechanism for:

- Premium content
- Admin functionality
- Paid feature access

The pattern is: **flag controls the UI, server enforces the access**.

```typescript
// Client: flag hides the button
function ExportButton() {
  const canExport = useFlag('export_feature', false);
  if (!canExport) return null;
  return <button onClick={exportData}>Export</button>;
}

// Server: API always re-checks authorization regardless of flag
// POST /api/export
app.post('/api/export', requireAuth, async (req, res) => {
  const flagEnabled = await flagService.evaluate('export_feature', req.user);
  if (!flagEnabled) return res.status(403).json({ error: 'Feature not available' });
  // ... proceed with export
});
```

---

## Trade-offs

| Decision | Option A | Option B | Recommendation |
|---|---|---|---|
| Flag evaluation side | Client (rules sent to browser, client evaluates) | Server (server evaluates, sends boolean snapshot) | Server evaluation — leaks less business logic, easier to change targeting rules without SDK updates |
| Update mechanism | SSE (push) | Polling (pull) | SSE for real-time kill switches, polling as fallback; SSE uses one persistent connection vs many polling requests |
| Bootstrap method | Embed in HTML at SSR | Fetch on boot | Embed in HTML when SSR is available to eliminate FOUC; fetch on boot for pure SPAs is acceptable with a skeleton |
| Flag granularity | Boolean only | Multivariate (string/number variants) | Start boolean, add variants when A/B testing is needed; variants complicate the type system |
| Flag visibility | All flags sent to client | Only flags needed for current user/page | Send only what the page needs; reduces information leakage about unreleased features |

---

## Closing Statement

A well-designed feature flag system decouples deployment from feature release. The key architectural decisions are: evaluate flags server-side to avoid leaking business rules, embed the snapshot in SSR HTML to prevent FOUC, use SSE for real-time kill switches, and always combine dynamic imports with flag gates so disabled features are never downloaded. The critical safety rule is that client flags are UI hints only — the server must always re-enforce authorization independently.
