🔹 CONCURRENT FEATURES: USETRANSITION AND STARTTRANSITION

useTransition and startTransition mark state updates as non-urgent, allowing React
to keep the UI responsive during expensive updates. Understanding these is crucial
for building smooth, responsive React applications.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS USETRANSITION?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

useTransition is a hook that lets you mark state updates as transitions (non-urgent),
keeping the UI responsive during expensive updates.

Basic Usage:
```javascript
import { useTransition } from 'react';

function Component() {
  const [isPending, startTransition] = useTransition();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  
  function handleClick() {
    // Urgent: Update immediately
    setCount(c => c + 1);
    
    // Non-urgent: Can be interrupted
    startTransition(() => {
      setItems(expensiveUpdate(items));
    });
  }
  
  return (
    <div>
      <button onClick={handleClick} disabled={isPending}>
        {isPending ? 'Loading...' : 'Update'}
      </button>
      <div>Count: {count}</div>
      <ExpensiveList items={items} />
    </div>
  );
}
```

What It Does:
• Marks updates as non-urgent (transitions)
• Keeps UI responsive during expensive updates
• Can be interrupted for urgent updates
• Provides pending state

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ WHAT IS STARTTRANSITION?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

startTransition is a standalone function (doesn't need hook) to mark updates as
transitions:

```javascript
import { startTransition } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState([]);
  
  function handleClick() {
    // Urgent update
    setCount(c => c + 1);
    
    // Non-urgent update (transition)
    startTransition(() => {
      setItems(expensiveUpdate(items));
    });
  }
  
  return <div>...</div>;
}
```

When to Use:
• Don't need pending state → use startTransition
• Need pending state → use useTransition

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ URGENT VS NON-URGENT UPDATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React categorizes updates:

**Urgent Updates:**
• User input (typing, clicking)
• Hover effects
• Must feel immediate
• Cannot be interrupted

**Non-Urgent Updates (Transitions):**
• List filtering
• Tab switching
• Can be interrupted
• Can show loading state

Example:
```javascript
function SearchResults({ query }) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();
  
  function handleChange(e) {
    const value = e.target.value;
    
    // Urgent: Update input immediately
    setInput(value);
    
    // Non-urgent: Filter results (can be interrupted)
    startTransition(() => {
      setResults(filterResults(value));
    });
  }
  
  return (
    <div>
      <input value={input} onChange={handleChange} />
      {isPending && <div>Searching...</div>}
      <ResultsList results={results} />
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ HOW IT WORKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Transitions enable React to:
1. Keep urgent updates responsive
2. Interrupt non-urgent work
3. Show pending state
4. Resume work later

Flow:
```
User types → Urgent update (input) → Immediate
           → Transition starts (filter) → Can be interrupted
           → User types again → Interrupts filter
           → Urgent update (input) → Immediate
           → Transition resumes (filter) → Continues
```

Example: Tab Switching
```javascript
function Tabs({ tabs }) {
  const [activeTab, setActiveTab] = useState(0);
  const [isPending, startTransition] = useTransition();
  
  function handleTabClick(index) {
    // Urgent: Update active tab immediately
    setActiveTab(index);
    
    // Non-urgent: Load tab content (can be interrupted)
    startTransition(() => {
      loadTabContent(tabs[index]);
    });
  }
  
  return (
    <div>
      {tabs.map((tab, index) => (
        <button
          key={index}
          onClick={() => handleTabClick(index)}
          className={activeTab === index ? 'active' : ''}
        >
          {tab}
        </button>
      ))}
      {isPending && <div>Loading...</div>}
      <TabContent tab={tabs[activeTab]} />
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ PENDING STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

useTransition provides isPending to show loading state:

```javascript
function Component() {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(null);
  
  function loadData() {
    startTransition(() => {
      setData(fetchExpensiveData());
    });
  }
  
  return (
    <div>
      <button onClick={loadData} disabled={isPending}>
        {isPending ? 'Loading...' : 'Load Data'}
      </button>
      {isPending && <Spinner />}
      {data && <DataDisplay data={data} />}
    </div>
  );
}
```

Visual Feedback:
```javascript
function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();
  
  function handleChange(e) {
    const value = e.target.value;
    setInput(value);
    
    startTransition(() => {
      setResults(search(value));
    });
  }
  
  return (
    <div>
      <input
        value={query}
        onChange={handleChange}
        className={isPending ? 'searching' : ''}
      />
      {isPending && <div className="search-indicator">Searching...</div>}
      <ResultsList results={results} />
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ INTERRUPTION AND RESUMPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Transitions can be interrupted and resumed:

```javascript
function Component() {
  const [filter, setFilter] = useState('');
  const [items, setItems] = useState(largeList);
  const [isPending, startTransition] = useTransition();
  
  function handleFilterChange(newFilter) {
    // Urgent: Update filter immediately
    setFilter(newFilter);
    
    // Non-urgent: Filter list (can be interrupted)
    startTransition(() => {
      const filtered = items.filter(item =>
        item.name.includes(newFilter)
      );
      setItems(filtered);
    });
  }
  
  // If user changes filter quickly:
  // 1. First transition starts
  // 2. User changes filter again
  // 3. First transition interrupted
  // 4. Second transition starts
  // 5. Only latest result shown
}
```

Benefits:
• UI stays responsive
• Only latest update matters
• No wasted work
• Better UX

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ WHEN TO USE TRANSITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Use Transitions For:
• List filtering/sorting
• Tab switching
• Route changes
• Expensive computations
• Updates that can show loading state

❌ Don't Use For:
• Urgent updates (user input)
• Updates that must be immediate
• Critical state changes

Example: List Filtering
```javascript
function ProductList({ products }) {
  const [filter, setFilter] = useState('');
  const [filtered, setFiltered] = useState(products);
  const [isPending, startTransition] = useTransition();
  
  function handleFilterChange(value) {
    setFilter(value);  // Urgent
    
    startTransition(() => {
      setFiltered(
        products.filter(p => p.name.includes(value))
      );
    });
  }
  
  return (
    <div>
      <input
        value={filter}
        onChange={e => handleFilterChange(e.target.value)}
      />
      {isPending && <div>Filtering...</div>}
      <ul>
        {filtered.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

Example: Route Changes
```javascript
function App() {
  const [page, setPage] = useState('home');
  const [isPending, startTransition] = useTransition();
  
  function navigate(newPage) {
    startTransition(() => {
      setPage(newPage);
    });
  }
  
  return (
    <div>
      <nav>
        <button onClick={() => navigate('home')}>Home</button>
        <button onClick={() => navigate('about')}>About</button>
      </nav>
      {isPending && <div>Loading page...</div>}
      <PageContent page={page} />
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ COMBINING WITH OTHER FEATURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

With Suspense:
```javascript
function Component() {
  const [isPending, startTransition] = useTransition();
  const [resource, setResource] = useState(null);
  
  function loadResource() {
    startTransition(() => {
      setResource(fetchResource());
    });
  }
  
  return (
    <div>
      <button onClick={loadResource}>Load</button>
      <Suspense fallback={<div>Loading...</div>}>
        {resource && <ResourceDisplay resource={resource} />}
      </Suspense>
    </div>
  );
}
```

With useDeferredValue:
```javascript
function Component() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [isPending, startTransition] = useTransition();
  
  // Both help keep UI responsive
  // useDeferredValue: Defers value
  // useTransition: Marks updates as non-urgent
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. useTransition: Hook with pending state
2. startTransition: Standalone function
3. Marks updates as non-urgent (transitions)
4. Keeps UI responsive during expensive updates
5. Can be interrupted for urgent updates
6. Use for: filtering, tab switching, route changes
7. Don't use for: urgent updates (user input)
8. Provides isPending for loading states
9. Enables smooth, responsive UIs
10. Part of Concurrent React features

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Use transitions for all updates"
✅ Only for non-urgent updates that can be interrupted

❌ "Transitions make updates faster"
✅ They keep UI responsive, don't speed up updates

❌ "I need useTransition for everything"
✅ Use startTransition if you don't need pending state

❌ "Transitions prevent re-renders"
✅ They mark updates as interruptible, still re-render

❌ "All state updates should be transitions"
✅ Only non-urgent updates; keep urgent updates immediate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "What is useTransition?":

✅ DO Explain:
• "Hook that marks state updates as non-urgent (transitions)"
• "Keeps UI responsive during expensive updates"
• "Can be interrupted for urgent updates"
• "Provides isPending state for loading indicators"
• "Part of Concurrent React features"

When asked "When would you use transitions?":

✅ DO Explain:
• "List filtering/sorting (non-urgent)"
• "Tab switching (can show loading)"
• "Route changes (can be interrupted)"
• "Expensive computations (keep UI responsive)"
• "NOT for urgent updates like user input"

Advanced Answer:
"useTransition and startTransition mark state updates as non-urgent transitions, allowing
React to keep the UI responsive during expensive updates. They enable React to interrupt
non-urgent work for urgent updates (like user input), resume work later, and show pending
states. Use them for filtering, tab switching, route changes, and other updates that can
be interrupted and show loading states. They're part of Concurrent React and help build
smooth, responsive user interfaces. useTransition provides isPending state, while
startTransition is a standalone function when you don't need pending state."
