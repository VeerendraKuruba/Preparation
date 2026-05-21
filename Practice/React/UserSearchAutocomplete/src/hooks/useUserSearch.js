import { useState, useEffect } from 'react';

const API_BASE = 'https://dummyjson.com/users/search';

/**
 * Fetches users from DummyJSON for the given query.
 * Uses AbortController to cancel in-flight requests when the query changes.
 */
export function useUserSearch(debouncedQuery) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const query = (debouncedQuery || '').trim();
    if (!query) {
      setUsers([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}?q=${encodeURIComponent(query)}`, { signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const list = data.users ?? [];
        setUsers(list);
        setError(null);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Failed to fetch users');
        setUsers([]);
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery]);

  return { users, loading, error };
}
