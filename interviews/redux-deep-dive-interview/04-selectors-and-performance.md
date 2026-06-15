# Selectors & Performance

> Redux performance interviews focus on **unnecessary re-renders**, **selector memoization**, and **subscription granularity**.

---

## 1. Why Selectors Matter

**Q: What is a selector and why not read state inline in components?**

**Verbal answer:**
> "A selector is a function `(state) => derivedValue` that encapsulates how to read and compute from the store. Inline `useSelector(state => state.todos.items.filter(...))` creates a new array every render → `useSelector` sees new reference → re-render even when data unchanged. Selectors centralize derivation, enable memoization, and keep components dumb."

```javascript
// Bad — new array reference every time
const activeTodos = useSelector((state) =>
  state.todos.items.filter((t) => !t.done)
);

// Better — memoized selector
const activeTodos = useSelector(selectActiveTodos);
```

---

## 2. createSelector (Reselect)

**Q: How does `createSelector` memoization work?**

> "`createSelector` takes input selectors and a result function. It memoizes the result: if input selector outputs are `===` same as last call, return cached result without re-running the result function. This gives referential stability — components won't re-render if derived data is logically unchanged."

```javascript
import { createSelector } from '@reduxjs/toolkit';

const selectTodos = (state) => state.todos.items;
const selectFilter = (state) => state.todos.filter;

export const selectFilteredTodos = createSelector(
  [selectTodos, selectFilter],
  (todos, filter) => {
    switch (filter) {
      case 'active':
        return todos.filter((t) => !t.done);
      case 'completed':
        return todos.filter((t) => t.done);
      default:
        return todos;
    }
  }
);

export const selectActiveTodoCount = createSelector(
  [selectFilteredTodos],
  (todos) => todos.length
);
```

**Q: Memoization limits?**
> "Default cache size is 1 (last arguments only). For varying arg selectors like `selectTodoById(state, id)`, use `createSelector` with id as second argument or use `createEntityAdapter`'s `selectById`."

```javascript
// Parameterized selector factory
export const makeSelectTodoById = () =>
  createSelector(
    [selectTodos, (_, id) => id],
    (todos, id) => todos.find((t) => t.id === id)
  );

// In component — MUST memoize selector instance
const selectTodoById = useMemo(makeSelectTodoById, []);
const todo = useSelector((state) => selectTodoById(state, todoId));
```

---

## 3. useSelector Re-render Behavior

**Q: When does `useSelector` cause a re-render?**

```javascript
// Re-renders when count changes (primitive — === works)
const count = useSelector((s) => s.counter.count);

// Re-renders when ANY todo field changes (if selectTodos returns same array ref)
const todos = useSelector(selectTodos);

// Re-renders only when THIS todo's data changes (if selectById memoized)
const todo = useSelector((s) => selectTodoById(s, id));

// Custom equality — use sparingly (shallow, deep compare)
const cart = useSelector(selectCart, shallowEqual);
```

**Q: `shallowEqual` from react-redux?**
> "Compares first-level keys with `===`. Useful when selector returns object `{ a, b }` and you want re-render only when `a` or `b` references change."

---

## 4. Structuring State for Performance

**Q: How does normalized state help performance?**

```javascript
// Normalized — update one entity without touching others
{
  todos: {
    ids: ['a', 'b', 'c'],
    entities: {
      a: { id: 'a', text: '...', done: false },
      b: { id: 'b', text: '...', done: true },
    },
  },
}

// List item subscribes to single entity
function TodoItem({ id }) {
  const todo = useSelector((s) => s.todos.entities[id]);
  // Only re-renders when THIS entity changes
}
```

**Anti-pattern:** Storing denormalized nested trees — updating one leaf copies entire tree.

---

## 5. React.memo + Redux

```jsx
const TodoItem = React.memo(function TodoItem({ id }) {
  const todo = useSelector((s) => s.todos.entities[id]);
  const dispatch = useDispatch();

  return (
    <li>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => dispatch(toggle(id))}
      />
      {todo.text}
    </li>
  );
});

// Parent passes only id — memo works because todo subscription is internal
function TodoList() {
  const ids = useSelector((s) => s.todos.ids);
  return (
    <ul>
      {ids.map((id) => <TodoItem key={id} id={id} />)}
    </ul>
  );
}
```

**Q: Why pass `id` not `todo` object as prop?**
> "Passing `todo` from parent means parent re-renders all children when any todo changes. Child with own `useSelector` subscribes granularly."

---

## 6. Batching Updates

**Q: Multiple dispatches — how many re-renders?**

```javascript
import { batch } from 'react-redux';

// Without batch (React 17): potentially 2 re-renders
dispatch(a());
dispatch(b());

// With batch: 1 re-render
batch(() => {
  dispatch(a());
  dispatch(b());
});

// React 18+: automatic batching in promises, setTimeout, native handlers
```

---

## 7. Large Lists & Virtualization

**Q: Redux store has 10,000 items — UI is slow. What do you do?**

> "Redux isn't the bottleneck — React reconciliation is. Keep normalized store; virtualize the list (`react-window`/`react-virtuoso`). Each visible row subscribes to one entity by id. Don't `useSelector(selectAll)` at list root if it returns new array — select `ids` only. Consider pagination/infinite scroll in server state layer."

---

## 8. DevTools & Profiling

**Q: How do you debug unnecessary re-renders in a Redux app?**

1. React DevTools Profiler — which components re-render on dispatch
2. Redux DevTools — action diff, which slice changed
3. `useSelector` logging wrapper in dev
4. Check selector referential equality — log selector output reference

```javascript
// Debug hook (dev only)
function useSelectorWithLog(selector, label) {
  const result = useSelector(selector);
  const ref = useRef();
  if (ref.current !== result) {
    console.log(`[selector ${label}] changed`, ref.current, '→', result);
    ref.current = result;
  }
  return result;
}
```

---

## 9. Performance Interview Questions

**Q: Should the entire API response live in Redux?**
> "Usually no for large server datasets — use React Query/RTK Query with component-level subscriptions. Redux slice holds ids + entities for client-owned selections; server cache handles fetch lifecycle."

**Q: Context vs Redux performance?**
> "Context propagates to all consumers on any value change. Redux `useSelector` subscribes to selector output — finer granularity with correct selectors."

**Q: `reselect` cache miss on mutable state?**
> "If reducer mutates state (bug), input selectors return same reference but content changed — memoization returns stale wrong result. Another reason immutability is non-negotiable."

---

## Quick-Fire

| Question | Answer |
|----------|--------|
| Default `useSelector` equality? | Strict `===` |
| `createSelector` input changed? | Recompute result function |
| Select whole state tree? | Never — `useSelector(s => s)` re-renders on any change |
| RTK Query perf win? | Shared cache, deduped requests, selective hook subscriptions |
