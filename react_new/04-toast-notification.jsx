import { useState, useCallback, createContext, useContext } from "react";
import { createPortal } from "react-dom";

// 4. Build a Toast Notification System

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = "info", duration = 3000 }) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const colors = { info: "#2196f3", success: "#4caf50", warning: "#ff9800", error: "#f44336" };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {createPortal(
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            zIndex: 9999,
          }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                background: colors[t.type] ?? colors.info,
                color: "#fff",
                padding: "12px 20px",
                borderRadius: 6,
                minWidth: 240,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                animation: "slideIn 0.2s ease",
              }}
            >
              <span>{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                style={{ background: "none", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", marginLeft: 12 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

function ToastDemo() {
  const toast = useToast();

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", display: "flex", gap: 12, flexWrap: "wrap" }}>
      <h2 style={{ width: "100%" }}>Toast Notifications</h2>
      <button onClick={() => toast({ message: "This is an info message", type: "info" })}>Info</button>
      <button onClick={() => toast({ message: "Action successful!", type: "success" })}>Success</button>
      <button onClick={() => toast({ message: "Warning: check your input", type: "warning" })}>Warning</button>
      <button onClick={() => toast({ message: "Something went wrong!", type: "error" })}>Error</button>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ToastDemo />
    </ToastProvider>
  );
}
