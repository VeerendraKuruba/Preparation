🔹 PROP DRILLING: WHEN IT'S OKAY AND WHEN IT'S TECHNICAL DEBT

Prop drilling is passing props through multiple component levels. Understanding when
it's acceptable and when it becomes technical debt is crucial for maintainable code.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS PROP DRILLING?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Prop drilling is passing props through intermediate components that don't use them,
just to get them to a deeply nested component.

Example:
```javascript
// ❌ Prop drilling: user passed through 3 levels
function App() {
  const [user, setUser] = useState(null);
  return <Page user={user} setUser={setUser} />;
}

function Page({ user, setUser }) {
  // Doesn't use user, just passes it down
  return <Section user={user} setUser={setUser} />;
}

function Section({ user, setUser }) {
  // Doesn't use user, just passes it down
  return <Component user={user} setUser={setUser} />;
}

function Component({ user, setUser }) {
  // Finally uses user
  return <div>{user?.name}</div>;
}
```

Visual Representation:
```
App (has user)
  ↓ (passes user)
Page (doesn't use user)
  ↓ (passes user)
Section (doesn't use user)
  ↓ (passes user)
Component (uses user) ← Finally!
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ WHEN IS PROP DRILLING OKAY?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Prop drilling is acceptable when:
1. **Shallow nesting** (1-2 levels)
2. **Few props** (1-3 props)
3. **Props are related** (logical grouping)
4. **Intermediate components might use props later**
5. **Simple, stable structure**

Example: Acceptable Prop Drilling
```javascript
// ✅ Okay: 2 levels, 1 prop, simple
function App() {
  const [theme, setTheme] = useState('light');
  return <Layout theme={theme} />;
}

function Layout({ theme }) {
  return <Header theme={theme} />;
}

function Header({ theme }) {
  return <div className={theme}>Header</div>;
}
```

Example: Acceptable (Related Props)
```javascript
// ✅ Okay: Related props, shallow
function App() {
  const [user, setUser] = useState(null);
  return <Dashboard user={user} onUserChange={setUser} />;
}

function Dashboard({ user, onUserChange }) {
  return <UserProfile user={user} onUserChange={onUserChange} />;
}

function UserProfile({ user, onUserChange }) {
  return <div>{user?.name}</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ WHEN IS PROP DRILLING TECHNICAL DEBT?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Prop drilling becomes technical debt when:
1. **Deep nesting** (3+ levels)
2. **Many props** (4+ props)
3. **Props unrelated to intermediate components**
4. **Hard to maintain** (adding props requires many changes)
5. **Components tightly coupled** (hard to refactor)

Example: Technical Debt
```javascript
// ❌ Bad: 4 levels, many props, unrelated
function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState([]);
  
  return (
    <Page
      user={user}
      setUser={setUser}
      theme={theme}
      setTheme={setTheme}
      language={language}
      setLanguage={setLanguage}
      notifications={notifications}
      setNotifications={setNotifications}
    />
  );
}

function Page({ user, setUser, theme, setTheme, language, setLanguage, ... }) {
  // Doesn't use any of these!
  return (
    <Section
      user={user}
      setUser={setUser}
      theme={theme}
      setTheme={setTheme}
      language={language}
      setLanguage={setLanguage}
      ...
    />
  );
}

// ... continues through more levels
```

Problems:
• Hard to add new props (change many files)
• Hard to refactor components
• Unclear data flow
• Tight coupling
• Hard to test

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ SOLUTIONS: CONTEXT API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Context API solves prop drilling for shared state:

```javascript
// Create context
const UserContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Page />  {/* No props! */}
    </UserContext.Provider>
  );
}

function Page() {
  return <Section />;  {/* No props! */}
}

function Section() {
  return <Component />;  {/* No props! */}
}

function Component() {
  const { user } = useContext(UserContext);  // Direct access!
  return <div>{user?.name}</div>;
}
```

Multiple Contexts:
```javascript
const UserContext = createContext();
const ThemeContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        <Page />
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

function Component() {
  const { user } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);
  // Direct access, no prop drilling!
}
```

When to Use Context:
• Shared state across many components
• Deep nesting (3+ levels)
• Props unrelated to intermediate components
• State that changes infrequently

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ SOLUTIONS: COMPOSITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Composition avoids prop drilling by passing components as children:

```javascript
// ❌ Prop drilling
function App() {
  const [user, setUser] = useState(null);
  return <Layout user={user} setUser={setUser} />;
}

function Layout({ user, setUser }) {
  return <Header user={user} setUser={setUser} />;
}

// ✅ Composition: No prop drilling
function App() {
  const [user, setUser] = useState(null);
  return (
    <Layout>
      <Header>
        <UserMenu user={user} setUser={setUser} />
      </Header>
    </Layout>
  );
}

function Layout({ children }) {
  return <div className="layout">{children}</div>;
}

function Header({ children }) {
  return <header>{children}</header>;
}
```

Render Props Pattern:
```javascript
function DataProvider({ children, data }) {
  return children(data);  // Pass data directly to children
}

function App() {
  const [user, setUser] = useState(null);
  
  return (
    <DataProvider data={{ user, setUser }}>
      {({ user, setUser }) => (
        <Page>
          <Component user={user} setUser={setUser} />
        </Page>
      )}
    </DataProvider>
  );
}
```

When to Use Composition:
• UI structure, not state
• Flexible component arrangement
• Avoiding prop drilling for structure
• Building reusable containers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ SOLUTIONS: CUSTOM HOOKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Custom hooks can encapsulate logic and reduce prop drilling:

```javascript
// ❌ Prop drilling: Logic and state passed down
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  async function loadUser() {
    setLoading(true);
    const user = await fetchUser();
    setUser(user);
    setLoading(false);
  }
  
  return <Page user={user} loading={loading} loadUser={loadUser} />;
}

// ✅ Custom hook: Logic encapsulated
function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  async function loadUser() {
    setLoading(true);
    const user = await fetchUser();
    setUser(user);
    setLoading(false);
  }
  
  return { user, loading, loadUser };
}

function App() {
  return <Page />;  // No props!
}

function Page() {
  const { user, loading, loadUser } = useUser();  // Direct access
  return <Component user={user} loading={loading} loadUser={loadUser} />;
}
```

Combining with Context:
```javascript
const UserContext = createContext();

function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be in UserProvider');
  return context;
}

function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // ... logic
  
  return (
    <UserContext.Provider value={{ user, loading, loadUser }}>
      {children}
    </UserContext.Provider>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ DECISION MATRIX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When to Use Each Solution:

**Prop Drilling:**
• 1-2 levels deep
• 1-3 props
• Simple, stable structure
• Props are related

**Context API:**
• 3+ levels deep
• Shared state across many components
• State changes infrequently
• Props unrelated to intermediate components

**Composition:**
• UI structure, not state
• Flexible component arrangement
• Reusable containers
• Avoiding structure prop drilling

**Custom Hooks:**
• Encapsulating logic
• Reusable stateful logic
• Can combine with Context
• Reducing prop surface

Example Decision:
```javascript
// Scenario: User data needed 4 levels deep
// Solution: Context API

// Scenario: Layout structure
// Solution: Composition (children)

// Scenario: Complex form logic
// Solution: Custom hook

// Scenario: Theme for 2 levels
// Solution: Prop drilling (acceptable)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ REFACTORING PROP DRILLING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Identify the Problem
```javascript
// Identify: Many props, deep nesting
function App() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  return <A a={a} setA={setA} b={b} setB={setB} c={c} setC={setC} />;
}
```

Step 2: Choose Solution
```javascript
// Option 1: Context
const DataContext = createContext();

function App() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [c, setC] = useState(0);
  
  return (
    <DataContext.Provider value={{ a, setA, b, setB, c, setC }}>
      <A />
    </DataContext.Provider>
  );
}
```

Step 3: Update Components
```javascript
function A() {
  const { a, setA } = useContext(DataContext);
  return <B />;  // No props!
}
```

Step 4: Test
```javascript
// Ensure behavior is unchanged
// Test that components still work correctly
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ TRADE-OFFS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Prop Drilling:
✅ Pros:
• Simple and explicit
• Easy to see data flow
• No extra setup
• Good for shallow nesting

❌ Cons:
• Verbose for deep nesting
• Hard to maintain
• Tight coupling
• Hard to refactor

Context API:
✅ Pros:
• No prop drilling
• Centralized state
• Easy to access anywhere
• Good for shared state

❌ Cons:
• Can cause performance issues (if overused)
• Less explicit data flow
• Can be overkill for simple cases
• Harder to trace

Composition:
✅ Pros:
• Flexible
• Reusable
• No prop drilling for structure
• Better separation of concerns

❌ Cons:
• Doesn't solve state prop drilling
• Can be more complex
• Less explicit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Prop drilling is passing props through unused intermediate components
2. Acceptable for shallow nesting (1-2 levels) and few props
3. Technical debt for deep nesting (3+ levels) and many props
4. Context API solves prop drilling for shared state
5. Composition solves prop drilling for UI structure
6. Custom hooks encapsulate logic and reduce prop surface
7. Choose solution based on use case
8. Refactor when prop drilling becomes hard to maintain
9. Consider trade-offs of each approach
10. Balance simplicity with maintainability

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Prop drilling is always bad"
✅ Acceptable for shallow nesting and few props

❌ "I should always use Context"
✅ Context can cause performance issues; use when needed

❌ "Composition solves all prop drilling"
✅ Composition solves structure, not state prop drilling

❌ "I'll refactor later"
✅ Refactor when it becomes hard to maintain

❌ "More Context is always better"
✅ Too much Context can hurt performance and clarity

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "What is prop drilling?":

✅ DO Explain:
• "Passing props through components that don't use them"
• "Acceptable for shallow nesting (1-2 levels)"
• "Technical debt for deep nesting (3+ levels)"
• "Solutions: Context API, composition, custom hooks"
• "Choose based on use case"

When asked "When is prop drilling okay?":

✅ DO Explain:
• "Shallow nesting (1-2 levels)"
• "Few props (1-3)"
• "Related props"
• "Simple, stable structure"
• "When it's clearer than alternatives"

Advanced Answer:
"Prop drilling is passing props through intermediate components that don't use them.
It's acceptable for shallow nesting (1-2 levels) with few related props, but becomes
technical debt with deep nesting (3+ levels) or many props. Solutions include Context
API for shared state, composition for UI structure, and custom hooks for logic. The
choice depends on the use case: Context for shared state across many components,
composition for flexible structure, and prop drilling for simple, shallow cases."
