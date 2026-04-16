import { useState } from "react";

// 2. Build a Toggle Switch Component
function ToggleSwitch({ label, defaultChecked = false, onChange }) {
  const [on, setOn] = useState(defaultChecked);

  const toggle = () => {
    const next = !on;
    setOn(next);
    onChange?.(next);
  };

  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <div
        onClick={toggle}
        style={{
          width: 52,
          height: 28,
          borderRadius: 14,
          background: on ? "#4caf50" : "#ccc",
          position: "relative",
          transition: "background 0.25s",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: on ? 27 : 3,
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,.3)",
            transition: "left 0.25s",
          }}
        />
      </div>
      <span>{label ?? (on ? "ON" : "OFF")}</span>
    </label>
  );
}

export default function ToggleSwitchDemo() {
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", display: "flex", flexDirection: "column", gap: 20 }}>
      <h2>Toggle Switch</h2>
      <ToggleSwitch label="Dark Mode" onChange={(v) => console.log("dark mode:", v)} />
      <ToggleSwitch label="Notifications" defaultChecked />
      <ToggleSwitch />
    </div>
  );
}
