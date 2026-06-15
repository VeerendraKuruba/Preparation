# Testing & Debugging Redux

---

## 1. Testing Reducers

**Q: How do you test a reducer?**

> "Reducers are pure functions — easiest thing to test. Call with `(initialState, action)`, assert return value. No mocks needed."

```javascript
import todosReducer, { add, toggle } from './todosSlice';

describe('todosReducer', () => {
  it('adds a todo', () => {
    const state = todosReducer(undefined, add('Buy milk'));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].text).toBe('Buy milk');
    expect(state.items[0].done).toBe(false);
  });

  it('toggles done', () => {
    const initial = todosReducer(undefined, add('Task'));
    const id = initial.items[0].id;
    const next = todosReducer(initial, toggle(id));
    expect(next.items[0].done).toBe(true);
  });

  it('does not mutate previous state', () => {
    const initial = todosReducer(undefined, add('Task'));
    const snapshot = initial.items;
    todosReducer(initial, add('Another'));
    expect(snapshot).toHaveLength(1); // unchanged reference
  });
});
```

---

## 2. Testing Selectors

```javascript
import { selectActiveTodos, selectActiveTodoCount } from './todosSelectors';

const mockState = {
  todos: {
    items: [
      { id: '1', text: 'a', done: false },
      { id: '2', text: 'b', done: true },
    ],
    filter: 'all',
  },
};

describe('selectors', () => {
  it('selectActiveTodos filters done', () => {
    expect(selectActiveTodos(mockState)).toHaveLength(1);
    expect(selectActiveTodos(mockState)[0].id).toBe('1');
  });

  it('memoizes — same reference on second call', () => {
    const a = selectActiveTodos(mockState);
    const b = selectActiveTodos(mockState);
    expect(a).toBe(b);
  });
});
```

---

## 3. Testing Thunks & Async

```javascript
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { fetchTodos } from './todosThunks';

const mockStore = configureMockStore([thunk]);

describe('fetchTodos', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('dispatches fulfilled on success', async () => {
    const todos = [{ id: '1', text: 'x' }];
    fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(todos) });

    const store = mockStore({});
    await store.dispatch(fetchTodos());

    const actions = store.getActions();
    expect(actions[0].type).toBe(fetchTodos.pending.type);
    expect(actions[1].type).toBe(fetchTodos.fulfilled.type);
    expect(actions[1].payload).toEqual(todos);
  });
});
```

**RTK approach — test reducer + thunk separately; integration test with real store:**

```javascript
import { configureStore } from '@reduxjs/toolkit';
import todosReducer, { fetchTodos } from './todosSlice';

it('integration: fetch updates state', async () => {
  fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve([{ id: '1' }]) });

  const store = configureStore({ reducer: { todos: todosReducer } });
  await store.dispatch(fetchTodos());

  expect(store.getState().todos.status).toBe('idle');
  expect(store.getState().todos.items).toHaveLength(1);
});
```

---

## 4. Testing Connected Components

```javascript
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Counter from './Counter';
import counterReducer from './counterSlice';

function renderWithStore(preloadedState) {
  const store = configureStore({
    reducer: { counter: counterReducer },
    preloadedState,
  });
  return render(
    <Provider store={store}>
      <Counter />
    </Provider>
  );
}

it('shows count from store', () => {
  renderWithStore({ counter: { count: 5 } });
  expect(screen.getByText('5')).toBeInTheDocument();
});
```

**Q: Mock store vs real store in tests?**
> "Real store + slice reducers for integration tests. Mock store only when testing thunk dispatch sequences in isolation without reducer side effects."

---

## 5. Redux DevTools

**Q: What can you do with Redux DevTools?**

- **Action log** — every dispatch with payload and timestamp
- **State diff** — what changed per action
- **Time travel** — jump to any prior state; replay actions
- **Action filtering** — hide noisy actions
- **Dispatch manually** — test reducers from DevTools UI
- **Trace** — see stack trace of what dispatched action (with config)

```javascript
configureStore({
  reducer: rootReducer,
  devTools: {
    name: 'My App',
    trace: true,
    traceLimit: 25,
  },
});
```

**Q: Time travel — how does it work?**
> "DevTools records every action and resulting state snapshot (or recomputes from initial + actions). Jumping back replays actions up to that point or restores snapshot. Requires pure reducers — impure reducers break replay."

---

## 6. Debugging Production Issues

| Symptom | Likely cause | Debug step |
|---------|--------------|------------|
| State not updating | Mutation without new reference | Immer / spread audit |
| Too many re-renders | Selector returns new object | `createSelector` |
| Stale UI | Wrong selector deps | Log selector I/O |
| Infinite loop | Middleware dispatches self | Action type guard |
| Hydration mismatch | SSR `preloadedState` differs | Compare server/client state |

**Sentry + Redux:** attach last N actions to error reports via middleware.

```javascript
const sentryMiddleware = (store) => (next) => (action) => {
  Sentry.addBreadcrumb({
    category: 'redux',
    message: action.type,
    data: action.payload,
  });
  return next(action);
};
```

---

## 7. Testing Interview Questions

**Q: Do you test action creators?**
> "With `createSlice`, action creators are trivial — skip. Test reducer response to those actions instead."

**Q: How test `createAsyncThunk` `condition`?**
> "Dispatch with mock `getState` returning loading true — assert no pending action dispatched."

**Q: Snapshot testing Redux state?**
> "Avoid for entire store — brittle. Snapshot specific reducer outputs for regression on complex state shapes if needed."

---

## Quick-Fire

| Question | Answer |
|----------|--------|
| Test private reducers? | Export for tests or test via public actions only |
| `redux-mock-store` limitation? | Doesn't run reducers — only records actions |
| RTK Query testing? | Mock baseQuery; use `setupApiStore` helper from RTK docs |
