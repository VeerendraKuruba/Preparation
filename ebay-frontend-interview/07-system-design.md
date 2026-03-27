# Frontend System Design — eBay Interview Q&A

## How to structure every answer (5 minutes):
1. **Clarify** — who are the users, what scale, what constraints?
2. **Core requirements** — functional (what it does) + non-functional (perf, availability)
3. **High-level design** — components, data flow
4. **Deep dive** — the hard parts (state management, caching, real-time)
5. **Trade-offs** — what you'd do differently at higher scale

---

## Q1: Design eBay's Search Autocomplete

**Clarify:**
- How many DAU? (eBay: ~100M)
- Latency requirement? (< 100ms for suggestions)
- How fresh does the catalog need to be? (1M+ new listings/day)

**Components:**
```
User types → Debounce (200ms) → Cache check → API call → Render suggestions
```

**Frontend design:**
- **Debounce** — 200ms delay before sending request (avoids 1 API call per keystroke)
- **Client-side cache** — `Map<query, suggestions>` in memory; invalidate after 5 minutes
- **Request deduplication** — if same query in-flight, don't send again
- **AbortController** — cancel previous request when new query comes in
- **Keyboard navigation** — ArrowUp/Down/Enter/Escape, `aria-activedescendant`
- **Stale results** — show cached results while fresh data loads (optimistic)

**State shape:**
```js
{
  query: string,
  suggestions: string[],
  activeIndex: number,       // keyboard-highlighted item
  isOpen: boolean,
  status: 'idle' | 'loading' | 'error'
}
```

**Scale consideration:** Trie data structure on the backend for fast prefix lookup. Client gets top 10 results. Recent searches stored in `localStorage` for instant offline suggestions.

---

## Q2: Design eBay's Shopping Cart

**Clarify:**
- Guest vs logged-in users?
- Multi-device sync needed?
- Items from different sellers?

**Data model:**
```js
{
  items: [
    { id, listingId, sellerId, name, price, qty, img, stock, shipsFrom }
  ],
  coupon: null | { code, discount },
  savedForLater: []
}
```

**State strategy:**
- **Guest cart** → `localStorage` (persists across sessions, no auth needed)
- **Logged-in cart** → server-persisted, synced to `localStorage` for offline access
- **Merge on login** — when guest logs in, merge localStorage cart with server cart

**Derived state (never store these):**
```js
const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
const savings = originalTotal - subtotal;
```

**Real-time concerns:**
- **Price changes** — poll `/api/cart/validate` every 30s while cart is open; show warning banner if price changed
- **Out-of-stock** — mark item with warning; disable checkout
- **WebSocket** — for live auction items in cart, subscribe to price updates

**Architecture:**
```
CartContext (global state)
  ├── CartIcon (item count badge)
  ├── CartPage
  │   ├── CartItemList
  │   │   └── CartItem (qty stepper, remove, save for later)
  │   └── OrderSummary (subtotal, shipping, total, checkout button)
  └── MiniCart (dropdown on hover)
```

---

## Q3: Design Real-Time Auction Bidding UI

**Clarify:**
- How many concurrent bidders? (could be thousands for popular items)
- Latency requirement for bid updates? (< 1s is table stakes for auctions)
- Do we need to show bid history?

**Real-time transport:**
- **WebSocket** — best for bidirectional, low-latency. Server pushes every new bid.
- **Server-Sent Events (SSE)** — simpler, one-directional, auto-reconnect. Good if bidding is write-heavy via REST.

```js
// WebSocket approach
useEffect(() => {
  const ws = new WebSocket(`wss://api.ebay.com/auctions/${itemId}`);

  ws.onmessage = (event) => {
    const { currentBid, bidder, timeLeft } = JSON.parse(event.data);
    dispatch({ type: 'NEW_BID', payload: { currentBid, bidder, timeLeft } });
  };

  ws.onclose = () => setTimeout(connect, 3000); // auto-reconnect

  return () => ws.close();
}, [itemId]);
```

**Optimistic UI for bidding:**
```js
async function placeBid(amount) {
  // 1. Optimistically update UI immediately
  dispatch({ type: 'BID_PLACED', payload: { amount, status: 'pending' } });

  try {
    await api.post('/bids', { itemId, amount });
    dispatch({ type: 'BID_CONFIRMED' });
  } catch (err) {
    // Rollback on failure
    dispatch({ type: 'BID_FAILED', payload: err.message });
  }
}
```

**Countdown timer:**
```js
// useRef for interval — doesn't need to be state
const intervalRef = useRef(null);
useEffect(() => {
  intervalRef.current = setInterval(() => {
    setTimeLeft(prev => {
      if (prev <= 1) { clearInterval(intervalRef.current); return 0; }
      return prev - 1;
    });
  }, 1000);
  return () => clearInterval(intervalRef.current);
}, []);
```

**Conflict handling:** If two bids arrive simultaneously, server is the authority. Client shows "You were outbid!" toast and updates to server-confirmed current bid.

---

## Q4: Design a Notification System UI

**Clarify:**
- Types of notifications: bid updates, order status, seller messages, price drops?
- Should they persist? How long?
- Real-time delivery needed?

**Components:**
```
NotificationSystem (context + provider)
  ├── NotificationBell (badge count)
  ├── NotificationDropdown (list of recent)
  └── ToastContainer (ephemeral alerts, aria-live="polite")
```

**Data model:**
```js
{
  id: string,
  type: 'bid_outbid' | 'order_shipped' | 'price_drop' | 'message',
  title: string,
  body: string,
  timestamp: number,
  read: boolean,
  href: string, // where to navigate on click
}
```

**Delivery mechanism:**
- **Polling** (simple): `setInterval(() => fetch('/api/notifications'), 30_000)`
- **SSE** (better): Server pushes updates; client only receives
- **WebSocket** (best for high interactivity): Bidirectional

**Toast (ephemeral):**
```js
// Auto-dismiss with cleanup
function addToast(message) {
  const id = Date.now();
  setToasts(prev => [...prev, { id, message }]);
  setTimeout(() => removeToast(id), 4000);
}
```

**ARIA live region for screen readers:**
```html
<div aria-live="polite" aria-atomic="true" role="status">
  {latestNotification?.message}
</div>
```

---

## Q5: Design a Product Listing Page with Infinite Scroll

**Clarify:**
- How many products in catalog? (eBay: 1.7B+ listings)
- Filter/sort needed? (category, price range, condition, location)
- Mobile-first?

**Data fetching:**
- **Cursor-based pagination** (not page-number) — stable under insertions
  ```
  GET /api/listings?cursor=eyJpZCI6MTAwfQ&limit=20&category=electronics
  ```
- **Response:** `{ items: [...], nextCursor: "...", total: 4200 }`

**Virtualization for large lists:**
- Only render visible items (+ buffer above/below)
- Use `react-window` or implement manually with `translateY` offsets
- Critical for mobile — rendering 500 product cards tanks performance

**Filter state in URL:**
```js
// URL: /search?q=iphone&category=phones&min=100&max=500&sort=price_asc
// Keep filters in URL so users can share/bookmark
const [searchParams, setSearchParams] = useSearchParams();
```

**Skeleton loading** — show placeholder cards while loading (better UX than spinner):
```jsx
{loading
  ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
  : products.map(p => <ProductCard key={p.id} product={p} />)
}
```

---

## Trade-off Table

| Decision | Option A | Option B | When to choose |
|----------|----------|----------|----------------|
| Real-time transport | WebSocket | SSE | WS for bidirectional; SSE for broadcast |
| Pagination | Page number | Cursor | Cursor for stable results under inserts |
| Cart persistence | localStorage | Server | Local for guest; server for auth users |
| Suggestion caching | Client memory | Service Worker | Client for simplicity; SW for offline |
| List rendering | All items | Virtualized | Virtualize > 100 items |
| API requests | Fetch | XHR | XHR for upload progress; fetch for everything else |
