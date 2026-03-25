import { useEffect, useState } from 'react';

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function SearchWithDebounce({ endpoint, debounceMs = 300, minLength = 2 }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q, debounceMs);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (dq.length < minLength) {
      setResults([]);
      setError(null);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}q=${encodeURIComponent(dq)}`;
    fetch(url, { signal: ac.signal })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        const items = Array.isArray(data) ? data : data.items ?? [];
        setResults(items);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Request failed');
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [dq, minLength, endpoint]);

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search…"
        aria-label="Search"
        autoComplete="off"
      />
      {loading && <div>Loading…</div>}
      {error && <div role="alert">{error}</div>}
      <ul>
        {results.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
