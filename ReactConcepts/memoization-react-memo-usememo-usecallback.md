🔹 MEMOIZATION: REACT.MEMO VS. USEMEMO VS. USECALLBACK

React provides three memoization tools to optimize performance. Understanding when
and how to use each is crucial for writing efficient React applications.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS MEMOIZATION?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Memoization caches the result of expensive computations or component renders, only
recomputing when dependencies change.

Purpose:
• Avoid unnecessary re-renders
• Avoid expensive recalculations
• Improve performance
• Reduce CPU usage

Three Tools:
1. **React.memo**: Memoizes component renders
2. **useMemo**: Memoizes computed values
3. **useCallback**: Memoizes function references

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ REACT.MEMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React.memo memoizes a component, preventing re-renders when props haven't changed.

Basic Usage:
```javascript
// ❌ Without memo: Re-renders on every parent render
function ExpensiveComponent({ data }) {
  console.log('Rendered');  // Logs every time
  return <div>{expensiveComputation(data)}</div>;
}

// ✅ With memo: Only re-renders if props change
const ExpensiveComponent = React.memo(function ExpensiveComponent({ data }) {
  console.log('Rendered');  // Only logs when data changes
  return <div>{expensiveComputation(data)}</div>;
});
```

How It Works:
```javascript
// React.memo compares props (shallow comparison)
function MyComponent({ name, age }) {
  return <div>{name} - {age}</div>;
}

const MemoizedComponent = React.memo(MyComponent);

// Parent re-renders with same props:
<MemoizedComponent name="John" age={30} />
// Component does NOT re-render (props unchanged)

// Parent re-renders with different props:
<MemoizedComponent name="Jane" age={25} />
// Component DOES re-render (props changed)
```

Custom Comparison:
```javascript
const MyComponent = React.memo(
  function MyComponent({ user }) {
    return <div>{user.name}</div>;
  },
  // Custom comparison function
  (prevProps, nextProps) => {
    // Return true if props are equal (skip render)
    // Return false if props are different (re-render)
    return prevProps.user.id === nextProps.user.id;
  }
);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ USEMEMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

useMemo memoizes the result of an expensive computation, only recalculating when
dependencies change.

Basic Usage:
```javascript
function Component({ items, filter }) {
  // ❌ Without useMemo: Recalculates every render
  const filtered = items.filter(item => item.category === filter);
  
  // ✅ With useMemo: Only recalculates when items or filter changes
  const filtered = useMemo(
    () => items.filter(item => item.category === filter),
    [items, filter]
  );
  
  return <div>{filtered.length} items</div>;
}
```

Expensive Computations:
```javascript
function Component({ data }) {
  // Expensive computation
  const sorted = useMemo(() => {
    console.log('Sorting...');  // Only logs when data changes
    return data.sort((a, b) => a.value - b.value);
  }, [data]);
  
  // Another expensive computation
  const sum = useMemo(() => {
    console.log('Summing...');  // Only logs when sorted changes
    return sorted.reduce((acc, item) => acc + item.value, 0);
  }, [sorted]);
  
  return <div>Sum: {sum}</div>;
}
```

Object/Array Creation:
```javascript
function Component({ x, y }) {
  // ❌ New object every render (causes child re-render)
  const config = { x, y };
  
  // ✅ Memoized object (stable reference)
  const config = useMemo(() => ({ x, y }), [x, y]);
  
  return <Child config={config} />;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ USECALLBACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

useCallback memoizes a function reference, preventing recreation on every render.

Basic Usage:
```javascript
function Component({ items }) {
  // ❌ Without useCallback: New function every render
  function handleClick(id) {
    console.log('Clicked:', id);
  }
  
  // ✅ With useCallback: Stable function reference
  const handleClick = useCallback((id) => {
    console.log('Clicked:', id);
  }, []);  // Empty deps: function never changes
  
  return <Child onClick={handleClick} />;
}
```

With Dependencies:
```javascript
function Component({ userId }) {
  // Function depends on userId
  const handleClick = useCallback(() => {
    fetchUser(userId);
  }, [userId]);  // Recreate when userId changes
  
  return <Button onClick={handleClick} />;
}
```

Preventing Child Re-renders:
```javascript
const Child = React.memo(function Child({ onClick, data }) {
  return <button onClick={onClick}>{data}</button>;
});

function Parent({ items }) {
  const [count, setCount] = useState(0);
  
  // ❌ Without useCallback: Child re-renders every time
  function handleClick() {
    console.log('clicked');
  }
  
  // ✅ With useCallback: Child doesn't re-render
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <Child onClick={handleClick} data="Static" />
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ WHEN TO USE EACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**React.memo:**
✅ Use when:
• Component renders frequently
• Props don't change often
• Component is expensive to render
• Parent re-renders often

```javascript
// ✅ Good: Expensive component, props stable
const ExpensiveChart = React.memo(function Chart({ data }) {
  // Expensive rendering
  return <ComplexVisualization data={data} />;
});
```

**useMemo:**
✅ Use when:
• Expensive computation
• Creating objects/arrays for props
• Preventing unnecessary recalculations

```javascript
// ✅ Good: Expensive computation
const sorted = useMemo(() => expensiveSort(data), [data]);

// ✅ Good: Stable object reference
const config = useMemo(() => ({ theme, locale }), [theme, locale]);
```

**useCallback:**
✅ Use when:
• Passing functions to memoized children
• Functions in dependency arrays
• Preventing function recreation

```javascript
// ✅ Good: Function passed to memoized child
const handleClick = useCallback(() => {}, []);

// ✅ Good: Function in dependency array
useEffect(() => {
  // ...
}, [handleClick]);  // Stable reference
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ COMBINING THEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Often you need to combine memoization tools:

```javascript
// Memoized component
const Child = React.memo(function Child({ data, onClick }) {
  return (
    <div>
      <div>{data.name}</div>
      <button onClick={onClick}>Click</button>
    </div>
  );
});

function Parent({ items }) {
  const [count, setCount] = useState(0);
  
  // Memoized data
  const processedData = useMemo(
    () => items.map(item => processItem(item)),
    [items]
  );
  
  // Memoized callback
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <Child data={processedData} onClick={handleClick} />
    </div>
  );
}
```

Complete Example:
```javascript
const ExpensiveChild = React.memo(function Child({ 
  items, 
  onItemClick, 
  config 
}) {
  const sorted = useMemo(
    () => items.sort((a, b) => a.value - b.value),
    [items]
  );
  
  return (
    <ul>
      {sorted.map(item => (
        <li key={item.id} onClick={() => onItemClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});

function Parent() {
  const [items, setItems] = useState([]);
  const [theme, setTheme] = useState('light');
  
  // Memoized config
  const config = useMemo(
    () => ({ theme, apiUrl: '/api' }),
    [theme]
  );
  
  // Memoized callback
  const handleItemClick = useCallback((id) => {
    console.log('Item clicked:', id);
  }, []);
  
  return (
    <ExpensiveChild 
      items={items} 
      onItemClick={handleItemClick}
      config={config}
    />
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ COMMON PITFALLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pitfall 1: Over-memoization
```javascript
// ❌ Unnecessary: Simple computation
const sum = useMemo(() => a + b, [a, b]);

// ✅ Fine: Simple computation doesn't need memoization
const sum = a + b;
```

Pitfall 2: Missing Dependencies
```javascript
// ❌ Bug: Missing dependency
const filtered = useMemo(
  () => items.filter(item => item.category === filter),
  [items]  // Missing filter!
);

// ✅ Correct: All dependencies
const filtered = useMemo(
  () => items.filter(item => item.category === filter),
  [items, filter]
);
```

Pitfall 3: Unstable Dependencies
```javascript
// ❌ Problem: New object every render
const config = { theme, locale };
const memoized = useMemo(() => compute(config), [config]);

// ✅ Fix: Memoize config
const config = useMemo(() => ({ theme, locale }), [theme, locale]);
const memoized = useMemo(() => compute(config), [config]);
```

Pitfall 4: Memoizing Everything
```javascript
// ❌ Over-memoization: Everything memoized
const Component = React.memo(function Component({ data }) {
  const processed = useMemo(() => data.map(x => x), [data]);
  const handleClick = useCallback(() => {}, []);
  // ...
});

// ✅ Only memoize when needed
function Component({ data }) {
  // Simple operations don't need memoization
  return <div>{data.name}</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ PERFORMANCE CONSIDERATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Memoization has overhead:
• Memory: Stores cached values
• Comparison: Checks dependencies
• Only beneficial if computation/render is expensive

When Memoization Helps:
✅ Expensive computations (sorting, filtering large arrays)
✅ Expensive renders (complex components)
✅ Frequent re-renders with stable props
✅ Preventing cascading re-renders

When Memoization Doesn't Help:
❌ Simple computations (a + b)
❌ Simple components (just text)
❌ Props change frequently
❌ Overhead exceeds benefit

Measure First:
```javascript
// Use React DevTools Profiler
// Identify actual bottlenecks
// Only memoize what's actually slow
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. React.memo: Memoizes component renders (prevents re-renders)
2. useMemo: Memoizes computed values (prevents recalculation)
3. useCallback: Memoizes function references (prevents recreation)
4. Use React.memo for expensive components with stable props
5. Use useMemo for expensive computations or stable object references
6. Use useCallback for functions passed to memoized children
7. Combine them for maximum optimization
8. Don't over-memoize: Only when there's actual benefit
9. Include all dependencies in dependency arrays
10. Measure performance before and after memoization

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "I should memoize everything"
✅ Only memoize when there's actual performance benefit

❌ "useMemo and useCallback are the same"
✅ useMemo caches values; useCallback caches functions

❌ "React.memo prevents all re-renders"
✅ Only prevents re-renders when props don't change

❌ "Memoization always improves performance"
✅ Has overhead; only helps if computation is expensive

❌ "I don't need dependencies if I'm careful"
✅ Always include all dependencies (exhaustive-deps rule)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "What's the difference between React.memo, useMemo, and useCallback?":

✅ DO Explain:
• "React.memo: Memoizes component renders"
• "useMemo: Memoizes computed values"
• "useCallback: Memoizes function references"
• "Each solves different optimization problems"
• "Often used together for maximum benefit"

When asked "When would you use each?":

✅ DO Explain:
• "React.memo: Expensive components with stable props"
• "useMemo: Expensive computations or stable object references"
• "useCallback: Functions passed to memoized children"
• "Only when there's actual performance benefit"
• "Measure first, optimize second"

Advanced Answer:
"React.memo memoizes component renders, preventing re-renders when props haven't changed.
useMemo memoizes computed values, avoiding expensive recalculations. useCallback memoizes
function references, preventing function recreation and enabling effective use of React.memo
on child components. They're often used together: React.memo on components, useMemo for
expensive computations or stable object references passed as props, and useCallback for
functions passed to memoized children. However, memoization has overhead, so it should only
be used when there's actual performance benefit, measured with React DevTools Profiler."
