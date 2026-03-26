# Design the frontend for Instagram (interview framing)

[← Frontend prep index](./README.md)

A mobile-first **consumer media** product: infinite visual feed, **Stories**, short video (**Reels**), **DMs**, profiles, and lightweight creation flows. Interviewers care about **media performance**, **scroll smoothness**, **real-time hints**, and **deep links**.

---

## 1. Clarify scope (first 2 minutes)

- **Surfaces:** Home feed, Explore, Reels, Stories tray, profile grid, post detail, compose (camera / upload), **direct messages** — web vs native priorities? (Often "focus mobile native + mention web constraints.")
- **Auth:** Logged-in only for core feed; public **permalink** viewers (`/p/…`, `/reel/…`) may exist on web.
- **Constraints:** Offline browsing of cached feed? Data caps / metered networks?

**Non-functional:** **LCP** for first paint of profile/post; **jank-free** scroll at 60 fps; **battery** on video; **a11y** for alt text and reduced motion; **safe areas** and notches.

---

## 2. High-level architecture

```
┌───────────────────────────────────────────────────────────────┐
│                         App Shell                             │
│   Auth gate · Tab Navigator · Feature flags · Analytics       │
└──────┬──────────┬─────────────┬────────────┬──────────────────┘
       │          │             │            │
   Feed/Home   Stories       Reels          DMs
   (ranked)  (ephemeral)  (vert pager)  (WebSocket)
       │          │             │            │
       └──────────┴─────────────┴────────────┘
                          │
              ┌───────────┴────────────┐
              │    Media Pipeline      │
              │ BlurHash LQIP → WebP   │
              │ Signed CDN URLs        │
              │ Chunked upload         │
              └───────────┬────────────┘
                          │
              ┌───────────┴────────────┐
              │     Data Layer         │
              │ BFF / GraphQL          │
              │ Cursor pagination      │
              │ SWR / TanStack Query   │
              │ WebSocket (DMs/seen)   │
              └────────────────────────┘
```

| Layer | Role |
|--------|------|
| **Shell** | Auth gate, tab bar / nav, design tokens, analytics, feature flags. |
| **Feed & media** | Virtualized list, image/video pipeline, **prefetch** next items. |
| **Stories / Reels** | Full-screen players, **decoders**, preload policy, gesture conflicts. |
| **Realtime** | WebSocket (or equivalent) for **DMs**, story "seen", typing; fallback long-poll if needed. |
| **Data** | BFF or GraphQL/REST: **cursor-based** pages for feed; **signed CDN URLs** for media. |

**Rendering:** Native (**preferred** for camera, GPU, background); web often **CSR shell + SSR** for permalinks/SEO where needed.

---

## 3. Core UX flows with code

### 3A. Feed — Virtualized list, cursor pagination, optimistic like

Feed is the highest-traffic surface. Every frame of scroll budget matters.

```tsx
// Virtualized feed using react-window VariableSizeList
// Each post can have different heights (portrait vs square vs landscape image)
import { VariableSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

const ESTIMATED_POST_HEIGHT = 520;
const heightCache = new Map<number, number>();

function getItemSize(index: number) {
  return heightCache.get(index) ?? ESTIMATED_POST_HEIGHT;
}

function FeedList({ posts }: { posts: Post[] }) {
  const listRef = useRef<VariableSizeList>(null);

  // Stale-while-revalidate: show cached feed instantly, refresh in background
  const { data, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => fetchFeed({ cursor: pageParam }),
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,           // treat as fresh for 30 s
    gcTime: 5 * 60 * 1000,       // keep in memory 5 min
  });

  const allPosts = data?.pages.flatMap((p) => p.posts) ?? [];

  // Prefetch next page when user reaches 80% of current list
  const onItemsRendered = ({ visibleStopIndex }: { visibleStopIndex: number }) => {
    if (visibleStopIndex >= allPosts.length - 5 && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <AutoSizer>
      {({ height, width }) => (
        <VariableSizeList
          ref={listRef}
          height={height}
          width={width}
          itemCount={allPosts.length}
          itemSize={getItemSize}
          onItemsRendered={onItemsRendered}
        >
          {({ index, style }) => (
            <div style={style}>
              <PostCell
                post={allPosts[index]}
                onHeightChange={(h) => {
                  heightCache.set(index, h);
                  listRef.current?.resetAfterIndex(index);
                }}
              />
            </div>
          )}
        </VariableSizeList>
      )}
    </AutoSizer>
  );
}

// Optimistic like — update local cache, roll back on server error
function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => api.likePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      const snapshot = queryClient.getQueryData(['feed']);

      queryClient.setQueryData(['feed'], (old: InfiniteData<FeedPage>) => ({
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          posts: page.posts.map((p) =>
            p.id === postId
              ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 }
              : p
          ),
        })),
      }));

      return { snapshot }; // context for rollback
    },
    onError: (_err, _postId, context) => {
      // Roll back to snapshot if server rejects
      if (context?.snapshot) queryClient.setQueryData(['feed'], context.snapshot);
    },
    onSettled: () => {
      // Revalidate to get authoritative like count
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
```

### 3B. Stories — Horizontal tray, full-screen viewer, preload neighbors

```tsx
// Stories tray: horizontal scroll, each avatar is a story group
function StoriesTray({ groups }: { groups: StoryGroup[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {groups.map((g, i) => (
        <StoryAvatar
          key={g.userId}
          group={g}
          onPress={() => openStoryViewer(i)}
        />
      ))}
    </ScrollView>
  );
}

// Full-screen viewer with preload of adjacent stories
function StoryViewer({ initialGroupIndex }: { initialGroupIndex: number }) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);

  // Preload the next group's first media as soon as current group opens
  useEffect(() => {
    const nextGroup = groups[groupIndex + 1];
    if (nextGroup?.stories[0]?.mediaUrl) {
      Image.prefetch(nextGroup.stories[0].mediaUrl); // native prefetch
    }
  }, [groupIndex]);

  // Optimistic seen-state: mark locally immediately, sync to server
  const markSeen = useCallback((storyId: string) => {
    seenStore.mark(storyId);                   // local store update (instant)
    api.markStorySeen(storyId).catch(() => {   // fire-and-forget; server reconciles
      // Non-critical; seen state is eventually consistent
    });
  }, []);

  const advance = () => {
    const group = groups[groupIndex];
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1);
      markSeen(group.stories[storyIndex + 1].id);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((g) => g + 1);
      setStoryIndex(0);
    } else {
      closeViewer();
    }
  };

  return (
    <GestureHandlerRootView>
      <ProgressBar total={groups[groupIndex].stories.length} current={storyIndex} />
      <StoryMedia story={groups[groupIndex].stories[storyIndex]} onEnd={advance} />
      <TapZones onTapLeft={goBack} onTapRight={advance} onLongPress={pause} />
    </GestureHandlerRootView>
  );
}
```

### 3C. Reels — Vertical pager, autoplay, memory cap

```tsx
// Vertical pager for Reels: only 3 decoders active at a time
const MAX_ACTIVE_DECODERS = 3;

function ReelsPager({ reels }: { reels: Reel[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Determine which reels should have active video decoders
  // Keep current + 1 ahead + 1 behind = 3 max
  const isDecoderActive = (index: number) =>
    Math.abs(index - activeIndex) <= 1;

  return (
    <FlatList
      data={reels}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      onViewableItemsChanged={({ viewableItems }) => {
        const idx = viewableItems[0]?.index ?? 0;
        setActiveIndex(idx);
      }}
      viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
      renderItem={({ item, index }) => (
        <ReelCell
          reel={item}
          isActive={index === activeIndex}
          shouldPreload={Math.abs(index - activeIndex) === 1}
          decoderActive={isDecoderActive(index)}
        />
      )}
      keyExtractor={(item) => item.id}
    />
  );
}

function ReelCell({ reel, isActive, decoderActive }: ReelCellProps) {
  // Downshift quality when thermal state is hot or network is 2G
  const quality = useAdaptiveQuality(); // returns 'high' | 'medium' | 'low'

  const videoUrl = reel.variants[quality] ?? reel.variants.medium;

  return (
    <View style={styles.reelContainer}>
      {decoderActive ? (
        <Video
          source={{ uri: videoUrl }}
          shouldPlay={isActive}
          isLooping
          resizeMode="cover"
          // Release surface when not in window
          onFullscreenUpdate={handleFullscreen}
        />
      ) : (
        // Thumbnail placeholder when decoder budget exceeded
        <Image source={{ uri: reel.thumbnailUrl }} style={StyleSheet.absoluteFill} />
      )}
      <ReelOverlay reel={reel} />
    </View>
  );
}

// Adaptive quality hook: reacts to network and thermal hints
function useAdaptiveQuality(): VideoQuality {
  const [quality, setQuality] = useState<VideoQuality>('high');

  useEffect(() => {
    // Network Information API (web) or native module
    const connection = navigator.connection;
    if (connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g') {
      setQuality('low');
    } else if (connection?.effectiveType === '3g') {
      setQuality('medium');
    }
  }, []);

  return quality;
}
```

### 3D. DMs — WebSocket, optimistic send, typing indicator

```tsx
// Connection manager: handles auth, heartbeat, exponential backoff
class DMConnectionManager {
  private ws: WebSocket | null = null;
  private retryDelay = 1000;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  connect(authToken: string) {
    this.ws = new WebSocket(`wss://realtime.instagram.com/dm?token=${authToken}`);

    this.ws.onopen = () => {
      this.retryDelay = 1000; // reset backoff on success
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as WSMessage;
      messageStore.dispatch(msg); // fan out to state
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      // Reconnect with exponential backoff, max 30 s
      setTimeout(() => this.connect(authToken), Math.min(this.retryDelay, 30_000));
      this.retryDelay *= 2;
    };
  }

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.ws?.send(JSON.stringify({ type: 'ping' }));
    }, 25_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }
}

// Optimistic send: add message locally, confirm via server ack
function useSendMessage(threadId: string) {
  const [messages, setMessages] = useAtom(threadMessagesAtom(threadId));

  return useCallback((text: string) => {
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      text,
      senderId: currentUser.id,
      status: 'sending',
      sentAt: new Date().toISOString(),
    };

    // 1. Show immediately in the thread
    setMessages((prev) => [...prev, optimisticMsg]);

    // 2. Send over WebSocket
    wsManager.send({ type: 'send_message', threadId, text, clientId: tempId });

    // 3. Server will ACK with real ID; reconcile on receipt
    // wsManager.onmessage handles type: 'message_ack' → replaces tempId
  }, [threadId]);
}

// Typing indicator: debounced, expires automatically
function useTypingIndicator(threadId: string) {
  const debouncedSend = useDebouncedCallback(() => {
    wsManager.send({ type: 'typing_stop', threadId });
  }, 2000);

  const onKeyPress = () => {
    wsManager.send({ type: 'typing_start', threadId });
    debouncedSend(); // reset the stop timer on each keystroke
  };

  return { onKeyPress };
}
```

### 3E. Media performance — BlurHash LQIP, WebP, reserved aspect ratio

```tsx
// PostImage: aspect-ratio skeleton prevents CLS, blur-hash LQIP bridges load gap
function PostImage({ post }: { post: Post }) {
  const [loaded, setLoaded] = useState(false);

  return (
    // Reserve exact space before image loads — no layout shift
    <div
      style={{
        aspectRatio: `${post.width} / ${post.height}`,
        position: 'relative',
        background: '#f0f0f0',
        overflow: 'hidden',
      }}
    >
      {/* BlurHash decoded to canvas as LQIP */}
      {!loaded && (
        <BlurhashCanvas
          hash={post.blurhash}
          width={32}
          height={32}
          style={{ width: '100%', height: '100%' }}
        />
      )}

      {/* Responsive srcSet: WebP preferred, JPEG fallback */}
      <picture>
        <source
          type="image/webp"
          srcSet={`
            ${post.cdnUrl}?w=640&fmt=webp 640w,
            ${post.cdnUrl}?w=1080&fmt=webp 1080w
          `}
        />
        <img
          src={`${post.cdnUrl}?w=640`}
          alt={post.altText}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.2s' }}
        />
      </picture>
    </div>
  );
}

// CDN URL signing: prevents hotlinking, signed tokens expire
// Server-side: attach HMAC signature + expiry to media URL
// Client never constructs CDN URLs; always comes from API response
// Example: https://cdn.instagram.com/media/abc123?sig=xxxxx&exp=1712345678
```

### 3F. Create flow — Camera capture, chunked upload, optimistic posting

```tsx
// Upload with progress and rollback on failure
async function uploadPost(file: File, caption: string): Promise<void> {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

  // 1. Initialize upload session
  const { uploadId, uploadUrl } = await api.initUpload({
    filename: file.name,
    size: file.size,
    mimeType: file.type,
  });

  // 2. Show optimistic "posting..." card in feed immediately
  const tempPostId = `temp_${uploadId}`;
  feedStore.addOptimisticPost({ id: tempPostId, status: 'uploading', caption });

  try {
    // 3. Upload in chunks, report progress
    let offset = 0;
    while (offset < file.size) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      await api.uploadChunk({ uploadId, chunk, offset });
      offset += CHUNK_SIZE;
      uploadProgressStore.set(tempPostId, offset / file.size);
    }

    // 4. Finalize: server processes + CDN replication
    const post = await api.finalizeUpload({ uploadId, caption });

    // 5. Replace optimistic card with real post
    feedStore.replaceOptimisticPost(tempPostId, post);
  } catch (error) {
    // 6. Rollback: remove optimistic card, show retry toast
    feedStore.removeOptimisticPost(tempPostId);
    toastStore.show({ type: 'error', message: 'Upload failed. Tap to retry.', retryFn: () => uploadPost(file, caption) });
  }
}
```

---

## 4. State management strategy

**Server state** lives in TanStack Query / SWR / native equivalent keyed by entity:

| Key | Cache policy |
|-----|-------------|
| `['feed', cursor]` | `staleTime: 30s`, `gcTime: 5min` |
| `['post', id]` | `staleTime: 60s`, deduplicated across feed + detail |
| `['stories', userId]` | `staleTime: 0` (always revalidate, ephemeral) |
| `['thread', threadId]` | Real-time via WS; query cache as initial load + gap fill |

**UI state** stays local (which story index, reel volume, composer state). Never duplicate the full feed into a second Redux-style global store — that forces double-updates and causes staleness bugs.

---

## 5. Trade-offs & failure modes

| Choice | Upside | Cost |
|--------|--------|------|
| Autoplay video | Engagement lift | Battery, thermal throttling, data usage on metered plans |
| Aggressive prefetch | Feels instant | Wasted bandwidth if user bounces; cancel in-flight on blur |
| Optimistic like | Snappy response | Must reconcile count on mismatch; brief flicker on rollback |
| Max 3 video decoders | Memory safety | Adjacent reel shows thumbnail briefly during fast swipe |
| Stale-while-revalidate feed | Instant on return | User may briefly see stale like/comment counts |
| Chunked upload | Resumable on interrupt | More API surface; requires server-side session management |

**Failure modes and mitigations:**

- **API outage:** Serve last-cached feed slice behind a "Could not refresh" banner. Do not show a blank screen.
- **Upload fails mid-way:** Retain the upload session ID in localStorage so the user can resume from the last successful chunk, not restart from zero.
- **Video decoder OOM:** Catch `MediaError` events; fall back to static thumbnail + play-on-tap. Release decoders for off-screen cells immediately on scroll.
- **WebSocket drop:** Queue outgoing DM messages locally; flush the queue once reconnected. Show "Reconnecting…" badge, not silent failure.
- **Error boundary per post cell:** One malformed post (bad JSON, broken media URL) should not crash the entire feed. Wrap each `PostCell` in an error boundary that renders a placeholder card.

```tsx
// Error boundary wrapper per post — isolates failures
<ErrorBoundary fallback={<PostPlaceholder reason="load-error" />}>
  <PostCell post={post} />
</ErrorBoundary>
```

---

## 6. Accessibility & performance checklist

- All images carry `alt` text sourced from user-provided captions or auto-generated descriptions.
- Reduced-motion preference (`prefers-reduced-motion`) pauses auto-advancing stories and disables parallax.
- Focus trap inside the story viewer; Escape closes back to tray.
- LCP target: first feed image visible within 2.5 s on 4G; achieve via above-fold image priority (`fetchpriority="high"`).
- Stories and Reels produce no CLS because containers are fixed/full-screen.
- DM thread uses ARIA live region for incoming messages read by screen readers.

---

## 7. Closing statement

"Instagram's frontend is a **media-heavy, infinitely scrolling client**: CDN-optimized images and video delivered via signed URLs with BlurHash LQIP for instant perceived load; a **virtualized, cursor-paginated feed** with stale-while-revalidate caching and optimistic likes; **full-screen story and reel players** with strict memory caps (max 3 active decoders) and thermal/network quality downshift; a **real-time WebSocket layer** for DMs with optimistic send, gap-sync on reconnect, and a heartbeat keepalive; and a **chunked upload flow** with optimistic 'posting...' state and per-chunk resumption. Ranking and content decisions stay server-side; the client focuses on **60 fps scroll**, **sub-second perceived load**, and **graceful degradation** when the network or device is under stress."
