# 18. Prevent Unnecessary React Re-renders

## How React Decides to Re-render

React's default behavior is: **when a component re-renders, all of its children re-render too** — regardless of whether their props changed. This is not a bug; it is the safe default. The cost is acceptable for small trees, but in larger apps with deeply nested components or frequently-updated parent state, it becomes a performance bottleneck.

The three conditions that trigger a re-render:
1. The component's own state changed (`useState`, `useReducer`).
2. Its parent re-rendered and React did not bail out (no `React.memo`, or memo comparison returned `false`).
3. A context it subscribes to changed value.

The goal of re-render optimization is to break the parent-to-child cascade at precisely the points where it is wasteful, while leaving the rest of the app alone.

**Rule: measure first, optimize second.** Premature memoization adds code complexity for zero gain. Use React DevTools Profiler to find the actual bottleneck before writing a single `useMemo`.

---

## The Core Problem: Unstable Prop References

### Inline Objects and Arrays Create New References Every Render

```jsx
// PROBLEMATIC: Even if React.memo wraps Chart, it will re-render on every parent render.
// { color: 'blue', weight: 2 } creates a new object reference each time Parent renders.
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      {/* New object reference every render → memo comparison fails → Chart re-renders */}
      <Chart style={{ color: 'blue', weight: 2 }} />
    </>
  );
}

const Chart = React.memo(({ style }) => {
  console.log('Chart rendered'); // fires on every count increment
  return <svg style={style}>...</svg>;
});
```

```jsx
// FIXED: Hoist the constant outside the component (best for truly static values)
const CHART_STYLE = { color: 'blue', weight: 2 };

function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      {/* CHART_STYLE is always the same reference → Chart.memo bails out correctly */}
      <Chart style={CHART_STYLE} />
    </>
  );
}

// OR: useMemo when the object depends on props/state
function Parent({ theme }) {
  const chartStyle = useMemo(
    () => ({ color: theme.primary, weight: theme.lineWeight }),
    [theme.primary, theme.lineWeight]
  );
  return <Chart style={chartStyle} />;
}
```

---

## React.memo With Bad and Good Prop Patterns

```jsx
// BAD: Inline function creates a new reference on every render.
// React.memo on ListRow does nothing because onSelect is always a different function.
function ProductList({ products }) {
  return products.map(p => (
    <ListRow
      key={p.id}
      product={p}
      onSelect={(id) => handleSelect(id)} // new function every render
    />
  ));
}

// GOOD: useCallback stabilizes the function reference.
function ProductList({ products }) {
  const handleSelect = useCallback((id) => {
    // do something with id
  }, []); // empty deps → same function forever

  return products.map(p => (
    <ListRow
      key={p.id}
      product={p}
      onSelect={handleSelect} // same reference → React.memo works
    />
  ));
}

const ListRow = React.memo(({ product, onSelect }) => {
  return (
    <div onClick={() => onSelect(product.id)}>
      {product.name}
    </div>
  );
});
```

---

## useMemo for Expensive Computed Values

```jsx
// WITHOUT useMemo: filterProducts runs on every render, including renders
// triggered by unrelated state (e.g., a sidebar toggle).
function ProductPage({ products, filters, sidebarOpen }) {
  // This runs even when only sidebarOpen changes — wasted work if products is 10,000 items
  const filtered = filterProducts(products, filters);

  return (
    <>
      <Sidebar open={sidebarOpen} />
      <ProductList products={filtered} />
    </>
  );
}

// WITH useMemo: filterProducts only runs when products or filters change.
// A sidebarOpen change does not trigger recomputation.
function ProductPage({ products, filters, sidebarOpen }) {
  const filtered = useMemo(
    () => filterProducts(products, filters),
    [products, filters] // stable references required for this to actually help
  );

  return (
    <>
      <Sidebar open={sidebarOpen} />
      <ProductList products={filtered} />
    </>
  );
}
```

**When useMemo helps:**
- The computation is measurably expensive (> 1ms — use `console.time` to check).
- The dependency array values are stable references between renders.
- The result is passed to `React.memo`'d children or used as a dependency of another hook.

**When useMemo does NOT help:**
- The deps change on every render anyway (e.g., deps include an inline object — the memoization never reuses the cached value).
- The computation is trivial (filtering 10 items, string concatenation) — the memo overhead may cost more than the computation.
- The result is not passed down to memo'd children — recomputing is just wasted bookkeeping, not a UI performance fix.

---

## useCallback for Stable Function References

```jsx
// SCENARIO: A form with many fields. Each field gets an onChange handler.
// Without useCallback, every handler is recreated on every keystroke (because form state changes),
// causing all memoized Field components to re-render.

function Form() {
  const [values, setValues] = useState({ name: '', email: '', phone: '' });

  // BAD: New function references on every render of Form.
  const handleNameChange = (e) => setValues(v => ({ ...v, name: e.target.value }));
  const handleEmailChange = (e) => setValues(v => ({ ...v, email: e.target.value }));

  // GOOD: Stable references. Field components memoized with React.memo won't re-render
  // when a different field updates.
  const handleNameChange = useCallback(
    (e) => setValues(v => ({ ...v, name: e.target.value })),
    [] // setValues from useState is guaranteed stable — safe to omit
  );
  const handleEmailChange = useCallback(
    (e) => setValues(v => ({ ...v, email: e.target.value })),
    []
  );

  return (
    <>
      <Field label="Name" value={values.name} onChange={handleNameChange} />
      <Field label="Email" value={values.email} onChange={handleEmailChange} />
    </>
  );
}

const Field = React.memo(({ label, value, onChange }) => {
  console.log(`${label} rendered`);
  return <input value={value} onChange={onChange} />;
});
```

---

## Context Split: Fat Context Causes All Consumers to Re-render

```jsx
// BAD: One giant context holds everything.
// When the user's mouse position updates (60fps), ALL components using AppContext re-render —
// including the Header, Sidebar, UserProfile, everything.
const AppContext = createContext();

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  return (
    <AppContext.Provider value={{ user, theme, mousePosition, setUser, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}

// GOOD: Split context by update frequency and logical domain.
const UserContext = createContext();     // rarely changes
const ThemeContext = createContext();    // occasionally changes
const MouseContext = createContext();    // changes 60fps — only components that need it subscribe

function Providers({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // Stabilize the user context value so it does not recreate on theme/mouse changes
  const userValue = useMemo(() => ({ user, setUser }), [user]);
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <UserContext.Provider value={userValue}>
      <ThemeContext.Provider value={themeValue}>
        <MouseContext.Provider value={mouse}>
          {children}
        </MouseContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}
```

**Alternative: useSyncExternalStore for fine-grained subscriptions**

```jsx
// A Zustand-style external store allows components to subscribe to specific slices.
// Only the components subscribed to `user.name` re-render when user.name changes.
import { useSyncExternalStore } from 'react';

// Subscribing only to user.name — other store changes do not trigger this component.
function UserNameDisplay() {
  const name = useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().user.name
  );
  return <span>{name}</span>;
}
```

---

## Moving State Down / Lifting Content Up

**Move state down:** If only a subtree needs a piece of state, colocate it there. A parent component that owns state it does not use itself will re-render unnecessarily on every state change.

```jsx
// BAD: modal open/close state lives in App, causing App and all siblings to re-render on toggle.
function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <>
      <ExpensiveDataGrid />           {/* Re-renders on every modal toggle */}
      <Button onClick={() => setIsModalOpen(true)}>Open</Button>
      {isModalOpen && <Modal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}

// GOOD: Extract the modal and its state into its own component.
// ExpensiveDataGrid is never affected by modal toggles.
function App() {
  return (
    <>
      <ExpensiveDataGrid />
      <ModalController />             {/* Owns its own open/close state */}
    </>
  );
}

function ModalController() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open</Button>
      {isOpen && <Modal onClose={() => setIsOpen(false)} />}
    </>
  );
}
```

**Lift content up (children as props):** Pass expensive components as `children` or render props so they are created by the parent and are unaffected by the intermediate component's state.

```jsx
// GOOD: SlowComponent is created by App (stable) and passed as children.
// When AnimatedWrapper toggles its internal animation state,
// SlowComponent does NOT re-render because its props (the children reference) did not change.
function App() {
  return (
    <AnimatedWrapper>
      <SlowComponent />
    </AnimatedWrapper>
  );
}
```

---

## Using React DevTools Profiler to Find the Actual Culprit

1. Open Chrome DevTools → React DevTools tab → click "Profiler".
2. Click "Record", interact with the UI (click a button, type in a search box).
3. Click "Stop". You will see a flame graph of every component render in that interaction.
4. Look for components that are highlighted (rendered) even though their props should not have changed.
5. Click a component in the flame graph. The right panel shows "Why did this render?" — it lists which props or state changed.

**Reading the flame graph:**
- Width of a bar = time spent rendering that component (and its children).
- Gray = did not render in this commit. Yellow/orange = rendered.
- A memoized component that still rendered shows "Props changed" — click it to see which prop.

**Common findings:**
- `UserProfile` re-renders on every keystroke because it receives `user` object from context, and the context value is recreated each render.
- `Button` re-renders because its `onClick` prop is a new function reference each time.
- `DataTable` re-renders because its parent's state update is high in the tree.

---

## Rules: When to Optimize and When Not To

| Situation | Action |
|---|---|
| Component renders correctly | Do nothing — measure first |
| Profiler shows > 16ms render time | Investigate — find which prop changed |
| Inline object/array props to memo'd child | `useMemo` the object / hoist outside component |
| Inline function prop to memo'd child | `useCallback` |
| Context causes wide re-renders | Split context, or use external store with selectors |
| State too high in tree | Move state down or lift content up |
| Leaf component rendering 10k times | `React.memo` with custom comparator |

**Anti-patterns to avoid:**
- Wrapping every component in `React.memo` — adds overhead for the comparison on every render, and is wasted when the component re-renders correctly and cheaply.
- Adding `useCallback` to every handler blindly — only valuable when the function is passed to a `memo`'d child or is a dependency of another hook.
- Using `useMemo` for trivial computations — the closure and dependency comparison cost more than the saved computation.

---

## Interview Sound Bite

"React re-renders children when a parent renders — that is the default and it is safe but expensive at scale. My debugging workflow: profile first with React DevTools Profiler, find the component that renders when it should not, check 'Why did this render?' to see which prop changed. The fix hierarchy: if an inline object or array prop causes memo to miss, I stabilize it with `useMemo` or hoist it outside the component. If it is a function prop, I reach for `useCallback`. If a fat context is broadcasting changes to everyone, I split it by domain and update frequency, or switch to `useSyncExternalStore` for slice-level subscriptions. If state lives too high in the tree, I move it down or lift components up as children props. I apply `React.memo` on hot leaf components only after confirming the render is unnecessary via the profiler — never as a default."
