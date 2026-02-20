🔹 STRICT MODE: WHY IT DOUBLE-RENDERS IN DEVELOPMENT

React Strict Mode intentionally double-renders components in development to help
you find bugs. Understanding why and how it works is crucial for debugging.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS STRICT MODE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Strict Mode is a development tool that helps identify problems in your application.
It doesn't render any visible UI, but activates additional checks and warnings.

How to Enable:
```javascript
// Wrap your app
function App() {
  return (
    <React.StrictMode>
      <MyApp />
    </React.StrictMode>
  );
}
```

What It Does:
• Double-renders components (development only)
• Double-invokes effects (development only)
• Warns about deprecated APIs
• Warns about unsafe lifecycle methods
• Warns about legacy string refs
• Detects unexpected side effects

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ WHY DOUBLE-RENDER?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React double-renders to help you find bugs that break the rules of React:

**Rule: Components Should Be Pure**
```javascript
// ❌ Bug: Side effect in render
function Component() {
  console.log('Rendered');  // Side effect
  document.title = 'Updated';  // Side effect
  localStorage.setItem('key', 'value');  // Side effect
  
  return <div>Content</div>;
}

// In Strict Mode:
// Render 1: Side effects run
// Render 2: Side effects run again
// You notice: "Why is this running twice?" → Find the bug!
```

**Rule: Render Should Be Idempotent**
```javascript
// ❌ Bug: Non-idempotent render
let callCount = 0;

function Component() {
  callCount++;  // Different result each time
  return <div>Call {callCount}</div>;
}

// In Strict Mode:
// Render 1: "Call 1"
// Render 2: "Call 2" (different result!)
// You notice: "Why is the result different?" → Find the bug!
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ WHAT GETS DOUBLE-RENDERED?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

In Strict Mode (development only):
• Component functions are called twice
• useState initializers are called twice
• useMemo/useCallback functions are called twice
• useEffect runs twice (mount, unmount, mount)
• useReducer initializers are called twice

Example:
```javascript
function Component() {
  console.log('Component render');  // Logs twice
  
  const [count, setCount] = useState(() => {
    console.log('useState init');  // Logs twice
    return 0;
  });
  
  useEffect(() => {
    console.log('Effect run');  // Logs, then cleanup, then logs again
    return () => console.log('Effect cleanup');
  }, []);
  
  return <div>{count}</div>;
}

// Output in Strict Mode:
// Component render
// useState init
// Component render
// useState init
// Effect run
// Effect cleanup
// Effect run
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ DETECTING SIDE EFFECTS IN RENDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Strict Mode helps find side effects in render:

```javascript
// ❌ Bug: Side effect in render
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  // ❌ Side effect in render (wrong!)
  fetch(`/api/users/${userId}`).then(res => {
    setUser(res.json());
  });
  
  return <div>{user?.name}</div>;
}

// In Strict Mode:
// Render 1: Fetch starts
// Render 2: Fetch starts again (duplicate request!)
// You notice: "Why two requests?" → Move to useEffect!
```

Correct Approach:
```javascript
// ✅ Correct: Side effect in useEffect
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Side effect in effect (correct)
    fetch(`/api/users/${userId}`).then(res => {
      setUser(res.json());
    });
  }, [userId]);
  
  return <div>{user?.name}</div>;
}
```

Other Side Effects to Detect:
```javascript
function Component() {
  // ❌ All of these are bugs in render:
  document.title = 'New Title';
  localStorage.setItem('key', 'value');
  window.scrollTo(0, 0);
  console.log('Render');  // Usually okay, but be aware
  Math.random();  // Non-deterministic
  
  // ✅ Move to useEffect
  useEffect(() => {
    document.title = 'New Title';
  }, []);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ DETECTING NON-IDEMPOTENT RENDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Strict Mode helps find renders that produce different results:

```javascript
// ❌ Bug: Non-idempotent
let counter = 0;

function Component() {
  counter++;  // Different each render
  return <div>Render {counter}</div>;
}

// In Strict Mode:
// Render 1: "Render 1"
// Render 2: "Render 2" (different!)
// You notice: "Why different?" → Fix the bug!
```

Correct Approach:
```javascript
// ✅ Correct: Idempotent render
function Component() {
  const [counter, setCounter] = useState(0);
  
  // Render always produces same result for same props/state
  return <div>Counter: {counter}</div>;
}
```

Example: Date/Time in Render
```javascript
// ❌ Bug: Non-idempotent (time changes)
function Component() {
  return <div>Time: {new Date().toLocaleTimeString()}</div>;
}

// In Strict Mode:
// Render 1: "Time: 10:00:00"
// Render 2: "Time: 10:00:01" (different!)
// You notice: "Why different?" → Use state/effect!

// ✅ Correct: Update via state
function Component() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return <div>Time: {time.toLocaleTimeString()}</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ USESTATE INITIALIZER DOUBLE-CALL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Strict Mode calls useState initializers twice:

```javascript
function Component() {
  const [value, setValue] = useState(() => {
    console.log('Initializer called');
    return expensiveComputation();  // Called twice!
  });
  
  // In Strict Mode:
  // Initializer called (first render)
  // Initializer called (second render)
  // But value is only set once (React discards second result)
}
```

Why This Matters:
```javascript
// ❌ Bug: Side effect in initializer
function Component() {
  const [data, setData] = useState(() => {
    fetch('/api/data').then(setData);  // Called twice!
    return null;
  });
}

// ✅ Correct: Lazy init without side effects
function Component() {
  const [data, setData] = useState(() => {
    // Only computation, no side effects
    return computeInitialValue();
  });
  
  useEffect(() => {
    // Side effects in effect
    fetch('/api/data').then(setData);
  }, []);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ USEEFFECT DOUBLE-INVOCATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Strict Mode runs effects twice: mount → unmount → mount

```javascript
function Component() {
  useEffect(() => {
    console.log('Effect mount');
    
    return () => {
      console.log('Effect cleanup');
    };
  }, []);
  
  // In Strict Mode:
  // 1. Effect mount
  // 2. Effect cleanup (immediate)
  // 3. Effect mount (again)
  
  // This tests that cleanup works correctly!
}
```

Why This Matters:
```javascript
// ❌ Bug: Missing cleanup
function Component() {
  useEffect(() => {
    const subscription = subscribe();
    // No cleanup → subscription leaks on unmount
  }, []);
}

// In Strict Mode:
// Mount: subscription created
// Unmount: subscription still active (leak!)
// Mount again: another subscription (double leak!)
// You notice: "Why two subscriptions?" → Add cleanup!

// ✅ Correct: With cleanup
function Component() {
  useEffect(() => {
    const subscription = subscribe();
    return () => subscription.unsubscribe();  // Cleanup
  }, []);
}
```

Testing Cleanup:
```javascript
function Component() {
  useEffect(() => {
    // Setup
    const timer = setInterval(() => {}, 1000);
    
    // In Strict Mode, cleanup is tested immediately
    return () => {
      clearInterval(timer);  // Must work correctly
    };
  }, []);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ PRODUCTION VS DEVELOPMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Strict Mode only affects development:

```javascript
// Development (with Strict Mode):
function Component() {
  console.log('Render');  // Logs twice
  return <div>Content</div>;
}

// Production (Strict Mode ignored):
function Component() {
  console.log('Render');  // Logs once
  return <div>Content</div>;
}
```

Why Only Development:
• Double-rendering is expensive
• Only needed to find bugs
• Production should be optimized
• Users shouldn't see double effects

Checking Environment:
```javascript
if (process.env.NODE_ENV === 'development') {
  // Strict Mode active
} else {
  // Strict Mode ignored
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ COMMON STRICT MODE DETECTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detection 1: Duplicate API Calls
```javascript
// ❌ Bug: API call in render
function Component({ id }) {
  const [data, setData] = useState(null);
  
  fetch(`/api/${id}`).then(res => setData(res.json()));
  
  // Strict Mode: Two API calls
  // Fix: Move to useEffect
}
```

Detection 2: Missing Cleanup
```javascript
// ❌ Bug: No cleanup
function Component() {
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    // Strict Mode: Event listener leaks
    // Fix: Add cleanup
  }, []);
}
```

Detection 3: State Updates in Render
```javascript
// ❌ Bug: setState in render
function Component() {
  const [count, setCount] = useState(0);
  
  if (count < 10) {
    setCount(count + 1);  // Infinite loop in Strict Mode
  }
  
  // Fix: Use useEffect
}
```

Detection 4: Non-Pure Computations
```javascript
// ❌ Bug: Random in render
function Component() {
  const id = Math.random();  // Different each render
  return <div>ID: {id}</div>;
  
  // Strict Mode: Different IDs
  // Fix: Generate in useState or useMemo
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Strict Mode double-renders in development to find bugs
2. Helps detect side effects in render
3. Helps detect non-idempotent renders
4. Tests that cleanup functions work correctly
5. Only affects development, not production
6. Double-invokes useState initializers
7. Double-invokes useEffect (mount → unmount → mount)
8. Helps find missing cleanup functions
9. Helps find state updates in render
10. Essential tool for writing correct React code

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Strict Mode is a bug"
✅ Strict Mode is a feature to help find bugs

❌ "I'll disable Strict Mode to fix the double-render"
✅ Fix the underlying bug; don't disable Strict Mode

❌ "Double-render happens in production"
✅ Only happens in development

❌ "I can ignore Strict Mode warnings"
✅ Warnings indicate real bugs

❌ "Effects running twice is a bug"
✅ In Strict Mode, it's intentional to test cleanup

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "Why does Strict Mode double-render?":

✅ DO Explain:
• "To help find bugs in development"
• "Detects side effects in render"
• "Detects non-idempotent renders"
• "Tests that cleanup functions work"
• "Only in development, not production"

When asked "What does Strict Mode detect?":

✅ DO Explain:
• "Side effects in render (API calls, DOM manipulation)"
• "Non-idempotent renders (different results each time)"
• "Missing cleanup functions"
• "Unsafe lifecycle methods"
• "Deprecated APIs"

Advanced Answer:
"Strict Mode intentionally double-renders components in development to help find
bugs. It calls component functions twice, invokes useState initializers twice, and
runs useEffect twice (mount → unmount → mount). This helps detect side effects in
render (like API calls or DOM manipulation), non-idempotent renders (renders that
produce different results), and missing cleanup functions. The double-invocation
ensures your code follows React's rules: renders should be pure and idempotent,
and effects should have proper cleanup. Strict Mode only affects development and is
ignored in production builds."
