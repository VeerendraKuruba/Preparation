import { useState } from "react";

// 5. Build a Tabs Component

function Tabs({ tabs }) {
  const [active, setActive] = useState(0);

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "2px solid #ddd" }}>
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontWeight: active === i ? "bold" : "normal",
              borderBottom: active === i ? "2px solid #2196f3" : "2px solid transparent",
              marginBottom: -2,
              color: active === i ? "#2196f3" : "#555",
              transition: "color 0.2s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div style={{ padding: "20px 4px" }}>
        {tabs[active]?.content}
      </div>
    </div>
  );
}

export default function TabsDemo() {
  const tabs = [
    { label: "Home", content: <p>Welcome to the <strong>Home</strong> tab.</p> },
    { label: "Profile", content: <p>This is your <strong>Profile</strong> settings.</p> },
    { label: "Settings", content: <p>Manage <strong>Settings</strong> here.</p> },
    { label: "Help", content: <p>Need <strong>Help</strong>? We got you covered.</p> },
  ];

  return (
    <div style={{ padding: 40 }}>
      <h2>Tabs Component</h2>
      <Tabs tabs={tabs} />
    </div>
  );
}
