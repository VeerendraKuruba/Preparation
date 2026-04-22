import { useRef, useCallback, useEffect, useState } from "react";

// ─── 1. Core: sliding window + abort ─────────────────────────────────────────

export function useRateLimitedFetch(maxRequests = 5, windowMs = 1000) {
  const timestamps = useRef([]);          // when each request fired
  const controllerRef = useRef(null);     // current AbortController

  // Cancel in-flight request when component unmounts
  useEffect(() => () => controllerRef.current?.abort(), []);

  const rateFetch = useCallback(
    async (url, options = {}) => {
      const now = Date.now();

      // Slide the window: drop timestamps older than windowMs
      timestamps.current = timestamps.current.filter(
        (t) => now - t < windowMs
      );

      if (timestamps.current.length >= maxRequests) {
        const oldest = timestamps.current[0];
        const waitMs = windowMs - (now - oldest);
        await new Promise((r) => setTimeout(r, waitMs));
      }

      // Cancel previous request (e.g. user typed again)
      controllerRef.current?.abort();
      controllerRef.current = new AbortController();

      timestamps.current.push(Date.now());

      const res = await fetch(url, {
        ...options,
        signal: controllerRef.current.signal,
      });

      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
      return res.json();
    },
    [maxRequests, windowMs]
  );

  return rateFetch;
}

// ─── 2. Usage in a component ──────────────────────────────────────────────────

export function SearchBox() {
  const [results, setResults] = useState([]);
  const [error, setError]     = useState(null);

  // max 3 requests per second
  const fetchData = useRateLimitedFetch(3, 1000);

  const handleChange = async (e) => {
    const q = e.target.value;
    if (!q) return;

    try {
      setError(null);
      const data = await fetchData(`/api/search?q=${q}`);
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

// ─── 3. Per-service version (multiple APIs) ───────────────────────────────────

const limiters = {};   // module-level cache, shared across components

function getServiceLimiter(service, max, windowMs) {
  if (!limiters[service]) {
    limiters[service] = { timestamps: [] };
  }
  return limiters[service];
}

export function useServiceFetch(service, max = 5, windowMs = 1000) {
  const controllerRef = useRef(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  return useCallback(async (url, options = {}) => {
    const limiter = getServiceLimiter(service);
    const now = Date.now();

    limiter.timestamps = limiter.timestamps.filter((t) => now - t < windowMs);

    if (limiter.timestamps.length >= max) {
      const wait = windowMs - (now - limiter.timestamps[0]);
      await new Promise((r) => setTimeout(r, wait));
    }

    controllerRef.current?.abort();
    controllerRef.current = new AbortController();
    limiter.timestamps.push(Date.now());

    const res = await fetch(url, { ...options, signal: controllerRef.current.signal });
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
    return res.json();
  }, [service, max, windowMs]);
}

// Usage:
//   const fetchAuth     = useServiceFetch("auth",     10, 1000);
//   const fetchPayments = useServiceFetch("payments",  5, 1000);
