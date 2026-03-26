# Q3. Web chat / DMs

**Prompt variants:** **Messenger / Slack**-style web chat.

[← Question index](./README.md)

---

### One-line mental model

The client keeps an **ordered message log** merged by server sequence numbers, uses a **WebSocket** for live delivery, and **virtualizes** history while staying **bottom-anchored** when the user is "live" at the tail.

---

### Clarify scope in the interview

Ask these before drawing anything:

- Threads (reply-in-thread) or flat DMs? Affects message data model significantly.
- File/image attachments? Presigned upload flow, progress state, processing delay.
- End-to-end encryption? Changes key management, message storage, and server access patterns.
- Read receipts and delivery confirmations? Adds ack channel and last-read pointer.
- Multi-device? Message sent on phone must appear on web — server-fan-out owned by backend, but client must handle it.
- Guest/anonymous users? Auth and connection setup differs.
- How many concurrent conversations? One active at a time vs multi-pane Slack layout.

---

### Goals & requirements

**Functional**
- Send and receive messages in real time with visible delivery status (sending → sent → delivered).
- Scroll back through history (virtual, lazy-loaded from server).
- Typing indicator: show "Alice is typing..." with throttle.
- Reconnect transparently after backgrounding or network loss; heal any missed messages.

**Non-functional**
- Message ordering is correct — no out-of-order renders even under race conditions.
- Memory bounded — a conversation with 100k messages does not load 100k DOM nodes.
- Reconnect does not cause a thundering herd — stagger reconnects with jitter.
- Deduplication — the same message never appears twice.

---

### High-level frontend architecture

```
Browser
┌──────────────────────────────────────────────────────────────────┐
│  App Shell                                                       │
│  ┌────────────────────┐   ┌───────────────────────────────────┐  │
│  │ Conversation List  │   │  Active Conversation Pane         │  │
│  │ (unread counts)    │   │                                   │  │
│  │                    │   │  ┌─────────────────────────────┐  │  │
│  │                    │   │  │  Message Store (per convo)  │  │  │
│  │                    │   │  │   byId: Map<id, Message>    │  │  │
│  │                    │   │  │   ids: string[] (sorted)    │  │  │
│  │                    │   │  │   pendingIds: string[]      │  │  │
│  │                    │   │  └──────────────┬──────────────┘  │  │
│  │                    │   │                 │                  │  │
│  │                    │   │  ┌──────────────▼──────────────┐  │  │
│  │                    │   │  │  Virtual List               │  │  │
│  │                    │   │  │  (react-window / custom)    │  │  │
│  │                    │   │  │  bottom-anchored by default │  │  │
│  │                    │   │  │  ┌──────┐┌──────┐┌──────┐  │  │  │
│  │                    │   │  │  │ msg  ││ msg  ││ msg  │  │  │  │
│  │                    │   │  │  │[sent]││[dlvd]││[pend]│  │  │  │
│  │                    │   │  │  └──────┘└──────┘└──────┘  │  │  │
│  │                    │   │  └─────────────────────────────┘  │  │
│  │                    │   │                                   │  │
│  │                    │   │  ┌─────────────────────────────┐  │  │
│  │                    │   │  │  Compose bar + send button  │  │  │
│  │                    │   │  └─────────────────────────────┘  │  │
│  └────────────────────┘   └───────────────────────────────────┘  │
└───────────────────────────────────┬──────────────────────────────┘
                                    │
              ┌─────────────────────┼──────────────────────┐
              │                     │                      │
              ▼                     ▼                      ▼
  WebSocket Manager          REST API                  Presence
  ws://gateway/chat          GET /messages?cursor=     (throttled)
  (single connection,        POST /messages
   multiplexed by convoId)   GET /conversations
```

**Connection state machine:**
```
CONNECTING ──► CONNECTED ──► RECONNECTING ──► CONNECTED
     ▲               │              ▲               │
     └───────────────┘              └───────────────┘
                  │ network loss / close
                  ▼
              OFFLINE (show banner, queue sends)
```

---

### What the client does (core mechanics)

#### 1. WebSocket connection with heartbeat and reconnect

```ts
class ChatSocket {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  connect(token: string) {
    this.ws = new WebSocket(`wss://gateway.example.com/chat?token=${token}`);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000; // reset backoff
      this.startHeartbeat();
      store.dispatch(setConnectionState('CONNECTED'));
      this.healGaps(); // fetch any messages missed while disconnected
    };

    this.ws.onmessage = (event) => {
      const envelope = JSON.parse(event.data);
      this.handleEnvelope(envelope);
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      store.dispatch(setConnectionState('RECONNECTING'));
      // Exponential backoff with jitter: delay + random(0, delay)
      const jitter = Math.random() * this.reconnectDelay;
      setTimeout(() => this.connect(token), this.reconnectDelay + jitter);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000); // cap at 30s
    };
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.ws?.send(JSON.stringify({ type: 'ping' }));
    }, 20_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }
}
```

**Why jitter matters:** After a server deploy, thousands of clients disconnect simultaneously. Without jitter, they all reconnect at the same second — a thundering herd. Jitter spreads reconnects over a window of `reconnectDelay` seconds, flattening the spike on the gateway.

#### 2. Message ordering with sequence numbers

```ts
interface Message {
  id: string;           // server-assigned stable ID
  seq: number;          // server sequence number per conversation
  ts: number;           // Unix ms — secondary sort key
  authorId: string;
  body: string;
  clientNonce?: string; // set by sender for optimistic dedup
  status: 'pending' | 'sent' | 'delivered' | 'failed';
}

function insertMessage(state: MessageState, msg: Message) {
  // Dedup: ignore if we already have this ID
  if (state.byId[msg.id]) {
    // Still update status in case it changed (pending → sent)
    state.byId[msg.id] = { ...state.byId[msg.id], status: msg.status };
    return;
  }

  // Dedup optimistic: replace temp message by clientNonce
  if (msg.clientNonce) {
    const tempId = state.pendingByNonce[msg.clientNonce];
    if (tempId) {
      // Remove temp entry, insert confirmed entry at same logical position
      state.ids = state.ids.filter(id => id !== tempId);
      delete state.byId[tempId];
      delete state.pendingByNonce[msg.clientNonce];
    }
  }

  // Insert in sorted position by (seq, ts, id) for deterministic ordering
  state.byId[msg.id] = msg;
  const insertIdx = sortedIndex(state.ids, msg, (a, b) => {
    const ma = state.byId[a], mb = state.byId[b] ?? msg;
    if (ma.seq !== mb.seq) return ma.seq - mb.seq;
    if (ma.ts !== mb.ts) return ma.ts - mb.ts;
    return ma.id < mb.id ? -1 : 1;
  });
  state.ids.splice(insertIdx, 0, msg.id);
}
```

**Why server sequence over client timestamp:** Client clocks drift. Two users sending at "the same time" can have messages appear in different orders on each device. A server-assigned monotonic sequence number gives a single agreed ordering. Client timestamps are a secondary tiebreaker for display granularity only.

#### 3. Optimistic send with temp ID and rollback

```ts
async function sendMessage(convoId: string, body: string) {
  const nonce = crypto.randomUUID(); // idempotency key
  const tempId = `pending-${nonce}`;

  // 1. Immediately insert a pending message into the store
  const optimisticMsg: Message = {
    id: tempId,
    seq: Infinity, // sorts to end
    ts: Date.now(),
    authorId: currentUserId,
    body,
    clientNonce: nonce,
    status: 'pending',
  };
  store.dispatch(insertOptimistic(optimisticMsg));

  // 2. Send via WebSocket (or POST fallback if WS is not CONNECTED)
  try {
    const sent = await chatSocket.send({
      type: 'message',
      convoId,
      body,
      nonce, // server uses this for idempotency
    });
    // WS ack comes back as a regular message event with the real id+seq
    // insertMessage() above handles the nonce dedup — replaces temp entry
  } catch (err) {
    // 3. Mark as failed — show retry UI
    store.dispatch(markMessageFailed(tempId));
  }
}
```

**Idempotency key (nonce):** If the client sends a message, the WS drops, and the client reconnects and retries, the server sees the same nonce and returns the already-created message rather than creating a duplicate. The client deduplicates using the same nonce on receive.

#### 4. Cursor pagination for history + gap sync on reconnect

```ts
// Load older history when user scrolls to top
async function loadOlderMessages(convoId: string) {
  const oldest = store.getOldestMessage(convoId);
  const res = await fetch(
    `/api/conversations/${convoId}/messages?before=${oldest.seq}&limit=50`
  );
  const { messages } = await res.json();
  messages.forEach(msg => store.dispatch(insertMessage(msg)));
  // Prepend without scrolling — maintain viewport position via scroll anchoring
}

// Gap heal on reconnect: fetch anything missed while offline
async function healGaps(convoId: string) {
  const newest = store.getNewestMessage(convoId);
  if (!newest) return;

  const res = await fetch(
    `/api/conversations/${convoId}/messages?after=${newest.seq}&limit=200`
  );
  const { messages, hasMore } = await res.json();

  if (hasMore) {
    // Missed too many — reset to latest N messages to avoid huge backfill
    store.dispatch(resetToLatest(convoId));
  } else {
    messages.forEach(msg => store.dispatch(insertMessage(msg)));
  }
}
```

**Gap scenario:** User has the tab open but backgrounded for 2 hours. On refocus, `healGaps()` fetches from `newest.seq` forward. If fewer than 200 messages were missed, they merge into the store. If more, it's more efficient to discard the stale slice and reload the latest 50.

#### 5. Typing indicators — throttled and scoped

```ts
const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const isTypingRef = useRef(false);

function onInputChange(value: string) {
  setInputValue(value);

  if (!isTypingRef.current) {
    isTypingRef.current = true;
    chatSocket.send({ type: 'typing_start', convoId });
  }

  // Reset the stop timer on each keystroke
  if (typingThrottleRef.current) clearTimeout(typingThrottleRef.current);
  typingThrottleRef.current = setTimeout(() => {
    isTypingRef.current = false;
    chatSocket.send({ type: 'typing_stop', convoId });
  }, 3000);
}

// Pause typing events when tab is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden && isTypingRef.current) {
    isTypingRef.current = false;
    chatSocket.send({ type: 'typing_stop', convoId });
  }
});
```

**Why throttle to one event per 3s:** Sending a `typing` event on every keystroke would mean 50+ events per minute per user. At 10,000 concurrent users in a group chat, that's 500,000 events/min to fan out. One event per 3s reduces load by ~100x. The server broadcasts the indicator and auto-expires it after 5s if no refresh arrives.

#### 6. Virtual list with bottom-anchor behavior

```tsx
const listRef = useRef<VariableSizeList>(null);
const isAtBottomRef = useRef(true);

function onScroll({ scrollOffset, scrollDirection, scrollUpdateWasRequested }) {
  const totalHeight = getTotalListHeight();
  const distanceFromBottom = totalHeight - scrollOffset - viewportHeight;
  isAtBottomRef.current = distanceFromBottom < 100; // 100px threshold
}

// When new messages arrive via WebSocket
useEffect(() => {
  if (isAtBottomRef.current) {
    // User is live at the tail — scroll to bottom
    listRef.current?.scrollToItem(ids.length - 1, 'end');
  } else {
    // User is reading history — show "New messages" chip
    setUnreadCount(prev => prev + newMessages.length);
  }
}, [ids.length]);

// Prepending history (scroll up): maintain viewport position
// Before prepend, record scroll offset; after prepend, restore offset + prepended height
function prependHistory(newMessages: Message[]) {
  const prevScrollOffset = listRef.current?.state.scrollOffset ?? 0;
  const prependedHeight = newMessages.reduce((h, m) => h + estimateHeight(m), 0);
  store.dispatch(prependMessages(newMessages));
  // After render, compensate
  requestAnimationFrame(() => {
    listRef.current?.scrollTo(prevScrollOffset + prependedHeight);
  });
}
```

**Bottom-anchor contract:** The list must stay at the bottom when the user is "live." This means new incoming messages scroll the list down automatically. When the user scrolls up to read history, we stop auto-scrolling and show a chip. When they tap the chip or scroll back down, we jump to the tail and resume auto-scroll.

---

### Trade-offs

| Decision | Chosen approach | Why | Cost / risk |
|---|---|---|---|
| WebSocket vs SSE + POST | WebSocket | Full duplex; lower overhead per message than repeated HTTP; native binary frames for future attachments | Firewalls/corporate proxies sometimes block WS upgrades — need long-poll fallback |
| Single WS vs per-conversation WS | Single multiplexed WS | One TCP connection; faster subscription switching between convos; one reconnect to heal | Requires envelope with `convoId` field; all convos share one reconnect fate |
| Optimistic vs pessimistic sends | Optimistic | Chat feels instant; `pending → sent` transition on ack is visually clean | Requires rollback to `failed` state; user must retry or cancel failed messages |
| Server sequence vs client timestamp | Server sequence | Single agreed ordering; immune to clock drift and device time manipulation | Seq is assigned after server write — optimistic messages use `Infinity` and sort to end temporarily |
| Reset vs backfill on large gap | Reset to latest if gap > 200 | Avoids multi-second waterfall of paginated backfill after long background | User loses scroll position in history — acceptable since they were away for a long time |
| Typing indicator throttle: 1s vs 3s | 3s | At scale, even 1s is expensive; users tolerate 3s delay in "typing" appearance | Indicator may appear 3s after user actually started typing — minor UX cost |

---

### Failure modes & degradation

- **WS blocked by proxy:** Fall back to long-polling (`GET /messages/poll?since=seq&timeout=30s`). Client polls with 30s server hold. Throughput is lower but functional. Surface a "Limited connectivity" badge.
- **Send failure:** Show red "!" on the message bubble. Offer "Retry" and "Delete" actions. Never silently drop a failed send.
- **Gap too large on reconnect:** Reset local history to latest 50 messages. Show "You were away — messages may be missing above." Offer a "Load history" button.
- **Thundering herd on server deploy:** Exponential backoff + jitter (already baked into `ChatSocket`). Gateway should also rate-limit reconnects per IP.
- **Duplicate messages:** `insertMessage()` deduplicates by `id` and `clientNonce`. Duplicate rate should be ~0 — track it in RUM as a correctness metric.
- **Tab hidden for > 1 hour:** On `visibilitychange`, reconnect WS and run `healGaps()`. If the WS was still connected (some proxies tolerate idle WS), re-subscribe to the active conversation.

---

### Accessibility checklist

- New incoming messages: use `aria-live="polite"` on a visually hidden region that announces "New message from Alice." Do not announce every message in a fast-moving group chat — throttle to one announcement per 2s.
- Send on `Enter` vs `Shift+Enter` (newline) — document this behavior in the UI with a tooltip or placeholder text.
- `Ctrl/Cmd+Enter` as an alternative send shortcut for users who prefer multi-line input.
- Keyboard navigation in the conversation list: standard arrow key pattern; `Enter` to open.
- Do not trap focus in the message pane — allow Tab to move to the compose bar and conversation list naturally.
- Attachment upload progress: announce percentage via `aria-valuenow` on a progress element.

---

### Minute summary (closing statement)

"The central challenge in a chat client is maintaining a **correct, ordered, deduplicated message log** across network interruptions, optimistic sends, and concurrent inserts from multiple devices. We solve ordering with **server-assigned sequence numbers** rather than client clocks, deduplicating by `id` and `clientNonce` so the same message never renders twice. We use a **single multiplexed WebSocket** with exponential-backoff-plus-jitter reconnect and a `healGaps()` call on each reconnect to fetch exactly the messages missed while offline. The message list is **virtualized with bottom-anchor semantics** — when the user is live at the tail it auto-scrolls on new messages; when scrolled up it badges the count and stops moving the viewport. Optimistic sends give instant feedback with a `pending → sent → delivered` status arc and a `failed` fallback with retry. Typing indicators are throttled to one event per 3 seconds and paused on tab-hidden to protect server fan-out at scale. The result is a chat client that feels instant, stays correct under reconnects and races, and degrades to a disconnected-banner-plus-queue rather than silently losing messages."

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Threads, receipts, E2E, attachments, multi-device |
| High-level architecture | 12–18 | WS/SSE diagram, message store, connection state machine |
| Deep dive 1 | 12–18 | **Ordering, dedup, gap heal** |
| Deep dive 2 | 12–18 | **Virtual list + scroll anchoring** or **optimistic send + idempotency** |
| Trade-offs, failure, metrics | 8–12 | Offline queue, reconnect storms, RUM |

---

### What to draw (whiteboard)

- **Client ↔ Gateway:** WebSocket with reconnect arc, heartbeat ping/pong, multiplexed `convoId` in envelope.
- **Message shape:** `{ id, seq, ts, authorId, body, clientNonce?, status }` — minimal but complete.
- **Connection state machine:** `CONNECTING → CONNECTED → RECONNECTING → OFFLINE` with transitions labeled.
- **Scroll modes:** two boxes — "stuck to bottom" (tail mode) and "new messages chip" (history mode) — with the 100px threshold trigger.
- **Gap heal diagram:** timeline showing disconnect, missed messages M1–M5, reconnect, `?after=seq` request, insert M1–M5.

---

### Deep dives — pick 2

**A. Ordering & consistency** — Server sequence vs raw clock; **dedup** by id and nonce; **out-of-order** tolerance with sorted insert; **gap fetch** API design (`after=seq`, `before=seq`); loading older history vs live tail; large-gap reset strategy.

**B. Virtualization + scroll** — Bottom anchor implementation; prepend history without viewport jump; dynamic bubble heights with `ResizeObserver`; unread divider placement and persistence across re-renders; "New messages" chip with dismiss.

**C. Optimistic sends** — Pending UI; idempotency key / nonce; failed state with retry UX; what happens if the same nonce arrives twice (server duplicate prevention); edit/delete — version field optional on client.

**D. Presence & typing** — Throttle to one event per N seconds; pause on tab hidden; backend fan-out cost (mention briefly — client's job is to minimize events, not implement fan-out); per-conversation vs global presence; TTL on server for auto-expiry.

---

### Common follow-ups

- **"Unread counts?"** — Maintained by server and synced via a separate lightweight endpoint or WS message type. Do not derive unread count from the full message history on the client — too expensive at scale.
- **"WS completely blocked?"** — Long-poll fallback: `GET /poll?since=seq&timeout=30`. Outbound messages via `POST /messages`. Honest "Limited connectivity" indicator. Accept higher latency.
- **"Attachments?"** — Client requests a presigned upload URL from the server, uploads directly to object storage (S3/GCS), then sends a message with the attachment reference. Show upload progress with a local object URL preview. Server runs async malware scan; client shows "processing" until scan completes.
- **"Search within a conversation?"** — Separate surface with its own API (`GET /conversations/:id/search?q=`). For loaded messages in memory, a linear scan with highlight is fine. For global search across all conversations, server-side full-text index — never block the chat cold path on this.
- **"Multi-device?"** — Server fans out to all connected devices. Each device runs the same `insertMessage()` dedup logic. WS reconnect on a second device triggers `healGaps()` independently. Last-read pointer is server-owned and synced.

---

### What you'd measure

- **Reliability:** WS reconnect success rate; duplicate message rate (target 0%); time from disconnect to gap-healed (p95).
- **UX:** send-to-ack latency p50/p95 (target < 200ms on good network); long tasks during scroll (target 0 > 50ms); error rate on send (target < 0.1%).
- **Ops:** reconnect storm spike on deploy (monitor gateway connection rate per second, should stay flat with jitter); WS connection count vs active user count ratio (expect ~1:1 if single WS per tab).
- **Correctness:** out-of-order message render events in RUM (should be 0); nonce collision rate (cryptographic UUID — should be 0).
