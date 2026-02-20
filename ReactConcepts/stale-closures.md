🔹 STALE CLOSURES: HOW TO IDENTIFY AND FIX THEM

Stale closures are a common React bug where callbacks or effects capture old values
instead of the latest ones. Understanding how closures work and how to fix them is
crucial for writing correct React code.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS A CLOSURE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A closure is when a function "remembers" variables from its outer scope:

```javascript
function outer() {
  const count = 0;
  
  function inner() {
    console.log(count);  // Accesses count from outer scope
  }
  
  return inner;  // inner "closes over" count
}

const fn = outer();
fn();  // Prints 0 (remembers count = 0)
```

In React:
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  // This function "closes over" count
  function handleClick() {
    console.log(count);  // Uses count from when function was created
  }
  
  return <button onClick={handleClick}>Click</button>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ WHAT IS A STALE CLOSURE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A stale closure captures an old value instead of the current one:

```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // ❌ Stale closure: count is always 0
      console.log(count);  // Always logs 0!
      setCount(count + 1);  // Always sets to 1!
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);  // Empty deps: count is captured from first render
  
  return <div>{count}</div>;
}
```

What Happens:
1. First render: count = 0, effect runs, interval created
2. Interval callback captures count = 0 (stale)
3. After 1 second: callback runs, uses count = 0 (stale!)
4. setCount(0 + 1) = 1
5. Component re-renders with count = 1
6. But interval callback still has count = 0 (stale closure)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ COMMON STALE CLOSURE SCENARIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scenario 1: useEffect with Empty Dependencies
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // ❌ Stale closure: count is from first render
    setTimeout(() => {
      console.log(count);  // Always 0
    }, 1000);
  }, []);  // Empty deps: captures initial count
  
  return <div>{count}</div>;
}
```

Scenario 2: Event Handlers
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  // ❌ Stale closure: count captured when function created
  function handleClick() {
    setTimeout(() => {
      console.log(count);  // Stale value
    }, 1000);
  }
  
  return <button onClick={handleClick}>Click</button>;
}
```

Scenario 3: Callbacks in Dependencies
```javascript
function Component({ onUpdate }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // ❌ If onUpdate uses data, it might be stale
    onUpdate(data);
  }, [onUpdate]);  // onUpdate might have stale data in closure
}
```

Scenario 4: Multiple State Updates
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  function handleClick() {
    // ❌ All use stale count value
    setCount(count + 1);  // count = 0, sets to 1
    setCount(count + 1);  // count = 0, sets to 1 (not 2!)
    setCount(count + 1);  // count = 0, sets to 1 (not 3!)
    // Result: count = 1, not 3!
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ FIXING STALE CLOSURES: FUNCTIONAL UPDATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use functional updates to access latest state:

```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // ✅ Functional update: always uses latest count
      setCount(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);  // No count dependency needed!
  
  return <div>{count}</div>;
}
```

Multiple Updates:
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  function handleClick() {
    // ✅ Functional updates: each builds on previous
    setCount(prev => prev + 1);  // 0 → 1
    setCount(prev => prev + 1);  // 1 → 2
    setCount(prev => prev + 1);  // 2 → 3
    // Result: count = 3 ✅
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ FIXING STALE CLOSURES: USE REFS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

useRef stores mutable values that don't trigger re-renders:

```javascript
function Component() {
  const [count, setCount] = useState(0);
  const countRef = useRef(count);
  
  // Keep ref in sync
  countRef.current = count;
  
  useEffect(() => {
    const interval = setInterval(() => {
      // ✅ Uses latest value from ref
      console.log(countRef.current);  // Always current
      setCount(countRef.current + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);  // Empty deps, ref handles it
  
  return <div>{count}</div>;
}
```

Custom Hook Pattern:
```javascript
function useLatest(value) {
  const ref = useRef(value);
  ref.current = value;  // Always latest
  return ref;
}

function Component() {
  const [count, setCount] = useState(0);
  const latestCount = useLatest(count);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // ✅ Always uses latest
      console.log(latestCount.current);
      setCount(latestCount.current + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ FIXING STALE CLOSURES: INCLUDE DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Include dependencies to get fresh values:

```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // ✅ Fresh count value every time it changes
    const timeout = setTimeout(() => {
      console.log(count);  // Latest count
    }, 1000);
    
    return () => clearTimeout(timeout);
  }, [count]);  // Include count: effect re-runs when count changes
  
  return <div>{count}</div>;
}
```

Trade-off:
• Effect re-runs when dependency changes
• May need cleanup to cancel previous operations
• Can cause performance issues if dependency changes frequently

Example with Cleanup:
```javascript
function Component({ userId }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    let cancelled = false;
    
    // ✅ Fresh userId, but need to handle cleanup
    fetchUserData(userId).then(result => {
      if (!cancelled) {
        setData(result);
      }
    });
    
    return () => {
      cancelled = true;  // Cancel if userId changes
    };
  }, [userId]);  // Re-fetch when userId changes
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ IDENTIFYING STALE CLOSURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Signs of Stale Closures:
1. Values don't update as expected
2. Effects use old values
3. Event handlers show old state
4. Timers/intervals use stale values
5. Callbacks receive old props/state

Debugging:
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Add logging to identify stale values
      console.log('Current count:', count);  // Check if stale
      console.log('Expected count:', count + 1);
      
      setCount(count + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);  // Empty deps: likely stale!
  
  // If count doesn't increment, it's a stale closure
}
```

React DevTools:
• Check if values are updating in component
• But callbacks/effects still use old values
• Indicates stale closure

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ COMPLEX STALE CLOSURE EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Example 1: Event Listener
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // ❌ Stale closure: count is from first render
    function handleKeyPress(e) {
      if (e.key === 'Enter') {
        console.log(count);  // Always 0
      }
    }
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);  // Empty deps
  
  // ✅ Fix: Use ref
  const countRef = useRef(count);
  countRef.current = count;
  
  useEffect(() => {
    function handleKeyPress(e) {
      if (e.key === 'Enter') {
        console.log(countRef.current);  // Latest value
      }
    }
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
}
```

Example 2: Promise Chain
```javascript
function Component() {
  const [userId, setUserId] = useState(1);
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // ❌ Stale closure: userId might change
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        // userId might be stale here if it changed
        setData(data);
      });
  }, []);  // Missing userId!
  
  // ✅ Fix: Include userId or use ref
  useEffect(() => {
    let cancelled = false;
    
    fetch(`/api/users/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setData(data);
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, [userId]);  // Include dependency
}
```

Example 3: Callback Props
```javascript
function Parent() {
  const [count, setCount] = useState(0);
  
  // ❌ New function every render, might have stale closure
  function handleUpdate() {
    console.log(count);  // Might be stale if used in child
  }
  
  return <Child onUpdate={handleUpdate} />;
}

// ✅ Fix: useCallback with dependencies
function Parent() {
  const [count, setCount] = useState(0);
  
  const handleUpdate = useCallback(() => {
    console.log(count);  // Fresh count
  }, [count]);  // Include count
  
  return <Child onUpdate={handleUpdate} />;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ PREVENTING STALE CLOSURES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best Practices:

1. **Use Functional Updates for State**
```javascript
// ✅ Always use functional updates when state depends on previous
setCount(prev => prev + 1);
```

2. **Include All Dependencies**
```javascript
// ✅ Include all values used in effect
useEffect(() => {
  // Uses count
}, [count]);  // Include count
```

3. **Use Refs for Latest Values**
```javascript
// ✅ When you need latest value but don't want effect to re-run
const latestValue = useRef(value);
latestValue.current = value;
```

4. **Use useCallback with Dependencies**
```javascript
// ✅ Memoize callbacks with correct dependencies
const callback = useCallback(() => {
  // Uses value
}, [value]);  // Include value
```

5. **Handle Cleanup**
```javascript
// ✅ Cancel operations when dependencies change
useEffect(() => {
  let cancelled = false;
  // async operation
  return () => { cancelled = true; };
}, [dep]);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Stale closures capture old values instead of current ones
2. Common in useEffect with empty dependencies
3. Common in event handlers and callbacks
4. Fix with functional updates: `setState(prev => ...)`
5. Fix with refs: `useRef` stores mutable latest value
6. Fix with dependencies: Include values in dependency array
7. Functional updates don't need dependencies
8. Refs don't trigger re-renders or effect re-runs
9. Always include dependencies used in effects (exhaustive-deps)
10. Understanding closures helps prevent and fix bugs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Empty dependency array is fine if I'm careful"
✅ Empty array often causes stale closures

❌ "I can use state value directly in setState"
✅ Use functional updates when value depends on previous state

❌ "Refs are only for DOM references"
✅ Refs also store mutable values to avoid stale closures

❌ "Including dependencies will cause performance issues"
✅ Usually fine; use refs if you need latest value without re-running

❌ "Stale closures only happen in useEffect"
✅ Can happen in any callback or function

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "What is a stale closure?":

✅ DO Explain:
• "A closure that captures an old value instead of current"
• "Common in useEffect with empty dependencies"
• "Happens because functions capture values when created"
• "Fix with functional updates, refs, or dependencies"
• "Can cause bugs where values don't update as expected"

When asked "How do you fix stale closures?":

✅ DO Explain:
• "Functional updates: setState(prev => ...) uses latest state"
• "Refs: useRef stores mutable value that's always current"
• "Dependencies: Include values in dependency array"
• "useCallback: Memoize callbacks with correct dependencies"
• "Choose based on whether you want effect to re-run"

Advanced Answer:
"A stale closure occurs when a function captures an old value from its outer scope.
In React, this commonly happens in useEffect with empty dependencies or in callbacks
that don't update when state changes. The function 'remembers' the value from when
it was created. Fixes include: functional updates (setState(prev => ...)) which
always use latest state, refs (useRef) which store mutable values, or including
dependencies so the effect re-runs with fresh values. The choice depends on whether
you want the effect to re-run or just need the latest value."
