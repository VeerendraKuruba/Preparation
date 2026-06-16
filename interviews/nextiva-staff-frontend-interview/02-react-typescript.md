# React — Nextiva Staff FE Q&A

---

## Q1: Reconciliation (Fiber) — how does React decide what to update?

**Answer:**
- Each component = Fiber node (linked list, not recursive stack)
- **Render phase** (async): diff old vs new, mark effects
- **Commit phase** (sync): apply DOM mutations, run layout effects, paint

**Diffing rules:**
- Different element type → tear down subtree, rebuild
- Same type → update props in place
- Lists → `key` identifies stable identity (move vs insert/delete)

**Staff follow-up:** Keys should be stable IDs, not array index (reorder bugs).

---

## Q2: When does a component re-render?

1. `useState` / `useReducer` dispatch in this component
2. Parent re-rendered (child runs unless `memo` + stable props)
3. Context value changed (all consumers re-render)
4. `forceUpdate` (legacy) / external store subscription

**Not a re-render trigger:** Props shallow-equal but parent re-rendered — child still re-renders unless memoized.

---

## Q3: `useEffect` vs `useLayoutEffect` vs `useEffectEvent` (React 19)

| Hook | Timing | Use case |
|------|--------|----------|
| `useEffect` | After paint (async) | Data fetch, subscriptions, analytics |
| `useLayoutEffect` | After DOM update, before paint | Measure DOM, sync visual updates (tooltip position) |
| `useEffectEvent` | Stable fn reading latest props/state | Event handlers in effects without dep churn |

**Rule:** Default to `useEffect`. `useLayoutEffect` blocks paint — use sparingly.

---

## Q4: Error Boundaries — what they catch and don't catch

**Catches:** Render errors in children, lifecycle errors in class components

**Does NOT catch:**
- Event handler errors (use try/catch)
- Async errors in `useEffect` (handle in promise)
- SSR errors (separate handling)
- Errors in the boundary itself

```tsx
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportToSentry(error, info.componentStack);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
```

---

## Q5: Controlled vs uncontrolled components

| | Controlled | Uncontrolled |
|---|-----------|--------------|
| Source of truth | React state | DOM |
| Value | `value` + `onChange` | `defaultValue` + `ref` |
| Validation | On every keystroke | On submit |
| Use when | Dynamic validation, instant feedback | Simple forms, file inputs |

**React Hook Form / TanStack Form:** Uncontrolled-by-default for performance — fewer re-renders per keystroke.

---

## Q6: React 18+ Automatic Batching

React 18 batches multiple `setState` calls in:
- Event handlers
- `setTimeout`
- Promises
- Native event handlers

```javascript
// React 18 — one re-render
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);
}, 0);
```

**`flushSync`:** Opt out when you need synchronous DOM read after update.

---

## Q7: Concurrent features — `useTransition` and `useDeferredValue`

```tsx
const [isPending, startTransition] = useTransition();
const [filter, setFilter] = useState('');

function onChange(value: string) {
  setFilter(value); // urgent — input stays responsive
  startTransition(() => {
    setDeferredFilter(value); // non-urgent — list can lag
  });
}
```

**Use case:** Large filtered lists, tab switches, non-critical UI updates.

---

## Q8: React Server Components (awareness for Staff)

- **RSC:** Server-only components — zero client JS bundle cost
- **`'use client'`:** Boundary for interactive components
- **When relevant:** Marketing pages, data-heavy dashboards with minimal interactivity
- **Nextiva context:** Agent desktop is highly interactive — mostly client React; RSC may apply to admin/reporting surfaces

---

## Q9: Custom hooks — design a `useDebouncedValue`

```typescript
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}
```

**Staff extension:** Cancel in-flight fetch when debounced value changes (AbortController).

---

## Q10: Composition patterns — compound components

```tsx
const TabsContext = createContext<{ active: string; setActive: (id: string) => void } | null>(null);

function Tabs({ children, defaultId }: { children: React.ReactNode; defaultId: string }) {
  const [active, setActive] = useState(defaultId);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div role="tablist">{children}</div>
    </TabsContext.Provider>
  );
}

Tabs.Panel = function Panel({ id, children }: { id: string; children: React.ReactNode }) {
  const ctx = useContext(TabsContext);
  if (ctx?.active !== id) return null;
  return <div role="tabpanel">{children}</div>;
};
```

**Design system benefit:** Flexible API without prop explosion.

---

## Q11: State management decision tree (2026)

1. **Server/API data** → TanStack Query
2. **URL state** (filters, pagination) → Router search params
3. **Form state** → TanStack Form / React Hook Form
4. **Local UI** → `useState` / `useReducer`
5. **Shared client state** → Zustand / Jotai (not Context for high-frequency)
6. **Theme/auth/locale** → Context (infrequent updates)

**Avoid:** Redux for server state; Context for every global value.

---

## Q12: `useImperativeHandle` + `forwardRef`

Expose imperative API on child ref (focus, scroll, play):

```tsx
const Input = forwardRef<{ focus: () => void }, InputProps>((props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));
  return <input ref={inputRef} {...props} />;
});
```

**Prefer declarative patterns** unless integrating non-React libs (maps, video players).
