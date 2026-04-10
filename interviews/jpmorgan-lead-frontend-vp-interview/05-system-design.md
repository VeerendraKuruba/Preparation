# Round 5: System Design (Super Day — Round 2)

**Duration:** 45–60 minutes  
**Interviewer:** Senior Engineer or VP  
**Format:** Whiteboard-style design discussion  
**Eliminates:** Yes — VP-level must show architectural ownership

---

## How to Structure Any System Design Answer

Use this framework in the first 5 minutes:

1. **Clarify requirements** — functional vs non-functional
2. **Estimate scale** — users, requests/sec, data volume
3. **Define APIs** — what endpoints/events exist
4. **High-level design** — major components and data flow
5. **Deep dive** — scale bottlenecks, storage choice, real-time, caching
6. **Trade-offs** — what you gave up and why
7. **Security & compliance** — at JPMC, this is mandatory for VP

---

## Finance Context — Always Layer These Concerns

At JP Morgan, every design must address:
- **Security** — auth, encryption at rest and in transit, zero-trust
- **Compliance & auditability** — every state change logged, regulators can audit
- **Reliability** — 99.99%+ uptime for financial transactions
- **Idempotency** — payments processed exactly once, even under failure
- **Data governance** — who can see what, PII handling, GDPR/CCPA

---

## Design Problem 1: Real-Time Trading Dashboard

**Prompt:** "Design a real-time trading dashboard showing live stock prices, portfolio value, and trade execution status for institutional traders."

### Requirements Clarification
- Functional: live prices (sub-second latency), portfolio P&L, order status
- Non-functional: 10,000 concurrent traders, price updates every 100ms, 99.99% uptime
- Security: authenticated users only, role-based views (trader vs analyst)

### Architecture

```
Market Data Feed (NYSE/NASDAQ) 
    → Market Data Service (Kafka topic: price-updates)
    → Price Normalizer
    → WebSocket Gateway ←→ Client (React Dashboard)
    → Redis (latest price cache)
    → TimescaleDB (historical prices)

Trade Orders:
Client → Trade API (REST) → Order Management System
    → Kafka (topic: order-events) → Portfolio Service
    → Audit Log (append-only, immutable)
```

### Key Design Decisions

**WebSockets for real-time prices:**
- REST polling at 100ms would be 600 req/min per user × 10,000 = 6M req/min — not feasible
- WebSocket maintains persistent connection; server pushes updates
- Use socket.io with rooms per instrument: `socket.join('AAPL')`

**Redis for latest price:**
- Hash map: `price:AAPL → { last: 182.50, bid: 182.49, ask: 182.51, ts: ... }`
- Sub-millisecond read latency
- Pub/Sub for broadcasting to WebSocket gateway

**TimescaleDB for historical:**
- Time-series optimized; compresses market data well
- Hypertables partition by time automatically

**Idempotency for trades:**
- Client sends `idempotencyKey` (UUID) with each order
- Order service stores key in Redis with TTL; deduplicates retries

**Security:**
- mTLS between services
- JWT with short expiry (15 min) + refresh token rotation
- RBAC: traders can execute orders; analysts read-only
- All order events signed and written to immutable audit log (WORM storage)

### Frontend Design (Lead-specific)
- Use `react-virtualized` or `@tanstack/virtual` for rendering thousands of instrument rows
- Web Workers to process price feed data off the main thread (no UI jank)
- `useMemo` to memoize derived portfolio calculations
- Adaptive throttling: if tab is backgrounded, reduce update frequency

---

## Design Problem 2: Component Library / Design System for 3,000 Engineers

**Prompt:** "Design a frontend design system that will be used by 3,000 engineers across 50 product teams."

*(This mirrors what JPMC actually built with Manhattan Design System + Salt DS)*

### Requirements Clarification
- 3,000 engineers, 50 teams, multiple frameworks (mostly React, some Angular)
- Must be accessible (WCAG 2.1 AA minimum)
- Design token consistency across all surfaces
- Teams need to customize without breaking the system
- Versioning strategy needed

### Architecture

```
Design Tokens (JSON/CSS vars)
    → Token Pipeline (Style Dictionary) → CSS vars, JS objects, Figma tokens
    
Component Library (Salt DS pattern):
    ├── Core: primitives (Button, Input, Select, Modal)
    ├── Patterns: composition (DataTable, FilterPanel, FormLayout)  
    ├── Charts: financial data visualization (Recharts/D3-based)
    └── Icons: SVG sprite + React icon components

Distribution:
    NPM registry (internal) → team package.json
    Storybook (documentation + visual tests)
    Figma plugin (design-dev token sync)

Versioning: Semantic versioning + deprecation policy (3 minor versions notice)
```

### Key Design Decisions

**Design Tokens as source of truth:**
```json
{
  "color": {
    "action": {
      "primary": { "value": "#0B6623", "type": "color" },
      "hover": { "value": "#084D1A", "type": "color" }
    }
  },
  "spacing": {
    "base": { "value": "8px", "type": "spacing" }
  }
}
```
Tokens compile to CSS custom properties → theming is just swapping token values.

**Multi-framework support:**
- Headless/unstyled primitives (accessibility logic only, no styles) — teams apply tokens
- React is primary; Web Components wrapper for non-React teams

**Accessibility (mandatory at JPMC):**
- All components tested against WCAG 2.1 AA
- Automated: axe-core in Jest + Storybook; manual keyboard and screen reader testing

**Governance model:**
- Inner-source model: any team can contribute via PR
- Design system team owns approval + release cycle
- "Consumer Advisory Board" — rotating reps from product teams

**Release strategy:**
- Semantic versioning + CHANGELOG per package
- Deprecation warnings shipped 2 minor versions before removal
- Codemod tooling for major migrations (automated upgrading)

---

## Design Problem 3: Global Payment Processing System

**Prompt:** "Design a system to process 1 million payment transactions per day across 50 countries."

### Architecture

```
Client → API Gateway → Payment Service
    → Fraud Detection Service (sync, <200ms SLA)
    → Payment Processor (Stripe/SWIFT/ACH adapter)
    → Kafka (payment-events topic)
    → Ledger Service (double-entry bookkeeping)
    → Notification Service → Email/SMS/Push
    → Audit Log (immutable, append-only)
```

### Key Decisions

**Idempotency:**
- Client sends idempotency key; stored in Redis for 24 hours
- If same key seen, return cached response — no double-charge

**Multi-currency:**
- Store all amounts in smallest unit (cents), never floats
- Currency conversion service fetches ECB rates at start of day
- Amount + currency code stored together always

**Fraud detection:**
- Synchronous, in-path check (<200ms SLA using ML scoring)
- Rule engine for known patterns (velocity checks, geo anomalies)
- High-risk transactions → manual review queue

**ACID compliance:**
- Payments use Saga pattern: each step can compensate (rollback)
- Ledger entries are immutable — corrections via reversal entries

**Audit trail:**
- Every state change (initiated → processing → settled → failed) logged
- WORM (Write Once Read Many) storage for regulatory retention (7 years)

---

## Design Problem 4: Role-Based Access Control (RBAC) System

**Prompt:** "Design an RBAC system for a financial portal with 100,000 users and 500 distinct permissions."

### Data Model

```
User → UserRole (many-to-many) → Role
Role → RolePermission (many-to-many) → Permission
Permission → Resource + Action (e.g., "trade:execute", "report:view")
```

### Architecture

```
Auth Service (issues JWT with roles embedded)
    → Permission Cache (Redis, TTL 5min)
    → Policy Engine (evaluates RBAC + ABAC rules)
    → Audit Log (who accessed what, when)
```

### JWT Structure

```json
{
  "sub": "user123",
  "roles": ["trader", "portfolio-viewer"],
  "permissions": ["trade:execute", "portfolio:read"],
  "exp": 1714000000,
  "iat": 1713996400
}
```

**Caching:** Permissions cached in Redis per user. On role change, cache invalidated immediately. JWT has short TTL (15 min) so stale permissions auto-expire.

**Frontend enforcement:**
- Route guards check permissions before rendering
- UI elements conditionally rendered based on permission checks
- NEVER rely solely on frontend enforcement — backend validates every request

---

## Preparation Checklist

- [ ] Practice the 7-step framework for every problem
- [ ] Know WebSockets vs SSE vs long polling trade-offs
- [ ] Understand Kafka pub/sub for event-driven systems
- [ ] Know Redis use cases: cache, pub/sub, rate limiting
- [ ] Know SQL vs NoSQL trade-offs with financial data examples
- [ ] Understand idempotency in payment systems
- [ ] Understand design system architecture (tokens → components → distribution)
- [ ] Always mention: security, compliance, audit trails, RBAC in every design
