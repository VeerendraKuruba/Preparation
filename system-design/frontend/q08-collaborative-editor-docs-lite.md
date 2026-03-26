# Q8. Collaborative Editor (Docs-lite)

**Prompt variants:** Google Docs–like — frontend angle.

[← Question index](./README.md)

---

### One-line mental model

The browser holds a **document model** and **sequence number**; updates flow through a **long-lived WebSocket session**; the UI merges concurrent edits via OT or CRDT without ever freezing typing — local edits apply instantly, sync happens in the background.

### Clarify scope in the interview

- Rich text (bold/italic/lists) or block-based (Notion-style)?
- How many concurrent editors? 2–5 vs 100+?
- Offline support required, or just graceful reconnect?
- Presence cursors and selections?
- Comments / inline annotations?
- Permissions within a doc (section-level edit access)?

### Goals & requirements

**Functional:**
- Real-time collaborative typing with cursor presence
- Block-based document model (paragraphs, headings, lists, code blocks)
- Reconnect: pick up where you left off with no data loss
- Undo/redo scoped to the local user's operations

**Non-functional:**
- Typing latency: local keystroke → visible in DOM < 16ms (one frame) — never block on network
- Sync latency: local op → visible to collaborators < 200ms p95
- No silent data loss — concurrent edits must merge, not clobber
- Memory bounded: large docs don't crash the tab (virtualize or paginate blocks)

---

### High-level frontend architecture

```
  Browser (User A)                    Browser (User B)
  ┌──────────────────────┐            ┌──────────────────────┐
  │  Editor UI           │            │  Editor UI           │
  │  (block renderers)   │            │  (block renderers)   │
  │         │            │            │         │            │
  │  Document Model      │            │  Document Model      │
  │  (in-memory CRDT /   │            │  (in-memory CRDT /   │
  │   OT doc state)      │            │   OT doc state)      │
  │         │            │            │         │            │
  │  Op Buffer           │            │  Op Buffer           │
  │  (pending local ops) │            │  (pending local ops) │
  │         │            │            │         │            │
  │  WS Client           │            │  WS Client           │
  └──────────┬───────────┘            └──────────┬───────────┘
             │  ops + seq                        │  ops + seq
             ▼                                   ▼
  ┌────────────────────────────────────────────────────────────┐
  │  WebSocket Session Server                                  │
  │  ┌─────────────────────────────────────────────────────┐  │
  │  │  Op queue per document                              │  │
  │  │  OT transform / CRDT merge                         │  │
  │  │  Sequence number assignment                        │  │
  │  │  Fanout to all connected clients                   │  │
  │  └─────────────────────────────────────────────────────┘  │
  │                │                                           │
  │  ┌─────────────▼────────────────────────────────────────┐ │
  │  │  Snapshot Store (e.g., every 100 ops or 30s)         │ │
  │  │  Op Log (append-only, per doc)                       │ │
  │  └──────────────────────────────────────────────────────┘ │
  └────────────────────────────────────────────────────────────┘

  Presence channel (separate, throttled):
  User A cursor pos → broadcast → User B renders remote cursor
```

**Key insight:** The editor UI never waits for the network. Local operations are applied to the document model immediately (optimistic). The WS session then sends the op and receives acknowledgment with the server-assigned sequence number.

---

### What the client does (core mechanics)

#### 1. Operational Transform (OT) — the classic approach

OT transforms concurrent operations so they commute regardless of order.

```typescript
type InsertOp = { type: 'insert'; pos: number; text: string; clientSeq: number };
type DeleteOp = { type: 'delete'; pos: number; length: number; clientSeq: number };
type Op = InsertOp | DeleteOp;

// Core transform: given op A that the client sent, and op B that the
// server applied before A (which the client didn't know about yet),
// return A' that is correct against the post-B document.
function transform(a: Op, b: Op): Op {
  if (a.type === 'insert' && b.type === 'insert') {
    // If B inserted before or at A's position, shift A right
    if (b.pos <= a.pos) {
      return { ...a, pos: a.pos + b.text.length };
    }
    return a;
  }

  if (a.type === 'insert' && b.type === 'delete') {
    if (b.pos < a.pos) {
      // B deleted text before A's insertion point — shift A left
      const overlap = Math.min(b.pos + b.length, a.pos) - b.pos;
      return { ...a, pos: a.pos - overlap };
    }
    return a;
  }

  if (a.type === 'delete' && b.type === 'insert') {
    if (b.pos <= a.pos) {
      return { ...a, pos: a.pos + b.text.length };
    }
    return a;
  }

  if (a.type === 'delete' && b.type === 'delete') {
    // Overlapping deletes need careful handling — simplify here
    if (b.pos + b.length <= a.pos) {
      return { ...a, pos: a.pos - b.length };
    }
    if (b.pos >= a.pos + a.length) {
      return a; // no overlap
    }
    // Partial overlap — trim A
    const newLength = Math.max(0, a.length - (Math.min(a.pos + a.length, b.pos + b.length) - Math.max(a.pos, b.pos)));
    return { ...a, length: newLength };
  }

  return a;
}
```

**Client op buffer flow:**
1. User types → create `InsertOp` with `clientSeq = localSeq++`.
2. Apply op to local document model immediately (user sees the change).
3. Add op to `pendingOps[]` buffer.
4. Send op over WebSocket.
5. Server applies its serialized queue, assigns a `serverSeq`, and echoes the op back with the server seq to the originating client, and fans out the transformed op to all other clients.
6. Client receives the ack: remove from `pendingOps[]`, record the server seq.
7. If a remote op arrives while there are pending local ops: transform the remote op through all pending ops before applying it to the local document.

#### 2. CRDT alternative with Y.js

If you want offline-first and simpler conflict resolution, Y.js (a CRDT library) handles all merge logic:

```typescript
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { QuillBinding } from 'y-quill'; // or any editor binding

const ydoc = new Y.Doc();

// Y.Text is a CRDT-aware string — concurrent inserts merge deterministically
const ytext = ydoc.getText('document-content');

// Connect to sync server — Y.js handles reconnect and catch-up automatically
const provider = new WebsocketProvider(
  'wss://sync.example.com',
  'doc-abc123', // room = document ID
  ydoc
);

// Awareness = presence (cursors, selections)
const awareness = provider.awareness;
awareness.setLocalStateField('cursor', { index: 0, length: 0 });

// Listen for remote awareness changes to render other users' cursors
awareness.on('change', () => {
  const states = Array.from(awareness.getStates().entries());
  renderRemoteCursors(states.filter(([clientId]) => clientId !== ydoc.clientID));
});

// Editor binding — local changes go into ytext; remote changes come out
const binding = new QuillBinding(ytext, quillEditor, awareness);
```

Y.js advantage: the merge is **always correct** without writing transform functions. The tradeoff is bundle size (~50 kB) and less control over conflict UX.

#### 3. WebSocket session with sequence numbers

```typescript
interface WsMessage {
  type: 'op' | 'ack' | 'snapshot' | 'catch_up' | 'presence';
  docId: string;
  clientId: string;
  serverSeq?: number;   // assigned by server on ack
  clientSeq?: number;   // local sequence from originating client
  op?: Op;
  snapshot?: DocSnapshot;
  ops?: Op[];           // catch-up replay
}

class DocSession {
  private ws: WebSocket;
  private pendingOps: Op[] = [];
  private serverSeq = 0;

  sendOp(op: Op) {
    this.pendingOps.push(op);
    this.ws.send(JSON.stringify({ type: 'op', op, clientSeq: op.clientSeq }));
  }

  onMessage(msg: WsMessage) {
    if (msg.type === 'ack') {
      // Our op was accepted — remove from pending
      this.pendingOps = this.pendingOps.filter(o => o.clientSeq !== msg.clientSeq);
      this.serverSeq = msg.serverSeq!;
    }

    if (msg.type === 'op') {
      // Remote op from another client — transform against our pending ops
      let remoteOp = msg.op!;
      for (const pending of this.pendingOps) {
        remoteOp = transform(remoteOp, pending);
      }
      applyToDocument(remoteOp);
      this.serverSeq = msg.serverSeq!;
    }

    if (msg.type === 'catch_up') {
      // Reconnect path — replay ops we missed
      for (const op of msg.ops!) {
        applyToDocument(op);
      }
      this.serverSeq = msg.serverSeq!;
    }
  }
}
```

#### 4. Reconnect with snapshot and catch-up

```
Reconnect flow:
                    Client                      Server
                      │                           │
                      │── WS connect ────────────▶│
                      │                           │
                      │── { type: "join",         │
                      │    docId,                 │
                      │    lastSeq: 142 } ───────▶│
                      │                           │
                      │   If (serverSeq - 142) < threshold (e.g. 500 ops):
                      │◀── { type: "catch_up",    │
                      │     ops: [143..current],  │
                      │     serverSeq: 189 } ─────│
                      │                           │
                      │   Else (too far behind):  │
                      │◀── { type: "snapshot",    │
                      │     doc: { ... },         │
                      │     serverSeq: 189 } ─────│
                      │                           │
                      │  (resend any pending      │
                      │   local ops from buffer)  │
                      │── { type: "op", ... } ───▶│
```

```typescript
function onReconnect(lastKnownSeq: number) {
  ws.send(JSON.stringify({ type: 'join', docId, lastSeq: lastKnownSeq }));
}

// Server decides: small gap → send delta ops; large gap → send snapshot
// Client handles both cases:
function handleReconnectResponse(msg: WsMessage) {
  if (msg.type === 'snapshot') {
    resetDocumentFromSnapshot(msg.snapshot!);
    serverSeq = msg.serverSeq!;
  } else if (msg.type === 'catch_up') {
    for (const op of msg.ops!) {
      applyToDocument(op);
    }
    serverSeq = msg.serverSeq!;
  }
  // Re-send pending ops (they may be transformed by server)
  pendingOps.forEach(op => ws.send(JSON.stringify({ type: 'op', op })));
}
```

#### 5. Presence / cursor broadcasting

```typescript
// Throttle cursor broadcasts — no need to send on every keystroke
const broadcastCursor = throttle((index: number, length: number) => {
  ws.send(JSON.stringify({
    type: 'presence',
    cursor: { index, length },
    userId,
    color: userColor,
  }));
}, 100); // max 10 updates/sec

// On selection change in the editor
editor.on('selection-change', (range) => {
  if (range) broadcastCursor(range.index, range.length);
});

// Render remote cursors as overlays — purely decorative, no document state
function renderRemoteCursor(userId: string, index: number, color: string) {
  const pos = editor.getBounds(index);
  cursorOverlays[userId].style.transform = `translate(${pos.left}px, ${pos.top}px)`;
  cursorOverlays[userId].style.borderColor = color;
}
```

---

### Trade-offs

| Decision | OT | CRDT (e.g. Y.js) | Recommendation |
|---|---|---|---|
| Implementation complexity | High — transform functions for every op pair | Low — library handles it | CRDT for new projects; OT if you need precise conflict semantics |
| Offline support | Hard — requires central server to serialize | Native — merge on reconnect | CRDT wins for offline |
| Bundle size | Small (your own code) | ~50 kB for Y.js | OT if bundle is critical |
| Undo semantics | Local undo is well-defined | Shared undo is complex in CRDTs | Scope undo to local user only in both cases |
| Server complexity | Server must apply transforms, maintain op log | Server is mostly a relay + persistence | CRDT simplifies the server significantly |

| Decision | Option A | Option B | Notes |
|---|---|---|---|
| Single `contenteditable` | Simple DOM, hard to control | — | Hard to virtualize, re-renders whole doc |
| Block-based model | Isolate re-renders per block | More complex model | Recommended — React re-renders only changed blocks |
| WebSocket vs polling | Low latency, stateful | Simple, stateless | WebSocket required for real-time collaboration |
| Snapshot frequency | Every 100 ops — fast reconnect | Every 1000 ops — less I/O | Tune based on op size and reconnect SLA |
| Client-side rendering | Immediate local feedback | — | Required — never wait for server to show typing |

---

### Failure modes & degradation

- **WS disconnect:** Switch to a read-only "offline" banner immediately. Buffer outgoing ops in memory (cap at ~500 ops before warning). On reconnect, replay buffer via catch-up or snapshot.
- **Snapshot divergence:** If the client's local document hash doesn't match the server snapshot hash after catch-up, offer "Save a copy" to download the local buffer, then hard-reset to server state. Never silently overwrite.
- **Long offline period (> 30 min):** Don't attempt catch-up over thousands of ops — just send a snapshot and ask the user to merge manually if there are pending local changes.
- **Op processing error:** If a received op produces an invalid document state (detected via invariant checks), log to telemetry, roll back to last known good snapshot, and show a "document restored" message.
- **Presence ghost cursors:** If a user disconnects without a clean close, their cursor lingers. Implement a TTL on presence state (30s without heartbeat → remove cursor).

---

### Accessibility checklist

- The editing area must be a proper `contenteditable` or use a library that exposes ARIA roles — not a `<div>` with keyboard listeners only.
- Toolbar buttons are actual `<button>` elements with `aria-label` and `aria-pressed` for toggle states (bold, italic).
- Screen reader users need announcements for when a collaborator joins or makes a major structural change — use a visually hidden `aria-live="polite"` region for "Ana joined the document."
- Cursor overlays (remote presence) are purely visual — never add them to the accessibility tree (`aria-hidden="true"`).
- Keyboard shortcuts are documented and discoverable via a help modal (`?` key convention).
- Focus trap in modals (e.g., share dialog, comment thread) using a focus trap utility.

---

### Minute summary (closing)

"I'd build the editor on a block-based model where local operations apply instantly to the DOM — typing never waits for the network. Operations are sent over a long-lived WebSocket with client sequence numbers. For the concurrency model, I'd reach for Y.js (CRDT) unless the team needs OT for specific conflict UX. Reconnect is handled by a snapshot + catch-up delta from the server, and any pending local ops from the buffer are re-sent. Presence is a separate throttled broadcast channel. The golden rule is: no silent data loss — if the doc state can't be reconciled, we offer the user a copy of their unsynced buffer before resetting."

---

## For a ~60 minute round

### Suggested time boxes

| Block | Minutes | Focus |
|-------|--------:|--------|
| Clarify + requirements | 8–12 | Rich text vs blocks, comments, offline, concurrent users scale |
| High-level architecture | 12–18 | Document model, session transport, persistence sketch |
| Deep dive 1 | 12–18 | **OT vs CRDT** (high level) + client responsibilities |
| Deep dive 2 | 12–18 | **Reconnect / snapshot** or **presence** or **editor perf** |
| Trade-offs, failure, metrics | 8–12 | Conflict UX, typing latency SLOs |

### What to draw (whiteboard)

- **Blocks array** with stable IDs; visible slice rendered; out-of-viewport blocks are placeholder heights.
- **WS session:** client op → server serializes → assigns seq → acks to sender → fans out to others.
- **Reconnect:** last known seq → server checks gap → sends snapshot or delta ops → client applies → client replays pending buffer.
- **Presence:** separate lightweight channel, throttled 10 updates/sec, TTL-based cleanup.

### Deep dives — pick 2

**A. Concurrency model** — Explain OT transform function with concrete insert+insert example. Explain why client-side pending op buffer is essential. Then contrast with CRDT — no transform needed, but the data structure is larger and undo is trickier. Position: CRDT is the modern default.

**B. Performance** — Per-block React components prevent whole-doc re-renders. Use `React.memo` on block components keyed by block ID and version. Measure `input` event to `commit` latency with `PerformanceObserver`. Web Worker for spell-check so it never blocks the main thread. Avoid storing large doc in component state — keep it in a ref-based model store.

**C. Reconnect** — Detail the sequence gap threshold decision. Explain duplicate op idempotency (ops are idempotent by server seq: if you receive the same serverSeq twice, skip). The "save copy before reset" UX pattern for unsynced local changes.

**D. Presence & comments** — Anchor comment threads to a block ID + character offset, not a raw index (raw indices break when the doc changes). Throttle cursor to 100ms. In large rooms (50+ viewers), switch to "N people viewing" badge instead of rendering 50 cursors.

### Common follow-ups

- **"Offline-aware?"** — Buffer ops locally in IndexedDB (not just memory — page reload loses memory). On reconnect, replay from IndexedDB. Risk: if offline too long, catch-up becomes a full snapshot reset. V1 could be read-only offline with a "reconnecting" banner.
- **"Paste from Word?"** — Use the `ClipboardEvent` API to intercept paste. Strip disallowed HTML with a sanitizer (DOMPurify). Convert Word-specific elements (e.g. `<w:p>`) to your block schema. Progressive enhancement: if clipboard API is unavailable, accept plain text.
- **"Permissions within doc?"** — Block-level edit access is a server concern. The server validates every incoming op against a permission map. The client shows sections as read-only (non-contenteditable) when the user lacks edit access. Never rely on client-side read-only styling as the security boundary.

### What you'd measure

- **Latency:** keystroke → DOM render (should be < 1 frame, 16ms). Op send → remote client render (target < 200ms p95).
- **Reliability:** reconnect success rate, merge conflict rate, data loss incidents (target zero — alert on any).
- **Collaboration health:** concurrent author count per doc vs error rate (more authors = higher conflict rate — monitor regression).
- **Presence quality:** stale cursor rate (cursors not cleaned up after disconnect).
