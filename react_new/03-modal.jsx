import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// 3. Build a Modal Component (with backdrop & ESC close)
function Modal({ isOpen, onClose, title, children }) {
  const handleEsc = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: "24px 32px",
          minWidth: 320,
          maxWidth: "90vw",
          boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export default function ModalDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h2>Modal Component</h2>
      <button onClick={() => setOpen(true)}>Open Modal</button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Hello from Modal">
        <p>Press <strong>ESC</strong> or click the backdrop to close.</p>
        <button onClick={() => setOpen(false)}>Close</button>
      </Modal>
    </div>
  );
}
