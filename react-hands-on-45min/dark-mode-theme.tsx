import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

type Ctx = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  effective: 'light' | 'dark';
};

const ThemeContext = createContext<Ctx | null>(null);

function readStoredMode(): ThemeMode | null {
  try {
    const v = localStorage.getItem('theme-mode');
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode() ?? 'system');
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

  const effective: 'light' | 'dark' =
    mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  useEffect(() => {
    document.documentElement.dataset.theme = effective;
    document.documentElement.style.colorScheme = effective;
  }, [effective]);

  const setMode = (m: ThemeMode) => {
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

/** Small control — pair with CSS: `:root { --bg:#fff } [data-theme='dark'] { --bg:#111 }` */
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
