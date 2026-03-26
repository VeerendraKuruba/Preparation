# Top Frontend System Design Questions — Master Reference

> Quick-reference for the most commonly asked FE system design questions in FAANG and top-tier interviews. Questions already covered in dedicated files are **summarised + linked**. New questions are answered in full here.

---

## Master Question List

### Tier 1 — Asked in almost every company (covered in depth)

| # | Question | Key themes | Deep file |
|---|---|---|---|
| 1 | Infinite scroll / social feed | Virtualization, cursor pagination, optimistic UI | [Q1](./q01-infinite-feed-social-timeline.md) |
| 2 | Autocomplete / search | Debounce, abort, cache, combobox a11y | [Q2](./q02-search-typeahead-autocomplete.md) |
| 3 | Chat / messaging (DMs) | WebSocket, message ordering, dedup, optimistic send | [Q3](./q03-web-chat-dms.md) |
| 4 | Video player / watch page | ABR, prefetch, manifest, decoder isolation | [Q4](./q04-video-watch-player.md) |
| 5 | Maps with markers & clustering | Tile pyramid, viewport scheduling, worker clustering | [Q5](./q05-maps-markers-clustering.md) |
| 6 | E-commerce (PLP / PDP / cart) | URL as state, SEO, filters, cart reconciliation | [Q6](./q06-ecommerce-plp-pdp-cart.md) |
| 7 | B2B dashboard with RBAC | Permission-aware UI, virtual tables, MFE | [Q7](./q07-b2b-dashboard-rbac.md) |
| 8 | Collaborative editor (Google Docs-lite) | OT/CRDT, WS session, reconnect snapshot | [Q8](./q08-collaborative-editor-docs-lite.md) |
| 9 | Real-time metrics dashboard | SSE/WS, snapshot + deltas, chart downsampling | [Q11](./q11-real-time-dashboard.md) |
| 10 | Offline-first app | SW, IndexedDB, outbox, idempotency, conflict | [Q12](./q12-offline-first-app.md) |

### Tier 2 — Frequently asked at product companies (answered below)

| # | Question | Key themes |
|---|---|---|
| 11 | [Kanban Board (Trello/Jira)](#11-kanban-board) | Drag-and-drop, optimistic updates, WS sync |
| 12 | [File Manager / Cloud Storage (Google Drive)](#12-file-manager--cloud-storage) | Tree navigation, chunked upload, download stream |
| 13 | [Calendar / Scheduling UI (Google Calendar)](#13-calendar--scheduling-ui) | Multi-view rendering, conflict detection, recurrence |
| 14 | [Photo Grid / Masonry Layout (Pinterest)](#14-photo-grid--masonry-layout) | Dynamic heights, virtual masonry, CDN images |
| 15 | [Booking / Reservation Flow (Airbnb)](#15-booking--reservation-flow) | Availability grid, date picker, payment handoff |
| 16 | [Payments / Checkout Flow (Stripe)](#16-payments--checkout-flow) | PCI scope isolation, idempotency, 3DS redirect |
| 17 | [Online Code Editor / IDE (CodeSandbox)](#17-online-code-editor--ide) | Monaco, web workers, iframe sandbox, HMR |
| 18 | [Video Conferencing UI (Zoom/Google Meet)](#18-video-conferencing-ui) | WebRTC, media streams, layout modes, reconnect |
| 19 | [Notification Centre (inbox-style)](#19-notification-centre) | WS push, read/unread state, badge count, grouping |
| 20 | [Multi-step Onboarding / Wizard Flow](#20-multi-step-onboarding--wizard-flow) | State machine, progress persistence, skip logic |

### Tier 3 — Appear at specific companies (covered in other files)

| # | Question | File |
|---|---|---|
| 21 | Dynamic role-based dashboard (Freshworks) | [freshworks-dynamic-role-based-dashboard.md](./freshworks-dynamic-role-based-dashboard.md) |
| 22 | Survey / form builder (Google Forms) | [survey-form-system-design.md](./survey-form-system-design.md) |
| 23 | Design system / component library | [Q9](./q09-design-system-frontend-platform.md) |
| 24 | Global homepage at scale | [Q10](./q10-global-shell-homepage.md) |
| 25 | Instagram-style mobile UI | [instagram-frontend-design.md](./instagram-frontend-design.md) |

---

---

## 11. Kanban Board

> **Asked at:** Atlassian, Linear, Monday.com, Notion, any productivity-tool company

**Mental model:** A drag-and-drop board with columns and cards — local state drives the UI instantly (optimistic), WebSocket syncs other users' changes, server is the source of truth for order.

### Clarify scope
- Number of boards, columns, cards? *(assume: 20 cols, 500 cards per board)*
- Real-time multi-user? *(yes — two users on same board see each other's moves)*
- Sub-tasks, attachments, card detail view?
- Swimlanes (rows grouping cards by assignee/priority)?

### Architecture

```
Board Component
  ├── Column List (DnD context)
  │     └── Card List (sortable within column)
  │           └── Card (draggable)
  ├── Optimistic State Manager  ← local reorder on dragEnd
  ├── WebSocket Client          ← receive other users' moves
  └── Card Detail Modal         ← lazy-loaded overlay

Server:
  PATCH /cards/:id { columnId, position }  ← REST for card moves
  WS channel: board:{boardId}              ← broadcast moves to other members
```

### Core mechanics

**1. Drag-and-drop**
Use `@dnd-kit/core` (accessible, touch-friendly).
```js
function onDragEnd({ active, over }) {
  // 1. Optimistically reorder local state immediately
  dispatch(moveCard({ cardId: active.id, toColumnId: over.id, toIndex }));
  // 2. Persist to server in background
  api.moveCard(active.id, { columnId: over.id, position: toIndex })
    .catch(() => dispatch(revertMove(snapshot))); // rollback on failure
}
```

**2. Card ordering — fractional indexing**
Don't store integer positions (1, 2, 3...) — every move requires updating all cards below.
Use fractional strings: `"a0"`, `"a5"`, `"b0"` — insert `"a2"` between `"a0"` and `"a5"` without touching other cards.
Rebalance when precision is exhausted (rare).

**3. Real-time multi-user sync**
```
User A drags card → optimistic local update → PATCH /cards/:id
Server broadcasts: { type: "card.moved", cardId, columnId, position, movedBy }
User B's WS receives event → update their board state
Conflict: both users move same card simultaneously → last-write-wins (server order wins)
```

**4. Virtual rendering for large boards**
500 cards — virtualize each column's card list with `react-window`.
Don't virtualize columns (rarely > 20); only virtualize cards within a column.

### Trade-offs
| Decision | Trade-off |
|---|---|
| Fractional indexing | Avoids bulk updates but requires rebalance logic |
| Optimistic drag | Instant UI but requires rollback on server error |
| WS for real-time | Live collaboration but adds reconnect/dedup complexity |
| Lazy load card detail | Fast board load but slight delay opening cards |

### Closing
> "A Kanban board is optimistic-first drag-and-drop: fractional position indexing for O(1) card moves, immediate local reorder with server reconciliation, and WebSocket broadcast for multi-user sync — with last-write-wins conflict resolution on simultaneous moves."

---

## 12. File Manager / Cloud Storage

> **Asked at:** Google (Drive), Dropbox, Box, Microsoft (OneDrive), Notion

**Mental model:** A tree-navigable file system with chunked upload, streaming download, and preview — client never holds the file binary after upload; it stores metadata only.

### Clarify scope
- Max file size? *(assume: 5GB)*
- Folder nesting depth?
- Sharing / permissions per file?
- Real-time collaborative editing? *(out of scope v1 — see Q8)*
- Preview for common types (PDF, image, video)?
- Offline access (starred files)?

### Architecture

```
Browser
  ├── File Tree (left panel)    ← lazy-load children on folder expand
  ├── File Grid / List (main)   ← virtualized, sortable
  ├── Upload Manager            ← chunked upload, queue, progress
  ├── Preview Overlay           ← lazy-loaded viewers per type
  └── Breadcrumb Nav            ← mirrors URL (/drive/folder/subfolder)

APIs:
  GET  /folders/:id/children    ← paginated, cursor-based
  POST /uploads/initiate        ← returns uploadId + presigned chunk URLs
  PUT  /uploads/:id/chunk/:n    ← direct-to-S3 chunk upload
  POST /uploads/:id/complete    ← assemble chunks server-side
  GET  /files/:id/download-url  ← short-lived presigned download URL
```

### Core mechanics

**1. Chunked upload (resumable)**
```
File selected → split into 5MB chunks
POST /uploads/initiate → { uploadId, chunkUrls: [url1, url2, ...] }

Upload chunks in parallel (4 concurrent):
  PUT chunkUrl[0] ← chunk 0 bytes
  PUT chunkUrl[1] ← chunk 1 bytes
  ...

Each successful chunk → persist to IndexedDB: { uploadId, completedChunks: [0,1] }
On network drop → resume from last completed chunk (no re-upload)

POST /uploads/:id/complete → server assembles, virus scans, creates file record
```

**2. Folder tree — lazy loading**
Don't fetch entire tree on load (could be thousands of folders).
```js
// Expand folder on click
async function expandFolder(folderId) {
  if (treeState[folderId]?.loaded) return; // already fetched
  const children = await api.getFolderChildren(folderId);
  dispatch(setFolderChildren({ folderId, children }));
}
```

**3. File list — virtualization**
Folder may contain 10,000 files. Use `react-virtual` with fixed-height rows in list view; variable-height in grid view requires measured-row virtualizer.

**4. Download — presigned URL, not proxied**
```js
async function downloadFile(fileId) {
  // Server generates short-lived URL (15min TTL), no auth token in URL params
  const { url } = await api.getDownloadUrl(fileId);
  // Programmatic download — doesn't navigate away
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
}
```

**5. Preview types**
| File type | How |
|---|---|
| Image | `<img src={presignedUrl}>` with lazy-load |
| PDF | `<iframe>` or PDF.js (for custom controls) |
| Video | `<video>` with range-request streaming |
| Office docs | Convert to PDF server-side, then PDF viewer |
| Code files | Lazy-load syntax highlighter (Prism/Shiki) |

### Trade-offs
| Decision | Trade-off |
|---|---|
| Chunked upload | Resumable + parallel, but requires chunk assembly on server |
| Presigned URLs for download | Scalable, no server proxy, but URL can be shared for TTL duration |
| Lazy-load folder tree | Fast initial load, but flickering on expand |
| Client-side virus check | Fast feedback, but not reliable — server-side scan is required |

### Closing
> "A file manager is a tree-navigated metadata browser with chunked resumable upload direct-to-object-storage, lazy-loaded folder children, virtualized file lists, and short-lived presigned URLs for download — the server only handles metadata and never proxies file bytes."

---

## 13. Calendar / Scheduling UI

> **Asked at:** Google, Microsoft, Calendly, Notion, any productivity company

**Mental model:** A multi-view (month/week/day) time-grid renderer with event layout algorithms, recurring event expansion, and conflict detection — all computed client-side from a flat event list.

### Clarify scope
- Views needed: month, week, day, agenda?
- Recurring events? *(e.g. every Tuesday)*
- Multiple calendars (Google-style colour overlay)?
- Drag-to-create, drag-to-reschedule?
- Timezone support? *(critical — store UTC, display in user tz)*
- Real-time: see others' calendar updates live?

### Architecture

```
Calendar Shell
  ├── View Router         ← month | week | day | agenda
  │     ├── MonthGrid     ← 6×7 cell grid
  │     ├── WeekColumn    ← 7 time-columns, 15min slot rows
  │     └── DayColumn     ← single column, 15min slots
  ├── Event Layout Engine ← collision detection, column splitting
  ├── Recurrence Expander ← RRule → concrete event instances
  ├── Drag Manager        ← reschedule on drag-drop
  └── Event Detail Modal  ← lazy loaded

State:
  events: [{ id, title, start, end, rrule?, calendarId }]  ← flat list
  viewDate: Date          ← what period is visible
  timezone: "Asia/Kolkata"
```

### Core mechanics

**1. Timezone handling (most common mistake)**
```js
// ALWAYS store events in UTC
// Convert to user timezone ONLY for display

const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

function toDisplay(utcDateStr) {
  return new Date(utcDateStr).toLocaleString("en-US", { timeZone: userTz });
}

// DST edge case: event at 2:30am on DST change day
// Use date-fns-tz or Temporal API — never raw Date math across timezone
```

**2. Event layout — collision detection (week/day view)**
Multiple events in the same time slot must be placed side-by-side.
```
Algorithm:
1. Sort events by start time
2. Group overlapping events into "clusters"
   (event B overlaps A if B.start < A.end)
3. Assign column index within cluster
4. Width = 1/clusterSize, left = columnIndex/clusterSize

Result: 3 simultaneous events each get 33% width, positioned at 0%, 33%, 66%
```

**3. Recurrence expansion**
Don't store 52 instances of a weekly recurring event.
```js
// Store: { rrule: "FREQ=WEEKLY;BYDAY=TU", dtstart: "2024-01-02T10:00Z" }
// Expand on the client for the visible window only:
import { RRule } from "rrule";
const rule = RRule.fromString(event.rrule);
const instances = rule.between(viewStart, viewEnd);
// Renders only instances in current view — never the full series
```

**4. Drag-to-reschedule**
```js
onDragEnd(event, newSlot) {
  const delta = newSlot.start - event.start; // time shift in ms
  // Optimistic: update local state immediately
  dispatch(moveEvent({ id: event.id, start: event.start + delta, end: event.end + delta }));
  // Persist
  api.updateEvent(event.id, { start, end })
    .catch(() => dispatch(revertEvent(snapshot)));
}
```

**5. Data fetching — fetch by visible window**
```js
// Only load events for current view ± 1 period (prefetch adjacent)
useEffect(() => {
  const [start, end] = getViewWindow(viewDate, viewType);
  fetchEvents({ start: subDays(start, 7), end: addDays(end, 7) });
}, [viewDate, viewType]);
```

### Trade-offs
| Decision | Trade-off |
|---|---|
| Client-side recurrence expansion | No server explosion of records, but CPU on client for long rrules |
| Flat event list + layout algorithm | Simple data model, complex rendering logic |
| Fetch by window | Minimal data, but requires re-fetch on view navigation |
| Optimistic drag | Instant but requires conflict re-check (double-booked meeting) |

### Closing
> "A calendar UI is a multi-view time-grid with three concerns: timezone-correct display (store UTC, convert to display tz via Intl), client-side recurrence expansion for only the visible window, and a collision detection layout algorithm that assigns column fractions to overlapping events — all computed from a flat event list with no server round-trips."

---

## 14. Photo Grid / Masonry Layout

> **Asked at:** Pinterest, Unsplash, Flickr, any media-heavy product

**Mental model:** A variable-height image grid where items land in the shortest column — powered by a virtual column-based layout engine that only renders visible items, with progressive image loading.

### Clarify scope
- Fixed aspect ratio or variable height? *(Pinterest = variable — masonry)*
- Infinite scroll?
- Image click → detail modal or new page?
- Upload / creation surface?
- Search / filtering?

### Architecture

```
MasonryGrid
  ├── Column Calculator    ← compute # cols from container width
  ├── Layout Engine        ← assign each item to shortest column
  ├── Virtual Window       ← only render items in viewport ± 1 screen
  ├── ImageCard            ← LQIP blur-up, lazy decode, aspect-ratio box
  └── Infinite Loader      ← IntersectionObserver at bottom

Data:
  GET /pins?cursor=xxx&pageSize=30
  Response: { items: [{ id, imageUrl, width, height, title }], nextCursor }
  // Server provides width+height — client needs these BEFORE image loads
  // to reserve space and avoid CLS
```

### Core mechanics

**1. Masonry column assignment**
```js
function assignToColumns(items, columnCount) {
  const columns = Array.from({ length: columnCount }, () => ({ items: [], height: 0 }));
  for (const item of items) {
    // Find shortest column
    const shortest = columns.reduce((min, col, i) =>
      col.height < columns[min].height ? i : min, 0
    );
    const aspectRatio = item.height / item.width;
    const columnWidth = containerWidth / columnCount;
    const renderedHeight = columnWidth * aspectRatio;
    columns[shortest].items.push({ ...item, top: columns[shortest].height });
    columns[shortest].height += renderedHeight + GAP;
  }
  return columns;
}
```

**2. Responsive column count**
```js
// Recalculate on resize (debounced)
const columnCount = useMemo(() => {
  if (containerWidth < 640)  return 2;
  if (containerWidth < 1024) return 3;
  return 4;
}, [containerWidth]);
```

**3. Progressive image loading (blur-up)**
```html
<!-- Reserve space before image loads — no CLS -->
<div style="padding-bottom: 75%"> <!-- aspect ratio trick -->
  <!-- 1. Tiny LQIP blur placeholder (< 1kb, inline base64) -->
  <img src="data:image/jpeg;base64,..." class="blur placeholder" />
  <!-- 2. Full image lazy loads, fades in -->
  <img src="https://cdn.../photo.jpg" loading="lazy" decoding="async"
       class="main" onload="this.classList.add('loaded')" />
</div>
```

**4. Virtual rendering**
Pure CSS masonry (`column-count`) cannot be virtualised — items are laid out by browser in DOM order, not position. Use **absolute positioning** instead:
```js
// Each item gets absolute top/left computed by layout engine
// Only render items whose computed top is within viewport ± overscan
const visibleItems = allItems.filter(item =>
  item.top + item.height > scrollTop - overscan &&
  item.top < scrollTop + viewportHeight + overscan
);
```

**5. Images at CDN — responsive srcset**
```html
<img
  srcset="photo-400.webp 400w, photo-800.webp 800w, photo-1200.webp 1200w"
  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
  src="photo-800.webp"
  alt="Mountain at sunset"
/>
```

### Trade-offs
| Decision | Trade-off |
|---|---|
| Absolute-position virtual masonry | Virtualisable but layout algorithm runs on JS thread |
| CSS `column-count` masonry | Browser-native, no JS layout — but unvirtualisable (DOM gets huge) |
| LQIP blur-up | Great perceived performance but adds 1 extra image request |
| Server-provided image dimensions | Eliminates CLS but server must store width/height metadata |

### Closing
> "A masonry grid assigns each incoming item to the shortest column via a JS layout engine, uses absolute positioning (not CSS columns) to enable virtualisation, reserves aspect-ratio space before images load to prevent CLS, and applies blur-up progressive loading with responsive srcset — all fed by cursor-paginated infinite scroll."

---

## 15. Booking / Reservation Flow

> **Asked at:** Airbnb, Booking.com, Uber, any marketplace

**Mental model:** A funnel with an availability grid → selection → checkout — each step URL-addressable so users can share, back-navigate, and resume. Availability is eventually-consistent; payment is strongly consistent.

### Clarify scope
- What's being booked? *(hotel/rental — assume dates + guests)*
- Real-time availability? *(or batched — assume near-real-time, 30s TTL)*
- Multi-step: search → listing → dates → payment?
- Hold/reservation before payment? *(soft lock for 10 min)*
- Guest count, room types, add-ons?

### Architecture

```
URL-driven funnel:
  /search?location=Goa&checkin=2024-12-20&checkout=2024-12-23&guests=2
  /listing/:id
  /booking/:listingId?checkin=...&checkout=...
  /payment/:bookingId
  /confirmation/:bookingId

State in URL → shareable, bookmarkable, back-button works

APIs:
  GET /availability/:listingId?from=...&to=...  ← which dates blocked
  POST /bookings { listingId, checkin, checkout, guests } → bookingId (soft hold)
  POST /payments/:bookingId → redirect to payment processor
```

### Core mechanics

**1. Availability calendar rendering**
```js
// Availability comes as blocked date ranges:
// { blocked: ["2024-12-15", "2024-12-16", "2024-12-22"] }

function DatePicker({ blocked, onSelect }) {
  return (
    <CalendarGrid
      renderDay={(date) => {
        const isBlocked = blocked.includes(format(date, "yyyy-MM-dd"));
        const isPast = date < today;
        return (
          <DayCell
            disabled={isBlocked || isPast}
            className={isBlocked ? "blocked" : "available"}
          />
        );
      }}
    />
  );
}
```

**2. Soft hold — race condition protection**
```
User selects dates → POST /bookings → server creates booking in "pending" state
Server holds the dates for 10 minutes
User completes payment → booking confirmed, dates locked
10 min expires without payment → booking released, dates available again

If someone else books same dates during hold:
  POST /bookings returns 409 → "These dates were just taken, pick new dates"
```

**3. Price calculation — server authoritative**
```
Never compute final price client-side (taxes, fees, discounts vary).
Show "Estimated total" client-side using a simple formula.
Before payment: GET /bookings/:id/price-breakdown → canonical total
Show diff if changed: "Price updated: $420 → $445 (fees changed)"
User must re-confirm before paying.
```

**4. Deep linking — full state in URL**
```js
// User copies URL from search results page
// /listing/abc123?checkin=2024-12-20&checkout=2024-12-23&guests=2
// On load: pre-populate date picker, show prices for those dates
// On "Book Now" → carry dates into booking URL
// No Redux needed — URL IS the state for funnel parameters
```

**5. Payment handoff**
```
POST /payments/:bookingId
  → server creates Stripe PaymentIntent
  → returns { clientSecret }
Client uses Stripe.js Elements (PCI scope isolated to Stripe iframe)
  → user enters card in Stripe-hosted iframe
  → 3DS challenge if required (Stripe handles redirect)
  → success → confirm booking on your server via webhook (not client callback)
```

### Trade-offs
| Decision | Trade-off |
|---|---|
| URL as funnel state | Shareable, no lost state on refresh — but long URLs look ugly |
| Soft hold | Better UX than no hold, but releases tie up inventory during hold window |
| Server-authoritative pricing | Correct but adds a round-trip before payment |
| Stripe iframe for payment | PCI-compliant but you can't fully style it |

### Closing
> "A booking funnel is URL-driven (checkin/checkout/guests in URL for shareability), uses a soft-hold system to lock dates on selection without race conditions, delegates payment to a PCI-isolated Stripe iframe with webhook-based confirmation, and keeps price as server-authoritative to avoid stale discount/fee calculations."

---

## 16. Payments / Checkout Flow

> **Asked at:** Stripe, PayPal, Shopify, any fintech or marketplace

**Mental model:** Checkout is a trust-critical funnel — speed matters for conversion, correctness matters for money. PCI scope is isolated to a payment provider's iframe; your server never touches raw card data. Idempotency prevents double charges.

### Clarify scope
- Guest or authenticated checkout?
- Multiple payment methods? *(card, UPI, wallet, BNPL)*
- Saved cards (returning user)?
- Address / shipping step?
- Order summary — is it mutable up to the payment step?
- 3DS / strong customer authentication required?

### Architecture

```
Checkout Funnel (URL-addressed):
  /cart           ← review items, apply coupon
  /checkout/info  ← address + contact
  /checkout/pay   ← payment method + confirm
  /order/:id      ← confirmation

Payment surface:
  ┌──────────────────────────────────────────┐
  │  Your page shell (your domain)           │
  │  ┌──────────────────────────────────────┐│
  │  │  Stripe Payment Element (iframe)     ││
  │  │  Card number [                     ] ││
  │  │  Expiry [    ]  CVC [    ]           ││
  │  └──────────────────────────────────────┘│
  │  [Pay ₹2,499]  ← your button            │
  └──────────────────────────────────────────┘
```

### Core mechanics

**1. PCI scope isolation**
```
Your code NEVER touches card numbers, CVCs, or full PANs.
Stripe.js injects an iframe from stripe.com — card fields live there.
Your page only sees a paymentMethod token after user input.
This is PCI-SAQ-A compliance — the easiest tier.

What you DO handle:
  - PaymentIntent creation (server-side)
  - Confirmation result (success/failure UI)
  - Webhook receipt (canonical source of truth for order status)
```

**2. Idempotency — prevent double charges**
```js
// Client generates a unique idempotency key per checkout attempt
const idempotencyKey = `order-${orderId}-${Date.now()}`;

// Sent as header on payment confirm request
fetch("/api/confirm-payment", {
  headers: { "Idempotency-Key": idempotencyKey },
  body: JSON.stringify({ paymentMethodId, orderId }),
});

// Server passes this key to Stripe API
// If network drops and user retries → same key → Stripe deduplicates
// Never charges twice for the same key
```

**3. Disable submit button — prevent double-click**
```js
const [paying, setPaying] = useState(false);

async function handlePay() {
  if (paying) return;
  setPaying(true); // disable button immediately
  try {
    const result = await stripe.confirmPayment(...);
    if (result.error) {
      showError(result.error.message);
      setPaying(false); // re-enable on error
    }
    // On success: wait for webhook → don't re-enable
  } catch {
    setPaying(false);
  }
}
```

**4. 3DS / redirect flow**
```
stripe.confirmPayment() may redirect user to bank's 3DS page.
On return: URL contains payment_intent_client_secret query param.
Your /return page reads this, confirms status with Stripe, shows result.

State persistence across redirect:
  Save order context to sessionStorage before stripe.confirmPayment()
  Read on return page to restore UI context
```

**5. Webhook vs client-side confirmation**
```
NEVER trust only the client-side success callback to mark order paid.
Client can close tab, lose connection, or tamper with response.

Correct flow:
  Stripe sends webhook → POST /webhooks/stripe
  Your server verifies Stripe signature (prevents spoofing)
  Server marks order "paid", triggers fulfilment
  Client polls GET /orders/:id until status = "paid" (max 30s)
  OR: client redirects to /return?payment_intent=... → server checks status
```

**6. Saved cards UX**
```
Returning user → show saved card list (last 4 digits, expiry)
"Pay with Visa ending 4242" → one-tap confirm (no re-entry)
Under the hood: PaymentMethod ID stored against user profile
New card option → Stripe Element appears inline
"Remove card" → DELETE /payment-methods/:id
```

### Trade-offs
| Decision | Trade-off |
|---|---|
| Stripe iframe | PCI compliance, but limited styling customisation |
| Webhook as source of truth | Correct, but adds latency before order confirmed UI |
| Idempotency key per attempt | Prevents double charge, but key must be regenerated on genuine retry |
| Client-side cart total display | Fast UX, but server MUST re-validate price on PaymentIntent creation |

### Closing
> "Checkout is a PCI-isolated iframe (Stripe Element) for card capture — your code never sees card data. A PaymentIntent is created server-side, confirmed with an idempotency key to prevent double charges, 3DS handled via Stripe redirect, and order status is driven by webhook — never by the client callback — because the client can drop at any moment."

---

## 17. Online Code Editor / IDE

> **Asked at:** Replit, CodeSandbox, StackBlitz, GitHub (Codespaces), any DevTools company

**Mental model:** A code editor is a Monaco instance running in the main thread, with execution sandboxed in an iframe, language services (LSP, type checking) moved to a Web Worker, and hot-module reload communicated via postMessage.

### Clarify scope
- Which languages? *(assume JS/TS/HTML/CSS for browser sandbox)*
- Run in browser or remote container?
- Multi-file project or single file?
- Collaboration (multiple users)?
- Terminal / console output?
- Package installation (npm)?

### Architecture

```
Browser
  ├── Editor Panel
  │     └── Monaco Editor     ← main thread (keyboard, rendering)
  ├── Language Service Worker ← TypeScript compiler, intellisense, diagnostics
  ├── File Tree               ← virtual file system (in-memory or OPFS)
  ├── Preview Pane
  │     └── Sandboxed iframe  ← origin-isolated, runs user code
  │           ← postMessage ← HMR patches
  ├── Console Panel           ← captures iframe's console.log via postMessage
  └── Terminal Panel          ← pty over WebSocket to remote container (optional)

Storage:
  In-browser: Origin Private File System (OPFS) for file persistence
  Remote: WebSocket to container for Node.js / server-side execution
```

### Core mechanics

**1. Monaco editor setup**
```js
import * as monaco from "monaco-editor";

// Configure TypeScript language service
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2020,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  strict: true,
});

const editor = monaco.editor.create(container, {
  value: code,
  language: "typescript",
  theme: "vs-dark",
  automaticLayout: true, // resize on container change
});
```

**2. Language service in Web Worker (off main thread)**
```js
// worker.js — TypeScript compiler runs here, not in UI thread
import * as ts from "typescript";

self.onmessage = ({ data }) => {
  if (data.type === "typecheck") {
    const diagnostics = runTypeCheck(data.files);
    self.postMessage({ type: "diagnostics", diagnostics });
  }
};

// Main thread: Monaco shows squiggles from worker's output
worker.onmessage = ({ data }) => {
  if (data.type === "diagnostics") {
    monaco.editor.setModelMarkers(model, "typescript", data.diagnostics);
  }
};
```

**3. Sandboxed iframe for execution**
```html
<!-- User code runs here — isolated from your app -->
<iframe
  sandbox="allow-scripts"
  src="about:blank"
  <!-- NO allow-same-origin → iframe cannot access parent DOM -->
></iframe>
```
```js
// Inject user's code into iframe
function runCode(code) {
  const html = `<script type="module">${code}</script>`;
  iframe.srcdoc = html;
}

// Capture console.log from iframe
iframe.contentWindow.console.log = (...args) => {
  window.postMessage({ type: "console", args }, "*");
};
```

**4. Hot Module Replacement (HMR)**
```
On file save:
  1. Recompile changed module → produce patch
  2. postMessage patch to iframe: { type: "hmr", moduleId, newCode }
  3. iframe's HMR runtime swaps module in-place
  4. Only re-executes changed module + dependents
  Full reload only on fundamental changes (HTML template, new deps)
```

**5. Virtual file system**
```js
// In-memory FS with OPFS persistence
const vfs = new Map(); // path → content

// Persist to Origin Private File System (Chrome/Firefox)
const root = await navigator.storage.getDirectory();
const fileHandle = await root.getFileHandle("index.ts", { create: true });
const writable = await fileHandle.createWritable();
await writable.write(code);
await writable.close();
```

### Trade-offs
| Decision | Trade-off |
|---|---|
| Browser sandbox vs remote container | Browser: instant start, limited (no Node.js). Remote: full Node but adds latency, infra cost |
| Monaco in main thread | Rich editor but heavy (~5MB JS) — lazy load after initial render |
| TypeScript in Web Worker | Non-blocking UI but worker message serialisation overhead |
| srcdoc for preview | Simple re-run but loses iframe state on every change — HMR avoids this |

### Closing
> "An online code editor pairs Monaco (main thread) with TypeScript language services in a Web Worker to keep the UI responsive, runs user code in an origin-isolated sandboxed iframe to prevent XSS, uses postMessage HMR to patch modules without full reload, and persists the virtual file system to Origin Private File System — with an optional WebSocket channel to a remote container for Node.js execution."

---

## 18. Video Conferencing UI

> **Asked at:** Zoom, Google (Meet), Microsoft (Teams), Agora, Twilio

**Mental model:** WebRTC for peer-to-peer media streams (audio/video), a signalling server (WebSocket) to exchange ICE candidates and SDP, and a layout engine that adapts to N participants — with dominant speaker detection and graceful degradation on poor networks.

### Clarify scope
- Max participants? *(1:1 call vs 100-person webinar — architecture differs)*
- Screen sharing?
- Chat alongside call?
- Recording?
- Mobile web or native?

> **Assume:** up to 25 participants in a meeting, screen share, in-call chat, no recording.

### Architecture

```
Browser A                    Signalling Server           Browser B
   │                         (WebSocket)                    │
   │──── SDP Offer ─────────────────────────────────────────▶│
   │◀─── SDP Answer ────────────────────────────────────────│
   │──── ICE Candidates ────────────────────────────────────▶│
   │◀─── ICE Candidates ────────────────────────────────────│
   │                                                         │
   │◀═══════════════ WebRTC P2P Media Stream ═══════════════│
   (audio + video directly browser-to-browser, no server relay)

For N > 2 participants: SFU (Selective Forwarding Unit) server
   All browsers send their stream to SFU
   SFU forwards selected streams to each browser
   (No re-encoding — just forwarding)
```

### Core mechanics

**1. WebRTC connection setup**
```js
const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });

// Add local media tracks
const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

// Create offer
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
signalingWs.send({ type: "offer", sdp: offer }); // send via WebSocket signalling

// ICE candidates
pc.onicecandidate = ({ candidate }) => {
  if (candidate) signalingWs.send({ type: "ice-candidate", candidate });
};

// On remote stream
pc.ontrack = ({ streams }) => {
  remoteVideoElement.srcObject = streams[0];
};
```

**2. Layout modes**
```
2 participants:   Side-by-side or spotlight
3–9 participants: Grid (equal tiles)
10–25:            Speaker view (large dominant speaker + strip of thumbnails)
Screen share:     Screen large + self-view PiP corner

Dominant speaker detection:
  WebRTC AudioLevel API → sample every 200ms
  If participant's audio level > threshold for 500ms → they become dominant speaker
  Debounce to prevent rapid switching between speakers
```

**3. Network adaptation — simulcast**
```
Each sender transmits 3 quality layers simultaneously:
  High: 1080p 2.5Mbps  (for participants on good network)
  Mid:  480p  600kbps  (for participants on average network)
  Low:  180p  150kbps  (for participants on poor network)

SFU selects which layer to forward to each receiver based on their bandwidth.
Receiver with poor connection gets Low layer — no re-encoding needed.
```

**4. Video grid rendering**
```js
// Efficient tile rendering — avoid DOM thrashing
function VideoGrid({ participants }) {
  const gridConfig = useMemo(() =>
    computeGridLayout(participants.length, containerSize),
    [participants.length, containerSize]
  );

  return (
    <div style={{ display: "grid", ...gridConfig.style }}>
      {participants.map(p => (
        <VideoTile key={p.id} stream={p.stream} isMuted={p.isMuted}
                   isSpeaking={p.isSpeaking} name={p.name} />
      ))}
    </div>
  );
}

// Attach stream to video element via ref (not via src prop re-render)
useEffect(() => {
  if (videoRef.current && stream) {
    videoRef.current.srcObject = stream; // direct DOM mutation — avoids React re-render
  }
}, [stream]);
```

**5. Reconnect + degradation**
```
ICE connection state: "disconnected" → try ICE restart (renegotiate)
  → "failed" → full reconnect (new offer/answer cycle)
  → still failing → fallback to audio-only (disable video tracks)

Network quality indicator:
  Poll getStats() every 2s → packetLoss, roundTripTime, jitter
  Show signal bars to user
  Auto-reduce video quality if packetLoss > 5%
```

### Trade-offs
| Decision | Trade-off |
|---|---|
| P2P WebRTC vs SFU | P2P = no server cost but O(n²) connections; SFU = central server but scales |
| Simulcast | Great quality adaptation, but sender CPU/bandwidth cost is higher |
| DOM-direct stream attachment | Avoids React render cycle for smooth video but breaks React's mental model |
| Dominant speaker algorithm | Reduces visual noise but can feel abrupt — needs debounce |

### Closing
> "A video conferencing UI uses WebRTC for media with a WebSocket signalling server to exchange SDP/ICE. For groups beyond 2, an SFU forwards streams without re-encoding. Simulcast lets each receiver get the appropriate quality layer. Dominant speaker detection drives the layout, and `getStats()` polling drives adaptive quality — with ICE restart and audio-only fallback for poor connections."

---

## 19. Notification Centre

> **Asked at:** Almost everywhere — Facebook, Slack, Linear, Intercom, any app with activity

**Mental model:** A real-time inbox — WebSocket pushes new notifications, client maintains a read/unread state with a badge count, and the list is grouped/sorted with mark-all-read as an optimistic bulk action.

### Clarify scope
- In-app only or also push (browser, mobile)?
- Notification types? *(mention, reply, like, system alert)*
- Grouping? *(e.g. "3 people liked your post")*
- Persist across sessions?
- Action buttons inside notifications? *(e.g. "Accept" invite)*

### Architecture

```
Shell App
  ├── Bell Icon + Badge         ← unread count, pulsed on new notification
  ├── Notification Panel        ← dropdown/drawer, virtualized list
  │     ├── Filter tabs         ← All | Mentions | System
  │     └── NotificationItem    ← grouped, with action buttons
  └── WS Client                 ← receives push events

APIs:
  GET  /notifications?cursor=...&limit=20   ← paginated history
  PATCH /notifications/:id/read             ← mark single read
  POST  /notifications/read-all             ← mark all read
  WS channel: user:{userId} notifications
```

### Core mechanics

**1. Real-time push via WebSocket**
```js
ws.on("notification.new", (notification) => {
  // Add to top of local list
  dispatch(prependNotification(notification));
  // Increment badge
  dispatch(incrementUnread());
  // Browser push if tab not active
  if (document.hidden && Notification.permission === "granted") {
    new Notification(notification.title, { body: notification.body, icon: "/icon.png" });
  }
});
```

**2. Badge count — never let it go stale**
```
Badge = server-authoritative unread count on load
      + incremented by WS push events
      + decremented on read/mark-all-read

On panel open:
  Option A: mark all as read immediately (Facebook style)
  Option B: mark as read as they scroll into view (Slack style) — IntersectionObserver

const observer = new IntersectionObserver((entries) => {
  entries.filter(e => e.isIntersecting).forEach(e => {
    const notifId = e.target.dataset.id;
    if (!readIds.has(notifId)) markRead(notifId);
  });
}, { threshold: 0.5 });
```

**3. Notification grouping**
```js
// Raw: [like:userA, like:userB, like:userC] on same post
// Grouped: "userA, userB and 1 other liked your post"

function groupNotifications(raw) {
  const groups = {};
  for (const n of raw) {
    const key = `${n.type}:${n.targetId}`;
    if (!groups[key]) groups[key] = { ...n, actors: [], count: 0 };
    groups[key].actors.push(n.actor);
    groups[key].count++;
  }
  return Object.values(groups).map(g => ({
    ...g,
    title: formatGroupTitle(g.type, g.actors, g.count),
  }));
}
```

**4. Optimistic mark-all-read**
```js
async function markAllRead() {
  const prevCount = unreadCount;
  dispatch(setUnreadCount(0));       // optimistic: badge gone instantly
  dispatch(markAllAsReadLocal());    // optimistic: all items greyed
  try {
    await api.markAllRead();
  } catch {
    dispatch(setUnreadCount(prevCount)); // revert on failure
    dispatch(revertReadState());
  }
}
```

**5. Pagination — cursor-based**
```js
// Initial load: GET /notifications?limit=20
// Load more: GET /notifications?cursor=<lastId>&limit=20
// New WS items prepended above — don't reset cursor
// "Load X new notifications" banner if WS pushed while panel closed
```

### Trade-offs
| Decision | Trade-off |
|---|---|
| Mark-read on panel open | Simple, but user may not have actually read them |
| Mark-read via IntersectionObserver | Accurate, but multiple PATCH calls — batch them |
| Client-side grouping | Flexible UI control, but server-side grouping saves bandwidth |
| WS for push | Real-time, but requires connection management |

### Closing
> "A notification centre maintains an unread badge driven by WebSocket push + server count on load, virtualises the notification list, groups similar events client-side to reduce noise, and uses optimistic bulk mark-as-read with IntersectionObserver for per-item read tracking — with browser Push API for background delivery when the tab isn't active."

---

## 20. Multi-step Onboarding / Wizard Flow

> **Asked at:** Any SaaS with a signup flow — Figma, Linear, Notion, HubSpot

**Mental model:** A state machine with named steps, each step a page, full state in a single store persisted across refreshes — skip logic, validation per step, and resume capability if user drops off.

### Clarify scope
- How many steps? *(assume 5 — role, team, integrations, invite, done)*
- Can user go back and edit?
- Can user skip optional steps?
- What if they close mid-onboarding and return later?
- Success criteria: completion rate must be tracked per step.

### Architecture

```
OnboardingShell
  ├── StepRouter        ← URL: /onboarding/step/2
  ├── ProgressStepper   ← visual breadcrumb (Step 2 of 5)
  ├── StepRenderer      ← renders current step component
  │     ├── Step1_Role
  │     ├── Step2_Team
  │     ├── Step3_Integrations
  │     ├── Step4_InviteTeam
  │     └── Step5_Done
  ├── OnboardingStore   ← XState or Zustand, persisted to IndexedDB
  └── AnalyticsTracker  ← step_viewed, step_completed, step_skipped events

Server:
  PATCH /onboarding/:userId { currentStep, answers }  ← persist progress
  POST  /onboarding/:userId/complete
```

### Core mechanics

**1. State machine (XState)**
```js
const onboardingMachine = createMachine({
  id: "onboarding",
  initial: "role",
  states: {
    role:         { on: { NEXT: "team", SKIP: "integrations" } },
    team:         { on: { NEXT: "integrations", BACK: "role" } },
    integrations: { on: { NEXT: "invite", BACK: "team", SKIP: "invite" } },
    invite:       { on: { NEXT: "done", BACK: "integrations", SKIP: "done" } },
    done:         { type: "final" },
  },
});
```
State machine makes skip logic explicit and testable — no `if/else` spaghetti.

**2. URL reflects current step**
```
/onboarding/role
/onboarding/team
/onboarding/integrations
/onboarding/invite
/onboarding/done

Benefits:
  - Back button works
  - User can bookmark and return
  - Analytics can attribute page views to steps
  - Deep link to specific step for support ("go to /onboarding/integrations")
```

**3. Resume across sessions**
```js
// On load: check server for saved progress
const savedStep = await api.getOnboardingProgress(userId);
if (savedStep && savedStep !== "done") {
  navigate(`/onboarding/${savedStep}`); // resume where they left off
}

// Auto-save on every step transition (debounced)
machine.onTransition((state) => {
  if (state.changed) {
    api.saveProgress({ currentStep: state.value, answers: state.context });
  }
});
```

**4. Per-step validation**
```js
// Each step component exposes a validate() function
// StepRenderer calls it before allowing NEXT

async function handleNext() {
  const errors = await currentStepRef.current.validate();
  if (errors.length) { setErrors(errors); return; }
  send("NEXT"); // XState transition
}

// Step 2 validation example
validate() {
  if (!teamName.trim()) return [{ field: "teamName", message: "Team name is required" }];
  if (teamName.length > 50) return [{ field: "teamName", message: "Max 50 characters" }];
  return [];
}
```

**5. Analytics — track every step**
```js
// Track on enter
useEffect(() => {
  analytics.track("onboarding_step_viewed", {
    step: currentStep,
    stepIndex: STEP_ORDER.indexOf(currentStep) + 1,
    totalSteps: STEP_ORDER.length,
  });
}, [currentStep]);

// Track on complete vs skip
function handleNext()  { analytics.track("onboarding_step_completed", { step }); send("NEXT"); }
function handleSkip()  { analytics.track("onboarding_step_skipped",   { step }); send("SKIP"); }
```

### Trade-offs
| Decision | Trade-off |
|---|---|
| XState machine | Explicit, testable skip logic — but learning curve |
| URL-per-step | Shareable + back-button friendly — but user can navigate to step 4 directly, bypassing validation |
| Server persist per step | Resume capability — but noisy API calls (debounce/batch) |
| Single store for all step data | Simple data flow — but step 1 data lives in memory while on step 4 |

### Closing
> "An onboarding wizard is a named-state machine (XState) with one URL per step for back-button support and shareability, server-persisted progress for resume capability, per-step validation before transition, and analytics events on every step view/complete/skip to measure funnel drop-off."

---

## Quick Reference — Common Deep Dive Topics by Pattern

### When interviewer says "how would you handle scale?"
- Virtualize lists (`react-window`, `react-virtual`)
- Cursor pagination (not offset)
- CDN for static + published data
- Web Workers for CPU-heavy work (type checking, image processing, layout)
- Code split aggressively — load only what's visible

### When interviewer says "what about real-time?"
- WebSocket for bidirectional (chat, collaboration, live cursors)
- SSE for server-push only (notifications, live feed, metrics)
- Polling as fallback (30–60s)
- Always: one connection per session (not per component), reconnect with backoff

### When interviewer says "what about offline?"
- Service Worker: cache-first (assets), network-first (data)
- IndexedDB: local draft/snapshot store
- Outbox pattern: queue writes, flush on reconnect
- Background Sync API: browser-managed flush

### When interviewer says "what about performance?"
- LCP: skeleton + CDN + SSR for above-fold
- CLS: reserve space before async content loads
- INP: debounce inputs, defer non-critical updates via `requestIdleCallback`
- Bundle: code split + lazy load + tree shake

### When interviewer says "what about accessibility?"
- Semantic HTML first (button, nav, main, article)
- ARIA only for custom widgets (combobox, listbox, tree, grid)
- Focus management on modal open/close, route change, error
- `aria-live` for dynamic updates (badge count, toast, error)
- `prefers-reduced-motion` for animations
