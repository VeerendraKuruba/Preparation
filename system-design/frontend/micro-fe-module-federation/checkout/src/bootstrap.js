import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CheckoutApp from './CheckoutApp';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <p style={{ fontFamily: 'system-ui', padding: 16, margin: 0, background: '#dbeafe', fontSize: 14 }}>
        Running <strong>checkout</strong> standalone. For the full flow, use the host at{' '}
        <a href="http://localhost:3000">localhost:3000</a>.
      </p>
      <div style={{ fontFamily: 'system-ui', padding: 24 }}>
        <Routes>
          <Route path="/*" element={<CheckoutApp />} />
        </Routes>
      </div>
    </BrowserRouter>
  </React.StrictMode>
);
