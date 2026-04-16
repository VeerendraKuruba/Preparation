import { createContext, useContext, useState, useMemo } from "react";

// 13. Build a Theme Switcher with Global State

// ─── Theme definitions ────────────────────────────────────────────────────────
const THEMES = {
  light: {
    name: "Light",
    bg: "#ffffff",
    surface: "#f5f5f5",
    text: "#222222",
    textSecondary: "#666666",
    border: "#e0e0e0",
    primary: "#2196f3",
    primaryText: "#ffffff",
  },
  dark: {
    name: "Dark",
    bg: "#121212",
    surface: "#1e1e1e",
    text: "#e0e0e0",
    textSecondary: "#9e9e9e",
    border: "#333333",
    primary: "#90caf9",
    primaryText: "#000000",
  },
  solarized: {
    name: "Solarized",
    bg: "#002b36",
    surface: "#073642",
    text: "#839496",
    textSecondary: "#586e75",
    border: "#073642",
    primary: "#268bd2",
    primaryText: "#fdf6e3",
  },
};

// ─── Context ──────────────────────────────────────────────────────────────────
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState("light");
  const theme = useMemo(() => THEMES[themeName], [themeName]);

  return (
    <ThemeContext.Provider value={{ theme, themeName, setThemeName }}>
      <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, transition: "all 0.3s" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

// ─── UI Components ────────────────────────────────────────────────────────────
function ThemeSwitcher() {
  const { theme, themeName, setThemeName } = useTheme();

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {Object.entries(THEMES).map(([key, t]) => (
        <button
          key={key}
          onClick={() => setThemeName(key)}
          style={{
            padding: "8px 16px",
            borderRadius: 20,
            border: `2px solid ${key === themeName ? theme.primary : theme.border}`,
            background: key === themeName ? theme.primary : "transparent",
            color: key === themeName ? theme.primaryText : theme.text,
            cursor: "pointer",
            fontWeight: key === themeName ? "bold" : "normal",
            transition: "all 0.2s",
          }}
        >
          {t.name}
        </button>
      ))}
    </div>
  );
}

function Card({ title, children }) {
  const { theme } = useTheme();
  return (
    <div
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: "20px 24px",
        marginBottom: 16,
      }}
    >
      <h3 style={{ color: theme.text, margin: "0 0 8px" }}>{title}</h3>
      <p style={{ color: theme.textSecondary, margin: 0, lineHeight: 1.6 }}>{children}</p>
    </div>
  );
}

function Page() {
  const { theme } = useTheme();

  return (
    <div style={{ padding: 40, maxWidth: 560, margin: "0 auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <h2 style={{ margin: 0, color: theme.text }}>Theme Switcher</h2>
        <ThemeSwitcher />
      </div>
      <Card title="What is React?">
        React is a JavaScript library for building user interfaces. It lets you compose complex UIs from small,
        isolated pieces of code called "components".
      </Card>
      <Card title="Why Global State?">
        Sharing theme across your entire app requires a context-based approach so every component
        can access and react to the current theme without prop drilling.
      </Card>
      <button
        style={{
          padding: "10px 24px",
          background: theme.primary,
          color: theme.primaryText,
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: "bold",
        }}
      >
        Primary Button
      </button>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Page />
    </ThemeProvider>
  );
}
