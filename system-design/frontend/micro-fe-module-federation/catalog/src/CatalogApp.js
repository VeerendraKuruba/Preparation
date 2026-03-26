import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Exposed as `catalog/Catalog` — the host imports and mounts this component.
 * Router links use the host’s BrowserRouter (shared react-router-dom singleton).
 */
export default function CatalogApp() {
  return (
    <main>
      <h2 style={{ marginTop: 0 }}>Catalog</h2>
      <p>
        This screen is compiled and served by the <strong>catalog</strong> app (remote on port{' '}
        <code>3001</code>).
      </p>
      <ul>
        <li>Demo product A — $10</li>
        <li>Demo product B — $20</li>
      </ul>
      <p>
        <Link to="/checkout">Go to checkout →</Link>
      </p>
    </main>
  );
}
