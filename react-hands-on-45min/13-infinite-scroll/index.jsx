import { useCallback, useEffect, useRef, useState } from 'react';

// mockFetchPage — simulates a paginated API with network latency.
// In production, replace with a real fetch() call.
async function mockFetchPage(page, pageSize) {
  await new Promise((r) => setTimeout(r, 350)); // simulate network delay
  const start = page * pageSize;
  return Array.from({ length: pageSize }, (_, i) => `Item ${start + i + 1}`);
}

// InfiniteScrollList — loads more items as the user scrolls to the bottom.
// Uses an IntersectionObserver watching a sentinel div — no scroll event listeners.
//
// Props:
//   pageSize — number of items to fetch per request (default 20)

export function InfiniteScrollList({ pageSize = 20 }) {
  // items — accumulated list of all loaded strings
  const [items, setItems] = useState([]);

  // page — next page to request (0-indexed)
  const [page, setPage] = useState(0);

  // status — drives the footer UI: 'idle' | 'loading' | 'error' | 'done'
  const [status, setStatus] = useState('idle');

  // loadingRef — synchronous guard against duplicate in-flight requests.
  // useRef (NOT useState): mutations are instantly visible without a re-render.
  // useState updates are async — a second observer callback could fire before
  // the re-render and still read the old false value, causing a duplicate fetch.
  const loadingRef = useRef(false);

  // sentinelRef — points to the invisible div at the bottom of the list.
  // The IntersectionObserver watches this element.
  const sentinelRef = useRef(null);

  // loadMore — fetch one page and append it to the list.
  // useCallback: stable identity unless page/pageSize/status change,
  // which controls when the observer effect below re-subscribes.
  const loadMore = useCallback(async () => {
    // Guard: skip if already loading, finished, or status says so.
    // loadingRef covers the synchronous gap before setStatus propagates.
    if (loadingRef.current || status === 'done' || status === 'loading') return;

    loadingRef.current = true; // set synchronously — blocks concurrent calls
    setStatus('loading');

    try {
      const next = await mockFetchPage(page, pageSize);

      if (next.length === 0) {
        setStatus('done');
        return;
      }

      // Append without overwriting previous items.
      // Functional update reads latest state even if batched.
      setItems((prev) => [...prev, ...next]);
      setPage((p) => p + 1);
      setStatus('idle');

      // Demo hard-stop — simulate a finite data set ending at page 4
      if (page >= 4) setStatus('done');
    } catch {
      setStatus('error');
    } finally {
      // Always release the guard, success or failure
      loadingRef.current = false;
    }
  }, [page, pageSize, status]);

  // Initial load — fires once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMore(); }, []);

  // IntersectionObserver setup — re-subscribes whenever loadMore changes identity.
  // If loadMore were omitted from deps, the observer would close over a stale
  // version that always sees the initial page/status values.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const ob = new IntersectionObserver(
      (entries) => {
        // entries[0] is the sentinel; isIntersecting = it entered the viewport
        if (entries[0]?.isIntersecting) loadMore();
      },
      // rootMargin: '120px' pre-fetches before the sentinel is fully visible,
      // hiding latency — new items arrive before the user hits the bottom.
      { rootMargin: '120px' }
    );

    ob.observe(el);

    // Cleanup: disconnect when effect re-runs or component unmounts.
    // Without this, the old observer keeps firing and causes duplicate fetches.
    return () => ob.disconnect();
  }, [loadMore]);

  return (
    // Constrained height + overflow:auto creates the scrollable container
    <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #ccc', padding: 8 }}>
      <ul>
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>

      {/* Sentinel: a 1px-tall invisible div the observer watches.
          Must sit INSIDE the scrollable container so the intersection
          root is the container, not the whole viewport. */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {/* Status indicators — only one renders at a time */}
      {status === 'loading' && <div>Loading more…</div>}
      {status === 'error'   && <div role="alert">Failed to load.</div>}
      {status === 'done'    && <div style={{ color: '#666', fontSize: 12 }}>End of list.</div>}
    </div>
  );
}
