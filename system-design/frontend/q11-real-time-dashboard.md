# Q11. Real-time dashboard (live metrics & ops views)

**Prompt variants:** **Live** KPIs, ops/incident wall, trading blotter-style view, monitoring home (Datadog/Grafana-like *client* angle), queue depths updating by the second.

 [← Question index](./README.md)

**Overlaps:** RBAC & tables — [Q7 B2B dashboard](./q07-b2b-dashboard-rbac.md) (combine when the prompt is “Stripe dashboard but everything moves live”).

---

### One-line mental model

The server **pushes deltas** (or the client polls fast); the UI must **merge** those into a stable model and **throttle rendering** so high-frequency events don’t melt the main thread—users still need **tables, charts, and RBAC** without stutter.

### Clarify scope in the interview

**Fan-out:** how many metrics/rows update per second? **Bidirectional** control (pause stream, change time range) or **read-only**? **Historical** chart + **live tail**? **Multi-tenant / RBAC**? Mobile or **ops floor large desktop** only?

### Goals & requirements

- **Functional:** widgets (cards, tables, charts) reflect new data within **SLO** (e.g. under ~1–5s or “near real-time”); user can see **connection health**; time range / filters (if in scope).
- **Non-functional:** **smooth UI** under burst updates (no long-task storms); **correct** numbers after reconnect; **secure** streams (authz per tenant/role).

### High-level frontend architecture

**CSR shell** (typical) → initial **REST/GraphQL** snapshot for each widget → **SSE** or **WebSocket** (or short poll) for **delta** channel(s) → **normalized store** per widget or shared hub → **coalesced** view updates (`requestAnimationFrame` / micro-batching) → virtualized table/chart layer.

### What the client does (core mechanics)

1. **Transport**
   - **SSE:** great **server→client** fanout, HTTP-friendly, auto-reconnect in many browsers—weak for binary or duplex *unless* you add parallel POST for actions.
   - **WebSocket:** one connection for **multiplexed topics** (`subscribe: { metricIds }`); good when you need **heartbeat**, **backpressure** signaling, or binary frames.
   - **Polling:** acceptable for **low-frequency** or strict infra; use **ETags** / `If-Modified-Since` or cursor; backoff when tab hidden (`document.visibilityState`).

2. **Snapshot + delta** — First paint from **REST** (or SSR JSON embed) so widgets aren’t empty; then apply **deltas** with sequence/version if backend provides it; **re-hydrate** full snapshot on reconnect or gap.

3. **UI batching** — Don’t `setState` per message; buffer in a **ref/map**, flush once per frame or every **N ms** cap; cap **chart points** (sliding window, **LTTB** downsampling for millions of points—mention as trade-off).

4. **Widget isolation** — Each widget owns subscription lifecycle; **unsubscribe** on unmount; one bad chart doesn’t tear down the socket for the page (or use **per-widget** SSE if scale allows—usually one multiplexed WS).

5. **RBAC** — Same as Q7: server enforces **which** streams and fields exist; client hides/disabled UI but **never** relies on hiding alone for security.

### Trade-offs

| Choice | Upside | Trade-off |
|--------|--------|-----------|
| SSE | Simple one-way; HTTP/2 | No binary/duplex; many connections if not multiplexed at app level |
| Multiplexed WS | One connection; control messages | Sticky sessions, harder infra; reconnect resubscribe logic |
| Aggressive batching | Smooth FPS | Slightly “laggy” numbers (100–300ms)—show **last updated** time |
| Full precision chart | Truthful | CPU/memory; need **downsample** for long windows |

### Failure modes & degradation

- **Socket down:** banner + **freeze** last good values; **exponential backoff** reconnect; optional **fallback poll** for critical KPIs.
- **Gap / version jump:** refetch snapshot for affected widgets; flash **“reconciling…”** not silent wrong data.
- **Thundering herd:** many dashboards open after deploy—**jitter** on reconnect; **don't** retry all widgets independently without coordination.
- **Overload:** server signals **throttle** (coarser granularity); client drops to **1 Hz** updates for non-critical tiles.

### Accessibility checklist

- **Live regions:** use sparingly—don’t announce every tick; optional “**values updated**” on user action or interval toggle.
- **Pause updates:** let users **pause** live refresh (reduces motion + helps screen reader users).
- **Focus:** don’t steal focus when a table row value changes; **highlight** changed cells with non-color cue where possible.

### Minute summary (closing)

“We **snapshot** each widget for fast first paint, then **stream deltas** over **SSE or multiplexed WebSocket**, **batch merges** into the store so we don’t render per packet, and **re-snapshot** on reconnect so money/ops numbers stay **trusted**—with **RBAC** on what streams exist at all.”

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Update rate, chart vs table mix, RBAC, duplex needs |
| High-level architecture | 12–18 | Snapshot APIs + stream topology + client stores |
| Deep dive 1 | 12–18 | **SSE vs WS vs poll** + reconnect semantics |
| Deep dive 2 | 12–18 | **Batching + chart downsampling** or **live table + virtualization** |
| Trade-offs, failure, metrics | 8–12 | Stale data policy, observability |

### What to draw (whiteboard)

- Boxes: **Widget A/B/C** each with `initial GET` arrow and **shared or per-app WS** with `subscribe` topics.
- **Buffer** layer: “messages queue → rAF flush → React/store.”
- **State:** `entityId → latest value` map; optional **version** counter.
- Reconnect path: `DISCONNECTED → SNAPSHOT_REFETCH → STREAMING`.

### Deep dives — pick 2

**A. Transport & multiplexing** — Topic naming; **heartbeat**; server **filter** by role at connection time; **max message rate** per subscription; **compression** (brief); **HTTP/2** SSE vs WS through corporate proxies.

**B. Main-thread performance** — `requestAnimationFrame` batching; **structural sharing** for immutable updates; **React concurrent** / `startTransition` for low-priority number tweaks; **Web Worker** for heavy chart resampling (optional).

**C. Live + historical** — Charts: **fixed bucket** aggregation; **pause** stream when user scrubs; **dual axis** of event-time vs server-time skew (show **latency** hint for ops).

**D. Virtualized grid + live cells** — Stable **row id**; update cell without remounting row; **flash** animation throttled; avoid resorting every tick (sort on **debounced** schedule or server order).

### Common follow-ups

- **“Exactly-once?”** — Client-side: **idempotent** keys on events; dedup by `(seriesId, ts)`; trust **server** for truth after conflict.
- **“100k points on a chart?”** — **Downsample** for display; keep raw in worker or server; **decimate** on zoom.
- **“Multiple tabs?”** — **SharedWorker** or **BroadcastChannel** to share one socket (advanced); often accept **one socket per tab** with rate limits per user.
- **“Alerts firing in UI?”** — Separate **notification** channel or priority messages; don’t block metric loop; **a11y** for alerts without spamming `aria-live`.

### What you’d measure

- **UX:** frames dropped during burst, median **staleness** (now − last event time), reconnect duration.
- **Reliability:** gap events detected, snapshot-after-reconnect success rate.
- **Cost:** messages/sec per dashboard, client CPU sample.

### v1 vs later

| v1 | Later |
|----|--------|
| One multiplexed WS + snapshot REST; per-frame batching | Worker-based resampling; shared connection across tabs |
| Banner + manual refresh on failure | Automatic snapshot heal + partial replay |
| Pause live toggle | Per-widget SLO indicators and tuning |
