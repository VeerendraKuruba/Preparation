import { useState } from "react";

// 1. Build a Counter with Increment / Decrement / Reset
export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ textAlign: "center", fontFamily: "sans-serif", marginTop: 40 }}>
      <h2>Counter</h2>
      <p style={{ fontSize: 48, fontWeight: "bold" }}>{count}</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={() => setCount((c) => c - 1)}>− Decrement</button>
        <button onClick={() => setCount(0)}>Reset</button>
        <button onClick={() => setCount((c) => c + 1)}>+ Increment</button>
      </div>
    </div>
  );
}
