# Round 3 — Frontend System Design at Scale (+ Algorithm)

| | |
|---|---|
| **Format** | Whiteboard / Miro, 1–2 senior+ interviewers |
| **Duration** | 45–60 min |
| **Eliminates?** | Yes |
| **Focus** | **Complex UI surfaces** — component architecture, state, perf, concurrent UX — plus one algorithm; backend depth optional |

> **Role note:** Use reported prompts (movie ticketing, room booking) as **frontend design exercises** — seat map UI, calendar grid, booking flow — not database schema deep dives unless prompted.

---

## Interview Flow (Frontend-First)

```
0:00–0:05   Clarify users, devices, UX constraints
0:05–0:25   Component tree + routes + state + API consumption
0:25–0:40   Perf, a11y, loading/error, optimistic UI, conflict handling
0:40–0:50   Algorithm (graph, sliding window) OR frontend complexity (virtualization)
0:50–0:60   Your questions
```

---

## Design Problem 1 — Movie Ticketing UI (Reported — Montreal)

### Frontend requirements (lead with these)

**Pages / components:**
```
/movies          → MovieGrid (filters: city, date, genre)
/movies/:id      → ShowtimeList
/shows/:id/seats → SeatPicker (grid, legend, timer, summary)
/checkout        → PaymentForm + OrderSummary
/confirmation    → QR ticket + add to wallet
```

**UX states every Principal should mention:**
- Seat map loading skeleton
- Seat transitions: available → selected → held → sold (color + aria-label)
- **409 conflict:** "Seat taken" — refresh map, preserve other selections
- Hold timer countdown — extend or release
- Mobile: horizontal scroll seat grid OR list fallback

### Concurrency — **UI behavior**, not just DB

> "Two users select A12 — second user gets optimistic hold failure → toast + seat animates to sold. Idempotent checkout button (disable after click). React Query invalidates seat map on WebSocket `seat.updated` event."

**API shapes the UI needs:**
```
GET  /shows/:id/seats     → { seats: [{ id, row, col, status }] }
POST /shows/:id/holds     → { holdId, expiresAt, seatIds[] }
POST /bookings            → { holdId }
```

### Infra (brief, if asked)

React on CloudFront; BFF for payment token; Postgres/Redis for holds — **one sentence each**.

### Algorithm Twist — Find best available N adjacent seats

```js
function findBestBlock(seats, n) {
  // seats: row of { id, status } left to right
  let best = null;
  let run = 0, start = 0;

  for (let i = 0; i < seats.length; i++) {
    if (seats[i].status === 'available') {
      if (run === 0) start = i;
      run++;
      if (run >= n) {
        const block = { start, end: i, centerDist: Math.abs((start + i) / 2 - seats.length / 2) };
        if (!best || block.centerDist < best.centerDist) best = block;
      }
    } else {
      run = 0;
    }
  }
  return best;
}
// O(seats) sliding window
```

---

## Design Problem 2 — Meeting Room Booking with Concurrent Conflicts (Reported — Dataford)

### Requirements
- Rooms with capacity, floor, equipment
- Users book time ranges
- Prevent double booking
- Search available rooms for time slot

### Data Model

```sql
rooms (id, name, capacity, floor, equipment_json)
bookings (id, room_id, user_id, start_ts, end_ts, status)
-- Constraint: no overlap per room
CREATE UNIQUE INDEX ... -- use exclusion constraint in Postgres:

ALTER TABLE bookings ADD EXCLUDE USING gist (
  room_id WITH =,
  tstzrange(start_ts, end_ts) WITH &&
) WHERE (status = 'confirmed');
```

**Why exclusion constraint?**
> "Database-enforced correctness beats application-level check-then-act race. Two transactions can't insert overlapping ranges."

### API

```
GET  /v1/rooms/available?start=&end=&minCapacity=
POST /v1/bookings  { roomId, start, end }  → 201 or 409
DELETE /v1/bookings/:id
```

### Scale
- Mostly OLTP, moderate QPS
- Index on `(room_id, start_ts, end_ts)`
- Calendar sync via webhook to Google/Outlook (async)

---

## Design Problem 3 — Secure Login & Token System (Reported — Dataford)

### Requirements
- Email/password + SSO (OAuth)
- Session management across React SPA and Node API
- Token refresh without exposing secrets

### Architecture

```
React ──► Node BFF ──► Identity provider (Autodesk SSO / Auth0 / Cognito)
              │
              ├── httpOnly cookie: session_id (opaque)
              └── Redis: session_id → { userId, refreshToken, exp }

Access token: short-lived JWT (15 min), in memory only (not localStorage)
Refresh: BFF rotates refresh token on use (detect reuse → revoke all sessions)
```

### Security checklist (verbal):
- bcrypt/argon2 for passwords (if local auth)
- PKCE for OAuth SPAs
- CSRF: SameSite cookies + CSRF token for mutating requests
- Rate limit login endpoint
- Audit log failed attempts

**Q: Token in JSON body vs cookie?**
> "Never access token in localStorage — XSS steals it. httpOnly Secure SameSite cookie for session; short JWT in memory if needed for WS auth handshake via one-time exchange."

---

## Design Problem 4 — E-Commerce Order System (Reported)

### Core entities
```
users, products, inventory, carts, orders, order_items, payments, shipments
```

### Order state machine
```
CREATED → PAYMENT_PENDING → PAID → FULFILLING → SHIPPED → DELIVERED
                ↓
            CANCELLED / PAYMENT_FAILED
```

### Inventory — avoid overselling
```sql
UPDATE inventory SET quantity = quantity - $1
WHERE product_id = $2 AND quantity >= $1;
-- 0 rows → out of stock
```

**Saga pattern for distributed checkout:**
1. Reserve inventory
2. Charge payment
3. Confirm order — compensate on failure (release inventory, refund)

---

## Scalability Deep-Dive Q&A

### Q1: SQL vs NoSQL for this system?

**Answer framework:**
| Choose SQL when | Choose NoSQL when |
|-----------------|-------------------|
| ACID transactions, joins, constraints | Massive write scale, flexible schema |
| Booking, orders, permissions | Activity feeds at billions (with trade-offs) |
| You need exclusion constraints | Document blob metadata sharded by user |

> "Autodesk project metadata fits SQL; high-volume telemetry might go to time-series or column store."

---

### Q2: How do you design for 10x traffic with 6 months notice?

**Answer:**
1. **Measure:** Identify p95/p99 bottlenecks (APM, load test)
2. **Stateless scale:** Horizontal pod autoscaling on ECS/K8s
3. **Cache:** CDN + Redis for hot reads
4. **Async:** Move non-critical path to queues
5. **DB:** Read replicas, connection pooling, query indexes
6. **Degrade gracefully:** Feature flags to disable non-essential features under load

---

### Q3: CAP theorem — practical meaning?

**Answer:**
> "During a network partition, choose Consistency (CP — reject writes) or Availability (AP — stale reads). Most web apps use AP at the edge (CDN) and CP at payment/booking core. Postgres primary is CP; Redis cache is AP with TTL."

---

### Q4: Idempotency in distributed systems?

**Answer:**
> "Same request twice → same outcome, no duplicate side effects. Use `Idempotency-Key` stored in DB with unique constraint. Critical for payments, booking holds, webhooks."

---

## Algorithm Component (Often Bundled in Round 3)

### Q: Shortest path in a dependency graph (reported graph question)

**Problem:** Tasks with prerequisites — minimum steps or detect impossible.

**Answer:** Topological sort (Kahn's) or DFS for cycle detection — same as Course Schedule.

```js
function minOrder(tasks, deps) {
  // deps: [task, prerequisite]
  const graph = new Map();
  const indeg = new Map(tasks.map(t => [t, 0]));

  for (const [t, p] of deps) {
    if (!graph.has(p)) graph.set(p, []);
    graph.get(p).push(t);
    indeg.set(t, (indeg.get(t) || 0) + 1);
  }

  const q = [...indeg.entries()].filter(([, d]) => d === 0).map(([t]) => t);
  const order = [];

  while (q.length) {
    const t = q.shift();
    order.push(t);
    for (const next of graph.get(t) || []) {
      if (--indeg.get(next) === 0) q.push(next);
    }
  }
  return order.length === tasks.length ? order : null; // null = cycle
}
```

---

## Principal-Level Closing (Frontend)

> "I'd ship SeatPicker as a reusable package in the design system — Storybook states for every seat status, perf budget for paint on 500-seat grid, and e2e tests for hold expiry. Backend hold logic is a contract the UI depends on, not what I'd whiteboard first in this role."

---

## Questions to Ask

1. "What's the current scale profile for your team's flagship service?"
2. "How do you handle multi-region — active-active or DR failover?"
3. "What architecture decisions are you revisiting in the next year?"
