import { useMemo, useState } from 'react';

const money = (cents) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);

export function ShoppingCart() {
  const [lines, setLines] = useState([
    { id: '1', title: 'Notebook', priceCents: 899, qty: 1 },
    { id: '2', title: 'Pen', priceCents: 199, qty: 2 },
  ]);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.priceCents * l.qty, 0), [lines]);

  const setQty = (id, qty) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, qty } : l)).filter((l) => l.qty > 0)
    );
  };

  const increment = (id, delta) => {
    setLines((prev) =>
      prev
        .map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );
  };

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
              <div style={{ flex: 1 }}>
                <div>{l.title}</div>
                <div style={{ fontSize: 12, color: '#555' }}>{money(l.priceCents)} each</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button type="button" onClick={() => increment(l.id, -1)} aria-label="Decrease">
                  −
                </button>
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
              <button type="button" onClick={() => remove(l.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ fontWeight: 600 }}>Subtotal: {money(subtotal)}</div>
    </div>
  );
}
