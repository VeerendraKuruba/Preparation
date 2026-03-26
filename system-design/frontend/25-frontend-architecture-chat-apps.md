# 25. Design frontend architecture for chat apps

## Layers

- **Transport**: WebSocket (typing, presence, messages) with reconnect + client message IDs for optimistic sends.
- **Message model**: normalized store `{messagesByChannelId, threads}`; timeline virtualized.
- **Optimistic UI** + **reconciliation** when server assigns timestamps/IDs.
- **Attachments**: direct-to-storage uploads with signed URLs; progress UI.
- **Search**: server-side index; client cache for recent threads.

## UX constraints

**Local-first drafts**, offline queue, dedupe on retry.

## Performance

Virtual list, thumbnail placeholders, lazy media decode; avoid rerendering whole transcript on every typing event — isolate **per-channel** subscriptions.
