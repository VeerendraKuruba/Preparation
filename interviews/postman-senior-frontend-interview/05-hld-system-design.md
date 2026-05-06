# HLD & System Design — Postman

> Round 4. Confirmed questions: notification system, chat service, scheduled jobs with 100% guarantee. Postman-specific angle: design an offline-first API client, design WebSocket at scale. Use the RADIO framework.

---

## RADIO Framework for Postman

```
R — Requirements (5 min)
  - Scale: how many users, events/sec?
  - Reliability: delivery guarantee? at-least-once vs exactly-once?
  - Offline behavior? (Postman is offline-first)
  - Real-time vs near-real-time?
  - API design: REST, WebSocket, SSE?

A — Architecture
  - Services + data stores
  - Communication patterns (sync REST vs async pub/sub)

D — Data model
  - Entity schemas
  - Partitioning / sharding strategy

I — Interface
  - API design (endpoints, request/response shapes)
  - Client-side component hierarchy

O — Optimizations & Edge Cases
  - Failure handling
  - Rate limiting
  - Idempotency
```

---

## 1. Design a Notification System

**The prompt:** Design a system that sends notifications to users across email, push, and in-app channels.

---

### R — Requirements

**Functional:**
- Send notifications via 3 channels: in-app (real-time), push (mobile), email
- Notification types: request completed, collection shared, workspace invite, monitor failure
- Users can configure preferences: which events trigger which channels
- Mark as read; notification history (last 30 days)

**Non-functional:**
- 10M users, average 50 notifications/day per active user
- In-app: near real-time (< 2 seconds)
- Push: < 30 seconds
- Email: < 5 minutes
- At-least-once delivery (prefer deliver twice over miss once)
- Scalable to 500K notification events/second at peak

---

### A — Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Event Sources                                                   │
│  API Server  ·  Collection Runner  ·  Monitor Service           │
└──────────────────────┬──────────────────────────────────────────┘
                       │ publish event
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Message Queue (Kafka / SQS)                                      │
│  Topic: notification-events (partitioned by user_id)             │
└──────────────┬───────────────────────────────────────────────────┘
               │ consume
               ▼
┌──────────────────────────────────────────────────────────────────┐
│  Notification Service                                             │
│  1. Fetch user preferences from Preferences DB                   │
│  2. Fan out to relevant channels                                 │
│  3. Write to Notification DB (all notifications, for history)    │
└────┬──────────────────┬──────────────────────────────────────────┘
     │                  │                   │
     ▼                  ▼                   ▼
In-App Service    Push Service         Email Service
(WebSocket/SSE)   (FCM/APNs)           (SendGrid/SES)
     │
     ▼
Notification DB   ← read by client for history/badge count
(PostgreSQL + Redis cache for unread count)
```

---

### D — Data Model

```sql
-- notifications table
CREATE TABLE notifications (
  id           UUID PRIMARY KEY,
  user_id      UUID NOT NULL,
  type         VARCHAR(50) NOT NULL,   -- 'collection_shared', 'request_completed', etc.
  payload      JSONB,                   -- flexible per-type data
  is_read      BOOLEAN DEFAULT false,
  channel      VARCHAR(20),             -- 'in_app', 'push', 'email'
  created_at   TIMESTAMP DEFAULT NOW(),
  read_at      TIMESTAMP
);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);

-- user_notification_preferences
CREATE TABLE notification_preferences (
  user_id      UUID,
  event_type   VARCHAR(50),
  email        BOOLEAN DEFAULT true,
  push         BOOLEAN DEFAULT true,
  in_app       BOOLEAN DEFAULT true,
  PRIMARY KEY (user_id, event_type)
);
```

---

### I — Interface (API)

```
GET  /notifications?limit=20&cursor={cursor}&unread=true
POST /notifications/{id}/read
POST /notifications/read-all
GET  /notifications/count              → { unread: 7 }

WebSocket: wss://notify.postman.com/ws
  Client → Server: { type: 'SUBSCRIBE', userId: '...' }
  Server → Client: { type: 'NOTIFICATION', notification: { id, type, payload, createdAt } }
```

---

### O — Optimizations

| Problem | Solution |
|---------|----------|
| Fan-out for viral workspace invites (1 user → 1000 members) | Limit fan-out inline; use background workers for large fan-out |
| Unread count inconsistency | Cache unread count in Redis, invalidate on mark-read |
| WebSocket connection drops | Client reconnects with `Last-Event-ID` (SSE) or cursor (WS) to replay missed |
| Email delivery failure | Retry queue with exponential backoff; dead-letter queue after 5 failures |
| Notification storm | Debounce: batch monitor failure notifications (30s window, then send digest) |

---

## 2. Design a Chat Service

**The prompt:** Design a real-time chat system (Slack-like). Users can send messages in team channels and DMs.

---

### A — Architecture

```
Client (WebSocket) ←→ WebSocket Gateway (Bifrost-style)
                              │
                              ├─→ Message Service → PostgreSQL (messages)
                              │                  → Redis (recent messages cache)
                              │
                              ├─→ Presence Service → Redis (who's online)
                              │
                              └─→ Push Notification Service (offline users)

WebSocket Gateway:
- Horizontal scaling via Redis pub/sub
- Each server subscribes to channels the connected users are in
- Message arrives → publish to Redis → all servers receive → push to relevant clients
```

---

### D — Data Model

```typescript
interface Channel {
  id: string;
  type: 'direct' | 'group';
  members: string[];
  name?: string;           // null for DMs
  workspaceId: string;
}

interface Message {
  id: string;
  channelId: string;
  senderId: string;
  text: string;
  attachments?: Attachment[];
  replyTo?: string;        // thread support
  createdAt: number;
  editedAt?: number;
  deletedAt?: number;      // soft delete
}
```

---

### Key Design Decisions

**Message ordering:**
> "Use a monotonically increasing sequence number per channel (not global). Client renders by sequence. When a client reconnects, it sends `lastSeq` and the server replays missed messages. This handles brief disconnections without reloading all history."

**Read receipts:**
> "Store `last_read_message_id` per user per channel. When user views a channel, send a read receipt. Unread count = messages after `last_read_message_id`. Don't calculate in real-time — batch-compute during reads."

**Typing indicators:**
> "Don't store in DB — pure WebSocket. User sends `TYPING` every 3 seconds while typing. All channel members receive it. Client shows 'X is typing...' and clears after 5 seconds without a new TYPING event. Ephemeral — no persistence needed."

---

## 3. Design Scheduled Jobs with 100% Guarantee (Confirmed)

**The prompt:** Design a system for scheduling API requests to run at a fixed interval (Postman Monitors). Guarantee: no job is missed, even if a server crashes.

---

### Key Insight

> "The core challenge is distributed scheduling: how do we ensure every scheduled job fires exactly once (or at-least-once), even if the scheduling server crashes? We cannot rely on in-memory timers — a crash loses all pending timers. The solution is to persist schedules in a database and use a polling/lease mechanism."

---

### Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Job Scheduler Database (PostgreSQL)                              │
│  monitors table:                                                  │
│  { id, collection_id, interval_minutes, next_run_at, status,    │
│    locked_by, lock_expires_at }                                  │
└───────────────────────────────────┬──────────────────────────────┘
                                    │ poll every 30 seconds
┌──────────────────────────────────────────────────────────────────┐
│  Scheduler Workers (multiple instances for HA)                   │
│  Each worker:                                                     │
│  1. SELECT monitors WHERE next_run_at <= NOW()                   │
│     AND (locked_by IS NULL OR lock_expires_at < NOW())           │
│     FOR UPDATE SKIP LOCKED   ← advisory lock, skip other workers │
│  2. Set locked_by = worker_id, lock_expires_at = NOW() + 5min   │
│  3. Push job to queue                                            │
│  4. Update next_run_at = NOW() + interval_minutes               │
│  5. Clear lock                                                   │
└──────────────────────────────────────────────────────────────────┘
                  │
                  ▼
     Job Queue (SQS / Kafka)
                  │
                  ▼
     Collection Runner Workers
     (execute the API collection, record results)
```

---

### Key SQL Pattern: Distributed Lock

```sql
-- Atomic claim of a due job (skips jobs locked by other workers)
WITH claimed AS (
  SELECT id FROM monitors
  WHERE next_run_at <= NOW()
    AND (locked_by IS NULL OR lock_expires_at < NOW())
  ORDER BY next_run_at
  LIMIT 10
  FOR UPDATE SKIP LOCKED
)
UPDATE monitors
SET
  locked_by = $worker_id,
  lock_expires_at = NOW() + INTERVAL '5 minutes',
  status = 'running'
WHERE id IN (SELECT id FROM claimed)
RETURNING *;
```

**Why `FOR UPDATE SKIP LOCKED`?**
> "If two workers run this query simultaneously, `FOR UPDATE` would have the second worker block waiting for the first to release. `SKIP LOCKED` makes the second worker skip those rows and claim the next available ones. This prevents double-execution."

---

### Handling Failures

| Scenario | Solution |
|----------|---------|
| Worker crashes mid-execution | `lock_expires_at` expires → next poll picks it up again |
| Job fails (API unreachable) | Worker releases lock, increments retry_count, reschedules |
| Database down | Job queue already has the work — queue processes it; DB updated when back online |
| Clock skew between workers | Use DB server time (`NOW()`) not worker local time for `next_run_at` |
| Duplicate execution (at-least-once) | Runner uses `run_id` as idempotency key; DB upserts results |

---

## 4. Design Postman's Offline-First Architecture

**The prompt:** How would you design the Postman desktop app to work fully offline?

---

### Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  Postman Desktop (Electron)                                     │
│                                                                │
│  React UI                                                      │
│       ↕ reads/writes                                          │
│  Local Data Layer (IndexedDB via Dexie.js)                    │
│  ┌──────────────────────────────────────────────┐             │
│  │  Collections  │  Environments  │  History    │             │
│  └──────────────────────────────────────────────┘             │
│       ↕ sync (when online)                                    │
│  Sync Engine                                                   │
│  ┌──────────────────────────────────────────────┐             │
│  │  Outbox (pending changes)                    │             │
│  │  Conflict Resolver (last-write-wins or CRDT) │             │
│  └──────────────────────────────────────────────┘             │
│                  ↕ HTTPS                                       │
└────────────────────────────────────────────────────────────────┘
                  ↕
         Postman Cloud API
```

---

### Sync Strategy

```typescript
// Outbox pattern: queue local changes, sync when online
interface OutboxEntry {
  id: string;
  entityType: 'collection' | 'request' | 'environment';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: unknown;
  createdAt: number;
  retries: number;
}

class SyncEngine {
  private isOnline = navigator.onLine;

  constructor(private db: Dexie, private api: PostmanAPI) {
    window.addEventListener('online', () => this.startSync());
    window.addEventListener('offline', () => { this.isOnline = false; });
  }

  async write(entry: Omit<OutboxEntry, 'id' | 'createdAt' | 'retries'>) {
    // 1. Write to local DB immediately (offline-first — never fail the user)
    await this.db.table(entry.entityType + 's').put(entry.payload);

    // 2. Add to outbox for eventual sync
    await this.db.outbox.add({
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      retries: 0,
    });

    if (this.isOnline) this.startSync();
  }

  async startSync() {
    this.isOnline = true;
    const pending = await this.db.outbox.orderBy('createdAt').toArray();

    for (const entry of pending) {
      try {
        await this.syncEntry(entry);
        await this.db.outbox.delete(entry.id);
      } catch (err) {
        if (entry.retries >= 3) {
          await this.db.outbox.update(entry.id, { status: 'failed' });
        } else {
          await this.db.outbox.update(entry.id, { retries: entry.retries + 1 });
        }
      }
    }
  }

  private async syncEntry(entry: OutboxEntry) {
    switch (entry.operation) {
      case 'create': return this.api.create(entry.entityType, entry.payload);
      case 'update': return this.api.update(entry.entityType, entry.entityId, entry.payload);
      case 'delete': return this.api.delete(entry.entityType, entry.entityId);
    }
  }
}
```

---

## Opening the Design Interview

> "Before I start designing, I want to clarify scope.
>
> For scale: are we designing for Postman's actual scale — 100 million developers, or a smaller internal MVP?
>
> For the notification system specifically: when you say 100% guarantee, do you mean at-least-once (simpler, may duplicate) or exactly-once (much harder)? Most production systems use at-least-once with idempotent consumers.
>
> And: is this a greenfield design or are there existing services I'm building on top of?
>
> Great. Let me sketch the high-level components first, then we can go deep on whichever part interests you most."
