import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ open, title, children, onClose }) {
  // useId: SSR-safe, collision-free; used to link dialog to its title via aria-labelledby
  const titleId = useId();
  const panelRef = useRef(null);   // points to dialog div — used to find first focusable child
  const lastActive = useRef(null); // useRef not useState: changing it must NOT cause re-render

  useEffect(() => {
    if (!open) return;

    // Save element that had focus so we can restore it when the modal closes
    lastActive.current = document.activeElement;

    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey); // attach to document, not modal div

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // prevent page scroll behind modal

    // Move focus into the first interactive element (WCAG 2.1 SC 2.4.3)
    panelRef.current
      ?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ?.focus();

    return () => {
      document.removeEventListener('keydown', onKey); // remove to prevent stale duplicate listeners
      document.body.style.overflow = prevOverflow;
      lastActive.current?.focus?.();                  // restore focus to pre-modal element
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    // Portal mounts on document.body — escapes parent overflow/z-index stacking contexts
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 1000,
      }}
      onMouseDown={(e) => {
        // onMouseDown (not onClick): prevents drag-from-inside → release-on-backdrop closing the modal
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          background: '#fff',
          color: '#111',
          minWidth: 'min(400px, 90vw)',
          maxWidth: '90vw',
          padding: '1.25rem',
          borderRadius: 8,
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        }}
        onMouseDown={(e) => e.stopPropagation()} // stop backdrop handler from firing on inside clicks
      >
        <h2 id={titleId} style={{ marginTop: 0 }}>{title}</h2>
        {children}
        <button type="button" onClick={onClose} style={{ marginTop: '1rem' }}>Close</button>
      </div>
    </div>,
    document.body
  );
}
