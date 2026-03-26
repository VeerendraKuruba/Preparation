import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

// ── Context ───────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

export function useToast() {
  const c = useContext(ToastContext);
  if (!c) throw new Error('useToast must be used within ToastProvider');
  return c;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  // Array of { id, message, variant, durationMs } — single source of truth.
  const [toasts, setToasts] = useState([]);

  // timers is a Map<id, timeoutId> in a REF — not state — because storing or
  // clearing a timer ID has no visual effect and must not trigger re-renders.
  const timers = useRef(new Map());

  // dismiss: single removal path used by manual clicks AND the auto-dismiss timer.
  const dismiss = useCallback((id) => {
    // Cancel the pending timer first — prevents it from calling dismiss again
    // after the toast is already gone (avoids redundant setState calls).
    const t = timers.current.get(id);
    if (t != null) window.clearTimeout(t);
    timers.current.delete(id);

    setToasts((list) => list.filter((x) => x.id !== id));
  }, []);

  // show: opts = { message, variant?, durationMs?, id? }
  const show = useCallback(
    (opts) => {
      // Allow callers to supply a stable ID (e.g. 'save-error') to deduplicate.
      // Falls back to browser-native UUID v4 — collision-free, no library needed.
      const id = opts.id ?? crypto.randomUUID();

      const item = {
        id,
        message: opts.message,
        variant: opts.variant ?? 'info',      // 'info' | 'success' | 'error'
        durationMs: opts.durationMs ?? 3500,  // 0 = sticky (no auto-dismiss)
      };

      setToasts((list) => [...list, item]);

      if (item.durationMs > 0) {
        const t = window.setTimeout(() => dismiss(id), item.durationMs);
        timers.current.set(id, t);
      }
    },
    [dismiss]
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ── ToastViewport (fixed overlay via Portal) ──────────────────────────────────
function ToastViewport({ toasts, onDismiss }) {
  // Portal to document.body: position:fixed works correctly regardless of any
  // parent CSS transform/filter. Also avoids z-index stacking context conflicts.
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-relevant="additions text"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 2000,
        maxWidth: 360,
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background:
              t.variant === 'error'
                ? '#3b0a0a'
                : t.variant === 'success'
                  ? '#0a3b1f'
                  : '#1a1a2e',
            color: '#fff',
            boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <span>{t.message}</span>
          <button type="button" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
