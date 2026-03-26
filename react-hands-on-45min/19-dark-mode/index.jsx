import { createContext, useContext, useEffect, useMemo, useState } from 'react';

// createContext(null): null lets useTheme detect missing Provider and throw clearly
const ThemeContext = createContext(null);

// Reads the user's stored mode from localStorage safely.
// Storage can throw in private browsing or when blocked by policy.
function readStoredMode() {
  try {
    const v = localStorage.getItem('theme-mode');
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // storage blocked — ignore
  }
  return null;
}

// ---------------------------------------------------------------------------
// ThemeProvider — wraps the app; manages all theme state.
// ---------------------------------------------------------------------------
export function ThemeProvider({ children }) {
  // mode: the user's explicit choice ('light' | 'dark' | 'system').
  // Lazy initializer runs once on mount to read localStorage without
  // calling it on every render.
  const [mode, setModeState] = useState(() => readStoredMode() ?? 'system');

  // systemDark: whether the OS is currently in dark mode.
  // typeof window guard prevents a crash during SSR/Node rendering.
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  // Subscribe to OS theme changes (e.g. macOS auto-switch at sunset).
  // Runs once on mount; listener is removed on unmount to prevent memory leaks.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => setSystemDark(mq.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  // effective: the RESOLVED theme that CSS and components actually consume.
  // 'system' delegates to the OS; 'light'/'dark' are used directly.
  const effective = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  // Apply the effective theme to <html> so CSS variables respond to it.
  // data-theme="dark" enables selectors like [data-theme="dark"] { --bg: #111 }
  // colorScheme tells the browser to render native UI (scrollbars, inputs) correctly.
  useEffect(() => {
    document.documentElement.dataset.theme = effective;
    document.documentElement.style.colorScheme = effective;
  }, [effective]);

  // Persist the mode to localStorage so it survives page reloads.
  const setMode = (m) => {
    setModeState(m);
    try {
      localStorage.setItem('theme-mode', m);
    } catch {
      // storage blocked — theme still works in memory this session
    }
  };

  // useMemo stabilises the context object reference.
  // Without it, every ThemeProvider re-render produces a new object,
  // which causes ALL useTheme consumers to re-render even if nothing changed.
  const value = useMemo(() => ({ mode, setMode, effective }), [mode, effective]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ---------------------------------------------------------------------------
// useTheme — custom hook with a safety guard.
// ---------------------------------------------------------------------------
export function useTheme() {
  const c = useContext(ThemeContext);
  if (!c) throw new Error('useTheme must be used within ThemeProvider');
  return c;
}

// ---------------------------------------------------------------------------
// ThemeToggle — ready-made UI for switching between the three modes.
// ---------------------------------------------------------------------------
export function ThemeToggle() {
  const { mode, setMode, effective } = useTheme();

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {/* Show the EFFECTIVE theme — "system" could be either light or dark */}
      <span style={{ fontSize: 12 }}>Theme: {effective}</span>

      <button type="button" onClick={() => setMode('light')}>Light</button>
      <button type="button" onClick={() => setMode('dark')}>Dark</button>
      <button type="button" onClick={() => setMode('system')}>
        System ({mode === 'system' ? 'on' : 'off'})
      </button>
    </div>
  );
}
