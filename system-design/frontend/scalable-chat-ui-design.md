# Design a scalable chat UI (interview framing)

 [← Frontend prep index](./README.md)

**Chat** is real-time, **cursor-heavy** (typing, presence), **list-heavy** (message history), and **latency-sensitive**. Scale means many concurrent rooms, long histories, and mobile constraints — not just “WebSocket + list.”

---

## 1. Clarify scope

- **1:1 vs groups vs channels**? **Threads / replies**? **E2E encryption** (limits server features)?
- **History:** How far back? **Search** global vs per-conversation?
- **Attachments:** Images, files, voice — **progressive upload**, **preview** generation server-side?
- **Platforms:** Web + mobile — shared design tokens; **notification** behavior differs.

**Non-functional:** **Time-to-first-message**, scroll **stick to bottom** behavior, **accessibility** (announce new messages), **internationalization** (RTL, timestamps).

---

## 2. High-level architecture

```
Client shell ──► Connection manager (WS/MQTT/WebRTC sig) ──► Chat gateway
      │                      │
      ├── Message store      ├── Heartbeat / reconnect / backoff
      ├── Drafts & UI state ├── Optional: SSE fallback
      └── Notifications     └── Idempotent client message IDs
```

- **Transport:** **WebSocket** for bidirectional events (message, typing, presence, read receipts). **SSE** or poll only if constraints force it.
- **API:** **REST/GraphQL** for **bootstrap** (recent page), **search**, **profile**, and **file upload** (signed URL pattern).
- **Normalization:** Messages keyed by **id**; **conversation** entity holds last message pointer for list screens.

---

## 3. Client data model

1. **Pagination:** **Cursor** (message id + direction) — avoid OFFSET deep in history.
2. **Optimistic send:** Client assigns **temp id**, replaces with server id on ack; **failed** → retry with same idempotency key.
3. **Ordering:** Server is source of truth for **timestamp**; handle **clock skew** by trusting server seq or hybrid time.
4. **Virtualization:** **Windowed** message list — recycle cells; **estimate** heights otherwise **measure** (expensive for rich bubbles).
5. **Unread / read receipts:** **Ephemeral flags** + batch “mark read” to reduce chatter.

---

## 4. UX behaviors (what interviewers nitpick)

- **Composer:** **multi-line grow**, **Enter to send** vs newline (platform norms), **mention** autocomplete with debounced search.
- **Scroll:** **Pin to bottom** when user is at bottom; **“New messages”** chip when scrolled up; **jump to latest** control.
- **Typing & presence:** **Throttle** typing events (e.g. every N seconds); **clear** on blur/stop.
- **Reconnect:** **Replay** gap using `since_seq` or cursor; **merge** without duplicates; show **“Reconnecting…”** subtle state.

---

## 5. Deep dives (pick 2)

### A. Scale & fan-in

Many rooms open → **subscribe** only to **active** conversation + small **prefetch** set; **unsubscribe** on background (mobile). **Push** notifications when app backgrounded — **FCM/APNs** with deep link to `conversationId`.

### B. Rich media

**Direct upload** to object storage → message payload references **asset id**. **Progress bar**, **cancel**, **retry**; **lazy thumbnail** in list; **tap to full screen** preview.

### C. Search & threads

**Server-side index**; client shows **loading** + **paginated** results. **Thread sidebar** can be a second virtual list synced to **parent message id**.

### D. Security

**XSS** from user content → sanitize or structured message format; **CSP** on web; **E2E** changes who can implement search/notifications — acknowledge trade-off.

---

## 6. Failure modes

- **Split brain after reconnect** — use **monotonic seq** per conversation.
- **Memory** from unbounded in-memory message map — **evict** far-above-window messages or cap per conversation client-side.
- **Render storms** — batch **React** updates / use **external store** + `useSyncExternalStore` for high-frequency typing if needed.

---

## 7. Minute summary

“A **scalable chat UI** combines a **connection manager** with backoff, **cursor-based history** and a **virtualized** message list, **optimistic sends** with idempotent ids, throttled **typing/presence**, and **room-level subscriptions** so we don’t subscribe to the whole world — plus **push** when the app isn’t active.”
