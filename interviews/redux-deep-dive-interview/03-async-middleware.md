# Async Flows & Middleware

> Side effects live **outside** reducers. Middleware is the extension point — know thunk deeply, saga/listener at senior level.

---

## 1. Middleware Chain

**Q: How does Redux middleware work?**

**Verbal answer:**
> "Middleware is a chain of functions with signature `(store) => (next) => (action) =>`. Each middleware can inspect, transform, delay, or swallow actions before they reach the reducer. `applyMiddleware(thunk, logger)` composes them. The chain is like Express middleware — `next(action)` passes to the next link; if you don't call `next`, the action never hits the reducer."

```javascript
const logger = (store) => (next) => (action) => {
  console.log('dispatching', action);
  const result = next(action);
  console.log('next state', store.getState());
  return result;
};

// Order matters: thunk before logger means logger sees thunk functions too
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(logger),
});
```

---

## 2. Redux Thunk

**Q: What is a thunk? How does `redux-thunk` enable async?**

> "A thunk is a function returned from an action creator. Instead of dispatching `{ type: '...' }`, you dispatch `(dispatch, getState) => { ... }`. The thunk middleware detects functions, calls them with `dispatch` and `getState`, and doesn't pass them to reducers. Inside the thunk you can await fetch, dispatch multiple actions, read current state, or dispatch other thunks."

```javascript
// Manual thunk (pre-RTK style)
function fetchTodos() {
  return async (dispatch, getState) => {
    dispatch({ type: 'todos/loading' });

    try {
      const res = await fetch('/api/todos');
      const data = await res.json();
      dispatch({ type: 'todos/loaded', payload: data });
    } catch (err) {
      dispatch({ type: 'todos/error', payload: err.message });
    }
  };
}

// RTK equivalent — prefer this
export const fetchTodos = createAsyncThunk('todos/fetch', async () => {
  const res = await fetch('/api/todos');
  return res.json();
});
```

**Q: What is `getState()` used for in thunks?**

```javascript
export const checkout = () => async (dispatch, getState) => {
  const { cart } = getState();
  if (cart.items.length === 0) return;

  dispatch(checkoutStarted());
  try {
    await api.checkout(cart.items);
    dispatch(checkoutSucceeded());
    dispatch(clearCart());
  } catch (e) {
    dispatch(checkoutFailed(e.message));
  }
};
```

---

## 3. Optimistic Updates

**Q: Implement optimistic update with rollback on failure.**

```javascript
export const updateTodo = createAsyncThunk(
  'todos/update',
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      return await api.patchTodo(id, changes);
    } catch (err) {
      return rejectWithValue({ id, message: err.message });
    }
  }
);

const todosSlice = createSlice({
  name: 'todos',
  initialState: { items: {}, optimisticSnapshots: {} },
  reducers: {
    optimisticUpdate(state, action) {
      const { id, changes } = action.payload;
      state.optimisticSnapshots[id] = state.items[id];
      state.items[id] = { ...state.items[id], ...changes };
    },
    revertOptimistic(state, action) {
      const id = action.payload;
      if (state.optimisticSnapshots[id]) {
        state.items[id] = state.optimisticSnapshots[id];
        delete state.optimisticSnapshots[id];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateTodo.fulfilled, (state, action) => {
        state.items[action.payload.id] = action.payload;
        delete state.optimisticSnapshots[action.payload.id];
      })
      .addCase(updateTodo.rejected, (state, action) => {
        const id = action.meta.arg.id;
        // revert handled by listening to rejected + revertOptimistic
      });
  },
});

// Component
dispatch(optimisticUpdate({ id, changes }));
dispatch(updateTodo({ id, changes }))
  .unwrap()
  .catch(() => dispatch(revertOptimistic(id)));
```

**RTK Query optimistic pattern:** use `onQueryStarted` + `updateQueryData` + `undo` on error — cleaner for API-driven UIs.

---

## 4. Redux Saga

**Q: When would you choose Saga over Thunk?**

| Factor | Thunk | Saga |
|--------|-------|------|
| Model | Functions + async/await | Generator functions + effects |
| Cancellation | Manual `AbortController` | Built-in (`takeLatest`, `race`) |
| Complex orchestration | Gets nested fast | Declarative (`fork`, `join`, `debounce`) |
| Testability | Mock dispatch/fetch | Pure iterator step testing |
| Learning curve | Low | High |
| Modern usage | Default (RTK) | Legacy enterprise codebases |

```javascript
import { call, put, takeLatest, delay, cancelled } from 'redux-saga/effects';

function* searchSaga(action) {
  const { query } = action.payload;
  yield delay(300); // debounce

  try {
    const results = yield call(api.search, query);
    yield put(searchSucceeded(results));
  } catch (err) {
    yield put(searchFailed(err.message));
  } finally {
    if (yield cancelled()) {
      // cleanup if takeLatest cancelled this task
    }
  }
}

function* watchSearch() {
  yield takeLatest('search/requested', searchSaga);
}
```

**Q: What does `takeLatest` do?**
> "If a new `search/requested` arrives while the previous saga is still running, the previous task is cancelled. Perfect for autocomplete — only the latest query matters."

**Q: Saga vs Listener Middleware (RTK)?**
> "Listener middleware (RTK 1.8+) covers many saga use cases with less boilerplate: `effect: async (action, listenerApi) => { ... }` with `take`, `condition`, `cancelActiveListeners`. Prefer listeners for new RTK code unless you need advanced saga orchestration already in the codebase."

---

## 5. Listener Middleware (Modern RTK)

```javascript
import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { fetchUser, userLoggedIn } from './authSlice';

const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  matcher: isAnyOf(userLoggedIn),
  effect: async (action, { dispatch }) => {
    await dispatch(fetchUser(action.payload.userId));
  },
});

// Debounced search
listenerMiddleware.startListening({
  actionCreator: searchQueryChanged,
  effect: async (action, listenerApi) => {
    await listenerApi.delay(300);
    if (searchQueryChanged.match(listenerApi.getOriginalState().lastAction)) {
      listenerApi.dispatch(executeSearch(action.payload));
    }
  },
});

// Add to store
middleware: (gDM) => gDM().prepend(listenerMiddleware.middleware),
```

---

## 6. Error Handling Patterns

**Q: How do you handle global API errors in Redux?**

```javascript
// Option 1: Rejected thunk meta + global listener
listenerMiddleware.startListening({
  predicate: (action) => action.type.endsWith('/rejected'),
  effect: (action, { dispatch }) => {
    dispatch(showToast({ type: 'error', message: action.payload ?? 'Something went wrong' }));
  },
});

// Option 2: Error slice
const errorsSlice = createSlice({
  name: 'errors',
  initialState: { queue: [] },
  reducers: {
    errorPushed(state, action) {
      state.queue.push(action.payload);
    },
    errorDismissed(state, action) {
      state.queue = state.queue.filter((e) => e.id !== action.payload);
    },
  },
});
```

---

## 7. Cancellation & Race Conditions

**Q: User navigates away mid-fetch — how do you cancel?**

```javascript
// createAsyncThunk passes AbortSignal
export const fetchPage = createAsyncThunk(
  'page/fetch',
  async (pageId, { signal }) => {
    const res = await fetch(`/api/pages/${pageId}`, { signal });
    return res.json();
  }
);

// Component cleanup
useEffect(() => {
  const promise = dispatch(fetchPage(id));
  return () => promise.abort();
}, [id, dispatch]);
```

**Q: Duplicate fetch on rapid clicks?**
> "Use `condition` in `createAsyncThunk` to skip if already loading, or `takeLatest` in saga/listener to cancel stale requests."

---

## 8. Middleware Interview Questions

**Q: Can middleware dispatch actions?**
> "Yes — `dispatch` is available. Risk: infinite loops if middleware dispatches actions that re-trigger itself. Guard with action type checks."

**Q: Order of middleware?**
> "Thunk must run before reducers. Logger after thunk logs resolved actions. RTK Query middleware must be included for cache invalidation."

**Q: Custom middleware example — analytics?**
```javascript
const analytics = (store) => (next) => (action) => {
  if (action.type.startsWith('checkout/')) {
    trackEvent(action.type, action.payload);
  }
  return next(action);
};
```

---

## Quick-Fire

| Question | Answer |
|----------|--------|
| Reducer vs middleware for fetch? | Middleware/thunk — reducer only sync state transitions |
| `dispatch` return value with thunk? | Returns promise for `createAsyncThunk` (with `.unwrap()`) |
| redux-observable? | RxJS epics — niche; saga/thunk/listener cover most cases |
| `batch()` from react-redux? | Multiple dispatches → one React re-render |
