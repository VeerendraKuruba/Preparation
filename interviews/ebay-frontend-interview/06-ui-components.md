# UI Component Build Tasks — eBay Frontend Interview

These are the component-building tasks confirmed or highly likely for eBay's coding round.

---

## Task 1: eBay Cart Page (CONFIRMED — most likely ask)

Given a design mockup of the cart page, implement it in React.

**Requirements:**
- List of cart items with image, name, price, quantity stepper
- Increment / decrement / remove item
- Running total at the bottom
- Empty state when cart is empty

```jsx
import { useState, useMemo } from 'react';

const INITIAL_ITEMS = [
  { id: 1, name: 'Vintage Camera', price: 149.99, qty: 1, img: '📷' },
  { id: 2, name: 'Mechanical Keyboard', price: 89.50, qty: 2, img: '⌨️' },
  { id: 3, name: 'Noise Cancelling Headphones', price: 199.00, qty: 1, img: '🎧' },
];

export function CartPage() {
  const [items, setItems] = useState(INITIAL_ITEMS);

  // Derived — no separate state for total
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
    [items]
  );

  function updateQty(id, delta) {
    setItems(prev =>
      prev
        .map(item => item.id === id ? { ...item, qty: item.qty + delta } : item)
        .filter(item => item.qty > 0) // auto-remove when qty hits 0
    );
  }

  function removeItem(id) {
    setItems(prev => prev.filter(item => item.id !== id));
  }

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ fontSize: '3rem' }}>🛒</p>
        <h2>Your cart is empty</h2>
        <a href="/">Continue shopping</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 16 }}>
      <h1>Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})</h1>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map(item => (
          <CartItem
            key={item.id}
            item={item}
            onQtyChange={(delta) => updateQty(item.id, delta)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </ul>

      <OrderSummary total={total} />
    </div>
  );
}

function CartItem({ item, onQtyChange, onRemove }) {
  return (
    <li style={{
      display: 'flex', gap: 16, alignItems: 'center',
      padding: '16px 0', borderBottom: '1px solid #eee'
    }}>
      <span style={{ fontSize: '3rem' }}>{item.img}</span>

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600 }}>{item.name}</div>
        <div style={{ color: '#666' }}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.price)}
        </div>
      </div>

      {/* Quantity stepper */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => onQtyChange(-1)}
          aria-label={`Decrease quantity of ${item.name}`}
          disabled={item.qty <= 1}
        >−</button>
        <span aria-live="polite" aria-label={`Quantity: ${item.qty}`}>{item.qty}</span>
        <button
          onClick={() => onQtyChange(1)}
          aria-label={`Increase quantity of ${item.name}`}
        >+</button>
      </div>

      <div style={{ minWidth: 80, textAlign: 'right', fontWeight: 600 }}>
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
          .format(item.price * item.qty)}
      </div>

      <button onClick={onRemove} aria-label={`Remove ${item.name} from cart`}>
        🗑
      </button>
    </li>
  );
}

function OrderSummary({ total }) {
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
      <h2>Order Summary</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Subtotal</span>
        <span>{fmt.format(total)}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
        <span>Shipping</span>
        <span>Free</span>
      </div>
      <hr />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.2rem' }}>
        <span>Total</span>
        <span>{fmt.format(total)}</span>
      </div>
      <button style={{
        width: '100%', marginTop: 16, padding: '12px 0',
        background: '#0064d2', color: 'white', border: 'none',
        borderRadius: 4, fontSize: '1rem', cursor: 'pointer'
      }}>
        Proceed to Checkout
      </button>
    </div>
  );
}
```

**Key concepts to explain:**
- `useMemo` for derived total — not a separate useState
- `Intl.NumberFormat` for currency formatting (avoids floating-point issues in display)
- Empty state handled before the list render
- ARIA labels on quantity buttons for accessibility
- Immutable state updates (map + filter, never mutate)

---

## Task 2: Search Autocomplete / Typeahead (High probability)

```jsx
import { useState, useEffect, useRef } from 'react';

const MOCK_ITEMS = [
  'iPhone 15 Pro', 'iPhone 14', 'Samsung Galaxy S24',
  'MacBook Pro', 'MacBook Air', 'iPad Pro',
  'Sony WH-1000XM5', 'Bose QC45', 'AirPods Pro',
  'Nintendo Switch', 'PlayStation 5', 'Xbox Series X',
];

export function SearchAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef(null);

  // Debounce + filter
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }
      const filtered = MOCK_ITEMS.filter(item =>
        item.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
      setIsOpen(filtered.length > 0);
      setActiveIndex(-1);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  function handleKeyDown(e) {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      selectItem(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  function selectItem(item) {
    setQuery(item);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  const listId = 'autocomplete-list';

  return (
    <div style={{ position: 'relative', maxWidth: 400 }}>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)} // delay for click to register
        placeholder="Search eBay"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 ? `option-${activeIndex}` : undefined}
        style={{ width: '100%', padding: '8px 12px', fontSize: '1rem' }}
      />

      {isOpen && (
        <ul
          id={listId}
          role="listbox"
          ref={listRef}
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'white', border: '1px solid #ddd',
            borderRadius: 4, listStyle: 'none', margin: 0, padding: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100,
          }}
        >
          {suggestions.map((item, i) => (
            <li
              key={item}
              id={`option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => selectItem(item)} // mousedown fires before blur
              style={{
                padding: '8px 12px',
                background: i === activeIndex ? '#e8f0fe' : 'transparent',
                cursor: 'pointer',
              }}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Key concepts:**
- `onBlur` + `setTimeout` hack — blur fires before `onClick`, so delay gives click time to register
- `onMouseDown` instead of `onClick` on options — fires before blur
- `aria-activedescendant` — tells screen reader which option is focused without moving DOM focus
- Debounce with useEffect cleanup
- Keyboard navigation: ArrowUp/Down, Enter, Escape

---

## Task 3: Progress Bar (Confirmed in phone screen)

```jsx
// Pure component — no state of its own
export function ProgressBar({ value, max = 100, label }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  // Color changes based on progress
  const color = pct < 30 ? '#e53e3e' : pct < 70 ? '#dd6b20' : '#38a169';

  return (
    <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}
         aria-label={label ?? `${Math.round(pct)}% complete`}>
      <div style={{ background: '#eee', borderRadius: 999, overflow: 'hidden', height: 12 }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: color,
          transition: 'width 0.3s ease',
          borderRadius: 999,
        }} />
      </div>
      <span style={{ fontSize: '0.85rem', color: '#666' }}>{Math.round(pct)}%</span>
    </div>
  );
}
```

---

## Task 4: Infinite Scroll Product Listing

```jsx
import { useState, useEffect, useRef, useCallback } from 'react';

function fetchProducts(page) {
  // Simulate API with delay
  return new Promise(resolve => setTimeout(() => {
    resolve(
      Array.from({ length: 10 }, (_, i) => ({
        id: page * 10 + i,
        name: `Product ${page * 10 + i + 1}`,
        price: (Math.random() * 200 + 10).toFixed(2),
      }))
    );
  }, 500));
}

export function InfiniteScroll() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef(null);
  const loadingRef = useRef(false); // guard against double-fetch

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);

    const newProducts = await fetchProducts(page);
    setProducts(prev => [...prev, ...newProducts]);
    setPage(p => p + 1);
    setLoading(false);
    loadingRef.current = false;

    if (newProducts.length < 10) setHasMore(false); // no more pages
  }, [page, hasMore]);

  // Set up IntersectionObserver on sentinel div
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div>
      <h1>Products</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {products.map(p => (
          <div key={p.id} style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
            <div>{p.name}</div>
            <div>${p.price}</div>
          </div>
        ))}
      </div>

      {/* Sentinel — when this is visible, load more */}
      <div ref={sentinelRef} style={{ height: 1 }} />

      {loading && <p style={{ textAlign: 'center' }}>Loading...</p>}
      {!hasMore && <p style={{ textAlign: 'center', color: '#666' }}>No more products</p>}
    </div>
  );
}
```

**Key concepts:**
- `useRef` guard (`loadingRef`) prevents double-fetch when observer fires twice
- Sentinel div at bottom — invisible, just triggers the observer
- `hasMore` flag prevents fetching when all data is loaded
- `useCallback` stabilizes `loadMore` so the effect doesn't re-run unnecessarily
