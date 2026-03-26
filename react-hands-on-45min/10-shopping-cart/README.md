# Shopping Cart

## What to Build

A cart UI with line items. Each item shows its name, unit price, and quantity. Users can:

- Increase or decrease quantity with +/- buttons
- Type a quantity directly in the number input
- Remove an item with the Remove button
- See a live subtotal at the bottom

Decrementing to 0 removes the item automatically — no separate "remove on zero" logic needed.

---

## State

```js
const [lines, setLines] = useState([
  { id: '1', title: 'Notebook', priceCents: 899, qty: 1 },
  { id: '2', title: 'Pen',      priceCents: 199, qty: 2 },
]);
```

| Field        | Type     | Notes                                      |
|--------------|----------|--------------------------------------------|
| `id`         | string   | Stable key for React reconciliation        |
| `title`      | string   | Display name                               |
| `priceCents` | number   | Integer cents — avoids float rounding bugs |
| `qty`        | number   | Current quantity                           |

---

## Key Trick: Total is Derived (useMemo)

The subtotal is **not** stored in state. It is computed from `lines` every time `lines` changes.

```js
const subtotal = useMemo(
  () => lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0),
  [lines]
);
```

Storing it separately would mean updating it in `setQty`, `increment`, AND `remove` — three places where it could diverge from the truth. Derived state is always consistent.

---

## Currency Display — Intl.NumberFormat

```js
const money = (cents) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100);
```

- Respects the user's locale automatically
- Produces `$8.99` without manual string manipulation
- `undefined` locale = use browser's current locale

---

## CRUD Operations

| Operation       | How it works                                                    |
|-----------------|-----------------------------------------------------------------|
| Add item        | If item already exists, increase its `qty`; else append        |
| Remove item     | `filter(l => l.id !== id)`                                     |
| Update quantity | `map` to find matching `id`, set new `qty`, then `filter > 0`  |
| Decrement       | `increment(id, -1)` — the `filter` handles implicit removal    |

---

## Why Prices Are Stored as Integer Cents

JavaScript uses IEEE 754 floats. `0.1 + 0.2` evaluates to `0.30000000000000004`. For a cart, that means subtotals could be off by fractions of a cent. Integer arithmetic is exact. We only divide by 100 at the last moment, inside the display formatter.

---

## Interview Questions

**Q: Why not store total in state?**

If `total` were stored separately it would need to be updated in `setQty`, `increment`, and `remove` — three places where it could get out of sync. Computed via `useMemo` it is guaranteed to match `lines` at all times. `useMemo` caches the result and only recomputes when `lines` actually changes, so there is no performance cost.

---

**Q: What is `useReducer` and when would you use it here?**

`useReducer` replaces multiple `useState` calls with a single `(state, action) => newState` function. Use it when:

- There are multiple actions that interact with the same state (e.g. `ADD_ITEM`, `APPLY_COUPON`, `CLEAR_CART`)
- The next state depends on complex logic across multiple fields
- You want the state transitions to be easily unit-testable in isolation

For a simple cart like this, `useState` is fine. For a production cart with coupons, shipping, and promotions, `useReducer` keeps all mutation logic in one pure function.

---

**Q: How would you persist the cart to localStorage?**

```js
// Read on mount with lazy initializer
const [lines, setLines] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('cart') ?? '[]');
  } catch {
    return [];
  }
});

// Write on every change
useEffect(() => {
  localStorage.setItem('cart', JSON.stringify(lines));
}, [lines]);
```

Debounce the write in production to avoid thrashing storage on rapid button clicks.
