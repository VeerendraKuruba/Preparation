# PepsiCo — Principal Frontend Engineer: System Design Round

> Status: OA ✅ | Tech Screening ✅ | DS/Algo ✅ | System Design ← You are here

---

## How to Structure Every Answer (RADIO — 60 min plan)

```
0–5 min   → R: Requirements — ask clarifying questions, define scope
5–15 min  → A: Architecture — high-level diagram, components, data flow
15–20 min → D: Data model — API contracts, DB schema, state shape
20–35 min → I: Interface — deep dive on 2–3 key components with code
35–50 min → O: Optimizations — performance, failure handling, trade-offs
50–60 min → Follow-up probes from interviewer — go where they take you
```

**Golden rule:** Never start drawing until you've asked requirements. It signals seniority.

---

---

# Design 1: WhatsApp-like Chat System (Confirmed Asked)

---

## Step 1 — Requirements Clarification (say these out loud)

> "Before I start, let me clarify scope so I focus on what matters most."

- 1:1 chat only, or group chat too? → both, groups up to 256
- Real-time delivery required, or eventual consistency OK? → real-time
- Read receipts (✓✓) and typing indicators? → yes
- Media — images, video, documents? → yes
- Offline support — queue messages when offline, send on reconnect? → yes
- Web only, or mobile too? → web focus for this interview
- Scale — 10K users or 100M? → assume large scale, 50M DAU
- Message history — how far back? → retain indefinitely

**Derived constraints:**
- 50M DAU × 30 messages/day = 1.5B messages/day = ~17K messages/sec
- Each message ~1KB → ~17MB/sec write throughput → needs distributed DB
- P99 message delivery < 200ms (real-time feel)

---

## Step 2 — High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Client (React SPA)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  ChatList    │  │  ChatWindow  │  │  WebSocketProvider │  │
│  │  (left pane) │  │  (right pane)│  │  (single conn)    │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└──────────┬──────────────────────┬───────────────────────────┘
           │ REST (auth, history) │ WebSocket (messages)
           ▼                      ▼
    ┌─────────────┐      ┌──────────────────┐
    │  REST API   │      │  WS Gateway      │ ← sticky sessions via
    │  (Node.js)  │      │  (Node.js)       │   Redis pub/sub
    └──────┬──────┘      └────────┬─────────┘
           │                      │
           ▼                      ▼
    ┌─────────────┐      ┌──────────────────┐
    │  PostgreSQL │      │  Kafka           │ ← message queue
    │  (users,    │      │  (decouple send  │
    │   rooms)    │      │   from persist)  │
    └─────────────┘      └────────┬─────────┘
                                  ▼
                         ┌──────────────────┐
                         │  Cassandra       │ ← messages (write-heavy
                         │  (messages)      │   time-series, room_id
                         └──────────────────┘   partition key)

    Redis: presence (online/offline), typing indicators, WS session map
    S3:    media storage (images, videos, documents)
```

**Why Cassandra for messages?**
Partition by `room_id`, cluster by `timestamp DESC` → O(1) fetch of latest N messages. Write throughput scales horizontally. SQL would need expensive JOINs and index scans for chat history.

---

## Step 3 — Real-Time Technology Decision

| Option | Latency | Direction | Scalability | Notes |
|---|---|---|---|---|
| **WebSocket** | ~5ms | Full-duplex | Needs sticky sessions or pub/sub | Best for chat |
| **SSE** | ~20ms | Server → Client | Easy horizontal scale | Good for typing/presence |
| Long Polling | ~500ms | Server → Client | Wasteful (constant connections) | Legacy fallback |
| Short Polling | ~1–5s | Client pull | Simple but high server load | Never for real-time |

**Decision: WebSocket for messages + SSE for presence/typing indicators**

Reasoning:
- WebSocket is the only true full-duplex option — sending messages requires client→server push
- Typing indicators and online presence are server→client only — SSE is lighter, auto-reconnects natively, no upgrade protocol needed, easy to load-balance

---

## Step 4 — WebSocket Provider (React Context)

```jsx
// Single WebSocket connection shared across the entire app
const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map()); // eventType → Set of callbacks
  const reconnectTimerRef = useRef(null);

  const connect = useCallback(() => {
    const token = getAuthToken();
    socketRef.current = new WebSocket(`wss://api.chat.com/ws?token=${token}`);

    socketRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      // Dispatch to all listeners registered for this event type
      listenersRef.current.get(message.type)?.forEach(cb => cb(message));
    };

    socketRef.current.onclose = () => {
      // Exponential backoff: 1s, 2s, 4s, 8s... cap at 30s
      const delay = Math.min(30000, 1000 * 2 ** reconnectAttempts.current++);
      const jitter = Math.random() * 1000; // avoid thundering herd
      reconnectTimerRef.current = setTimeout(connect, delay + jitter);
    };

    socketRef.current.onopen = () => {
      reconnectAttempts.current = 0;
      // Fetch missed messages since last disconnect
      flushOfflineQueue();
      syncMissedMessages();
    };
  }, []);

  useEffect(() => { connect(); return () => socketRef.current?.close(); }, [connect]);

  const send = useCallback((type, payload) => {
    const message = { type, ...payload, clientId: crypto.randomUUID() };
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      // Queue in IndexedDB for offline support
      offlineQueue.add(message);
    }
  }, []);

  const subscribe = useCallback((type, callback) => {
    if (!listenersRef.current.has(type)) listenersRef.current.set(type, new Set());
    listenersRef.current.get(type).add(callback);
    return () => listenersRef.current.get(type).delete(callback); // unsubscribe
  }, []);

  return (
    <WebSocketContext.Provider value={{ send, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}
```

---

## Step 5 — Message Send Flow with Optimistic UI

```jsx
function useChatRoom(roomId) {
  const [messages, setMessages] = useState([]);
  const { send, subscribe } = useContext(WebSocketContext);

  // Listen for incoming messages
  useEffect(() => subscribe('MESSAGE', (msg) => {
    if (msg.roomId !== roomId) return;
    setMessages(prev => {
      // Replace optimistic placeholder if clientId matches
      const idx = prev.findIndex(m => m.clientId === msg.clientId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...msg, status: 'delivered' };
        return updated;
      }
      return [...prev, msg];
    });
  }), [roomId, subscribe]);

  const sendMessage = useCallback((content) => {
    const clientId = crypto.randomUUID();
    const optimistic = {
      clientId, roomId, content,
      sender: currentUser,
      timestamp: Date.now(),
      status: 'sending', // 'sending' | 'delivered' | 'read' | 'failed'
    };

    // 1. Immediately show in UI
    setMessages(prev => [...prev, optimistic]);

    // 2. Send via WebSocket
    send('MESSAGE', { clientId, roomId, content });

    // 3. Timeout — if no ACK in 5s, mark failed
    setTimeout(() => {
      setMessages(prev => prev.map(m =>
        m.clientId === clientId && m.status === 'sending'
          ? { ...m, status: 'failed' }
          : m
      ));
    }, 5000);
  }, [roomId, send]);

  return { messages, sendMessage };
}
```

**Message status UI:**
```jsx
function MessageStatus({ status }) {
  return (
    <span className={`status status--${status}`}>
      {status === 'sending'   && '🕐'}
      {status === 'delivered' && '✓✓'}
      {status === 'read'      && <span style={{color:'blue'}}>✓✓</span>}
      {status === 'failed'    && <button onClick={retry}>↺ Retry</button>}
    </span>
  );
}
```

---

## Step 6 — Virtualized Message List (10K+ messages)

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

function MessageList({ messages, onLoadMore }) {
  const parentRef = useRef();
  const isAtBottom = useRef(true);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,        // estimated message height
    overscan: 10,                  // render 10 extra items above/below viewport
  });

  // Auto-scroll to bottom on new message, only if user was already at bottom
  useEffect(() => {
    if (isAtBottom.current) {
      virtualizer.scrollToIndex(messages.length - 1, { behavior: 'smooth' });
    }
  }, [messages.length]);

  // Detect scroll position
  const handleScroll = () => {
    const el = parentRef.current;
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    // Load history when scrolled near top
    if (el.scrollTop < 100) onLoadMore();
  };

  return (
    <div ref={parentRef} onScroll={handleScroll} style={{ overflow: 'auto', height: '100%' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => (
          <div key={item.key} style={{
            position: 'absolute', top: item.start, width: '100%', height: item.size
          }}>
            <Message data={messages[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Scroll anchor problem (prepending old messages):**
```js
// Before prepending: save scroll offset from bottom
const scrollFromBottom = el.scrollHeight - el.scrollTop;
// After prepend: restore
el.scrollTop = el.scrollHeight - scrollFromBottom;
```

---

## Step 7 — Typing Indicator

```jsx
function useTypingIndicator(roomId) {
  const { send, subscribe } = useContext(WebSocketContext);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const sendTypingRef = useRef(null);

  // Receive typing events from others
  useEffect(() => subscribe('TYPING', (event) => {
    if (event.roomId !== roomId) return;
    setTypingUsers(prev => {
      const next = new Set(prev);
      event.isTyping ? next.add(event.userId) : next.delete(event.userId);
      return next;
    });
    // Auto-clear after 3s (in case 'stop typing' event is missed)
    if (event.isTyping) {
      clearTimeout(sendTypingRef.current);
      sendTypingRef.current = setTimeout(() => {
        setTypingUsers(prev => { const next = new Set(prev); next.delete(event.userId); return next; });
      }, 3000);
    }
  }), [roomId]);

  // Send typing events — debounced to avoid spamming server
  const onInputChange = useMemo(() => debounce((value) => {
    send('TYPING', { roomId, isTyping: value.length > 0 });
  }, 300), [roomId, send]);

  return { typingUsers, onInputChange };
}

// Display: "Alice is typing..." / "Alice and Bob are typing..."
function TypingIndicator({ typingUsers }) {
  if (!typingUsers.size) return null;
  const names = [...typingUsers].slice(0, 2).join(' and ');
  const suffix = typingUsers.size > 2 ? ` and ${typingUsers.size - 2} others` : '';
  return <div className="typing">{names}{suffix} {typingUsers.size === 1 ? 'is' : 'are'} typing…</div>;
}
```

---

## Step 8 — Offline Support with IndexedDB

```js
// Service Worker queues failed requests
// sw.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/message')) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const db = await openDB('chat-offline', 1);
        await db.add('outbox', await event.request.clone().json());
        return new Response(JSON.stringify({ queued: true }), { status: 202 });
      })
    );
  }
});

// On reconnect: flush outbox
self.addEventListener('sync', (event) => {
  if (event.tag === 'flush-outbox') {
    event.waitUntil(flushOutbox());
  }
});

async function flushOutbox() {
  const db = await openDB('chat-offline', 1);
  const messages = await db.getAll('outbox');
  for (const msg of messages) {
    await fetch('/api/message', { method: 'POST', body: JSON.stringify(msg) });
    await db.delete('outbox', msg.id);
  }
}
```

---

## Step 9 — Media Upload Flow

```
User selects file
    → client validates (type, size < 100MB)
    → POST /api/upload/presign { filename, contentType }
    → server returns { uploadUrl (S3 presigned), fileId }
    → client PUTs directly to S3 (no server bandwidth cost)
    → client sends message with fileId reference
    → server stores fileId → generates CDN URL on fetch
```

```js
async function uploadMedia(file) {
  // 1. Get presigned URL from server
  const { uploadUrl, fileId } = await api.getPresignedUrl({
    filename: file.name,
    contentType: file.type,
  });

  // 2. Upload directly to S3 with progress tracking
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      const pct = Math.round((e.loaded / e.total) * 100);
      setUploadProgress(pct);
    };
    xhr.onload = resolve;
    xhr.onerror = reject;
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });

  return fileId;
}
```

---

## Step 10 — Failure Scenarios & Answers

| Failure | Detection | Recovery |
|---|---|---|
| WS disconnects | `onclose` event | Exponential backoff reconnect + sync missed messages |
| Message not ACK'd | 5s timeout on `clientId` | Mark failed, show retry button |
| Server crash mid-send | Message in Kafka but not persisted | Kafka consumer retries with idempotency key (clientId) |
| Stale state on reconnect | Compare `last_seen_ts` | Fetch `/messages?roomId=X&after=last_seen_ts` on reconnect |
| Network offline | `navigator.onLine` + offline event | Queue in IndexedDB, background sync on reconnect |
| Load balancer routes WS to different server | Session lost | Redis pub/sub: all WS servers subscribe to room channels |

---

---

# Design 2: News Feed (Facebook / Twitter Timeline)

---

## Step 1 — Requirements

- Personalized feed based on who user follows
- Post types: text, image, video
- Interactions: like, comment, share, bookmark
- Real-time: see new posts without manual refresh
- Infinite scroll, no pagination buttons
- Mobile web + desktop

**Scale assumptions:** 100M DAU, user follows avg 200 accounts, avg 2 posts/day per user → 200M posts/day

---

## Step 2 — Architecture

```
┌───────────────────────────────────────────────────────┐
│                  React Client                          │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Feed       │  │ Post         │  │ SSE client    │  │
│  │ (react-    │  │ Composer     │  │ (new post     │  │
│  │  query)    │  │              │  │  notifications)│  │
│  └────────────┘  └──────────────┘  └───────────────┘  │
└──────────────────────────┬────────────────────────────┘
                           │ HTTPS
                    ┌──────┴──────┐
                    │  API Gateway │
                    └──────┬──────┘
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌──────────┐   ┌──────────────┐   ┌──────────────┐
    │  Feed    │   │  Post        │   │  Notification│
    │  Service │   │  Service     │   │  Service     │
    └────┬─────┘   └──────┬───────┘   └──────────────┘
         │                │
    ┌────▼──────┐   ┌─────▼──────────┐
    │  Redis    │   │  Kafka         │ ← fan-out events
    │  (feed    │   │  (post events) │
    │   cache)  │   └────────────────┘
    └───────────┘
```

---

## Step 3 — Fan-Out Strategy Deep Dive

**The core problem:** When Alice (10M followers) posts, how does everyone see it?

### Option A: Fan-out on Write (Push)
When Alice posts → immediately write to all 10M followers' feed tables.

```
Alice posts → Kafka event → 10M workers each write one row to feed_user_X
```

- ✅ O(1) read: just SELECT FROM feed WHERE user_id = me ORDER BY ts DESC
- ❌ Slow writes: 10M writes per post, celebrities cause fan-out storms
- ❌ Wasted work: many followers are inactive

### Option B: Fan-out on Read (Pull)
On load, fetch posts from everyone the user follows.

```
User opens feed → SELECT posts FROM posts
  WHERE author_id IN (SELECT followee_id FROM follows WHERE follower_id = me)
  ORDER BY timestamp DESC LIMIT 20
```

- ✅ Always fresh, no precompute
- ❌ Expensive: can't do real-time join over 200 followees at scale
- ❌ High DB load during peak

### Option C: Hybrid (What Twitter / Instagram does)
- **Normal users** (< 10K followers): fan-out on write → fast reads
- **Celebrities** (> 10K followers): fan-out on read — fetched and merged at read time
- On read: merge pre-computed feed + live fetch celebrity posts → sort → return

```js
async function getFeed(userId, cursor) {
  const [precomputedFeed, followedCelebrities] = await Promise.all([
    redis.zrevrangebyscore(`feed:${userId}`, cursor, '-inf', 'LIMIT', 0, 20),
    getCelebrityPostsSince(userId, cursor), // direct DB query for celebrities
  ]);
  return mergeAndSort([...precomputedFeed, ...followedCelebrities]).slice(0, 20);
}
```

---

## Step 4 — Infinite Scroll with React Query

```jsx
import { useInfiniteQuery } from '@tanstack/react-query';

function Feed() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam = null }) =>
      fetch(`/api/feed?cursor=${pageParam}&limit=10`).then(r => r.json()),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,  // don't refetch for 30s
  });

  const sentinelRef = useRef();

  // IntersectionObserver triggers next page load
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: '200px' } // start loading 200px before sentinel is visible
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const posts = data?.pages.flatMap(page => page.posts) ?? [];

  return (
    <>
      <VirtualizedFeed posts={posts} />
      <div ref={sentinelRef} />
      {isFetchingNextPage && <Spinner />}
    </>
  );
}
```

---

## Step 5 — Virtualized Feed (Variable Height Posts)

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualizedFeed({ posts }) {
  const parentRef = useRef();
  const sizeCache = useRef(new Map()); // postId → measured height

  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => sizeCache.current.get(posts[i]?.id) ?? 200,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  return (
    <div ref={parentRef} style={{ height: '100vh', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => (
          <div
            key={item.key}
            data-index={item.index}
            ref={virtualizer.measureElement}  // auto-measure actual height
            style={{ position: 'absolute', top: item.start, width: '100%' }}
          >
            <Post data={posts[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Scroll position preservation on back-nav:**
```js
// Before navigating away
sessionStorage.setItem('feed-scroll', window.scrollY);
// On return
const savedScroll = sessionStorage.getItem('feed-scroll');
if (savedScroll) window.scrollTo(0, parseInt(savedScroll));
```

---

## Step 6 — Optimistic Like / Unlike

```jsx
function useLike(post) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (liked) => api.toggleLike(post.id, liked),

    onMutate: async (liked) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });

      // Snapshot for rollback
      const snapshot = queryClient.getQueryData(['feed']);

      // Optimistically update ALL pages (post could be in any page)
      queryClient.setQueryData(['feed'], (old) => ({
        ...old,
        pages: old.pages.map(page => ({
          ...page,
          posts: page.posts.map(p =>
            p.id === post.id
              ? { ...p, liked, likeCount: p.likeCount + (liked ? 1 : -1) }
              : p
          ),
        })),
      }));

      return { snapshot };
    },

    onError: (err, liked, ctx) => {
      // Rollback on failure
      queryClient.setQueryData(['feed'], ctx.snapshot);
      toast.error('Failed to update like. Please try again.');
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}
```

---

## Step 7 — Real-time New Posts via SSE

```jsx
useEffect(() => {
  const source = new EventSource(`/api/feed/stream?userId=${userId}`);

  source.addEventListener('new_post', (event) => {
    const post = JSON.parse(event.data);
    // Don't auto-inject — show "3 new posts" banner instead (less jarring UX)
    setNewPostCount(n => n + 1);
    pendingPostsRef.current.push(post);
  });

  source.onerror = () => source.close(); // SSE auto-reconnects natively

  return () => source.close();
}, [userId]);

// "See 3 new posts" banner
{newPostCount > 0 && (
  <button className="new-posts-banner" onClick={() => {
    queryClient.setQueryData(['feed'], old => ({
      ...old,
      pages: [{ posts: pendingPostsRef.current }, ...old.pages],
    }));
    setNewPostCount(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }}>
    ↑ See {newPostCount} new post{newPostCount > 1 ? 's' : ''}
  </button>
)}
```

---

---

# Design 3: Autocomplete Search

---

## Step 1 — Requirements

- Suggestions appear as user types (after 2+ chars)
- Debounced — not every keystroke hits the API
- Cancel stale requests
- Cache results locally
- Keyboard navigable (↑↓ Enter Escape)
- Accessible (ARIA)
- Highlight matched portion in suggestions

---

## Step 2 — Architecture

```
User types "app"
    │
    ├── Debounce 300ms
    ├── Check in-memory cache → hit? return immediately
    ├── AbortController cancels previous in-flight request
    │
    ▼
GET /api/search?q=app&limit=8
    │
    ├── Redis: check hot query cache (TTL 60s)
    ├── Trie: prefix match on product/user names
    └── Return top 8 ranked by popularity score
```

---

## Step 3 — Full Hook Implementation

```jsx
function useAutocomplete({ minChars = 2, debounceMs = 300, maxCacheSize = 100 } = {}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  const cache = useRef(new Map());        // LRU-ish cache
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    setActiveIndex(-1);

    if (query.length < minChars) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Cache hit
    if (cache.current.has(query)) {
      setResults(cache.current.get(query));
      setIsOpen(true);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setLoading(true);

      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&limit=8`,
          { signal: abortRef.current.signal }
        );
        const data = await res.json();

        // Evict oldest if cache is full
        if (cache.current.size >= maxCacheSize) {
          cache.current.delete(cache.current.keys().next().value);
        }
        cache.current.set(query, data.results);
        setResults(data.results);
        setIsOpen(true);
      } catch (e) {
        if (e.name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timerRef.current);
  }, [query, minChars, debounceMs]);

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, -1));
        break;
      case 'Enter':
        if (activeIndex >= 0) { selectResult(results[activeIndex]); e.preventDefault(); }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const selectResult = (result) => {
    setQuery(result.label);
    setIsOpen(false);
    setActiveIndex(-1);
    cache.current.delete(query); // invalidate so re-opening shows fresh results
  };

  return { query, setQuery, results, loading, isOpen, activeIndex, handleKeyDown, selectResult };
}
```

---

## Step 4 — Accessible Component

```jsx
function SearchAutocomplete() {
  const { query, setQuery, results, loading, isOpen, activeIndex, handleKeyDown, selectResult }
    = useAutocomplete();
  const inputId = useId();
  const listId = useId();

  return (
    <div role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-owns={listId}>
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 ? `option-${activeIndex}` : undefined}
        placeholder="Search..."
      />
      {loading && <span aria-live="polite">Loading…</span>}

      {isOpen && results.length > 0 && (
        <ul id={listId} role="listbox" aria-label="Search suggestions">
          {results.map((result, i) => (
            <li
              key={result.id}
              id={`option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={i === activeIndex ? 'active' : ''}
              onMouseDown={() => selectResult(result)} // mouseDown not click — fires before input blur
            >
              <Highlight text={result.label} query={query} />
              {result.category && <span className="category">{result.category}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Highlight({ text, query }) {
  // Escape special regex chars in user input
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i}>{part}</mark>
          : part
      )}
    </span>
  );
}
```

---

## Step 5 — Backend Trie (for interview discussion)

```js
class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEnd = false;
    this.popularity = 0; // for ranking
  }
}

class Trie {
  constructor() { this.root = new TrieNode(); }

  insert(word, popularity = 0) {
    let node = this.root;
    for (const char of word.toLowerCase()) {
      if (!node.children.has(char)) node.children.set(char, new TrieNode());
      node = node.children.get(char);
    }
    node.isEnd = true;
    node.popularity = popularity;
  }

  search(prefix, limit = 8) {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) return [];
      node = node.children.get(char);
    }
    // DFS from prefix node, collect all words, sort by popularity
    const results = [];
    this._dfs(node, prefix, results);
    return results.sort((a, b) => b.popularity - a.popularity).slice(0, limit);
  }

  _dfs(node, current, results) {
    if (node.isEnd) results.push({ label: current, popularity: node.popularity });
    for (const [char, child] of node.children) this._dfs(child, current + char, results);
  }
}
```

---

---

# Design 4: URL Shortener (Confirmed Asked)

---

## Step 1 — Requirements

- Shorten any URL → 7-char code (e.g. `short.ly/xK9mP2q`)
- Redirect short → long URL with < 10ms latency
- Click analytics: count, geo, device, referrer
- Custom aliases: `short.ly/my-brand`
- Expiry: URLs can expire after N days
- Scale: 100M URLs, 10B redirects/day

---

## Step 2 — Short Code Generation

**Option A: Hash-based**
```js
const crypto = require('crypto');
function hashUrl(url) {
  return crypto.createHash('md5').update(url).digest('base64url').slice(0, 7);
}
// Problem: collisions possible, same URL gets same code (can be good or bad)
```

**Option B: Auto-increment ID → Base62 (preferred)**
```js
const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function toBase62(id) {
  if (id === 0) return BASE62[0];
  let result = '';
  while (id > 0) {
    result = BASE62[id % 62] + result;
    id = Math.floor(id / 62);
  }
  return result.padStart(7, '0'); // always 7 chars
}

function fromBase62(code) {
  return [...code].reduce((acc, char) => acc * 62 + BASE62.indexOf(char), 0);
}

// 62^7 = 3.5 trillion unique codes — enough forever
// DB auto-increments ID: 1 → "0000001", 1000000 → "4c92"
```

**Why Base62 over Base64?** Base64 uses `+` and `/` which need URL-encoding. Base62 is URL-safe.

---

## Step 3 — Architecture

```
WRITE PATH:
Client → POST /api/shorten { url, alias?, expiresIn? }
    → validate URL (regex, domain blacklist)
    → check if URL already shortened (optional dedup)
    → INSERT INTO urls (original_url, created_at, user_id, expires_at)
    → auto-increment ID returned → toBase62(id) = code
    → store code → id mapping in Redis (hot cache)
    → return { shortUrl: 'https://short.ly/xK9mP2q' }

READ PATH (redirect — latency critical):
Client → GET /xK9mP2q
    → Redis lookup: code → original_url (cache hit ~0.1ms)
    → Cache miss → DB lookup → warm cache → return
    → 302 redirect to original_url
    → async: log analytics event to Kafka → Clickhouse
```

---

## Step 4 — DB Schema

```sql
-- urls table (PostgreSQL or MySQL)
CREATE TABLE urls (
  id          BIGSERIAL PRIMARY KEY,
  code        VARCHAR(7)   UNIQUE NOT NULL,  -- base62 of id
  original_url TEXT        NOT NULL,
  alias       VARCHAR(50)  UNIQUE,           -- custom alias
  user_id     BIGINT       REFERENCES users(id),
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  is_active   BOOLEAN      DEFAULT TRUE
);

-- clicks table (append-only, high write volume → use ClickHouse or Cassandra)
CREATE TABLE clicks (
  click_id    UUID         DEFAULT gen_random_uuid(),
  code        VARCHAR(7)   NOT NULL,
  clicked_at  TIMESTAMPTZ  DEFAULT NOW(),
  ip_hash     VARCHAR(64), -- hashed for privacy
  country     VARCHAR(2),
  device_type VARCHAR(20), -- mobile | desktop | tablet
  referrer    TEXT,
  user_agent  TEXT
);
-- Partition clicks by clicked_at month for query performance
```

---

## Step 5 — Frontend Dashboard

```jsx
function UrlDashboard() {
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [results, setResults] = useState([]);

  const shorten = async () => {
    const res = await api.shorten({ url, alias });
    setResults(prev => [res, ...prev]);
    setUrl('');
    setAlias('');
  };

  return (
    <div>
      <form onSubmit={e => { e.preventDefault(); shorten(); }}>
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="Paste long URL..." type="url" required />
        <input value={alias} onChange={e => setAlias(e.target.value)}
          placeholder="Custom alias (optional)" pattern="[a-zA-Z0-9-]+" />
        <button type="submit">Shorten</button>
      </form>

      {results.map(result => (
        <UrlRow key={result.code} result={result} />
      ))}
    </div>
  );
}

function UrlRow({ result }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(result.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="url-row">
      <span className="short-url">{result.shortUrl}</span>
      <button onClick={copy}>{copied ? '✓ Copied' : 'Copy'}</button>
      <QRCode value={result.shortUrl} size={64} />
      <LiveClickCounter code={result.code} />
      <span className="original" title={result.originalUrl}>
        {result.originalUrl.slice(0, 50)}…
      </span>
    </div>
  );
}

// Real-time click counter via SSE
function LiveClickCounter({ code }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const source = new EventSource(`/api/analytics/stream/${code}`);
    source.addEventListener('click', () => setCount(n => n + 1));
    return () => source.close();
  }, [code]);

  return <span className="click-count">{count.toLocaleString()} clicks</span>;
}

// QR code using Canvas API
function QRCode({ value, size }) {
  const canvasRef = useRef();
  useEffect(() => {
    // Use qrcode.js library: QRCode.toCanvas(canvas, value, { width: size })
    import('qrcode').then(QRLib => QRLib.toCanvas(canvasRef.current, value, { width: size }));
  }, [value, size]);
  return <canvas ref={canvasRef} />;
}
```

---

## Step 6 — 301 vs 302 Trade-off (Key Answer)

> "I'd use **302 (Found / Temporary Redirect)**, not 301.
>
> 301 is permanent — browsers cache it indefinitely. Once a browser caches `short.ly/abc → original-url.com`, it never hits our server again for that code. That means **we lose all click analytics** for returning visitors, and if the original URL ever changes, cached users go to the wrong place.
>
> 302 means the browser always asks our server before redirecting. This adds ~1 round-trip latency, but we get: accurate click counts, the ability to update or deactivate links, A/B testing redirects, and geo-based routing.
>
> For the < 10ms redirect requirement — Redis cache makes the lookup sub-millisecond. The 302 overhead is negligible."

---

---

# Design 5: E-Commerce Product Page

---

## Step 1 — Requirements

- Product images (gallery), title, price, variants (size/color)
- Add to cart, add to wishlist
- Reviews: paginated, sortable, write review
- Real-time inventory: "Only 2 left!"
- SEO-critical (Google indexes product pages)
- Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms

---

## Step 2 — Rendering Strategy Decision

| Strategy | LCP | SEO | Dynamic Data | Best For |
|---|---|---|---|---|
| CSR | Slow (blank shell) | ❌ | ✅ | Dashboards |
| SSR | Fast (server-rendered) | ✅ | ✅ fresh | Product pages with live price |
| SSG | Fastest (static CDN) | ✅ | ❌ stale | Blog, marketing |
| **ISR** | **Fastest** | ✅ | ✅ near-fresh | **Product pages** ✅ |

**Answer: Next.js ISR (Incremental Static Regeneration)**

```js
// pages/product/[slug].js
export async function getStaticProps({ params }) {
  const product = await db.getProduct(params.slug);
  return {
    props: { product },
    revalidate: 60, // regenerate every 60s if requested
  };
}
export async function getStaticPaths() {
  const topProducts = await db.getTopProducts(1000); // pre-build top 1K
  return {
    paths: topProducts.map(p => ({ params: { slug: p.slug } })),
    fallback: 'blocking', // SSR on first hit for remaining products
  };
}
```

**Why ISR:**
Price/inventory can be stale for 60s — acceptable. SEO needs pre-rendered HTML. Static CDN delivery = fastest LCP. For real-time inventory: hydrate with SSE after initial render.

---

## Step 3 — Core Web Vitals Optimization

### LCP (Largest Contentful Paint) — target < 2.5s

The LCP is almost always the hero product image.

```jsx
// Preload the hero image in <head>
<link rel="preload" as="image" href={product.heroImage} fetchPriority="high" />

// Next.js Image with priority
<Image
  src={product.heroImage}
  alt={product.name}
  width={600}
  height={600}
  priority         // disables lazy loading, adds preload tag
  sizes="(max-width: 768px) 100vw, 600px"
/>
```

### CLS (Cumulative Layout Shift) — target < 0.1

Layout shifts happen when images/content load without reserved space.

```css
/* Always reserve space for images with aspect-ratio */
.product-image-container {
  aspect-ratio: 1 / 1;   /* reserves 1:1 space before image loads */
  width: 100%;
}

/* Reserve space for dynamic text (price, inventory) */
.price { min-height: 2rem; }
.inventory-badge { min-height: 1.5rem; }
```

### INP (Interaction to Next Paint) — target < 200ms

INP measures responsiveness to user interactions.

```jsx
// Avoid heavy synchronous work in click handlers
function handleAddToCart(variant) {
  // Bad: heavy synchronous state update + re-render
  // Good: use startTransition for non-urgent updates
  startTransition(() => {
    dispatch({ type: 'ADD_TO_CART', payload: variant });
  });
  // Urgent: show immediate feedback (not deferred)
  setButtonState('adding');
}
```

---

## Step 4 — Variant Selection State Machine

```jsx
function useVariantSelection(variants) {
  // variants: [{ id, size, color, inventory, price, images }]

  const [selected, setSelected] = useState({ size: null, color: null });

  // What options are available given current partial selection
  const availableOptions = useMemo(() => {
    const sizes = new Set();
    const colors = new Set();

    variants.forEach(v => {
      if (v.inventory > 0) {
        // A size is available if there's at least one in-stock combo with it
        if (!selected.color || v.color === selected.color) sizes.add(v.size);
        if (!selected.size || v.size === selected.size) colors.add(v.color);
      }
    });
    return { sizes, colors };
  }, [variants, selected]);

  const selectedVariant = useMemo(
    () => variants.find(v => v.size === selected.size && v.color === selected.color),
    [variants, selected]
  );

  const select = (dimension, value) => {
    setSelected(prev => {
      const next = { ...prev, [dimension]: value };
      // If current other dimension is now invalid, clear it
      const valid = variants.some(v =>
        v[dimension] === value &&
        (dimension === 'size' ? (prev.color ? v.color === prev.color : true) : (prev.size ? v.size === prev.size : true)) &&
        v.inventory > 0
      );
      return valid ? next : { [dimension]: value, [dimension === 'size' ? 'color' : 'size']: null };
    });
  };

  return { selected, select, selectedVariant, availableOptions };
}
```

---

## Step 5 — Real-time Inventory with SSE

```jsx
function useInventory(productId, initialVariants) {
  const [variants, setVariants] = useState(initialVariants);

  useEffect(() => {
    const source = new EventSource(`/api/products/${productId}/inventory-stream`);

    source.addEventListener('inventory_update', (event) => {
      const { variantId, inventory } = JSON.parse(event.data);
      setVariants(prev => prev.map(v =>
        v.id === variantId ? { ...v, inventory } : v
      ));
    });

    source.onerror = () => source.close();
    return () => source.close();
  }, [productId]);

  return variants;
}

function InventoryBadge({ inventory }) {
  if (inventory === 0) return <span className="badge out-of-stock">Out of stock</span>;
  if (inventory <= 5) return <span className="badge low-stock">Only {inventory} left!</span>;
  return null;
}
```

---

## Step 6 — Add to Cart with Optimistic Update

```jsx
function useCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ variantId, quantity }) =>
      fetch('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ variantId, quantity }),
      }).then(r => { if (!r.ok) throw new Error('Cart add failed'); return r.json(); }),

    onMutate: async ({ variantId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const snapshot = queryClient.getQueryData(['cart']);

      queryClient.setQueryData(['cart'], old => ({
        ...old,
        items: [...(old?.items ?? []), { variantId, quantity, isOptimistic: true }],
        count: (old?.count ?? 0) + quantity,
      }));

      return { snapshot };
    },

    onError: (err, vars, ctx) => {
      queryClient.setQueryData(['cart'], ctx.snapshot);
      toast.error('Could not add to cart. Please try again.');
    },

    onSuccess: () => toast.success('Added to cart!'),

    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}
```

---

## Step 7 — Image Gallery with Lazy Loading

```jsx
function ProductGallery({ images, productName }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="gallery">
      {/* Hero — eager loaded, priority */}
      <div className="hero" style={{ aspectRatio: '1/1' }}>
        <Image
          src={images[activeIndex].url}
          alt={`${productName} - view ${activeIndex + 1}`}
          fill
          priority={activeIndex === 0}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>

      {/* Thumbnails — lazy loaded */}
      <div className="thumbnails">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setActiveIndex(i)}
            aria-label={`View image ${i + 1}`}
            aria-current={i === activeIndex}
          >
            <Image
              src={img.thumbnail}
              alt=""
              width={80}
              height={80}
              loading="lazy"  // lazy load thumbnails
            />
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

---

# Trade-off Deep Dives — Full Answers

---

## REST vs GraphQL

**When REST wins:**
- Simple, predictable data shapes (product page always needs same fields)
- CDN caching — GET requests cache at edge; GraphQL POSTs don't cache trivially
- Team unfamiliar with GraphQL — simpler mental model, better tooling support
- Public APIs — REST is universally understood

**When GraphQL wins:**
- Multiple clients (mobile needs 10 fields, desktop needs 30) → no over/under-fetching
- Complex entity graphs (user → posts → comments → likes → users) → one query
- Rapid product iteration — frontend changes data requirements without backend changes
- Real-time via GraphQL subscriptions (combines query + WS)

**Answer template:**
> "For PepsiCo's use case — a product catalog that's consistent across clients — I'd start with REST. It CDN-caches well, is simpler to reason about, and the data shapes are fixed. I'd consider GraphQL only if we started building a mobile app with different data needs, or if the number of entity relationships made REST endpoints proliferate."

---

## Redux vs React Query vs Zustand

```
Server state (API data)     → React Query / SWR
Client UI state (modals)    → useState / useReducer / Zustand
Shared client state (cart)  → Zustand (or Context for simple cases)
Complex async flows         → Redux Toolkit (with RTK Query)
```

**Why NOT Redux for API data:**
- Redux requires: action types, action creators, reducers, selectors, thunks/sagas
- React Query handles: caching, background refetch, stale-while-revalidate, pagination, optimistic updates, deduplication — all out of the box
- React Query ~13KB, Redux + RTK + RTK Query ~30KB+

**When Redux is still justified:**
- Very complex client state with many interdependencies (e.g., a rich text editor)
- Need for time-travel debugging / strict predictability
- Large team that needs strict conventions and centralized state reasoning

---

## SSE vs WebSocket — Full Comparison

```
                    SSE                 WebSocket
Protocol:           HTTP/1.1 or H2      Custom WS upgrade
Direction:          Server → Client     Bidirectional
Reconnect:          Automatic           Manual (must implement)
Load balancing:     Easy (stateless)    Hard (sticky sessions needed)
Browser support:    IE not supported    Universal
Proxies/firewalls:  Works (HTTP)        Sometimes blocked
Message format:     Text only           Text or binary
Overhead:           Lower (HTTP)        Lower per-message (after upgrade)
```

**Decision rule:**
- Need to send data FROM client to server in real-time? → WebSocket
- Only need server-push? → SSE (simpler, auto-reconnect, no upgrade)
- Both? → WebSocket for commands + SSE for notifications (hybrid, rare)

---

## Auth in SPA — Full Answer

```
Storage location:
  ❌ localStorage → XSS can read it → attacker steals token permanently
  ❌ sessionStorage → XSS can read it → same problem
  ✅ httpOnly cookie → JS cannot read → XSS-safe

CSRF protection (needed because cookies auto-send):
  Option A: SameSite=Strict cookie → only sent on same-origin requests → blocks CSRF
  Option B: SameSite=Lax (default) + CSRF token in custom header (X-CSRF-Token)
  Option C: Double-submit cookie pattern

Token strategy:
  Access token: short-lived (15 min) httpOnly cookie
  Refresh token: long-lived (7 days) httpOnly cookie, separate /refresh endpoint
  Rotation: on every refresh, old refresh token is invalidated, new one issued
  Revocation: store refresh token in Redis; on logout delete it → instant invalidation
```

```js
// Silent token refresh — intercept 401, refresh, retry original request
async function fetchWithAuth(url, options = {}) {
  let res = await fetch(url, { ...options, credentials: 'include' });

  if (res.status === 401) {
    const refreshed = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    if (!refreshed.ok) { logout(); return; }
    res = await fetch(url, { ...options, credentials: 'include' }); // retry
  }
  return res;
}
```

---

## Core Web Vitals — What Each Is and How to Fix

| Metric | Measures | Good | Bad | Main Fixes |
|---|---|---|---|---|
| **LCP** | Load time of largest visible element | < 2.5s | > 4s | Preload hero image, CDN, no render-blocking CSS |
| **CLS** | Visual stability (layout shifts) | < 0.1 | > 0.25 | Reserve image dimensions, avoid injecting content above fold |
| **INP** | Responsiveness to all interactions | < 200ms | > 500ms | Reduce JS on main thread, use `startTransition`, avoid long tasks |

**Old FID replaced by INP in March 2024** — know this distinction.

**How to measure:**
```js
// web-vitals library
import { onLCP, onCLS, onINP } from 'web-vitals';
onLCP(metric => analytics.track('LCP', metric.value));
onCLS(metric => analytics.track('CLS', metric.value));
onINP(metric => analytics.track('INP', metric.value));
```

---

## Tips for the Round

1. **Draw the data flow first** — box diagram with arrows, then talk through it
2. **Always start with trade-offs** — "I'm choosing WebSocket over SSE here because we need bidirectional communication — the trade-off is sticky session complexity on the load balancer"
3. **Quantify everything** — "50M DAU × 30 msgs/day = 17K writes/sec — that rules out a single Postgres write replica"
4. **Anchor to frontend** — interviewers expect you to go deep on UI/UX decisions, not just say "use Redis"
5. **Say what you'd defer** — "I'm not designing the notification service today — I'd treat it as a black box that emits events we SSE to the client"
6. **Know the 3 layers:** rendering strategy (SSR/SSG/ISR) → state management → real-time layer
