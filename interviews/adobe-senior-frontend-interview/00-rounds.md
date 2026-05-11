# Adobe Senior Frontend — Round-by-Round Playbook

> **Recruiter-confirmed focus areas (2026):**
> - **R1** — DS/Algo, Coding proficiency & problem-solving fundamentals
> - **R2** — Frontend Concepts & Problem Solving — deep JS, browser APIs, UI architecture, hands-on coding
>
> This file is the entry point. Each round below has: focus, format, what they evaluate, sample questions, must-knows, common mistakes, prep checklist, and pointers into the deep-dive files.

---

## ROUND 1 — DS/Algo, Coding Proficiency & Problem-Solving Fundamentals

### Format

| Item | Detail |
|------|--------|
| Duration | 45–60 minutes |
| Setup | Shared online editor (CoderPad / HackerRank-style); often **no autocomplete, no lint** |
| Problems | 1–2 problems, LeetCode-medium leaning |
| Language | Your choice (JavaScript recommended for a frontend role) |
| Style | Explain approach *before* coding → code → walk through with sample input → discuss complexity → optimize |

### What They Evaluate

1. **Approach clarity** — can you decompose a fuzzy problem before writing code?
2. **Pattern recognition** — do you see the sliding window, two pointers, stack, BFS/DFS, hash map?
3. **Clean code** — meaningful names, no dead branches, no premature `try/catch`.
4. **Complexity reasoning** — Big-O for time and space, articulated *while* you code.
5. **Edge cases** — empty input, single element, negatives, duplicates, overflow.
6. **Communication under pressure** — keep narrating; silent thinking reads as stuck.

### Confirmed Adobe DSA Topics (candidate reports, 2024–2026)

| Topic | Examples |
|-------|----------|
| Stacks / Queues | Valid Parentheses, Min Stack, Queue using two stacks, Next Greater Element |
| Hashing | Two Sum, Group Anagrams, Subarray Sum = K |
| Linked Lists | Reverse, Detect Cycle, Merge Sorted Lists, LRU Cache |
| Trees | Level-order, LCA, Serialize/Deserialize, Path Sum |
| Recursion / Backtracking | Subsets, Permutations, N-Queens (rare) |
| Graphs / Matrix | Flood Fill, Number of Islands, BFS shortest path |
| Sliding Window | Longest substring without repeats, Min window substring |
| OOP Design | Chess board, File system, Parking lot |
| Caching | **LRU Cache** (very frequent at Adobe) |

### Sample Questions (asked at Adobe)

- **LRU Cache** — implement `get(key)` and `put(key, value)` in O(1) using `Map` (or doubly-linked-list + hash).
- **Flood Fill** — BFS/DFS on a 2D grid; explain when DFS recursion can blow the stack and how iterative BFS avoids it.
- **Queue using two stacks** — amortized O(1) dequeue. (You already have [this](../../leetcode/stack/232-implement-queue-using-stacks.js).)
- **Valid Parentheses + minimum removals** to make valid.
- **Serialize/Deserialize Binary Tree** — preorder with null markers.
- **Design a Chess game** in OOP — class hierarchy, polymorphism for piece moves, board state.
- **Sort algorithm choice** — which sort for "mostly sorted", "huge n", "memory-constrained"?

### Must-Knows (Cheat List)

- `Map`, `Set` — when to choose over plain objects.
- Recursion → iterative conversion with an explicit stack.
- BFS with `Queue` (use a deque, not `shift()` on an array — `shift` is O(n)).
- DFS with recursion or stack.
- Doubly-linked-list nodes (head/tail sentinels make LRU cleaner).
- Big-O of `Array.prototype.shift/unshift` (O(n)) vs `push/pop` (O(1)).
- `String` is immutable in JS — concatenation in a loop is O(n²); use array `join`.

### Common Mistakes That Lose Points

- Jumping into code without restating the problem.
- Not asking clarifying questions ("Are inputs sorted? Can values be negative? Duplicates?").
- Using `arr.includes()` inside a loop → O(n²) when a `Set` would be O(n).
- Forgetting to handle empty input and single element.
- Big-O said vaguely ("it's fast") instead of stated ("O(n) time, O(1) extra space").

### Prep Checklist

- [ ] Read [04-dsa.md](./04-dsa.md) end-to-end.
- [ ] Re-implement LRU Cache from scratch *without looking* (target: 10 minutes).
- [ ] Solve 1 medium LeetCode problem per day for the week before, mix patterns.
- [ ] Practice talking *while* coding — record yourself once.
- [ ] Drill: 5 stack problems, 5 hash-map problems, 5 tree problems.

**Deep dive:** [04-dsa.md](./04-dsa.md)

---

## ROUND 2 — Frontend Concepts & Problem Solving (Deep JS · Browser APIs · UI Architecture · Hands-on Coding)

R2 is the longest and most differentiated round. It bundles **four sub-themes** into ~60–75 minutes. The interviewer will pivot between them; you must context-switch fast.

### Format

| Item | Detail |
|------|--------|
| Duration | 60–75 minutes |
| Setup | Online editor (sometimes a React skeleton in CodeSandbox / StackBlitz) |
| Mix | Discussion + hands-on coding; expect 1 implementation task + several concept probes |
| Style | Concept question → small implementation → "make it production-ready" follow-up |

### What They Evaluate

1. **Depth, not surface** — anyone can use `Promise.all`; can you implement it from scratch and explain rejection semantics?
2. **Browser-platform fluency** — event loop, repaint pipeline, storage tradeoffs, network APIs.
3. **Architectural judgment** — would your component scale across 50 teams? Where does state live?
4. **Production-readiness mindset** — error handling, accessibility, performance, memory.
5. **Senior signal** — naming alternatives you rejected and *why*.

---

### Sub-theme 2A — Deep JavaScript Knowledge

**What gets asked:**
- Polyfills: `Array.prototype.map`, `filter`, `reduce`, `Promise.all`, `Promise.any`, `bind`, `debounce`, `throttle`, `deepClone`, `flat`, `memoize`.
- Output prediction: closures, hoisting, `var/let/const`, `this` binding, async/await ordering.
- Event loop: microtasks vs macrotasks (the `Promise.resolve().then` before `setTimeout(0)` classic).
- Prototypes and prototype chain (`Object.create`, `__proto__`, `hasOwnProperty`).
- `this` in arrow functions vs regular functions vs `bind`/`call`/`apply`.

**Sample one-liner traps:**
```js
console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);
// Output: 1 4 3 2 — microtasks drain before next macrotask
```

```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i), 0);
// Output: 3 3 3  (var is function-scoped; let would give 0 1 2)
```

**Senior depth checks:**
- Implement `Promise.allSettled` from scratch. Then `Promise.any`. Then handle `iterable` input (not just array).
- Why does `JSON.parse(JSON.stringify(obj))` fail as a deep clone? (Loses `Date`, `Map`, `Set`, functions, circular refs, `undefined` props.) When is `structuredClone` correct?
- Difference between `Object.freeze` (shallow) and a true deep freeze.

**Deep dive:** [01-javascript-polyfills.md](./01-javascript-polyfills.md)

---

### Sub-theme 2B — Browser APIs

**What gets asked:**
- Event loop walkthrough.
- IntersectionObserver for lazy load / infinite scroll (no `scroll` listener!).
- ResizeObserver for container queries.
- Storage: cookie vs localStorage vs sessionStorage vs IndexedDB — when to pick which.
- Web Workers, Service Workers, Transferable Objects.
- `requestAnimationFrame` vs `requestIdleCallback`.
- `fetch` + `AbortController` for cancellation.
- Performance API + Core Web Vitals (LCP < 2.5s, INP < 200ms, CLS < 0.1).
- Critical Rendering Path: HTML → DOM → CSSOM → render tree → layout → paint → composite.
- CORS preflight rules; credentials gotcha.

**Hands-on:** "Implement infinite scroll" → expected answer uses IntersectionObserver, not `onScroll` + throttle. If you reach for `onScroll`, that's a signal you don't know modern primitives.

**Senior depth checks:**
- Two tabs of Adobe Express editing the same doc — where do drafts live? (IndexedDB + BroadcastChannel.)
- Why animate `transform` not `top`/`left`? (Compositor-only, no layout/paint.)
- When does `Promise.then` callback actually run relative to `setTimeout(0)`?

**Deep dive:** [09-browser-apis.md](./09-browser-apis.md)

---

### Sub-theme 2C — UI Architecture

**What gets asked:**
- Component architecture: compound components, headless hooks (React Aria pattern), render props.
- State management — local vs lifted vs global vs server-state; when Redux is overkill.
- Render performance: fix layers for "5,000 rows re-render on every keystroke" (move state down → memo → useCallback → virtualize).
- Code splitting + Module Federation (Adobe uses MF heavily).
- Micro-frontend tradeoffs.
- Design system architecture (tokens → primitives → patterns → product components).
- Error boundary granularity — why one root boundary is wrong.
- Rendering strategy choice: CSR / SSR / SSG / ISR / RSC.
- Real-time collaboration: OT vs CRDT (Yjs, Automerge).

**Sample architecture prompt:** *"Design a `<DataTable>` used across Adobe Experience Cloud."*
Strong answer: compound components + headless state hook + slot composition, mention React Stately separation of state ↔ behavior ↔ style.

**Senior depth checks:**
- When is Redux the wrong choice? (Server state goes in TanStack Query / RTK Query, not Redux.)
- Why do `useMemo`/`useCallback` not help here? (Stable identity is useless if the consumer isn't memoized.)
- Module Federation version-skew failure modes.

**Deep dive:** [10-ui-architecture.md](./10-ui-architecture.md)

---

### Sub-theme 2D — Hands-on Coding (Machine Coding)

**What gets asked:**
- Build a **star rating** component (hover preview, half-star, accessibility).
- Build an **autocomplete / typeahead** (debounce, AbortController, keyboard nav, ARIA combobox).
- Build a **tabs** component (controlled + uncontrolled, ARIA, roving tabindex).
- Build a **nested checkbox tree** (parent indeterminate state).
- Build an **infinite scroll** list.
- Build a **drag-and-drop** sortable list.
- **Task runner** that runs N promises with concurrency K (see your [14-async-task-queue.js](../commvault-principal-frontend-interview/14-async-task-queue.js)).
- **File directory** rendering (recursive tree).

**What they grade:**
- Correctness on the golden path.
- Edge cases (empty list, error states, loading).
- Keyboard + screen reader accessibility — Adobe is non-negotiable here.
- Component API — props that are intuitive, not 30 booleans.
- Composability — does it accept `children` / render props?
- Performance — virtualization mentioned (if list is large), `memo` used where it matters.

**Senior signal:** Before coding, ask:
1. "Controlled or uncontrolled?"
2. "What's the data shape?"
3. "Async source?"
4. "Accessibility requirements?"

Then code the *behavior* first, *visual polish* last.

**Deep dive:** [03-machine-coding.md](./03-machine-coding.md)

---

### R2 Prep Checklist

**Deep JS**
- [ ] Implement from memory: `Promise.all`, `Promise.allSettled`, `Promise.any`, `debounce` (leading + trailing), `throttle`, `deepClone`, `bind`, `memoize`, `flat`.
- [ ] Solve 10 output-prediction problems (closures, hoisting, event loop).
- [ ] Re-read the event loop spec walkthrough.

**Browser APIs**
- [ ] One-page summary table of every API and when to use which.
- [ ] Implement infinite scroll with IntersectionObserver.
- [ ] Build a tiny offline-first IndexedDB demo.
- [ ] Set up a `PerformanceObserver` for LCP/CLS in any side project.

**UI Architecture**
- [ ] Sketch architecture for an `<Editor>` with 5+ panels — where does state live, how do panels communicate?
- [ ] Read React Aria docs — understand the state/behavior/style split.
- [ ] Build one compound component (e.g. `<Tabs>` with subcomponents).

**Hands-on**
- [ ] Build star rating, autocomplete, tabs from scratch this week, timed at 30 min each.
- [ ] Drill ARIA roles for combobox, tablist, listbox, tree.
- [ ] Re-do [12-html-to-json.js](../commvault-principal-frontend-interview/12-html-to-json.js) / [13-sequential-promise-resolution.js](../commvault-principal-frontend-interview/13-sequential-promise-resolution.js) / [14-async-task-queue.js](../commvault-principal-frontend-interview/14-async-task-queue.js) under 30 min each.

---

## Day-of Strategy

### Before R1
- 10 min warmup on an easy problem (Two Sum, Reverse Linked List) to get the muscle memory firing.
- Don't drill new patterns the morning of — review your own notes.

### During R1
- **Repeat the problem back** in your own words.
- **Ask 2 clarifying questions** before coding (input bounds, edge cases).
- **State approach + complexity** before typing any code.
- **Run through a small example** out loud.
- **Code**, narrating decisions.
- **Trace through with the example** when done.
- **Discuss optimizations** even if not asked.

### Between R1 and R2
- Water, snack, breathe. Don't post-mortem R1 — it doesn't help R2.

### During R2
- For any concept question, give a **three-layer answer**:
  1. What the API/pattern guarantees.
  2. Performance implications.
  3. Alternative you rejected and why.
- For implementation tasks, **clarify before coding** (controlled/uncontrolled, data shape, a11y).
- **Type, don't pause to think silently** — type a comment skeleton first, fill in.

### Red Flags to Avoid Across Both Rounds
- Going silent for more than 30 seconds.
- Reaching for `setInterval`, `onScroll`, `localStorage` for large data — all signal "not modern".
- Using `any` in TypeScript without acknowledging it.
- Forgetting `key` prop in React lists.
- Not mentioning accessibility once.

---

## Quick-Reference Mapping

| Need to revise... | Open file |
|---|---|
| LRU, trees, stacks, OOP design | [04-dsa.md](./04-dsa.md) |
| Polyfills, output traps, closures | [01-javascript-polyfills.md](./01-javascript-polyfills.md) |
| Event loop, IntersectionObserver, storage, workers | [09-browser-apis.md](./09-browser-apis.md) |
| Compound components, state tiers, MFE, CRDT | [10-ui-architecture.md](./10-ui-architecture.md) |
| Star rating, autocomplete, tabs, infinite scroll | [03-machine-coding.md](./03-machine-coding.md) |
| React + TypeScript patterns, hooks | [02-react-typescript.md](./02-react-typescript.md) |
| Accessibility, CSS, React Aria | [06-css-accessibility.md](./06-css-accessibility.md) |
| System design (file system, editor) | [05-system-design.md](./05-system-design.md) |
| Behavioral / STAR | [07-behavioral.md](./07-behavioral.md) |
| Adobe products, Spectrum, GenStudio | [08-adobe-domain.md](./08-adobe-domain.md) |
