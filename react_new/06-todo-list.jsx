import { useState } from "react";

// 6. Build a Todo List (Add / Delete / Mark Complete)

let nextId = 1;

function createTodo(text) {
  return { id: nextId++, text, done: false };
}

export default function TodoList() {
  const [todos, setTodos] = useState([
    createTodo("Buy groceries"),
    createTodo("Read React docs"),
  ]);
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setTodos((prev) => [...prev, createTodo(trimmed)]);
    setInput("");
  };

  const toggle = (id) =>
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );

  const remove = (id) =>
    setTodos((prev) => prev.filter((t) => t.id !== id));


  return (
    <div style={{ padding: 40, maxWidth: 480, fontFamily: "sans-serif" }}>
      <h2>Todo List</h2>

      {/* Input row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a new task…"
          style={{ flex: 1, padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
        />
        <button onClick={add} style={{ padding: "8px 16px" }}>Add</button>
      </div>

      {/* List */}
      {todos.length === 0 && <p style={{ color: "#999" }}>No tasks yet!</p>}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
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
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggle(todo.id)}
            />
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
              style={{ background: "none", border: "none", color: "#f44336", cursor: "pointer", fontSize: 16 }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <p style={{ marginTop: 12, color: "#666", fontSize: 14 }}>
        {todos.filter((t) => t.done).length} / {todos.length} completed
      </p>
    </div>
  );
}
