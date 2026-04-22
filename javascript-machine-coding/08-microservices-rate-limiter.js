import { useRef, useCallback, useEffect, useState } from "react";

/**
 * Sliding window + AbortController rate limiter for React.
 *
 * - Waits before sending if window is full (promise-based queue)
 * - Cancels previous in-flight request on each new call (AbortController)
 * - Auto-cancels on component unmount
 */
export function useRateLimitedFetch(maxRequests = 5, windowMs = 1000) {
  const timestamps    = useRef([]);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return useCallback(async (url, options = {}) => {
    const now = Date.now();

    // drop timestamps outside the current window
    timestamps.current = timestamps.current.filter((t) => now - t < windowMs);

    // window full — wait until the oldest slot expires
    if (timestamps.current.length >= maxRequests) {
      const waitMs = windowMs - (now - timestamps.current[0]);
      await new Promise((r) => setTimeout(r, waitMs));
    }

    // cancel previous request (stale search, fast re-render, etc.)
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    timestamps.current.push(Date.now());

    const res = await fetch(url, { ...options, signal: controllerRef.current.signal });
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
    return res.json();
  }, [maxRequests, windowMs]);
}

// ─── Usage ────────────────────────────────────────────────────────────────────

export function SearchBox() {
  const [results, setResults] = useState([]);
  const [error, setError]     = useState(null);

  const fetchData = useRateLimitedFetch(3, 1000); // max 3 req/s

  const handleChange = async (e) => {
    try {
      setError(null);
      const data = await fetchData(`/api/search?q=${e.target.value}`);
      setResults(data);
    } catch (err) {
      if (err.name === "AbortError") return; // stale request, ignore
      setError(err.message);
    }
  };

  return (
    <div>
      <input onChange={handleChange} placeholder="Search..." />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>{results.map((r) => <li key={r.id}>{r.name}</li>)}</ul>
    </div>
  );
}
