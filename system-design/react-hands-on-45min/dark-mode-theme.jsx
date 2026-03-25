import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

function readStoredMode() {
  try {
    const v = localStorage.getItem('theme-mode');
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => readStoredMode() ?? 'system');
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => setSystemDark(mq.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  const effective = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    document.documentElement.dataset.theme = effective;
    document.documentElement.style.colorScheme = effective;
  }, [effective]);

  const setMode = (m) => {
    setModeState(m);
    try {
      localStorage.setItem('theme-mode', m);
    } catch {
      /* ignore */
    }
  };

  const value = useMemo(() => ({ mode, setMode, effective }), [mode, effective]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeContext);
  if (!c) throw new Error('useTheme must be used within ThemeProvider');
  return c;
}

export function ThemeToggle() {
  const { mode, setMode, effective } = useTheme();
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 12 }}>Theme: {effective}</span>
      <button type="button" onClick={() => setMode('light')}>
        Light
      </button>
      <button type="button" onClick={() => setMode('dark')}>
        Dark
      </button>
      <button type="button" onClick={() => setMode('system')}>
        System ({mode === 'system' ? 'on' : 'off'})
      </button>
    </div>
  );
}
