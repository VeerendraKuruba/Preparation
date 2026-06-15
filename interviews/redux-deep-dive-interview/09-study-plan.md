# 2-Week Redux Deep Dive Study Plan

> **Assumption:** 1.5–2 hours/day. Adjust pace if you already know React state basics.

---

## Week 1 — Foundations → RTK → Async

| Day | Focus | Actions |
|-----|-------|---------|
| **Mon** | Data flow | Read [01-fundamentals](./01-fundamentals-and-data-flow.md); draw flow on paper; implement Challenge 1 (cart) |
| **Tue** | Classic Redux | Challenge 10 (vanilla store); explain `combineReducers` out loud |
| **Wed** | Redux Toolkit | Read [02-redux-toolkit](./02-redux-toolkit.md); Challenge 2 (slice migration) |
| **Thu** | Async thunks | Read [03-async-middleware](./03-async-middleware.md); Challenge 3 + 4 |
| **Fri** | Selectors | Read [04-selectors-and-performance](./04-selectors-and-performance.md); add memoized selectors to cart |
| **Sat** | Patterns | Read [05-patterns-normalization](./05-patterns-normalization.md); Challenge 7 (normalize) |
| **Sun** | Mock interview | 45 min verbal: data flow, RTK, thunk lifecycle; 30 min live code Challenge 2 |

---

## Week 2 — Architecture → Testing → Mastery

| Day | Focus | Actions |
|-----|-------|---------|
| **Mon** | Testing | Read [06-testing-debugging](./06-testing-debugging.md); write tests for cart reducer + thunk |
| **Tue** | Alternatives | Read [07-redux-vs-alternatives](./07-redux-vs-alternatives.md); practice "when NOT Redux" answers |
| **Wed** | Middleware | Challenge 5 (timing) + 8 (localStorage listener) |
| **Thu** | RTK Query | [02-redux-toolkit](./02-redux-toolkit.md) RTK Query section; Challenge 12 |
| **Fri** | Undo / advanced | Challenge 6; read undo pattern in [05-patterns](./05-patterns-normalization.md) |
| **Sat** | Full mock | 60 min: 20 min verbal rapid-fire ([10-quick-reference](./10-quick-reference.md)) + 40 min Challenge 4 + 9 |
| **Sun** | Review + rest | Skim all files; redo one weak challenge cold |

---

## Daily Micro-Habits (10 min)

1. **One verbal question** from [10-quick-reference](./10-quick-reference.md) — answer without notes
2. **One DevTools action** — dispatch in a sandbox app, inspect diff
3. **One anti-pattern** — name it and the fix (e.g. "derived data in store → selector")

---

## Build Projects (Optional, High Value)

| Project | Redux skills practiced |
|---------|------------------------|
| Clone [InterviewCartContext](../../Practice/React/InterviewCartContext/) with RTK | Slice, selectors, Provider |
| Todo + filter + async fetch | `createAsyncThunk`, `extraReducers` |
| Undoable drawing pad | Wrapper reducer, action log |
| Mini e-commerce PLP | Normalization, RTK Query tags |

---

## Interview Week Triage

**3 days before interview:**
- [ ] Can whiteboard data flow in 60s
- [ ] Can implement cart slice in 15 min
- [ ] Can explain thunk pending/fulfilled/rejected
- [ ] Can argue Redux vs React Query with examples
- [ ] Know 2 anti-patterns and fixes

**Night before:**
- Skim [10-quick-reference](./10-quick-reference.md) only — no new topics

---

## Repo Integration

| After completing | Also review |
|------------------|-------------|
| Week 1 | [postman 02-react-state](../postman-senior-frontend-interview/02-react-state.md) Redux sections |
| Week 2 | [36-state-management-at-scale](../../system-design/frontend/scalability-architecture/36-state-management-at-scale.md) |
| Coding challenges | [Practice/React/InterviewCartContext](../../Practice/React/InterviewCartContext/) |

---

## External Resources (Skim, Don't Deep-Dive)

- [Redux Style Guide](https://redux.js.org/style-guide/style-guide) — official best practices
- [Redux Toolkit docs](https://redux-toolkit.js.org/) — `createSlice`, RTK Query
- [React-Redux hooks](https://react-redux.js.org/api/hooks) — `useSelector` equality behavior
