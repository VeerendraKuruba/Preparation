import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export type ModalRenderProps = { close: () => void };

type ModalEntry = {
  id: number;
  title: string;
  render: (p: ModalRenderProps) => ReactNode;
};

type ModalContextValue = {
  openModal: (title: string, render: (p: ModalRenderProps) => ReactNode) => void;
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

export function useModal() {
  const v = useContext(ModalContext);
  if (!v) throw new Error('useModal must be used within ModalProvider');
  return v;
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<ModalEntry[]>([]);
  const seq = useRef(0);

  const closeModal = useCallback(() => {
    setStack((s) => s.slice(0, -1));
  }, []);

  const openModal = useCallback(
    (title: string, render: (p: ModalRenderProps) => ReactNode) => {
      const id = ++seq.current;
      setStack((s) => [...s, { id, title, render }]);
    },
    []
  );

  const value = useMemo(() => ({ openModal, closeModal }), [openModal, closeModal]);

  return (
    <ModalContext.Provider value={value}>
      {children}
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

function ModalLayer({
  entry,
  zIndex,
  closeOnEscape,
  onClose,
}: {
  entry: ModalEntry;
  zIndex: number;
  closeOnEscape: boolean;
  onClose: () => void;
}) {
  const titleId = useId();

  useCloseOnEscape(onClose, closeOnEscape);

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
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} style={{ marginTop: 0 }}>
          {entry.title}
        </h2>
        {entry.render({ close: onClose })}
      </div>
    </div>,
    document.body
  );
}

function useCloseOnEscape(onClose: () => void, enabled: boolean) {
  const ref = useRef(onClose);
  ref.current = onClose;
  useEffect(() => {
    if (!enabled) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && ref.current();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [enabled]);
}
