# 18. Prevent unnecessary React re-renders

## Common causes

- **Unstable props** — new function/object/array literals each render passed to memoized children.
- **Context value** changing every render (`value={{ ... }}` without `useMemo`).
- **State too high** — parent state updates rerender large subtrees.

## Fixes (know when each applies)

1. **`React.memo`** on pure leaf/presentational components + stable props.
2. **`useCallback` / `useMemo`** for referential stability _when profiling shows benefit_ — not by default everywhere.
3. **Split context** — separate “often changing” vs “rare” stores; or use external stores (Zustand, Jotai) with selective subscriptions.
4. **Move state down** — colocate state in the subtree that needs it.
5. **Selectors** — avoid passing whole Redux/Context objects; subscribe to slices.

## Anti-patterns to mention

Blind `useCallback` on every handler without measurement; over-contextualizing everything.

## Sound bite

“I’d **profile** with React Profiler, fix **prop churn** and **context splitting** first; `memo` on hot rows second.”
