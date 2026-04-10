# Round 1 — React Deep Dive

SurveyMonkey specifically asks about hooks and their internals before moving to the coding challenge.

---

## 1. useState — Deep Dive

**Q: How does useState work internally? What are its gotchas?**

```jsx
const [count, setCount] = useState(0);
```

**Gotcha 1 — State updates are async (batched in React 18+):**
```jsx
setCount(count + 1);
setCount(count + 1); // BOTH read same stale count — ends up as count+1, not count+2

// FIX: use functional update
setCount(prev => prev + 1);
setCount(prev => prev + 1); // count+2 ✓
```

**Gotcha 2 — Object state must be spread:**
```jsx
const [user, setUser] = useState({ name: 'John', age: 30 });

// WRONG — React won't detect the change (same reference mutation)
user.age = 31; setUser(user);

// CORRECT
setUser(prev => ({ ...prev, age: 31 }));
```

**Gotcha 3 — Lazy initialization (expensive computation):**
```jsx
// WRONG — runs on every render
const [items, setItems] = useState(computeExpensiveList());

// CORRECT — runs only once
const [items, setItems] = useState(() => computeExpensiveList());
```

---

## 2. useEffect — Deep Dive

**Q: Explain useEffect cleanup, dependency array behavior, and common pitfalls.**

```jsx
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') setError(err);
    });

  return () => controller.abort(); // cleanup on unmount or dep change
}, [userId]); // re-runs when userId changes
```

**Dependency array rules:**
| Array | Behavior |
|-------|----------|
| Omitted | Runs after every render |
| `[]` | Runs once after mount |
| `[a, b]` | Runs when a or b changes |

**Common pitfalls:**

```jsx
// WRONG — infinite loop: effect sets state → re-render → effect runs again
useEffect(() => {
  setCount(count + 1); // count in dep array causes loop
}, [count]);

// WRONG — missing dependency (stale closure)
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000);
  return () => clearInterval(id);
}, []); // count is stale — always logs initial value

// CORRECT — use functional update or include dep
useEffect(() => {
  const id = setInterval(() => setCount(c => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

---

## 3. useCallback & useMemo

**Q: When do you actually need useCallback and useMemo?**

```jsx
// useMemo — cache expensive computed value
const sortedItems = useMemo(
  () => items.sort((a, b) => a.price - b.price),
  [items]
);

// useCallback — stable function reference (for child components or deps)
const handleSubmit = useCallback((e) => {
  e.preventDefault();
  onSubmit(formData);
}, [formData, onSubmit]);
```

**Rule of thumb:**
- Don't add them everywhere — they have overhead
- Use `useMemo` when computation is genuinely expensive (>1ms)
- Use `useCallback` when passing callbacks to memoized children (`React.memo`)
- Profile first, optimize second

---

## 4. useRef

**Q: What are the use cases for useRef?**

```jsx
// 1. DOM access
const inputRef = useRef(null);
useEffect(() => { inputRef.current.focus(); }, []);

// 2. Mutable value that doesn't trigger re-render
const timerRef = useRef(null);
const startTimer = () => {
  timerRef.current = setInterval(() => tick(), 1000);
};
const stopTimer = () => clearInterval(timerRef.current);

// 3. Previous value pattern
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; });
  return ref.current; // returns value from PREVIOUS render
}
```

---

## 5. useContext — and when NOT to use it

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
  const { theme } = useContext(ThemeContext); // no prop drilling
  return <button className={theme}>Click</button>;
}
```

**When NOT to use context:**
- Frequently changing values (every consumer re-renders on every change)
- For that: use Zustand, Redux, or split contexts

---

## 6. Custom Hooks

**Q: Write a custom hook for data fetching.**

```jsx
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setLoading(true);

    fetch(url, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => { setData(data); setLoading(false); })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}

// Usage
function SurveyList() {
  const { data, loading, error } = useFetch('/api/surveys');
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;
  return <ul>{data.map(s => <li key={s.id}>{s.title}</li>)}</ul>;
}
```

---

## 7. React Performance Optimization

**Q: How do you prevent unnecessary re-renders?**

```jsx
// React.memo — skip re-render if props haven't changed
const SurveyCard = React.memo(({ title, responses }) => (
  <div>
    <h3>{title}</h3>
    <span>{responses} responses</span>
  </div>
));

// Without memo: re-renders every time parent renders
// With memo: only re-renders when title or responses change
```

**Reconciliation — how React diffs:**
- React compares virtual DOM trees
- Keys help React identify which list items changed
- Never use index as key for reorderable lists

```jsx
// BAD — index key causes bugs on reorder/delete
items.map((item, i) => <Item key={i} {...item} />)

// GOOD
items.map(item => <Item key={item.id} {...item} />)
```

---

## 8. Error Boundaries

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logToMonitoring(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <FallbackUI error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <SurveyBuilder />
</ErrorBoundary>
```

Note: Error boundaries are class components — hooks can't replicate `componentDidCatch` yet (React 19 adds `use` API improvements).

---

## 9. Controlled vs Uncontrolled Components

```jsx
// Controlled — React owns the state
function ControlledInput() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={e => setValue(e.target.value)} />;
}

// Uncontrolled — DOM owns the state, access via ref
function UncontrolledInput() {
  const ref = useRef();
  const handleSubmit = () => console.log(ref.current.value);
  return <input ref={ref} defaultValue="" />;
}
```

Prefer controlled: predictable, easier to validate and test.

---

## 10. React 18 Concurrent Features

**Q: What's new in React 18?**

- **Automatic batching** — state updates inside async callbacks are now batched (was only in event handlers before)
- **`useTransition`** — mark state update as non-urgent (keeps UI responsive)
- **`useDeferredValue`** — defer re-rendering of a part of the UI
- **`Suspense` on server** — streaming SSR

```jsx
// useTransition — for slow updates (e.g., filtering large list)
const [isPending, startTransition] = useTransition();

function handleSearch(query) {
  setSearchQuery(query); // urgent — updates input immediately
  startTransition(() => {
    setFilteredItems(filter(items, query)); // non-urgent — can be interrupted
  });
}

return (
  <>
    <input onChange={e => handleSearch(e.target.value)} />
    {isPending ? <Spinner /> : <ItemList items={filteredItems} />}
  </>
);
```
