import { useState } from "react";

// 11. Build a Nested Comment System

let commentId = 100;

const INITIAL_COMMENTS = [
  {
    id: 1,
    author: "Alice",
    text: "This is a great post!",
    replies: [
      {
        id: 2,
        author: "Bob",
        text: "I totally agree with Alice.",
        replies: [
          { id: 3, author: "Charlie", text: "Same here!", replies: [] },
        ],
      },
    ],
  },
  {
    id: 4,
    author: "Dave",
    text: "Interesting perspective.",
    replies: [],
  },
];

function addReply(comments, parentId, newComment) {
  return comments.map((c) => {
    if (c.id === parentId) {
      return { ...c, replies: [...c.replies, newComment] };
    }
    return { ...c, replies: addReply(c.replies, parentId, newComment) };
  });
}

function deleteComment(comments, targetId) {
  return comments
    .filter((c) => c.id !== targetId)
    .map((c) => ({ ...c, replies: deleteComment(c.replies, targetId) }));
}

function Comment({ comment, depth, onReply, onDelete }) {
  const [replying, setReplying] = useState(false);
  const [text, setText]         = useState("");

  const submitReply = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onReply(comment.id, trimmed);
    setText("");
    setReplying(false);
  };

  return (
    <div
      style={{
        marginLeft: depth * 24,
        borderLeft: depth > 0 ? "2px solid #e0e0e0" : "none",
        paddingLeft: depth > 0 ? 16 : 0,
        marginTop: 12,
      }}
    >
      <div
        style={{
          background: "#f9f9f9",
          border: "1px solid #eee",
          borderRadius: 6,
          padding: "10px 14px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <strong style={{ fontSize: 14 }}>{comment.author}</strong>
          <button
            onClick={() => onDelete(comment.id)}
            style={{ background: "none", border: "none", color: "#f44336", cursor: "pointer", fontSize: 12 }}
          >
            Delete
          </button>
        </div>
        <p style={{ margin: "6px 0 10px", fontSize: 14 }}>{comment.text}</p>
        {depth < 4 && (
          <button
            onClick={() => setReplying((r) => !r)}
            style={{ fontSize: 12, color: "#2196f3", background: "none", border: "none", cursor: "pointer" }}
          >
            {replying ? "Cancel" : "Reply"}
          </button>
        )}
      </div>

      {replying && (
        <div style={{ marginTop: 8, marginLeft: 8, display: "flex", gap: 6 }}>
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitReply()}
            placeholder="Write a reply…"
            style={{ flex: 1, padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc", fontSize: 13 }}
          />
          <button onClick={submitReply} style={{ fontSize: 13 }}>Post</button>
        </div>
      )}

      {comment.replies.map((r) => (
        <Comment key={r.id} comment={r} depth={depth + 1} onReply={onReply} onDelete={onDelete} />
      ))}
    </div>
  );
}

export default function NestedComments() {
  const [comments, setComments] = useState(INITIAL_COMMENTS);
  const [topText, setTopText]   = useState("");

  const addTop = () => {
    const trimmed = topText.trim();
    if (!trimmed) return;
    setComments((prev) => [
      ...prev,
      { id: ++commentId, author: "You", text: trimmed, replies: [] },
    ]);
    setTopText("");
  };

  const handleReply = (parentId, text) => {
    setComments((prev) =>
      addReply(prev, parentId, { id: ++commentId, author: "You", text, replies: [] })
    );
  };

  const handleDelete = (id) => {
    setComments((prev) => deleteComment(prev, id));
  };

  return (
    <div style={{ padding: 40, maxWidth: 640, fontFamily: "sans-serif" }}>
      <h2>Nested Comments</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={topText}
          onChange={(e) => setTopText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTop()}
          placeholder="Write a comment…"
          style={{ flex: 1, padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
        />
        <button onClick={addTop}>Comment</button>
      </div>

      {comments.map((c) => (
        <Comment key={c.id} comment={c} depth={0} onReply={handleReply} onDelete={handleDelete} />
      ))}
    </div>
  );
}
