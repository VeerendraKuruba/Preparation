🔹 LIFTING STATE UP VS. COMPONENT COMPOSITION

Two fundamental patterns for sharing state and behavior in React. Understanding when
to use each approach is crucial for building maintainable React applications.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ LIFTING STATE UP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lifting state up means moving state from a child component to a common ancestor so
multiple components can share it.

Basic Example:
```javascript
// ❌ State in child (can't share)
function TemperatureInput() {
  const [temperature, setTemperature] = useState('');
  return <input value={temperature} onChange={e => setTemperature(e.target.value)} />;
}

// ✅ State lifted up (can share)
function Calculator() {
  const [temperature, setTemperature] = useState('');
  
  return (
    <div>
      <TemperatureInput value={temperature} onChange={setTemperature} />
      <TemperatureDisplay value={temperature} />
    </div>
  );
}

function TemperatureInput({ value, onChange }) {
  return <input value={value} onChange={e => onChange(e.target.value)} />;
}
```

Why Lift State:
• Multiple components need the same state
• Components need to stay in sync
• Need single source of truth
• Need to coordinate between siblings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ COMPONENT COMPOSITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Component composition means building complex UIs by combining simpler components
using props.children or render props, avoiding prop drilling.

Basic Example:
```javascript
// ❌ Prop drilling (passing through many levels)
function App() {
  const [user, setUser] = useState(null);
  return <Layout user={user} setUser={setUser} />;
}

function Layout({ user, setUser }) {
  return <Header user={user} setUser={setUser} />;
}

function Header({ user, setUser }) {
  return <UserMenu user={user} setUser={setUser} />;
}

// ✅ Composition (no prop drilling)
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
```

Composition Patterns:
• **children prop**: Pass components as children
• **render props**: Pass functions that return JSX
• **component prop**: Pass component type
• **slots**: Named children areas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ CHILDREN PROP PATTERN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pass components as children to avoid prop drilling:

```javascript
// Generic container component
function Container({ children, title }) {
  return (
    <div className="container">
      {title && <h2>{title}</h2>}
      {children}
    </div>
  );
}

// Usage: No prop drilling needed
function App() {
  return (
    <Container title="Dashboard">
      <UserProfile />
      <Settings />
    </Container>
  );
}
```

Multiple Children Areas (Slots):
```javascript
function Layout({ header, sidebar, main, footer }) {
  return (
    <div className="layout">
      <header>{header}</header>
      <aside>{sidebar}</aside>
      <main>{main}</main>
      <footer>{footer}</footer>
    </div>
  );
}

function App() {
  return (
    <Layout
      header={<Header />}
      sidebar={<Sidebar />}
      main={<MainContent />}
      footer={<Footer />}
    />
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ RENDER PROPS PATTERN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pass a function that returns JSX to share logic:

```javascript
// Component with shared logic
function MouseTracker({ render }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    function handleMouseMove(e) {
      setPosition({ x: e.clientX, y: e.clientY });
    }
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  return render(position);
}

// Usage: No state lifting needed
function App() {
  return (
    <MouseTracker
      render={({ x, y }) => (
        <div>
          Mouse at: {x}, {y}
        </div>
      )}
    />
  );
}
```

Modern Alternative (Custom Hooks):
```javascript
// Custom hook (better than render props)
function useMousePosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    function handleMouseMove(e) {
      setPosition({ x: e.clientX, y: e.clientY });
    }
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
  return position;
}

// Usage: Cleaner
function App() {
  const { x, y } = useMousePosition();
  return <div>Mouse at: {x}, {y}</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ WHEN TO LIFT STATE UP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Lift State When:
• Multiple components need the same state
• Sibling components need to stay in sync
• You need a single source of truth
• State needs to be coordinated

Example: Temperature Converter
```javascript
function Calculator() {
  // State lifted to common ancestor
  const [celsius, setCelsius] = useState(0);
  const [fahrenheit, setFahrenheit] = useState(32);
  
  function handleCelsiusChange(value) {
    setCelsius(value);
    setFahrenheit(value * 9/5 + 32);
  }
  
  function handleFahrenheitChange(value) {
    setFahrenheit(value);
    setCelsius((value - 32) * 5/9);
  }
  
  return (
    <div>
      <TemperatureInput
        scale="celsius"
        value={celsius}
        onChange={handleCelsiusChange}
      />
      <TemperatureInput
        scale="fahrenheit"
        value={fahrenheit}
        onChange={handleFahrenheitChange}
      />
    </div>
  );
}
```

Example: Shopping Cart
```javascript
function ShoppingApp() {
  // State lifted: cart shared by multiple components
  const [cart, setCart] = useState([]);
  
  return (
    <div>
      <ProductList cart={cart} setCart={setCart} />
      <CartSummary cart={cart} />
      <CheckoutButton cart={cart} />
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ WHEN TO USE COMPOSITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Use Composition When:
• Avoiding prop drilling
• Building flexible, reusable components
• Creating generic containers
• Sharing UI structure, not state
• Need more flexibility than lifting state

Example: Modal Component
```javascript
// Generic modal (composition)
function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// Usage: Flexible content
function App() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <h2>Custom Title</h2>
        <p>Any content here</p>
        <button>Custom Action</button>
      </Modal>
    </>
  );
}
```

Example: Form Layout
```javascript
// Generic form container
function Form({ onSubmit, children }) {
  return (
    <form onSubmit={onSubmit}>
      <fieldset>
        {children}
      </fieldset>
    </form>
  );
}

// Usage: Compose form fields
function App() {
  return (
    <Form onSubmit={handleSubmit}>
      <Input name="email" />
      <Input name="password" />
      <Button type="submit">Submit</Button>
    </Form>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ COMBINING BOTH APPROACHES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You can combine lifting state with composition:

```javascript
function App() {
  // State lifted up
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  
  return (
    // Composition: Flexible layout
    <ThemeProvider theme={theme}>
      <Layout>
        <Header>
          <UserMenu user={user} onLogout={() => setUser(null)} />
          <ThemeToggle theme={theme} onChange={setTheme} />
        </Header>
        <Main>
          {user ? <Dashboard user={user} /> : <Login onLogin={setUser} />}
        </Main>
      </Layout>
    </ThemeProvider>
  );
}
```

Example: Data Provider with Composition
```javascript
// Context for state (lifting)
function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

// Composition for layout
function App() {
  return (
    <UserProvider>
      <Layout>
        <Header />
        <Main />
        <Footer />
      </Layout>
    </UserProvider>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ PROP DRILLING PROBLEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Prop drilling: Passing props through many levels:

```javascript
// ❌ Prop drilling
function App() {
  const [user, setUser] = useState(null);
  return <Page user={user} setUser={setUser} />;
}

function Page({ user, setUser }) {
  return <Section user={user} setUser={setUser} />;
}

function Section({ user, setUser }) {
  return <Component user={user} setUser={setUser} />;
}

function Component({ user, setUser }) {
  return <div>{user?.name}</div>;  // Finally used here
}
```

Solutions:
1. **Context API** (for state)
```javascript
const UserContext = createContext();

function App() {
  const [user, setUser] = useState(null);
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Page />
    </UserContext.Provider>
  );
}

function Component() {
  const { user } = useContext(UserContext);
  return <div>{user?.name}</div>;
}
```

2. **Composition** (for structure)
```javascript
function App() {
  return (
    <Layout>
      <Header />
      <Main>
        <Component />  {/* No props needed */}
      </Main>
    </Layout>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ TRADE-OFFS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Lifting State Up:
✅ Pros:
• Single source of truth
• Easy to keep components in sync
• Predictable data flow
• Good for shared state

❌ Cons:
• Can cause prop drilling
• State might be far from where it's used
• More re-renders (state changes affect many components)
• Less flexible

Composition:
✅ Pros:
• Avoids prop drilling
• More flexible and reusable
• Better separation of concerns
• Easier to test

❌ Cons:
• Can be harder to share state
• Might need Context API for state
• Can be more complex for beginners

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Lifting state: Move state to common ancestor for sharing
2. Composition: Build UIs by combining components (children, render props)
3. Lift state when multiple components need same state
4. Use composition to avoid prop drilling
5. Children prop: Pass components as children
6. Render props: Pass functions that return JSX
7. Custom hooks often better than render props
8. Can combine both approaches
9. Context API solves prop drilling for state
10. Choose based on needs: state sharing vs flexibility

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "I should always lift state to the top"
✅ Only lift state when multiple components need it

❌ "Composition is only for UI structure"
✅ Composition can also share logic (render props, custom hooks)

❌ "Prop drilling is always bad"
✅ Prop drilling is fine for 2-3 levels; use Context for deeper

❌ "I can't use both patterns together"
✅ Often best to combine: lift state, use composition for structure

❌ "Render props are outdated"
✅ Custom hooks are preferred, but render props still work

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "What is lifting state up?":

✅ DO Explain:
• "Moving state from child to common ancestor"
• "Allows multiple components to share state"
• "Single source of truth"
• "Used when siblings need to stay in sync"
• "Can cause prop drilling if overused"

When asked "What is component composition?":

✅ DO Explain:
• "Building complex UIs from simpler components"
• "Using children prop or render props"
• "Avoids prop drilling"
• "More flexible and reusable"
• "Better separation of concerns"

Advanced Answer:
"Lifting state up moves state from a child component to a common ancestor so multiple
components can share it. This is useful when siblings need to stay in sync or when
you need a single source of truth. Component composition builds UIs by combining
simpler components using children or render props, avoiding prop drilling and creating
more flexible, reusable components. Often you combine both: lift state for shared
data, use composition for UI structure. Context API can also help with prop drilling
for state."
