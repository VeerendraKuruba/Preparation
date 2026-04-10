# React — Freshworks Staff Frontend Q&A

---

## Q1: How does React's reconciliation (Fiber) work? (CONFIRMED)

**Answer:**
React's reconciler is called **Fiber** — an async, incremental reconciliation engine.

**Before Fiber (Stack reconciler — React < 16):**
- Synchronous, recursive — once started, couldn't be interrupted
- Long reconciliation blocked the main thread → janky UI

**Fiber architecture:**
- Each component = a Fiber node (linked list, not a call stack)
- Work is split into units — can be **paused, resumed, aborted, or reprioritized**
- Two phases:
  1. **Render phase** (async, interruptible) — compute what changed, build a "work-in-progress" tree
  2. **Commit phase** (synchronous, not interruptible) — apply DOM mutations

**Reconciliation (diffing) heuristics — O(n):**
- Different element types → destroy old tree, mount new one
- Same element type → update attributes/props in place
- Lists → use `key` to identify stable items (moves vs insert/delete)

**Concurrent features built on Fiber:**
- `startTransition` — mark updates as low priority (won't block user input)
- Suspense — pause rendering while waiting for async data/code
- `useTransition`, `useDeferredValue` — control rendering priority

---

## Q2: Fix unnecessary re-renders (CONFIRMED — presented as code problem)

**Scenario:** A list component re-renders on every parent update even when data didn't change.

```jsx
// Problem — new array reference on every render
function Parent() {
  const [count, setCount] = useState(0);
  const items = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]; // NEW ref every render

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <ItemList items={items} />
    </>
  );
}

const ItemList = React.memo(({ items }) => {       // memo is useless — items always new
  console.log('ItemList rendered');
  return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
});
```

**Fix:**
```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // Stable reference — only recomputes if deps change
  const items = useMemo(
    () => [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
    [] // empty deps = created once
  );

  // Stable callback reference
  const handleItemClick = useCallback((id) => {
    console.log('clicked', id);
  }, []); // deps: add state/props it uses

  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <ItemList items={items} onItemClick={handleItemClick} />
    </>
  );
}
```

**When React.memo is useful:** When a child is expensive to render AND its props are stable (same reference). Worthless if props always create new objects/arrays/functions.

---

## Q3: Virtual DOM performance — when is it NOT faster than direct DOM?

**Answer:**
React's Virtual DOM is not universally faster than direct DOM — it adds overhead.

**When VDom is SLOWER:**
- Simple, infrequent updates (plain HTML + `innerHTML` is faster)
- Highly dynamic lists that change entirely (no key matches)
- Real-time data streams (100+ updates/second — batching helps but still overhead)

**When VDom is FASTER (or rather: easier to reason about at scale):**
- Large component trees with many conditional renders — React only touches what changed
- Batched updates — React groups multiple `setState` calls into one DOM update
- Cross-browser abstractions — React's synthetic event system normalizes behavior

**Real answer interviewers want:** "React's VDom is a developer experience optimization, not purely a performance optimization. It lets you write declarative code and React figures out the minimal DOM changes. For raw performance on specific scenarios, direct DOM manipulation wins — but at the cost of maintainability."

---

## Q4: Custom hooks — when and how

```jsx
// Extract reusable stateful logic into a custom hook
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled && e.name !== 'AbortError') setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; controller.abort(); };
  }, [url]);

  return { data, loading, error };
}

// Usage
function TicketList() {
  const { data, loading, error } = useFetch('/api/tickets');
  if (loading) return <Spinner />;
  if (error) return <ErrorBanner error={error} />;
  return <ul>{data.map(t => <li key={t.id}>{t.subject}</li>)}</ul>;
}
```

**Rules for custom hooks:**
- Must start with `use`
- Can call other hooks
- Each call creates its own independent state

---

## Q5: `useEffect` vs `useLayoutEffect` — when does it matter?

```
useEffect:       render → paint → effect runs (async, after paint)
useLayoutEffect: render → effect runs → paint (sync, before paint)
```

**Use `useLayoutEffect` when:**
- You need to read the DOM layout (element size, position) before paint
- Prevents visual flash/flicker on initial render

```jsx
function Tooltip({ targetRef, text }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Must run before paint to prevent flicker
  useLayoutEffect(() => {
    const rect = targetRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom, left: rect.left });
  }, [targetRef]);

  return <div style={pos} className="tooltip">{text}</div>;
}
```

**Default to `useEffect`** — `useLayoutEffect` blocks painting and can hurt perceived performance.

---

## Q6: State management — Redux vs Context vs Zustand

| | Context API | Redux Toolkit | Zustand |
|--|------------|---------------|---------|
| Setup | Minimal | Moderate | Minimal |
| Re-renders | All consumers re-render | Selective via selectors | Selective |
| DevTools | No | Excellent | Good |
| Async | Manual | RTK Query built-in | Manual or with middleware |
| Bundle size | 0kb (built-in) | ~20kb | ~1kb |
| Best for | Infrequent global state (theme, auth) | Complex, frequently-updated state | Lightweight global state |

**Freshworks relevance:** Given their component library needs to work across React, Ember, and Rails, they likely avoid Redux in shared components and prefer Context or event-driven patterns.

---

## Q7: React 18 — new features a Staff engineer should know

**Concurrent rendering:**
```jsx
import { startTransition, useTransition, useDeferredValue } from 'react';

// startTransition — mark update as non-urgent (won't interrupt typing)
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e) {
    setQuery(e.target.value); // urgent — update input immediately

    startTransition(() => {
      setResults(heavyFilter(e.target.value)); // non-urgent — can be interrupted
    });
  }

  return (
    <>
      <input value={query} onChange={handleSearch} />
      {isPending ? <Spinner /> : <ResultsList results={results} />}
    </>
  );
}

// useDeferredValue — defer a value update (like debounce but React-coordinated)
function ProductList({ query }) {
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => filterProducts(deferredQuery), [deferredQuery]);
  return <List items={results} />;
}
```

**Automatic batching:** In React 18, state updates inside `setTimeout`, Promises, and native event handlers are automatically batched (was only in React event handlers before).

**Streaming SSR with Suspense:**
```jsx
// Server streams HTML progressively — shell renders first, deferred content streams in
<Suspense fallback={<TicketListSkeleton />}>
  <TicketList /> {/* streams in after data loads */}
</Suspense>
```

---

## Q8: Error boundaries — how and when

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logToErrorMonitoring(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

// Usage — wrap sections, not the whole app
<ErrorBoundary>
  <ChatWidget />
</ErrorBoundary>
```

**Limitations:** Error boundaries do NOT catch errors in:
- Event handlers (use try/catch)
- Async code (`useEffect` async functions)
- SSR
- The error boundary itself

---

## Q9: Code splitting strategies

```jsx
// Route-level splitting (most impactful)
const Dashboard = lazy(() => import('./Dashboard'));
const Reports   = lazy(() => import('./Reports'));

// Component-level splitting (for heavy widgets)
const RichTextEditor = lazy(() => import('./RichTextEditor'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports"   element={<Reports />} />
      </Routes>
    </Suspense>
  );
}

// Prefetch on hover (improves perceived perf)
function NavLink({ to, label }) {
  return (
    <Link
      to={to}
      onMouseEnter={() => import(`./pages/${to}`)} // prefetch before click
    >
      {label}
    </Link>
  );
}
```
