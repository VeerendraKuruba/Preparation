import { useCallback, useEffect, useRef, useState } from 'react';

async function mockFetchPage(page: number, pageSize: number): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 350));
  const start = page * pageSize;
  return Array.from({ length: pageSize }, (_, i) => `Item ${start + i + 1}`);
}

type InfiniteScrollListProps = {
  pageSize?: number;
};

export function InfiniteScrollList({ pageSize = 20 }: InfiniteScrollListProps) {
  const [items, setItems] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || status === 'done' || status === 'loading') return;
    loadingRef.current = true;
    setStatus('loading');
    try {
      const next = await mockFetchPage(page, pageSize);
      if (next.length === 0) {
        setStatus('done');
        return;
      }
      setItems((prev) => [...prev, ...next]);
      setPage((p) => p + 1);
      setStatus('idle');
      if (page >= 4) setStatus('done');
    } catch {
      setStatus('error');
    } finally {
      loadingRef.current = false;
    }
  }, [page, pageSize, status]);

  useEffect(() => {
    loadMore();
    // initial load only — eslint: we intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '120px' }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [loadMore]);

  return (
    <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid #ccc', padding: 8 }}>
      <ul>
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
      <div ref={sentinelRef} style={{ height: 1 }} />
      {status === 'loading' && <div>Loading more…</div>}
      {status === 'error' && <div role="alert">Failed to load.</div>}
      {status === 'done' && <div style={{ color: '#666', fontSize: 12 }}>End of list (demo).</div>}
    </div>
  );
}
