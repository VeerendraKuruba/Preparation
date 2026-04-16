import { useState, useRef, useCallback } from "react";

// 16. Build a Client-Side Cache Manager

// ─── Cache implementation ─────────────────────────────────────────────────────
class LRUCache {
  constructor(maxSize = 50, ttlMs = 30_000) {
    this.maxSize = maxSize;
    this.ttlMs   = ttlMs;
    this.store   = new Map(); // key → { value, expiresAt }
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // LRU: re-insert to make it most-recently-used
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.store.has(key)) this.store.delete(key); // refresh position
    else if (this.store.size >= this.maxSize) {
      // Evict the least-recently-used (first inserted entry)
      this.store.delete(this.store.keys().next().value);
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key) { this.store.delete(key); }
  clear()     { this.store.clear(); }

  entries() {
    const now = Date.now();
    return [...this.store.entries()]
      .filter(([, v]) => v.expiresAt > now)
      .map(([k, v]) => ({ key: k, value: v.value, ttl: Math.round((v.expiresAt - now) / 1000) }))
      .reverse(); // most-recently-used first
  }
}

// ─── React hook ───────────────────────────────────────────────────────────────
function useCache(maxSize = 10, ttlMs = 15_000) {
  const cache  = useRef(new LRUCache(maxSize, ttlMs));
  const [, forceUpdate] = useState(0); // to re-render on cache changes

  const refresh = useCallback(() => forceUpdate((n) => n + 1), []);

  const get = useCallback((key) => cache.current.get(key), []);

  const set = useCallback((key, value) => {
    cache.current.set(key, value);
    refresh();
  }, [refresh]);

  const remove = useCallback((key) => {
    cache.current.delete(key);
    refresh();
  }, [refresh]);

  const clear = useCallback(() => {
    cache.current.clear();
    refresh();
  }, [refresh]);

  const entries = useCallback(() => cache.current.entries(), []);

  return { get, set, remove, clear, entries };
}

// ─── Mock async fetch ─────────────────────────────────────────────────────────
async function mockFetch(userId) {
  await new Promise((r) => setTimeout(r, 600));
  return {
    id: userId,
    name: ["Alice", "Bob", "Charlie", "Diana", "Eve"][userId % 5],
    email: `user${userId}@example.com`,
    role: ["Admin", "Editor", "Viewer"][userId % 3],
  };
}

// ─── Demo ─────────────────────────────────────────────────────────────────────
export default function CacheManagerDemo() {
  const { get, set, remove, clear, entries } = useCache(6, 20_000);
  const [userId, setUserId]   = useState("1");
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource]   = useState(null); // "cache" | "network"

  const fetchUser = async () => {
    const key = `user:${userId}`;
    const cached = get(key);
    if (cached) {
      setResult(cached);
      setSource("cache ✓");
      return;
    }
    setLoading(true);
    setSource(null);
    try {
      const data = await mockFetch(Number(userId));
      set(key, data);
      setResult(data);
      setSource("network");
    } finally {
      setLoading(false);
    }
  };

  const cacheEntries = entries();

  return (
    <div style={{ padding: 40, maxWidth: 640, fontFamily: "sans-serif" }}>
      <h2>Client-Side Cache Manager (LRU + TTL)</h2>
      <p style={{ color: "#666", fontSize: 14, marginTop: -8 }}>
        Max size: 6 entries · TTL: 20 s · Algorithm: LRU eviction
      </p>

      {/* Fetch panel */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, alignItems: "center" }}>
        <label style={{ fontSize: 14 }}>
          User ID (1–99):&nbsp;
          <input
            type="number"
            min={1}
            max={99}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            style={{ width: 70, padding: "6px 8px", borderRadius: 4, border: "1px solid #ccc" }}
          />
        </label>
        <button onClick={fetchUser} disabled={loading} style={{ padding: "8px 16px" }}>
          {loading ? "Fetching…" : "Fetch User"}
        </button>
        <button onClick={clear} style={{ padding: "8px 16px", color: "#f44336" }}>
          Clear Cache
        </button>
      </div>

      {/* Result */}
      {result && (
        <div
          style={{
            background: source === "cache ✓" ? "#e8f5e9" : "#e3f2fd",
            border: `1px solid ${source === "cache ✓" ? "#a5d6a7" : "#90caf9"}`,
            borderRadius: 6,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          <strong>Source: {source}</strong>
          <pre style={{ margin: "8px 0 0", fontSize: 13 }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {/* Cache inspector */}
      <h3 style={{ fontSize: 16 }}>Cache Inspector ({cacheEntries.length} / 6 entries)</h3>
      {cacheEntries.length === 0 ? (
        <p style={{ color: "#999", fontSize: 14 }}>Cache is empty.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Key</th>
              <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Value</th>
              <th style={{ padding: "8px 12px", textAlign: "right", borderBottom: "2px solid #ddd" }}>TTL (s)</th>
              <th style={{ padding: "8px 12px", borderBottom: "2px solid #ddd" }}></th>
            </tr>
          </thead>
          <tbody>
            {cacheEntries.map((e) => (
              <tr key={e.key} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "8px 12px", fontWeight: "bold" }}>{e.key}</td>
                <td style={{ padding: "8px 12px", color: "#555" }}>{e.value.name} ({e.value.role})</td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: e.ttl < 5 ? "#f44336" : "#4caf50" }}>
                  {e.ttl}s
                </td>
                <td style={{ padding: "8px 12px" }}>
                  <button
                    onClick={() => remove(e.key)}
                    style={{ fontSize: 12, color: "#f44336", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Evict
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
