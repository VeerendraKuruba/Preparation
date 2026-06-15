# Redux Quick Reference & Rapid-Fire Q&A

---

## Data Flow (Memorize)

```
UI → dispatch(action) → middleware → reducer → new state → useSelector → UI
```

---

## Terminology

| Term | Definition |
|------|------------|
| **Store** | Single object holding state tree + `dispatch` + `getState` + `subscribe` |
| **Action** | `{ type: string, payload?: any }` — describes what happened |
| **Reducer** | `(state, action) => newState` — pure, no side effects |
| **Dispatch** | Sends action to store — synchronous entry point |
| **Middleware** | Intercepts actions before reducer |
| **Thunk** | Function dispatched as action for async logic |
| **Selector** | `(state) => slice or derived data` |
| **Slice** | RTK bundle: reducers + actions + name |

---

## RTK Snippets

```javascript
// Slice
const slice = createSlice({ name, initialState, reducers: {}, extraReducers });

// Store
configureStore({ reducer: { [slice.name]: slice.reducer } });

// Async
createAsyncThunk('type', async (arg, { rejectWithValue }) => {});

// Selector
createSelector([inputFns], resultFn);

// Typed hooks
useAppSelector((s) => s.slice.field);
useAppDispatch();
```

---

## Rapid-Fire Q&A

| # | Question | Answer |
|---|----------|--------|
| 1 | Redux vs Context? | Context: all consumers re-render; Redux: per-selector subscription + DevTools |
| 2 | Why immutable? | Predictable diffs, time-travel, `===` change detection |
| 3 | Where do side effects go? | Middleware, thunks, sagas, listeners — not reducers |
| 4 | `createAsyncThunk` types? | pending, fulfilled, rejected |
| 5 | `extraReducers` purpose? | Handle external actions (async lifecycle) |
| 6 | Immer in RTK? | Draft proxy — write mutable syntax, get immutable output |
| 7 | `useSelector` re-render rule? | Selected value not `===` previous |
| 8 | `createSelector` caches? | Last inputs; recompute only when inputs change |
| 9 | Normalize state? | `{ ids: [], entities: { [id]: item } }` — O(1) lookup |
| 10 | `takeLatest`? | Cancel previous saga when same action fires again |
| 11 | Optimistic update? | Update UI first, revert on API failure |
| 12 | `getState()` in thunk? | Read current store without subscribing |
| 13 | Multiple stores? | Anti-pattern — one store, many slice reducers |
| 14 | Reducer returns `undefined`? | Error — always return state |
| 15 | Serializable state? | Required for DevTools, persist, logging |
| 16 | RTK Query vs thunk? | RTK Query: caching CRUD; thunk: custom flows |
| 17 | Server state in Redux? | Prefer React Query / RTK Query over manual fetch reducers |
| 18 | `connect` vs hooks? | Hooks (`useSelector`) — modern default |
| 19 | `batch()`? | Multiple dispatches → one React re-render |
| 20 | Logout reset state? | Root reducer wrapper returns `undefined` to re-init |
| 21 | `condition` in thunk? | Return `false` to skip dispatch (dedupe) |
| 22 | Entity adapter? | CRUD helpers + selectors for normalized data |
| 23 | Listener middleware? | RTK alternative to saga for reactions |
| 24 | `shallowEqual`? | Custom equality for `useSelector` object results |
| 25 | Redux dead? | No — narrower role; RTK + RTK Query kept it relevant |
| 26 | When add Redux? | Global client state + middleware + audit trail needed |
| 27 | Form state in Redux? | Usually local — too much boilerplate |
| 28 | Test reducer? | Pure function test — no mocks |
| 29 | Test thunk? | Mock store + mock fetch, assert action sequence |
| 30 | Time travel? | Replay actions; requires pure reducers |

---

## Verbal 30-Second Pitch

> "Redux is a predictable state container with a single store, read-only state updates via dispatched actions, and pure reducers. Redux Toolkit is the modern standard — `createSlice` with Immer, `configureStore` with thunk and DevTools, and `createAsyncThunk` for async. I use selectors with `createSelector` to avoid unnecessary re-renders, normalize entity data for performance, and keep server state in React Query or RTK Query rather than hand-rolled fetch reducers. I reach for Redux when multiple parts of the app share complex client state and I need middleware, action logging, or consistent team patterns — not for local UI or as a server cache by default."

---

## Whiteboard Checklist

- [ ] Single store box
- [ ] dispatch arrow from UI
- [ ] middleware layer (optional label: thunk)
- [ ] reducer circle (pure)
- [ ] new state back to UI
- [ ] Label: "actions = events, reducers = state transitions"

---

## Common Follow-Up Traps

| Trap | Strong response |
|------|-----------------|
| "Just use Context" | Acknowledge for simple cases; explain re-render + DevTools limits |
| "Redux is boilerplate" | RTK reduced it; compare to value of action log in prod debugging |
| "Put everything in Redux" | State taxonomy — server vs UI vs global client |
| "Saga vs thunk?" | Thunk default; saga for legacy/complex orchestration |
| "Performance issues?" | Selectors, normalization, virtualization — not Redux itself |
