# 24. Design a Real-Time Notification System

## Clarifying Questions

1. **In-app only or also push (background)?** In-app (bell icon, toast) only requires WebSocket or SSE. Background notifications when the browser is closed require the Push API + service worker + FCM/APNs.
2. **Notification types** — informational alerts, action-required items (approve/reject buttons), or both? Action buttons require the UI to handle distinct event payloads per type.
3. **Grouping** — "5 new comments on your PR" grouped vs 5 separate notifications? Server-side grouping is simpler; client-side grouping allows more UI flexibility.
4. **Volume** — 10 notifications/day per user (low, polling is fine) or 1000+/day (requires efficient store + pagination)?
5. **Multi-tab / multi-device** — If the user has the app open in two tabs, does marking-as-read in one tab update the other? This requires a BroadcastChannel or server-fan-out.
6. **Retention** — How far back does the user's notification history go? 30 days? Affects the initial load query.

Assume for this answer: in-app + browser push (FCM), action buttons on some types, server-side grouping, moderate volume (~50/day), multi-tab sync via BroadcastChannel, 30-day retention.

---

## Architecture Diagram

```
Browser Tab
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌───────────────┐    ┌──────────────────────────────────┐  │
│  │  Bell Icon    │    │  Toast Manager                   │  │
│  │  [Badge: 3]   │    │  (ephemeral, auto-dismiss)       │  │
│  └───────┬───────┘    └──────────────┬───────────────────┘  │
│          │ click                     │ new notification      │
│          ▼                           │                       │
│  ┌───────────────────┐               │                       │
│  │  Notification     │◄──────────────┘                       │
│  │  Drawer / Panel   │                                       │
│  │  (history + mark) │                                       │
│  └───────────────────┘                                       │
│          │                                                   │
│          ▼                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Notification Store (Zustand / Redux)                │   │
│  │  {                                                   │   │
│  │    byId: { [id]: Notification },                     │   │
│  │    orderedIds: string[],                             │   │
│  │    unreadCount: number                               │   │
│  │  }                                                   │   │
│  └─────────────────────┬────────────────────────────────┘   │
│                        │                                     │
│   ┌────────────────────▼──────────────────────────┐         │
│   │  WebSocket Connection Manager                 │         │
│   │  - Auth token on handshake                    │         │
│   │  - Heartbeat ping every 30s                   │         │
│   │  - Exponential backoff on disconnect          │         │
│   └─────────────────────┬─────────────────────────┘         │
└─────────────────────────┼────────────────────────────────────┘
                          │ ws://api/notifications?token=...
                          ▼
             ┌────────────────────────┐
             │  Notification Service  │
             │  (WebSocket server)    │
             └────────────┬───────────┘
                          │
             ┌────────────▼───────────┐
             │  Message Broker        │
             │  (Redis Pub/Sub or     │
             │   Kafka)               │
             └────────────────────────┘

Service Worker (background)
┌─────────────────────────────────────┐
│  push event → show notification     │
│  notificationclick → focus tab      │
│  or open URL                        │
└─────────────────────────────────────┘
```

---

## Core Mechanics

### 1. WebSocket Connection Manager

The connection manager is a singleton — one WS connection per tab, not per component. It handles auth on the handshake URL, sends periodic heartbeats so load balancers do not terminate idle connections, and reconnects with exponential backoff on disconnect.

```typescript
// lib/NotificationSocket.ts
type MessageHandler = (notification: Notification) => void;

class NotificationSocketManager {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private maxDelay = 30_000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private intentionallyClosed = false;

  connect(authToken: string) {
    this.intentionallyClosed = false;
    this.ws = new WebSocket(
      `wss://api.example.com/ws/notifications?token=${authToken}`
    );

    this.ws.onopen = () => {
      this.reconnectDelay = 1000; // reset backoff on successful connect
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'pong') return; // heartbeat response
      if (message.type === 'notification') {
        this.handlers.forEach(h => h(message.payload));
      }
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (!this.intentionallyClosed) {
        setTimeout(() => this.connect(authToken), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close(); // triggers onclose → reconnect logic
    };
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler); // unsubscribe
  }

  disconnect() {
    this.intentionallyClosed = true;
    this.stopHeartbeat();
    this.ws?.close();
  }
}

export const notificationSocket = new NotificationSocketManager();
```

The `intentionallyClosed` flag distinguishes a logout (do not reconnect) from a network drop (reconnect with backoff).

---

### 2. Notification Store — Idempotent Inserts

The store shape is `{ byId, orderedIds, unreadCount }`. Inserting by `id` is idempotent — receiving the same notification twice (e.g., from the initial HTTP load AND the WebSocket) does not duplicate it.

```typescript
// store/notificationStore.ts (Zustand)
import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'comment' | 'mention' | 'approval_request' | 'system';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface NotificationState {
  byId: Record<string, Notification>;
  orderedIds: string[];  // sorted newest first
  unreadCount: number;
  // Actions
  addNotification: (n: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  loadInitial: (notifications: Notification[], serverUnreadCount: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  byId: {},
  orderedIds: [],
  unreadCount: 0,

  addNotification: (n) => set((state) => {
    if (state.byId[n.id]) return state; // idempotent — already exists
    return {
      byId: { ...state.byId, [n.id]: n },
      orderedIds: [n.id, ...state.orderedIds], // prepend (newest first)
      unreadCount: n.read ? state.unreadCount : state.unreadCount + 1,
    };
  }),

  markRead: (id) => set((state) => {
    const notification = state.byId[id];
    if (!notification || notification.read) return state; // already read
    return {
      byId: { ...state.byId, [id]: { ...notification, read: true } },
      unreadCount: Math.max(0, state.unreadCount - 1),
    };
  }),

  markAllRead: () => set((state) => {
    const updated = Object.fromEntries(
      Object.entries(state.byId).map(([id, n]) => [id, { ...n, read: true }])
    );
    return { byId: updated, unreadCount: 0 };
  }),

  loadInitial: (notifications, serverUnreadCount) => set(() => ({
    byId: Object.fromEntries(notifications.map(n => [n.id, n])),
    orderedIds: notifications.map(n => n.id), // already sorted newest first from API
    unreadCount: serverUnreadCount, // trust server count, don't recount
  })),
}));
```

**Why trust the server unread count?** Counting `filter(n => !n.read).length` on the client is only accurate for the notifications loaded in the current page. The user may have 200 unread notifications but only the first 20 are loaded. The server count is authoritative.

---

### 3. Badge Count — Server + WS Increments

```tsx
// components/NotificationBell.tsx
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '../store/notificationStore';
import { notificationSocket } from '../lib/NotificationSocket';
import { useAuthToken } from '../hooks/useAuth';

export function NotificationBell() {
  const { addNotification, loadInitial, unreadCount } = useNotificationStore();
  const authToken = useAuthToken();

  // 1. Load initial notifications + server unread count on mount
  const { data } = useQuery({
    queryKey: ['notifications', 'initial'],
    queryFn: async () => {
      const res = await fetch('/api/notifications?limit=20');
      return res.json() as Promise<{ notifications: Notification[]; unreadCount: number }>;
    },
  });

  useEffect(() => {
    if (data) loadInitial(data.notifications, data.unreadCount);
  }, [data, loadInitial]);

  // 2. Subscribe to WebSocket for new notifications
  useEffect(() => {
    notificationSocket.connect(authToken);
    const unsub = notificationSocket.subscribe(addNotification);
    return () => {
      unsub();
      notificationSocket.disconnect();
    };
  }, [authToken, addNotification]);

  return (
    <button aria-label={`${unreadCount} unread notifications`}>
      <BellIcon />
      {unreadCount > 0 && (
        <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
      )}
    </button>
  );
}
```

---

### 4. Toast for Ephemeral + Drawer for History — Two Consumers, One Store

Both the toast manager and the notification drawer read from the same Zustand store. The toast manager additionally needs to "pop" new arrivals as they come in — it subscribes to the WebSocket handler independently and auto-dismisses after 5 seconds.

```tsx
// components/ToastManager.tsx
import { useEffect, useState } from 'react';
import { notificationSocket } from '../lib/NotificationSocket';

export function ToastManager() {
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);

  useEffect(() => {
    const unsub = notificationSocket.subscribe((notification) => {
      setActiveToasts(prev => [...prev, notification]);
      setTimeout(() => {
        setActiveToasts(prev => prev.filter(t => t.id !== notification.id));
      }, 5000); // auto-dismiss
    });
    return unsub;
  }, []);

  return (
    <div className="toast-container" aria-live="polite">
      {activeToasts.map(toast => (
        <Toast key={toast.id} notification={toast} onDismiss={() =>
          setActiveToasts(prev => prev.filter(t => t.id !== toast.id))
        } />
      ))}
    </div>
  );
}

// NotificationDrawer.tsx — reads from store, not from socket directly
import { useNotificationStore } from '../store/notificationStore';

export function NotificationDrawer() {
  const { byId, orderedIds } = useNotificationStore();
  const notifications = orderedIds.map(id => byId[id]);

  return (
    <aside className="notification-drawer">
      {notifications.map(n => (
        <NotificationItem key={n.id} notification={n} />
      ))}
    </aside>
  );
}
```

---

### 5. Mark-as-Read — Optimistic + Scroll-Based

**Optimistic single read**: update store immediately, fire API call in background, rollback on failure.

```typescript
async function markNotificationRead(id: string) {
  const { markRead, byId } = useNotificationStore.getState();
  const previous = byId[id];

  markRead(id); // optimistic update

  try {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  } catch {
    // rollback
    useNotificationStore.setState(state => ({
      byId: { ...state.byId, [id]: previous },
      unreadCount: state.unreadCount + 1,
    }));
  }
}
```

**Scroll-based read with IntersectionObserver** — notifications are marked read when they become visible in the drawer, not just when the drawer opens:

```tsx
function NotificationItem({ notification }: { notification: Notification }) {
  const ref = useRef<HTMLDivElement>(null);
  const markRead = useNotificationStore(s => s.markRead);

  useEffect(() => {
    if (notification.read) return; // already read, no observer needed
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          markRead(notification.id);          // optimistic store update
          markNotificationRead(notification.id); // API call
          observer.disconnect();               // only fire once
        }
      },
      { threshold: 0.5 } // at least 50% visible
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [notification.id, notification.read, markRead]);

  return <div ref={ref} className={notification.read ? '' : 'unread'}>...</div>;
}
```

**Bulk mark-all-read**: one API call, optimistic full update:

```typescript
async function markAllNotificationsRead() {
  useNotificationStore.getState().markAllRead(); // optimistic
  await fetch('/api/notifications/read-all', { method: 'POST' });
}
```

---

### 6. Browser Push API — Background Notifications

When the user closes the tab, WebSocket disconnects. The Push API (via FCM/APNs) delivers notifications to a service worker that can show a system notification.

```typescript
// lib/pushRegistration.ts
export async function registerPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const registration = await navigator.serviceWorker.register('/sw.js');
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(process.env.VAPID_PUBLIC_KEY!),
  });

  // Send subscription to backend so it can push via FCM
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
}
```

```javascript
// public/sw.js — service worker push handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'New Notification', {
      body: data.body,
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge.png',
      data: { url: data.actionUrl },
      actions: data.actions ?? [], // e.g., [{ action: 'approve', title: 'Approve' }]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      const existingTab = windowClients.find(c => c.url.includes(url));
      if (existingTab) return existingTab.focus();
      return clients.openWindow(url);
    })
  );
});
```

---

### 7. Sync on Reconnect — Catching Missed Notifications

When the WebSocket reconnects (network drop, tab comes back to foreground), there may be notifications that arrived during the gap. Fetch them using a `since` parameter based on the last notification ID seen.

```typescript
// In NotificationSocketManager.onopen handler:
this.ws.onopen = async () => {
  this.reconnectDelay = 1000;
  this.startHeartbeat();

  // Sync missed notifications
  const { orderedIds } = useNotificationStore.getState();
  const lastSeenId = orderedIds[0]; // most recent notification we have

  if (lastSeenId) {
    const res = await fetch(`/api/notifications?since=${lastSeenId}&limit=50`);
    const { notifications, unreadCount } = await res.json();
    notifications.forEach(addNotificationToStore); // idempotent inserts
    // Optionally update unreadCount from server response
  }
};
```

The `since` parameter tells the server to return notifications newer than that ID. Because insertions to the store are idempotent by `id`, any overlap between the sync response and what the WebSocket delivered during reconnect is harmless.

**Multi-tab sync** via BroadcastChannel — when the user marks a notification read in Tab A, Tab B should reflect that:

```typescript
const bc = new BroadcastChannel('notifications');

// When marking read, broadcast to other tabs:
bc.postMessage({ type: 'MARK_READ', id });

// In each tab, listen:
bc.onmessage = (event) => {
  if (event.data.type === 'MARK_READ') {
    useNotificationStore.getState().markRead(event.data.id);
  }
};
```

---

## Trade-off Analysis

### WebSocket vs SSE

| Dimension | WebSocket | SSE |
|---|---|---|
| Direction | Bidirectional | Server → client only |
| Protocol | Upgrade to ws:// | Plain HTTP/1.1 or HTTP/2 |
| Firewall friendliness | Some proxies block WS | HTTP, rarely blocked |
| Reconnect | Manual (as shown above) | Browser handles automatically |
| Multiplexing over HTTP/2 | No — separate connection | Yes — one connection, many streams |
| Use when | Need to send from client (chat, typing indicators) | Notifications only |

**Recommendation**: For a pure notification system (server pushes, client only acknowledges), SSE is simpler and more robust. Use WebSocket when the same connection handles bidirectional data (e.g., in a chat app the notification system shares a channel with messages).

### Mark-on-Open vs Mark-on-Scroll

Mark-on-open (all notifications in the drawer are read when drawer opens) is simpler but marks items read even if the user only glanced at the badge. Mark-on-scroll is more accurate but requires IntersectionObserver on every notification item. For most products, mark-on-open is the right default. Mark-on-scroll is better for high-volume notification streams (audit logs, monitoring alerts) where the user genuinely reads items individually.

### Client Grouping vs Server Grouping

Server grouping ("5 new comments") reduces notification volume and simplifies the client store — you store one grouped notification record. Client grouping allows more flexible UI (expand/collapse group in real time as more notifications arrive). Server grouping is almost always the correct default.

---

## Closing Statement

A notification system has three distinct concerns that should not be conflated: transport (WebSocket/SSE for in-app, Push API for background), storage (a normalized idempotent store keyed by notification ID), and presentation (two independent consumers — toasts for ephemeral, drawer for history). The WebSocket connection manager handles all the reliability concerns (auth, heartbeat, backoff, reconnect sync) and the rest of the system can treat it as a reliable event source. The idempotency guarantee on the store is what makes reconnect sync, multi-tab sync, and initial load all composable without coordination — you can insert notifications from any source in any order and the UI stays correct.
