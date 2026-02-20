🔹 CONTEXT API: PERFORMANCE PITFALLS AND BROADCAST UPDATES

Context API can cause performance issues if not used carefully. Understanding the
pitfalls and how to optimize is crucial for building performant React applications.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ THE BROADCAST UPDATE PROBLEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When Context value changes, ALL consumers re-render, even if they only use part
of the value.

Example:
```javascript
const AppContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  
  // ❌ Problem: All consumers re-render when ANY value changes
  const value = { user, theme, language, setUser, setTheme, setLanguage };
  
  return (
    <AppContext.Provider value={value}>
      <UserProfile />  {/* Re-renders when theme changes! */}
      <ThemeSelector /> {/* Re-renders when user changes! */}
      <LanguageSelector /> {/* Re-renders when user changes! */}
    </AppContext.Provider>
  );
}

function UserProfile() {
  const { user } = useContext(AppContext);
  // Re-renders even when theme or language changes!
  return <div>{user?.name}</div>;
}
```

Why This Happens:
• Context value is a single object
• Changing any property creates new object
• All consumers see "new value"
• All consumers re-render

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ SOLUTION: SPLIT CONTEXTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Split contexts by concern to prevent unnecessary re-renders:

```javascript
// ✅ Split into separate contexts
const UserContext = createContext();
const ThemeContext = createContext();
const LanguageContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <LanguageContext.Provider value={{ language, setLanguage }}>
          <UserProfile />  {/* Only re-renders when user changes */}
          <ThemeSelector /> {/* Only re-renders when theme changes */}
          <LanguageSelector /> {/* Only re-renders when language changes */}
        </LanguageContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

function UserProfile() {
  const { user } = useContext(UserContext);
  // Only re-renders when user changes!
  return <div>{user?.name}</div>;
}
```

Benefits:
• Consumers only re-render when their context changes
• Better performance
• Clearer separation of concerns
• Easier to optimize

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ SOLUTION: MEMOIZE CONTEXT VALUE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Memoize context value to prevent unnecessary re-renders:

```javascript
const AppContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  // ❌ Problem: New object every render
  const value = { user, theme, setUser, setTheme };
  
  // ✅ Fix: Memoize value
  const value = useMemo(
    () => ({ user, theme, setUser, setTheme }),
    [user, theme]
  );
  
  return (
    <AppContext.Provider value={value}>
      <Child />
    </AppContext.Provider>
  );
}
```

Stable Functions:
```javascript
function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  // ✅ Memoize setters
  const setUserStable = useCallback(setUser, []);
  const setThemeStable = useCallback(setTheme, []);
  
  const value = useMemo(
    () => ({ user, theme, setUser: setUserStable, setTheme: setThemeStable }),
    [user, theme, setUserStable, setThemeStable]
  );
  
  return <AppContext.Provider value={value}>...</AppContext.Provider>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ SOLUTION: SELECTOR PATTERN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use selectors to subscribe to specific parts of context:

```javascript
// Custom hook with selector
function useAppContext(selector) {
  const context = useContext(AppContext);
  
  return useMemo(
    () => selector(context),
    [context, selector]
  );
}

// Usage: Only re-renders when selected value changes
function UserProfile() {
  const user = useAppContext(ctx => ctx.user);
  // Only re-renders when user changes, not theme!
  return <div>{user?.name}</div>;
}
```

Better: Use Library
```javascript
// Use Zustand, Jotai, or similar
// They handle selectors efficiently
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ FREQUENT UPDATES PROBLEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Context with frequently changing values causes many re-renders:

```javascript
const CounterContext = createContext();

function App() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => c + 1);  // Updates every second
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // ❌ Problem: All consumers re-render every second
  return (
    <CounterContext.Provider value={{ count, setCount }}>
      <ExpensiveComponent1 />  {/* Re-renders every second! */}
      <ExpensiveComponent2 />  {/* Re-renders every second! */}
      <ExpensiveComponent3 />  {/* Re-renders every second! */}
    </CounterContext.Provider>
  );
}
```

Solution: Isolate Frequent Updates
```javascript
// ✅ Isolate to specific component
function CounterProvider({ children }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => c + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <CounterContext.Provider value={{ count, setCount }}>
      {children}
    </CounterContext.Provider>
  );
}

// Only wrap components that need counter
function App() {
  return (
    <StaticContent />
    <CounterProvider>
      <CounterDisplay />  {/* Only this re-renders */}
    </CounterProvider>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ LARGE CONTEXT VALUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Large context values cause performance issues:

```javascript
const DataContext = createContext();

function App() {
  const [largeData, setLargeData] = useState(/* 10,000 items */);
  
  // ❌ Problem: Large object recreated on every change
  const value = { data: largeData, setData: setLargeData };
  
  return (
    <DataContext.Provider value={value}>
      <Child />
    </DataContext.Provider>
  );
}
```

Solution: Store Only What's Needed
```javascript
// ✅ Store only IDs or references
const DataContext = createContext();

function App() {
  const [data, setData] = useState(/* 10,000 items */);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Only store what consumers need
  const value = useMemo(
    () => ({ selectedIds, setSelectedIds }),
    [selectedIds]
  );
  
  return (
    <DataContext.Provider value={value}>
      <Child />
    </DataContext.Provider>
  );
}
```

Or Use State Management Library:
```javascript
// Use Redux, Zustand, etc. for large/complex state
// They handle updates more efficiently
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ NESTED PROVIDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Deeply nested providers can cause performance issues:

```javascript
// ❌ Problem: Deep nesting
<Provider1>
  <Provider2>
    <Provider3>
      <Provider4>
        <Component />  {/* Re-renders when any provider changes */}
      </Provider4>
    </Provider3>
  </Provider2>
</Provider1>
```

Solution: Flatten When Possible
```javascript
// ✅ Combine related providers
function CombinedProvider({ children }) {
  const value1 = useValue1();
  const value2 = useValue2();
  
  return (
    <Context1.Provider value={value1}>
      <Context2.Provider value={value2}>
        {children}
      </Context2.Provider>
    </Context1.Provider>
  );
}
```

Or Use Composition:
```javascript
// ✅ Compose providers
function AppProviders({ children }) {
  return (
    <UserProvider>
      <ThemeProvider>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </ThemeProvider>
    </UserProvider>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ OPTIMIZATION PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pattern 1: Separate Read/Write Contexts
```javascript
const UserReadContext = createContext();
const UserWriteContext = createContext();

function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  
  const readValue = useMemo(() => ({ user }), [user]);
  const writeValue = useMemo(() => ({ setUser }), []);
  
  return (
    <UserReadContext.Provider value={readValue}>
      <UserWriteContext.Provider value={writeValue}>
        {children}
      </UserWriteContext.Provider>
    </UserReadContext.Provider>
  );
}

// Read-only components only subscribe to read context
function UserDisplay() {
  const { user } = useContext(UserReadContext);
  // Doesn't re-render when setUser changes
  return <div>{user?.name}</div>;
}
```

Pattern 2: Context + Local State
```javascript
// ✅ Use context for initial value, local state for updates
function Component() {
  const initialUser = useContext(UserContext);
  const [user, setUser] = useState(initialUser);
  
  // Only re-renders when initialUser changes
  // Local updates don't trigger context consumers
}
```

Pattern 3: Memoized Consumers
```javascript
// ✅ Memoize consumer components
const UserProfile = React.memo(function UserProfile() {
  const { user } = useContext(UserContext);
  return <div>{user?.name}</div>;
});
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ WHEN NOT TO USE CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Context isn't always the best solution:

❌ Don't Use Context For:
• Frequently changing values (use local state)
• Large/complex state (use state management library)
• Derived state (compute in component)
• Temporary state (use local state)
• Performance-critical updates (use props/state)

✅ Use Context For:
• Theme, language, user (infrequent changes)
• Authentication state
• Feature flags
• Global configuration
• Shared state across many components

Alternative: State Management Libraries
```javascript
// For complex/frequent updates, use:
// - Redux
// - Zustand
// - Jotai
// - Recoil
// They handle updates more efficiently
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Context updates broadcast to all consumers
2. Split contexts by concern to prevent unnecessary re-renders
3. Memoize context values to prevent recreation
4. Isolate frequently updating contexts
5. Use selectors to subscribe to specific parts
6. Don't store large values in context
7. Separate read/write contexts when possible
8. Memoize consumer components
9. Consider state management libraries for complex state
10. Measure performance before optimizing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Context is always better than prop drilling"
✅ Context can cause performance issues; use when appropriate

❌ "I'll put everything in one context"
✅ Split contexts to prevent unnecessary re-renders

❌ "Memoizing context value isn't necessary"
✅ Unmemoized values cause unnecessary re-renders

❌ "Context is fine for frequently changing values"
✅ Use local state or state management libraries

❌ "All consumers need to re-render"
✅ Split contexts so only relevant consumers re-render

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "What are Context API performance pitfalls?":

✅ DO Explain:
• "Broadcast updates: All consumers re-render when value changes"
• "Unstable values: New objects every render cause re-renders"
• "Frequent updates: Can cause many unnecessary re-renders"
• "Large values: Storing too much data in context"
• "Solutions: Split contexts, memoize values, use selectors"

When asked "How do you optimize Context performance?":

✅ DO Explain:
• "Split contexts by concern"
• "Memoize context values with useMemo"
• "Isolate frequently updating contexts"
• "Use selectors to subscribe to specific parts"
• "Memoize consumer components"
• "Consider state management libraries for complex state"

Advanced Answer:
"Context API has performance pitfalls: all consumers re-render when the context value
changes (broadcast updates), unstable values cause unnecessary re-renders, and frequent
updates can cause performance issues. Optimize by splitting contexts by concern so only
relevant consumers re-render, memoizing context values with useMemo to prevent recreation,
isolating frequently updating contexts, using selectors to subscribe to specific parts,
and memoizing consumer components. For complex or frequently changing state, consider
state management libraries like Redux or Zustand that handle updates more efficiently."
