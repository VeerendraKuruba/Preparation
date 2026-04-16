/**
 * Q13. useMemo and useCallback — when they help and when they hurt
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHAT THEY DO
 * ─────────────
 *  useMemo(fn, deps)
 *    → Memoizes the RETURN VALUE of fn.
 *    → Re-computes only when deps change.
 *    → Use for: expensive calculations, derived data, stable object references.
 *
 *  useCallback(fn, deps)
 *    → Memoizes the FUNCTION REFERENCE itself.
 *    → Returns the same function object between renders.
 *    → Equivalent to: useMemo(() => fn, deps)
 *    → Use for: callback props passed to memoized children, event handlers
 *               used as useEffect dependencies.
 *
 * THE COST OF MEMOIZATION (often overlooked)
 * ───────────────────────────────────────────
 *  Every useMemo/useCallback:
 *    1. Allocates memory for the cached value
 *    2. Runs a dependency comparison on every render
 *    3. Stores the previous deps array
 *
 *  Memoization is NOT free. It can HURT performance if:
 *    • The computation it memoizes is trivially fast
 *    • The deps change on every render anyway (no cache hit)
 *    • The component renders rarely
 */

import { useMemo, useCallback, memo, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// WHEN useMemo HELPS ✅
// ─────────────────────────────────────────────────────────────────────────────

// 1. Expensive computation that runs on every render
function ProductList({ products, minPrice, category }) {
  // ✅ Filtering 10,000 items is expensive — memoize it
  const filtered = useMemo(
    () =>
      products
        .filter((p) => p.price >= minPrice && p.category === category)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [products, minPrice, category]
  );
  return <ul>{filtered.map((p) => <li key={p.id}>{p.name}</li>)}</ul>;
}

// 2. Stable object reference to prevent child re-renders
function ParentComponent({ userId }) {
  // ✅ Without useMemo, a new object is created on every render,
  // causing <ExpensiveChild> to re-render even if values didn't change
  const config = useMemo(
    () => ({ userId, endpoint: "/api/profile", retry: 3 }),
    [userId]
  );
  return <ExpensiveChild config={config} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// WHEN useMemo HURTS / IS USELESS ❌
// ─────────────────────────────────────────────────────────────────────────────

// ❌ Trivial computation — memoization overhead > computation cost
function BadMemo({ count }) {
  const doubled = useMemo(() => count * 2, [count]); // 1 microsecond operation
  // Overhead of useMemo >> cost of count * 2
  return <span>{doubled}</span>;
}

// ✅ Just compute it
function GoodCompute({ count }) {
  const doubled = count * 2; // fast, no overhead
  return <span>{doubled}</span>;
}

// ❌ New deps every render (cache never hits)
function BadDepsObject({ data }) {
  // `options` is a new object on every render → cache NEVER hits
  const result = useMemo(() => compute(data), [data, { page: 1 }]);
  //                                                   ^^^^^^^^^^
  //                                                   always a new reference!
}

// ─────────────────────────────────────────────────────────────────────────────
// WHEN useCallback HELPS ✅
// ─────────────────────────────────────────────────────────────────────────────

// 1. Callback passed to memo-wrapped children
const Button = memo(({ onClick, children }) => (
  <button onClick={onClick}>{children}</button>
));

function Form({ userId }) {
  const [count, setCount] = useState(0);

  // ✅ Without useCallback, <Button> gets a new function every render
  // and re-renders even when userId didn't change
  const handleSubmit = useCallback(() => {
    submitForm(userId);
  }, [userId]);

  return (
    <div>
      <span>{count}</span>
      <button onClick={() => setCount((c) => c + 1)}>+</button>
      <Button onClick={handleSubmit}>Submit</Button>
    </div>
  );
}

// 2. Callback used as useEffect dependency
function DataFetcher({ userId }) {
  // ✅ Without useCallback, fetchUser is a new function every render
  // → useEffect deps change every render → infinite re-fetch
  const fetchUser = useCallback(async () => {
    const res = await fetch(`/api/users/${userId}`);
    return res.json();
  }, [userId]);

  // useEffect stable because fetchUser is stable
  useMemo(() => { fetchUser(); }, [fetchUser]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// WHEN useCallback HURTS ❌
// ─────────────────────────────────────────────────────────────────────────────

// ❌ Child is NOT memo-wrapped — useCallback is useless
function ParentBad() {
  const handleClick = useCallback(() => console.log("click"), []); // overhead, no benefit
  return <div onClick={handleClick}>click</div>; // <div> is not memo-wrapped
}

// ❌ Inline handlers that are simple don't need useCallback
function ToggleBad({ onToggle }) {
  const handleClick = useCallback(() => onToggle(), [onToggle]); // pointless wrapping
  return <button onClick={handleClick}>Toggle</button>;
  // ✅ Just: <button onClick={onToggle}>Toggle</button>
}

// ─────────────────────────────────────────────────────────────────────────────
// THE MEMO TRIO: must use all three together
// ─────────────────────────────────────────────────────────────────────────────

// Pattern: memo + useMemo + useCallback must work together for optimization
const ExpensiveList = memo(({ items, onItemClick }) => {
  console.log("ExpensiveList render");
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} onClick={() => onItemClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});

function AppWithMemo({ rawData, filter }) {
  // ✅ items is memoized → stable reference between renders
  const items = useMemo(
    () => rawData.filter((d) => d.type === filter),
    [rawData, filter]
  );

  // ✅ onItemClick is memoized → stable reference
  const handleClick = useCallback((id) => {
    console.log("clicked", id);
  }, []); // no deps — never changes

  // ✅ ExpensiveList won't re-render unless items or handleClick change
  return <ExpensiveList items={items} onItemClick={handleClick} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// DECISION FRAMEWORK
// ─────────────────────────────────────────────────────────────────────────────
/*
  Ask these questions before adding useMemo/useCallback:

  1. Is the computation actually expensive? (> 1ms?)
     → Profile it first with console.time()

  2. Does the component re-render often?
     → If it renders once, memoization has no benefit

  3. For useCallback: is the child memo-wrapped?
     → Without React.memo on the child, useCallback does nothing

  4. Do the deps change often?
     → If deps change every render, cache never hits → pure overhead

  5. Have you measured a performance problem?
     → Don't add memoization speculatively; React is already fast

  Rule: "Premature memoization is the root of all... slower code."
  Measure first → memoize only when you have evidence of a problem.
*/

/**
 * QUICK REFERENCE
 * ────────────────
 *  ✅ Use useMemo when:
 *     • Computation takes >1ms (filter/sort large arrays, complex math)
 *     • Creating stable object/array references for memo children
 *
 *  ✅ Use useCallback when:
 *     • Passing handlers to React.memo-wrapped children
 *     • Using the function as a useEffect dependency
 *
 *  ❌ Skip them when:
 *     • Component rarely re-renders
 *     • Child is not React.memo-wrapped
 *     • Computation is trivial
 *     • Deps are new objects/arrays (from props) that change every render
 */

function compute(data) { return data; }
function submitForm(userId) {}
function ExpensiveChild({ config }) { return null; }
