# Redux Deep Dive — Interview Prep

> Master Redux from first principles through Redux Toolkit, async flows, performance, and architecture decisions. Structured for senior/staff frontend interviews where you must explain **why**, not just **how**.

---

## What You'll Be Tested On

| Level | Expectation |
|-------|-------------|
| **Mid** | Data flow, actions/reducers/store, `useSelector`/`useDispatch`, when to use Redux vs local state |
| **Senior** | RTK slices, thunks, selectors/memoization, normalization, middleware chain, DevTools |
| **Staff+** | State taxonomy (server vs UI vs global), RTK Query vs hand-rolled async, saga vs listener middleware, migration strategies, performance at scale |

---

## File Index

| File | Topic |
|------|-------|
| [01-fundamentals-and-data-flow.md](01-fundamentals-and-data-flow.md) | Core concepts, principles, classic Redux, React bindings |
| [02-redux-toolkit.md](02-redux-toolkit.md) | `createSlice`, `configureStore`, Immer, `createAsyncThunk`, RTK Query |
| [03-async-middleware.md](03-async-middleware.md) | Thunk, Saga, Observable, Listener middleware, optimistic updates |
| [04-selectors-and-performance.md](04-selectors-and-performance.md) | Reselect, subscriptions, re-render optimization, batching |
| [05-patterns-normalization.md](05-patterns-normalization.md) | Entity adapters, feature slices, colocation, anti-patterns |
| [06-testing-debugging.md](06-testing-debugging.md) | Unit testing reducers/thunks, DevTools, time-travel, logging |
| [07-redux-vs-alternatives.md](07-redux-vs-alternatives.md) | Context, Zustand, Jotai, React Query, MobX — decision matrix |
| [08-coding-challenges.md](08-coding-challenges.md) | Hands-on problems (implement reducer, thunk, selector, store) |
| [09-study-plan.md](09-study-plan.md) | 2-week structured learning path |
| [10-quick-reference.md](10-quick-reference.md) | Cheat sheet + rapid-fire Q&A table |
| [solutions/01-coding-challenges-solutions.md](solutions/01-coding-challenges-solutions.md) | Solutions for coding challenges |

---

## Repo Cross-References

| Path | Why |
|------|-----|
| [Practice/React/InterviewCartContext/](../../Practice/React/InterviewCartContext/) | Classic `useReducer` cart — Redux mental model precursor |
| [react_new/20-undo-redo-system.jsx](../../react_new/20-undo-redo-system.jsx) | Undo/redo pattern (Redux excels here) |
| [postman 02-react-state.md](../postman-senior-frontend-interview/02-react-state.md) | Redux + MobX in production context |
| [system-design/.../36-state-management-at-scale.md](../../system-design/frontend/scalability-architecture/36-state-management-at-scale.md) | When Redux is the wrong tool |

---

## Pre-Study Checklist

- [ ] Can draw the Redux data flow on a whiteboard in 60 seconds
- [ ] Can implement a cart reducer without looking at notes
- [ ] Can explain why reducers must be pure and what breaks if they aren't
- [ ] Know the difference between `createAsyncThunk` pending/fulfilled/rejected and how `extraReducers` handles them
- [ ] Can write a memoized selector with `createSelector`
- [ ] Can articulate when **not** to use Redux (server state → React Query; local UI → `useState`)
