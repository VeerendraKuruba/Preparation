🔹 RULES OF HOOKS AND HOW THEY ARE MAPPED INTERNALLY

React Hooks have strict rules that must be followed. Understanding why these rules
exist and how React internally maps hooks is crucial for debugging and writing
correct React code.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ THE RULES OF HOOKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Rule 1: Only call hooks at the top level**
• Don't call hooks inside loops, conditions, or nested functions
• Always call hooks in the same order

**Rule 2: Only call hooks from React functions**
• Call hooks from React function components
• Call hooks from custom hooks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ RULE 1: TOP LEVEL ONLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ WRONG: Conditional Hook
```javascript
function Component({ condition }) {
  if (condition) {
    const [state, setState] = useState(0);  // ❌ Violates rules
  }
  return <div>Content</div>;
}
```

✅ CORRECT: Always Call Hooks
```javascript
function Component({ condition }) {
  const [state, setState] = useState(0);  // ✅ Always called
  
  if (condition) {
    // Use state here
  }
  
  return <div>Content</div>;
}
```

❌ WRONG: Hook in Loop
```javascript
function Component({ items }) {
  const states = [];
  for (let i = 0; i < items.length; i++) {
    states.push(useState(0));  // ❌ Violates rules
  }
  return <div>Content</div>;
}
```

✅ CORRECT: Fixed Number of Hooks
```javascript
function Component({ items }) {
  const [state1, setState1] = useState(0);
  const [state2, setState2] = useState(0);
  // Fixed number of hooks
  
  return <div>Content</div>;
}
```

❌ WRONG: Hook in Nested Function
```javascript
function Component() {
  function handleClick() {
    const [state, setState] = useState(0);  // ❌ Violates rules
  }
  return <button onClick={handleClick}>Click</button>;
}
```

✅ CORRECT: Hook at Top Level
```javascript
function Component() {
  const [state, setState] = useState(0);  // ✅ Top level
  
  function handleClick() {
    setState(s => s + 1);  // ✅ Can call setState
  }
  
  return <button onClick={handleClick}>Click</button>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ RULE 2: ONLY FROM REACT FUNCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ WRONG: Hook in Regular Function
```javascript
function regularFunction() {
  const [state, setState] = useState(0);  // ❌ Not a React component
  return state;
}
```

✅ CORRECT: Hook in Component
```javascript
function Component() {
  const [state, setState] = useState(0);  // ✅ React component
  return <div>{state}</div>;
}
```

✅ CORRECT: Hook in Custom Hook
```javascript
function useCustomHook() {
  const [state, setState] = useState(0);  // ✅ Custom hook
  return [state, setState];
}

function Component() {
  const [state, setState] = useCustomHook();  // ✅ Using custom hook
  return <div>{state}</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ WHY THESE RULES EXIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React uses a linked list to store hook state. The order matters!

```javascript
// First render
function Component() {
  const [name, setName] = useState('');      // Hook 0
  const [age, setAge] = useState(0);          // Hook 1
  const [email, setEmail] = useState('');     // Hook 2
}

// React internally stores:
// Component.hooks = [
//   { state: '', setState: ... },  // Hook 0
//   { state: 0, setState: ... },   // Hook 1
//   { state: '', setState: ... }   // Hook 2
// ]
```

If hooks are called conditionally:
```javascript
// First render (condition = true)
function Component({ condition }) {
  if (condition) {
    const [name, setName] = useState('');     // Hook 0
  }
  const [age, setAge] = useState(0);          // Hook 1
}

// React stores:
// Component.hooks = [
//   { state: '', setState: ... },  // Hook 0
//   { state: 0, setState: ... }   // Hook 1
// ]

// Second render (condition = false)
function Component({ condition }) {
  if (condition) {
    // Skipped!
  }
  const [age, setAge] = useState(0);          // Hook 0? ❌ Wrong!
}

// React tries to read:
// Component.hooks[0] → expects name, but gets age! ❌
// Component.hooks[1] → undefined! ❌
```

The order must be consistent:
```javascript
// ✅ Always same order
function Component({ condition }) {
  const [name, setName] = useState('');       // Always Hook 0
  const [age, setAge] = useState(0);          // Always Hook 1
  
  if (condition) {
    // Use name or age
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ HOW REACT MAPS HOOKS INTERNALLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React uses a linked list structure to store hooks:

```javascript
// Simplified React internals
let currentFiber = null;
let hookIndex = 0;

function useState(initialValue) {
  const fiber = currentFiber;
  const hookIndexAtCall = hookIndex;
  hookIndex++;
  
  // First render: create hook
  if (!fiber.hooks) {
    fiber.hooks = [];
  }
  
  if (fiber.hooks[hookIndexAtCall] === undefined) {
    // First render: initialize
    fiber.hooks[hookIndexAtCall] = {
      state: initialValue,
      queue: [],  // Pending updates
    };
  }
  
  const hook = fiber.hooks[hookIndexAtCall];
  
  // Process pending updates
  hook.queue.forEach(update => {
    hook.state = update(hook.state);
  });
  hook.queue = [];
  
  const setState = (newState) => {
    hook.queue.push(
      typeof newState === 'function' ? newState : () => newState
    );
    // Schedule re-render
    scheduleUpdate(fiber);
  };
  
  return [hook.state, setState];
}
```

How It Works:
```javascript
function Component() {
  // Render starts
  currentFiber = ComponentFiber;
  hookIndex = 0;
  
  const [a, setA] = useState(0);  // hookIndex: 0 → 1
  const [b, setB] = useState(''); // hookIndex: 1 → 2
  const [c, setC] = useState({});  // hookIndex: 2 → 3
  
  // Render ends
  // ComponentFiber.hooks = [
  //   { state: 0, queue: [] },    // Index 0
  //   { state: '', queue: [] },   // Index 1
  //   { state: {}, queue: [] }    // Index 2
  // ]
}
```

On Re-render:
```javascript
function Component() {
  // Re-render starts
  currentFiber = ComponentFiber;
  hookIndex = 0;
  
  const [a, setA] = useState(0);  // Reads hooks[0]
  const [b, setB] = useState(''); // Reads hooks[1]
  const [c, setC] = useState({}); // Reads hooks[2]
  
  // Same order = correct mapping!
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ CUSTOM HOOKS AND HOOK ORDER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Custom hooks must also follow the rules:

```javascript
function useCounter(initialValue) {
  const [count, setCount] = useState(initialValue);  // Hook in custom hook
  const increment = () => setCount(c => c + 1);
  return [count, increment];
}

function Component() {
  const [count, increment] = useCounter(0);  // Uses hook internally
  const [name, setName] = useState('');      // Next hook
  
  // React sees:
  // Hook 0: useState from useCounter
  // Hook 1: useState for name
}
```

Nested Custom Hooks:
```javascript
function useAuth() {
  const [user, setUser] = useState(null);      // Hook 0
  const [loading, setLoading] = useState(true); // Hook 1
  return { user, loading };
}

function useProfile() {
  const [profile, setProfile] = useState(null); // Hook 0 (in useProfile scope)
  return profile;
}

function Component() {
  const auth = useAuth();        // Hooks 0, 1
  const profile = useProfile();  // Hooks 2
  const [count, setCount] = useState(0); // Hook 3
  
  // Total: 4 hooks in consistent order
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ COMMON VIOLATIONS AND FIXES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Violation 1: Conditional Hook
```javascript
// ❌ WRONG
function Component({ show }) {
  if (show) {
    const [state, setState] = useState(0);
  }
  return <div>Content</div>;
}

// ✅ FIX: Always call hook
function Component({ show }) {
  const [state, setState] = useState(0);
  return show ? <div>{state}</div> : null;
}
```

Violation 2: Hook in Loop
```javascript
// ❌ WRONG
function Component({ items }) {
  return items.map(item => {
    const [state, setState] = useState(0);  // Different number each render
    return <div key={item.id}>{state}</div>;
  });
}

// ✅ FIX: Move state up
function Component({ items }) {
  const [states, setStates] = useState({});
  return items.map(item => (
    <div key={item.id}>{states[item.id] || 0}</div>
  ));
}
```

Violation 3: Hook in Event Handler
```javascript
// ❌ WRONG
function Component() {
  function handleClick() {
    const [state, setState] = useState(0);  // Not top level
  }
  return <button onClick={handleClick}>Click</button>;
}

// ✅ FIX: Hook at top level
function Component() {
  const [state, setState] = useState(0);
  function handleClick() {
    setState(s => s + 1);  // Use setState, not useState
  }
  return <button onClick={handleClick}>Click</button>;
}
```

Violation 4: Early Return Before Hook
```javascript
// ❌ WRONG
function Component({ data }) {
  if (!data) return null;
  const [state, setState] = useState(0);  // Not always called
  return <div>{state}</div>;
}

// ✅ FIX: Hook before return
function Component({ data }) {
  const [state, setState] = useState(0);
  if (!data) return null;
  return <div>{state}</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ ESLINT RULE: react-hooks/rules-of-hooks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React provides an ESLint plugin to catch violations:

```json
// .eslintrc.json
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

The plugin catches:
• Hooks in conditions
• Hooks in loops
• Hooks in nested functions
• Hooks called from non-React functions

Example Error:
```javascript
function Component({ condition }) {
  if (condition) {
    useState(0);  // ❌ ESLint error: React Hook "useState" is called conditionally
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ HOW HOOKS WORK WITH FIBER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hooks are stored on the Fiber node:

```javascript
// Fiber structure (simplified)
const fiber = {
  type: Component,
  memoizedState: null,  // Linked list of hooks
  // ...
};

// Hook structure
const hook = {
  memoizedState: currentState,  // Current state value
  baseState: initialState,      // Base state
  baseQueue: null,              // Base update queue
  queue: null,                  // Pending updates
  next: null,                   // Next hook in list
};
```

Hook Linked List:
```javascript
function Component() {
  const [a, setA] = useState(0);      // Hook 1
  const [b, setB] = useState('');    // Hook 2
  useEffect(() => {}, []);           // Hook 3
  const [c, setC] = useState({});    // Hook 4
  
  // Fiber.memoizedState points to:
  // Hook1 → Hook2 → Hook3 → Hook4 → null
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Hooks must be called in the same order every render
2. Hooks must be called at the top level (not in conditions/loops)
3. Hooks can only be called from React components or custom hooks
4. React uses a linked list to store hook state
5. Hook order matters because React maps by index
6. Conditional hooks break the mapping
7. ESLint plugin catches violations
8. Understanding this helps debug hook-related bugs
9. Custom hooks must also follow the rules
10. Early returns must come after all hooks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "I can call hooks conditionally if I'm careful"
✅ Hooks must always be called in the same order

❌ "Custom hooks don't need to follow the rules"
✅ Custom hooks must follow the same rules

❌ "Early return before hooks is fine"
✅ All hooks must be called before any returns

❌ "Hooks in event handlers are okay"
✅ Hooks must be at component top level

❌ "React will figure out the hook order"
✅ React relies on consistent order; it can't figure it out

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "Why do hooks have these rules?":

✅ DO Explain:
• "React uses a linked list to store hook state"
• "Hooks are mapped by call order, not by name"
• "Conditional hooks break the mapping"
• "Same order every render is required"
• "This enables React to correctly associate state with hooks"

Advanced Answer:
"React stores hooks in a linked list on the Fiber node. Each hook is accessed by its
index in the call order. If hooks are called conditionally or in loops, the order
changes between renders, causing React to read the wrong hook's state. For example,
if a hook is skipped on the second render, all subsequent hooks shift indices,
leading to state being associated with the wrong hook. This is why hooks must be
called in the same order every render and at the top level of the component."
