/**
 * Q14. Avoiding expensive re-renders with proper reconciliation understanding
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HOW REACT RECONCILIATION WORKS
 * ─────────────────────────────────
 * When state/props change, React:
 *   1. Calls your component function (re-render)
 *   2. Produces a new virtual DOM tree
 *   3. DIFFS the new tree against the previous one (reconciliation)
 *   4. Applies only the changed nodes to the real DOM (commit phase)
 *
 * Re-renders ≠ DOM updates. Re-renders run JS; actual DOM work only
 * happens if the diff found changes. But unnecessary JS re-renders still
 * consume CPU time, especially for large component trees.
 *
 * ROOT CAUSE OF UNNECESSARY RE-RENDERS
 * ──────────────────────────────────────
 *  1. New object/array/function references on every render (referential equality)
 *  2. Context value changes triggering all consumers
 *  3. State too high in the tree
 *  4. Missing memo() on expensive components
 */

import { useState, useMemo, useCallback, memo, createContext, useContext } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM 1: Inline objects/arrays as props (new reference every render)
// ─────────────────────────────────────────────────────────────────────────────

const Child = memo(({ style }) => <div style={style}>Child</div>);

// ❌ BAD — new style object on every parent render → Child always re-renders
function ParentBad() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount((c) => c + 1)}>{count}</button>
      <Child style={{ color: "red" }} />  {/* ← new object every render */}
    </>
  );
}

// ✅ GOOD — stable reference
const STYLE = { color: "red" }; // defined outside component

function ParentGood() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount((c) => c + 1)}>{count}</button>
      <Child style={STYLE} />  {/* ← same reference always */}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM 2: Inline functions (new reference every render)
// ─────────────────────────────────────────────────────────────────────────────

const Button = memo(({ onClick, label }) => {
  console.log("Button rendered:", label);
  return <button onClick={onClick}>{label}</button>;
});

// ❌ BAD — new function on every parent render → Button always re-renders
function ToolbarBad({ onSave }) {
  const [title, setTitle] = useState("");
  return (
    <>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <Button onClick={() => onSave(title)} label="Save" />  {/* new fn */}
    </>
  );
}

// ✅ GOOD — stable function with useCallback
function ToolbarGood({ onSave }) {
  const [title, setTitle] = useState("");
  const handleSave = useCallback(() => onSave(title), [onSave, title]);
  return (
    <>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />
      <Button onClick={handleSave} label="Save" />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM 3: Context causing too many re-renders
// ─────────────────────────────────────────────────────────────────────────────

// ❌ BAD — one context with frequently-changing AND stable values
const AppContextBad = createContext(null);

function AppProviderBad({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("light"); // changes rarely
  const [notifications, setNotifications] = useState([]); // changes often

  // Every time notifications change, ALL consumers re-render (even theme consumers)
  return (
    <AppContextBad.Provider value={{ user, theme, notifications, setTheme }}>
      {children}
    </AppContextBad.Provider>
  );
}

// ✅ GOOD — split context by update frequency
const UserContext  = createContext(null);
const ThemeContext = createContext(null);
const NotifContext = createContext(null);

function AppProviderGood({ children }) {
  const [user]          = useState(null);
  const [theme, setTheme] = useState("light");
  const [notifications] = useState([]);

  return (
    <UserContext.Provider value={user}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <NotifContext.Provider value={notifications}>
          {children}
        </NotifContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM 4: State too high causes sibling re-renders
// ─────────────────────────────────────────────────────────────────────────────

// ❌ BAD — search input state at the top re-renders the entire tree
function AppBad() {
  const [search, setSearch] = useState(""); // changing this re-renders ExpensiveList
  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <ExpensiveListComponent /> {/* re-renders on every keystroke! */}
    </div>
  );
}

// ✅ GOOD — colocate state; isolate frequent updaters
function SearchBox({ onSearch }) {
  const [search, setSearch] = useState("");
  return (
    <input
      value={search}
      onChange={(e) => { setSearch(e.target.value); onSearch(e.target.value); }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEM 5: Incorrect keys causing unnecessary unmount/remount
// ─────────────────────────────────────────────────────────────────────────────

// ❌ BAD — using array index as key → React remounts components when order changes
function ListBad({ items }) {
  return items.map((item, i) => <Card key={i} item={item} />);
}

// ✅ GOOD — stable unique ID
function ListGood({ items }) {
  return items.map((item) => <Card key={item.id} item={item} />);
}

// ─────────────────────────────────────────────────────────────────────────────
// USING REACT.MEMO CORRECTLY
// ─────────────────────────────────────────────────────────────────────────────

// memo does a SHALLOW comparison of props by default
const ExpensiveRow = memo(
  function Row({ data, onClick }) {
    console.log("Row render:", data.id);
    return <tr onClick={() => onClick(data.id)}><td>{data.name}</td></tr>;
  },
  // Custom comparison (optional) — return true to SKIP re-render
  (prevProps, nextProps) =>
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.name === nextProps.data.name &&
    prevProps.onClick === nextProps.onClick
);

// ─────────────────────────────────────────────────────────────────────────────
// DETECTING UNNECESSARY RE-RENDERS
// ─────────────────────────────────────────────────────────────────────────────
/*
  Tools:
  1. React DevTools Profiler
     • "Record why each component rendered" option
     • Shows: rendered by, prop changes, hook changes, parent re-render

  2. React DevTools → highlight updates
     • "Highlight updates when components render" setting
     • Blue flash = re-render without DOM change (potential waste)

  3. why-did-you-render (npm)
     • Monkey-patches React to warn about unnecessary re-renders
     • import whyDidYouRender from '@welldone-software/why-did-you-render';
     • Component.whyDidYouRender = true;

  4. Add console.log at the top of components during debugging
*/

/**
 * RECONCILIATION RULES TO KNOW
 * ──────────────────────────────
 *  1. Same element type at same position → reuse DOM node, update props
 *  2. Different element type → unmount old, mount new (destroys state!)
 *  3. Lists with keys → stable keys = stable DOM nodes; changed key = remount
 *  4. React.memo → skip render if props are shallowly equal
 *  5. Context → any value change re-renders ALL consumers in that context
 *
 * QUICK WINS
 * ──────────
 *  [ ] memo() expensive components
 *  [ ] useCallback for handlers passed to memo children
 *  [ ] useMemo for stable object references passed as props
 *  [ ] Split contexts by update frequency
 *  [ ] Colocate state to the lowest component that needs it
 *  [ ] Never use array index as key for reorderable lists
 *  [ ] Define static objects/arrays outside component functions
 */

function ExpensiveListComponent() { return null; }
function Card({ item }) { return null; }
