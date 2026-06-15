# Patterns, Normalization & Anti-Patterns

> Senior interviews probe **how you structure a real Redux codebase** and whether you know when Redux hurts more than it helps.

---

## 1. Feature-Based Folder Structure

```
src/
├── app/
│   ├── store.ts              # configureStore, root reducer
│   ├── hooks.ts              # useAppDispatch, useAppSelector
│   └── rootReducer.ts
├── features/
│   ├── auth/
│   │   ├── authSlice.ts
│   │   ├── authSelectors.ts
│   │   ├── authThunks.ts     # if not using createAsyncThunk inline
│   │   └── components/
│   ├── todos/
│   │   ├── todosSlice.ts
│   │   ├── todosSelectors.ts
│   │   └── components/
│   └── cart/
│       └── cartSlice.ts
└── shared/
    ├── api/
    └── components/
```

**Q: Colocate by feature or by type (actions/reducers/selectors folders)?**

> "Feature folders (ducks/RTK style) scale better — everything for 'todos' lives together. Type-based folders force jumping across directories for one change. RTK's `createSlice` already colocates actions + reducer."

---

## 2. State Shape Design

**Q: How do you design the root state tree?**

```typescript
interface RootState {
  auth: {
    user: User | null;
    status: 'idle' | 'loading' | 'authenticated';
  };
  todos: EntityState<Todo, string> & {
    filter: 'all' | 'active' | 'completed';
  };
  ui: {
  modals: { createTodoOpen: boolean };
    sidebarCollapsed: boolean;
  };
  // RTK Query
  api: ReturnType<typeof api.reducer>;
}
```

**Guidelines:**
- **Separate `ui` slice** for transient UI (modals, panels) from domain data
- **Normalize** relational/nested data (users, posts, comments)
- **Don't duplicate** server entities — reference by id or use RTK Query cache
- **Keep slices flat** — avoid deep nesting that's painful to update immutably

---

## 3. Normalization Deep Dive

**Q: When must you normalize? When can you skip it?**

| Normalize | Skip normalization |
|-----------|-------------------|
| Many-to-many (posts + authors) | Single primitive (theme: 'dark') |
| Frequent updates to one item in large list | Small static config |
| Shared entities referenced in multiple places | Ephemeral form wizard (local `useReducer`) |

```javascript
// Denormalized — updating one comment copies entire post tree
{
  posts: [
    { id: 1, title: '...', comments: [{ id: 'c1', text: '...' }, ...] },
  ],
}

// Normalized
{
  posts: { ids: ['1'], entities: { '1': { id: '1', title: '...', commentIds: ['c1'] } } },
  comments: { ids: ['c1'], entities: { 'c1': { id: 'c1', text: '...', postId: '1' } } },
}
```

---

## 4. The "Server State in Redux" Anti-Pattern

**Q: What's wrong with putting all API data in Redux manually?**

**Verbal answer:**
> "You reinvent a cache poorly: loading flags per resource, stale data, manual invalidation after mutations, no background refetch, duplicate requests from sibling mounts, and reducers bloated with CRUD boilerplate. Redux becomes a mirror of the server that's always slightly wrong. Server state belongs in React Query, SWR, or RTK Query. Redux holds **client-owned** global state: auth snapshot, UI preferences, wizard progress, optimistic overlays you control."

---

## 5. Common Anti-Patterns

| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| God slice | One reducer for everything | Split by feature domain |
| Derived data in store | `items` + `activeItems` + `activeCount` duplicated | Derive in selectors |
| Non-serializable state | Class instances, Promises in store | Keep in refs or component state |
| Giant selectors in components | Logic scattered, no memoization | `selectors.ts` with `createSelector` |
| Dispatching in render | Side effect during render | `useEffect` or event handlers |
| Storing functions in Redux | Breaks serialization | Pass via context or closure |
| Over-using Redux | Theme toggle in global store for 2 components | `useState` or Context |

**Q: Should loading/error be per-slice or global?**

> "Per-resource or per-slice for domain operations (`todos.status`). Global toast/banner for user-facing errors via listener middleware. Avoid one global `isLoading` that blocks entire app."

---

## 6. Cross-Slice Communication

**Q: Slice A needs to react to Slice B's action — how?**

```javascript
// Option 1: extraReducers listening to other slice's action
import { userLoggedOut } from '../auth/authSlice';

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(userLoggedOut, () => initialState);
  },
});

// Option 2: Listener middleware (loose coupling)
startListening({
  actionCreator: userLoggedOut,
  effect: (_, { dispatch }) => dispatch(clearCart()),
});

// Option 3: Orchestrate in thunk (explicit flow)
export const logout = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  await api.logout();
  dispatch(userLoggedOut());
  dispatch(clearCart());
});
```

**Avoid:** Importing slice B's reducer into slice A's reducer file — creates tight coupling.

---

## 7. Undo / Redo Pattern

**Q: How does Redux enable undo/redo?**

```javascript
function undoable(reducer, options = {}) {
  const { limit = 10 } = options;

  return (state = { past: [], present: reducer(undefined, { type: '@@INIT' }), future: [] }, action) => {
    const { past, present, future } = state;

    switch (action.type) {
      case 'UNDO': {
        if (past.length === 0) return state;
        const previous = past[past.length - 1];
        return {
          past: past.slice(0, -1),
          present: previous,
          future: [present, ...future],
        };
      }
      case 'REDO': {
        if (future.length === 0) return state;
        const next = future[0];
        return {
          past: [...past, present],
          present: next,
          future: future.slice(1),
        };
      }
      default: {
        const newPresent = reducer(present, action);
        if (present === newPresent) return state;
        return {
          past: [...past, present].slice(-limit),
          present: newPresent,
          future: [],
        };
      }
    }
  };
}

// Wrap feature reducer
const store = configureStore({
  reducer: {
    drawing: undoable(drawingReducer),
  },
});
```

> "Pure reducers + action log = replay history. `redux-undo` package does this; understand the wrapper reducer pattern for interviews."

---

## 8. Migration: Classic Redux → RTK

**Q: How do you migrate a legacy Redux codebase to RTK incrementally?**

1. Add `configureStore` alongside `createStore` — can wrap existing reducers
2. Convert one feature at a time to `createSlice` (replace action constants + switch)
3. Replace `connect` with hooks in touched components
4. Introduce RTK Query for one API domain — run parallel to old thunks, then remove thunks
5. Enable stricter lint rules: no direct mutation outside Immer

---

## 9. Principal-Level Architecture Questions

**Q: Micro-frontends — one Redux store or many?**

> "Prefer **federated isolation**: each MFE owns local state; share via custom events, module federation shared singleton (careful with version skew), or a thin shell store for auth/theme only. One giant shared store across teams creates deployment coupling and naming collisions."

**Q: How do you decide what goes in Redux for a new feature?**

```
Is it server data? ──yes──► React Query / RTK Query
        │
        no
        ▼
Needed by distant components / survives route change? ──no──► useState / useReducer
        │
        yes
        ▼
Needs middleware (async orchestration, analytics)? ──no──► Context / Zustand
        │
        yes
        ▼
                    Redux slice
```

---

## Quick-Fire

| Question | Answer |
|----------|--------|
| Ducks pattern? | Single file: actions + reducer + types (precursor to createSlice) |
| `redux-form` / Formik in Redux? | Legacy — keep form state local or use React Hook Form |
| Duplicate keys in combineReducers? | Last wins — silent bug; use unique slice names |
| Hydrate SSR state? | `preloadedState` in configureStore |
