# Section 2 — React (Hooks, State, Performance)

---

### Q11. What is the difference between useEffect with [], with dependencies, and with no array? Give real examples.

`useEffect` accepts a callback and an optional dependency array. The array controls **when** the effect re-runs.

| Form | When it runs |
|------|-------------|
| No array | After **every** render |
| `[]` | Only once — after the **first** render (mount) |
| `[dep1, dep2]` | After mount, and again whenever any listed dep changes |

**No array — runs after every render**

```jsx
useEffect(() => {
  document.title = `Count is ${count}`;
}); // no array — runs on every render
```

Use this when you genuinely need to sync after every render. Rare in practice; easily causes infinite loops if the effect itself triggers a state update.

**Empty array — runs once on mount**

```jsx
useEffect(() => {
  fetch('/api/user')
    .then(res => res.json())
    .then(setUser);

  return () => {
    // cleanup runs on unmount
  };
}, []); // empty array — mount only
```

The cleanup function (returned callback) runs when the component **unmounts**. Common for subscriptions, timers, or event listeners.

**With dependencies — runs when deps change**

```jsx
useEffect(() => {
  if (!userId) return;

  const controller = new AbortController();
  fetch(`/api/user/${userId}`, { signal: controller.signal })
    .then(res => res.json())
    .then(setUser);

  return () => controller.abort(); // cancel previous request
}, [userId]); // re-run whenever userId changes
```

React does a **shallow comparison** of each dependency. If `userId` changes between renders, the cleanup of the previous effect runs first, then the new effect fires.

**Common pitfalls**
- Forgetting a dependency causes stale closures (bug).
- Including unstable references (new object/function on every render) causes infinite loops.
- The ESLint `exhaustive-deps` rule catches both.

---

### Q12. Why shouldn't you call hooks inside conditions or loops?

React relies on **hook call order** to associate each hook with its internal slot of state/effect. On every render, hooks must be called in the exact same sequence.

If you place a hook inside an `if` block:

```jsx
// WRONG — breaks the rules
function Component({ isLoggedIn }) {
  if (isLoggedIn) {
    const [name, setName] = useState(''); // hook #1 conditionally
  }
  const [age, setAge] = useState(0); // sometimes hook #1, sometimes #2
}
```

When `isLoggedIn` flips from `true` to `false`, React tries to map its stored state slots to the current hook calls and gets a mismatch. The result is **wrong state being assigned to the wrong hook**, or a runtime error:

> "Rendered more hooks than during the previous render."

**The mental model:** React tracks hooks as an ordered linked list. Slot 0 → first `useState`, slot 1 → second `useState`, etc. Skipping a call shifts every subsequent slot.

**The fix:** move the condition inside the hook's callback, not around the hook call.

```jsx
// CORRECT
function Component({ isLoggedIn }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState(0);

  useEffect(() => {
    if (!isLoggedIn) return; // condition is inside
    fetchUserName().then(setName);
  }, [isLoggedIn]);
}
```

The same rule applies to loops — calling hooks inside a `for` loop would produce a variable number of hook calls depending on array length.

---

### Q13. What is useLayoutEffect and when would you prefer it over useEffect?

Both hooks have the same API, but they fire at different points in the render cycle:

| | `useEffect` | `useLayoutEffect` |
|--|--|--|
| Timing | **After** paint (async) | **Before** paint, after DOM mutations (sync) |
| Blocks paint? | No | Yes |
| Use case | Data fetching, subscriptions, logging | DOM measurements, avoiding flicker |

**useEffect timeline:**
```
React renders → DOM updated → Browser paints → useEffect fires
```

**useLayoutEffect timeline:**
```
React renders → DOM updated → useLayoutEffect fires (sync) → Browser paints
```

**When to prefer useLayoutEffect**

1. **Reading DOM measurements that affect layout** — if you measure an element's size/position and then immediately set state to adjust the UI, `useEffect` causes a visible flash (the browser paints the initial position, then paints again). `useLayoutEffect` prevents that intermediate paint.

```jsx
function Tooltip({ targetRef, children }) {
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const targetRect = targetRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    setPosition({
      top: targetRect.bottom + 8,
      left: targetRect.left - tooltipRect.width / 2,
    });
  }, []); // runs sync before paint — no flicker

  return (
    <div ref={tooltipRef} style={{ position: 'fixed', ...position }}>
      {children}
    </div>
  );
}
```

2. **Third-party DOM libraries** (e.g., D3, charts) that must mutate the DOM before it is visible to the user.

**Default to `useEffect`** — `useLayoutEffect` blocks paint and can hurt performance. Use it only when you see an observable visual flicker that `useEffect` cannot solve. Also note: `useLayoutEffect` does not run during SSR; you'll need a guard or use a `useIsomorphicLayoutEffect` pattern.

---

### Q14. Explain useCallback and useMemo. When do they actually help and when are they premature optimization?

Both hooks **memoize** values across renders, avoiding expensive recalculations or unstable references.

**useMemo — memoizes a computed value**

```jsx
const filteredUsers = useMemo(() => {
  return users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()));
}, [users, query]);
// filteredUsers is recalculated only when users or query changes
```

**useCallback — memoizes a function reference**

```jsx
const handleSubmit = useCallback((formData) => {
  api.post('/submit', formData);
}, [api]); // same function reference unless api changes
```

`useCallback(fn, deps)` is equivalent to `useMemo(() => fn, deps)`.

**When they actually help**

1. **Expensive computation** — `useMemo` prevents rerunning a costly calculation (e.g., sorting/filtering 10 000 records) on every render.

2. **Stable references for child component props** — When passing a callback to a `React.memo`-wrapped child, `useCallback` prevents the child from re-rendering just because the parent re-rendered.

```jsx
const MemoizedChild = React.memo(({ onSave }) => { /* ... */ });

function Parent() {
  const handleSave = useCallback(() => {
    saveData();
  }, []); // stable reference — MemoizedChild won't re-render unnecessarily

  return <MemoizedChild onSave={handleSave} />;
}
```

3. **Dependency arrays in other hooks** — a memoized function as a dep of `useEffect` prevents infinite re-runs.

**When they are premature optimization**

- The component renders quickly already — adding memoization adds its own overhead (comparison on every render).
- The dependency array changes on every render anyway — the memoization never hits.
- The child is not wrapped in `React.memo` — a stable callback reference doesn't help.
- The computed value is trivial (e.g., `a + b`).

**Rule of thumb:** profile first. Reach for `useMemo`/`useCallback` when you can measure the problem, not to pre-emptively guard every function.

---

### Q15. What does useRef do beyond storing DOM references? Give 2 non-DOM use cases.

`useRef` returns a mutable object `{ current: initialValue }`. The key properties are:

- Mutating `.current` does **not** trigger a re-render.
- The ref object is **stable** across renders (same reference every time).

**Non-DOM use case 1 — tracking previous prop/state value**

```jsx
function PriceDisplay({ price }) {
  const prevPriceRef = useRef(price);

  useEffect(() => {
    prevPriceRef.current = price; // update after render
  });

  const prevPrice = prevPriceRef.current;
  const direction = price > prevPrice ? '▲' : price < prevPrice ? '▼' : '—';

  return (
    <span>
      {price} {direction}
    </span>
  );
}
```

`useState` would cause an extra render; `useRef` stores the previous value silently.

**Non-DOM use case 2 — storing a mutable value that should not trigger re-renders (e.g., timer IDs, abort controllers, flags)**

```jsx
function AutoSave({ content }) {
  const timerRef = useRef(null);

  useEffect(() => {
    // clear previous debounce timer
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      api.save(content);
    }, 1000);

    return () => clearTimeout(timerRef.current);
  }, [content]);

  return <div>Auto-saving…</div>;
}
```

Storing the timer ID in state would cause a pointless re-render every time the debounce resets. `useRef` keeps it invisible to React's render cycle.

---

### Q16. How would you build a custom useFetch hook with loading, error, and abort support?

```jsx
import { useState, useEffect, useRef, useCallback } from 'react';

function useFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async () => {
    // abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        ...options,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const json = await response.json();
      setData(json);
    } catch (err) {
      if (err.name === 'AbortError') {
        // request was intentionally cancelled — not an error
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [url]); // re-fetch whenever url changes

  useEffect(() => {
    fetchData();

    return () => {
      // abort on unmount or before next effect run
      abortControllerRef.current?.abort();
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Usage
function UserProfile({ userId }) {
  const { data, loading, error, refetch } = useFetch(`/api/users/${userId}`);

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;

  return <ProfileCard user={data} />;
}
```

**Key design decisions:**
- `AbortController` cancels the previous request when `url` changes or the component unmounts — prevents setting state on an unmounted component and avoids race conditions.
- `AbortError` is swallowed because it is an intentional cancellation, not a real failure.
- `refetch` is exposed so callers can manually trigger a refresh (e.g., pull-to-refresh, retry button).
- `options` is intentionally excluded from `useCallback` deps to avoid unstable object references causing infinite loops — pass a stable options object or memoize it at the call site if needed.

---

### Q17. What is useTransition and how does it improve UX in React 18?

`useTransition` is a React 18 hook that lets you mark a state update as **non-urgent** (a "transition"). React can interrupt transitions to handle urgent updates (typing, clicking) first.

```jsx
import { useState, useTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    const value = e.target.value;

    // Urgent: update the input immediately
    setQuery(value);

    // Non-urgent: updating the result list can be deferred
    startTransition(() => {
      setResults(heavyFilter(allItems, value));
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      {isPending ? (
        <p>Updating results…</p>
      ) : (
        <ResultList items={results} />
      )}
    </>
  );
}
```

**How it works under concurrent rendering:**

Without `useTransition`, both `setQuery` and `setResults` are treated as equal-priority work. A slow `setResults` render blocks the `<input>` from feeling responsive.

With `useTransition`, React:
1. Immediately commits the urgent update (`setQuery` → input reflects keystroke).
2. Starts rendering the transition update in the background.
3. If a new keypress arrives, React **abandons** the in-progress background render and starts fresh — the user never sees an intermediate stale result.

**`isPending`** is `true` while the transition is in-flight, giving you a loading signal without a spinner that immediately disappears.

**When to use it:**
- Route navigations (keeping the old page visible while the new one loads).
- Filtering/sorting large lists.
- Tabs that trigger expensive renders.

**When NOT to use it:** urgent UI like input values, button click feedback — those should always be synchronous.

---

### Q18. What is useDeferredValue? How does it differ from useTransition?

`useDeferredValue` accepts a value and returns a **deferred copy** of it. React renders the component first with the old (deferred) value and re-renders with the new value when it has capacity.

```jsx
import { useState, useDeferredValue, memo } from 'react';

const HeavyList = memo(function HeavyList({ query }) {
  // expensive render based on query
  return <ul>{filterItems(query).map(item => <li key={item.id}>{item.name}</li>)}</ul>;
});

function Search() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const isStale = query !== deferredQuery; // still catching up

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <div style={{ opacity: isStale ? 0.5 : 1 }}>
        <HeavyList query={deferredQuery} />
      </div>
    </>
  );
}
```

**Key difference from useTransition**

| | `useTransition` | `useDeferredValue` |
|--|--|--|
| What you control | **State updates** (wrap the setter) | **Values** (wrap the value after the fact) |
| Where to use | When you own the state update code | When you receive a value from props or cannot change how state is set (e.g., third-party input) |
| Provides `isPending` | Yes | No (you compute staleness yourself) |

**Rule of thumb:** if you control the state setter, prefer `useTransition`. If you only have access to the value (e.g., it comes from a prop), use `useDeferredValue`.

Both require `React.memo` on child components — otherwise the deferred re-render still propagates through all children every time.

---

### Q19. What are the rules of hooks and why do they exist (what would break if you violated them)?

**The two rules:**

1. **Only call hooks at the top level** — never inside loops, conditions, or nested functions.
2. **Only call hooks from React function components or custom hooks** — never from regular JS functions, class components, or event handlers.

**Why these rules exist — the internal mechanism**

React stores hook state as a **linked list of "memory cells"** tied to a fiber node (component instance). On every render, React walks this list in order, assigning each hook call to the next cell.

```
Render 1: useState→cell[0]  useEffect→cell[1]  useRef→cell[2]
Render 2: useState→cell[0]  useEffect→cell[1]  useRef→cell[2]  ✓ stable
```

**If you call hooks inside a condition:**

```jsx
if (show) useState(0);  // sometimes cell[0], sometimes skipped
useState('');           // sometimes cell[0], sometimes cell[1]
```

```
Render 1 (show=true):  useState→cell[0]  useState→cell[1]
Render 2 (show=false): /* first hook skipped */  useState→cell[0]  ← WRONG cell!
```

The second `useState` reads cell[0] (the first hook's data) — producing corrupted state. React throws:
> "Rendered fewer hooks than expected. This may be caused by an accidental early return."

**If you call hooks outside React functions:**

React can only link a fiber node (component) to its hook state during a render. Calling `useState` in a plain function has no fiber context — React doesn't know which component's state to read or update, so it throws:
> "Invalid hook call. Hooks can only be called inside of the body of a function component."

**The enforcement:** the ESLint plugin `eslint-plugin-react-hooks` with the `rules-of-hooks` rule enforces both statically at development time.

---

### Q20. Explain the useReducer hook. When do you choose it over useState?

`useReducer` manages state through a **pure reducer function** — the same pattern as Redux but local to a component.

```jsx
const initialState = { count: 0, step: 1 };

function counterReducer(state, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + state.step };
    case 'DECREMENT':
      return { ...state, count: state.count - state.step };
    case 'SET_STEP':
      return { ...state, step: action.payload };
    case 'RESET':
      return initialState;
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }
}

function Counter() {
  const [state, dispatch] = useReducer(counterReducer, initialState);

  return (
    <>
      <p>Count: {state.count}</p>
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>+</button>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>-</button>
      <input
        type="number"
        value={state.step}
        onChange={e => dispatch({ type: 'SET_STEP', payload: Number(e.target.value) })}
      />
      <button onClick={() => dispatch({ type: 'RESET' })}>Reset</button>
    </>
  );
}
```

**A more realistic case — form with complex state:**

```jsx
const formReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, values: { ...state.values, [action.field]: action.value } };
    case 'SET_ERROR':
      return { ...state, errors: { ...state.errors, [action.field]: action.message } };
    case 'SUBMIT_START':
      return { ...state, submitting: true };
    case 'SUBMIT_SUCCESS':
      return { ...state, submitting: false, submitted: true };
    case 'SUBMIT_ERROR':
      return { ...state, submitting: false, serverError: action.error };
    default:
      return state;
  }
};
```

**When to choose useReducer over useState**

| Choose `useState` | Choose `useReducer` |
|---|---|
| Simple, independent values | Multiple related fields in one object |
| 1–2 state variables | State transitions depend on current state |
| Straightforward updates | Complex update logic with many cases |
| Prototyping | Testable state logic (reducer is a pure function) |
| | Next state depends on previous state values from other fields |

**The reducer is also easier to test in isolation:**

```js
expect(counterReducer({ count: 5, step: 2 }, { type: 'INCREMENT' }))
  .toEqual({ count: 7, step: 2 });
```

---

### Q21. What is React reconciliation and how does the Fiber architecture improve it?

**Reconciliation** is the process React uses to determine what changed in the virtual DOM tree and compute the minimal set of real DOM mutations needed to bring the UI up to date.

**How diffing works:**

React compares the new virtual DOM tree to the previous one with these heuristics (O(n) instead of O(n³)):

1. **Different element types** → tear down the old subtree and build a new one from scratch.
2. **Same element type** → update the existing DOM node's changed attributes/props, then recurse into children.
3. **Lists** → use the `key` prop to match children across renders. Same key = same element (update); missing key = destroy; new key = create.

```jsx
// React tears down <Counter> and mounts <Profile> because element type changed
{isLoggedIn ? <Profile /> : <Counter />}
```

**The problem with the old stack reconciler (pre-React 16)**

The original reconciler was a recursive, synchronous, **non-interruptible** call stack. A large component tree update blocked the main thread for its entire duration — causing dropped frames and janky UIs.

**Fiber — React 16+**

Fiber re-implements reconciliation as a linked list of "fiber nodes" (one per component). Work is broken into small **units**, and React can:

- **Pause** work mid-tree and resume it later.
- **Abort** a work-in-progress tree if higher-priority work arrives.
- **Prioritize** updates (user input > network data > analytics).
- **Reuse** partially-built trees.

**Two phases:**

1. **Render phase (interruptible)** — React traverses the fiber tree, diffs it, and marks which fibers have changes. No DOM mutations happen here. This can be paused and replayed.

2. **Commit phase (synchronous, non-interruptible)** — React applies all the DOM mutations in one pass. Can't be interrupted because a half-applied DOM would be visually broken.

Fiber is the foundation that makes React 18 features possible: `useTransition`, `useDeferredValue`, Suspense, and server components all rely on the ability to pause, prioritize, and resume renders.

---

### Q22. What triggers a re-render in React? List all the ways.

A component re-renders when React decides its output might have changed. Here are all the triggers:

**1. State update — `useState` or `useReducer`**

```jsx
const [count, setCount] = useState(0);
setCount(1); // triggers re-render
```

React batches state updates inside event handlers (React 18 batches all of them automatically via automatic batching).

**2. Parent re-renders**

By default, when a parent re-renders, all its children re-render too — regardless of whether their props changed. This is the most common source of unnecessary re-renders.

**3. Context value changes**

Every component that calls `useContext(MyContext)` re-renders when the context value changes, even if it only uses a slice of it.

```jsx
const { theme } = useContext(AppContext); // re-renders if ANY AppContext value changes
```

**4. `forceUpdate` (class components only)**

`this.forceUpdate()` skips `shouldComponentUpdate` and forces a re-render.

**5. Key prop change**

Changing a component's `key` tells React to destroy the old instance and mount a fresh one. This is a re-mount, not a re-render, but it fully resets all state.

```jsx
<UserForm key={userId} /> // changing userId resets the form
```

**6. `useReducer` dispatch**

Dispatching any action triggers a re-render (even if the reducer returns the same state — React compares with `Object.is` and bails out if identical).

**7. Custom hook internal state changes**

A custom hook that calls `useState` internally will cause its host component to re-render when that state changes.

**8. React.StrictMode (development only)**

In development, React intentionally double-invokes render functions to detect side effects. Not a production concern.

**What does NOT trigger a re-render:**
- Mutating a ref (`.current`).
- Mutating a regular variable.
- A context value update that the component doesn't subscribe to.

---

### Q23. Explain React.memo — what it does, when to use it, and when NOT to use it.

`React.memo` is a **higher-order component** that wraps a function component and memoizes its rendered output. If the component receives the same props as the previous render, React skips re-rendering it and reuses the last result.

```jsx
const ProductCard = React.memo(function ProductCard({ product, onAddToCart }) {
  console.log('ProductCard rendered');
  return (
    <div>
      <h3>{product.name}</h3>
      <p>${product.price}</p>
      <button onClick={() => onAddToCart(product.id)}>Add to cart</button>
    </div>
  );
});
```

By default, `React.memo` does a **shallow comparison** of props. You can provide a custom comparator as the second argument:

```jsx
const Chart = React.memo(
  function Chart({ data }) { /* ... */ },
  (prevProps, nextProps) => {
    // return true to SKIP re-render (props are "equal")
    return prevProps.data.length === nextProps.data.length;
  }
);
```

**When to use it**

- The component is **expensive** to render (large lists, complex visuals, data transformations).
- The component receives the **same props frequently** while the parent re-renders for unrelated reasons.
- Combined with `useCallback`/`useMemo` to ensure stable prop references.

```jsx
function Dashboard() {
  const [theme, setTheme] = useState('light');
  const handleSave = useCallback(() => api.save(), []); // stable reference

  return (
    <>
      <ThemeToggle onChange={setTheme} />
      {/* ExpensiveReport won't re-render when theme changes */}
      <ExpensiveReport onSave={handleSave} />
    </>
  );
}
const ExpensiveReport = React.memo(function ExpensiveReport({ onSave }) { /* ... */ });
```

**When NOT to use it**

- Props change on nearly every render anyway — memo's comparison overhead is pure cost.
- The component renders quickly — not worth the added complexity.
- Props contain **new object/array/function references every render** and you haven't memoized them — memo always misses.
- Premature optimization without profiling evidence.

---

### Q24. What is the Virtual DOM and how does React's diffing algorithm work?

**Virtual DOM** is a lightweight JavaScript representation of the real DOM. Instead of manipulating the DOM directly (which is slow), React:

1. Builds a virtual DOM tree (plain JS objects) from your JSX.
2. On re-render, builds a new virtual DOM tree.
3. **Diffs** the two trees to find the minimal changes.
4. Applies only those changes to the real DOM (**reconciliation/commit phase**).

**A virtual DOM node looks like:**

```js
// What <button className="btn">Click</button> becomes
{
  type: 'button',
  props: { className: 'btn', children: 'Click' },
  key: null,
  ref: null,
}
```

**The diffing algorithm (O(n) heuristics)**

Naively diffing two trees is O(n³). React uses two assumptions to reduce it to O(n):

**Heuristic 1 — Different types produce different trees**

```jsx
// Old                // New
<div>               <span>
  <Counter />  →      <Counter />
</div>              </span>
```

When the root element type changes (`div` → `span`), React destroys the entire subtree (including `<Counter>` and its state) and builds from scratch. It never tries to reuse children across type changes.

**Heuristic 2 — Keys identify children in lists**

Without keys, React matches children by position:

```
Old: [A, B, C]  →  New: [A, B, C, D]   → adds D  ✓
Old: [A, B, C]  →  New: [X, A, B, C]   → updates all 3, adds C  ✗ (expensive)
```

With keys, React matches by identity:

```jsx
items.map(item => <Item key={item.id} {...item} />)
// Old: [key=1, key=2, key=3]
// New: [key=0, key=1, key=2, key=3]  → creates key=0, reuses 1, 2, 3  ✓
```

**Attribute diffing (same type)**

When the element type is the same, React updates only the changed attributes:

```
Old: <input type="text" value="a" />
New: <input type="text" value="b" />
→ Only updates the `value` attribute
```

---

### Q25. How do you detect and fix unnecessary re-renders in a React app?

**Detection tools**

1. **React DevTools Profiler** — record a session, see which components rendered and how long each took. The "Ranked" chart highlights the slowest renders.

2. **React DevTools — Highlight updates** — turn on "Highlight updates when components render" in DevTools settings. Components flash blue on every render.

3. **why-did-you-render library** — monkey-patches React to log when a component re-renders due to a prop/state change that was actually equal.

```js
// setupTests.js
import React from 'react';
import whyDidYouRender from '@welldone-software/why-did-you-render';
whyDidYouRender(React, { trackAllPureComponents: true });
```

4. **Console logging with useRef**

```jsx
function useRenderCount(name) {
  const count = useRef(0);
  count.current++;
  console.log(`${name} rendered ${count.current} times`);
}
```

**Fixes**

**1. Memoize expensive child components with React.memo**

```jsx
const HeavyChart = React.memo(({ data }) => <Chart data={data} />);
```

**2. Stabilize callback references with useCallback**

```jsx
// Without: new function reference on every parent render → child always re-renders
const handleClick = () => doSomething();

// With: stable reference
const handleClick = useCallback(() => doSomething(), []);
```

**3. Stabilize object/array props with useMemo**

```jsx
// Without: new object on every render
<Chart options={{ color: 'red', type: 'bar' }} />

// With: stable object
const chartOptions = useMemo(() => ({ color: 'red', type: 'bar' }), []);
<Chart options={chartOptions} />
```

**4. Split context to reduce context consumers re-rendering**

```jsx
// Instead of one large context:
const AppContext = createContext();
// Split into:
const ThemeContext = createContext();
const UserContext = createContext();
// Components only re-render when their specific context changes
```

**5. Move state down (colocation)**

Push state to the lowest component that actually needs it, so re-renders don't bubble up unnecessarily.

**6. Use useTransition / useDeferredValue** for expensive non-urgent renders.

---

### Q26. What is code splitting in React? How do React.lazy and Suspense work?

**Code splitting** is the practice of breaking your JS bundle into smaller chunks that are loaded on demand, rather than shipping the entire app upfront. This reduces initial load time (Time to Interactive).

**Without code splitting:** one large `bundle.js` — the browser downloads everything before the user sees anything meaningful.

**With code splitting:** multiple chunks — the browser downloads only what's needed for the current route/interaction.

**React.lazy**

`React.lazy` lets you dynamically import a component. It must be used with `Suspense`.

```jsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Router>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Router>
    </Suspense>
  );
}
```

When React renders `<Dashboard />` for the first time, it triggers the dynamic `import()`. While the chunk is loading, React renders the nearest `<Suspense>` fallback. Once the chunk loads, React swaps in the real component.

**Nested Suspense for granular loading states:**

```jsx
function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<ChartSkeleton />}>
        <ExpensiveChart />   {/* separate chunk, separate loading state */}
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <DataTable />
      </Suspense>
    </div>
  );
}
```

**Preloading (advanced)**

```jsx
const Dashboard = lazy(() => import('./Dashboard'));

// Preload on hover before the user clicks — eliminates perceived loading time
function NavLink() {
  return (
    <Link
      to="/dashboard"
      onMouseEnter={() => import('./Dashboard')} // triggers fetch early
    >
      Dashboard
    </Link>
  );
}
```

**Bundler support:** `React.lazy` requires your bundler (Webpack, Vite, Rollup) to understand dynamic `import()` and split the output accordingly. Vite does this automatically.

---

### Q27. What is concurrent rendering in React 18 and how does it change behavior?

**Concurrent rendering** means React can work on multiple versions of the UI simultaneously, pause work in progress, and prioritize urgent updates over non-urgent ones — all without blocking the main thread.

**Before React 18 (synchronous rendering):**

```
User types keystroke
  → React starts re-rendering the whole tree
  → (cannot be interrupted)
  → 200ms later: DOM updates, input finally reflects keystroke
```

Result: laggy input on expensive renders.

**With React 18 concurrent rendering:**

```
User types keystroke
  → React marks input update as urgent → commits immediately
  → React works on expensive result list in background
  → Another keystroke arrives → React abandons old background work
  → Starts fresh background render for new query
  → Input stays responsive throughout
```

**What's opt-in vs. automatic**

React 18 ships concurrent features as **opt-in** — you must use the new `createRoot` API:

```jsx
// React 17 (legacy, synchronous only)
ReactDOM.render(<App />, document.getElementById('root'));

// React 18 (concurrent-ready)
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
```

Concurrent features are activated by hooks like `useTransition`, `useDeferredValue`, and Suspense with data fetching. Plain state updates with `useState` remain synchronous by default.

**Automatic batching**

React 18 automatically batches all state updates (including those in `setTimeout`, Promises, and native event handlers) into a single re-render. Previously, batching only occurred inside React event handlers.

```jsx
// React 18 — both updates are batched into one re-render
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
  // one re-render, not two
}, 1000);
```

**Behavioral changes to be aware of:**

- `useEffect` strict mode double-invocation — effects mount, unmount, and remount in development to expose non-idempotent effects.
- Render phase may run multiple times (renders are now interruptible and replayable) — render functions must be pure and free of side effects.

---

### Q28. What is the key prop in React lists? What happens if you use index as key?

The `key` prop is a stable, unique identifier that React uses during reconciliation to match elements in a list across renders. It tells React "this element from the previous render corresponds to this element in the current render."

**Why keys matter:**

```jsx
// Without keys — React matches by position
[<Item name="A" />, <Item name="B" />, <Item name="C" />]
// Remove "A":
[<Item name="B" />, <Item name="C" />]
// React updates first item "A"→"B", updates second "B"→"C", deletes third ← wasteful
```

```jsx
// With keys — React matches by identity
[<Item key="a" name="A" />, <Item key="b" name="B" />, <Item key="c" name="C" />]
// Remove "A":
[<Item key="b" name="B" />, <Item key="c" name="C" />]
// React deletes key="a", keeps key="b" and key="c" untouched ← optimal
```

**The index-as-key problem:**

```jsx
// Tempting but dangerous when the list can be reordered or filtered
{items.map((item, index) => (
  <TodoItem key={index} text={item.text} />
))}
```

When items are reordered or deleted, indexes shift. The component with `key=0` is now a different item, but React reuses its DOM node and local state:

```
Before: [key=0: "Buy milk", key=1: "Walk dog"]
After delete "Buy milk": [key=0: "Walk dog"]
→ React reuses the key=0 node — "Walk dog" inherits "Buy milk"'s DOM state (e.g. a checked checkbox)
```

This causes:
- **Wrong state** — a checked/unchecked checkbox belongs to the wrong item after reorder.
- **Broken animations** — items animate as if they haven't moved.
- **Performance loss** — React unnecessarily updates every item that shifted.

**When index-as-key is safe:** static lists that never reorder, filter, or delete items (e.g., a fixed tab bar).

**Best practice:** use a stable, unique ID from your data (`item.id`, UUID, database primary key).

```jsx
{items.map(item => (
  <TodoItem key={item.id} text={item.text} />
))}
```

---

### Q29. What is prop drilling? What are the solutions?

**Prop drilling** is the pattern of passing props through multiple layers of components that don't need the data themselves — only their descendants do.

```jsx
// App has the user; DeepChild needs it — middle layers just pass it along
function App() {
  const [user, setUser] = useState(currentUser);
  return <Layout user={user} />;
}
function Layout({ user }) {
  return <Sidebar user={user} />;  // Layout doesn't use user, just passes it
}
function Sidebar({ user }) {
  return <UserAvatar user={user} />; // Sidebar doesn't use user either
}
function UserAvatar({ user }) {
  return <img src={user.avatar} alt={user.name} />; // finally uses it
}
```

**Problems:**
- Intermediate components are coupled to data they don't care about.
- Adding/removing a prop requires touching every layer.
- Refactoring is painful.

**Solutions**

**1. Context API** — best for global or widely-shared data.

```jsx
const UserContext = createContext(null);

function App() {
  const [user] = useState(currentUser);
  return (
    <UserContext.Provider value={user}>
      <Layout />
    </UserContext.Provider>
  );
}

function UserAvatar() {
  const user = useContext(UserContext); // no drilling — reads directly
  return <img src={user.avatar} alt={user.name} />;
}
```

**2. Component composition (children/slots)** — often overlooked but very effective.

```jsx
// Instead of drilling, pass the composed element directly
function App() {
  const [user] = useState(currentUser);
  return (
    <Layout sidebar={<Sidebar avatar={<UserAvatar user={user} />} />} />
  );
}
// Layout and Sidebar don't touch `user` at all
```

**3. State management library** — Zustand, Redux, Jotai, Recoil for complex global state.

```jsx
// Zustand
const useStore = create(set => ({ user: null, setUser: u => set({ user: u }) }));

function UserAvatar() {
  const user = useStore(state => state.user);
  return <img src={user.avatar} alt={user.name} />;
}
```

**4. Custom hooks** — encapsulate and share logic; can wrap context.

```jsx
function useUser() {
  return useContext(UserContext);
}
```

**When is prop drilling fine?** 1–2 layers deep with truly local data. Over-engineering with Context for shallow trees adds complexity without benefit.

---

### Q30. Explain the Context API — when to use it, its re-render implications, and how to optimize it.

**Context API** provides a way to share values across the component tree without explicit prop drilling. It consists of a Provider (value source) and consumers (`useContext` hook).

```jsx
const ThemeContext = createContext('light');

function App() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Router />
    </ThemeContext.Provider>
  );
}

function Button() {
  const { theme } = useContext(ThemeContext);
  return <button className={theme}>Click</button>;
}
```

**When to use Context**
- Theme, locale, authenticated user — truly global values.
- Avoiding prop drilling more than 2–3 layers deep.
- When the value changes infrequently.

**Re-render implications — the key gotcha**

Every component that calls `useContext(MyContext)` re-renders whenever the context value changes — even if the component only uses a part of the value that didn't change.

```jsx
// PROBLEM: every ThemeContext consumer re-renders when setTheme changes
// (setTheme is a new function reference on every render of App... actually stable with useState, but)

// Bigger problem — passing a new object literal as value
<ThemeContext.Provider value={{ theme, setTheme }}>
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ new object on every App render
```

**Optimization strategies**

**1. Split contexts by concern**

```jsx
// Instead of one AppContext with everything:
const ThemeContext = createContext();
const UserContext = createContext();
const CartContext = createContext();
// Components subscribe only to what they need
```

**2. Memoize the context value**

```jsx
function App() {
  const [theme, setTheme] = useState('light');
  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  // value reference only changes when theme changes, not on every App render
  return <ThemeContext.Provider value={value}><Router /></ThemeContext.Provider>;
}
```

**3. Separate read and write contexts**

```jsx
const ThemeValueContext = createContext();
const ThemeDispatchContext = createContext();

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeValueContext.Provider value={theme}>
      <ThemeDispatchContext.Provider value={setTheme}>
        {children}
      </ThemeDispatchContext.Provider>
    </ThemeValueContext.Provider>
  );
}
// Components that only dispatch actions don't re-render when theme changes
```

**4. Use a selector with an external library** — Zustand and Jotai offer selector-based subscriptions that only re-render when the specific slice of state a component uses changes.

---

### Q31. What is the compound component pattern? Build a simple Tabs component using it.

The **compound component pattern** is a design pattern where a parent component and a set of child components share implicit state through context, giving consumers a flexible, composable API — without needing to manage state externally or pass many props.

Classic examples from HTML: `<select>` + `<option>`, `<table>` + `<tr>` + `<td>`.

**Tabs implementation:**

```jsx
import { createContext, useContext, useState } from 'react';

// 1. Shared context
const TabsContext = createContext(null);

// 2. Root component — owns the state
function Tabs({ children, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// 3. TabList — renders the tab buttons
function TabList({ children }) {
  return <div role="tablist" className="tab-list">{children}</div>;
}

// 4. Tab — individual tab button
function Tab({ value, children }) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;
  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={isActive ? 'tab active' : 'tab'}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

// 5. TabPanels — container for panels
function TabPanels({ children }) {
  return <div className="tab-panels">{children}</div>;
}

// 6. TabPanel — individual content panel
function TabPanel({ value, children }) {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== value) return null;
  return (
    <div role="tabpanel" className="tab-panel">
      {children}
    </div>
  );
}

// Attach sub-components for a clean API
Tabs.List = TabList;
Tabs.Tab = Tab;
Tabs.Panels = TabPanels;
Tabs.Panel = TabPanel;

export default Tabs;
```

**Consumer usage — clean, readable, flexible:**

```jsx
function App() {
  return (
    <Tabs defaultTab="overview">
      <Tabs.List>
        <Tabs.Tab value="overview">Overview</Tabs.Tab>
        <Tabs.Tab value="history">History</Tabs.Tab>
        <Tabs.Tab value="settings">Settings</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panels>
        <Tabs.Panel value="overview"><OverviewContent /></Tabs.Panel>
        <Tabs.Panel value="history"><HistoryContent /></Tabs.Panel>
        <Tabs.Panel value="settings"><SettingsContent /></Tabs.Panel>
      </Tabs.Panels>
    </Tabs>
  );
}
```

**Benefits vs. a monolithic `<Tabs tabs={[...]} panels={[...]} />` prop API:**
- Consumers control layout — they can put the tab list at the bottom, insert banners between list and panels, etc.
- Easier to extend — add a `<Tabs.Badge>` without changing the Tabs API.
- Separation of structure and behavior.

---

### Q32. What is the render props pattern and how does it compare to custom hooks?

**Render props** is a pattern where a component receives a **function as a prop** and calls it to render its output, sharing internal state or behavior with the caller.

```jsx
// MouseTracker shares mouse position via render prop
function MouseTracker({ render }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    setPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div style={{ height: '100vh' }} onMouseMove={handleMouseMove}>
      {render(position)}  {/* call the prop with internal state */}
    </div>
  );
}

// Usage
<MouseTracker
  render={({ x, y }) => (
    <p>Mouse is at ({x}, {y})</p>
  )}
/>
```

The same pattern with the `children` prop:

```jsx
<MouseTracker>
  {({ x, y }) => <Crosshair x={x} y={y} />}
</MouseTracker>
```

**Custom hook equivalent:**

```jsx
function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return position;
}

// Usage — much cleaner
function Crosshair() {
  const { x, y } = useMousePosition();
  return <p>Mouse is at ({x}, {y})</p>;
}
```

**Comparison:**

| | Render Props | Custom Hooks |
|--|--|--|
| Available since | React 16.3 | React 16.8 |
| Sharing mechanism | JSX / component tree | Function call |
| Nesting | Creates "wrapper hell" with multiple providers | Flat — just call multiple hooks |
| Type safety | Harder to type correctly | Clean TypeScript inference |
| Testability | Test via rendering | Test the hook directly with `renderHook` |
| Use case today | Component libraries that need to work pre-hooks; when you need to render different JSX structures | Preferred modern pattern |

**When render props still make sense:**
- Libraries targeting wide React version compatibility.
- When the behavior is inherently tied to a DOM element that must be rendered (e.g., the `<MouseTracker>` div needs to be in the tree for event handling).
- Certain component library patterns (e.g., Downshift, React Table v7).

---

### Q33. Explain controlled vs uncontrolled components. When do you use each?

**Controlled components** — React owns the form element's value via state. The element's value is always synchronized with state; user input goes through `onChange` → `setState` → re-render.

```jsx
function ControlledInput() {
  const [value, setValue] = useState('');

  return (
    <input
      value={value}           // React controls this
      onChange={e => setValue(e.target.value)}
    />
  );
}
```

React is the single source of truth. You can validate, transform, or block input in `onChange`:

```jsx
// Enforce uppercase
onChange={e => setValue(e.target.value.toUpperCase())}

// Limit to 10 characters
onChange={e => setValue(e.target.value.slice(0, 10))}
```

**Uncontrolled components** — the DOM owns the value. React only reads it when needed (e.g., on submit) via a ref.

```jsx
function UncontrolledInput() {
  const inputRef = useRef(null);

  function handleSubmit(e) {
    e.preventDefault();
    console.log(inputRef.current.value); // read from DOM when needed
  }

  return (
    <form onSubmit={handleSubmit}>
      <input ref={inputRef} defaultValue="initial" />
      <button type="submit">Submit</button>
    </form>
  );
}
```

**Comparison:**

| | Controlled | Uncontrolled |
|--|--|--|
| Source of truth | React state | DOM |
| Instant validation | Easy | Hard |
| Conditional disable | Easy | Hard |
| File inputs | N/A (always uncontrolled) | Natural fit |
| Performance | Re-renders on every keystroke | No renders during typing |
| Integration with libraries | Required by React Hook Form controlled mode | Default for React Hook Form uncontrolled mode |

**When to use each:**

**Controlled** — when you need:
- Real-time validation (e.g., password strength meter).
- Conditional submit button disable.
- Formatting on input (phone number masking, currency).
- Deriving other state from the input value.

**Uncontrolled** — when you need:
- File uploads (`<input type="file">` is always uncontrolled).
- Simple forms where you only need the value on submit.
- Performance-sensitive forms with many fields (React Hook Form uses uncontrolled by default).
- Integrating with non-React DOM libraries.

---

### Q34. What is the Flux pattern and how does Redux implement it?

**Flux** is an architectural pattern (not a library) Facebook introduced alongside React. It enforces **unidirectional data flow** to make state changes predictable and traceable.

**Flux flow:**

```
Action → Dispatcher → Store → View → (user interaction) → Action → ...
```

1. **Action** — a plain object describing what happened (`{ type: 'ADD_ITEM', payload: item }`).
2. **Dispatcher** — a central hub that receives all actions and broadcasts them to stores.
3. **Store** — holds state; updates itself in response to actions; emits a change event.
4. **View** — React components; listen to store changes and re-render.

**Redux** is the most popular Flux implementation, with key differences:

- **Single store** — Redux consolidates all state into one store (Flux allows multiple stores).
- **Pure reducer functions** — instead of stores with mutation logic, Redux uses `(state, action) => newState` pure functions.
- **No dispatcher class** — `store.dispatch(action)` replaces the separate Dispatcher.

**Redux data flow:**

```
UI Event → dispatch(action) → reducer(currentState, action) → newState → store → UI re-renders
```

**Modern Redux Toolkit example:**

```jsx
import { createSlice, configureStore } from '@reduxjs/toolkit';
import { useSelector, useDispatch, Provider } from 'react-redux';

// Slice = reducer + actions combined
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], total: 0 },
  reducers: {
    addItem(state, action) {
      state.items.push(action.payload);        // RTK uses Immer — direct mutation is fine
      state.total += action.payload.price;
    },
    removeItem(state, action) {
      state.items = state.items.filter(i => i.id !== action.payload);
      state.total = state.items.reduce((sum, i) => sum + i.price, 0);
    },
  },
});

const store = configureStore({ reducer: { cart: cartSlice.reducer } });

// Component
function CartButton({ product }) {
  const dispatch = useDispatch();
  const itemCount = useSelector(state => state.cart.items.length);

  return (
    <button onClick={() => dispatch(cartSlice.actions.addItem(product))}>
      Add to Cart ({itemCount})
    </button>
  );
}

// Root
function App() {
  return (
    <Provider store={store}>
      <CartButton product={{ id: 1, name: 'Widget', price: 9.99 }} />
    </Provider>
  );
}
```

**Key Redux principles:**
1. **Single source of truth** — one store.
2. **State is read-only** — only actions can trigger changes.
3. **Changes are made with pure functions** — reducers.

**When Redux is overkill:** small apps, local component state, or server state (use React Query instead).

---

### Q35. How does React Query / TanStack Query work and why use it over plain useEffect for data fetching?

**React Query** is a server-state management library. It handles the entire lifecycle of async data — fetching, caching, background refetching, pagination, mutations, and synchronization — so you don't have to.

**The plain useEffect approach and its problems:**

```jsx
function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/users')
      .then(res => res.json())
      .then(data => { setUsers(data); setLoading(false); })
      .catch(err => { setError(err); setLoading(false); });
  }, []);

  // Problems:
  // - No caching — re-fetches every time this component mounts
  // - No background refetch when user returns to tab
  // - No deduplication — two components mounting simultaneously send two requests
  // - No retry on failure
  // - Race conditions if url changes while fetch is in flight
  // - Boilerplate duplicated across every fetch
}
```

**The React Query approach:**

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Simple data fetching
function UserList() {
  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['users'],        // cache key
    queryFn: () => fetch('/api/users').then(res => res.json()),
    staleTime: 1000 * 60 * 5,  // data considered fresh for 5 minutes
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBanner onRetry={refetch} />;
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}

// Mutations with cache invalidation
function CreateUser() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newUser) => fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(newUser),
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] }); // refetch user list
    },
  });

  return (
    <button
      onClick={() => mutation.mutate({ name: 'Jane', email: 'jane@example.com' })}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? 'Creating…' : 'Create User'}
    </button>
  );
}

// Parameterized queries
function UserDetail({ userId }) {
  const { data: user } = useQuery({
    queryKey: ['users', userId],  // separate cache entry per userId
    queryFn: () => fetch(`/api/users/${userId}`).then(res => res.json()),
    enabled: !!userId,            // don't fetch if userId is null
  });

  return user ? <ProfileCard user={user} /> : null;
}
```

**What React Query gives you automatically:**

| Feature | plain useEffect | React Query |
|---|---|---|
| Caching | Manual | Built-in, by `queryKey` |
| Background refetch | Manual | On window focus, network reconnect |
| Deduplication | Manual | Multiple components, one request |
| Retry on error | Manual | 3 retries by default (configurable) |
| Loading/error states | Manual boilerplate | `isLoading`, `error`, `isFetching` |
| Pagination / infinite scroll | Complex | `useInfiniteQuery` |
| Optimistic updates | Very complex | Built-in via `onMutate` |
| Cache invalidation | N/A | `invalidateQueries` |
| Devtools | N/A | React Query Devtools |

**Setup:**

```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,     // 1 minute
      retry: 2,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}
```

**React Query manages server state** (remote, async, owned by the server). It is complementary to — not a replacement for — `useState`/`useReducer` for client state (UI state, form state).
