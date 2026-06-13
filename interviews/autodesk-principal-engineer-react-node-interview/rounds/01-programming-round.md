# Round 1 — Programming (React/UI/CSS Heavy + JS Deep Dive)

| | |
|---|---|
| **Format** | CoderPad / shared editor, 1–2 interviewers |
| **Duration** | 60–90 min |
| **Eliminates?** | Yes |
| **Focus** | **React, UI/CSS, component builds** + JavaScript internals + DSA (medium) — frontend depth matters as much as algorithms |

> **Role note:** Round 1 explicitly calls out **UI/CSS & JS Deep Dive**. Treat React and layout as first-class prep, not optional after DSA.

---

## Interview Flow (Frontend-Weighted)

```
0:00–0:20   Resume deep dive — UI projects, design system, perf wins, viewer/dashboard work
0:20–0:45   Live UI build OR DSA (autocomplete, table, seat grid, nested tree UI)
0:45–1:10   JS/React/CSS deep dive — hooks, Fiber, event loop, flex/grid, a11y
1:10–1:20   Your questions
```

> **Autodesk pattern:** Resume time focuses on **frontend decisions** — state placement, component splits, why not a library, perf fixes. Backend mentions should tie back to UI (auth shell, loading states).

---

## Part A — Resume Deep Dive Q&A

### Q1: Walk me through the most complex **frontend** project on your resume. Why that React architecture?

**Answer framework:**
> "I'll use [Project X] — a [dashboard / viewer shell / admin console] serving [N users]. The core **UI** problem was [slow renders / inconsistent UX / unmaintainable components / poor a11y].
>
> **Why React + TypeScript:** Typed props and discriminated unions for [complex forms / viewer toolbar states]. Composition over inheritance — [Layout + Panel + Inspector] pattern instead of god components.
>
> **Key frontend decisions I owned:**
> 1. **State:** [React Query for server state + Zustand for UI chrome] — kept form draft state local to avoid global re-renders.
> 2. **Performance:** Virtualized list for [10k rows]; `React.memo` on row after profiling; route-level code splitting → LCP [before→after].
> 3. **Design system:** Extracted [Button, Modal, DataTable] into shared package; CSS modules / tokens for theming.
> 4. **APS/viewer (if relevant):** Viewer in isolated layout; loading/progress UI while model translates; toolbar as controlled components.
>
> **Node BFF (brief):** Only to proxy OAuth for APS tokens — not where I spent Principal-level depth.
>
> **Outcome:** [LCP, bundle size, bug rate, dev velocity metric]."

**Follow-ups they will ask:**
- What would you do differently?
- Biggest technical mistake?
- How did you handle disagreement on the stack?

---

### Q2: How does the frontend consume backend data — caching, stale UI, real-time?

**Answer (frontend lens):**
| Concern | Frontend approach |
|---------|-------------------|
| **Server state** | React Query / SWR — stale-while-revalidate, dedupe, cache keys per entity |
| **Real-time** | WebSocket hook → patch query cache or optimistic merge |
| **Large lists** | Virtualization + paginated/infinite scroll API |
| **Errors** | Error boundaries per route; toast + retry; skeleton → error → empty states |
| **Auth** | Session via BFF cookie; redirect to login on 401; no tokens in localStorage |

> "I don't need to own Postgres/Kafka — I need to design UI that stays correct when data is stale, loading, or conflicting. That's the Principal frontend bar."

---

## Part B — DSA Coding Q&A (Secondary to UI — Still Prepare)

> If time is short, interviewers may skip DSA for a **longer UI build**. If both appear, nail the component first in practice — that's what this role optimizes for.

### Q1: Valid Parentheses (Stack — reported classic)

**Problem:** Given a string containing `()`, `{}`, `[]`, determine if valid.

**Approach (say aloud):**
> "Closing bracket must match the most recent unmatched opening bracket → stack. O(n) time, O(n) space."

```js
function isValid(s) {
  const pairs = { ')': '(', '}': '{', ']': '[' };
  const stack = [];

  for (const ch of s) {
    if (ch === '(' || ch === '{' || ch === '[') {
      stack.push(ch);
    } else {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}
```

**Follow-up:** Generate all valid combinations of n pairs (Catalan — backtracking).

---

### Q2: Filesystem in Boxes (Reported at Autodesk — iterative → recursive)

**Problem:** Nested structure `{ name, children: [...] }`. Implement:
1. `findByName(root, name)` — return path or node
2. `totalSize(root)` if nodes have `size`
3. Interviewer asks: **rewrite recursively** and discuss trade-offs

**Iterative (BFS):**
```js
function findByName(root, target) {
  const queue = [{ node: root, path: [root.name] }];

  while (queue.length) {
    const { node, path } = queue.shift();
    if (node.name === target) return path.join('/');

    for (const child of node.children ?? []) {
      queue.push({ node: child, path: [...path, child.name] });
    }
  }
  return null;
}
```

**Recursive:**
```js
function findByNameRec(node, target, path = []) {
  const currentPath = [...path, node.name];
  if (node.name === target) return currentPath.join('/');

  for (const child of node.children ?? []) {
    const result = findByNameRec(child, target, currentPath);
    if (result) return result;
  }
  return null;
}
```

**Trade-offs to verbalize:**
- Recursion: cleaner for trees, risk of stack overflow on depth > ~10k
- Iterative BFS: bounded stack, better for wide shallow trees
- Time O(n), space O(h) recursive / O(w) BFS

---

### Q3: Secret Santa with Constraints (Reported — Montreal)

**Problem:** Assign giver → receiver randomly. Part 2: pairs `(A,B)` where A cannot give to B.

**Approach:**
> "Model as derangement with forbidden edges. Build adjacency of allowed receivers, use backtracking or Fisher-Yates on valid permutation with retry cap."

```js
function secretSanta(people, forbidden = []) {
  const banned = new Set(forbidden.map(([a, b]) => `${a}->${b}`));
  const n = people.length;
  let receivers = [...people];

  for (let attempt = 0; attempt < 100; attempt++) {
    // Fisher-Yates shuffle receivers
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
    }

    const valid = people.every((giver, i) => {
      const receiver = receivers[i];
      return giver !== receiver && !banned.has(`${giver}->${receiver}`);
    });

    if (valid) {
      return Object.fromEntries(people.map((g, i) => [g, receivers[i]]));
    }
  }
  throw new Error('No valid assignment');
}
```

---

### Q4: Subarrays Matching a Pattern (Reported — Bengaluru OA)

**Problem:** Array `nums`, pattern array `p` where each `p[i]` is −1, 0, or 1 (decrease, equal, increase). Count subarrays matching pattern.

**Approach:** Convert `nums` to diff array `d[i] = sign(nums[i+1] - nums[i])`, then KMP or sliding compare.

```js
function countMatchingSubarrays(nums, pattern) {
  const m = pattern.length;
  const n = nums.length;
  if (n < m + 1) return 0;

  let count = 0;
  for (let start = 0; start <= n - m - 1; start++) {
    let match = true;
    for (let j = 0; j < m; j++) {
      const diff = Math.sign(nums[start + j + 1] - nums[start + j]);
      if (diff !== pattern[j]) { match = false; break; }
    }
    if (match) count++;
  }
  return count;
}
// Optimize to O(n) with rolling hash or KMP on diff array for follow-up
```

---

## Part C — UI / CSS Q&A

### Q1: Center a div horizontally and vertically — all approaches?

**Answer:**
```css
/* Flexbox — preferred for components */
.container { display: flex; justify-content: center; align-items: center; min-height: 100vh; }

/* Grid — equally good */
.container { display: grid; place-items: center; min-height: 100vh; }

/* Absolute + transform — legacy/modals */
.child { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
```

> "At Principal level I'd also mention: flex for 1D layouts, grid for 2D dashboards, and avoid absolute centering in responsive layouts unless overlay/modal."

---

### Q2: Specificity — which wins?

```html
<div id="app" class="box">...</div>
```
```css
#app { color: red; }
.box { color: blue; }
div { color: green; }
```

**Answer:** `#app` wins (ID > class > element). Score: (1,0,0) vs (0,1,0) vs (0,0,1).

**Follow-up:** How to avoid specificity wars?
> "Use single-class or BEM; avoid IDs for styling; CSS modules or Tailwind for colocation; `:where()` to zero specificity for resets."

---

### Q3: Build a responsive data table — what states do you handle?

**Answer checklist:**
- Loading skeleton
- Empty state
- Error + retry
- Sortable columns (aria-sort)
- Pagination or virtual scroll for 10k+ rows
- Keyboard navigation (roving tabindex)
- Mobile: card layout or horizontal scroll with sticky first column

---

## Part D — JavaScript Deep Dive Q&A

### Q0: Event bubbling, capturing, and delegation (Reported — Autodesk FE interview)

**Answer:**
> "Events flow **capture** (root → target) then **bubble** (target → root). Use delegation: one listener on parent, `event.target.closest(selector)` for dynamic lists (seat grids, tree rows)."

See full answer + code in [11-web-research-sources.md](../11-web-research-sources.md).

---

### Q0b: JS output / coercion snippets (Reported)

Prep: `[] + {}`, `typeof null`, `0.1 + 0.2`, `==` vs `===` — see snippet list in [11-web-research-sources.md](../11-web-research-sources.md).

---

### Q0c: Cookies vs localStorage vs sessionStorage (Reported)

| Cookies (httpOnly) | localStorage | sessionStorage |
|--------------------|--------------|----------------|
| Session via BFF | UI prefs, theme | Tab-scoped drafts |

---

### Q0d: Polyfills — Promise.all, debounce, throttle, memoize (Reported)

Common live asks. Implement out loud; see `promiseAll` example in [11-web-research-sources.md](../11-web-research-sources.md).

---

### Q1: Explain the event loop — what prints first?

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
```

**Answer:** `1, 4, 3, 2`

> "Sync first. Microtasks (Promise) drain completely before next macrotask (setTimeout). In Node: `process.nextTick` runs before other microtasks."

**Node-specific follow-up:** `setImmediate` vs `setTimeout(0)`?
> "In Node I/O phase, `setImmediate` runs before timers. For cross-platform code, prefer `queueMicrotask` or Promises for ordering guarantees."

---

### Q2: What is closure? Give a practical bug.

**Answer:**
> "A function retaining access to its lexical scope after the outer function returns."

**Bug — stale closure in loop:**
```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 3, 3, 3
}
// Fix: let i, or IIFE, or bind
```

**React bug:** `useEffect(() => { ... }, [])` capturing stale props — fix with functional updates or correct deps.

---

### Q3: `var` vs `let` vs `const` — hoisting and TDZ?

**Answer:**
- `var`: function-scoped, hoisted as `undefined`
- `let`/`const`: block-scoped, hoisted but in **Temporal Dead Zone** until declaration
- `const`: binding immutable, object contents still mutable

---

### Q4: Debounce vs throttle — when to use each?

| | Debounce | Throttle |
|---|----------|----------|
| **Behavior** | Run after pause in events | Run at most once per interval |
| **Use case** | Search input, resize end | Scroll, mousemove, rate-limited API |

```js
function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
```

---

## Part E — React Deep Dive Q&A

### Q1: Why must hooks be called at the top level?

**Answer:**
> "React stores hooks in a linked list on the Fiber node (`memoizedState`). Each render walks the list in call order. Conditional hooks would desynchronize hook index → wrong state paired with wrong component logic. Same reason custom hooks must follow rules."

---

### Q2: `useEffect` vs `useLayoutEffect`?

| | useEffect | useLayoutEffect |
|---|-----------|-----------------|
| **Runs** | After paint (async) | After DOM mutations, before paint |
| **Blocks paint?** | No | Yes |
| **Use for** | Data fetch, subscriptions | Measure DOM, prevent flicker |

---

### Q3: How does React 18 concurrent rendering help?

**Answer:**
> "React can interrupt low-priority updates (e.g., search filter) to render urgent ones (input). `startTransition` marks non-urgent state. `Suspense` coordinates async data. Fiber architecture enables incremental work units."

---

### Q4: Prevent unnecessary re-renders — your toolkit?

**Answer:**
1. `React.memo` for pure presentational components
2. `useMemo` / `useCallback` when referential equality matters to memoized children
3. Colocate state — don't lift unnecessarily
4. Split context — separate fast-changing from slow-changing values
5. Virtualize long lists (`react-window`)
6. Profile first — don't memo everything by default

---

### Q4b: Redux vs Context vs React Query? (Reported — Autodesk FE)

| Layer | Tool | When |
|-------|------|------|
| Server data | React Query | API cache, invalidation, retries |
| Global UI chrome | Context / Zustand | Theme, sidebar — low update frequency |
| Complex client logic | useReducer | Wizards, multi-step forms |
| Multi-team strict flows | Redux | Action contracts, middleware, DevTools |

> One candidate passed all rounds but was rejected for **weak explanation style** — always narrate tradeoffs out loud.

---

### Q4c: Reconciliation & Virtual DOM? (Reported)

> "Render builds element tree; reconciler diffs Fiber trees — same type updates props, different type remounts, **keys** stabilize lists. React 18 batches more updates automatically."

---

### Q5: Implement a simple `useFetch` hook (common live exercise)

```jsx
function useFetch(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(url)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then(json => { if (!cancelled) { setData(json); setError(null); } })
      .catch(err => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [url]);

  return { data, error, loading };
}
```

> Mention: AbortController for cleanup, stale-while-revalidate with React Query in production.

---

## Part F — Machine Coding (**High Probability** for This Role)

### Build: Autocomplete search (30–40 min) — **do this before DSA extras**

### Build: Interactive seat map or project tree panel (also reported)

**Seat map requirements:** grid of seats, available/held/sold states, multi-select, conflict message, keyboard accessible.

**Component tree:**
```
<SeatPicker showId={id}>
  <Legend />
  <SeatGrid seats={seats} selected={selected} onToggle={...} />
  <SelectionSummary count={selected.length} total={price} />
  <HoldTimer expiresAt={holdExpiry} />
</SeatPicker>
```

**State:** server state from React Query; optimistic hold with rollback on 409.

---

### Build: Autocomplete search (30–40 min)

**Requirements to clarify:** debounce ms, min chars, keyboard nav, loading/error

**Component structure:**
```
<Autocomplete>
  <input aria-autocomplete="list" aria-controls="listbox" />
  <ul role="listbox">{results.map(...)}</ul>
</Autocomplete>
```

**Key decisions to narrate:**
- Debounce 300ms
- AbortController on new keystroke
- Arrow keys + Enter + Escape
- `aria-activedescendant` for a11y

---

## Round 1 — Questions to Ask Them

1. "Is this team on APS cloud services or a product-specific web surface like Fusion web?"
2. "How much of the role is greenfield vs modernizing legacy desktop-adjacent code?"
3. "What does success look like for a Principal in the first 6 months?"

---

## Quick Reference — Round 1 Topics (Frontend-First)

**Priority A — expect these:**
- Live React component (autocomplete, table, seat map, tree panel)
- CSS flex/grid, responsive layout, specificity
- React hooks rules, useEffect vs useLayoutEffect, re-render debugging
- Performance: memo, virtualization, code splitting, Core Web Vitals
- Accessibility: roles, keyboard nav, focus management

**Priority B — still prepare:**
- Stack / tree DSA (filesystem maps well to tree UI)
- Event loop, closures, debounce/throttle
- Resume defense — **UI architecture why**, not just **how**
