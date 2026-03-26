import React from 'react';
import { Link } from 'react-router-dom';

/** Exposed as `checkout/Checkout`. */
export default function CheckoutApp() {
  return (
    <main>
      <h2 style={{ marginTop: 0 }}>Checkout</h2>
      <p>
        This screen is compiled and served by the <strong>checkout</strong> app (remote on port{' '}
        <code>3002</code>).
      </p>
      <p>Cart summary, payment, and confirmation would live here.</p>
      <p>
        <Link to="/catalog">← Back to catalog</Link>
      </p>
    </main>
  );
}
