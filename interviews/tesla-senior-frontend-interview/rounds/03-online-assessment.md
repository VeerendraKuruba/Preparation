# Round 3 — Online Assessment *(Optional ~30%)*

| | |
|---|---|
| **Format** | Codility / HackerRank, ~90 min, 1–2 tasks |
| **Eliminates?** | Yes |
| **Focus** | API + pagination + React Context, clean component structure |

---

## What They Evaluate

- Working code under time pressure (not perfect architecture)
- API integration with edge cases
- React component boundaries
- Explicit loading / error / empty handling
- Readable code — senior engineers still fail on messy OA submissions

---

## Reported Tesla OA Tasks

| Task | Frequency |
|------|-----------|
| Paginated API + list + "Load more" | Very common |
| React Context for shared list state | Very common |
| Pure JS array/string manipulation | Sometimes |
| React Context + API pagination combined | Reported 2022–2024 |

---

## Main Task — Paginated List with Context

### Prompt (typical)
> Build a React app that fetches items from `GET /api/items?page=N`. Display them in a list. Provide a button to load the next page and append results. Use React Context to share state between components. Handle loading and errors.

### Requirements breakdown

| Requirement | Why it matters |
|-------------|----------------|
| Append, don't replace pages | Common bug: `setItems(data.items)` overwrites |
| Disable while loading | Prevents duplicate page fetches |
| `key={item.id}` | Stable list identity |
| Context | Explicit OA requirement |
| Error UI | `role="alert"` for a11y |
| Empty state | First page with zero items ≠ error |

---

### Full Solution (with App wrapper)

```tsx
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

type Item = { id: string; name: string };

type ListContextValue = {
  items: Item[];
  loadMore: () => Promise<void>;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
};

const ListContext = createContext<ListContextValue | null>(null);

export function ListProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/items?page=${page}`);
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      const data: { items: Item[]; hasMore: boolean } = await res.json();

      setItems(prev => [...prev, ...data.items]);
      setHasMore(data.hasMore);
      setPage(p => p + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);

  const value = { items, loadMore, loading, error, hasMore };

  return (
    <ListContext.Provider value={value}>
      {children}
    </ListContext.Provider>
  );
}

export function useList() {
  const ctx = useContext(ListContext);
  if (!ctx) {
    throw new Error('useList must be used within ListProvider');
  }
  return ctx;
}

function ItemList() {
  const { items, loadMore, loading, error, hasMore } = useList();

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentional: load page 1 once on mount

  if (error) {
    return (
      <p role="alert" style={{ color: 'crimson' }}>
        {error}
      </p>
    );
  }

  if (!loading && items.length === 0) {
    return <p>No items found.</p>;
  }

  return (
    <div>
      <ul>
        {items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
      {hasMore && (
        <button type="button" onClick={loadMore} disabled={loading}>
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
      {!hasMore && items.length > 0 && (
        <p aria-live="polite">All items loaded.</p>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ListProvider>
      <h1>Items</h1>
      <ItemList />
    </ListProvider>
  );
}
```

---

## Q&A — Detailed Follow-ups

### Q: Empty first page vs end of list — how do you tell?

**Detailed answer:**

> **Empty first page:** API returns `{ items: [], hasMore: false }` on page 1 — show "No items found." This is valid data, not an error.
>
> **End of list:** User loaded pages 1–N; last response has `hasMore: false` with non-empty `items` — hide "Load more" button, optionally show "All items loaded."
>
> **Error:** Network failure or `!res.ok` — show error message with retry button; don't clear existing items if we're loading page 2+ (keep stale data visible).

```tsx
// Retry pattern for page 2+ errors
{error && items.length > 0 && (
  <>
    <p role="alert">{error}</p>
    <button onClick={loadMore}>Retry</button>
  </>
)}
```

---

### Q: Context causes everything to re-render — fix?

**Detailed answer:**

> When `ListContext.Provider` value is a new object every render, all consumers re-render. Fixes:
>
> **1. Split contexts (best for OA+):**
```tsx
const ListDataContext = createContext({ items: [], loading: false, error: null, hasMore: true });
const ListActionsContext = createContext({ loadMore: async () => {} });
// Consumers that only call loadMore don't re-render when items change
```
>
> **2. Memoize value:**
```tsx
const value = useMemo(() => ({ items, loadMore, loading, error, hasMore }), [items, loadMore, loading, error, hasMore]);
```
>
> **3. Production:** TanStack Query — `useInfiniteQuery` handles cache, dedupe, and granular subscriptions. Mention this in comments if OA requires Context.

---

### Q: React Strict Mode double-mount fetches twice?

**Detailed answer:**

> In development, Strict Mode mounts → unmounts → remounts to surface effect bugs. That can trigger two page-1 fetches.
>
> **Fixes:**
> - AbortController in cleanup
> - `useRef` guard for initial fetch
> - In production Strict Mode doesn't double-fetch the same way
>
> For OA, add comment: `// Strict Mode may double-fetch in dev; production OK` — shows awareness.

```tsx
useEffect(() => {
  const ac = new AbortController();
  fetch(`/api/items?page=1`, { signal: ac.signal })
    .then(/* ... */)
    .catch(e => { if (e.name !== 'AbortError') setError(e.message); });
  return () => ac.abort();
}, []);
```

---

### Q: Pure JS OA — common patterns

**Example:** "Given an array of API pages, flatten all items."

```js
function flattenPages(pages) {
  return pages.flatMap(page => page.items ?? []);
}

// Or reduce
function flattenPagesReduce(pages) {
  return pages.reduce((acc, p) => acc.concat(p.items ?? []), []);
}
```

**Example:** "Remove duplicates by id after merging pages."

```js
function mergeUniquePages(pages) {
  const map = new Map();
  for (const page of pages) {
    for (const item of page.items ?? []) {
      map.set(item.id, item);
    }
  }
  return [...map.values()];
}
```

---

## Common Bugs That Fail OA

| Bug | Fix |
|-----|-----|
| `setItems(data.items)` replaces instead of append | `setItems(prev => [...prev, ...data.items])` |
| Button not disabled during load | Double-fetch same page |
| Missing `!res.ok` check | Silent failure on 404/500 |
| `key={index}` | Use `key={item.id}` |
| No Context — prop drilling | Wrap in Provider |
| Infinite loop in useEffect | Don't put unstable deps |

---

## Time Budget (90 min)

| Min | Task |
|-----|------|
| 0–10 | Read prompt, sketch component tree |
| 10–50 | Golden path: fetch + list + load more |
| 50–70 | Context refactor + error/empty |
| 70–85 | Edge cases + cleanup |
| 85–90 | Manual test all states |

---

## Grading Rubric

| Criteria | Points |
|----------|--------|
| First page loads | Required |
| Load more appends | Required |
| Context used correctly | Required |
| Loading disabled state | Required |
| Error handling | Required |
| Empty state | Required |
| Clean readable code | Bonus |
| Split context / abort | Senior bonus |

---

## Prep Checklist

- [ ] Build full solution from scratch in 45 min (no autocomplete)
- [ ] Test with mock: success, empty, error, hasMore false
- [ ] Explain Context re-render fix aloud
- [ ] Practice pure JS flatten/merge once

**Next round:** [04-phone-screen.md](./04-phone-screen.md)
