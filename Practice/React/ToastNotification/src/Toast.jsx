import React, { useState, useEffect } from 'react';
import './Toast.css';

let toastId = 0;

const Toast = ({ message, type, duration = 3000, onClose }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{icons[type]}</span>
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
};

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type, duration) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return {
    toasts,
    success: (msg, duration = 3000) => showToast(msg, 'success', duration),
    error: (msg, duration = 3000) => showToast(msg, 'error', duration),
    warning: (msg, duration = 3000) => showToast(msg, 'warning', duration),
    info: (msg, duration = 3000) => showToast(msg, 'info', duration),
    ToastContainer: () => (
      <div className="toast-container">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    )
  };
};

export default Toast;
