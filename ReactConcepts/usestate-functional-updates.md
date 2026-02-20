🔹 USESTATE: FUNCTIONAL UPDATES AND LAZY INITIALIZATION

useState has two powerful features: functional updates and lazy initialization.
Understanding these patterns is crucial for correct state management and performance
optimization.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ FUNCTIONAL UPDATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Functional updates use the previous state value to compute the new state.

Basic Syntax:
```javascript
const [count, setCount] = useState(0);

// ❌ Direct value (can be stale)
setCount(count + 1);

// ✅ Functional update (always current)
setCount(prevCount => prevCount + 1);
```

Why Functional Updates Matter:
```javascript
function Counter() {
  const [count, setCount] = useState(0);
  
  function handleClick() {
    // ❌ Problem: Multiple rapid clicks
    setCount(count + 1);  // Uses stale closure
    setCount(count + 1);  // Uses same stale value
    // Result: count only increases by 1, not 2!
  }
  
  function handleClickCorrect() {
    // ✅ Solution: Functional updates
    setCount(prev => prev + 1);  // Uses latest value
    setCount(prev => prev + 1);  // Uses updated value
    // Result: count increases by 2!
  }
  
  return <button onClick={handleClickCorrect}>{count}</button>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ THE STALE CLOSURE PROBLEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When you use the state value directly, you capture it in a closure:

```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // ❌ Uses stale count value
      setCount(count + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);  // Empty deps: count is captured in closure
  
  // Problem: count is always 0 in the interval!
  // After 1 second: count = 0 + 1 = 1
  // After 2 seconds: count = 0 + 1 = 1 (still using stale 0)
}
```

Fix with Functional Update:
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // ✅ Uses latest count value
      setCount(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);  // No need for count in deps!
  
  // Works correctly: count increments every second
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ MULTIPLE UPDATES IN SAME RENDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React batches state updates, but direct values can cause issues:

```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  function handleClick() {
    // ❌ All use the same count value (0)
    setCount(count + 1);  // Queued: 0 + 1 = 1
    setCount(count + 1);  // Queued: 0 + 1 = 1
    setCount(count + 1);  // Queued: 0 + 1 = 1
    // Result: count = 1 (not 3!)
  }
  
  function handleClickCorrect() {
    // ✅ Each uses previous update result
    setCount(prev => prev + 1);  // Queued: 0 + 1 = 1
    setCount(prev => prev + 1);  // Queued: 1 + 1 = 2
    setCount(prev => prev + 1);  // Queued: 2 + 1 = 3
    // Result: count = 3 ✅
  }
  
  return <button onClick={handleClickCorrect}>{count}</button>;
}
```

How React Processes Updates:
```javascript
// Direct value updates
setCount(1);  // Update: count = 1
setCount(2);  // Update: count = 2 (replaces previous)
setCount(3);  // Update: count = 3 (replaces previous)
// Final: count = 3

// Functional updates
setCount(prev => prev + 1);  // Update: f(0) = 1
setCount(prev => prev + 1);  // Update: f(1) = 2
setCount(prev => prev + 1);  // Update: f(2) = 3
// Final: count = 3 (but each builds on previous)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ FUNCTIONAL UPDATES IN ASYNC CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Async operations often need functional updates:

```javascript
function Component() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  async function fetchData() {
    setLoading(true);
    
    try {
      const result = await fetch('/api/data');
      const json = await result.json();
      
      // ❌ Might use stale loading value
      setLoading(false);
      setData(json);
    } catch (error) {
      // ❌ Might use stale loading value
      setLoading(false);
    }
  }
  
  // Better: Functional updates ensure correctness
  async function fetchDataCorrect() {
    setLoading(true);
    
    try {
      const result = await fetch('/api/data');
      const json = await result.json();
      
      // ✅ Always uses latest state
      setLoading(prev => false);
      setData(prev => json);
    } catch (error) {
      setLoading(prev => false);
    }
  }
}
```

Multiple Async Updates:
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // Multiple async operations
    Promise.all([
      fetch('/api/1').then(() => {
        setCount(prev => prev + 1);  // ✅ Uses latest
      }),
      fetch('/api/2').then(() => {
        setCount(prev => prev + 1);  // ✅ Uses latest
      }),
      fetch('/api/3').then(() => {
        setCount(prev => prev + 1);  // ✅ Uses latest
      }),
    ]);
    
    // All three updates will correctly increment
    // Even if they complete in different order
  }, []);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ LAZY INITIALIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lazy initialization computes initial state only once, on first render.

Problem Without Lazy Init:
```javascript
function Component() {
  // ❌ Expensive computation runs every render
  const [data, setData] = useState(expensiveComputation());
  
  // expensiveComputation() called:
  // - On mount
  // - On every re-render (even if state doesn't change)
}
```

Solution: Lazy Initialization
```javascript
function Component() {
  // ✅ Expensive computation runs only once
  const [data, setData] = useState(() => expensiveComputation());
  
  // expensiveComputation() called:
  // - Only on mount
  // - Not on re-renders
}
```

How It Works:
```javascript
// useState with function
const [state, setState] = useState(() => {
  console.log('This runs only once!');
  return computeInitialValue();
});

// First render: function is called
// Subsequent renders: function is ignored, previous value used
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ LAZY INIT: PRACTICAL EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Example 1: Expensive Computation
```javascript
function expensiveCalculation() {
  console.log('Computing...');
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += i;
  }
  return sum;
}

function Component() {
  // ❌ Runs every render
  const [value, setValue] = useState(expensiveCalculation());
  
  // ✅ Runs only once
  const [value, setValue] = useState(() => expensiveCalculation());
}
```

Example 2: Reading from localStorage
```javascript
function Component() {
  // ❌ Runs every render (and localStorage might not exist)
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('user'))
  );
  
  // ✅ Runs only once, handles errors
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  });
}
```

Example 3: Props-Based Initial State
```javascript
function Component({ initialCount }) {
  // ❌ Recomputes if initialCount changes (but useState ignores it)
  const [count, setCount] = useState(initialCount);
  
  // ✅ Only uses initialCount on mount
  const [count, setCount] = useState(() => initialCount);
  
  // Note: If you need to sync with prop changes, use useEffect
  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ COMBINING FUNCTIONAL UPDATES AND LAZY INIT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You can use both patterns together:

```javascript
function Component({ initialData }) {
  // Lazy initialization
  const [data, setData] = useState(() => {
    return processInitialData(initialData);
  });
  
  // Functional updates
  function updateData(newItem) {
    setData(prev => [...prev, newItem]);
  }
  
  function incrementCount() {
    setData(prev => ({
      ...prev,
      count: prev.count + 1
    }));
  }
  
  return (
    <div>
      <button onClick={incrementCount}>Increment</button>
      <div>{data.count}</div>
    </div>
  );
}
```

Complex State Updates:
```javascript
function TodoList() {
  const [todos, setTodos] = useState(() => {
    // Lazy: Load from localStorage once
    const stored = localStorage.getItem('todos');
    return stored ? JSON.parse(stored) : [];
  });
  
  function addTodo(text) {
    // Functional: Use previous todos
    setTodos(prev => [...prev, { id: Date.now(), text }]);
  }
  
  function toggleTodo(id) {
    // Functional: Update specific item
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      )
    );
  }
  
  function deleteTodo(id) {
    // Functional: Filter out item
    setTodos(prev => prev.filter(todo => todo.id !== id));
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ WHEN TO USE FUNCTIONAL UPDATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Use Functional Updates When:
• Multiple updates in same function
• Updates in async code (promises, timeouts)
• Updates in event handlers that might fire rapidly
• Updates in effects with empty dependencies
• Updates based on previous state

```javascript
// ✅ Good: Multiple updates
function handleClick() {
  setCount(prev => prev + 1);
  setCount(prev => prev + 1);
}

// ✅ Good: Async code
useEffect(() => {
  setTimeout(() => {
    setCount(prev => prev + 1);
  }, 1000);
}, []);

// ✅ Good: Based on previous state
function increment() {
  setCount(prev => prev + 1);
}
```

❌ Don't Need Functional Updates When:
• Single update with known value
• Update doesn't depend on previous state
• Update is synchronous and not batched

```javascript
// ✅ Fine: Direct value
function reset() {
  setCount(0);  // Doesn't depend on previous
}

// ✅ Fine: Single update
function setName() {
  setUserName('John');  // Not based on previous
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ WHEN TO USE LAZY INITIALIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Use Lazy Init When:
• Initial state requires expensive computation
• Initial state reads from localStorage/sessionStorage
• Initial state requires error handling
• Initial state is based on props (and you want to use them only once)

```javascript
// ✅ Expensive computation
const [data, setData] = useState(() => expensiveCalc());

// ✅ localStorage
const [user, setUser] = useState(() => {
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored) : null;
});

// ✅ Error handling
const [config, setConfig] = useState(() => {
  try {
    return loadConfig();
  } catch {
    return defaultConfig;
  }
});
```

❌ Don't Need Lazy Init When:
• Initial state is a simple value
• Initial state is always the same
• No performance concern

```javascript
// ✅ Fine: Simple value
const [count, setCount] = useState(0);

// ✅ Fine: Simple object
const [user, setUser] = useState({ name: '', email: '' });
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Functional updates: `setState(prev => newValue)` uses latest state
2. Prevents stale closures in async code and effects
3. Allows multiple updates to build on each other
4. Lazy initialization: `useState(() => value)` computes once
5. Lazy init prevents expensive computations on every render
6. Use functional updates when state depends on previous state
7. Use lazy init for expensive initial state computation
8. Both patterns can be combined
9. Functional updates are essential for correct async state updates
10. Lazy init improves performance for expensive initial values

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "I don't need functional updates for single updates"
✅ Still use them in async code to avoid stale closures

❌ "Lazy init runs on every render"
✅ Lazy init runs only on mount

❌ "I can use state value directly in setState"
✅ Use functional updates when value depends on previous state

❌ "Lazy init is just for performance"
✅ Also prevents errors (localStorage might not exist)

❌ "Functional updates are slower"
✅ They're actually safer and often necessary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "When should you use functional updates?":

✅ DO Explain:
• "When state update depends on previous state"
• "In async code to avoid stale closures"
• "When multiple updates need to build on each other"
• "In effects with empty dependencies"
• "Prevents bugs from captured state values"

When asked "What is lazy initialization?":

✅ DO Explain:
• "Lazy init computes initial state only once"
• "Prevents expensive computations on every render"
• "Useful for localStorage, expensive calculations"
• "Pass a function to useState instead of a value"
• "Function is called only on mount"

Advanced Answer:
"Functional updates use the previous state to compute new state: `setState(prev => prev + 1)`.
This is essential when updates depend on previous state, especially in async code where
direct state values can be stale due to closures. Lazy initialization computes initial
state only once by passing a function: `useState(() => expensiveCalc())`. This prevents
expensive computations from running on every render and is useful for reading from
localStorage or performing heavy calculations."
