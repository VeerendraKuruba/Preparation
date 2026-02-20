# React Concepts

These are the areas where senior rounds are won or lost.

## 🗓️ DAY 1: Core Mechanics & Hooks

- [Render phase vs. Commit phase](./render-phase-vs-commit-phase.md)
- [Virtual DOM vs. Real DOM (The correct mental model)](./virtual-dom-vs-real-dom.md) ✅
- [Fiber Reconciliation: Step-by-step flow](./fiber-reconciliation.md) ✅
- [How React schedules priority updates (Lanes)](./react-lanes-priority-updates.md) ✅
- [Rules of Hooks and how they are mapped internally](./rules-of-hooks.md)
- [useState: Functional updates and lazy initialization](./usestate-functional-updates.md)
- [useEffect: Dependency patterns and Object.is comparison](./useeffect-dependency-patterns.md)
- [Effect Cleanups: Preventing memory leaks](./effect-cleanups.md)
- [Stale Closures: How to identify and fix them](./stale-closures.md)
- [Controlled vs. Uncontrolled components](./controlled-vs-uncontrolled-components.md)
- [Lifting State Up vs. Component Composition](./lifting-state-up-vs-composition.md)
- [The 3 consequences of using Index as a Key](./index-as-key-consequences.md)
- [Strict Mode: Why it double-renders in development](./strict-mode-double-render.md)
- [Prop Drilling: When it's okay and when it's technical debt](./prop-drilling.md)
- [Fragments and avoiding "Div Soup"](./fragments.md)

## 🗓️ DAY 2: Performance & Concurrent React

- [How React manages memory (Fiber double buffering)](./fiber-double-buffering.md)
- [Automatic Batching in React 18+](./automatic-batching-react-18.md)
- [The "Atomic Commit" principle](./atomic-commit-principle.md)
- [Memoization: React.memo vs. useMemo vs. useCallback](./memoization-react-memo-usememo-usecallback.md)
- [Why memoization fails: The unstable props trap](./memoization-unstable-props-trap.md)
- [Context API: Performance pitfalls and broadcast updates](./context-api-performance.md)
- [Virtualization vs. Memoization for large lists](./virtualization-vs-memoization.md)
- [Profiling and identifying bottlenecks with React DevTools](./react-devtools-profiling.md)
- [Immutability and referential equality](./immutability-referential-equality.md)
- [Derived State vs. Stored State](./derived-state-vs-stored-state.md)
- [Race Conditions in data fetching](./race-conditions-data-fetching.md)
- [Error Boundaries: Catching render-time failures](./error-boundaries.md)
- [Concurrent Features: useTransition and startTransition](./usetransition-starttransition.md)
- [useDeferredValue vs. Debouncing](./usedeferredvalue-vs-debouncing.md)
- [Suspense: Avoiding jarring UI fallbacks](./suspense.md)

---

**Legend:**
- ✅ = Detailed explanation available
- No marker = Placeholder (content coming soon)
