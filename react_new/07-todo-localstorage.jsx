import { useState, useEffect } from "react";

// 7. Todo List with Local Storage Persistence

const STORAGE_KEY = "react_todos_v1";
let nextId = Date.now();

function usePersistentTodos() {
  const [todos, setTodos] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  return [todos, setTodos];
}

export default function PersistentTodoList() {
  const [todos, setTodos] = usePersistentTodos();
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setTodos((prev) => [
      ...prev,
      { id: ++nextId, text: trimmed, done: false, createdAt: Date.now() },
    ]);
    setInput("");
  };

  const toggle = (id) =>
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );

  const remove = (id) =>
    setTodos((prev) => prev.filter((t) => t.id !== id));

  const clearCompleted = () =>
    setTodos((prev) => prev.filter((t) => !t.done));

  return (
    <div style={{ padding: 40, maxWidth: 500, fontFamily: "sans-serif" }}>
      <h2>Todo List (Local Storage)</h2>
      <p style={{ color: "#888", fontSize: 13, marginTop: -8 }}>
        Todos persist across page reloads.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="New task…"
          style={{ flex: 1, padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
        />
        <button onClick={add}>Add</button>
      </div>

      {todos.length === 0 ? (
        <p style={{ color: "#999" }}>No tasks. Add one above!</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {todos.map((todo) => (
            <li
              key={todo.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 0",
                borderBottom: "1px solid #eee",
              }}
            >
              <input type="checkbox" checked={todo.done} onChange={() => toggle(todo.id)} />
              <span
                style={{
                  flex: 1,
                  textDecoration: todo.done ? "line-through" : "none",
                  color: todo.done ? "#aaa" : "#222",
                }}
              >
                {todo.text}
              </span>
              <button
                onClick={() => remove(todo.id)}
                style={{ background: "none", border: "none", color: "#f44336", cursor: "pointer" }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, color: "#666" }}>
        <span>{todos.filter((t) => !t.done).length} items left</span>
        {todos.some((t) => t.done) && (
          <button
            onClick={clearCompleted}
            style={{ background: "none", border: "none", color: "#f44336", cursor: "pointer", fontSize: 13 }}
          >
            Clear completed
          </button>
        )}
      </div>
    </div>
  );
}
