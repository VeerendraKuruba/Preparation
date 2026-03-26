import { useMemo, useState } from 'react';

// money — converts integer cents to a locale-aware currency string.
// e.g. money(899) → "$8.99"
// Storing prices as cents avoids floating-point rounding bugs (0.1 + 0.2 !== 0.3 in JS).
const money = (cents) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);

export function ShoppingCart() {
  // lines — the cart's source of truth.
  // Each object: { id, title, priceCents, qty }
  // Prices stored as integer cents to avoid float arithmetic issues.
  const [lines, setLines] = useState([
    { id: '1', title: 'Notebook', priceCents: 899, qty: 1 },
    { id: '2', title: 'Pen',      priceCents: 199, qty: 2 },
  ]);

  // subtotal — DERIVED via useMemo, never stored as separate state.
  // Storing it separately risks it diverging from the source of truth.
  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0),
    [lines]
  );

  // setQty — sets an item's quantity to an exact value (used by number input).
  // .filter removes the item automatically when qty drops to 0.
  const setQty = (id, qty) => {
    setLines((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, qty } : l))
        .filter((l) => l.qty > 0)
    );
  };

  // increment — adds delta (+1 or -1) to an item's quantity.
  // When qty hits 0 the .filter acts as an implicit remove.
  const increment = (id, delta) => {
    setLines((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );
  };

  // remove — immediately removes an item regardless of its quantity.
  const remove = (id) => setLines((prev) => prev.filter((l) => l.id !== id));

  return (
    <div style={{ maxWidth: 420 }}>
      <h3 style={{ marginTop: 0 }}>Cart</h3>

      {lines.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {lines.map((l) => (
            <li
              key={l.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                borderBottom: '1px solid #eee',
                paddingBottom: 8,
              }}
            >
              {/* Product info */}
              <div style={{ flex: 1 }}>
                <div>{l.title}</div>
                <div style={{ fontSize: 12, color: '#555' }}>{money(l.priceCents)} each</div>
              </div>

              {/* Quantity controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* delta = -1 removes item when qty is already 1 */}
                <button type="button" onClick={() => increment(l.id, -1)} aria-label="Decrease">
                  −
                </button>

                {/* Math.max(1, …) prevents typing below 1 via the input */}
                <input
                  type="number"
                  min={1}
                  value={l.qty}
                  onChange={(e) => setQty(l.id, Math.max(1, Number(e.target.value) || 1))}
                  style={{ width: 48 }}
                  aria-label={`Quantity for ${l.title}`}
                />

                <button type="button" onClick={() => increment(l.id, 1)} aria-label="Increase">
                  +
                </button>
              </div>

              {/* Explicit remove button bypasses qty logic entirely */}
              <button type="button" onClick={() => remove(l.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Subtotal is derived, never stored — always in sync with items */}
      <div style={{ fontWeight: 600 }}>Subtotal: {money(subtotal)}</div>
    </div>
  );
}
