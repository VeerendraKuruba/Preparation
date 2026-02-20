🔹 HOW REACT SCHEDULES PRIORITY UPDATES (LANES)

React uses a "Lane" system to prioritize and schedule updates in
Concurrent Mode. This allows React to interrupt low-priority work
and prioritize urgent updates (like user input).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT ARE LANES?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lanes are a bitmask system where each bit represents a priority level.
React assigns updates to lanes based on their urgency:

Priority Levels (from highest to lowest):
• SyncLane (0b0000000000000000000000000000001) - Synchronous, cannot be interrupted
• InputContinuousLane (0b0000000000000000000000000000100) - User input (typing, clicking)
• DefaultLane (0b0000000000000000000000000010000) - Normal updates (useState, useEffect)
• TransitionLane (0b0000000000000000000000001000000) - Low priority (useTransition)
• IdleLane (0b0100000000000000000000000000000) - Background work

Key Concept:
• Each update gets assigned to a lane
• React processes lanes in priority order
• Higher priority lanes can interrupt lower priority work
• Multiple updates can be batched in the same lane

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ HOW UPDATES GET ASSIGNED TO LANES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React automatically assigns lanes based on the update source:

```javascript
// ✅ High Priority: User Input
function SearchInput() {
  const [query, setQuery] = useState('');
  
  // This update goes to InputContinuousLane
  // User typing = urgent, cannot be delayed
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}

// ✅ Normal Priority: State Updates
function Counter() {
  const [count, setCount] = useState(0);
  
  // This update goes to DefaultLane
  // Normal priority, can be interrupted
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}

// ✅ Low Priority: Transitions
function TabContainer() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState('home');
  
  function handleTabClick(newTab) {
    // This update goes to TransitionLane
    // Low priority, can be interrupted by user input
    startTransition(() => {
      setTab(newTab);
    });
  }
  
  return <div onClick={() => handleTabClick('about')}>Switch Tab</div>;
}
```

Update Source → Lane Assignment:
• User events (onClick, onChange) → InputContinuousLane
• Regular setState → DefaultLane
• startTransition → TransitionLane
• useDeferredValue → TransitionLane
• Suspense → Depends on context

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ LANE PROCESSING AND INTERRUPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React processes lanes in priority order and can interrupt work:

Example Scenario:
```javascript
function App() {
  const [count, setCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');
  
  // Low priority: Rendering 1000 items
  startTransition(() => {
    setCount(1000); // Goes to TransitionLane
  });
  
  // High priority: User types in search
  // This INTERRUPTS the low-priority render
  return (
    <div>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} // InputContinuousLane
      />
      <div>{count} items</div>
    </div>
  );
}
```

What Happens:
1. React starts rendering 1000 items (TransitionLane - low priority)
2. User types in input → InputContinuousLane (high priority)
3. React INTERRUPTS the low-priority work
4. React processes the input update immediately
5. After input is handled, React resumes/restarts the low-priority work

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ LANE BATCHING AND MERGING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React can batch updates in the same lane:

```javascript
function Counter() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  
  function handleClick() {
    // Both updates are in DefaultLane
    // React batches them into a single render
    setCount(c => c + 1);
    setName('Updated');
    // Only ONE re-render happens!
  }
  
  return <button onClick={handleClick}>Click</button>;
}
```

Lane Merging Rules:
• Updates in the same lane can be batched
• Updates in different lanes are processed separately
• Higher priority lanes cannot be merged with lower priority lanes
• React 18+ automatically batches updates in the same event handler

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ PRACTICAL EXAMPLES WITH LANES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Example 1: Search with Results (Priority Interruption)
```javascript
function SearchApp() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();
  
  useEffect(() => {
    // Normal priority: Fetch results
    fetchResults(query).then(data => {
      startTransition(() => {
        setResults(data); // TransitionLane - low priority
      });
    });
  }, [query]);
  
  return (
    <div>
      {/* InputContinuousLane - HIGH priority */}
      <input 
        value={query}
        onChange={(e) => setQuery(e.target.value)} // Urgent!
      />
      
      {/* TransitionLane - LOW priority, can be interrupted */}
      {isPending && <div>Loading...</div>}
      <ResultsList results={results} />
    </div>
  );
}
```

What Happens:
• User types → InputContinuousLane (high priority)
• Results rendering → TransitionLane (low priority)
• If user types while results are rendering, React interrupts the results
• Input stays responsive, results render when input is idle

Example 2: Expensive List Rendering
```javascript
function ProductList({ products }) {
  const [filter, setFilter] = useState('');
  const [isPending, startTransition] = useTransition();
  const deferredFilter = useDeferredValue(filter);
  
  // Expensive filtering operation
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(deferredFilter.toLowerCase())
    );
  }, [products, deferredFilter]);
  
  return (
    <div>
      {/* High priority input */}
      <input 
        value={filter}
        onChange={(e) => setFilter(e.target.value)} // InputContinuousLane
      />
      
      {/* Low priority list - uses deferred value */}
      {isPending && <div>Filtering...</div>}
      <List items={filteredProducts} />
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ LANE HIERARCHY AND PRECEDENCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lane Priority Order (highest to lowest):

1. SyncLane
   • Synchronous updates (rare, for critical updates)
   • Cannot be interrupted
   • Used for hydration, error boundaries

2. InputContinuousLane
   • Continuous user input (typing, dragging)
   • High priority, should feel instant
   • Interrupts lower priority work

3. DefaultLane
   • Normal state updates (useState, useEffect)
   • Standard priority
   • Can be interrupted by user input

4. TransitionLane
   • Low priority updates (useTransition, useDeferredValue)
   • Can be interrupted
   • Good for non-urgent UI updates

5. IdleLane
   • Background work
   • Lowest priority
   • Only runs when nothing else is happening

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ HOW TO USE LANES EFFECTIVELY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ DO: Use useTransition for non-urgent updates
```javascript
function App() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState('home');
  
  function switchTab(newTab) {
    // ✅ Mark as low priority
    startTransition(() => {
      setTab(newTab);
    });
  }
  
  return <Tabs onSwitch={switchTab} />;
}
```

✅ DO: Use useDeferredValue for expensive computations
```javascript
function SearchResults({ query }) {
  // ✅ Defer expensive filtering
  const deferredQuery = useDeferredValue(query);
  const results = expensiveFilter(deferredQuery);
  
  return <ResultsList results={results} />;
}
```

❌ DON'T: Use transitions for user input
```javascript
function SearchInput() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  
  // ❌ WRONG - user input should be high priority
  function handleChange(e) {
    startTransition(() => {
      setQuery(e.target.value);
    });
  }
  
  // ✅ CORRECT - let React assign high priority automatically
  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ LANES VS. OLD PRIORITY SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before Lanes (React 16):
• Used expiration times (time-based priority)
• Less granular control
• Harder to batch related updates
• All-or-nothing priority

With Lanes (React 17+):
• Bitmask-based priority system
• More granular control
• Better batching of related updates
• Can have multiple priority levels simultaneously
• More predictable and performant

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ INTERNAL LANE REPRESENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React uses bitwise operations for lane management:

```javascript
// Simplified representation
const SyncLane = 0b0000000000000000000000000000001;
const InputContinuousLane = 0b0000000000000000000000000000100;
const DefaultLane = 0b0000000000000000000000000010000;
const TransitionLane = 0b0000000000000000000000001000000;

// Multiple lanes can be active
const pendingLanes = SyncLane | InputContinuousLane;

// Check if a lane is included
const hasSyncLane = (pendingLanes & SyncLane) !== 0;

// Get highest priority lane
const highestPriorityLane = getHighestPriorityLane(pendingLanes);
```

Why Bitmasks?
• Fast operations (bitwise AND, OR)
• Can represent multiple lanes simultaneously
• Efficient priority comparison
• Memory efficient

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 COMMON PATTERNS AND BEST PRACTICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pattern 1: Search with Debounced Results
```javascript
function SearchApp() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();
  
  // High priority: Input (automatic)
  // Low priority: Results (explicit)
  useEffect(() => {
    if (!query) return;
    
    const timer = setTimeout(() => {
      startTransition(async () => {
        const data = await fetchResults(query);
        setResults(data);
      });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);
  
  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </div>
  );
}
```

Pattern 2: Tab Navigation
```javascript
function TabContainer() {
  const [activeTab, setActiveTab] = useState('home');
  const [isPending, startTransition] = useTransition();
  
  function handleTabClick(tab) {
    // ✅ Tab switching is low priority
    // User can click another tab to interrupt
    startTransition(() => {
      setActiveTab(tab);
    });
  }
  
  return (
    <div>
      <Tabs activeTab={activeTab} onTabClick={handleTabClick} />
      {isPending && <TabSkeleton />}
      <TabContent tab={activeTab} />
    </div>
  );
}
```

Pattern 3: List Filtering
```javascript
function FilterableList({ items }) {
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);
  
  // ✅ Filtering uses deferred value (low priority)
  const filtered = useMemo(() => {
    return items.filter(item => 
      item.name.includes(deferredFilter)
    );
  }, [items, deferredFilter]);
  
  const isStale = filter !== deferredFilter;
  
  return (
    <div>
      {/* High priority input */}
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      
      {/* Show stale indicator */}
      {isStale && <div>Filtering...</div>}
      
      {/* Low priority list */}
      <List items={filtered} />
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Lanes are React's priority system using bitmasks
2. Each update gets assigned to a lane based on its source
3. Higher priority lanes can interrupt lower priority work
4. User input automatically gets high priority (InputContinuousLane)
5. Use useTransition for non-urgent updates (TransitionLane)
6. Use useDeferredValue to defer expensive computations
7. Updates in the same lane can be batched together
8. React processes lanes in priority order
9. Lanes enable Concurrent React features (interruption, resumption)
10. Understanding lanes helps optimize performance and UX

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Using transitions for user input:
```javascript
// ❌ WRONG - makes input feel laggy
function Input() {
  const [value, setValue] = useState('');
  const [isPending, startTransition] = useTransition();
  
  return (
    <input 
      value={value}
      onChange={(e) => startTransition(() => setValue(e.target.value))}
    />
  );
}
```

✅ Let React handle input priority automatically:
```javascript
// ✅ CORRECT - React assigns high priority automatically
function Input() {
  const [value, setValue] = useState('');
  return <input value={value} onChange={(e) => setValue(e.target.value)} />;
}
```

❌ Not using transitions for expensive renders:
```javascript
// ❌ WRONG - blocks user input during render
function App() {
  const [tab, setTab] = useState('home');
  return <ExpensiveTabContent tab={tab} />;
}
```

✅ Use transitions for non-urgent updates:
```javascript
// ✅ CORRECT - doesn't block user input
function App() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();
  
  function switchTab(newTab) {
    startTransition(() => setTab(newTab));
  }
  
  return <ExpensiveTabContent tab={tab} />;
}
```

═
