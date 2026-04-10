# React — eBay Frontend Interview Q&A

---

## Q1: What is the Virtual DOM and how does reconciliation work?

**Answer:**
The Virtual DOM is an in-memory representation of the real DOM tree.

**How it works:**
1. On state/prop change, React creates a new Virtual DOM tree
2. React diffs the new tree against the previous one (reconciliation)
3. Only the real DOM nodes that actually changed are updated (patching)

**Diffing heuristics (O(n) not O(n³)):**
- Elements of different types → tear down old subtree, build new one
- Same type → update attributes in place, recurse into children
- Lists → use `key` prop to identify which items moved/added/removed

**Why `key` matters:**
```jsx
// Bad — React can't tell which item was removed
items.map((item, i) => <Item key={i} {...item} />)

// Good — stable identity across re-renders
items.map(item => <Item key={item.id} {...item} />)
```

---

## Q2: Explain the core React hooks.

**Answer:**

| Hook | Purpose | When to use |
|------|---------|-------------|
| `useState` | Local component state | Any value that triggers re-render |
| `useEffect` | Side effects (fetch, subscriptions, timers) | After render, with cleanup |
| `useRef` | Mutable value that doesn't trigger re-render | DOM refs, timers, previous values |
| `useMemo` | Memoize expensive computed value | Expensive derivation from state/props |
| `useCallback` | Memoize function reference | Prevent child re-renders, stable dep arrays |
| `useContext` | Read context value | Avoid prop drilling |
| `useReducer` | Complex state logic | Multiple related state values, next state depends on prev |

```jsx
// useRef — doesn't cause re-render unlike useState
const intervalRef = useRef(null);
intervalRef.current = setInterval(tick, 1000); // safe to assign

// useMemo — only recomputes when deps change
const total = useMemo(
  () => items.reduce((sum, item) => sum + item.price * item.qty, 0),
  [items]
);
```

---

## Q3: What is the difference between controlled and uncontrolled components?

**Answer:**

**Controlled** — React owns the state; input value driven by state:
```jsx
const [value, setValue] = useState('');
<input value={value} onChange={e => setValue(e.target.value)} />
```

**Uncontrolled** — DOM owns the state; accessed via ref:
```jsx
const inputRef = useRef();
<input ref={inputRef} defaultValue="initial" />
// Read value: inputRef.current.value
```

**eBay relevance:** Use controlled for search bars, forms, filter inputs where you need live validation or derived state. Use uncontrolled for file inputs (`<input type="file">` — the DOM owns the file list).

---

## Q4: When does a component re-render? How do you prevent unnecessary re-renders?

**Answer:**
A component re-renders when:
- Its own state changes
- Its parent re-renders (even if props didn't change)
- Its context value changes

**Prevention tools:**
- `React.memo(Component)` — skips re-render if props are shallowly equal
- `useMemo` — memoize computed values passed as props
- `useCallback` — stabilize function references passed as props
- `useReducer` over multiple `useState` calls for related state

```jsx
// Without memo: Child re-renders every time Parent renders
// With memo: Child re-renders only when `item` prop changes
const CartItem = React.memo(function CartItem({ item }) {
  return <div>{item.name}: ${item.price}</div>;
});
```

**Warning:** Don't over-optimize. `React.memo` has a cost (shallow comparison). Profile first.

---

## Q5: Explain `useEffect` — how does cleanup work?

**Answer:**
```jsx
useEffect(() => {
  // setup: runs after render

  const controller = new AbortController();
  fetch('/api/items', { signal: controller.signal })
    .then(r => r.json())
    .then(setItems);

  // cleanup: runs before next effect OR on unmount
  return () => controller.abort();

}, [query]); // re-runs when `query` changes
```

**Dependency array rules:**
- `[]` — run once after mount only
- `[a, b]` — run after mount + whenever a or b changes
- No array — run after every render (usually wrong)

**Common mistake:** Missing deps in the array causes stale closure bugs.

---

## Q6: What is Context API? When to use it vs Redux?

**Answer:**
Context provides a way to pass data through the component tree without prop drilling.

```jsx
const ThemeContext = createContext('light');

function App() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Page />
    </ThemeContext.Provider>
  );
}

function Button() {
  const { theme } = useContext(ThemeContext);
  return <button className={theme}>Click</button>;
}
```

| | Context API | Redux |
|--|-------------|-------|
| Good for | Theme, locale, auth, rarely-changed global state | Frequently updated, complex state with many consumers |
| Perf concern | All consumers re-render on any value change | Selective subscriptions — only subscribed slice |
| Boilerplate | Minimal | More setup (actions, reducers) |

**eBay context:** Use Context for auth/user session, theme, cart count badge. Use Redux/Zustand for the full cart state that many components read/write.

---

## Q7: What is code splitting and how does React.lazy work?

**Answer:**
Code splitting defers loading JS bundles until they're needed, reducing initial load time.

```jsx
import { lazy, Suspense } from 'react';

const ProductDetail = lazy(() => import('./ProductDetail'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <ProductDetail />
    </Suspense>
  );
}
```

`React.lazy` uses dynamic `import()` — the chunk is fetched only when the component first renders. Essential for large apps like eBay where product detail, checkout, and seller tools are separate routes.

---

## Q8: What are React portals?

**Answer:**
Portals render a component's output into a different DOM node than its parent — while keeping the React tree (event bubbling, context) intact.

```jsx
import { createPortal } from 'react-dom';

function Modal({ children }) {
  return createPortal(
    <div className="modal">{children}</div>,
    document.getElementById('modal-root') // outside #root
  );
}
```

**Why needed:** Modals, tooltips, dropdowns that need to overflow parent containers or be above all z-index stacking contexts.

---

## Q9: What is the difference between `useState` and `useReducer`?

**Answer:**

Use `useReducer` when:
- Next state depends on the previous state in complex ways
- Multiple related state values that update together
- State update logic is complex enough to benefit from being centralized

```jsx
// useState version — gets messy with complex state
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// useReducer version — all cart logic in one place
function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD':    return { ...state, items: [...state.items, action.item] };
    case 'REMOVE': return { ...state, items: state.items.filter(i => i.id !== action.id) };
    case 'UPDATE_QTY':
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.id ? { ...i, qty: action.qty } : i
        ),
      };
    default: return state;
  }
}
```

---

## Q10: How do you handle forms in React? (controlled pattern)

**Answer:**
```jsx
function CheckoutForm() {
  const [form, setForm] = useState({ name: '', email: '', address: '' });
  const [errors, setErrors] = useState({});

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Required';
    if (!form.email.includes('@')) errs.email = 'Invalid email';
    return errs;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    // submit...
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <input name="name" value={form.name} onChange={handleChange} />
      {errors.name && <span>{errors.name}</span>}
    </form>
  );
}
```
