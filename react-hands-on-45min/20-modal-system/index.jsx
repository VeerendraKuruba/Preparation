import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

// ── Context ───────────────────────────────────────────────────────────────────
// null default lets useModal detect usage outside a provider and throw a clear error.
const ModalContext = createContext(null);

export function useModal() {
  const v = useContext(ModalContext);
  if (!v) throw new Error('useModal must be used within ModalProvider');
  return v;
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ModalProvider({ children }) {
  // Stack (array) not a single boolean — supports nested/stacked modals.
  // Each entry: { id, title, render }
  const [stack, setStack] = useState([]);

  // useRef for the ID counter — incrementing it must NOT trigger re-renders.
  const seq = useRef(0);

  // closeModal pops the topmost modal off the stack.
  // Functional update (s => ...) avoids stale-closure bugs.
  const closeModal = useCallback(() => {
    setStack((s) => s.slice(0, -1));
  }, []);

  // openModal pushes a new descriptor onto the stack.
  // render: a function that receives { close } — lets modal content close itself.
  const openModal = useCallback((title, render) => {
    const id = ++seq.current;
    setStack((s) => [...s, { id, title, render }]);
  }, []);

  const value = useMemo(() => ({ openModal, closeModal }), [openModal, closeModal]);

  return (
    <ModalContext.Provider value={value}>
      {children}

      {/*
       * One ModalLayer per stack entry.
       * zIndex increases per layer so nested modals render on top.
       * closeOnEscape is true ONLY for the last item — one Escape = one close.
       */}
      {stack.map((entry, i) => (
        <ModalLayer
          key={entry.id}
          entry={entry}
          zIndex={1000 + i}
          closeOnEscape={i === stack.length - 1}
          onClose={closeModal}
        />
      ))}
    </ModalContext.Provider>
  );
}

// ── ModalLayer (individual modal rendered via Portal) ─────────────────────────
function ModalLayer({ entry, zIndex, closeOnEscape, onClose }) {
  // useId links aria-labelledby on the dialog to the <h2> id for screen readers.
  const titleId = useId();

  useCloseOnEscape(onClose, closeOnEscape);

  // createPortal renders into document.body — avoids overflow:hidden clipping
  // and z-index stacking context bugs from parent components.
  return createPortal(
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'grid',
        placeItems: 'center',
        zIndex,
      }}
      // Only close when clicking the backdrop itself, not content inside it.
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: '#fff',
          color: '#111',
          minWidth: 'min(420px, 92vw)',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '1rem 1.25rem',
          borderRadius: 8,
        }}
        // Stop backdrop's onMouseDown from firing for clicks inside the card.
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} style={{ marginTop: 0 }}>
          {entry.title}
        </h2>

        {/* Render prop: entry.render({ close }) lets modal content close itself */}
        {entry.render({ close: onClose })}
      </div>
    </div>,
    document.body
  );
}

// ── Custom Hook: useCloseOnEscape ─────────────────────────────────────────────
function useCloseOnEscape(onClose, enabled) {
  // "Ref trick": store latest onClose so the listener is never stale
  // without being re-registered on every render.
  const ref = useRef(onClose);
  ref.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const h = (e) => e.key === 'Escape' && ref.current();
    document.addEventListener('keydown', h);
    // Cleanup removes the listener when this modal loses top position or unmounts.
    return () => document.removeEventListener('keydown', h);
  }, [enabled]);
}
