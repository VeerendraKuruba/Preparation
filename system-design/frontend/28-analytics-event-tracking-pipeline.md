# 28. Design an Analytics Event Tracking Pipeline

## Clarifying Questions

Before designing, I would ask:

- **Event types**: Are we tracking user interactions (clicks, form submits, navigation), performance metrics (LCP, FID, CLS), errors, or all three? Each has different volume and latency requirements.
- **Real-time vs batch**: Does the business need live dashboards (last 60 seconds of clicks), or are next-day warehouse reports sufficient? Real-time adds infrastructure cost.
- **GDPR and consent**: Do we need to gate tracking behind a consent banner? Do we need to support deletion requests ("right to be forgotten")?
- **Sampling**: What is the expected event volume per user session? Scroll and mousemove events can fire hundreds of times per second and must be sampled.
- **Reliability**: Is losing events on page unload acceptable, or must we guarantee delivery?
- **First-party vs third-party**: Are we building our own ingest pipeline, or wrapping a vendor SDK (Segment, Amplitude)? The answer changes what we own.

For this answer I will assume: user interaction and navigation events, next-day warehouse reporting with optional near-real-time aggregates, GDPR consent required, high-frequency event sampling needed, and a first-party ingest endpoint (we own the pipeline end to end).

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Browser                                                                     │
│                                                                              │
│  User Action (click, nav, form)                                              │
│       │                                                                      │
│       ▼                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Analytics SDK                                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────────┐  │ │
│  │  │ Consent gate │  │  PII filter  │  │  Sampler                    │  │ │
│  │  │ (init only   │  │  (blocklist, │  │  (1-in-N for high freq)     │  │ │
│  │  │  if consent) │  │   hash userId│  │                             │  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └─────────────┬───────────────┘  │ │
│  │         │                 │                         │                   │ │
│  │         └─────────────────┴─────────────────────────┘                  │ │
│  │                           │                                             │ │
│  │                           ▼                                             │ │
│  │                  ┌─────────────────┐                                    │ │
│  │                  │  In-memory      │  ◀── requestIdleCallback           │ │
│  │                  │  event queue    │       schedules non-critical        │ │
│  │                  └────────┬────────┘                                    │ │
│  │                           │ flush every 5s or 20 events                 │ │
│  │              ┌────────────┴──────────────┐                              │ │
│  │              │ Online                    │ Offline                      │ │
│  │              ▼                           ▼                              │ │
│  │      navigator.sendBeacon         IndexedDB queue                      │ │
│  │      (page unload)                (replay on reconnect)                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │ HTTPS POST /v1/collect  (batch JSON)
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  Edge Ingest Layer  (Cloudflare Worker / AWS Lambda@Edge)                    │
│  • Rate limiting per IP / user                                               │
│  • Schema validation (reject malformed payloads)                            │
│  • Bot filtering                                                             │
│  • Write to Kinesis / Kafka topic "raw-events"                               │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │
          ┌────────────────┴────────────────────┐
          ▼                                     ▼
┌──────────────────┐                  ┌──────────────────────────┐
│  Stream Processor│                  │  Near-real-time          │
│  (Flink / Spark) │                  │  aggregator              │
│  • Dedup         │                  │  (ClickHouse / Druid)    │
│  • Enrich        │                  │  live dashboards         │
│  • Sessionize    │                  └──────────────────────────┘
└────────┬─────────┘
         │
         ▼
┌────────────────────────────────┐
│  Data Warehouse                │
│  (BigQuery / Snowflake)        │
│  • Partitioned by date         │
│  • dbt models for funnels      │
│  • BI tools (Looker, Metabase) │
└────────────────────────────────┘
```

---

## Core Mechanics

### 1. Event Schema — Typed, Consistent, Versioned

A consistent schema is the contract between the SDK and the warehouse. Without it, analysts cannot query across event types reliably.

```typescript
type AnalyticsEvent = {
  // Identity
  name: string;          // 'button_clicked', 'page_viewed', 'purchase_completed'
  properties: Record<string, string | number | boolean>;

  // User context
  userId: string;        // hashed server-side or at capture time (never raw PII)
  anonymousId: string;   // UUID generated on first visit, persisted in localStorage
  sessionId: string;     // UUID, refreshed after 30 min of inactivity

  // Timing
  timestamp: string;     // ISO 8601, client clock — warehouse adjusts for skew
  sentAt: string;        // when the batch was actually sent

  // SDK metadata
  sdkVersion: string;    // '2.1.0' — correlate schema changes with SDK version
  page: {
    url: string;         // PII-scrubbed URL (no query params with tokens)
    referrer: string;
    title: string;
  };
  device: {
    userAgent: string;
    locale: string;
    screenWidth: number;
    screenHeight: number;
  };
};

// Usage at call site — strongly typed properties per event
analytics.track('button_clicked', {
  button_id: 'submit-checkout',
  page_section: 'cart',
  item_count: 3,
});
```

---

### 2. Batching — Reduce Network Requests, Respect Main Thread

Sending one HTTP request per event would generate hundreds of requests per session. Batching reduces network overhead and allows the SDK to run on idle time.

```typescript
class EventQueue {
  private queue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_SIZE = 20;
  private readonly FLUSH_INTERVAL_MS = 5_000;

  enqueue(event: AnalyticsEvent): void {
    this.queue.push(event);

    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush(); // Size threshold — flush immediately
      return;
    }

    if (!this.flushTimer) {
      // Time threshold — flush at most every 5 seconds
      this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL_MS);
    }
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const batch = this.queue.splice(0, this.BATCH_SIZE);
    if (batch.length === 0) return;

    try {
      await this.send(batch);
    } catch {
      // On send failure, push events back into queue (with cap to avoid OOM)
      if (this.queue.length < 500) {
        this.queue.unshift(...batch);
      }
    }
  }

  private async send(events: AnalyticsEvent[]): Promise<void> {
    await fetch('/v1/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true, // Allows the request to outlive the page
    });
  }
}
```

---

### 3. sendBeacon on Page Unload — Never Lose Last Events

`fetch` and `XMLHttpRequest` are cancelled when the page unloads. `navigator.sendBeacon` is specifically designed to survive page transitions. It is fire-and-forget (no response), queued by the browser, and guaranteed to send even during navigation or tab close.

```typescript
function setupUnloadHandler(queue: EventQueue): void {
  // 'visibilitychange' fires when tab is hidden or page is being closed.
  // It is more reliable than 'beforeunload' on mobile browsers.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushWithBeacon(queue.drain());
    }
  });

  // 'pagehide' is the most reliable unload event, fires before bfcache
  window.addEventListener('pagehide', () => {
    flushWithBeacon(queue.drain());
  });
}

function flushWithBeacon(events: AnalyticsEvent[]): void {
  if (events.length === 0) return;

  const payload = JSON.stringify({ events });

  // sendBeacon accepts Blob — set correct Content-Type
  const blob = new Blob([payload], { type: 'application/json' });

  const sent = navigator.sendBeacon('/v1/collect', blob);

  if (!sent) {
    // Beacon queue was full (rare) — persist to IndexedDB as fallback
    persistToIndexedDB(events);
  }
}
```

---

### 4. Offline Queue — IndexedDB Buffer with Replay on Reconnect

When the user is offline, events are buffered in IndexedDB and replayed in order when the connection returns. A size cap prevents unbounded storage growth.

```typescript
const DB_NAME = 'analytics-queue';
const STORE_NAME = 'events';
const MAX_QUEUED_EVENTS = 1_000;

async function persistToIndexedDB(events: AnalyticsEvent[]): Promise<void> {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { autoIncrement: true });
    },
  });

  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const count = await store.count();

  // LRU eviction: if already at cap, delete oldest entries first
  if (count + events.length > MAX_QUEUED_EVENTS) {
    const keys = await store.getAllKeys();
    const overflow = count + events.length - MAX_QUEUED_EVENTS;
    for (let i = 0; i < overflow; i++) {
      await store.delete(keys[i]);
    }
  }

  for (const event of events) {
    await store.add(event);
  }
  await tx.done;
}

async function replayOfflineQueue(): Promise<void> {
  const db = await openDB(DB_NAME, 1);
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const keys = await store.getAllKeys();
  const events = await store.getAll() as AnalyticsEvent[];

  if (events.length === 0) return;

  try {
    await fetch('/v1/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
    // Only clear after successful send
    for (const key of keys) {
      await store.delete(key);
    }
  } catch {
    // Leave in IDB — will retry on next reconnect
  }
  await tx.done;
}

// Hook into online event
window.addEventListener('online', replayOfflineQueue);
```

---

### 5. Sampling — High-Frequency Events Must Be Throttled

Scroll, mousemove, and resize events fire at 60+ times per second. Tracking every single one is wasteful and expensive. Sample a fraction and extrapolate in the warehouse.

```typescript
// Deterministic sampling by session — same session always samples the same events
// This avoids partial sessions in the warehouse (some events sent, others dropped)
function shouldSample(eventName: string, sessionId: string, rate: number): boolean {
  if (rate >= 1) return true;

  // Hash the session ID to a stable number in [0, 1)
  const hash = murmurhash3(sessionId) / 0xffffffff;
  return hash < rate;
}

class Analytics {
  private samplingRates: Record<string, number> = {
    scroll_depth:  0.10, // 10% of sessions — enough to compute percentiles
    mouse_move:    0.05, // 5% — very high volume
    page_view:     1.00, // 100% — critical event, never sample
    button_click:  1.00, // 100% — user intent, never sample
    purchase:      1.00, // 100% — revenue event, never sample
  };

  track(name: string, properties: Record<string, unknown> = {}): void {
    const rate = this.samplingRates[name] ?? 1.0;

    if (!shouldSample(name, this.sessionId, rate)) return;

    const event: AnalyticsEvent = {
      name,
      properties: {
        ...properties,
        // Record the sample rate so the warehouse can weight results correctly
        _sample_rate: rate,
      },
      // ... rest of event fields
    };

    this.queue.enqueue(event);
  }
}
```

---

### 6. requestIdleCallback — Non-Critical Tracking During Idle Time

Non-critical tracking (engagement scoring, feature discovery metrics) should not compete with user interactions for the main thread. Schedule it during browser idle periods.

```typescript
function trackWhenIdle(name: string, properties: Record<string, unknown>): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(
      (idleDeadline) => {
        // Only run if we have at least 10ms of idle time remaining
        if (idleDeadline.timeRemaining() > 10) {
          analytics.track(name, properties);
        }
      },
      { timeout: 2_000 } // Guarantee execution after 2s even if never idle
    );
  } else {
    // Fallback for browsers without rIC (Safari < 16)
    setTimeout(() => analytics.track(name, properties), 0);
  }
}

// Usage: engagement events that are nice-to-have but not revenue-critical
trackWhenIdle('feature_discovered', { feature: 'bulk_export', surface: 'toolbar' });
```

---

### 7. PII Guardrails — Client-Side Blocklist Before Transmission

PII must be stripped before events leave the browser. A config-driven blocklist allows the data team to add new sensitive properties without SDK code changes.

```typescript
const PII_BLOCKLIST_KEYS = new Set([
  'email', 'phone', 'name', 'firstName', 'lastName',
  'address', 'ssn', 'creditCard', 'password',
  'ip_address', // only track server-side if needed
]);

const URL_SCRUB_PARAMS = ['token', 'code', 'state', 'access_token', 'id_token'];

function stripPII(properties: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (PII_BLOCKLIST_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function scrubURL(url: string): string {
  try {
    const parsed = new URL(url);
    for (const param of URL_SCRUB_PARAMS) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    }
    return parsed.toString();
  } catch {
    return '[INVALID_URL]';
  }
}
```

---

### 8. Consent — Gate SDK Init, Queue Events Before Decision

In GDPR-regulated regions, analytics tracking must not start until the user grants consent. However, events that occur before the consent dialog is dismissed must either be replayed (if consent granted) or discarded (if denied).

```typescript
class ConsentAwareAnalytics {
  private initialized = false;
  private preConsentQueue: Array<{ name: string; props: Record<string, unknown> }> = [];

  // Called when consent state is known (page load if previously set, or after user action)
  onConsentDecision(granted: boolean): void {
    if (granted) {
      this.initialize();
      // Replay queued events from before consent was known
      for (const { name, props } of this.preConsentQueue) {
        this.track(name, props);
      }
    }
    // If denied, silently drop the pre-consent queue
    this.preConsentQueue = [];
  }

  track(name: string, props: Record<string, unknown> = {}): void {
    if (!this.initialized) {
      // Buffer up to 50 events before consent is known — prevents data loss
      // for the brief window between page load and consent banner render
      if (this.preConsentQueue.length < 50) {
        this.preConsentQueue.push({ name, props });
      }
      return;
    }
    this.sendEvent(name, props);
  }

  private initialize(): void {
    this.initialized = true;
    // Start batch flush timer, register unload handler, etc.
  }
}
```

---

## Trade-offs

| Decision | Client-Side Tracking | Server-Side Tracking | Recommendation |
|---|---|---|---|
| **Ad blocker resilience** | Blocked by most ad blockers | Not blocked | Use server-side for critical revenue events (purchases), client-side for UX events |
| **Data accuracy** | Bot traffic mixed in | Easier to filter bots server-side | Client-side is sufficient for UX analytics; server-side for billing |
| **Latency** | Near-instant capture | Slight delay | Client-side for everything latency-sensitive |

| Decision | 10% Sampling | 100% Capture | Recommendation |
|---|---|---|---|
| **Cost** | 10x cheaper | Expensive at scale | Sample high-frequency events; capture 100% of low-frequency intent events |
| **Data completeness** | Statistical, not exact | Exact | For p95 latency and funnel conversion, 10% is sufficient; for individual user debugging, need 100% |

| Decision | sendBeacon | fetch / XHR | Recommendation |
|---|---|---|---|
| **Unload reliability** | Survives page close | Cancelled on navigation | Always use sendBeacon for the unload flush |
| **Response access** | No response body | Full response | Use fetch for regular batches (retry logic), beacon for unload only |

---

## Closing Statement

A robust client-side analytics pipeline must solve four distinct problems: capturing events correctly (schema, sampling, requestIdleCallback), delivering them reliably (batching, sendBeacon, offline IndexedDB queue), protecting user privacy (PII blocklist, URL scrubbing, consent gating), and doing all of this without degrading the user experience. The design priority order is: correctness first (never send PII), reliability second (never lose revenue events), performance third (defer non-critical tracking to idle time).
