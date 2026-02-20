🔹 USEEFFECT: DEPENDENCY PATTERNS AND OBJECT.IS COMPARISON

useEffect dependencies determine when effects run. Understanding how React compares
dependencies using Object.is and common dependency patterns is crucial for writing
correct effects.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ DEPENDENCY ARRAY BASICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

useEffect runs based on its dependency array:

```javascript
useEffect(() => {
  // Effect body
}, [dependencies]);  // Dependency array
```

Behavior:
• **No array**: Runs after every render
• **Empty array []**: Runs only once (on mount)
• **With dependencies [a, b]**: Runs when dependencies change

Examples:
```javascript
// Runs after every render
useEffect(() => {
  console.log('Rendered');
});

// Runs only on mount
useEffect(() => {
  console.log('Mounted');
}, []);

// Runs when count changes
useEffect(() => {
  console.log('Count changed:', count);
}, [count]);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ HOW REACT COMPARES DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React uses `Object.is()` to compare dependencies:

```javascript
// Object.is comparison (same as === for most cases)
Object.is(1, 1);           // true
Object.is('a', 'a');      // true
Object.is(true, true);    // true
Object.is(null, null);    // true
Object.is(undefined, undefined); // true

// But different from === for:
Object.is(NaN, NaN);      // true (=== returns false)
Object.is(+0, -0);        // false (=== returns true)
```

How React Checks:
```javascript
// Previous render dependencies: [count, name]
// Current render dependencies: [count, name]

// React compares:
Object.is(prevCount, currentCount);  // true → no change
Object.is(prevName, currentName);    // true → no change
// Result: Effect does NOT run

// If count changes:
Object.is(prevCount, currentCount);  // false → changed!
// Result: Effect runs
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ PRIMITIVE DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Primitives work as expected:

```javascript
function Component() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  
  // ✅ Works: Primitives compared by value
  useEffect(() => {
    console.log('Count changed:', count);
  }, [count]);
  
  useEffect(() => {
    console.log('Name changed:', name);
  }, [name]);
  
  useEffect(() => {
    console.log('Enabled changed:', enabled);
  }, [enabled]);
}
```

Object.is for Primitives:
```javascript
Object.is(0, 0);           // true
Object.is('hello', 'hello'); // true
Object.is(true, true);     // true
Object.is(null, null);     // true

// Different values
Object.is(0, 1);           // false
Object.is('a', 'b');       // false
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ OBJECT AND ARRAY DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Objects and arrays are compared by reference, not by value:

```javascript
function Component() {
  const [user, setUser] = useState({ name: 'John', age: 30 });
  
  // ❌ Problem: New object every render
  useEffect(() => {
    console.log('User changed');
  }, [user]);  // user is new object every render!
  
  // Even if values are same:
  setUser({ name: 'John', age: 30 });  // New object → effect runs
  setUser({ name: 'John', age: 30 });  // New object → effect runs again!
}
```

Why This Happens:
```javascript
const obj1 = { name: 'John' };
const obj2 = { name: 'John' };

Object.is(obj1, obj2);  // false! (different references)
Object.is(obj1, obj1);  // true (same reference)
```

Solutions:
```javascript
function Component() {
  const [user, setUser] = useState({ name: 'John', age: 30 });
  
  // ✅ Solution 1: Depend on specific properties
  useEffect(() => {
    console.log('User name changed:', user.name);
  }, [user.name, user.age]);  // Primitives, not object
  
  // ✅ Solution 2: Memoize the object
  const memoizedUser = useMemo(() => user, [user.name, user.age]);
  useEffect(() => {
    console.log('User changed');
  }, [memoizedUser]);
  
  // ✅ Solution 3: Use functional update (if updating)
  function updateUser(newName) {
    setUser(prev => ({ ...prev, name: newName }));
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ FUNCTION DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Functions are also compared by reference:

```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  // ❌ Problem: New function every render
  function handleClick() {
    setCount(c => c + 1);
  }
  
  useEffect(() => {
    // handleClick is new function every render
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleClick]);  // Effect runs every render!
}
```

Solutions:
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  // ✅ Solution 1: useCallback
  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []);  // Stable reference
  
  useEffect(() => {
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [handleClick]);  // Stable, only runs if deps change
  
  // ✅ Solution 2: Define function inside effect
  useEffect(() => {
    function handleClick() {
      setCount(c => c + 1);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);  // No function dependency needed
  
  // ✅ Solution 3: Functional update (no function dependency)
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(prev => prev + 1);  // No count dependency needed
    }, 1000);
    return () => clearInterval(interval);
  }, []);  // Empty deps, functional update handles it
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ COMMON DEPENDENCY PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pattern 1: Empty Dependencies (Mount Only)
```javascript
useEffect(() => {
  // Runs once on mount
  fetchInitialData();
  
  return () => {
    // Cleanup on unmount
    cancelRequest();
  };
}, []);  // Empty: mount/unmount only
```

Pattern 2: Single Dependency
```javascript
useEffect(() => {
  // Runs when userId changes
  fetchUserData(userId);
}, [userId]);  // Single dependency
```

Pattern 3: Multiple Dependencies
```javascript
useEffect(() => {
  // Runs when any dependency changes
  fetchData(userId, filters);
}, [userId, filters]);  // Multiple dependencies
```

Pattern 4: All Dependencies (Every Render)
```javascript
useEffect(() => {
  // Runs after every render
  updateDocumentTitle(count);
});  // No array: every render
```

Pattern 5: Conditional Dependencies
```javascript
useEffect(() => {
  if (enabled) {
    // Only run when enabled is true
    startSubscription();
    return () => stopSubscription();
  }
}, [enabled]);  // Effect handles condition internally
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ EXHAUSTIVE DEPS RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ESLint rule `react-hooks/exhaustive-deps` enforces including all dependencies:

```javascript
function Component({ userId }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // ❌ Missing userId in deps
    fetchUserData(userId).then(setData);
  }, []);  // ESLint warning: missing userId
  
  // ✅ Correct: Include all dependencies
  useEffect(() => {
    fetchUserData(userId).then(setData);
  }, [userId]);  // All deps included
}
```

When to Disable the Rule:
```javascript
useEffect(() => {
  // Intentional: Only run on mount
  initializeApp();
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);  // Intentionally empty
```

But Be Careful:
```javascript
function Component({ userId }) {
  useEffect(() => {
    // ❌ Bug: userId might change, but effect doesn't re-run
    fetchUserData(userId).then(setData);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // Missing userId!
  
  // ✅ Better: Include userId or use ref
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  
  useEffect(() => {
    fetchUserData(userIdRef.current).then(setData);
  }, []);  // Safe: using ref
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ STABLE VS UNSTABLE DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stable Dependencies (Don't Change):
```javascript
// Primitives from state
const [count, setCount] = useState(0);  // Stable if not updated

// Memoized values
const memoized = useMemo(() => compute(), [deps]);

// useCallback functions
const callback = useCallback(() => {}, [deps]);

// Refs
const ref = useRef(initialValue);  // Always stable
```

Unstable Dependencies (Change Every Render):
```javascript
// New objects
const config = { api: 'url' };  // New object every render

// New arrays
const items = [1, 2, 3];  // New array every render

// New functions
function handleClick() {}  // New function every render

// Inline objects/arrays
useEffect(() => {
  // ...
}, [{ id: 1 }]);  // New object every render!
```

Making Dependencies Stable:
```javascript
function Component({ userId }) {
  // ❌ Unstable: New object every render
  const config = { userId, api: '/api' };
  
  // ✅ Stable: Memoize
  const config = useMemo(
    () => ({ userId, api: '/api' }),
    [userId]
  );
  
  useEffect(() => {
    fetchData(config);
  }, [config]);  // Now stable
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ COMPLEX DEPENDENCY SCENARIOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scenario 1: Derived State
```javascript
function Component({ items }) {
  const [filtered, setFiltered] = useState([]);
  const [filter, setFilter] = useState('');
  
  // ❌ Problem: items might change, but effect doesn't re-run
  useEffect(() => {
    setFiltered(items.filter(i => i.name.includes(filter)));
  }, [filter]);  // Missing items!
  
  // ✅ Solution 1: Include items
  useEffect(() => {
    setFiltered(items.filter(i => i.name.includes(filter)));
  }, [items, filter]);  // All deps
  
  // ✅ Solution 2: Use useMemo (better for derived state)
  const filtered = useMemo(
    () => items.filter(i => i.name.includes(filter)),
    [items, filter]
  );
}
```

Scenario 2: Props That Change Frequently
```javascript
function Component({ onUpdate }) {
  // ❌ Problem: onUpdate might be new every render
  useEffect(() => {
    const interval = setInterval(() => {
      onUpdate();
    }, 1000);
    return () => clearInterval(interval);
  }, [onUpdate]);  // Effect runs every render if onUpdate changes
  
  // ✅ Solution: useRef to store latest
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  
  useEffect(() => {
    const interval = setInterval(() => {
      onUpdateRef.current();  // Always latest
    }, 1000);
    return () => clearInterval(interval);
  }, []);  // Empty deps, ref handles it
}
```

Scenario 3: Conditional Effects
```javascript
function Component({ userId, enabled }) {
  // ✅ Only run when both conditions met
  useEffect(() => {
    if (enabled && userId) {
      fetchData(userId);
    }
  }, [userId, enabled]);  // Include all deps used in condition
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. React uses Object.is() to compare dependencies
2. Primitives compared by value; objects/arrays by reference
3. New objects/arrays/functions every render cause effects to run every time
4. Use useMemo/useCallback to stabilize dependencies
5. Include all dependencies used in effect (exhaustive-deps rule)
6. Empty array [] means mount/unmount only
7. No array means runs after every render
8. Functional updates can avoid some dependencies
9. useRef can store latest values without triggering effects
10. Understanding Object.is helps debug dependency issues

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Objects with same values are equal"
✅ Objects compared by reference, not value

❌ "I can ignore exhaustive-deps warnings"
✅ Usually indicates a bug or missing dependency

❌ "Empty array means never re-run"
✅ Empty array means only mount/unmount

❌ "I need to include everything I use"
✅ Only include values from component scope that effect depends on

❌ "Functions are always stable"
✅ Functions are new every render unless memoized

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "How does React compare dependencies?":

✅ DO Explain:
• "React uses Object.is() for comparison"
• "Primitives compared by value"
• "Objects/arrays compared by reference"
• "New objects every render cause effects to re-run"
• "Use useMemo/useCallback to stabilize"

When asked "What should go in the dependency array?":

✅ DO Explain:
• "All values from component scope used in effect"
• "Props, state, and other values the effect depends on"
• "Functions should be memoized with useCallback"
• "Objects should be memoized with useMemo"
• "ESLint exhaustive-deps rule helps catch missing deps"

Advanced Answer:
"React compares dependencies using Object.is(), which compares primitives by value but
objects and arrays by reference. This means a new object with the same values is
considered different, causing effects to re-run unnecessarily. To fix this, use useMemo
for objects/arrays and useCallback for functions. The exhaustive-deps ESLint rule
ensures all dependencies are included, preventing bugs from stale closures."
