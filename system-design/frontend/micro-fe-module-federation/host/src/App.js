import React, { Suspense, lazy } from 'react';
import { BrowserRouter, NavLink, Routes, Route, Navigate } from 'react-router-dom';

/**
 * Lazy imports are resolved by Module Federation at runtime:
 * - "catalog" / "checkout" match the `remotes` keys in webpack.config.js
 * - "/Catalog" / "/Checkout" match the `exposes` paths on each remote
 */
const CatalogPage = lazy(() => import('catalog/Catalog'));
const CheckoutPage = lazy(() => import('checkout/Checkout'));

const linkStyle = { marginRight: 16, color: '#1d4ed8', textDecoration: 'none' };

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560, margin: '0 auto', padding: 24 }}>
        <header style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #e5e7eb' }}>
          <h1 style={{ margin: '0 0 12px', fontSize: '1.35rem' }}>Demo store (host shell)</h1>
          <nav>
            <NavLink
              to="/catalog"
              style={({ isActive }) => ({
                ...linkStyle,
                fontWeight: isActive ? 700 : 400,
                borderBottom: isActive ? '2px solid #1d4ed8' : '2px solid transparent',
              })}
            >
              Catalog
            </NavLink>
            <NavLink
              to="/checkout"
              style={({ isActive }) => ({
                ...linkStyle,
                fontWeight: isActive ? 700 : 400,
                borderBottom: isActive ? '2px solid #1d4ed8' : '2px solid transparent',
              })}
            >
              Checkout
            </NavLink>
          </nav>
        </header>

        <Suspense fallback={<p style={{ color: '#6b7280' }}>Loading remote module…</p>}>
          <Routes>
            <Route path="/" element={<Navigate to="/catalog" replace />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}
