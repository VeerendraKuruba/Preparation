# Round 7 — Frontend System Design (45–60 min)

| | |
|---|---|
| **Format** | Whiteboard / Excalidraw |
| **Eliminates?** | Yes |
| **Focus** | Product UI + API contracts + data flow + real-time + perf |

> Tesla fullstack-heavy FE: **you fail if you only draw React components** without API shape, state, and failure modes.

---

## Minute-by-Minute Framework

| Time | Section | Say |
|------|---------|-----|
| 0–5 | Requirements | "Who are users? Scale? Mobile? Real-time?" |
| 5–10 | UI map | Draw pages + user journeys |
| 10–20 | Data + API | Entities, endpoints, state tools |
| 20–30 | Real-time + errors | Poll vs WS, reconnect, stale data |
| 30–40 | Perf + security | Virtualize, auth, RBAC |
| 40–45 | v1 vs v2 | What ships first |

---

## Prompt 1 — Car Rental Frontend *(reported Tesla prompt)*

### Step 1 — Clarifying questions (ask before drawing)

| Question | Default assumption if vague |
|----------|----------------------------|
| B2C only or fleet admin too? | B2C v1, admin v2 |
| Mobile traffic %? | 50% mobile — responsive, not native |
| How fresh must availability be? | 30s stale OK for v1 |
| Scale? | 50K vehicles, 10K concurrent search users |
| Auth? | Email/password + OAuth; bookings require login |

### Step 2 — User journeys (narrate)

> **Journey A — Search & book:** User enters location + dates → sees available vehicles → opens detail → selects dates → confirms booking → sees confirmation email in account.
>
> **Journey B — Manage booking:** User opens My Bookings → cancels upcoming trip → sees refund policy state.

### Step 3 — UI / route map

```
/                      Landing + SearchForm
/search?loc=&from=&to=  Results (list + filters)
/vehicles/:id           Detail + pricing + CTA
/booking/:vehicleId     Multi-step (dates → review → pay)
/account/bookings       List + cancel
/account/bookings/:id   Detail + status
/admin/fleet            (v2) Fleet status dashboard
```

### Step 4 — Component architecture

```
AppShell (nav, auth banner)
├── SearchPage
│   ├── LocationAutocomplete  ← debounced API
│   ├── DateRangePicker
│   └── SearchButton
├── SearchResultsPage
│   ├── FilterBar (type, price, seats)
│   ├── VehicleList
│   │   └── VehicleCard (lazy image)
│   └── Pagination / infinite scroll
├── VehicleDetailPage
│   ├── ImageGallery
│   ├── PricingSummary
│   └── BookNowButton
├── BookingFlow (stepper)
│   ├── StepDates
│   ├── StepReview
│   └── StepPayment (Stripe embed)
└── BookingsPage
    └── BookingRow → CancelModal
```

### Step 5 — Data model

```ts
type Location = { id: string; city: string; lat: number; lng: number };

type Vehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  type: 'economy' | 'suv' | 'luxury';
  locationId: string;
  dailyRate: number;
  images: string[];
  status: 'available' | 'rented' | 'maintenance';
};

type Booking = {
  id: string;
  vehicleId: string;
  userId: string;
  startDate: string; // ISO
  endDate: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalPrice: number;
};

type User = { id: string; email: string; name: string };
```

### Step 6 — API contracts (say aloud — fullstack signal)

```
GET  /api/locations/autocomplete?q=sf&limit=10
     → { suggestions: [{ id, label, city }] }

GET  /api/vehicles?locationId=&from=&to=&type=&minPrice=&cursor=&limit=20
     → { items: Vehicle[], nextCursor: string | null, hasMore: boolean }

GET  /api/vehicles/:id?from=&to=
     → { vehicle, pricing: { dailyRate, fees, total }, available: boolean }

POST /api/bookings
     Body: { vehicleId, startDate, endDate, idempotencyKey }
     → { booking, paymentClientSecret? }

GET  /api/bookings/me?cursor=
     → { items: Booking[], hasMore }

PATCH /api/bookings/:id
     Body: { action: 'cancel' }
     → { booking }
```

**Why cursor pagination:** Offset breaks when inventory changes during scroll — cursor stable for "load more" on search results.

### Step 7 — State management

| State type | Where | Tool |
|------------|-------|------|
| Search filters | URL query params | `useSearchParams` — shareable links |
| Vehicle search results | Server cache | TanStack Query `useInfiniteQuery` |
| Vehicle detail | Server cache | `useQuery(['vehicle', id])` |
| Booking mutation | Server | `useMutation` + invalidate `['bookings']` |
| Auth session | HTTP-only cookie | SSR middleware validates |
| Stepper step / modals | Local | `useState` |

**Say:** "Server state in Query — not Redux. Redux only if complex cross-tab client workflows emerge."

### Step 8 — Key flows

**Search flow:**
```
User types location → debounce 300ms → GET autocomplete
User submits search → navigate /search?params → infinite query vehicles
Error → toast + retry; empty → "No vehicles" CTA to change dates
```

**Booking flow (optimistic optional for v2):**
```
POST booking with Idempotency-Key header (prevent double-click)
Loading → disable button
Success → redirect /account/bookings/:id
409 conflict → "Vehicle no longer available" + refresh detail
```

### Step 9 — Performance

- Debounce autocomplete; AbortController on query change
- Virtualize results if > 100 cards (`@tanstack/react-virtual`)
- Lazy load images (`loading="lazy"`, srcset)
- Code-split `/admin` routes
- CDN for static assets; SSR search landing for SEO

### Step 10 — Security

- Auth required for booking — redirect to login with return URL
- CSRF: SameSite cookies + token for mutations if cookie auth
- Never trust client price — server recalculates total on POST
- RBAC: admin routes gated server-side, not just hidden nav links

### Step 11 — v1 vs v2 (explicit scope)

| v1 (6 weeks) | v2 |
|--------------|-----|
| Search + detail + book + my bookings | Map view + marker clustering |
| Cursor pagination | WebSocket live availability on detail page |
| Poll booking status 30s | Push / email notifications |
| Desktop-first responsive | Native app or PWA offline cache |

**Close with:** "I'd ship v1 without WebSocket — poll is enough for rental search — and add WS when product proves users lose bookings due to stale availability."

---

## Prompt 2 — Real-Time Factory Dashboard

### Requirements (from interviewer or assume)

- 20–50 production lines per plant
- Metrics: OEE, throughput, downtime reason
- Alerts: critical < 30s visibility
- Devices: factory floor tablets, flaky WiFi
- Users: ops managers, not executives

### Architecture diagram (draw and narrate)

```
┌─────────────────────────────────────────┐
│  Browser (React SPA or Next.js client)   │
│  ┌─────────┐  ┌──────────────────────┐  │
│  │ REST    │  │ WebSocket client      │  │
│  │ client  │  │ (metrics + alerts)    │  │
│  └────┬────┘  └──────────┬───────────┘  │
└───────┼──────────────────┼──────────────┘
        │                  │
        ▼                  ▼
┌───────────────────────────────────────────┐
│  BFF (Next Route Handler or Node)         │
│  GET /dashboard/snapshot                  │
│  WS  /stream/plant/:id                    │
└───────────────────┬───────────────────────┘
                    ▼
        Metrics service / Alert service
```

### WebSocket message schema

```json
{ "type": "metric_update", "lineId": "L12", "oee": 0.87, "throughput": 145, "ts": 1717000000 }
{ "type": "alert", "id": "a1", "lineId": "L12", "severity": "critical", "message": "Robot fault", "ts": 1717000001 }
{ "type": "heartbeat", "ts": 1717000002 }
```

### Frontend state design

```ts
type LineMetrics = { lineId: string; oee: number; throughput: number; updatedAt: number };
type Alert = { id: string; lineId: string; severity: string; message: string; ts: number };

type DashboardStore = {
  lines: Map<string, LineMetrics>;
  alerts: Alert[]; // max 100, sorted desc by ts
  connectionStatus: 'connected' | 'reconnecting' | 'offline';
  lastSnapshotAt: number | null;
};
```

**Update strategy:** On WS message, patch single line in Map — don't replace entire array (avoids re-rendering all rows).

### Reconnect logic (explain)

> Exponential backoff: 1s, 2s, 4s … max 30s. On reconnect, **REST snapshot first** then resume WS — avoid gap in data. Show banner: "Reconnecting…" with `connectionStatus`.

### Performance on tablets

- Batch WS updates — max 1 React commit/sec via `requestAnimationFrame`
- Virtualize alert log > 500 rows
- Charts: server sends hourly aggregates — don't plot 86,400 raw points
- `React.memo` per line row; selector hook `useLineMetrics(lineId)`

### Failure modes

| Scenario | UX |
|----------|-----|
| WS disconnect | Yellow banner, retry automatically |
| Data stale > 60s | Gray out row, show "Last updated 2m ago" |
| REST snapshot fails | Show cached data + error section |
| Single line bad payload | Row-level error — not full page white screen |

---

## Prompt 3 — Energy Monitoring (Powerwall / Solar)

### Screens
1. **Live power flow** — solar → home → grid → battery (diagram)
2. **Historical** — day/week/month charts
3. **Settings** — backup reserve %, storm watch

### Data rates
- Telemetry: 1–15 sec from devices
- UI throttle: **1 Hz** for gauges — batch WS messages in rAF loop
- History: `GET /power?granularity=hour` — server aggregates

### API
```
GET /api/sites/:id/summary        → current power breakdown
GET /api/sites/:id/power?from&to&granularity=hour
WS  /api/sites/:id/stream         → live watts by source
```

---

## Cross-Cutting Q&A — Detailed

### Q: How do you handle authentication?

**Detailed answer:**

> **Session model:** User logs in → server sets **HTTP-only, Secure, SameSite=Lax** cookie with session ID. No access token in localStorage (XSS risk).
>
> **Next.js:** Middleware on `/account/*` and `/booking/*` validates session; redirect to `/login?returnUrl=`.
>
> **Client components:** Call same-origin `/api/*` — cookie sent automatically.
>
> **Refresh:** Sliding session extension on activity, or refresh token in HTTP-only separate cookie with rotation.
>
> **Frontend RBAC:** Hide admin nav items for non-admin, but **API must enforce** — UI hiding is not security.

---

### Q: Next.js as backend vs NestJS?

**Detailed answer:**

> The line isn't strict anymore. **Next.js** with Route Handlers, Server Actions, middleware, and edge is often the backend for many products — great when one team owns the UI-shaped API (BFF aggregating fleet + bookings).
>
> **NestJS** wins when you need strict module boundaries, microservices, job queues, gRPC, OpenAPI-first APIs shared by web + mobile + partners, and independent deploy/scale.
>
> **Hybrid:** Next.js BFF for UI-specific aggregation + NestJS core domain services is common at scale.
>
> **Choice criterion:** How much backend complexity do you want colocated with your frontend framework vs in a dedicated service layer?

---

### Q: Offset vs cursor pagination?

| | Offset `?page=3` | Cursor `?cursor=eyJ...` |
|---|------------------|-------------------------|
| Jump to page N | Yes | No |
| Consistent under inserts | No | Yes |
| Large dataset perf | Degrades | Stable |
| Use case | Admin tables < 10K | Infinite scroll search |

---

### Q: Polling vs WebSocket?

| | Polling | WebSocket |
|---|---------|-----------|
| Complexity | Low | Higher (reconnect, auth) |
| Latency | Interval-bound (30s) | Sub-second |
| Server load | Repeated full requests | Persistent connection |
| v1 choice | Factory dashboard pilot | When alert SLA < 30s proven |

---

### Q: 10K row table?

1. **Virtualize** — only render ~20 DOM rows
2. **Normalize state** — `Map<id, row>` patch updates
3. **Don't** put all rows in one Context
4. **Server** paginate or filter — don't send 10K to client if user only sees 50

---

### Q: CORS — explain simply

> Browser security: JS on `app.tesla.com` can't read responses from `api.other.com` unless that API sends `Access-Control-Allow-Origin`. Server isn't blocked from receiving request — **browser** blocks JS reading response. Same-origin BFF avoids CORS pain.

---

## Mock 45-Min Script (Car Rental)

**0:00** "I'll design a car rental search and booking frontend. Let me ask a few questions…"
**0:05** "Assuming B2C, 50K vehicles, 30s stale OK, mobile-responsive."
**0:08** Draw 5 routes on board.
**0:15** Draw component tree under SearchResults and BookingFlow.
**0:22** Write 5 API endpoints with request/response shapes.
**0:28** "TanStack Query for server state, URL params for filters, HTTP-only session auth."
**0:35** "v1 polls booking status; v2 WebSocket for live availability on vehicle detail."
**0:40** "Virtualize if >100 results, debounce autocomplete, code-split admin."
**0:45** "v1 ships search+book+account in 6 weeks; map and WS in v2."

---

## Prep Checklist

- [ ] Whiteboard car rental twice — timed 45 min, no notes
- [ ] Factory dashboard + WS reconnect flow once
- [ ] Next vs Nest 60-second answer practiced
- [ ] Draw auth cookie flow in 30 seconds

**Next round:** [08-behavioral-hm.md](./08-behavioral-hm.md)
