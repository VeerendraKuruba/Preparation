# 23. Design Infinite Scroll for Millions of Items

> **Scope:** General-purpose infinite list (catalogs, audit logs, user tables). For social feed with ranking and real-time prepend, see [Q1 — Infinite Feed](./q01-infinite-feed-social-timeline.md).

## Clarifying Questions

1. **What is the list?** Products in a catalog (stable, searchable), audit logs (append-only, time-ordered), or user records (frequently updated)? The mutation pattern changes the pagination strategy.
2. **Sortable / filterable?** If the user can change sort order mid-scroll, the cursor strategy must reset. If filters are applied, in-flight requests for the old filter must be cancelled.
3. **Editable in-place?** If rows can be edited, we need to reconcile server state with local optimistic updates within the virtualized list.
4. **Row height?** Fixed-height rows enable simpler, faster virtualization (FixedSizeList). Variable-height rows (expandable items, wrapping text) require measurement and a cache.
5. **Target latency?** Sub-100ms scroll feel requires aggressive prefetch. If the API is slow (>500ms), we need larger pages and earlier prefetch triggers.
6. **Search?** Full-text search breaks cursor pagination — covered in trade-offs.

Assume for this answer: a product catalog, filterable + sortable, fixed-height rows (56px), read-only, cursor-based API, React with react-window and React Query.

---

## Architecture Diagram

```
User scrolls
     │
     ▼
┌────────────────────────────────────────────────────────────┐
│  VirtualList (react-window FixedSizeList)                  │
│  only renders ~20 DOM nodes regardless of total count      │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Row 0  (rendered — in viewport)                     │  │
│  │  Row 1  (rendered — in viewport)                     │  │
│  │  ...                                                 │  │
│  │  Row 19 (rendered — in viewport)                     │  │
│  │  ─────────────────────────────────────────────────── │  │
│  │  [Sentinel div — IntersectionObserver watches this]  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────┬──────────────────────────────┘
                              │ sentinel enters viewport
                              ▼
              ┌───────────────────────────┐
              │  useInfiniteQuery         │
              │  (React Query)            │
              │  pages[0] = items 0–49    │
              │  pages[1] = items 50–99   │
              │  pages[2] = fetching...   │
              └──────────────┬────────────┘
                             │  GET /products?cursor=<opaque>&limit=50
                             ▼
              ┌───────────────────────────┐
              │  Cursor API               │
              │  returns:                 │
              │  { items, nextCursor }    │
              │  cursor = base64(lastId + │
              │           lastSortKey)    │
              └───────────────────────────┘
                             │
              ┌──────────────▼────────────┐
              │  Memory Budget Manager    │
              │  max 5 pages in memory    │
              │  evict page[0] when       │
              │  page[5] arrives          │
              │  refetch page[0] when     │
              │  user scrolls back up     │
              └───────────────────────────┘
```

---

## Core Mechanics

### 1. Keyset / Cursor Pagination — Why Not OFFSET

**The OFFSET problem**: `SELECT * FROM products ORDER BY price LIMIT 50 OFFSET 5000` requires the database to scan and discard 5000 rows on every request. At millions of rows, this is a full table scan. Worse, if a new product is inserted while the user is scrolling, every row after it shifts by one index — causing duplicates or skipped rows between pages.

**Cursor-based pagination** uses the last item's sort key as the bookmark:

```sql
-- Page 1: no cursor
SELECT id, name, price FROM products
ORDER BY price ASC, id ASC
LIMIT 50;
-- Returns last item: { id: 'prod_789', price: 29.99 }

-- Page 2: cursor encodes (price=29.99, id='prod_789')
SELECT id, name, price FROM products
WHERE (price, id) > (29.99, 'prod_789')  -- row values comparison
ORDER BY price ASC, id ASC
LIMIT 50;
```

The compound `(price, id)` cursor handles ties in price. The `id` acts as a tiebreaker ensuring stable ordering. The database hits the index directly — no scan.

```typescript
// API response shape
interface PageResponse<T> {
  items: T[];
  nextCursor: string | null; // null means last page
  totalCount?: number;       // optional, expensive to compute
}

// Cursor encoding on the server
function encodeCursor(item: Product): string {
  return Buffer.from(JSON.stringify({
    price: item.price,
    id:    item.id,
  })).toString('base64url');
}

function decodeCursor(cursor: string): { price: number; id: string } {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
}
```

---

### 2. React Query Infinite + IntersectionObserver Sentinel

```tsx
// hooks/useProductList.ts
import { useInfiniteQuery } from '@tanstack/react-query';

interface Filters { search: string; category: string; sortBy: 'price' | 'name' }

async function fetchProducts(
  cursor: string | undefined,
  filters: Filters,
  signal: AbortSignal
): Promise<PageResponse<Product>> {
  const params = new URLSearchParams({
    limit: '50',
    ...(cursor && { cursor }),
    ...filters,
  });
  const res = await fetch(`/api/products?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useProductList(filters: Filters) {
  return useInfiniteQuery({
    queryKey: ['products', filters], // filter change = new cache entry = reset
    queryFn: ({ pageParam, signal }) =>
      fetchProducts(pageParam as string | undefined, filters, signal),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}
```

```tsx
// components/ProductList.tsx
import { useRef, useEffect, useCallback } from 'react';
import { FixedSizeList } from 'react-window';
import { useProductList } from '../hooks/useProductList';

const ROW_HEIGHT = 56;
const PREFETCH_THRESHOLD = 10; // load next page when 10 rows from the end

export function ProductList({ filters }: { filters: Filters }) {
  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, status
  } = useProductList(filters);

  // Flatten pages into a single array, deduplicating by id
  const allItems = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    return data.pages.flatMap(page =>
      page.items.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      })
    );
  }, [data]);

  // Sentinel ref for IntersectionObserver
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: `${PREFETCH_THRESHOLD * ROW_HEIGHT}px` } // trigger early
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderRow = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = allItems[index];
      if (!item) return <div style={style}><RowSkeleton /></div>;
      return (
        <div style={style} key={item.id}>
          <ProductRow product={item} />
        </div>
      );
    },
    [allItems]
  );

  if (status === 'pending') return <ListSkeleton />;
  if (status === 'error')   return <ErrorState />;

  return (
    <div style={{ position: 'relative' }}>
      <FixedSizeList
        height={window.innerHeight - 120} // viewport minus header
        itemCount={allItems.length}
        itemSize={ROW_HEIGHT}
        width="100%"
      >
        {renderRow}
      </FixedSizeList>
      {/* Sentinel sits below the list */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {isFetchingNextPage && <LoadingBar />}
    </div>
  );
}
```

---

### 3. AbortController for Filter Changes

When the user changes a filter (e.g., switches category), the in-flight request for the old filter must be cancelled. React Query handles this automatically through the `signal` parameter in the query function — when the query key changes (`['products', filters]`), React Query aborts the previous request's signal before starting the new one.

```typescript
// The signal passed to queryFn is automatically aborted by React Query
// when the query key changes or the component unmounts.
queryFn: ({ pageParam, signal }) =>
  fetchProducts(pageParam, filters, signal),
  //                               ^^^^^^ pass to fetch(), React Query manages it

// On the fetch side:
const res = await fetch(url, { signal }); // AbortError thrown if cancelled
```

For manual control (e.g., a debounced search input), keep a ref to the controller:

```typescript
const abortRef = useRef<AbortController | null>(null);

function handleSearchChange(value: string) {
  abortRef.current?.abort(); // cancel previous
  abortRef.current = new AbortController();
  debouncedSearch(value, abortRef.current.signal);
}
```

---

### 4. Variable-Height Rows with Measurement Cache

When row heights vary (e.g., product descriptions wrap differently), use `VariableSizeList` with a measurement cache:

```tsx
import { VariableSizeList } from 'react-window';
import { useRef, useCallback } from 'react';

const DEFAULT_HEIGHT = 56;

export function VariableProductList({ items }: { items: Product[] }) {
  const listRef = useRef<VariableSizeList>(null);
  const heightCache = useRef<Record<number, number>>({});

  const getItemSize = useCallback((index: number) => {
    return heightCache.current[index] ?? DEFAULT_HEIGHT;
  }, []);

  const onItemMeasured = useCallback((index: number, height: number) => {
    if (heightCache.current[index] === height) return; // no-op if unchanged
    heightCache.current[index] = height;
    // Tell react-window to recalculate from this index
    listRef.current?.resetAfterIndex(index, false);
  }, []);

  return (
    <VariableSizeList
      ref={listRef}
      height={600}
      itemCount={items.length}
      itemSize={getItemSize}
      width="100%"
    >
      {({ index, style }) => (
        <MeasuredRow
          style={style}
          item={items[index]}
          onMeasure={(h) => onItemMeasured(index, h)}
        />
      )}
    </VariableSizeList>
  );
}

// MeasuredRow uses ResizeObserver to report its actual height
function MeasuredRow({ style, item, onMeasure }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      onMeasure(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [onMeasure]);

  return (
    <div ref={ref} style={style}>
      <ProductRow product={item} />
    </div>
  );
}
```

---

### 5. Memory Budget — Evicting Old Pages

Holding 100 pages × 50 items × ~2KB each = 10MB of JS objects. At some point the browser will GC-pressure and the tab will slow down. Implement a page window:

```typescript
const MAX_PAGES_IN_MEMORY = 5;

// React Query's maxPages option handles this natively:
useInfiniteQuery({
  queryKey: ['products', filters],
  queryFn: ...,
  maxPages: MAX_PAGES_IN_MEMORY, // only keep the last 5 pages
  // when user scrolls back past page 0, React Query refetches it
});
```

When using `maxPages`, the query evicts the oldest page when a new one is appended. If the user scrolls back to the evicted range, React Query automatically refetches it. The virtual list must handle this by checking if the item at a given index exists yet and showing a skeleton row if not.

---

### 6. Backpressure — Stop Prefetch on Memory Pressure or Tab Hidden

```typescript
// Stop fetching when tab is hidden (saves battery, network)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    queryClient.setDefaultOptions({
      queries: { refetchInterval: false, enabled: false }
    });
  } else {
    queryClient.setDefaultOptions({
      queries: { refetchInterval: undefined, enabled: true }
    });
  }
});

// Memory pressure via experimental API (Chrome only, degrade gracefully)
if ('memory' in performance) {
  const checkMemory = () => {
    const mem = (performance as any).memory;
    const usageRatio = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
    if (usageRatio > 0.8) {
      // Reduce max pages and stop prefetching
      console.warn('Memory pressure, pausing prefetch');
    }
  };
  setInterval(checkMemory, 10_000);
}
```

---

### 7. Deduplication When Pages Overlap

Race conditions can cause the same item to appear in two pages (e.g., a fast insert between page fetches). The flat-map deduplication by `id` in step 2 handles this. If ordering matters, keep the first occurrence:

```typescript
const allItems = data.pages.flatMap(p => p.items).reduce((acc, item) => {
  if (!acc.ids.has(item.id)) {
    acc.ids.add(item.id);
    acc.items.push(item);
  }
  return acc;
}, { ids: new Set<string>(), items: [] as Product[] }).items;
```

---

## Trade-off Analysis

### Fixed Height vs Variable Height

| Dimension | FixedSizeList | VariableSizeList |
|---|---|---|
| Performance | O(1) scroll position calc | Must sum heights, measurement cost |
| Implementation | Simple | ResizeObserver + height cache |
| Layout shift | None | Flash on first render before measure |
| Use when | Tables, lists with uniform rows | Cards, messages, expandable rows |

**Recommendation**: Default to fixed height. If the design genuinely requires variable heights, measure lazily and show a skeleton at the default height until measured.

### Cursor vs OFFSET Pagination

| Dimension | Cursor | OFFSET |
|---|---|---|
| Deep page performance | O(log n) — index seek | O(n) — scan and discard |
| Stability on insert | Stable — cursor anchors to item | Unstable — items shift |
| Random access | Cannot jump to page 50 | Can jump to any page |
| Implementation | Server complexity (cursor encode/decode) | Simple |
| Search support | No — cannot cursor into full-text results | Yes — but expensive |

**Recommendation**: Always use cursor pagination for scrollable lists. For search results (where random access is acceptable and result sets are bounded), OFFSET is fine.

### Prefetch Distance

A short prefetch distance (e.g., trigger when 2 rows from the bottom) means users will see a loading indicator momentarily when they scroll fast. A long prefetch distance (e.g., 10 rows = 560px ahead) means more wasted fetches if the user stops scrolling. Choose based on API latency: `prefetch_distance = api_p99_latency_ms * scroll_speed_rows_per_ms`.

---

## Closing Statement

Infinite scroll at scale is three coordinated problems: the database must never scan rows it won't return (cursor pagination), the browser must never hold DOM nodes it cannot see (virtualization), and the client must never hold data it has scrolled far past (page eviction). The solution I described — react-window for virtualization, React Query's `useInfiniteQuery` with `maxPages` for page management, IntersectionObserver for triggering fetches, and AbortController for cancelling stale requests — handles all three. The key insight is that these concerns are layered: fix the database problem first (cursor API), then fix the DOM problem (virtual list), then fix the memory problem (page budget). Each layer is independently testable and independently replaceable.
