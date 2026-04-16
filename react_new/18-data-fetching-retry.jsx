import { useState, useCallback, useRef } from "react";

// 18. Build a Data Fetching Layer with Retry & Error Handling

// ─── Retry-aware fetch utility ────────────────────────────────────────────────
async function fetchWithRetry(url, { maxRetries = 3, baseDelay = 500, timeout = 5000, signal } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Abort early if the caller cancelled
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    try {
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), timeout);
      // Merge caller's signal with our timeout signal
      signal?.addEventListener("abort", () => controller.abort());

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      if (err.name === "AbortError") throw err; // don't retry aborts
      lastError = err;

      if (attempt < maxRetries) {
        // Exponential back-off with jitter
        const delay = baseDelay * 2 ** attempt + Math.random() * 200;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
function useFetchWithRetry(options = {}) {
  const [state, setState] = useState({ data: null, loading: false, error: null, attempt: 0 });
  const abortRef = useRef(null);

  const execute = useCallback(async (url) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ data: null, loading: true, error: null, attempt: 0 });

    try {
      const data = await fetchWithRetry(url, { ...options, signal: controller.signal });
      setState({ data, loading: false, error: null, attempt: 0 });
    } catch (err) {
      if (err.name !== "AbortError") {
        setState((prev) => ({ ...prev, data: null, loading: false, error: err.message }));
      }
    }
  }, []); // eslint-disable-line

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, loading: false }));
  }, []);

  return { ...state, execute, cancel };
}

// ─── Demo ─────────────────────────────────────────────────────────────────────
const ENDPOINTS = [
  { label: "Users list",     url: "https://jsonplaceholder.typicode.com/users" },
  { label: "Posts list",     url: "https://jsonplaceholder.typicode.com/posts?_limit=5" },
  { label: "404 error",      url: "https://jsonplaceholder.typicode.com/nonexistent" },
  { label: "Timeout (will fail)", url: "https://httpbin.org/delay/10" },
];

export default function DataFetchingRetry() {
  const { data, loading, error, execute, cancel } = useFetchWithRetry({
    maxRetries: 2,
    baseDelay: 600,
    timeout: 4000,
  });
  const [active, setActive] = useState(null);

  const handleFetch = (endpoint) => {
    setActive(endpoint.label);
    execute(endpoint.url);
  };

  return (
    <div style={{ padding: 40, maxWidth: 640, fontFamily: "sans-serif" }}>
      <h2>Data Fetching with Retry & Error Handling</h2>
      <p style={{ color: "#666", fontSize: 14, marginTop: -8 }}>
        Max 2 retries · 600 ms base delay (exponential back-off) · 4 s timeout per attempt
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {ENDPOINTS.map((ep) => (
          <button
            key={ep.label}
            onClick={() => handleFetch(ep)}
            disabled={loading}
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              border: "1px solid #ccc",
              background: active === ep.label ? "#2196f3" : "#fff",
              color: active === ep.label ? "#fff" : "#333",
              cursor: loading ? "default" : "pointer",
              fontSize: 13,
            }}
          >
            {ep.label}
          </button>
        ))}
        {loading && (
          <button onClick={cancel} style={{ padding: "8px 14px", borderRadius: 20, border: "1px solid #f44336", color: "#f44336", background: "#fff", cursor: "pointer", fontSize: 13 }}>
            Cancel
          </button>
        )}
      </div>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#2196f3", fontSize: 14 }}>
          <span style={{ display: "inline-block", width: 18, height: 18, border: "3px solid #bbdefb", borderTopColor: "#2196f3", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          Fetching… (retries up to 2 times on failure)
        </div>
      )}

      {error && (
        <div style={{ background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: 6, padding: "12px 16px", color: "#c62828", fontSize: 14 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && !loading && (
        <div style={{ background: "#f1f8e9", border: "1px solid #c5e1a5", borderRadius: 6, padding: "12px 16px" }}>
          <strong style={{ fontSize: 14 }}>Response ({Array.isArray(data) ? data.length + " items" : "object"}):</strong>
          <pre style={{ fontSize: 12, maxHeight: 300, overflow: "auto", marginTop: 8 }}>
            {JSON.stringify(Array.isArray(data) ? data.slice(0, 3) : data, null, 2)}
            {Array.isArray(data) && data.length > 3 && `\n… and ${data.length - 3} more`}
          </pre>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
