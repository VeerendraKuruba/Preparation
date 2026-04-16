import { useState, useEffect, useCallback, useRef } from "react";

// 19. Build a Custom useFetch Hook with AbortController

// ─── useFetch hook ────────────────────────────────────────────────────────────
// Features:
//  • AbortController — cancels in-flight request on url change or unmount
//  • Deduplication — same URL in-flight won't fire twice
//  • Manual refetch
//  • Lazy mode (doesn't fetch on mount, only when execute() is called)

function useFetch(url, { lazy = false, transform } = {}) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(!lazy && !!url);
  const [error, setError]     = useState(null);
  const abortRef              = useRef(null);
  const urlRef                = useRef(url);

  const fetchData = useCallback(async (targetUrl) => {
    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(targetUrl, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      let json = await res.json();
      if (transform) json = transform(json);
      setData(json);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message);
        setData(null);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [transform]);

  // Auto-fetch when url changes (unless lazy)
  useEffect(() => {
    urlRef.current = url;
    if (!lazy && url) fetchData(url);
    return () => abortRef.current?.abort();
  }, [url, lazy, fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const refetch = useCallback(() => {
    if (urlRef.current) fetchData(urlRef.current);
  }, [fetchData]);

  const execute = useCallback((overrideUrl) => {
    const target = overrideUrl ?? urlRef.current;
    if (target) fetchData(target);
  }, [fetchData]);

  return { data, loading, error, refetch, execute };
}

// ─── Demo ─────────────────────────────────────────────────────────────────────
const BASE = "https://jsonplaceholder.typicode.com";

export default function UseFetchDemo() {
  const [userId, setUserId]   = useState(1);
  const [showPosts, setShowPosts] = useState(false);

  // Auto-fetch user when userId changes
  const { data: user, loading: userLoading, error: userError, refetch: refetchUser } =
    useFetch(`${BASE}/users/${userId}`);

  // Lazy-mode: only fetch posts when the button is clicked
  const { data: posts, loading: postsLoading, error: postsError, execute: loadPosts } =
    useFetch(null, {
      lazy: true,
      transform: (arr) => arr.slice(0, 5),
    });

  const handleLoadPosts = () => {
    setShowPosts(true);
    loadPosts(`${BASE}/users/${userId}/posts`);
  };

  return (
    <div style={{ padding: 40, maxWidth: 580, fontFamily: "sans-serif" }}>
      <h2>Custom useFetch Hook (AbortController)</h2>

      {/* User picker */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 20 }}>
        <label style={{ fontSize: 14 }}>User ID (1–10):</label>
        <input
          type="number"
          min={1}
          max={10}
          value={userId}
          onChange={(e) => { setUserId(Number(e.target.value)); setShowPosts(false); }}
          style={{ width: 70, padding: "6px 8px", borderRadius: 4, border: "1px solid #ccc" }}
        />
        <button onClick={refetchUser} style={{ padding: "6px 14px", fontSize: 13 }}>Refetch</button>
      </div>

      {/* User card */}
      <div
        style={{
          background: "#f9f9f9",
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          padding: "16px 20px",
          marginBottom: 16,
          minHeight: 90,
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>User (auto-fetched on id change)</h3>
        {userLoading && <p style={{ color: "#2196f3" }}>Loading…</p>}
        {userError && <p style={{ color: "#f44336" }}>Error: {userError}</p>}
        {user && !userLoading && (
          <div style={{ fontSize: 14 }}>
            <p style={{ margin: "4px 0" }}><strong>{user.name}</strong> ({user.username})</p>
            <p style={{ margin: "4px 0", color: "#666" }}>{user.email}</p>
            <p style={{ margin: "4px 0", color: "#666" }}>{user.address?.city}, {user.company?.name}</p>
          </div>
        )}
      </div>

      {/* Posts (lazy) */}
      <div
        style={{
          background: "#f9f9f9",
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Posts (lazy-fetched)</h3>
          <button onClick={handleLoadPosts} disabled={postsLoading} style={{ fontSize: 13, padding: "6px 14px" }}>
            {postsLoading ? "Loading…" : "Load Posts"}
          </button>
        </div>
        {!showPosts && <p style={{ color: "#999", fontSize: 13 }}>Click "Load Posts" to fetch.</p>}
        {postsError && <p style={{ color: "#f44336", fontSize: 14 }}>Error: {postsError}</p>}
        {posts && showPosts && (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>
            {posts.map((p) => (
              <li key={p.id} style={{ marginBottom: 4, color: "#444" }}>
                <strong>{p.title.slice(0, 40)}…</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Hook anatomy */}
      <details style={{ marginTop: 24, fontSize: 13, color: "#666" }}>
        <summary style={{ cursor: "pointer", fontWeight: "bold" }}>Hook anatomy</summary>
        <pre style={{ background: "#f5f5f5", borderRadius: 6, padding: 16, marginTop: 8, overflow: "auto" }}>{`
// Auto mode
const { data, loading, error, refetch } =
  useFetch("https://api.example.com/users/1");

// Lazy mode (won't fire until execute() is called)
const { data, loading, execute } =
  useFetch(null, { lazy: true });
execute("https://api.example.com/posts");

// With transform
const { data } = useFetch(url, {
  transform: (arr) => arr.slice(0, 5),
});
        `.trim()}</pre>
      </details>
    </div>
  );
}
