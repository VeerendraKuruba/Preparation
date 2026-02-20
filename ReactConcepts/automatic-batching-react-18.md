🔹 AUTOMATIC BATCHING IN REACT 18+

React 18 automatically batches state updates for better performance. Understanding
how batching works and when it happens is crucial for writing efficient React code.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS BATCHING?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Batching is grouping multiple state updates into a single re-render. Instead of
rendering after each update, React batches them together.

Example:
```javascript
function Component() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  
  function handleClick() {
    setCount(1);      // Update 1
    setName('React'); // Update 2
    
    // Without batching: 2 re-renders
    // With batching: 1 re-render (both updates together)
  }
}
```

Why Batching Matters:
• Fewer re-renders = better performance
• Prevents unnecessary intermediate renders
• Smoother UI updates
• More efficient DOM updates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ REACT 17 VS REACT 18 BATCHING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**React 17: Limited Batching**
```javascript
function Component() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  
  function handleClick() {
    // ✅ Batched: Event handler
    setCount(1);
    setName('React');
    // Result: 1 re-render
  }
  
  useEffect(() => {
    // ❌ NOT batched: Async code
    fetch('/api').then(() => {
      setCount(1);      // Re-render 1
      setName('React'); // Re-render 2
      // Result: 2 re-renders!
    });
  }, []);
}
```

**React 18: Automatic Batching**
```javascript
function Component() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  
  function handleClick() {
    // ✅ Batched: Event handler
    setCount(1);
    setName('React');
    // Result: 1 re-render
  }
  
  useEffect(() => {
    // ✅ NOW batched: Async code
    fetch('/api').then(() => {
      setCount(1);      // Batched!
      setName('React'); // Batched!
      // Result: 1 re-render!
    });
  }, []);
  
  setTimeout(() => {
    // ✅ NOW batched: Timers
    setCount(1);
    setName('React');
    // Result: 1 re-render!
  }, 1000);
}
```

Key Difference:
• React 17: Only batched in event handlers
• React 18: Batches everywhere (promises, timeouts, native handlers)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ WHAT GETS BATCHED IN REACT 18
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React 18 batches updates in:

**1. Event Handlers**
```javascript
function handleClick() {
  setA(1);  // Batched
  setB(2);  // Batched
  setC(3);  // Batched
  // 1 re-render
}
```

**2. Async Code (Promises)**
```javascript
fetch('/api').then(() => {
  setA(1);  // Batched
  setB(2);  // Batched
  // 1 re-render
});
```

**3. Timers**
```javascript
setTimeout(() => {
  setA(1);  // Batched
  setB(2);  // Batched
  // 1 re-render
}, 1000);
```

**4. Native Event Handlers**
```javascript
element.addEventListener('click', () => {
  setA(1);  // Batched
  setB(2);  // Batched
  // 1 re-render
});
```

**5. useEffect**
```javascript
useEffect(() => {
  setA(1);  // Batched
  setB(2);  // Batched
  // 1 re-render
}, []);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ HOW BATCHING WORKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React batches updates by:
1. Collecting all updates in a batch
2. Processing them together
3. Performing a single re-render

Internal Flow:
```javascript
// User clicks button
handleClick() {
  setCount(1);    // Added to batch
  setName('New'); // Added to batch
  setTheme('dark'); // Added to batch
}

// React internally:
// 1. Collect updates: [count=1, name='New', theme='dark']
// 2. Process batch: Update all state
// 3. Single re-render with all updates
```

Timing:
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  function handleClick() {
    setCount(1);
    console.log(count);  // Still 0! (batching)
    
    // After batching completes:
    // count = 1
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ OPTING OUT OF BATCHING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sometimes you need updates to happen immediately. Use `flushSync`:

```javascript
import { flushSync } from 'react-dom';

function Component() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  
  function handleClick() {
    // Force immediate update
    flushSync(() => {
      setCount(1);
    });
    
    // count is now 1 (synchronously updated)
    console.log(count);  // 1
    
    // This is still batched
    setName('New');
  }
}
```

When to Use flushSync:
• Need to read DOM after update
• Need synchronous updates
• Third-party library requires immediate updates
• Rare cases where batching causes issues

Example: Reading DOM
```javascript
import { flushSync } from 'react-dom';

function Component() {
  const [count, setCount] = useState(0);
  const divRef = useRef();
  
  function handleClick() {
    flushSync(() => {
      setCount(1);
    });
    
    // DOM is updated, can read it
    console.log(divRef.current.textContent);  // "1"
  }
  
  return <div ref={divRef}>{count}</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ BATCHING WITH FUNCTIONAL UPDATES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Functional updates work with batching:

```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  function handleClick() {
    // All batched together
    setCount(prev => prev + 1);  // 0 → 1
    setCount(prev => prev + 1);  // 1 → 2
    setCount(prev => prev + 1);  // 2 → 3
    
    // Result: count = 3 (all in one render)
  }
}
```

Multiple Updates:
```javascript
function Component() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  
  function handleClick() {
    // Batched: All updates together
    setA(prev => prev + 1);
    setB(prev => prev + 1);
    setA(prev => prev + 1);
    setB(prev => prev + 1);
    
    // Result: a = 2, b = 2 (1 re-render)
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ BATCHING IN ASYNC CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React 18 batches updates in async code:

```javascript
function Component() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  async function fetchData() {
    setLoading(true);
    setError(null);
    
    try {
      const result = await fetch('/api/data');
      const json = await result.json();
      
      // ✅ All batched in React 18
      setData(json);
      setLoading(false);
      setError(null);
      // 1 re-render (not 3!)
    } catch (err) {
      // ✅ All batched
      setError(err);
      setLoading(false);
      // 1 re-render
    }
  }
}
```

Promise Chains:
```javascript
function Component() {
  const [step, setStep] = useState(0);
  
  function handleAsync() {
    Promise.resolve()
      .then(() => {
        setStep(1);  // Batched
        setStep(2);  // Batched
      })
      .then(() => {
        setStep(3);  // Batched
        setStep(4);  // Batched
      });
    
    // Result: Multiple batches, but each batch is optimized
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ PERFORMANCE BENEFITS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Batching improves performance:

**Fewer Re-renders:**
```javascript
// Without batching: 3 re-renders
setA(1);  // Render 1
setB(2);  // Render 2
setC(3);  // Render 3

// With batching: 1 re-render
setA(1);  // Batched
setB(2);  // Batched
setC(3);  // Batched
// Render once
```

**Fewer DOM Updates:**
```javascript
// Without batching: 3 DOM updates
// With batching: 1 DOM update (all changes together)
```

**Better User Experience:**
• Smoother animations
• Less flickering
• Faster updates
• More responsive UI

Example: Form Submission
```javascript
function Form() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  async function handleSubmit() {
    // ✅ All batched in React 18
    setSubmitting(true);
    setName('');
    setEmail('');
    
    await submitForm();
    
    setSubmitting(false);
    // Fewer re-renders = better performance
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ EDGE CASES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Edge Case 1: Nested Updates
```javascript
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // Updates triggered by effect are batched
    setCount(1);
    setCount(2);
    // 1 re-render
  }, []);
}
```

Edge Case 2: Multiple Event Handlers
```javascript
function Component() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  
  function handleA() {
    setA(1);  // Batched separately
  }
  
  function handleB() {
    setB(1);  // Batched separately
  }
  
  // If both called quickly, might be batched together
  // Depends on timing
}
```

Edge Case 3: Third-Party Libraries
```javascript
// Some libraries might not benefit from batching
// If they use flushSync or synchronous updates
function Component() {
  useEffect(() => {
    // Third-party library updates
    thirdPartyLib.update();
    // Might not be batched if library uses flushSync
  }, []);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Batching groups multiple state updates into one re-render
2. React 18 batches everywhere (not just event handlers)
3. Works in promises, timeouts, native handlers, effects
4. Improves performance by reducing re-renders
5. Use flushSync to opt out when needed
6. Functional updates work with batching
7. Better performance and UX
8. Automatic - no code changes needed
9. React 17 only batched in event handlers
10. React 18 makes batching universal

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Batching doesn't work in async code"
✅ React 18 batches in async code (promises, timeouts)

❌ "I need to manually batch updates"
✅ Batching is automatic in React 18

❌ "flushSync is always better"
✅ Only use flushSync when you need synchronous updates

❌ "Batching breaks my code"
✅ Batching is transparent; if it breaks, you likely have a bug

❌ "React 17 and 18 batching are the same"
✅ React 18 batches everywhere; React 17 only in event handlers

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "What is automatic batching in React 18?":

✅ DO Explain:
• "Groups multiple state updates into one re-render"
• "Works everywhere: event handlers, promises, timeouts, effects"
• "Improves performance by reducing re-renders"
• "Automatic - no code changes needed"
• "React 17 only batched in event handlers"

When asked "How does it differ from React 17?":

✅ DO Explain:
• "React 17: Only batched in event handlers"
• "React 18: Batches everywhere (async code, timers, etc.)"
• "Better performance in React 18"
• "More consistent behavior"

Advanced Answer:
"Automatic batching in React 18 groups multiple state updates into a single re-render,
improving performance. Unlike React 17 which only batched updates in event handlers,
React 18 batches updates everywhere: in promises, timeouts, native event handlers, and
effects. This means multiple setState calls in async code result in one re-render instead
of multiple, leading to better performance and smoother UI updates. You can opt out using
flushSync if you need synchronous updates, but this is rarely necessary."
