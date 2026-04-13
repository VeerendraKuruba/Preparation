# Solutions — React Q&A (Q26–Q45)

---

## Q26. `useEffect` — `[]`, dependencies, no array

```jsx
// 1. Empty array [] — runs ONCE after first render (componentDidMount)
useEffect(() => {
  fetchSurveys();     // initial data load
  return () => {};    // cleanup (optional)
}, []);

// 2. With dependencies — runs after first render AND whenever deps change
useEffect(() => {
  if (surveyId) fetchSurvey(surveyId);
}, [surveyId]);       // re-runs every time surveyId changes

// 3. No array — runs after EVERY render (rarely what you want)
useEffect(() => {
  document.title = `${count} surveys`;
}); // no array — runs on every render

// Cleanup pattern (important for subscriptions, timers)
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/surveys', { signal: controller.signal })
    .then(res => res.json())
    .then(setSurveys)
    .catch(err => {
      if (err.name !== 'AbortError') setError(err);
    });

  return () => controller.abort(); // cleanup on unmount or re-run
}, []);
```

**Key rule:** Every value used inside `useEffect` that comes from outside it must be in the dependency array. ESLint `react-hooks/exhaustive-deps` enforces this.

---

## Q27. `useState` — what happens with same value?

```jsx
const [count, setCount] = useState(0);

// React uses Object.is() to compare. If value is the same → NO re-render
setCount(0);   // current value is 0 → bails out, no re-render ✓

// Object/array — same reference = no re-render, new reference = re-render
const [user, setUser] = useState({ name: 'Alice' });
setUser(user);              // same ref → no re-render
setUser({ ...user });       // new ref → re-renders even if contents identical

// Functional updater — use when next state depends on previous
setCount(prev => prev + 1); // safe in async contexts, avoids stale closure
```

---

## Q28. Context API — how it works + re-render implications

```jsx
// 1. Create context
const SurveyContext = createContext(null);

// 2. Provide value
function SurveyProvider({ children }) {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(false);

  const value = useMemo(
    () => ({ surveys, setSurveys, loading }),
    [surveys, loading]   // memoize to prevent re-renders when parent re-renders
  );

  return (
    <SurveyContext.Provider value={value}>
      {children}
    </SurveyContext.Provider>
  );
}

// 3. Consume
function SurveyList() {
  const { surveys, loading } = useContext(SurveyContext);
  // ...
}
```

**Re-render trap:** Every time the Provider's `value` prop changes (even if the consumer only uses one field), **all consumers re-render**. Fixes:
- Split context into smaller contexts (separate `SurveyDataContext` and `SurveyActionsContext`)
- Wrap value in `useMemo`
- Use `React.memo` on consumers

---

## Q29. Redux — actions, reducers, store

```js
// Redux data flow (unidirectional):
// UI → dispatch(action) → reducer(state, action) → new state → UI re-render

// 1. Action (plain object describing what happened)
const addSurvey = (survey) => ({
  type: 'surveys/add',
  payload: survey,
});

// 2. Reducer (pure function: (state, action) => newState)
const initialState = { items: [], loading: false };

function surveysReducer(state = initialState, action) {
  switch (action.type) {
    case 'surveys/add':
      return { ...state, items: [...state.items, action.payload] };
    case 'surveys/setLoading':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

// 3. Store (holds entire app state, single source of truth)
const store = createStore(surveysReducer);
store.dispatch(addSurvey({ id: 1, title: 'NPS Survey' }));
store.getState(); // { items: [{ id: 1, ... }], loading: false }

// Modern: Redux Toolkit (RTK) — less boilerplate
import { createSlice } from '@reduxjs/toolkit';

const surveysSlice = createSlice({
  name: 'surveys',
  initialState,
  reducers: {
    add: (state, action) => { state.items.push(action.payload); }, // Immer allows mutation
    setLoading: (state, action) => { state.loading = action.payload; },
  },
});
export const { add, setLoading } = surveysSlice.actions;
```

---

## Q30. React — one-way vs two-way data binding

React uses **one-way data flow** — data flows from parent to child via props. Children cannot directly modify parent state.

```jsx
// One-way: parent owns state, passes down to child
function Parent() {
  const [query, setQuery] = useState('');

  return (
    <div>
      <SearchInput value={query} onChange={setQuery} />
      <Results query={query} />
    </div>
  );
}

// Child receives value, calls callback to update parent — no direct mutation
function SearchInput({ value, onChange }) {
  return <input value={value} onChange={e => onChange(e.target.value)} />;
}
```

**Why one-way?** Predictable — you always know where state lives and what caused a change. Two-way binding (Angular's `ngModel`) makes debugging harder at scale.

---

## Q31. Controlled vs uncontrolled components

**Controlled:** React state is the source of truth. Every change goes through React.

```jsx
function ControlledInput() {
  const [value, setValue] = useState('');

  return (
    <input
      value={value}                         // React drives the value
      onChange={e => setValue(e.target.value)} // every keystroke updates state
    />
  );
}
```

**Uncontrolled:** DOM is the source of truth. Use `ref` to read value when needed.

```jsx
function UncontrolledForm() {
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(inputRef.current.value); // read on demand
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} defaultValue="initial" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

**Use controlled for:** validation, conditional disabling, formatting on input
**Use uncontrolled for:** file inputs, integrating with non-React libraries, simple forms with no dynamic validation

---

## Q32. React keys — why index as key is bad

```jsx
// BAD — using index as key
{surveys.map((s, i) => <SurveyCard key={i} survey={s} />)}

// Why it's bad: when items reorder or are removed from the middle,
// indices shift → React thinks items are the same but they're not
// → wrong components get updated, animations break, input state lost

// GOOD — use stable, unique IDs
{surveys.map(s => <SurveyCard key={s.id} survey={s} />)}

// Demonstrate the bug:
// List: [A(0), B(1), C(2)]
// Delete A → [B(0), C(1)]
// React sees key 0 changed from A to B → updates instead of removing
// → flickering, wrong focus, stale input values
```

**Rule:** Keys must be unique among siblings, stable across renders, and not based on index unless the list is static and never reordered.

---

## Q33. `useMemo` vs `useCallback` — when to actually use them

```jsx
// useMemo — memoizes a COMPUTED VALUE
const expensiveResult = useMemo(() => {
  return surveys.filter(s => s.responses > threshold).sort(...);
}, [surveys, threshold]); // only recomputes when surveys or threshold changes

// useCallback — memoizes a FUNCTION REFERENCE
const handleDelete = useCallback((id) => {
  setSurveys(prev => prev.filter(s => s.id !== id));
}, []); // stable reference — safe to pass to React.memo children

// When do you ACTUALLY need them?
// 1. Pass function to React.memo child (prevent re-render)
// 2. Pass function as useEffect dependency
// 3. Computationally expensive calculation (filter+sort of 10k items)
// 4. Stable reference needed (event subscription, interval)

// When NOT needed (over-optimization):
const handleClick = useCallback(() => setOpen(true), []); // overkill for simple handler
const title = useMemo(() => `Hello ${name}`, [name]);     // string concat is free

// Rule of thumb: measure first. Most components don't need them.
```

---

## Q34. `React.memo` vs `useMemo`

```jsx
// React.memo — memoizes a COMPONENT
// Prevents re-render if props haven't changed (shallow comparison)
const SurveyCard = React.memo(function SurveyCard({ survey, onDelete }) {
  return (
    <div>
      <h3>{survey.title}</h3>
      <button onClick={() => onDelete(survey.id)}>Delete</button>
    </div>
  );
});

// Custom comparison (when default shallow compare is insufficient)
const SurveyCard = React.memo(SurveyCardComponent, (prevProps, nextProps) => {
  return prevProps.survey.id === nextProps.survey.id &&
         prevProps.survey.updatedAt === nextProps.survey.updatedAt;
});

// useMemo — memoizes a VALUE inside a component
function Dashboard({ surveys }) {
  const stats = useMemo(() => computeStats(surveys), [surveys]); // value
  return <StatsPanel stats={stats} />;
}

// Summary:
// React.memo  → wrap component → prevents re-render
// useMemo     → wrap value → avoids recomputation
// useCallback → wrap function → stable reference
```

---

## Q35. `useEffect` vs `useLayoutEffect`

```jsx
// useEffect — runs AFTER browser paints (asynchronous, non-blocking)
useEffect(() => {
  // DOM is ready, browser has painted → user sees update before this runs
  analytics.track('survey_viewed');
  fetchData();
}, []);

// useLayoutEffect — runs AFTER DOM mutations, BEFORE browser paints (synchronous)
useLayoutEffect(() => {
  // Runs before user sees anything → use for DOM measurements
  const height = ref.current.offsetHeight;
  setComputedHeight(height); // prevents flash of wrong layout
}, []);

// When to use useLayoutEffect:
// - Reading DOM layout (size, position, scroll)
// - Updating DOM before paint (avoid flicker)
// - Tooltip/popover positioning
// - Animations that depend on DOM measurements

// Default rule: use useEffect. Only switch to useLayoutEffect if you see flickering.
```

---

## Q36. React reconciliation + Fiber architecture

**Reconciliation:** When state/props change, React builds a new virtual DOM tree and **diffs it** against the previous tree using these rules:
1. Different element types → destroy old, create new
2. Same element type → update props in place
3. Lists → use `key` to match items

**Fiber:** React's reimplemented reconciler (React 16+). Key improvements:
- **Incremental rendering:** Breaks work into small units, can pause and resume
- **Prioritisation:** User interactions (clicks) get higher priority than background data fetches
- **Concurrency (React 18):** Multiple renders in progress simultaneously

```jsx
// Fiber enables this — without Fiber, React couldn't pause here
function HeavyList({ items }) {
  const [isPending, startTransition] = useTransition();

  const handleSearch = (q) => {
    startTransition(() => {
      // React marks this as low priority — can be interrupted by urgent updates
      setFilteredItems(items.filter(i => i.title.includes(q)));
    });
  };

  return <input onChange={e => handleSearch(e.target.value)} />;
}
```

---

## Q37. HOCs vs Custom Hooks

```jsx
// Higher-Order Component (HOC) — function that takes a component and returns a new component
function withAuth(WrappedComponent) {
  return function AuthenticatedComponent(props) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" />;
    return <WrappedComponent {...props} user={user} />;
  };
}
const ProtectedDashboard = withAuth(Dashboard);

// Custom Hook — reusable stateful logic (no component wrapping)
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be inside AuthProvider');
  return context;
}

// Comparison:
// HOC — modifies the component tree, harder to debug (wrapper hell)
// Custom Hook — composable, debuggable, modern preference

// Prefer custom hooks for logic reuse
// Use HOC only when you must inject JSX or intercept rendering (e.g., auth wrapper)
```

---

## Q38. Prop drilling + solutions

```jsx
// Prop drilling — passing props through many intermediate components
function App() {
  const [user, setUser] = useState(null);
  return <Layout user={user} />; // Layout doesn't need user
}
function Layout({ user }) {
  return <Sidebar user={user} />; // Sidebar doesn't need user either
}
function Sidebar({ user }) {
  return <UserAvatar user={user} />; // finally used here
}

// Solutions:
// 1. Context API — for global data (auth, theme, locale)
const UserContext = createContext(null);
// Wrap App with UserContext.Provider, consume anywhere with useContext

// 2. Component composition — pass components as children/props
function Layout({ sidebar }) {
  return <div className="layout">{sidebar}</div>;
}
// In App:
<Layout sidebar={<UserAvatar user={user} />} /> // no drilling needed

// 3. State management library — Zustand, Jotai, Redux for complex global state

// Rule: prefer composition first, context second, Redux third
```

---

## Q39. Preventing unnecessary re-renders

```jsx
// 1. React.memo for components
const SurveyRow = React.memo(({ survey }) => <tr><td>{survey.title}</td></tr>);

// 2. useCallback for handlers passed to children
const handleDelete = useCallback((id) => {
  dispatch(deleteSurvey(id));
}, [dispatch]);

// 3. useMemo for expensive computations
const filteredSurveys = useMemo(
  () => surveys.filter(s => s.status === activeFilter),
  [surveys, activeFilter]
);

// 4. Split state — don't put unrelated state in one useState
// BAD:
const [state, setState] = useState({ user: null, surveys: [], modal: false });
// Any change re-renders everything that uses state

// GOOD:
const [user, setUser] = useState(null);
const [surveys, setSurveys] = useState([]);
const [modal, setModal] = useState(false);

// 5. Move state down — don't lift state higher than needed
// 6. Use Context selectors or Zustand selectors to subscribe to slices

// 7. Profiler to find bottlenecks first — don't optimise blindly
```

---

## Q40. `useRef` — use cases beyond DOM

```jsx
// 1. DOM access (obvious use)
const inputRef = useRef(null);
useEffect(() => inputRef.current.focus(), []);

// 2. Store mutable value without causing re-render
function Timer() {
  const intervalRef = useRef(null);
  const [count, setCount] = useState(0);

  const start = () => {
    intervalRef.current = setInterval(() => setCount(c => c + 1), 1000);
  };
  const stop = () => clearInterval(intervalRef.current);
}

// 3. Track previous value
function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; });
  return ref.current; // returns value from previous render
}

// 4. Avoid stale closures in callbacks
function SearchBox({ onSearch }) {
  const onSearchRef = useRef(onSearch);
  useEffect(() => { onSearchRef.current = onSearch; }); // always latest

  const debouncedSearch = useCallback(
    debounce((q) => onSearchRef.current(q), 300),
    [] // stable function, but always calls latest onSearch
  );
}

// 5. Track if component is mounted (prevent setState after unmount)
const isMounted = useRef(true);
useEffect(() => () => { isMounted.current = false; }, []);
```

---

## Q41. `useReducer` vs `useState`

```jsx
// useState — simple, independent values
const [name, setName] = useState('');
const [email, setEmail] = useState('');

// useReducer — complex state with multiple related fields or transitions
const initialState = { loading: false, data: null, error: null };

function surveyReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { loading: true, data: null, error: null };
    case 'FETCH_SUCCESS':
      return { loading: false, data: action.payload, error: null };
    case 'FETCH_ERROR':
      return { loading: false, data: null, error: action.payload };
    default:
      return state;
  }
}

function SurveyDetail({ id }) {
  const [state, dispatch] = useReducer(surveyReducer, initialState);

  useEffect(() => {
    dispatch({ type: 'FETCH_START' });
    fetchSurvey(id)
      .then(data => dispatch({ type: 'FETCH_SUCCESS', payload: data }))
      .catch(err => dispatch({ type: 'FETCH_ERROR', payload: err.message }));
  }, [id]);

  if (state.loading) return <Spinner />;
  if (state.error) return <Error message={state.error} />;
  return <Survey data={state.data} />;
}

// Choose useReducer when:
// - State transitions depend on previous state
// - Multiple sub-values that change together
// - Complex logic that's testable in isolation
// - Shared logic patterns (similar to Redux for local state)
```

---

## Q42. Class components vs functional components

| | Class | Functional |
|--|-------|-----------|
| State | `this.state`, `setState` | `useState` |
| Lifecycle | Methods (`componentDidMount`) | `useEffect` |
| Performance | Slightly heavier | Lighter |
| Logic reuse | HOCs, render props | Custom hooks ✓ |
| Error Boundaries | Yes (class only) | No (use class wrapper) |
| Current preference | Legacy | Modern standard |

```jsx
// Class — lifecycle methods
class SurveyList extends React.Component {
  state = { surveys: [], loading: true };

  async componentDidMount() {
    const surveys = await fetchSurveys();
    this.setState({ surveys, loading: false });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.filter !== this.props.filter) this.refetch();
  }

  componentWillUnmount() { this.controller?.abort(); }

  render() {
    return this.state.loading ? <Spinner /> : <List items={this.state.surveys} />;
  }
}

// Functional equivalent — cleaner
function SurveyList({ filter }) {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchSurveys(filter, { signal: controller.signal })
      .then(data => { setSurveys(data); setLoading(false); })
      .catch(() => {});
    return () => controller.abort();
  }, [filter]);

  return loading ? <Spinner /> : <List items={surveys} />;
}
```

---

## Q43. React Portals

Portals render children into a **different DOM node** than the component's parent — useful for modals, tooltips, dropdowns that need to escape CSS overflow/z-index constraints.

```jsx
import { createPortal } from 'react-dom';

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  // Renders into document.body, not wherever <Modal> is in JSX
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
        <button onClick={onClose}>×</button>
      </div>
    </div>,
    document.body   // target DOM node
  );
}

// React events still bubble through the React component tree (not the DOM tree)
// so onClick on parent components still fires through portals
```

---

## Q44. Error Boundaries

```jsx
// Must be a class component — no functional equivalent yet
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to error tracking (Sentry, Datadog)
    errorService.log(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <h2>Something went wrong.</h2>;
    }
    return this.props.children;
  }
}

// Usage — wrap sections to contain failures
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Header />
      <ErrorBoundary fallback={<SurveyListError />}>
        <SurveyList />    {/* error here won't crash Header */}
      </ErrorBoundary>
    </ErrorBoundary>
  );
}

// What ErrorBoundary does NOT catch:
// - Event handlers (use try/catch)
// - Async code (useEffect, setTimeout)
// - Server-side rendering
// - Errors in the error boundary itself
```

---

## Q45. React 18 Concurrent Features

### `useTransition` — mark state updates as non-urgent

```jsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    setQuery(e.target.value); // urgent — update input immediately

    startTransition(() => {
      // non-urgent — React can interrupt this to handle more urgent updates
      setResults(filterItems(e.target.value));
    });
  };

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending ? <Spinner /> : <ResultsList results={results} />}
    </>
  );
}
```

### `useDeferredValue` — defer a derived value

```jsx
function SurveySearch({ surveys }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query); // lags behind query

  const filtered = useMemo(
    () => surveys.filter(s => s.title.includes(deferredQuery)),
    [surveys, deferredQuery] // uses deferred (stale-ok) value
  );

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {/* Shows previous results while new ones compute */}
      <SurveyList surveys={filtered} />
    </>
  );
}
```

### Automatic batching (React 18)

```jsx
// React 17: only batches inside React event handlers
// React 18: batches everywhere (setTimeout, Promises, native events)

setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // React 18: one re-render total ✓
  // React 17: two re-renders
}, 1000);

// Opt-out if needed (rare)
import { flushSync } from 'react-dom';
flushSync(() => setCount(c => c + 1)); // forces immediate render
```
