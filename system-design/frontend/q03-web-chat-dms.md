# Q3. Web chat / DMs

**Prompt variants:** **Messenger / Slack**-style web chat.

 [← Question index](./README.md)

---

### One-line mental model

The client keeps an **ordered message log** merged by server ids/timestamps, uses a **duplex or pseudo-duplex** transport, and **virtualizes** history while staying **bottom-anchored** when the user is “live.”

### Clarify scope in the interview

Threads? File upload? **E2E**? Read receipts? Guest/anonymous?

### Goals & requirements

- **Functional:** send, list, delivery/read UX, typing indicator (optional).
- **Non-functional:** reconnect after backgrounding; **ordering**; memory bounded.

### High-level frontend architecture

**WebSocket** (or SSE + POST) → message store normalized by id → virtual list → optional **presence** channel throttled.

### What the client does (core mechanics)

1. **Dedupe** and **sort** by `(seq | timestamp, id)`; drop late duplicates.
2. **Optimistic send** with pending state; **idempotency** keys if supported.
3. **Virtual list** anchored to bottom; “New messages” chip when scrolled up.
4. **Typing:** send throttled; unsubscribe when tab hidden.

### Trade-offs

| Choice upside | Trade-off |
|---------------|-----------|
| WebSocket | Firewalls/proxies—have long-poll fallback story |
| Optimistic UI | Needs reconcile + user-visible failure |

### Failure modes & degradation

Queue sends offline (best-effort); on reconnect **gap fetch**; show **disconnected** banner.

### Accessibility checklist

New message politely announced if required; trap focus in modals only; keyboard send **Ctrl/Cmd+Enter** pattern documented.

### Minute summary (closing)

“We normalize messages by **id**, use **WS + reconnect + gap heal**, **virtualize** with bottom stickiness, and **throttle** ephemeral signals like typing.”

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

### What to draw (whiteboard)

- Client ↔ **gateway** (WebSocket) with reconnect + heartbeat.
- Message shape: `{ id, seq?, ts, authorId, body, clientNonce? }` (minimal sketch).
- UI states: `CONNECTING | CONNECTED | RECONNECTING | OFFLINE`.
- Scroll modes: **stuck to bottom** vs “new messages” chip.

### Deep dives — pick 2

**A. Ordering & consistency** — Prefer server **sequence** over raw clock; **dedup** by id; **out-of-order** tolerance; **gap fetch** APIs; loading older history vs live tail.

**B. Virtualization + scroll** — Bottom anchor; prepend history without jumping viewport; dynamic bubble heights + `ResizeObserver`; unread divider placement.

**C. Optimistic sends** — Pending UI; **idempotency** key; failures with retry; edits/tombstones—version field optional on client.

**D. Presence & typing** — Throttle; pause when tab hidden; mention backend fanout cost—client avoids **spamming** events.

### Common follow-ups

- **“Unread counts?”** — Separate compact endpoint or fields; don’t derive from full history on client.
- **“WS blocked?”** — Long/short poll fallback; queued outbound; honest offline UX.
- **“Attachments?”** — Presigned upload; progress; processing state; malware scan = server.
- **“Search this thread?”** — Different surface; in-memory highlight for loaded range; server index for global—don’t block chat cold path.

### What you’d measure

- **Reliability:** reconnect success, duplicate rate (~0), time to **gap heal**.
- **UX:** send→ack latency, long tasks during scroll, error rate on send.
- **Ops:** reconnect thundering herd after deploy (**exponential backoff + jitter**).

