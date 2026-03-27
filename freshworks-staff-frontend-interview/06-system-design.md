# System Design (HLD) — Freshworks Staff Frontend Q&A

---

## Framework for Every Answer
1. **Clarify** — scale, users, constraints, what "done" looks like
2. **Functional requirements** — what it must do
3. **Non-functional** — latency, availability, consistency trade-offs
4. **High-level architecture** — components, data flow diagram
5. **Deep dive** — the hard parts
6. **Trade-offs** — what you'd change at higher scale

---

## Q1: Design a Real-Time Chat System like Freshchat (CONFIRMED)

**Clarify:**
- How many concurrent users? (assume 1M)
- Message history needed? How far back?
- Read receipts, typing indicators?

**Architecture:**

```
Client (React) ─── WebSocket ──→ Chat Service ──→ Message DB (Cassandra)
                                       │
                                 Message Queue (Kafka)
                                       │
                              Notification Service ──→ Push (Firebase)
                                       │
                              Presence Service (Redis)
```

**WebSocket vs SSE vs Polling:**
- **WebSocket** — bidirectional, best for chat (both parties send/receive)
- **SSE** — one-directional, good for dashboards where client only reads
- **Polling** — simplest, worst for real-time (adds latency = polling interval)

**Frontend design:**
```js
class ChatClient {
  constructor(userId, roomId) {
    this.userId = userId;
    this.roomId = roomId;
    this.ws = null;
    this.reconnectDelay = 1000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(`wss://chat.freshworks.com/rooms/${this.roomId}`);

    this.ws.onmessage = (e) => {
      const message = JSON.parse(e.data);
      this.onMessage(message); // update React state
    };

    this.ws.onclose = () => {
      // Exponential backoff reconnect
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
    };

    this.ws.onopen = () => { this.reconnectDelay = 1000; }; // reset on success
  }

  send(text) {
    const message = { type: 'message', text, userId: this.userId, timestamp: Date.now() };
    this.ws.send(JSON.stringify(message));
  }
}
```

**Message ordering:** Client timestamps + server sequence numbers. Client shows optimistic message immediately, server confirms with `messageId`. On conflict, server sequence is authoritative.

**Pagination:** Load last 50 messages on open. Cursor-based pagination (`before: lastMessageId`) for history. Virtualize long message lists.

**Presence (typing indicators):**
- Client sends `{type: 'typing'}` event every 2s while typing
- Server uses Redis with 3s TTL per user-per-room
- If key expires → user stopped typing

---

## Q2: Design a Social Media Feed / Freshdesk Ticket Feed (CONFIRMED)

**Clarify:**
- How many tickets/items? (eBay has 1.7B listings; Freshdesk has millions of tickets per tenant)
- Real-time updates needed?
- Filtering, sorting, search?

**Data flow:**
```
Feed API → CDN Cache → React Feed Component → Virtualized List
               ↑
         Redis Cache (hot tickets)
               ↑
          PostgreSQL (ticket data)
```

**Frontend architecture:**
```jsx
function TicketFeed() {
  const [tickets, setTickets] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  async function loadMore() {
    const { data, nextCursor } = await api.get('/tickets', { cursor, limit: 20 });
    setTickets(prev => [...prev, ...data]);
    setCursor(nextCursor);
    if (!nextCursor) setHasMore(false);
  }

  return (
    <VirtualizedList
      items={tickets}
      hasMore={hasMore}
      onLoadMore={loadMore}
      renderItem={(ticket) => <TicketCard ticket={ticket} />}
    />
  );
}
```

**Cursor-based pagination** (not page numbers) — stable under new inserts, prevents seeing duplicates/skips.

**Real-time updates:**
```js
// SSE for ticket updates (one-directional push is enough)
const source = new EventSource('/api/tickets/stream');
source.onmessage = (e) => {
  const { type, ticket } = JSON.parse(e.data);
  if (type === 'created') prependTicket(ticket);
  if (type === 'updated') updateTicket(ticket);
  if (type === 'resolved') markResolved(ticket.id);
};
```

---

## Q3: Design a Notification System (CONFIRMED)

**Clarify:**
- Types: in-app badge + dropdown, push (mobile), email?
- Delivery guarantee: at-most-once vs at-least-once?
- How many users per company? (Freshworks is multi-tenant SaaS)

**Architecture:**
```
Event Source (ticket created, SLA breached)
     │
  Kafka Topic: "notification-events"
     │
Notification Service
  ├── Fan-out: determine recipients
  ├── Preference check: user notification settings
  └── Dispatch:
       ├── In-app: WebSocket / SSE push
       ├── Push: Firebase Cloud Messaging
       └── Email: SendGrid
```

**Frontend:**
```jsx
const NotificationContext = createContext();

function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const source = new EventSource('/api/notifications/stream');
    source.onmessage = (e) => {
      const notification = JSON.parse(e.data);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(c => c + 1);
    };
    return () => source.close();
  }, []);

  function markRead(id) {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(c => Math.max(0, c - 1));
    api.patch(`/notifications/${id}`, { read: true });
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead }}>
      {children}
    </NotificationContext.Provider>
  );
}
```

**Scale challenge — fan-out for large groups:**
- If a ticket is assigned to a group of 1000 agents, naive fan-out = 1000 write operations
- Solution: Store notification once, use "last seen" cursor per user instead of per-user copies

---

## Q4: Design a URL Shortener (CONFIRMED)

**Clarify:**
- Read:write ratio? (typically 100:1 — reads are dominant)
- Custom slugs? Expiry? Analytics?

**Key design decisions:**
- **Encoding:** Base62 (`[a-zA-Z0-9]`) of auto-increment ID or hash. 7 chars = 62^7 = 3.5T URLs.
- **Collision handling:** If hashing, check DB for collision; if ID-based, no collisions.
- **Storage:** Redis for hot short URLs (< 5ms lookups); PostgreSQL for persistent storage.

```
POST /shorten { url: "https://..." }
  → generate shortCode
  → store in Redis (TTL 24h) + Postgres
  → return { shortUrl: "https://fresh.ly/abc1234" }

GET /abc1234
  → Redis lookup → 301/302 redirect to long URL
  → Log click event to analytics queue (async)
```

**301 vs 302 redirect:**
- 301 (Permanent) — browser caches, no future requests to our server. Can't track clicks after first.
- 302 (Temporary) — browser always asks our server. Enables click tracking. ✓

---

## Q5: API Optimization Design (Confirmed — Tech Lead round Jan 2024)

Asked as: "How would you design/optimize an API-heavy frontend for performance and reliability?"

**Caching layers:**
```
Browser (Cache-Control headers)
  ↓
Service Worker (offline-first, stale-while-revalidate)
  ↓
CDN (Cloudflare/Fastly — global edge caching)
  ↓
API Gateway (rate limiting, auth)
  ↓
App Server Cache (Redis — hot data)
  ↓
Database
```

**Request optimization:**
- **Debounce** user-triggered requests (search, filter)
- **Batch requests** — combine multiple API calls into one (GraphQL, or custom batch endpoint)
- **Optimistic updates** — update UI before server confirms (rollback on failure)
- **Prefetch** data the user is likely to need next (next page, related tickets)

**Reliability:**
- **Retry with exponential backoff** — failed requests retry with 1s, 2s, 4s delays
- **Circuit breaker** — stop sending requests to a failing service after N failures; recover after cooldown
- **Fallback** — show cached/stale data when API is down

**Rate limiting on the client:**
```js
// Queue requests and respect API rate limits
class RequestQueue {
  constructor(rateLimit = 10, windowMs = 1000) {
    this.queue = [];
    this.rateLimit = rateLimit;
    this.windowMs = windowMs;
    this.inFlight = 0;
    setInterval(() => this._flush(), windowMs);
  }

  add(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
    });
  }

  _flush() {
    const batch = this.queue.splice(0, this.rateLimit);
    batch.forEach(({ requestFn, resolve, reject }) => {
      requestFn().then(resolve).catch(reject);
    });
  }
}
```
