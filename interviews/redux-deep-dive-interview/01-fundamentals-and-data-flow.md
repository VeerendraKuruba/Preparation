# Redux Fundamentals & Data Flow

> Start here. Every advanced topic builds on these three principles: **single source of truth**, **state is read-only**, **changes via pure functions**.

---

## 1. The Redux Data Flow

**Q: Explain the Redux data flow end-to-end.**

**Verbal answer:**
> "Redux enforces unidirectional data flow. The store holds the entire application state as one immutable tree. UI components never mutate state directly — they dispatch actions, which are plain objects describing *what happened* (with a required `type` field). Reducers are pure functions: `(state, action) => newState`. They compute the next state without side effects. The store applies the reducer, notifies subscribers, and React components re-render via `useSelector`.
>
> The constraint buys you predictability: every state change is traceable to an action, you can log/replay/time-travel in DevTools, and testing reducers is trivial because they're pure functions."

```
┌──────────┐  dispatch(action)   ┌─────────┐   subscribe    ┌─────────────┐
│  React   │ ──────────────────► │  Store  │ ──────────────► │  React UI   │
│ Component│                   │         │                 │ (re-render) │
└──────────┘                   └────┬────┘                 └─────────────┘
                                    │
                                    ▼
                              ┌───────────┐
                              │  Reducer  │  (pure function)
                              │ state +   │
                              │ action →  │
                              │ newState  │
                              └───────────┘
```

---

## 2. The Three Principles

**Q: What are Redux's three core principles?**

| Principle | Meaning | Interview nuance |
|-----------|---------|------------------|
| **Single source of truth** | One store, one state tree | Doesn't mean one reducer — combine many slice reducers into one tree |
| **State is read-only** | Only way to change state is `dispatch(action)` | Prevents hidden mutations; enables logging and replay |
| **Changes via pure reducers** | `(prevState, action) => nextState`, no side effects | Side effects belong in middleware/thunks, not reducers |

**Q: Why must reducers be pure? What happens if they aren't?**

**Verbal answer:**
> "Pure reducers guarantee determinism: same input always produces same output. If you fetch inside a reducer, or call `Date.now()`, or mutate arguments, you break time-travel debugging, make tests flaky, and cause subtle bugs when React Strict Mode or middleware replays actions. Side effects go in thunks, sagas, or listener middleware — reducers only compute the next state snapshot."

---

## 3. Actions & Action Creators

**Q: What is an action? What is an action creator?**

```javascript
// Action — plain object (Flux Standard Action style)
const action = {
  type: 'todos/add',
  payload: { id: '1', text: 'Learn Redux' },
};

// Action creator — function that returns an action
function addTodo(text) {
  return { type: 'todos/add', payload: { id: crypto.randomUUID(), text } };
}

// Usage
store.dispatch(addTodo('Learn Redux'));
```

**Q: What is the Flux Standard Action (FSA) convention?**

> "FSA recommends actions have `type` (string), optional `payload` (the data), and optional `error` (boolean). Keeps action shape consistent and makes reducers easier to write. Redux Toolkit's `createSlice` generates FSAs automatically."

---

## 4. Classic Redux Setup (Know This Before RTK)

**Q: Walk through creating a store without Redux Toolkit.**

```javascript
import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

// --- Reducer (must be pure) ---
const initialState = { count: 0 };

function counterReducer(state = initialState, action) {
  switch (action.type) {
    case 'counter/increment':
      return { ...state, count: state.count + 1 };
    case 'counter/decrement':
      return { ...state, count: state.count - 1 };
    case 'counter/add':
      return { ...state, count: state.count + action.payload };
    default:
      return state; // always return current state for unknown actions
  }
}

// --- Root reducer ---
const rootReducer = combineReducers({
  counter: counterReducer,
  // todos: todosReducer,
  // auth: authReducer,
});

// --- Store ---
const store = createStore(
  rootReducer,
  applyMiddleware(thunk) // enables dispatch(function)
);

// --- Subscribe (non-React) ---
store.subscribe(() => console.log(store.getState()));

store.dispatch({ type: 'counter/increment' });
```

**Q: What does `combineReducers` do?**

> "It takes an object of slice reducers and returns one root reducer. Each slice reducer only receives its slice of state and only runs when its slice is relevant. The root state shape mirrors the keys you pass in: `{ counter: { count: 0 }, todos: { ... } }`."

---

## 5. React-Redux Bindings

**Q: How do React components connect to Redux?**

```jsx
import { Provider, useSelector, useDispatch } from 'react-redux';

// 1. Wrap app once
function App() {
  return (
    <Provider store={store}>
      <Counter />
    </Provider>
  );
}

// 2. Read state with useSelector
function Counter() {
  const count = useSelector((state) => state.counter.count);
  const dispatch = useDispatch();

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => dispatch({ type: 'counter/increment' })}>+</button>
    </div>
  );
}
```

**Q: What is the difference between `connect()` (legacy) and hooks?**

| Aspect | `connect(mapState, mapDispatch)` | `useSelector` / `useDispatch` |
|--------|----------------------------------|-------------------------------|
| API style | HOC wrapping component | Hooks inside function component |
| Re-render control | `mapState` return shape matters | `useSelector` uses `===` by default |
| Status | Legacy but still in codebase | Modern default since React 16.8+ |
| Testing | Need Provider + possibly mock store | Same — wrap in `<Provider>` |

**Q: How does `useSelector` decide to re-render?**

> "After each dispatch, `useSelector` runs your selector against the new state. If the returned value is **not strictly equal** (`===`) to the previous result, the component re-renders. This is why selecting `state.todos` (new object reference every time if reducer spreads) vs a primitive `state.todos.length` matters. Use memoized selectors (`createSelector`) when deriving data."

---

## 6. Immutability in Practice

**Q: Why immutability? How do you update nested state?**

```javascript
// WRONG — mutates state (breaks Redux, breaks React)
function badReducer(state, action) {
  state.user.name = action.payload; // mutation!
  return state;
}

// RIGHT — shallow copy at each level you change
function goodReducer(state, action) {
  return {
    ...state,
    user: {
      ...state.user,
      name: action.payload,
    },
  };
}

// Array updates
// Add:    [...state.items, newItem]
// Remove: state.items.filter(i => i.id !== id)
// Update: state.items.map(i => i.id === id ? { ...i, ...patch } : i)
```

**Follow-up:** "RTK uses Immer internally so you can write 'mutating' syntax in reducers — it still produces immutable updates under the hood."

---

## 7. Redux vs useReducer

**Q: When is `useReducer` enough vs full Redux?**

| Factor | `useReducer` + Context | Redux |
|--------|------------------------|-------|
| Scope | Subtree / feature | App-wide |
| DevTools | No built-in time-travel | Full action log + time-travel |
| Middleware | None | Thunks, sagas, listeners |
| Performance | Context re-renders all consumers | Fine-grained subscriptions per selector |
| Boilerplate | Low | Higher (RTK reduces this) |

> "Use `useReducer` for complex local state (wizard forms, modals with multiple fields). Reach for Redux when multiple distant components share state, you need middleware for async, or you want DevTools and predictable action logs."

---

## 8. Common Fundamentals Questions

**Q: Can you have multiple stores?**
> "Redux is designed for one store. Multiple stores defeat the purpose (single source of truth). Use multiple slice reducers inside one store instead."

**Q: Where do API calls go?**
> "Not in reducers. Use middleware: `createAsyncThunk` (RTK), custom thunks, sagas, or RTK Query for server cache."

**Q: What is `store.getState()` vs `useSelector`?**
> "`getState()` is imperative — read once, used in thunks/middleware. `useSelector` is declarative — subscribes to changes and triggers re-renders."

**Q: What happens if a reducer returns `undefined`?**
> "Redux throws an error. Always return state (including `default` case returning current state). On first call, return `initialState` if state is `undefined`."

---

## Quick-Fire

| Question | One-line answer |
|----------|-----------------|
| Action vs reducer? | Action describes event; reducer computes new state |
| Why `default` case in switch? | Return current state — other reducers may handle this action |
| `dispatch` synchronous? | Yes — reducer runs sync; async is layered via middleware |
| Store enhancers? | Wrap `createStore` to add capabilities (DevTools, middleware) |
| What is middleware? | `store => next => action =>` chain; intercepts every dispatch |
