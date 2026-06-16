# Real-Time, WebSocket & Telephony UI — Nextiva Staff FE Q&A

> Nextiva domain: live messaging, presence, telephony, WebRTC-adjacent surfaces

---

## Q1: WebSocket vs SSE vs Long Polling

| Transport | Direction | Use case |
|-----------|-----------|----------|
| **WebSocket** | Bi-directional | Chat, presence, call signaling |
| **SSE** | Server → client | Live dashboards, notification stream |
| **Long polling** | Emulated push | Fallback behind corporate firewalls |

**Nextiva chat/inbox:** WebSocket primary; long-poll fallback.

---

## Q2: WebSocket connection lifecycle

```
CONNECTING → OPEN → (messages) → CLOSING → CLOSED
                    ↓ disconnect
              RECONNECTING (exponential backoff)
```

**Implementation essentials:**
1. **Heartbeat** — ping every 30s; if no pong in 5s, reconnect
2. **Exponential backoff + jitter** — `delay = min(base * 2^attempt + random, max)`
3. **Message queue** — buffer outgoing while disconnected; replay in order on reconnect
4. **Sync on reconnect** — request missed events since last known sequence ID
5. **Auth refresh** — reconnect with new token if JWT expired

```typescript
function getReconnectDelay(attempt: number): number {
  const base = 1000;
  const max = 30000;
  const jitter = Math.random() * 1000;
  return Math.min(base * 2 ** attempt, max) + jitter;
}
```

---

## Q3: Decouple transport from UI — event bus pattern

```typescript
// socket-layer.ts — owns connection
class RealtimeClient {
  private bus = new EventEmitter();

  constructor(private url: string) {
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onmessage = (e) => {
      const event = parseAndValidate(JSON.parse(e.data)); // Zod
      this.bus.emit(event.type, event.payload);
    };
  }

  subscribe<T>(event: string, handler: (payload: T) => void) {
    return this.bus.on(event, handler);
  }

  send(event: OutboundEvent) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    } else {
      this.outbox.push(event);
    }
  }
}

// ui-layer.ts — React hook
function useRealtimeEvent<T>(event: string, handler: (p: T) => void) {
  const client = useRealtimeClient();
  useEffect(() => client.subscribe(event, handler), [client, event, handler]);
}
```

**Benefit:** UI doesn't know about WebSocket; easy to mock in tests.

---

## Q4: Optimistic messaging

1. User sends message → generate client UUID
2. Insert into local list with `status: 'sending'`
3. Send via WebSocket
4. Server ACK → update `status: 'sent'`, replace temp ID if needed
5. Delivery/read receipts → update status via subsequent events
6. Failure → `status: 'failed'` + retry UI

```typescript
type Message = {
  id: string;
  body: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  clientId?: string; // temp ID before server ACK
};
```

---

## Q5: Presence system (who's online)

**Server model:**
- Heartbeat from client every N seconds
- Server tracks `lastSeen` per user
- Broadcast `presence.changed` events

**Client model:**
```typescript
type Presence = 'online' | 'away' | 'offline' | 'on-call';

// Debounce typing indicator — don't flood socket
const sendTyping = debounce(() => {
  socket.send({ type: 'typing', conversationId });
}, 300);
```

**Staff detail:** Use `document.visibilityState` + `navigator.onLine` to adjust presence locally before server confirms.

---

## Q6: Multi-tab synchronization

**Problem:** Agent has two tabs open; read state must sync.

**Solutions:**
| Approach | Pros | Cons |
|----------|------|------|
| `BroadcastChannel` | Simple, same origin | No Safari < 15.4 |
| `SharedWorker` | Single socket for all tabs | Complex, limited support |
| Server as source of truth | Always correct | More round-trips |

```typescript
const channel = new BroadcastChannel('nextiva-inbox');
channel.postMessage({ type: 'conversation.read', conversationId });
channel.onmessage = (e) => applyReadState(e.data);
```

---

## Q7: WebRTC basics for telephony UI (awareness)

**Components:**
- **Signaling** — WebSocket/HTTP exchanges SDP offers/answers
- **STUN** — discover public IP for NAT traversal
- **TURN** — relay when direct P2P fails
- **MediaStream** — audio/video tracks

**Frontend responsibilities:**
- Mute/unmute UI (toggle track `enabled`)
- Call state machine: `idle → ringing → connected → held → ended`
- Device selection (microphone, speaker) via `navigator.mediaDevices.enumerateDevices()`
- Handle `getUserMedia` permissions gracefully

```typescript
type CallState =
  | { phase: 'idle' }
  | { phase: 'ringing'; callId: string; direction: 'inbound' | 'outbound' }
  | { phase: 'connected'; callId: string; startedAt: Date }
  | { phase: 'held'; callId: string }
  | { phase: 'ended'; reason: string };
```

**Staff note:** You likely won't implement WebRTC from scratch — but you must design UI around async call state transitions.

---

## Q8: Incoming call notification UX

- `aria-live="assertive"` for screen readers
- Browser Notification API (with permission) for background tab
- Visual + audio ringtone (user preference)
- Accept / Decline / Send to voicemail actions
- Don't block main thread — audio via Web Audio API or `<audio>`

---

## Q9: Virtualized message list for real-time

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 72,
  overscan: 5,
});

// On new message at bottom — scrollToIndex if user was at bottom
// If user scrolled up reading history — show "New messages" pill, don't auto-scroll
```

**`overflow-anchor: auto`** — prevent scroll jump when prepending older messages.

---

## Q10: Rate limiting and backpressure on client

- Throttle typing indicators
- Batch read receipts (Intersection Observer → debounced send)
- Cap reconnection attempts; show "connection lost" UI
- Drop duplicate events (idempotent handlers by event ID)

---

## Q11: Frontend system design — real-time chat checklist

- [ ] WebSocket lifecycle (connect, heartbeat, reconnect, auth)
- [ ] Optimistic send + rollback
- [ ] Message ordering (sequence numbers / timestamps)
- [ ] Virtualized list
- [ ] Offline queue (IndexedDB)
- [ ] Multi-tab sync
- [ ] Typing indicators (debounced)
- [ ] Read receipts (batched)
- [ ] File upload (presigned URL + progress)
- [ ] Error states (connection lost banner)

---

## Q12: Security at the real-time boundary

- Validate all inbound messages with Zod
- Never trust client-sent `userId` — server assigns identity
- Sanitize message HTML (DOMPurify) if rich text
- WSS only in production (TLS)
- Token refresh without dropping queued messages
