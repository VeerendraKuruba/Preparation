# 25. Frontend Architecture for Chat Apps

## Clarifying Questions

1. **1:1 or group channels?** Group channels require per-channel member lists and more complex permission checks. Threads (replies to a specific message) add a second dimension to the message store.
2. **Threads?** Slack-style threads mean a message can have child messages — the store needs a `threadById` or `messagesByParentId` shape.
3. **File attachments?** Determines upload flow (presigned URL vs proxy), thumbnail generation, and progress UI.
4. **Read receipts?** Per-user per-message receipts (seen in WhatsApp) vs per-channel last-read watermark (Slack-style). The former is expensive at scale.
5. **Search?** Full-text search across message history requires server-side indexing; client only handles the query input and result display.
6. **Scale of channels / messages?** A user with 1000 channels needs virtualized channel list. A channel with 1M messages needs windowed message list.

Assume for this answer: group channels (no threads), file attachments, per-channel last-read watermark (not per-message receipts), server-side search, up to 200 channels per user, up to 50K messages per channel.

---

## Architecture Diagram

```
Browser
┌────────────────────────────────────────────────────────────────────┐
│  Shell                                                             │
│  ┌───────────────────┐   ┌──────────────────────────────────────┐ │
│  │  Channel List     │   │  Message Thread (active channel)     │ │
│  │  (virtualized)    │   │                                      │ │
│  │  [# general  3]   │   │  ┌────────────────────────────────┐  │ │
│  │  [# engineering]  │   │  │  Virtual Message List          │  │ │
│  │  [# design    1]  │   │  │  (bottom-anchored scroll)      │  │ │
│  │  ...              │   │  └─────────────────────────────┬──┘  │ │
│  └─────────┬─────────┘   │                                │      │ │
│            │             │  [Typing Indicator]            │      │ │
│            │             │  ┌──────────────────────────┐  │      │ │
│            │             │  │  Message Input + Attach  │  │      │ │
│            │             │  └──────────────────────────┘  │      │ │
│            │             └──────────────────────────────────┘     │ │
└────────────┼───────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────┐
│  Normalized Store (Zustand)                                        │
│  {                                                                 │
│    channels: { byId: {...}, allIds: [...] }                        │
│    messages: { byChannelId: { ch1: [msgId,...], ch2: [...] } }     │
│    messagesById: { msgId: Message }                                │
│    users: { byId: { userId: User } }                               │
│    drafts: { byChannelId: { ch1: "typing..." } }  (localStorage)  │
│    typingUsers: { byChannelId: { ch1: Set<userId> } }             │
│    lastReadMessageId: { byChannelId: { ch1: "msg_xyz" } }         │
│  }                                                                 │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────────────┐
│  WebSocket Manager (singleton, multiplexed)                        │
│  - One WS connection, channels subscribed via channel_id           │
│  - Auth on handshake, heartbeat, exponential backoff               │
│  - Dispatches: new_message | typing | presence | reaction          │
└──────────────────────────────┬─────────────────────────────────────┘
                               │  wss://api/ws?token=...
                               ▼
                  ┌────────────────────────┐
                  │  Chat API Server       │
                  │  POST /messages        │
                  │  GET /messages?before= │
                  │  PATCH /messages/:id   │
                  │  POST /attachments     │
                  └────────────────────────┘
```

---

## Core Mechanics

### 1. Normalized Message Store

The single most important architectural decision. A denormalized store (`{ channels: [{ id, name, messages: [...] }] }`) leads to stale data when the same user or message appears in multiple contexts. Normalization stores each entity once.

```typescript
// store/chatStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Message {
  id: string;          // server-assigned ID (or clientMessageId while optimistic)
  clientMessageId?: string; // temp ID assigned by client before server confirms
  channelId: string;
  authorId: string;
  content: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'failed';
  attachments?: Attachment[];
}

interface ChatStore {
  // Entities
  channels: { byId: Record<string, Channel>; allIds: string[] };
  messagesById: Record<string, Message>;
  messages: Record<string, string[]>; // channelId -> ordered message ids
  users: { byId: Record<string, User> };
  // UI state
  typingUsers: Record<string, Set<string>>; // channelId -> Set of userIds
  lastReadMessageId: Record<string, string>; // channelId -> messageId
  drafts: Record<string, string>; // channelId -> draft text (persisted)
  // Actions
  addMessage: (msg: Message) => void;
  reconcileMessage: (clientId: string, serverMsg: Message) => void;
  setTyping: (channelId: string, userId: string, isTyping: boolean) => void;
  setLastRead: (channelId: string, messageId: string) => void;
  setDraft: (channelId: string, text: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      channels: { byId: {}, allIds: [] },
      messagesById: {},
      messages: {},
      users: { byId: {} },
      typingUsers: {},
      lastReadMessageId: {},
      drafts: {},

      addMessage: (msg) => set((state) => {
        // Idempotent: if message already exists by id, skip
        if (state.messagesById[msg.id]) return state;

        const channelMessages = state.messages[msg.channelId] ?? [];
        return {
          messagesById: { ...state.messagesById, [msg.id]: msg },
          messages: {
            ...state.messages,
            [msg.channelId]: [...channelMessages, msg.id],
          },
        };
      }),

      // When server confirms an optimistic message, replace clientMessageId with real id
      reconcileMessage: (clientId, serverMsg) => set((state) => {
        const { [clientId]: _, ...restById } = state.messagesById;
        const channelMsgs = state.messages[serverMsg.channelId] ?? [];
        return {
          messagesById: { ...restById, [serverMsg.id]: serverMsg },
          messages: {
            ...state.messages,
            [serverMsg.channelId]: channelMsgs.map(id =>
              id === clientId ? serverMsg.id : id
            ),
          },
        };
      }),

      setTyping: (channelId, userId, isTyping) => set((state) => {
        const current = new Set(state.typingUsers[channelId]);
        isTyping ? current.add(userId) : current.delete(userId);
        return { typingUsers: { ...state.typingUsers, [channelId]: current } };
      }),

      setLastRead: (channelId, messageId) => set((state) => ({
        lastReadMessageId: { ...state.lastReadMessageId, [channelId]: messageId },
      })),

      setDraft: (channelId, text) => set((state) => ({
        drafts: { ...state.drafts, [channelId]: text },
      })),
    }),
    {
      name: 'chat-drafts',
      partialize: (state) => ({ drafts: state.drafts }), // only persist drafts
    }
  )
);
```

---

### 2. WebSocket Manager — Multiplexed, One Connection

One WS connection handles all channels. The server uses `channel_id` in the payload to route messages. The client dispatches to the correct store slice.

```typescript
// lib/ChatSocketManager.ts
import { useChatStore } from '../store/chatStore';

type WSMessage =
  | { type: 'new_message';    payload: Message }
  | { type: 'typing';         payload: { channelId: string; userId: string; isTyping: boolean } }
  | { type: 'message_update'; payload: Message }
  | { type: 'pong' };

class ChatSocketManager {
  private ws: WebSocket | null = null;
  private reconnectDelay = 1000;
  private authToken = '';

  connect(token: string) {
    this.authToken = token;
    this.ws = new WebSocket(`wss://api.example.com/ws?token=${token}`);

    this.ws.onmessage = (event) => {
      const msg: WSMessage = JSON.parse(event.data);
      const store = useChatStore.getState();

      switch (msg.type) {
        case 'new_message':
          store.addMessage(msg.payload);
          // Update unread count if not the active channel
          this.maybeIncrementUnread(msg.payload);
          break;
        case 'typing':
          store.setTyping(msg.payload.channelId, msg.payload.userId, msg.payload.isTyping);
          break;
        case 'message_update':
          // edit or reaction — update in messagesById
          useChatStore.setState(state => ({
            messagesById: { ...state.messagesById, [msg.payload.id]: msg.payload }
          }));
          break;
      }
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(this.authToken), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
    };
  }

  send(data: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private maybeIncrementUnread(message: Message) {
    // If the channel is not currently open, increment its badge
    const activeChannelId = /* from URL or UI state */ getCurrentChannelId();
    if (message.channelId !== activeChannelId) {
      useChatStore.setState(state => ({
        channels: {
          ...state.channels,
          byId: {
            ...state.channels.byId,
            [message.channelId]: {
              ...state.channels.byId[message.channelId],
              unreadCount: (state.channels.byId[message.channelId]?.unreadCount ?? 0) + 1,
            }
          }
        }
      }));
    }
  }
}

export const chatSocket = new ChatSocketManager();
```

---

### 3. Optimistic Message Send — Reconciliation on Server Confirmation

The client assigns a temporary `clientMessageId` (UUID v4), adds the message to the store immediately with `status: 'sending'`, sends it to the server, then reconciles when the server responds with the real ID.

```typescript
// hooks/useSendMessage.ts
import { v4 as uuid } from 'uuid';
import { useChatStore } from '../store/chatStore';
import { chatSocket } from '../lib/ChatSocketManager';

export function useSendMessage(channelId: string) {
  const { addMessage, reconcileMessage, setDraft } = useChatStore();
  const currentUser = useCurrentUser();

  const sendMessage = async (content: string, attachments?: Attachment[]) => {
    const clientMessageId = uuid();
    const optimisticMsg: Message = {
      id: clientMessageId, // temporary
      clientMessageId,
      channelId,
      authorId: currentUser.id,
      content,
      createdAt: new Date().toISOString(),
      status: 'sending',
      attachments,
    };

    addMessage(optimisticMsg);   // show immediately
    setDraft(channelId, '');     // clear input

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId, content, clientMessageId, attachments }),
      });

      if (!response.ok) throw new Error('Send failed');

      const serverMsg: Message = await response.json();
      // Replace temp id with real id, update status to 'sent'
      reconcileMessage(clientMessageId, { ...serverMsg, status: 'sent' });

    } catch {
      // Mark as failed — show retry UI
      useChatStore.setState(state => ({
        messagesById: {
          ...state.messagesById,
          [clientMessageId]: { ...state.messagesById[clientMessageId], status: 'failed' }
        }
      }));
    }
  };

  return sendMessage;
}
```

The server must store `clientMessageId` and check for duplicates — if the client retries on network error and the server already received the first attempt, it returns the existing message rather than inserting a duplicate.

---

### 4. Virtual List with Bottom-Anchor Scroll

The key UX challenge: when a new message arrives at the bottom and the user is reading history (scrolled up), the view must NOT jump. When the user is at the bottom, new messages should pull the view down.

```tsx
// components/MessageList.tsx
import { useEffect, useRef } from 'react';
import { VariableSizeList } from 'react-window';

interface MessageListProps {
  channelId: string;
  messages: Message[];
}

export function MessageList({ channelId, messages }: MessageListProps) {
  const listRef = useRef<VariableSizeList>(null);
  const heightCache = useRef<Record<string, number>>({});
  const isAtBottom = useRef(true);
  const prevLengthRef = useRef(messages.length);

  // Scroll to bottom when new messages arrive AND user was already at bottom
  useEffect(() => {
    const newMessageArrived = messages.length > prevLengthRef.current;
    prevLengthRef.current = messages.length;

    if (newMessageArrived && isAtBottom.current) {
      listRef.current?.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length]);

  const onScroll = ({ scrollOffset, scrollUpdateWasRequested }: any) => {
    if (scrollUpdateWasRequested) return;
    const list = listRef.current as any;
    const totalHeight = list?._outerRef?.scrollHeight ?? 0;
    const viewportHeight = list?._outerRef?.clientHeight ?? 0;
    const distanceFromBottom = totalHeight - viewportHeight - scrollOffset;
    isAtBottom.current = distanceFromBottom < 50; // within 50px of bottom
  };

  const getItemSize = (index: number) => {
    const msg = messages[index];
    return heightCache.current[msg?.id] ?? 72; // default height
  };

  return (
    <VariableSizeList
      ref={listRef}
      height={window.innerHeight - 180}
      itemCount={messages.length}
      itemSize={getItemSize}
      width="100%"
      onScroll={onScroll}
    >
      {({ index, style }) => (
        <MessageRow
          style={style}
          message={messages[index]}
          onMeasure={(h) => {
            const msg = messages[index];
            if (msg && heightCache.current[msg.id] !== h) {
              heightCache.current[msg.id] = h;
              listRef.current?.resetAfterIndex(index, false);
            }
          }}
        />
      )}
    </VariableSizeList>
  );
}
```

**Loading older messages** (scrolling up to history): trigger via IntersectionObserver on the first item, or a "Load more" button at the top. Prepend messages to the store list. Use `scrollToItem` to maintain scroll position after prepend so the view does not jump.

---

### 5. Typing Indicator — Throttled Broadcast with Timeout Cleanup

```tsx
// hooks/useTypingIndicator.ts
import { useRef, useCallback } from 'react';
import { chatSocket } from '../lib/ChatSocketManager';

export function useTypingIndicator(channelId: string) {
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const onKeyDown = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      chatSocket.send({ type: 'typing', channelId, isTyping: true });
    }
    // Reset the "stop typing" timer on every keystroke
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      chatSocket.send({ type: 'typing', channelId, isTyping: false });
    }, 2000); // 2s of silence = stopped typing
  }, [channelId]);

  return onKeyDown;
}

// Displaying typing users (per-channel, isolated render)
function TypingIndicator({ channelId }: { channelId: string }) {
  const typingUsers = useChatStore(s => s.typingUsers[channelId]);
  const users = useChatStore(s => s.users.byId);

  if (!typingUsers || typingUsers.size === 0) return null;

  const names = [...typingUsers].map(id => users[id]?.name ?? 'Someone');
  const text = names.length === 1
    ? `${names[0]} is typing…`
    : `${names.slice(0, 2).join(', ')} are typing…`;

  return <div className="typing-indicator">{text}</div>;
}
```

The typing indicator component subscribes only to `typingUsers[channelId]` — it will not re-render when messages in other channels arrive. This is a key advantage of Zustand's selector model.

---

### 6. File Attachment Upload — Presigned URL + Progress

Never proxy file uploads through your API server. Use a presigned URL from S3/GCS, upload directly from the browser, then send the resulting URL in the message.

```typescript
// hooks/useAttachmentUpload.ts
import { useState } from 'react';

interface UploadProgress { progress: number; status: 'uploading' | 'done' | 'error'; url?: string }

export function useAttachmentUpload() {
  const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});

  const uploadFile = async (file: File): Promise<string> => {
    const uploadId = crypto.randomUUID();
    setUploads(prev => ({ ...prev, [uploadId]: { progress: 0, status: 'uploading' } }));

    // 1. Get presigned URL from backend
    const { uploadUrl, fileUrl } = await fetch('/api/attachments/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
    }).then(r => r.json());

    // 2. Upload directly to storage with progress tracking
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploads(prev => ({
            ...prev,
            [uploadId]: { ...prev[uploadId], progress: e.loaded / e.total }
          }));
        }
      };
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 204) {
          setUploads(prev => ({
            ...prev, [uploadId]: { progress: 1, status: 'done', url: fileUrl }
          }));
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Upload network error'));
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });

    return fileUrl;
  };

  return { uploadFile, uploads };
}
```

For images, generate a thumbnail on the client before upload using a canvas (reduces thumbnail generation cost on the server):

```typescript
async function generateThumbnail(file: File, maxDim = 200): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(maxDim / bitmap.width, maxDim / bitmap.height, 1);
  const canvas = new OffscreenCanvas(bitmap.width * scale, bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.convertToBlob({ type: 'image/webp', quality: 0.7 });
}
```

---

### 7. Draft Persistence — Per-Channel, localStorage

Zustand's `persist` middleware with `partialize` saves only the `drafts` slice to localStorage. When the user switches channels, the input restores from the draft store.

```tsx
// components/MessageInput.tsx
import { useEffect } from 'react';
import { useChatStore } from '../store/chatStore';

export function MessageInput({ channelId }: { channelId: string }) {
  const draft = useChatStore(s => s.drafts[channelId] ?? '');
  const setDraft = useChatStore(s => s.setDraft);
  const sendMessage = useSendMessage(channelId);
  const onKeyDown = useTypingIndicator(channelId);

  // When channelId changes, the input value comes from the draft store
  // Zustand persists drafts to localStorage automatically

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage(draft);
    // setDraft is called inside sendMessage after success
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={draft}
        onChange={e => setDraft(channelId, e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Message #general"
      />
      <button type="submit">Send</button>
    </form>
  );
}
```

---

### 8. Unread Count + Scroll-to-Unread

Track `lastReadMessageId` per channel in the store. When entering a channel, find the index of that message in the list and render an "Unread messages" divider above it. Offer a "Jump to unread" button that scrolls to that index.

```tsx
function useUnreadDivider(channelId: string, messages: Message[]) {
  const lastReadId = useChatStore(s => s.lastReadMessageId[channelId]);

  const unreadStartIndex = useMemo(() => {
    if (!lastReadId) return 0;
    const idx = messages.findIndex(m => m.id === lastReadId);
    return idx === -1 ? 0 : idx + 1; // first unread is after the last-read message
  }, [messages, lastReadId]);

  return { unreadStartIndex, unreadCount: messages.length - unreadStartIndex };
}

// When the user opens a channel, scroll to unread and update lastReadMessageId
function useChannelEntryBehavior(channelId: string, listRef: React.RefObject<VariableSizeList>) {
  const { unreadStartIndex } = useUnreadDivider(channelId, messages);
  const setLastRead = useChatStore(s => s.setLastRead);

  useEffect(() => {
    if (unreadStartIndex > 0) {
      listRef.current?.scrollToItem(unreadStartIndex, 'start');
    } else {
      listRef.current?.scrollToItem(messages.length - 1, 'end');
    }

    // Mark all as read when channel is opened
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      setLastRead(channelId, lastMsg.id);
      fetch(`/api/channels/${channelId}/read`, {
        method: 'POST',
        body: JSON.stringify({ lastReadMessageId: lastMsg.id }),
      });
    }
  }, [channelId]); // re-run on channel switch
}
```

---

## Trade-off Analysis

### Normalized vs Denormalized Store

| Dimension | Normalized | Denormalized |
|---|---|---|
| Consistency | Single source of truth per entity | Same user/message can be stale in two places |
| Update complexity | Update once in `messagesById` | Must find and update all copies |
| Selector complexity | Must join ids → entities in selectors | Direct access |
| Memory | Efficient — each entity stored once | Duplicates across channels |

**Recommendation**: Normalize. The update complexity cost is real but manageable with Zustand selectors. The consistency benefit is critical for chat where the same user appears in every channel's message list.

### One WS Connection vs Per-Channel Connection

| Dimension | One multiplexed WS | Per-channel WS |
|---|---|---|
| Server overhead | Low — one handshake | High — N handshakes |
| Client code | Route by channel_id in payload | Independent handlers |
| Channel switch | No new connection | New connection per switch |
| Reconnect | One reconnect catches all channels | N reconnects |

**Recommendation**: One multiplexed connection. Per-channel WebSockets are only justified for very high-volume channels that need independent rate limiting (e.g., live trading tickers).

### Optimistic vs Pessimistic Send

| Dimension | Optimistic | Pessimistic |
|---|---|---|
| Perceived latency | Instant | Waits for server round-trip |
| Failed send UX | Must handle rollback + retry UI | Simpler — just show error |
| Duplicate risk | clientMessageId dedup required | Simpler |

**Recommendation**: Optimistic send is mandatory for a good chat UX. The failure case (retry button on a failed message) is infrequent and well-understood by users. The clientMessageId deduplication is straightforward server-side work.

---

## Closing Statement

Chat application frontend architecture is fundamentally a state management problem disguised as a UI problem. The decisions that matter most are: normalize the store so entities are never stale, multiplex the WebSocket so channel switches are free, use optimistic sends with clientMessageId deduplication so the UI feels instant, and anchor the scroll to the bottom so new messages do not disrupt reading history. Everything else — typing indicators, attachment uploads, unread counts — are additive features that plug into this foundation cleanly. I would build in this order: WebSocket connection manager, normalized store, optimistic message send, virtual list with bottom-anchor, then typing indicators and unread tracking. Draft persistence comes last because it is pure UX polish with no architectural impact.
