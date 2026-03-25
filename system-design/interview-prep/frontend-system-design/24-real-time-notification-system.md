# 24. Design a real-time notification system

## Transport options

- **WebSocket** bidirectional; **SSE** if server→client only; **long poll** fallback.
- Mobile/PWA: **push** via FCM/APNs for background.

## Frontend shape

- Single **connection manager** (auth, heartbeat, reconnect with backoff).
- **Inbox store** + unread counts; idempotent by **notification id**.
- **Toasts** for ephemeral, **bell drawer** for history; mark read/delivered batches.

## Reliability

Missed messages: **sync** on reconnect with `since` cursor; CRDT rarely needed.

## Security

Auth on handshake; don’t leak notifications cross-tenant; XSS-safe rendering.
