import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMessages } from '../api/mockMessages';

const PAGE_SIZE = 20;

/**
 * Loads messages page-by-page using a bottom sentinel + IntersectionObserver.
 * loadingRef prevents duplicate in-flight requests (useState is async).
 */
export function useInfiniteMessages(pageSize = PAGE_SIZE) {
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const loadingRef = useRef(false);
  const sentinelRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || done) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const { messages: next, nextCursor } = await fetchMessages({
        cursor,
        limit: pageSize,
      });

      if (next.length === 0) {
        setDone(true);
        return;
      }

      setMessages((prev) => [...prev, ...next]);
      setCursor(nextCursor);
      setDone(!nextCursor);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Failed to load messages');
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [cursor, done, pageSize]);

  const retry = useCallback(() => {
    setError(null);
    loadMore();
  }, [loadMore]);

  // Initial page
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Observe sentinel inside the scroll container — no scroll listeners
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '120px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return { messages, loading, error, done, sentinelRef, retry };
}
