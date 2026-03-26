# Design: Dynamic Role-Based Dashboard — Freshworks Customer Support

> **Interview framing:** "Design a dynamic dashboard for customer support agents at Freshworks where the layout changes based on user role, with role-based rendering, real-time ticket updates via WebSockets, and data fetching."

**Mental model:** This is a **B2B RBAC dashboard** — server-driven layout config, micro-frontend widget isolation, one WebSocket connection owned by the shell, tiered data freshness per widget, and partial offline via Service Worker.

---

## 1. Clarify Scope (say this out loud — 2–3 min)

> "Before I start, let me clarify a few things to make sure I design the right system."

**Functional questions to ask:**
- How many roles? *(assume: agent, supervisor, admin)*
- Can the same user have multiple roles?
- Is the layout fully different per role, or same layout with different widgets/data?
- What widgets exist? *(ticket queue, CSAT scores, agent stats, SLA timers)*
- Real-time scope — just ticket updates, or also agent presence (who's online)?
- Can supervisors customize their own layout, or is it strictly role-driven?

**Non-functional questions:**
- How many concurrent agents? *(assume: ~50k globally, ~5k peak concurrent)*
- Uptime requirement? *(99.9% — support cannot go down)*
- Offline requirement? *(partial — agents should see last state if connectivity drops)*
- Target devices? *(desktop-first, Chrome/Edge)*
- i18n / RTL? *(mention — Freshworks is global)*

> **Stated assumptions:** 3 roles, server-driven layout config, ~5k concurrent users, real-time ticket updates via WebSocket, partial offline via Service Worker, desktop-first.

---

## 2. Functional & Non-Functional Requirements

### Functional
- Login via SSO → role resolved from JWT
- Dashboard layout differs by role (widgets, grid positions)
- Ticket queue updates in real-time without page refresh
- Agents can view ticket details inline
- Supervisors see agent stats and CSAT aggregates
- Admins see system metrics and configuration

### Non-Functional
| Requirement | Target |
|---|---|
| LCP (initial dashboard) | < 2s |
| Time-to-interactive | < 3.5s |
| Real-time latency | < 500ms for ticket events |
| Availability | 99.9% |
| Concurrent users | 5,000 peak |
| Offline | Read-only last-known state |

---

## 3. High-Level Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                          Browser                              │
│                                                               │
│  ┌──────────┐   ┌──────────────────────────────────────────┐ │
│  │  Auth    │──▶│            Shell App (Host)              │ │
│  │  Module  │   │  - Role resolution from JWT              │ │
│  └──────────┘   │  - Fetches layout config from server     │ │
│                 │  - Widget Registry (lazy load remotes)   │ │
│                 │  - WebSocket Manager (one connection)    │ │
│                 │  - Internal Event Bus                    │ │
│                 └──────────────┬───────────────────────────┘ │
│                                │ lazy loads per role          │
│             ┌──────────────────┼──────────────┐              │
│             ▼                  ▼              ▼               │
│      [Ticket Queue]     [Agent Stats]      [CSAT]            │
│       Remote MFE         Remote MFE       Remote MFE         │
└───────────────────────────────────────────────────────────────┘
          │                                        │
          ▼                                        ▼
   Layout Config API                       WebSocket Server
   GET /layout?role=supervisor             ws://support.freshworks.com/ws
          │
          ▼
   Auth / SSO Service
```

**Why Micro-Frontend (Module Federation)?**
- Each widget team deploys independently — no coordinated releases
- Shell stays small (~20–30kb), loads only widgets the role needs
- Widget failures are isolated via Error Boundaries — one crash doesn't kill the dashboard
- Widget remotes can be versioned separately

**Trade-off:** Shared dependency versioning is tricky — React version mismatch between shell and a remote is a real problem. Mitigate with `singleton: true` in Module Federation config and strict peer dep contracts.

---

## 4. Role-Based Rendering (Core Problem)

### Flow

```
1. User logs in → SSO → returns JWT with { role: "supervisor", userId: "u123" }
2. Shell parses JWT → calls Layout Config API
   GET /layout?role=supervisor
3. API returns:
   {
     widgets: ["ticket-queue", "agent-stats", "csat", "sla-timer"],
     grid: [
       { widget: "ticket-queue", position: { col: 1, row: 1, colSpan: 2 } },
       { widget: "agent-stats",  position: { col: 3, row: 1, colSpan: 1 } },
       { widget: "csat",         position: { col: 1, row: 2, colSpan: 1 } },
       { widget: "sla-timer",    position: { col: 2, row: 2, colSpan: 2 } }
     ]
   }
4. Shell dynamically imports ONLY those widget remotes (in parallel)
5. Renders CSS Grid with server-specified positions
6. Each widget gets user context (userId, role, permissions) via shared context
```

### Why server-driven layout?
- Product can A/B test layouts without a frontend deploy
- Layout logic lives in one place — the config API
- Supervisors and agents at different tiers can have sub-variants
- Config API can be cached aggressively at the edge (changes rarely)

### Code sketch

```js
// Shell: Widget Registry
const WIDGET_REGISTRY = {
  "ticket-queue": "https://cdn.freshworks.com/ticket-queue/remoteEntry.js",
  "agent-stats":  "https://cdn.freshworks.com/agent-stats/remoteEntry.js",
  "csat":         "https://cdn.freshworks.com/csat/remoteEntry.js",
};

// Dynamic load per widget name
const loadWidget = async (widgetName) => {
  const container = await loadRemoteEntry(WIDGET_REGISTRY[widgetName]);
  return container.get("./Widget");
};

// Dashboard Layout Engine
function Dashboard({ layoutConfig }) {
  return (
    <GridLayout config={layoutConfig.grid}>
      {layoutConfig.widgets.map(name => (
        <ErrorBoundary key={name} fallback={<WidgetError name={name} />}>
          <Suspense fallback={<WidgetSkeleton />}>
            <LazyWidget name={name} />
          </Suspense>
        </ErrorBoundary>
      ))}
    </GridLayout>
  );
}
```

### Defense in depth — permission guard inside each widget too
```js
// Inside the AgentStats remote widget
function AgentStatsWidget({ user }) {
  if (!user.permissions.includes("view:agent-stats")) {
    return <AccessDenied />;  // never trust only the shell
  }
  // ... render
}
```

**Why both?** Shell hides unavailable widgets (UX). Widget re-checks permissions (security). Never trust UI-layer RBAC alone.

---

## 5. Data Fetching Strategy

Different data has different freshness requirements — one strategy doesn't fit all.

| Widget | Data | Strategy | Staleness Tolerance |
|---|---|---|---|
| All | Layout config | Fetch on login, memory cache | Session-long |
| Ticket Queue | Ticket list | React Query, `staleTime: 30s` | 30 seconds |
| Agent Stats | Live presence | WebSocket push | Must be live |
| CSAT | Score aggregates | HTTP Cache (`max-age=3600`) | 1 hour |
| SLA Timer | Deadlines | Client countdown + WS correction | Near-zero |

### Caching Layers (top to bottom)

```
Browser Request
      │
      ▼
Service Worker Cache   ← JS/CSS bundles, widget manifests, layout config
      │ miss
      ▼
HTTP Cache (ETags)     ← API responses with Cache-Control headers
      │ miss
      ▼
CDN Edge Cache         ← CSAT aggregates, public layout configs
      │ miss
      ▼
Origin API Server
```

### React Query setup for Ticket Queue
```js
const { data: tickets } = useQuery({
  queryKey: ["tickets", agentId],
  queryFn: () => fetchTickets(agentId),
  staleTime: 30_000,           // serve stale for 30s, refetch in background
  refetchOnWindowFocus: true,  // refetch when agent returns to tab
  refetchInterval: 60_000,     // poll as safety net if WS drops
});
```

---

## 6. Real-Time with WebSockets

### Key design decision: Shell owns ONE WebSocket connection per session

> **Not one per widget.** One shared connection, internal pub/sub.

```
Shell connects:
  ws://support.freshworks.com/ws?token=<JWT>

Incoming event arrives:
  { type: "ticket.updated", ticketId: "T123", queue: "billing", ... }

Shell's event bus:
  eventBus.emit("ticket.updated", data)

Ticket Queue Widget subscribes:
  useEffect(() => {
    eventBus.on("ticket.updated", (data) => {
      queryClient.setQueryData(["tickets", agentId], (old) =>
        old.map(t => t.id === data.ticketId ? { ...t, ...data } : t)
      );
    });
    return () => eventBus.off("ticket.updated");
  }, []);
```

**Why one connection?**
- Browsers limit concurrent connections per origin
- Token refresh logic in one place
- Less server-side connection overhead at 5k concurrent users
- Easier to implement heartbeat + reconnect in one place

### Resilience strategy

```
WS connects → healthy
  ↓ drops
Exponential backoff reconnect: 1s → 2s → 4s → 8s → max 30s
  ↓ if WS blocked by corporate firewall
Fallback to SSE (Server-Sent Events)
  ↓ if SSE also blocked
Polling every 30s (safety net, not primary)

UI banner:
  "Live" (green dot)  /  "Reconnecting..."  /  "Offline — last updated 3:42 PM"
```

### Message ordering + deduplication
```js
// Each event carries a monotonic sequence number
if (event.seq <= lastProcessedSeq[event.type]) return; // discard duplicate/out-of-order
lastProcessedSeq[event.type] = event.seq;
processEvent(event);
```

---

## 7. Offline Support

> "Agents may lose connectivity intermittently. They should see last-known state, not a blank screen."

### Service Worker Strategy (Workbox)

| Resource | Strategy | Reason |
|---|---|---|
| JS/CSS bundles, fonts | Cache-first | Immutable after deploy, fast repeat loads |
| Widget manifests | Stale-while-revalidate | Serve cached, update in background |
| Layout config | Stale-while-revalidate | Changes rarely, acceptable to serve stale |
| Ticket data | Network-first, fallback to IndexedDB | Always try fresh, show cached on failure |
| Write operations (replies, reassign) | Never cache | Queue in outbox, sync on reconnect |

### IndexedDB — Offline Snapshot
```js
// On each successful ticket fetch, persist to IndexedDB
async function persistTicketSnapshot(tickets) {
  const db = await openDB("freshworks-cache", 1);
  await db.put("snapshots", {
    tickets,
    savedAt: Date.now(),
  }, "ticket-list");
}

// On offline fallback
async function getOfflineSnapshot() {
  const db = await openDB("freshworks-cache", 1);
  return db.get("snapshots", "ticket-list");
}
```

### Offline UI behavior
```
┌────────────────────────────────────────────────────────┐
│  ⚠  You're offline — showing data from 3:42 PM        │
└────────────────────────────────────────────────────────┘

- Ticket list renders from IndexedDB snapshot (read-only)
- "Reply", "Reassign", "Close" buttons are disabled with tooltip
- Agent status changes queued → sync on reconnect
- WebSocket reconnect attempted in background
```

---

## 8. Performance

### Initial Load Timeline
```
T=0ms     Shell HTML arrives (< 5kb) — skeleton rendered
T=50ms    Shell JS executes, auth check starts
T=200ms   JWT verified, layout config fetched (parallel)
T=400ms   Widget remotes start loading in parallel (only role-required ones)
T=600ms   First widget renders with skeleton
T=800ms   Ticket data arrives — ticket queue populates
T=1200ms  All visible widgets populated with real data
```

### Widget Isolation Performance
- Shell bundle: < 30kb gzipped (auth + layout engine only)
- Widgets: independent bundles, lazy-loaded only when role needs them
- Agent role loads 2 widgets; supervisor loads 4; admin loads 6

### Ticket List at Scale (1000+ tickets)
- `react-window` virtualized list — only renders visible rows (~15–20 at a time)
- Stable keys by `ticketId` for minimal reconciliation
- Debounce filter/search inputs (300ms) to avoid thrashing React Query

### Core Web Vitals

| Metric | Target | How |
|---|---|---|
| LCP | < 2s | Shell tiny, layout config priority fetch, widget skeletons fill above-fold space |
| CLS | < 0.1 | Reserve grid cell dimensions before widget loads (`min-height` on placeholders) |
| INP | < 200ms | Debounce filters, defer non-critical WS updates via `requestIdleCallback` |

---

## 9. Error Handling & Resilience

```js
// Every widget wrapped in Error Boundary — widget crash isolated
<ErrorBoundary
  fallback={({ widgetName }) => (
    <div className="widget-error">
      Failed to load {widgetName}.{" "}
      <button onClick={reset}>Retry</button>
    </div>
  )}
>
  <Suspense fallback={<WidgetSkeleton />}>
    <LazyWidget name={widgetName} />
  </Suspense>
</ErrorBoundary>
```

| Failure | Behavior |
|---|---|
| Layout config API fails | Use IndexedDB cached layout from last session |
| Widget remote fails to load | Show "Failed to load [widget name]" with retry button; other widgets unaffected |
| WebSocket drops | Exponential backoff → SSE → polling fallback |
| Ticket API times out | Show stale data with "last updated X min ago" badge, retry in background |
| Auth token expires | Shell intercepts 401 → silent refresh (refresh token) → retry original request |

---

## 10. Accessibility (a11y)

- Dashboard grid announced to screen readers: `<main aria-label="Support Dashboard">`
- Each widget: `<section aria-label="Ticket Queue">` with live region
- Ticket count updates: `<div aria-live="polite">` so screen readers announce changes without focus disruption
- Keyboard: Tab moves between widgets; Enter/Space to expand ticket detail
- Reduced motion: `prefers-reduced-motion` disables ticket-count animations and transition effects
- "Disconnected" banner: `role="alert"` so it's announced immediately

---

## 11. Trade-offs — Raise These Unprompted

| Decision | Trade-off |
|---|---|
| MFE vs monolith | MFE = independent deploys, failure isolation. BUT shared dep versioning is hard — React version mismatch between shell and remote is a real risk. Mitigate with `singleton: true` and strict contracts. |
| Server-driven layout | Product can change layouts without a deploy, great for A/B testing. BUT adds a config API to build, maintain, and cache-invalidate. |
| One WS connection in shell | Efficient, one auth point. BUT widgets are now coupled to shell's event bus contract — changing event shape is a breaking change. |
| Stale-while-revalidate for tickets | Fast perceived performance. BUT agent might act on 30s-old ticket data — acceptable for support, not for financial apps. |
| Offline read-only | Better than a blank screen. BUT adds Service Worker complexity and sync edge cases (what if agent status changed while offline?). |
| CSS Grid for layout | Clean, server-specifiable positions. BUT complex span math if widgets need to be responsive — requires grid position normalization for mobile. |

---

## 12. What I'd Monitor

| Signal | Tool | Alert on |
|---|---|---|
| LCP / INP per role | RUM (DataDog / SpeedCurve) | LCP > 3s for > 5% of sessions |
| WebSocket drop rate | Custom metrics | > 1% sessions dropping per hour |
| WS reconnect frequency | Custom metrics | Spike indicates network or server issue |
| Widget error rate | Sentry (per remote) | > 0.1% error rate on any widget |
| Layout config cache hit rate | CDN metrics | Drop means cold start latency spike |
| IndexedDB offline fallback rate | Custom analytics | How often agents actually go offline |
| Ticket update lag (WS event → UI render) | Custom timer | > 1s p95 |

---

## 13. Minute Summary (how to close)

> "To summarize — I designed a **Shell + Micro-Frontend** architecture where the shell resolves the user's role from a JWT, fetches a **server-driven layout config** that specifies which widgets to show and where, then **lazy-loads only those widget remotes** via Module Federation. Data fetching is **tiered by freshness requirement**: static assets via Service Worker cache-first, ticket lists via React Query with 30s stale time, and live ticket events via a **single WebSocket connection owned by the shell** with an internal pub/sub distributed to widgets. Offline is handled by a Service Worker network-first strategy falling back to an **IndexedDB snapshot**, with the UI clearly communicating degraded state and disabling write actions. The two key trade-offs I made: **server-driven layout for product flexibility** at the cost of a config API dependency, and **one WS connection for efficiency** at the cost of widget–shell event contract coupling."

---

## Deep Dive Prompts (if interviewer steers here)

| Prompt | Answer direction |
|---|---|
| "How do you handle token expiry with WebSockets?" | WS doesn't support headers after handshake — pass token in query string or first message; shell monitors 401 REST calls, closes + re-opens WS with new token |
| "What if two agents update the same ticket simultaneously?" | Last-write-wins for simple fields; show "Updated by Agent X" banner; for critical fields use optimistic lock (ETag) and show conflict UI |
| "How would you add a drag-to-customize layout?" | Layout becomes user-specific override on top of role default; store delta in user preferences API; merge server default + user override on load |
| "How do you test this?" | Unit: widget in isolation with mock event bus; Integration: shell + widget with MSW mocks; E2E: Playwright per-role login → assert correct widgets; Visual: Chromatic per role |
| "What changes if this needs to be mobile-first?" | Shell adapts grid to single-column; widgets stack vertically; bottom tab bar replaces sidebar; WS stays same; Service Worker more critical (mobile networks drop more) |
