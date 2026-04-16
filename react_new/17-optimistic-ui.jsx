import { useState, useCallback } from "react";

// 17. Build an Optimistic UI Update Flow
// Pattern: update UI immediately, roll back on server error.

// ─── Simulated API ────────────────────────────────────────────────────────────
async function simulateToggleLike(postId, liked) {
  await new Promise((r) => setTimeout(r, 800));
  // Simulate ~25% failure rate to demonstrate rollback
  if (Math.random() < 0.25) throw new Error("Network error — like failed");
  return { postId, liked };
}

async function simulateDeletePost(postId) {
  await new Promise((r) => setTimeout(r, 700));
  if (Math.random() < 0.3) throw new Error("Server error — delete failed");
  return { postId };
}

// ─── Initial Data ─────────────────────────────────────────────────────────────
const SEED_POSTS = [
  { id: 1, author: "Alice",   text: "Just shipped a new React feature! 🚀", likes: 42, liked: false },
  { id: 2, author: "Bob",     text: "Optimistic UI makes apps feel so snappy.",  likes: 18, liked: false },
  { id: 3, author: "Charlie", text: "Context + useReducer > Redux for small apps.", likes: 31, liked: true },
  { id: 4, author: "Diana",   text: "Always show feedback before the server responds.", likes: 7, liked: false },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function OptimisticUI() {
  const [posts, setPosts]           = useState(SEED_POSTS);
  const [pendingIds, setPendingIds] = useState(new Set());
  const [errors, setErrors]         = useState({});  // postId → message

  const setError = (id, msg) =>
    setErrors((prev) => ({ ...prev, [id]: msg }));
  const clearError = (id) =>
    setErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });

  // ── Toggle Like ──────────────────────────────────────────────────────────────
  const handleLike = useCallback(async (id) => {
    clearError(id);

    // 1. Snapshot previous state for rollback
    const prev = posts.find((p) => p.id === id);

    // 2. Optimistic update
    setPosts((ps) =>
      ps.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
    setPendingIds((s) => new Set([...s, `like-${id}`]));

    try {
      await simulateToggleLike(id, !prev.liked);
    } catch (e) {
      // 3. Rollback on error
      setPosts((ps) =>
        ps.map((p) =>
          p.id === id ? { ...p, liked: prev.liked, likes: prev.likes } : p
        )
      );
      setError(id, e.message);
    } finally {
      setPendingIds((s) => { const n = new Set(s); n.delete(`like-${id}`); return n; });
    }
  }, [posts]);

  // ── Delete Post ──────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id) => {
    clearError(id);
    const snapshot = [...posts];

    // Optimistic: remove immediately
    setPosts((ps) => ps.filter((p) => p.id !== id));
    setPendingIds((s) => new Set([...s, `del-${id}`]));

    try {
      await simulateDeletePost(id);
    } catch (e) {
      // Rollback
      setPosts(snapshot);
      setError(id, e.message);
    } finally {
      setPendingIds((s) => { const n = new Set(s); n.delete(`del-${id}`); return n; });
    }
  }, [posts]);

  return (
    <div style={{ padding: 40, maxWidth: 560, fontFamily: "sans-serif" }}>
      <h2>Optimistic UI Update Flow</h2>
      <p style={{ color: "#888", fontSize: 13, marginTop: -8 }}>
        UI updates immediately; ~25% chance of failure triggers a rollback + error banner.
      </p>

      {posts.length === 0 && (
        <p style={{ color: "#999", textAlign: "center", marginTop: 40 }}>All posts deleted!</p>
      )}

      {posts.map((post) => {
        const likePending = pendingIds.has(`like-${post.id}`);
        const delPending  = pendingIds.has(`del-${post.id}`);
        const error       = errors[post.id];

        return (
          <div
            key={post.id}
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: 8,
              padding: "16px 20px",
              marginBottom: 12,
              opacity: delPending ? 0.4 : 1,
              transition: "opacity 0.3s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{post.author}</strong>
              <button
                onClick={() => handleDelete(post.id)}
                disabled={delPending || likePending}
                style={{
                  background: "none",
                  border: "none",
                  color: "#f44336",
                  cursor: "pointer",
                  fontSize: 13,
                  opacity: delPending ? 0.5 : 1,
                }}
              >
                {delPending ? "Deleting…" : "Delete"}
              </button>
            </div>

            <p style={{ margin: "8px 0 12px", color: "#444" }}>{post.text}</p>

            <button
              onClick={() => handleLike(post.id)}
              disabled={likePending || delPending}
              style={{
                background: post.liked ? "#e3f2fd" : "#f5f5f5",
                border: `1px solid ${post.liked ? "#2196f3" : "#ddd"}`,
                borderRadius: 20,
                padding: "4px 14px",
                cursor: "pointer",
                fontSize: 14,
                color: post.liked ? "#2196f3" : "#555",
                fontWeight: post.liked ? "bold" : "normal",
                opacity: likePending ? 0.6 : 1,
              }}
            >
              {likePending ? "…" : "♥"} {post.likes}
            </button>

            {error && (
              <div
                style={{
                  marginTop: 8,
                  background: "#ffebee",
                  border: "1px solid #ef9a9a",
                  borderRadius: 4,
                  padding: "6px 12px",
                  fontSize: 13,
                  color: "#c62828",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>⚠ {error} — changes rolled back.</span>
                <button
                  onClick={() => clearError(post.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#c62828", fontWeight: "bold" }}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
