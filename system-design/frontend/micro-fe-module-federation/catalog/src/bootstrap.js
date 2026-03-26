import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CatalogApp from './CatalogApp';

/**
 * Standalone entry: visit http://localhost:3001 to develop the remote alone.
 * The host normally loads only the exposed module, not this full bootstrap.
 */
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <p style={{ fontFamily: 'system-ui', padding: 16, margin: 0, background: '#fef3c7', fontSize: 14 }}>
        Running <strong>catalog</strong> standalone. For the full flow, use the host at{' '}
        <a href="http://localhost:3000">localhost:3000</a>.
      </p>
      <div style={{ fontFamily: 'system-ui', padding: 24 }}>
        <Routes>
          <Route path="/*" element={<CatalogApp />} />
        </Routes>
      </div>
    </BrowserRouter>
  </React.StrictMode>
);
