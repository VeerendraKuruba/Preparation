# Q11. Real-time dashboard (live metrics & ops views)

**Prompt variants:** **Live** KPIs, ops/incident wall, trading blotter-style view, monitoring home (Datadog/Grafana-like *client* angle), queue depths updating by the second.

[← Question index](./README.md)

**Overlaps:** RBAC & tables — [Q7 B2B dashboard](./q07-b2b-dashboard-rbac.md) (combine when the prompt is "Stripe dashboard but everything moves live").

---

### One-line mental model

The server **pushes deltas** (or the client polls fast); the UI must **merge** those into a stable model and **throttle rendering** so high-frequency events don't melt the main thread — users still need **tables, charts, and RBAC** without stutter.

---

### Clarify scope in the interview

- **Update rate:** how many metrics/rows update per second? 1 Hz? 10 Hz? Burst to 100 Hz?
- **Bidirectional:** can the user send commands (pause stream, change time range, acknowledge alert) or is this read-only?
- **Historical + live:** does the chart show the last 24 hours of data plus a live tail? Or live-only?
- **Cardinality:** 10 metrics on one dashboard or 1,000 rows in a live table?
- **Multi-tenant / RBAC:** do different users see different streams?
- **Client environment:** ops floor large monitors, or also mobile?

---

### Goals & requirements

**Functional**
- Dashboard widgets (KPI cards, sparkline charts, live tables) reflect new data within the agreed SLO (e.g., < 2 s end-to-end from metric event to screen).
- User can see connection health (connected / reconnecting / stale).
- User can pause the live stream to inspect a specific moment without losing data.
- Historical + live combined chart: left side is historical data, right side is live tail appended in real time.

**Non-functional**
- No long tasks (> 50 ms) on the main thread during burst updates — no jank.
- Correct numbers after reconnect — no silent stale data shown as current.
- Secure: server enforces which streams a user's role can subscribe to.
- Works under high cardinality: 500 live table rows updating at 2 Hz without frame drops.

---

### High-level frontend architecture

```
 ┌──────────────────────────────────────────────────────────────┐
 │  Browser                                                      │
 │                                                              │
 │  ┌────────────┐  ┌────────────┐  ┌────────────┐             │
 │  │  KPI Card  │  │Line Chart  │  │ Live Table │  ← Widgets  │
 │  │  Widget A  │  │  Widget B  │  │  Widget C  │             │
 │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘             │
 │        │               │               │                     │
 │        └───────────────┴───────────────┘                     │
 │                        │                                     │
 │              ┌─────────▼──────────┐                          │
 │              │  Stream Hub /      │  ← Single WS connection │
 │              │  Subscription Mgr  │    or one SSE per topic  │
 │              └─────────┬──────────┘                          │
 │                        │  dispatches to widget stores        │
 │              ┌─────────▼──────────┐                          │
 │              │   rAF Flush Loop   │  ← buffers messages,     │
 │              │  (16ms cadence)    │    flushes once/frame    │
 │              └────────────────────┘                          │
 │                                                              │
 └──────────────────────────────────────────────────────────────┘
         ▲  initial snapshot                ▲  delta stream
         │  GET /api/metrics/snapshot       │  WSS /ws/metrics
         │                                  │
 ┌───────┴──────────────────────────────────┴──────────┐
 │  API / Metrics Service                               │
 │  (Kafka consumer → Aggregator → WebSocket fanout)   │
 └──────────────────────────────────────────────────────┘
```

**Data flow:**
1. On mount, each widget fires a REST call to get the current snapshot (avoids empty/spinner first paint).
2. After snapshot loads, the Stream Hub opens one multiplexed WebSocket and sends `subscribe` messages for each widget's topics.
3. Incoming delta messages land in a write buffer (plain JS Map), not immediately in React state.
4. A `requestAnimationFrame` loop runs at ~60 Hz and flushes the buffer into the store once per frame.
5. Chart and table components read from the store and re-render only when their slice of data changed.

---

### What the client does (core mechanics)

#### 1. Transport: WebSocket vs SSE

**SSE (Server-Sent Events)**
```js
// Simple, HTTP-compatible, auto-reconnects, works through HTTP/2 proxies
const es = new EventSource('/api/stream/metrics?topics=cpu,memory,rps', {
  withCredentials: true
});
es.addEventListener('metric', (e) => {
  const delta = JSON.parse(e.data);
  buffer.set(delta.metricId, delta);
});
es.addEventListener('error', () => {
  setConnectionState('RECONNECTING');
});
// Drawback: one connection per topic group; no binary frames; no client→server messages
```

**WebSocket (preferred for dashboards with control messages)**
```js
// One connection, multiplexed topics, supports pause/resume control
class StreamHub {
  constructor(url) {
    this.ws = null;
    this.subscriptions = new Map(); // topicId → Set of callback fns
    this.reconnectDelay = 1000;
    this.connect(url);
  }

  connect(url) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      setConnectionState('CONNECTED');
      this.reconnectDelay = 1000;
      // Re-subscribe to all topics after reconnect
      for (const topicId of this.subscriptions.keys()) {
        this.ws.send(JSON.stringify({ type: 'subscribe', topicId }));
      }
    };
    this.ws.onmessage = (e) => this.dispatch(JSON.parse(e.data));
    this.ws.onclose = () => {
      setConnectionState('DISCONNECTED');
      // Trigger snapshot refetch on reconnect to heal any gap
      this.scheduleReconnect(url);
    };
  }

  subscribe(topicId, callback) {
    if (!this.subscriptions.has(topicId)) {
      this.subscriptions.set(topicId, new Set());
      this.ws?.send(JSON.stringify({ type: 'subscribe', topicId }));
    }
    this.subscriptions.get(topicId).add(callback);
    return () => this.unsubscribe(topicId, callback); // return cleanup fn
  }

  dispatch(msg) {
    const handlers = this.subscriptions.get(msg.topicId);
    if (handlers) handlers.forEach(fn => fn(msg));
  }

  scheduleReconnect(url) {
    setTimeout(() => this.connect(url), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000); // max 30s
  }
}
```

**SSE vs WS decision:**
- Use SSE when: server→client only, HTTP/2 environment, simple ops, corporate proxies that block WS.
- Use WS when: need control messages (pause, filter, time range change), binary frames, heartbeat, or multiplexing many topics over one connection.

#### 2. Snapshot + delta model

First paint must never be empty. The snapshot fetch and stream subscription happen in parallel — whichever arrives first wins, the other reconciles.

```js
// Widget bootstrap — happens on mount
async function initWidget(widgetId, topicId) {
  // 1. Fetch snapshot for fast first paint
  const snapshot = await fetch(`/api/metrics/${topicId}/snapshot`).then(r => r.json());
  store.setSnapshot(widgetId, snapshot);
  setWidgetState(widgetId, 'STREAMING');

  // 2. Subscribe to deltas — deltas may already be in buffer from step 3 below
  const unsubscribe = streamHub.subscribe(topicId, (delta) => {
    // Only apply delta if its sequence number is ahead of what we have
    if (delta.seq > store.getSeq(widgetId)) {
      deltaBuffer.set(`${widgetId}:${delta.metricId}`, delta);
    }
  });

  return unsubscribe; // caller registers for cleanup on unmount
}

// On reconnect: sequence gap detected — refetch snapshot
streamHub.onGap = (topicId, lastSeq, newSeq) => {
  if (newSeq - lastSeq > GAP_THRESHOLD) {
    setWidgetState(widgetId, 'RECONCILING');
    initWidget(widgetId, topicId); // full refetch
  }
};
```

#### 3. requestAnimationFrame batching — do not update DOM on every message

At 10 Hz updates across 20 metrics, you get 200 state updates per second. Without batching this causes 200 re-renders per second — the main thread never breathes.

```js
// Shared delta buffer — plain JS Map, not React state
const deltaBuffer = new Map(); // key: `${widgetId}:${metricId}` → latest value
let rafPending = false;

// Called from WS message handler — does NOT touch React state
function queueDelta(widgetId, metricId, value) {
  deltaBuffer.set(`${widgetId}:${metricId}`, { widgetId, metricId, value, ts: Date.now() });
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(flushDeltas);
  }
}

// Called once per frame (~16ms) — flushes all accumulated updates in one batch
function flushDeltas() {
  rafPending = false;
  if (deltaBuffer.size === 0) return;

  // Group by widgetId for efficient store update
  const byWidget = new Map();
  for (const [key, delta] of deltaBuffer) {
    if (!byWidget.has(delta.widgetId)) byWidget.set(delta.widgetId, []);
    byWidget.get(delta.widgetId).push(delta);
  }
  deltaBuffer.clear();

  // One store dispatch per widget — one re-render per widget per frame max
  for (const [widgetId, deltas] of byWidget) {
    store.applyDeltas(widgetId, deltas);
  }
}
```

Result: no matter how fast messages arrive, the DOM updates at most 60 times per second (frame rate), and each flush is a single batched state update.

#### 4. Chart downsampling with LTTB

Showing 100,000 raw data points in a SVG/Canvas chart causes rendering to collapse. The Largest Triangle Three Buckets (LTTB) algorithm downsamples to N display points while preserving the visual shape of the data.

```js
// LTTB downsampling — preserves visual fidelity at any zoom level
function lttb(data, threshold) {
  const len = data.length;
  if (threshold >= len || threshold === 0) return data;

  const sampled = [];
  let sampledIndex = 0;

  // Always add the first point
  sampled[sampledIndex++] = data[0];

  const bucketSize = (len - 2) / (threshold - 2);
  let a = 0; // Previously selected point

  for (let i = 0; i < threshold - 2; i++) {
    // Calculate point average for next bucket (for triangle area calc)
    let avgX = 0, avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    let avgRangeEnd   = Math.min(Math.floor((i + 2) * bucketSize) + 1, len);
    const avgRangeLen = avgRangeEnd - avgRangeStart;

    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      avgX += data[avgRangeStart][0];
      avgY += data[avgRangeStart][1];
    }
    avgX /= avgRangeLen;
    avgY /= avgRangeLen;

    // Pick point in current bucket with largest triangle area
    let rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.floor((i + 1) * bucketSize) + 1;
    const [pointAX, pointAY] = data[a];
    let maxArea = -1, nextA = rangeStart;

    for (; rangeStart < rangeEnd; rangeStart++) {
      const area = Math.abs(
        (pointAX - avgX) * (data[rangeStart][1] - pointAY) -
        (pointAX - data[rangeStart][0]) * (avgY - pointAY)
      ) / 2;
      if (area > maxArea) { maxArea = area; nextA = rangeStart; }
    }

    sampled[sampledIndex++] = data[nextA];
    a = nextA;
  }

  sampled[sampledIndex++] = data[len - 1]; // Always keep last point
  return sampled;
}

// Usage: before passing to chart component
const displayPoints = lttb(rawPoints, 300); // downsample to 300 display points
```

When the user zooms into a time window, re-run LTTB on the visible slice only, so detail appears when zoomed in.

#### 5. "Pause live" mode

When a user is investigating a spike they want to freeze the display while data still accumulates silently in the buffer.

```js
const [isPaused, setIsPaused] = useState(false);
const pausedBufferRef = useRef([]); // accumulates while paused

function togglePause() {
  if (isPaused) {
    // Resume: flush accumulated buffer all at once
    store.applyDeltas(widgetId, pausedBufferRef.current);
    pausedBufferRef.current = [];
    setIsPaused(false);
  } else {
    setIsPaused(true);
  }
}

// In delta handler:
function handleDelta(delta) {
  if (isPaused) {
    pausedBufferRef.current.push(delta); // accumulate silently
  } else {
    queueDelta(widgetId, delta.metricId, delta.value);
  }
}
```

#### 6. High-cardinality alert handling

When a burst arrives (e.g., 50 alerts in 500ms), naively rendering each one freezes the UI.

```js
// Coalesce alerts: count new ones, show a summary badge instead of 50 toasts
const alertQueue = useRef([]);
const [alertSummary, setAlertSummary] = useState(null);

streamHub.subscribe('alerts', (alert) => {
  alertQueue.current.push(alert);
});

// Drain alert queue once per second — not on every message
useEffect(() => {
  const interval = setInterval(() => {
    if (alertQueue.current.length > 0) {
      const newAlerts = alertQueue.current.splice(0);
      setAlertSummary(prev => ({
        count: (prev?.count ?? 0) + newAlerts.length,
        latest: newAlerts[newAlerts.length - 1],
        critical: newAlerts.filter(a => a.severity === 'critical'),
      }));
    }
  }, 1000);
  return () => clearInterval(interval);
}, []);
```

---

### Trade-offs

| Choice | Upside | Trade-off / When to switch |
|--------|--------|---------------------------|
| **SSE** | Simple; HTTP-friendly; auto-reconnect built-in; works through most proxies | No binary; no client→server messages without separate POST; if you need pause/resume commands, SSE forces awkward REST sidecar |
| **Multiplexed WS** (preferred) | One TCP connection for all topics; control messages; heartbeat; binary frames | Sticky load balancer or L7 proxy config needed; reconnect must re-subscribe to all topics; harder to debug than HTTP |
| **Short polling (1–5s)** | Works everywhere; no infra changes; easy to cache responses | Latency = poll interval; wasted requests when nothing changed; acceptable only for low-frequency metrics |
| **rAF batching** (current) | Smooth 60fps under burst; main thread never overwhelmed | Adds ~16ms latency to display; visible as "numbers lag ~100ms" — show "last updated" timestamp next to live values |
| **Immediate setState** per message | Simplest code; zero extra latency | At > 5 Hz across many metrics, causes continuous layout/paint thrashing; UI becomes unresponsive |
| **Client-side LTTB downsampling** | No server change needed; works for any time range | CPU cost on client for very large datasets; run in Web Worker if > 50k points |
| **Server-side downsampling** | Reduced data transfer; less client CPU | Requires server changes; fixed resolution per time range; client cannot zoom into raw data |
| **Per-frame rAF flush** | Simplest batching | At 1 Hz updates it still works fine; at 0.1 Hz you might prefer a 500ms setInterval to avoid 60 no-op rAF calls |

---

### Failure modes & degradation

```
State machine for each widget:
  LOADING ──► STREAMING ──► PAUSED (user action)
     │              │
     │         DISCONNECTED ──► RECONNECTING ──► back to STREAMING
     │              │                                  (refetch snapshot on reconnect)
     ▼              ▼
  ERROR          RECONCILING (gap detected, snapshot refetch in progress)
```

- **WebSocket drops:** show "Reconnecting..." banner with spinner; freeze last good values (don't clear them — stale data is better than empty); exponential backoff with jitter (base 1s, max 30s) to avoid thundering herd after a backend deploy.
- **Gap / sequence jump:** if `newSeq - lastSeq > threshold`, treat as potential data loss; set widget to RECONCILING; refetch full snapshot; flash "Data updated" when reconcile completes — never silently show wrong totals.
- **Thundering herd after deploy:** all dashboards reconnect simultaneously. Mitigation: add random jitter `delay = base * 2^attempt + Math.random() * 1000` so reconnects spread over 5–30 seconds.
- **Server throttling:** if server signals overload (custom close code or message), client drops to 1 Hz by applying updates only every 1000ms, coalescing everything in between.
- **Tab hidden:** pause delta processing when `document.visibilityState === 'hidden'`; resume and refetch snapshot on `visibilitychange` to `visible`.

---

### Accessibility checklist

- **Live regions:** `aria-live="polite"` on the connection status banner only — never on individual metric values. Announcing every tick creates an unbearable screen reader experience.
- **Pause button:** mandatory. Allows screen reader users and users with cognitive disabilities to stop the flood of changing content and read at their own pace.
- **Changed cell highlight:** flash animation on table cell update must respect `prefers-reduced-motion`; use a non-color indicator (e.g., a brief border change) not just color flash.
- **Focus stability:** when a live table row reorders (e.g., sort by value), do not move the focused row. Only re-sort on a debounced schedule (e.g., every 5 s) or on user demand.
- **Alert announcements:** batch alert notifications — one `aria-live` announcement per second summarizing "N new alerts" rather than one per alert.

---

### Minute summary (closing)

"The architecture has three layers working together. First, a REST snapshot on mount so every widget has real data immediately — no empty spinners. Second, a single multiplexed WebSocket that pushes deltas for all subscribed topics; widgets subscribe independently and unsubscribe on unmount so no widget leaks connections. Third, a requestAnimationFrame flush loop that sits between the WebSocket handler and React state — it buffers all incoming messages and flushes once per frame, which means the UI renders smoothly at 60fps no matter how fast the server pushes. For charts with long time windows we apply LTTB downsampling before rendering. Reconnect semantics are explicit: on reconnect we detect sequence gaps and refetch a full snapshot rather than silently displaying potentially wrong data. RBAC lives on the server — the server only pushes streams the authenticated user's role is allowed to see, and the client just renders what it receives."

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Update rate, chart vs table mix, RBAC, duplex needs, historical vs live-only |
| High-level architecture | 12–18 | Snapshot APIs + stream topology + rAF buffer layer |
| Deep dive 1 | 12–18 | **SSE vs WS vs poll** + reconnect state machine + snapshot-on-gap |
| Deep dive 2 | 12–18 | **rAF batching** + LTTB chart downsampling or **live table virtualization** |
| Trade-offs, failure, metrics | 8–12 | Stale data policy, thundering herd, observability |

### What to draw (whiteboard)

- Three widget boxes (Card, Chart, Table) each with an `initial GET` arrow pointing to API.
- A shared "Stream Hub" box receiving the WS connection, dispatching to each widget.
- A **buffer layer** labeled "deltaBuffer Map → rAF → store dispatch."
- **Reconnect state machine:** `CONNECTED → DISCONNECTED → RECONNECTING → SNAPSHOT_REFETCH → CONNECTED`.
- **LTTB:** a squiggly line with 10k points becoming a smooth line with 300 points.

### Deep dives — pick 2

**A. Transport & multiplexing** — Topic naming convention; heartbeat ping/pong to detect half-open connections; server filtering by role at connection auth time; max message rate per subscription; per-message compression (`permessage-deflate`); how HTTP/2 corporate proxies affect WS (answer: WS upgrades are HTTP/1.1, so HTTP/2 proxies pass them through as tunnels — usually fine but some strict enterprise proxies block non-HTTP; SSE is the safer bet in that environment).

**B. Main-thread performance** — rAF batching deep dive; structural sharing for immutable updates (avoid re-creating arrays on each delta); React `startTransition` for low-priority number updates vs urgent alerts; Web Worker for LTTB resampling if dataset > 100k points (avoids jank during zoom).

**C. Live + historical chart** — Fixed-size circular buffer in memory for live tail (last N minutes); historical data fetched from API and stitched at the join point; "pause live" freezes the right edge while the user scrubs; dual x-axis showing event-time vs ingestion-time skew for ops latency visibility.

**D. Virtualized live table** — Stable `rowId` for reconciliation; update cell value without remounting the row (use `React.memo` with custom comparator); flash animation throttled via CSS class toggle; avoid re-sorting on every delta (sort on 5s debounced schedule); `react-window` or `TanStack Virtual` for 500+ rows.

### Common follow-ups

- **"Exactly-once delivery?"** — Client uses idempotent keys: dedup by `(topicId, seq)` or `(seriesId, timestamp)`. Server is the source of truth; conflicts resolved by refetching snapshot.
- **"100,000 points on a chart?"** — LTTB to 300–500 display points for the current viewport; keep raw in a Web Worker or server; re-downsample on zoom to show more detail in the zoomed window.
- **"Multiple tabs sharing one socket?"** — `SharedWorker` holds one WS; all tabs message it via `postMessage`. Advanced — usually accept one socket per tab with per-user rate limits at the server.
- **"Alert fires in UI while user is typing in a form?"** — Alert channel is separate from metric channel; use a notification hub that queues alerts; display as a badge/toast that does not interrupt focus; `aria-live="assertive"` for critical-only alerts, `polite` for everything else.

### What you'd measure

- **UX:** frames dropped per second during burst (Chrome DevTools Performance API `PerformanceLongTaskTiming`); median staleness (wall clock now − last event timestamp visible on screen); reconnect duration (time from disconnect to `STREAMING` state).
- **Reliability:** gap events detected and healed vs silently missed (requires sequence numbers from server); snapshot refetch success rate after reconnect.
- **Cost:** messages per second per connected dashboard; server-side fan-out latency (event ingested → WS push latency); client CPU sample (Web Vitals INP as proxy).

### v1 vs later

| v1 | Later |
|----|--------|
| One multiplexed WS + REST snapshot; rAF batching | Web Worker for LTTB; SharedWorker for cross-tab socket sharing |
| Banner + manual refresh button on disconnect | Automatic snapshot heal + partial replay on gap |
| Pause live toggle | Per-widget SLO indicators; adaptive update rate (slow down non-critical widgets under CPU pressure) |
| Client-side LTTB in main thread | Server-side pre-aggregation for fixed time buckets; LTTB in Web Worker for ad-hoc zoom |
