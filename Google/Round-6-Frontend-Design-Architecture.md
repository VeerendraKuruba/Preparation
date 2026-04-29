# Round 6 — Frontend Design Architecture (Stage 2, In-Person, 60 mins)

> The most senior round. 60 minutes — the extra 15 matters.
> Tests: system thinking, trade-off reasoning, real-world constraints, L5 ownership mindset.
> You drive the conversation. Interviewer asks a design question and steps back.
> Red flag: jumping to code immediately. Design first, always.

---

## The 60-Minute Structure to Follow Every Time

```
0-5 min   → Clarify requirements (functional + non-functional)
5-10 min  → Sketch high-level architecture (boxes and arrows)
10-25 min → Deep dive: component structure, state management, data flow
25-40 min → Deep dive: performance, rendering strategy, real-time, caching
40-50 min → Deep dive: accessibility, error handling, edge cases
50-58 min → Trade-offs discussion ("if I had to choose between X and Y...")
58-60 min → Questions for the interviewer
```

---

## RADIO Framework (Use on Whiteboard)

```
R — Requirements      (functional: what it does; non-functional: scale, perf, a11y)
A — Architecture      (client → API → storage; component tree sketch)
D — Data Model        (API shape, state shape, data flow direction)
I — Interface Design  (component APIs, event contracts, props/state split)
O — Optimizations     (perf, caching, lazy loading, error states, offline)
```

---

## Question 1: Design a Real-Time Chat Application (Frontend)
*(High-probability for L5 design round)*

### Step 1: Clarify Requirements (ask these)
- One-to-one or group chat?
- Read receipts, typing indicators, online status?
- Media attachments (images, files)?
- Message history — how far back?
- Mobile + desktop?
- Expected concurrent users?

### Step 2: High-Level Architecture
```
┌─────────────────────────────────────────────┐
│                  Client                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Channel  │  │ Message  │  │ Composer │  │
│  │ List     │  │ Thread   │  │ + Media  │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│            ↕ WebSocket + REST API            │
└─────────────────────────────────────────────┘
        ↕ REST (history)    ↕ WebSocket (real-time)
   ┌──────────┐         ┌──────────────┐
   │  Message │         │   WS Server  │
   │   API    │         │  (pub/sub)   │
   └──────────┘         └──────────────┘
```

### Step 3: Component Structure
```
<App>
  <Sidebar>
    <ChannelList channels={channels} activeId={activeId} />
    <UserPresence userId={userId} />
  </Sidebar>
  <ChatView channelId={activeId}>
    <MessageList messages={messages} />   ← virtualized
    <TypingIndicator />
    <MessageComposer onSend={sendMessage} />
  </ChatView>
```

### Step 4: State Management
```js
// Global (Zustand / Redux)
{
  channels: { [id]: { id, name, lastMessage, unreadCount } },
  messages: { [channelId]: { items: Message[], hasMore: bool, cursor: string } },
  presence: { [userId]: 'online' | 'offline' | 'typing' },
  optimistic: Map<localId, Message> // messages in-flight
}

// Local (per component)
- composer draft text
- emoji picker open state
- file upload progress
```

### Step 5: Real-Time with WebSocket
```js
class ChatSocket {
  constructor(url, handlers) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = ({ data }) => {
      const event = JSON.parse(data);
      handlers[event.type]?.(event.payload);
    };
    this.ws.onclose = () => this.reconnect(); // exponential backoff
  }

  send(type, payload) {
    this.ws.send(JSON.stringify({ type, payload }));
  }

  reconnect(attempt = 1) {
    const delay = Math.min(1000 * 2 ** attempt, 30000);
    setTimeout(() => {
      this.ws = new WebSocket(this.url);
      // re-attach handlers
    }, delay);
  }
}
```

### Step 6: Optimistic UI
```js
function sendMessage(text) {
  const localId = crypto.randomUUID();
  const optimistic = { localId, text, status: 'sending', timestamp: Date.now() };
  addOptimistic(optimistic);

  socket.send('message', { channelId, text, localId });
}

// On server ACK:
function onMessageAck({ localId, serverId, timestamp }) {
  confirmOptimistic(localId, { id: serverId, status: 'sent', timestamp });
}

// On failure:
function onMessageError({ localId, error }) {
  markOptimisticFailed(localId); // show retry UI
}
```

### Step 7: Message History (Cursor Pagination)
```js
async function loadOlderMessages(channelId, cursor) {
  const res = await fetch(`/api/messages?channelId=${channelId}&before=${cursor}&limit=50`);
  const { messages, nextCursor, hasMore } = await res.json();
  prependMessages(channelId, messages);
  updateCursor(channelId, nextCursor, hasMore);
}
// Triggered by IntersectionObserver at top of message list
```

### Step 8: Performance
- **List virtualization**: render only visible messages (react-virtual / CSS `content-visibility`)
- **Image lazy loading**: `loading="lazy"` + IntersectionObserver for custom media
- **Debounce typing indicator**: send typing event 500ms after last keystroke, stop after 2s of inactivity
- **Bundle splitting**: separate chunk for emoji picker, file upload, video player

### Step 9: Accessibility
- `role="log"` on message list, `aria-live="polite"` for new messages
- `aria-label` on emoji and attachment buttons
- Keyboard: `Tab` through messages, `Enter` to open thread, `Escape` to close
- Screen reader announcements for typing indicators and online status changes

---

## Question 2: Design Google Docs (Collaborative Editor — Frontend)
*(L5/L6 system design — very complex, tests deep knowledge)*

### Key Challenges
1. **Concurrent edits** — two users type at same time
2. **Conflict resolution** — whose edit wins?
3. **Low latency** — edits must feel instant
4. **Offline support** — work without internet, sync on reconnect

### Architecture Approach
```
User types → Local state updated immediately (optimistic)
           → Operation sent to server via WebSocket
           → Server applies OT/CRDT, broadcasts to other clients
           → Other clients apply the transformed operation
```

### Conflict Resolution: Operational Transformation (OT)
```js
// Operation: { type: 'insert', pos: 5, text: 'hello', userId, timestamp }
// If User A inserts at pos 5 and User B inserts at pos 5 simultaneously:
// Server serializes: A's op arrives first → B's op transformed: pos becomes 5 + 5 = 10
function transform(op1, op2) {
  if (op1.type === 'insert' && op2.type === 'insert') {
    if (op1.pos <= op2.pos) return { ...op2, pos: op2.pos + op1.text.length };
    return op2;
  }
  // handle insert vs delete, delete vs delete...
}
```

> In a real system, use a proven CRDT library (Automerge, Yjs) — don't reinvent OT.

### Rendering Strategy
- Use a **custom contenteditable** or a purpose-built editor (ProseMirror, Slate.js)
- Don't use a `<textarea>` — no rich formatting support
- Represent document as an **operation log** (append-only), not a mutable string

### Presence (Who's Editing Where)
```js
// Broadcast cursor positions via WebSocket
socket.send('cursor', { userId, pos: editor.getCursorPosition() });
// Render remote cursors as absolutely-positioned overlays with user colors
```

---

## Question 3: Design a Frontend Analytics SDK
*(Confirmed Google question — tests architectural thinking)*

### Requirements
- Embed via `<script>` tag on any third-party page
- Track: pageviews, clicks, custom events, JS errors
- Send data to collection endpoint with minimal overhead

### Architecture
```js
// Public API — must be available synchronously before SDK loads
window.Analytics = window.Analytics || {
  q: [], // pre-load queue
  track(...args) { this.q.push(['track', ...args]); },
  page(...args) { this.q.push(['page', ...args]); }
};
```

### Key Design Decisions

**1. Non-blocking load:**
```html
<script async src="https://analytics.example.com/sdk.js"></script>
```
`async` means no render blocking. On load, SDK drains the queue.

**2. Batching events (critical for performance):**
```js
class Analytics {
  #queue = [];
  #flushTimer = null;

  track(event, props) {
    this.#queue.push({ event, props, timestamp: Date.now() });
    this.#scheduleFlush();
  }

  #scheduleFlush() {
    this.#flushTimer ||= setTimeout(() => this.#flush(), 2000);
  }

  #flush() {
    if (!this.#queue.length) return;
    const batch = [...this.#queue];
    this.#queue = [];
    this.#flushTimer = null;
    this.#send(batch);
  }

  #send(batch) {
    // Use sendBeacon for unload reliability
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/collect', JSON.stringify(batch));
    } else {
      fetch('/collect', { method: 'POST', body: JSON.stringify(batch),
                          keepalive: true }); // keepalive for page unload
    }
  }
}

// Flush on page unload
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') analytics.flush();
});
```

**3. Error tracking:**
```js
window.addEventListener('error', ({ message, filename, lineno, colno, error }) => {
  analytics.track('js_error', { message, stack: error?.stack, filename, lineno });
});
window.addEventListener('unhandledrejection', ({ reason }) => {
  analytics.track('promise_rejection', { message: reason?.message, stack: reason?.stack });
});
```

**4. Session and user identity:**
- Use `sessionStorage` for session ID (new per tab session)
- Use `localStorage` for anonymous user ID (persists across sessions)
- Hash or anonymize any PII before sending

---

## Question 4: Design an Autocomplete Search Component

*(Covered in detail in 03-system-design.md — extend here with architecture focus)*

### Additional Architecture Points for 60-min Round

**Caching Strategy:**
```js
class AutocompleteCache {
  #cache = new Map();
  #maxSize = 100;

  get(query) { return this.#cache.get(query); }

  set(query, results) {
    if (this.#cache.size >= this.#maxSize) {
      // Evict oldest (Map insertion order)
      this.#cache.delete(this.#cache.keys().next().value);
    }
    this.#cache.set(query, results);
  }
}
```

**Prefix sharing:** Cache results for "ap" — when user types "app", first check if "ap" results can be filtered client-side before making a new request.

**Accessibility (often missed — mention this):**
```html
<input
  role="combobox"
  aria-expanded={isOpen}
  aria-haspopup="listbox"
  aria-controls="suggestions-list"
  aria-activedescendant={selectedId}
  aria-autocomplete="list"
/>
<ul id="suggestions-list" role="listbox">
  <li role="option" id="option-0" aria-selected={idx === 0}>Apple</li>
</ul>
```

---

## Trade-off Questions to Expect

**Q: CSR vs SSR for a chat app?**
```
CSR: Better for highly interactive real-time UI. No server rendering overhead.
     Downside: slower initial load, not SEO-friendly.
SSR: Better initial load, SEO, works before JS loads.
     For chat: SSR the page shell and message history; hydrate for real-time features.
     ISR: Pre-render public channels; revalidate every N seconds.
Decision: Hybrid — SSR the HTML shell with last N messages, then WebSocket takes over.
```

**Q: REST vs WebSocket vs SSE for real-time?**
```
REST polling: simplest, high latency (poll interval), wastes bandwidth
SSE: server push, auto-reconnect built in, HTTP/2 multiplexing — good for one-way feeds
WebSocket: bidirectional, lowest latency, more complex (reconnection, auth, load balancing)
Decision: Chat → WebSocket (bidirectional needed). Activity feed → SSE. Analytics → REST batching.
```

**Q: Client-side state: local state vs Context vs Redux vs Zustand?**
```
Local state (useState): single component, no sharing needed
Context: shared state, low-update-frequency (theme, auth user)
Redux: large app, complex update logic, time-travel debugging needed
Zustand: simpler Redux, minimal boilerplate, selective subscriptions
For chat: Zustand or Redux — many components subscribe to messages/presence
```

**Q: Virtualization vs pagination for long lists?**
```
Pagination: simpler, works with any rendering. User must click "next page."
Infinite scroll: better UX for feeds, but hard to maintain scroll position on back.
Virtualization: best performance for large static lists (10k+ items), complex implementation.
Decision: For chat messages → virtual list (react-virtual). For search results → pagination.
```

---

## Things That Make You Stand Out in This Round

1. **Define success metrics before designing**: "I'd measure this by LCP < 2s and CLS < 0.1"
2. **Think about failure modes**: "What if the WebSocket disconnects? What if the API is slow?"
3. **Bring up accessibility unprompted**: "I'd add `aria-live` to the message list for screen readers"
4. **Consider mobile**: "On mobile I'd use touch events and reduce the polling frequency for battery"
5. **Mention monitoring**: "I'd instrument this with custom performance marks and send to our RUM tool"
6. **Design for incremental delivery**: "I'd ship behind a feature flag and measure the impact"

---

## Questions to Ask the Interviewer (End of Round)

1. "What does the frontend architecture look like for this product today — what's the biggest pain point?"
2. "How does your team handle real-time data at scale — do you use WebSockets or SSE?"
3. "What performance benchmarks does your team hold itself to?"
4. "Is there a specific part of what I designed that you'd approach differently on your team?"
