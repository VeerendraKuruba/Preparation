# 27. Design Client-Side Caching Strategies

## Clarifying Questions

Before designing, I would ask:

- **Data types**: Are we caching user session data, paginated API lists, reference data (countries, categories), or binary assets? Each has a different optimal strategy.
- **Real-time requirements**: Does the data need to be fresh within seconds (live prices, chat), minutes (feed, notifications), or can it tolerate hours of staleness (user profile, settings)?
- **Offline requirement**: Do we need the app to function with no network (offline-first PWA), or is a graceful degradation with a "you are offline" message sufficient?
- **Sensitive data**: Are we caching anything containing auth tokens, PII, or payment details? These require special handling.
- **Scale**: Are lists bounded (100 items) or unbounded (millions of records)? Unbounded lists need eviction policies.

For this answer I will assume: a React SPA fetching REST APIs, mix of static assets and dynamic user data, no strict offline requirement but graceful degradation, and some PII in user-related endpoints.

---

## Architecture Diagram — Cache Layers

```
                        User / Component requests data
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Layer 1: React Query / SWR Cache  (in-memory, per query key)              │
│  • staleTime: serve from memory if fresh, background refetch if stale      │
│  • gcTime: evict from memory after inactivity                              │
│  • Optimistic updates + rollback on mutation                               │
└───────────────────────────┬────────────────────────────────────────────────┘
                            │ cache miss / expired
                            ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Layer 2: Service Worker Cache  (Workbox, per resource type strategy)      │
│  • Assets: Cache-First (CSS, JS, fonts never change once hashed)           │
│  • API GET: Network-First with SW cache as fallback                        │
│  • App shell: Stale-While-Revalidate                                       │
└───────────────────────────┬────────────────────────────────────────────────┘
                            │ SW cache miss
                            ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Layer 3: HTTP Cache  (browser disk cache, CDN)                            │
│  • Cache-Control: max-age, stale-while-revalidate                          │
│  • ETag / If-None-Match for conditional requests                           │
│  • Immutable for hashed assets                                             │
└───────────────────────────┬────────────────────────────────────────────────┘
                            │ HTTP cache miss
                            ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Layer 4: IndexedDB  (persistent, structured, survives browser restart)    │
│  • Long-lived reference data (categories, config)                          │
│  • Offline queue for mutations                                             │
│  • Normalized entity store with TTL metadata                               │
└───────────────────────────┬────────────────────────────────────────────────┘
                            │ all caches miss
                            ▼
                     Network request to API
```

---

## Core Mechanics

### 1. HTTP Cache Headers — Right TTL Per Resource Type

The browser's HTTP cache is free, requires no JavaScript, and survives React re-mounts. The goal is to set headers that match the actual freshness requirements of each resource type.

```
# Hashed static assets (main.abc123.js, styles.xyz.css)
# Content hash in filename guarantees uniqueness — safe to cache forever
Cache-Control: public, max-age=31536000, immutable

# App shell HTML — must always revalidate so users get new deployments
Cache-Control: no-cache
# (no-cache means "must revalidate before using", not "do not cache")

# API responses for reference data (categories, config) — stale-while-revalidate
# Serve from cache immediately, refresh in background for next visit
Cache-Control: public, max-age=60, stale-while-revalidate=600

# User-specific API responses — private, short TTL, ETag for conditional requests
Cache-Control: private, max-age=0, must-revalidate
ETag: "v1-user-42-profile-20240301"

# Subsequent request with ETag — server returns 304 Not Modified if unchanged
# Browser uses cached body, only pays for the headers round-trip
If-None-Match: "v1-user-42-profile-20240301"
```

The distinction between `max-age=0, must-revalidate` and `no-store` is important. `must-revalidate` lets the browser cache the response and use it if the server confirms it is still fresh (304). `no-store` forces a full download every time — use this only for genuinely sensitive data that should never touch disk.

---

### 2. React Query — staleTime, gcTime, Invalidation, Optimistic Updates

React Query operates as the application-level cache. It sits above the HTTP cache and gives the UI control over when to refetch without adding loading spinners every time.

```typescript
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,      // serve from memory without refetch for 60s
      gcTime: 5 * 60 * 1000,     // remove from memory 5 min after last subscriber
      refetchOnWindowFocus: true, // background refresh when user returns to tab
      retry: 2,
    },
  },
});

// Fetching user profile
function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetch(`/api/users/${userId}`).then((r) => r.json()),
    staleTime: 5 * 60 * 1000, // profile changes rarely — 5 min is fine
  });
}

// Mutation with optimistic update + rollback
function useUpdateUsername() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newName: string) =>
      fetch('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: newName }),
      }),

    onMutate: async (newName) => {
      // Cancel any in-flight refetches that would overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['user', 'me'] });

      // Snapshot the previous value for rollback
      const previous = queryClient.getQueryData(['user', 'me']);

      // Optimistically update the cache — UI responds instantly
      queryClient.setQueryData(['user', 'me'], (old: any) => ({
        ...old,
        name: newName,
      }));

      return { previous };
    },

    onError: (_err, _newName, context) => {
      // Rollback to snapshot if the mutation fails
      queryClient.setQueryData(['user', 'me'], context?.previous);
    },

    onSettled: () => {
      // Always refetch after settle to ensure cache is in sync with server
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
}
```

---

### 3. Service Worker — Workbox Strategies Per Resource Type

A Service Worker intercepts all network requests and applies caching strategies before they reach the HTTP cache or the network. Workbox provides composable strategy primitives.

```typescript
// sw.ts (compiled and registered via vite-plugin-pwa or workbox-webpack-plugin)
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { registerRoute } from 'workbox-routing';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

// Strategy 1: Cache-First for hashed static assets
// These have content hashes in the filename — once cached, they never change
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new CacheFirst({
    cacheName: 'static-assets-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// Strategy 2: Network-First for API calls
// Always tries network; falls back to SW cache when offline
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-responses-v1',
    networkTimeoutSeconds: 5, // fall back to cache if network takes > 5s
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 5 * 60 }),
    ],
  })
);

// Strategy 3: Stale-While-Revalidate for the app shell HTML
// Serve the cached shell instantly, refresh cache in background
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'app-shell-v1',
  })
);
```

---

### 4. Normalization — Entity Map Prevents Stale Duplicated Data

Without normalization, the same user object can exist in five different query cache entries (user profile, post author, comment author, search result, mention). When the user updates their name, only the profile query gets invalidated and the rest stay stale.

```typescript
// WITHOUT normalization — user data duplicated across caches
// Updating user profile invalidates only ['user', 'me']
// Posts still show the old username until their cache expires
cache = {
  ['user', 'me']:           { id: 1, name: 'Alice' },
  ['posts', 'feed']:        [{ id: 10, author: { id: 1, name: 'Alice' }, ... }],
  ['posts', 'my-posts']:    [{ id: 20, author: { id: 1, name: 'Alice' }, ... }],
};

// WITH normalization — single source of truth per entity type
// Updating the users entity store propagates to all derived views
normalizedStore = {
  entities: {
    users:  { 1: { id: 1, name: 'Alice' }, 2: { id: 2, name: 'Bob' } },
    posts:  { 10: { id: 10, authorId: 1 }, 20: { id: 20, authorId: 1 } },
  },
  // Views just hold IDs; they always look up from entities
  queries: {
    feed:     { postIds: [10, 20] },
    myPosts:  { postIds: [20] },
  },
};
```

In practice with React Query, normalization can be implemented by writing selectors that join the entity caches, or by using libraries like `normy` alongside React Query.

---

### 5. Cache Invalidation — TTL + Event-Driven + Tag-Based

Time-based TTL is the simplest strategy but has a gap: a user edits a record and then navigates to a list view that still shows the old data. Event-driven invalidation closes this gap.

```typescript
// Approach A: Invalidate after mutation (most common)
async function updatePost(postId: number, data: Partial<Post>) {
  await fetch(`/api/posts/${postId}`, { method: 'PATCH', body: JSON.stringify(data) });
  // Invalidate all queries that could show this post
  queryClient.invalidateQueries({ queryKey: ['posts'] });
  queryClient.invalidateQueries({ queryKey: ['post', postId] });
}

// Approach B: WebSocket event-driven invalidation
// Server pushes "resource changed" messages; client reacts without polling
const ws = new WebSocket('wss://app.example.com/events');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === 'post.updated') {
    queryClient.invalidateQueries({ queryKey: ['post', message.id] });
    queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] });
  }

  if (message.type === 'user.updated') {
    queryClient.invalidateQueries({ queryKey: ['user', message.id] });
  }
};

// Approach C: Tag-based invalidation for related data groups
// Tag queries at creation time, invalidate by tag
// (requires custom implementation or libs like react-query-kit)
function usePostsByTag(tag: string) {
  return useQuery({
    queryKey: ['posts', 'tag', tag],
    queryFn: () => fetchPostsByTag(tag),
    meta: { tags: ['posts', `tag:${tag}`] },
  });
}
```

---

### 6. LRU Eviction for Large Lists

In-memory caches are bounded by the JavaScript heap. Unbounded lists like search history, infinite scroll results, or autocomplete suggestions must enforce a maximum size and evict the least-recently-used entries.

```typescript
class LRUCache<K, V> {
  private readonly maxSize: number;
  private readonly map: Map<K, V>; // Map preserves insertion order in JS

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.map = new Map();
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    // Move to end (most recently used)
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key); // refresh position
    } else if (this.map.size >= this.maxSize) {
      // Evict the oldest entry (first item in Map iteration order)
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
    this.map.set(key, value);
  }
}

// Apply to autocomplete: keep only the last 50 search result sets
const searchCache = new LRUCache<string, SearchResult[]>(50);
```

React Query's `gcTime` and `maxPages` (for infinite queries) provide similar eviction at the query level without manual implementation.

---

### 7. Sensitive Data — Never Cache Auth Tokens in localStorage

```
localStorage     → persists across sessions, accessible to any JS on the page,
                   vulnerable to XSS exfiltration. NEVER store tokens here.

sessionStorage   → cleared on tab close, still accessible to JS on the page,
                   acceptable for short-lived UI state but not for tokens.

Memory (closure) → cleared on page refresh, not accessible outside the module,
                   best for access tokens (short-lived anyway).

HttpOnly Cookie  → not accessible to JavaScript at all, sent automatically by
                   the browser. Best for refresh tokens and session identifiers.

IndexedDB        → never store auth tokens; fine for user preferences and
                   cached API responses that do not contain credentials.
```

```typescript
// WRONG — token in localStorage survives XSS and tab sharing
localStorage.setItem('access_token', token);

// RIGHT — token in module-level memory only; refresh token in HttpOnly cookie
let accessToken: string | null = null;

export function setAccessToken(token: string) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// When the page refreshes, the access token is gone.
// The app calls POST /auth/refresh (sends HttpOnly cookie automatically)
// to silently get a new access token. This is the silent refresh pattern.
```

---

## Trade-offs

| Decision | Aggressive TTL | Conservative TTL | Recommendation |
|---|---|---|---|
| **Staleness risk** | Users see stale data | Users always get fresh data | Use stale-while-revalidate; serve from cache and refresh in background |
| **Performance** | Fewer network requests, faster UI | More requests, more latency | Aggressive for reference data, conservative for user-generated content |

| Decision | Normalization | Denormalization | Recommendation |
|---|---|---|---|
| **Invalidation complexity** | Single source of truth, easy to invalidate | Must invalidate every duplicated location | Normalize shared entities (users, products); denormalize for read-heavy views that never mutate locally |
| **Query complexity** | Requires joining entity caches | Single query returns full shape | Denormalized for simple apps, normalized for complex ones with many shared entities |

| Decision | Service Worker Cache | No Service Worker | Recommendation |
|---|---|---|---|
| **Complexity** | Significant — requires versioning, update flows, and testing | Simple | Only add SW when offline support or aggressive asset caching justifies the complexity |
| **Offline support** | Full degradation available | No offline | Required for PWAs; optional for standard web apps |

---

## Closing Statement

Client-side caching is a layered problem. HTTP headers handle assets and simple API responses for free. React Query or SWR handle the application cache with invalidation and optimistic UI. Service Workers add offline resilience and aggressive asset caching. Normalization prevents stale data when the same entity appears in multiple queries. The unifying principle is: **cache aggressively but invalidate precisely** — use event-driven invalidation (mutation callbacks, WebSocket messages) to keep caches coherent without forcing unnecessary network requests.
