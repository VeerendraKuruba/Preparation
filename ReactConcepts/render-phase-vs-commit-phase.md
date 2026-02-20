🔹 RENDER PHASE VS. COMMIT PHASE

React separates rendering work into two distinct phases: Render Phase and Commit Phase.
Understanding this separation is crucial for debugging, performance optimization, and
understanding Concurrent React features.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS THE RENDER PHASE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The Render Phase is where React determines what changes need to be made. It's pure
and can be interrupted.

Characteristics:
• **Pure computation**: No side effects allowed
• **Can be interrupted**: React can pause and resume work
• **Creates Virtual DOM**: Builds the new tree structure
• **Reconciliation**: Compares old and new trees
• **Can throw away work**: If interrupted, can discard and restart

What Happens:
```javascript
function Counter() {
  const [count, setCount] = useState(0);
  
  // Render Phase:
  // 1. React calls Counter()
  // 2. Returns JSX (<div>{count}</div>)
  // 3. Creates Virtual DOM tree
  // 4. Diffs with previous tree
  // 5. Identifies changes
  
  return <div>{count}</div>;
}
```

Key Points:
• Component functions are called during render phase
• Hooks are called during render phase
• No DOM updates happen yet
• Can be paused for higher priority work

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ WHAT IS THE COMMIT PHASE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The Commit Phase is where React applies changes to the DOM. It's synchronous and
cannot be interrupted.

Characteristics:
• **Side effects allowed**: DOM updates, effects run
• **Cannot be interrupted**: Must complete atomically
• **Updates Real DOM**: Applies changes to browser
• **Runs effects**: useEffect, useLayoutEffect, refs
• **All or nothing**: Either fully commits or doesn't

What Happens:
```javascript
function Counter() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // Commit Phase:
    // 1. DOM is updated (<div> shows new count)
    // 2. useEffect runs (if dependencies changed)
    // 3. useLayoutEffect runs (synchronously)
    // 4. Ref callbacks run
    console.log('Count updated:', count);
  }, [count]);
  
  return <div>{count}</div>;
}
```

Key Points:
• DOM mutations happen here
• Effects are scheduled/run here
• Synchronous and blocking
• Must complete fully

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ THE COMPLETE FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
State Update (setState)
        ↓
┌─────────────────────────────────────┐
│   RENDER PHASE (can be interrupted) │
├─────────────────────────────────────┤
│ 1. Schedule update                  │
│ 2. Begin work on root               │
│ 3. Call component functions         │
│ 4. Process hooks                    │
│ 5. Create Virtual DOM tree          │
│ 6. Reconcile (diff) trees           │
│ 7. Mark fibers with effect tags     │
│ 8. Build effect list                │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│   COMMIT PHASE (synchronous)        │
├─────────────────────────────────────┤
│ 1. Before Mutation                  │
│    - getSnapshotBeforeUpdate        │
│    - Schedule passive effects       │
│ 2. Mutation                         │
│    - Update DOM nodes               │
│    - Insert/delete nodes            │
│ 3. Layout                           │
│    - useLayoutEffect                │
│    - componentDidMount/Update       │
│    - Ref callbacks                  │
│ 4. Passive Effects                  │
│    - useEffect (async)              │
└─────────────────────────────────────┘
        ↓
UI Updated
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ RENDER PHASE: DETAILED BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What Can Happen in Render Phase:
```javascript
function Component() {
  // ✅ Allowed in Render Phase:
  const [state, setState] = useState(0);  // Hook call
  const memoized = useMemo(() => compute(), []);  // Memoization
  const callback = useCallback(() => {}, []);  // Callback memoization
  
  // Component logic
  const derived = state * 2;  // Computation
  const filtered = items.filter(i => i.active);  // Data transformation
  
  // ❌ NOT Allowed in Render Phase:
  // document.getElementById('x').textContent = 'y';  // DOM mutation
  // fetch('/api');  // Side effect
  // setTimeout(() => {}, 0);  // Side effect
  
  return <div>{derived}</div>;
}
```

Interruption Example:
```javascript
function ExpensiveComponent() {
  const items = Array(10000).fill(0).map((_, i) => i);
  
  // Render Phase starts
  return (
    <div>
      {items.map(item => (
        <ExpensiveChild key={item} data={item} />
      ))}
    </div>
  );
  
  // If user clicks button (high priority):
  // 1. React pauses rendering ExpensiveComponent
  // 2. Renders button click handler
  // 3. Commits button update
  // 4. Resumes ExpensiveComponent rendering
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ COMMIT PHASE: DETAILED BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commit Phase Sub-phases:

**Before Mutation:**
```javascript
// Class components
getSnapshotBeforeUpdate(prevProps, prevState) {
  // Read DOM before it changes
  return { scrollTop: this.listRef.scrollTop };
}

// React schedules passive effects (useEffect)
// But doesn't run them yet
```

**Mutation:**
```javascript
// DOM actually changes here
function commitMutationEffects() {
  // Insert new nodes
  parentDOM.appendChild(newNode);
  
  // Update existing nodes
  node.textContent = newText;
  node.className = newClassName;
  
  // Remove deleted nodes
  parentDOM.removeChild(oldNode);
}
```

**Layout:**
```javascript
// Synchronous effects that need DOM
useLayoutEffect(() => {
  // DOM is updated, but browser hasn't painted yet
  // Safe to read layout (getBoundingClientRect, etc.)
  const rect = elementRef.current.getBoundingClientRect();
  // Can make synchronous DOM updates
}, [deps]);

// Class component lifecycle
componentDidMount() {
  // DOM is mounted
}

componentDidUpdate(prevProps, prevState, snapshot) {
  // DOM is updated
  // snapshot from getSnapshotBeforeUpdate
}
```

**Passive Effects (after paint):**
```javascript
// useEffect runs after browser paints
useEffect(() => {
  // DOM is updated and painted
  // Good for: data fetching, subscriptions, etc.
  fetch('/api/data');
}, [deps]);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ WHY SEPARATE THE PHASES?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. Enables Concurrent Rendering:**
```javascript
// Render phase can be interrupted
function App() {
  return (
    <>
      <ExpensiveList />  {/* Can be paused */}
      <InteractiveButton />  {/* High priority, renders first */}
    </>
  );
}
```

**2. Prevents Partial UI Updates:**
```javascript
// Commit phase is atomic
// Either all changes apply, or none do
// Prevents showing half-updated UI
```

**3. Better Performance:**
```javascript
// Render phase: Can batch multiple updates
setCount(1);
setName('New');
setTheme('dark');
// All processed in one render phase
// Then committed together in one commit phase
```

**4. Predictable Side Effects:**
```javascript
// Effects only run after DOM is updated
useEffect(() => {
  // Guaranteed: DOM reflects current state
  console.log(elementRef.current.textContent);  // Correct value
}, [state]);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ PRACTICAL EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Example 1: State Update Flow
```javascript
function Counter() {
  const [count, setCount] = useState(0);
  
  function handleClick() {
    setCount(c => c + 1);  // Triggers render phase
  }
  
  // RENDER PHASE:
  // 1. React calls Counter()
  // 2. Returns <div>{count}</div>
  // 3. Creates Virtual DOM
  // 4. Diffs with previous tree
  // 5. Marks div for update
  
  // COMMIT PHASE:
  // 1. Updates div.textContent to new count
  // 2. Runs useEffect if dependencies changed
  
  return (
    <div>
      <p>{count}</p>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
}
```

Example 2: Multiple Updates
```javascript
function App() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  
  function handleClick() {
    setA(1);  // Render phase: process update
    setB(2);  // Render phase: process update
    // Both processed in same render phase
    // Then committed together
  }
  
  return <div>{a} {b}</div>;
}
```

Example 3: Interruption
```javascript
function App() {
  const [showList, setShowList] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowList(true)}>Show</button>
      {showList && <ExpensiveList />}
    </>
  );
}

// When button clicked:
// 1. Render phase starts for ExpensiveList
// 2. User types in input (high priority)
// 3. Render phase pauses ExpensiveList
// 4. Renders input update
// 5. Commits input update
// 6. Resumes ExpensiveList rendering
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ RENDER PHASE RESTRICTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What You CANNOT Do in Render Phase:
```javascript
function Component() {
  // ❌ DOM mutations
  document.getElementById('x').textContent = 'y';
  
  // ❌ Side effects
  fetch('/api');
  setTimeout(() => {}, 0);
  localStorage.setItem('key', 'value');
  
  // ❌ Subscriptions
  const unsubscribe = store.subscribe(() => {});
  
  // ❌ Async operations
  async function loadData() {
    const data = await fetch('/api');
  }
  
  return <div>Content</div>;
}
```

Why These Are Forbidden:
• Render phase can be called multiple times
• Can be interrupted and restarted
• Side effects would run multiple times
• Would cause inconsistent state

Correct Approach:
```javascript
function Component() {
  // ✅ Use useEffect for side effects
  useEffect(() => {
    fetch('/api').then(setData);
    return () => {
      // Cleanup
    };
  }, []);
  
  // ✅ Use useLayoutEffect for DOM reads/writes
  useLayoutEffect(() => {
    elementRef.current.scrollTop = 100;
  }, []);
  
  return <div>Content</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ COMMIT PHASE GUARANTEES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What Commit Phase Guarantees:
```javascript
function Component() {
  const [count, setCount] = useState(0);
  const elementRef = useRef(null);
  
  useLayoutEffect(() => {
    // ✅ DOM is updated
    // ✅ Can read layout
    const rect = elementRef.current.getBoundingClientRect();
    console.log('Width:', rect.width);  // Accurate
    
    // ✅ Can make synchronous DOM updates
    elementRef.current.style.color = 'red';
  }, [count]);
  
  useEffect(() => {
    // ✅ DOM is updated and painted
    // ✅ Safe for async operations
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ count })
    });
  }, [count]);
  
  return <div ref={elementRef}>{count}</div>;
}
```

Atomic Updates:
```javascript
// All DOM updates in commit phase are atomic
// Either all succeed, or none do
function updateMultiple() {
  setA(1);
  setB(2);
  setC(3);
  // All three DOM updates happen together
  // User never sees partial state
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Render Phase: Pure computation, can be interrupted, no side effects
2. Commit Phase: Side effects allowed, synchronous, cannot be interrupted
3. Render phase creates Virtual DOM and identifies changes
4. Commit phase applies changes to Real DOM
5. Separation enables Concurrent React features
6. Effects run in commit phase, not render phase
7. Render phase can be called multiple times
8. Commit phase is atomic (all or nothing)
9. Understanding this helps debug performance issues
10. Helps understand when effects run and why

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Render phase updates the DOM"
✅ Render phase identifies changes; commit phase updates DOM

❌ "useEffect runs during render"
✅ useEffect runs during commit phase (after DOM update)

❌ "Render phase cannot be interrupted"
✅ Render phase can be interrupted for higher priority work

❌ "Commit phase can be paused"
✅ Commit phase is synchronous and atomic

❌ "Side effects are okay in render"
✅ Side effects must be in commit phase (effects)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "What is the difference between render and commit phase?":

✅ DO Explain:
• "Render phase is pure computation that can be interrupted"
• "Commit phase applies changes to DOM and runs effects"
• "Render phase identifies what changed; commit phase applies changes"
• "This separation enables Concurrent React features"
• "Effects run in commit phase, not render phase"

Advanced Answer:
"React separates work into render and commit phases. The render phase is where React
calls component functions, processes hooks, creates Virtual DOM trees, and reconciles
changes. It's pure computation with no side effects and can be interrupted for higher
priority work. The commit phase is synchronous and atomic - it applies DOM updates,
runs useLayoutEffect synchronously, and schedules useEffect to run after paint. This
separation enables Concurrent React by allowing React to pause rendering work and
ensures UI updates are atomic, preventing partial updates."
