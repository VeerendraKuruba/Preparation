🔹 WHY MEMOIZATION FAILS: THE UNSTABLE PROPS TRAP

Memoization can fail when props are unstable (new references every render). Understanding
this trap is crucial for effective React optimization.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ THE PROBLEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React.memo uses shallow comparison. If props are new objects/arrays/functions every
render, memoization fails:

```javascript
const Child = React.memo(function Child({ config, onClick }) {
  console.log('Child rendered');  // Logs every time!
  return <div>{config.theme}</div>;
});

function Parent() {
  const [count, setCount] = useState(0);
  
  // ❌ Problem: New object every render
  const config = { theme: 'light' };
  
  // ❌ Problem: New function every render
  function handleClick() {
    console.log('clicked');
  }
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <Child config={config} onClick={handleClick} />
      {/* Child re-renders every time, even though config and onClick are "the same"! */}
    </div>
  );
}
```

Why It Fails:
• React.memo compares props by reference (shallow)
• New object = new reference = props "changed"
• Component re-renders even though values are the same

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ UNSTABLE OBJECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Objects created in render are unstable:

```javascript
function Parent() {
  const [count, setCount] = useState(0);
  
  // ❌ New object every render
  const config = { theme: 'light', locale: 'en' };
  
  return <Child config={config} />;
}

const Child = React.memo(function Child({ config }) {
  return <div>{config.theme}</div>;
});

// Every parent render:
// config = { theme: 'light', locale: 'en' } (new object)
// React.memo sees: "config changed!" (different reference)
// Child re-renders
```

Fix: Memoize the Object
```javascript
function Parent() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState('light');
  const [locale, setLocale] = useState('en');
  
  // ✅ Stable object reference
  const config = useMemo(
    () => ({ theme, locale }),
    [theme, locale]
  );
  
  return <Child config={config} />;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ UNSTABLE ARRAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Arrays created in render are unstable:

```javascript
function Parent() {
  const [count, setCount] = useState(0);
  
  // ❌ New array every render
  const items = [1, 2, 3];
  
  return <Child items={items} />;
}

const Child = React.memo(function Child({ items }) {
  return <div>{items.length} items</div>;
});
```

Fix: Memoize the Array
```javascript
function Parent() {
  const [count, setCount] = useState(0);
  
  // ✅ Stable array reference
  const items = useMemo(() => [1, 2, 3], []);
  
  return <Child items={items} />;
}
```

Or Move Outside Component:
```javascript
// ✅ Stable: Outside component
const ITEMS = [1, 2, 3];

function Parent() {
  return <Child items={ITEMS} />;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ UNSTABLE FUNCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Functions created in render are unstable:

```javascript
function Parent() {
  const [count, setCount] = useState(0);
  
  // ❌ New function every render
  function handleClick() {
    console.log('clicked');
  }
  
  return <Child onClick={handleClick} />;
}

const Child = React.memo(function Child({ onClick }) {
  return <button onClick={onClick}>Click</button>;
});
```

Fix: useCallback
```javascript
function Parent() {
  const [count, setCount] = useState(0);
  
  // ✅ Stable function reference
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return <Child onClick={handleClick} />;
}
```

With Dependencies:
```javascript
function Parent({ userId }) {
  const [count, setCount] = useState(0);
  
  // ✅ Stable, but updates when userId changes
  const handleClick = useCallback(() => {
    fetchUser(userId);
  }, [userId]);
  
  return <Child onClick={handleClick} />;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ NESTED OBJECTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nested objects are especially tricky:

```javascript
function Parent() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState('light');
  
  // ❌ Problem: Nested object recreated
  const user = {
    name: 'John',
    settings: { theme, notifications: true }  // New object every render
  };
  
  return <Child user={user} />;
}
```

Fix: Memoize Nested Objects
```javascript
function Parent() {
  const [count, setCount] = useState(0);
  const [theme, setTheme] = useState('light');
  
  // ✅ Memoize nested object
  const settings = useMemo(
    () => ({ theme, notifications: true }),
    [theme]
  );
  
  const user = useMemo(
    () => ({ name: 'John', settings }),
    [settings]
  );
  
  return <Child user={user} />;
}
```

Or Flatten Props:
```javascript
// ✅ Better: Flatten props
function Parent() {
  const [theme, setTheme] = useState('light');
  
  return <Child name="John" theme={theme} />;
}

const Child = React.memo(function Child({ name, theme }) {
  // Primitive props are stable
  return <div>{name} - {theme}</div>;
});
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ INLINE JSX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Inline JSX creates new React elements every render:

```javascript
function Parent() {
  const [count, setCount] = useState(0);
  
  // ❌ New React element every render
  return (
    <Child>
      <div>Content</div>  {/* New element every render */}
    </Child>
  );
}

const Child = React.memo(function Child({ children }) {
  return <div>{children}</div>;
});
```

Fix: Extract to Variable
```javascript
function Parent() {
  const [count, setCount] = useState(0);
  
  // ✅ Stable element reference
  const content = useMemo(
    () => <div>Content</div>,
    []
  );
  
  return <Child>{content}</Child>;
}
```

Or Move Outside:
```javascript
// ✅ Stable: Outside component
const CONTENT = <div>Content</div>;

function Parent() {
  return <Child>{CONTENT}</Child>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ DETECTING UNSTABLE PROPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

How to detect unstable props:

**1. React DevTools Profiler:**
• Check why components re-render
• See if props are changing unnecessarily

**2. Console Logging:**
```javascript
const Child = React.memo(function Child({ config, onClick }) {
  console.log('Child rendered', { config, onClick });
  return <div>{config.theme}</div>;
}, (prevProps, nextProps) => {
  // Custom comparison
  console.log('Comparing props', { prevProps, nextProps });
  return prevProps.config.theme === nextProps.config.theme;
});
```

**3. Why Did You Render:**
```javascript
// Install: why-did-you-render
import whyDidYouRender from '@welldone-software/why-did-you-render';

whyDidYouRender(React, {
  trackAllPureComponents: true,
});
```

**4. Manual Check:**
```javascript
function Parent() {
  const config = { theme: 'light' };
  
  // Check if reference changes
  console.log('Config reference:', config);
  // If different each render, it's unstable
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ COMPLETE EXAMPLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Problem: Memoization Not Working
```javascript
const ExpensiveChild = React.memo(function Child({ 
  data, 
  config, 
  onUpdate 
}) {
  console.log('Rendered');  // Logs every parent render!
  return <div>{data.name}</div>;
});

function Parent() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('John');
  
  // ❌ All unstable
  const data = { name };
  const config = { theme: 'light' };
  function onUpdate() {
    console.log('update');
  }
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <ExpensiveChild data={data} config={config} onUpdate={onUpdate} />
    </div>
  );
}
```

Solution: Stabilize All Props
```javascript
const ExpensiveChild = React.memo(function Child({ 
  data, 
  config, 
  onUpdate 
}) {
  console.log('Rendered');  // Only logs when props actually change
  return <div>{data.name}</div>;
});

function Parent() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('John');
  const [theme, setTheme] = useState('light');
  
  // ✅ All stable
  const data = useMemo(() => ({ name }), [name]);
  const config = useMemo(() => ({ theme }), [theme]);
  const onUpdate = useCallback(() => {
    console.log('update');
  }, []);
  
  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      <ExpensiveChild data={data} config={config} onUpdate={onUpdate} />
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ CUSTOM COMPARISON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sometimes you need custom comparison:

```javascript
const Child = React.memo(
  function Child({ user }) {
    return <div>{user.name}</div>;
  },
  // Custom comparison: Compare by value, not reference
  (prevProps, nextProps) => {
    return (
      prevProps.user.id === nextProps.user.id &&
      prevProps.user.name === nextProps.user.name
    );
  }
);
```

When to Use:
• Deep object comparison needed
• Comparing by specific fields
• Reference comparison not sufficient

Trade-offs:
• More expensive than shallow comparison
• Need to maintain comparison logic
• Can be error-prone

Better: Stabilize Props Instead
```javascript
// ✅ Better: Stabilize props, use default comparison
const user = useMemo(
  () => ({ id: userId, name: userName }),
  [userId, userName]
);

<Child user={user} />  // Default comparison works
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Memoization fails when props are unstable (new references)
2. Objects/arrays/functions created in render are unstable
3. React.memo uses shallow comparison (by reference)
4. Fix: useMemo for objects/arrays, useCallback for functions
5. Nested objects need careful memoization
6. Inline JSX creates new elements every render
7. Use React DevTools to detect unstable props
8. Stabilize all props for memoization to work
9. Custom comparison can help but stabilize props is better
10. Always check if memoization is actually working

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "React.memo should prevent all re-renders"
✅ Only works if props are stable

❌ "I memoized the component, why is it still re-rendering?"
✅ Check if props are unstable (new references)

❌ "I can just use custom comparison"
✅ Better to stabilize props with useMemo/useCallback

❌ "Primitive props are always stable"
✅ True, but objects/arrays/functions are not

❌ "Memoization is broken"
✅ Usually props are unstable, not memoization

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "Why isn't React.memo working?":

✅ DO Explain:
• "Props are likely unstable (new references every render)"
• "React.memo uses shallow comparison by reference"
• "Objects/arrays/functions created in render are unstable"
• "Fix: useMemo for objects/arrays, useCallback for functions"
• "Check with React DevTools Profiler"

When asked "How do you fix unstable props?":

✅ DO Explain:
• "useMemo for objects and arrays"
• "useCallback for functions"
• "Move constants outside component"
• "Flatten props when possible"
• "Ensure all dependencies are included"

Advanced Answer:
"Memoization fails when props are unstable - when objects, arrays, or functions are
created new every render. React.memo uses shallow comparison by reference, so new
references are seen as changed props, causing re-renders. Fix by using useMemo for
objects/arrays, useCallback for functions, moving constants outside components, and
flattening props when possible. Always verify memoization is working with React DevTools
Profiler, as unstable props are the most common reason memoization doesn't work."
