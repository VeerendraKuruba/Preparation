import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// useDebounced — delays propagating a value until it has been stable for `ms`.
//
// How it works:
//   Every time `value` changes the effect schedules a setTimeout.
//   The cleanup cancels the previous timer before the new one is set.
//   The debounced value only updates when a full `ms` period passes
//   with no new change — this IS the debounce pattern.
// ---------------------------------------------------------------------------
function useDebounced(value, ms) {
  const [v, setV] = useState(value);

  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t); // cancel on next keystroke
  }, [value, ms]);

  return v;
}

// ---------------------------------------------------------------------------
// SearchWithDebounce
// Props:
//   endpoint   — API base URL; query is appended as ?q=...
//   debounceMs — wait time after typing stops (default 300ms)
//   minLength  — minimum chars before firing a request (default 2)
// ---------------------------------------------------------------------------
export function SearchWithDebounce({ endpoint, debounceMs = 300, minLength = 2 }) {
  const [q, setQ]           = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // dq: the debounced query — only settles after debounceMs of silence.
  // The fetch effect depends on dq, not q, so rapid keystrokes don't
  // fire a network request on every character.
  const dq = useDebounced(q, debounceMs);

  useEffect(() => {
    if (dq.length < minLength) {
      setResults([]);
      setError(null);
      return;
    }

    // Create one AbortController per request.
    // When cleanup runs (dq changes or component unmounts), ac.abort()
    // cancels the in-flight fetch so stale responses never overwrite fresh ones.
    const ac = new AbortController();

    setLoading(true);
    setError(null);

    const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}q=${encodeURIComponent(dq)}`;

    fetch(url, { signal: ac.signal })
      .then((r) => {
        // fetch() only rejects on network failure — check r.ok for HTTP errors
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        const items = Array.isArray(data) ? data : data.items ?? [];
        setResults(items);
      })
      .catch((e) => {
        // AbortError is intentional (fired by cleanup) — not a real error
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Request failed');
      })
      .finally(() => setLoading(false));

    return () => ac.abort(); // cancel stale request when query changes
  }, [dq, minLength, endpoint]);

  return (
    <div>
      {/* q updates on every keystroke (responsive input); dq triggers the fetch */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search..."
        aria-label="Search"
        autoComplete="off"
      />

      {loading && <div>Loading...</div>}

      {/* role="alert" announces errors immediately to screen readers */}
      {error && <div role="alert">{error}</div>}

      <ul>
        {results.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
