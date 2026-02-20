🔹 DERIVED STATE VS. STORED STATE

Understanding when to compute state on-the-fly (derived) versus storing it explicitly
is crucial for writing efficient and maintainable React code.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS DERIVED STATE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Derived state is computed from other state or props, not stored separately.

Example:
```javascript
function Component({ items }) {
  // ✅ Derived: Computed from props
  const count = items.length;
  const total = items.reduce((sum, item) => sum + item.price, 0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <p>Total: ${total}</p>
    </div>
  );
}
```

Characteristics:
• Computed on-the-fly
• Always in sync with source
• No separate state management
• Single source of truth

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ WHAT IS STORED STATE?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Stored state is explicitly stored in state, even if it could be derived.

Example:
```javascript
function Component({ items }) {
  // ❌ Stored: Redundant with items
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  
  useEffect(() => {
    setCount(items.length);
    setTotal(items.reduce((sum, item) => sum + item.price, 0));
  }, [items]);
  
  return (
    <div>
      <p>Count: {count}</p>
      <p>Total: ${total}</p>
    </div>
  );
}
```

Problems:
• Can get out of sync
• More code to maintain
• Potential for bugs
• Unnecessary re-renders

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ WHEN TO USE DERIVED STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Use Derived State When:
• Can be computed from props/state
• Computation is cheap
• Always should match source
• No need for independent updates

Example: Simple Calculations
```javascript
function Cart({ items }) {
  // ✅ Derived: Simple calculation
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const itemCount = items.length;
  
  return (
    <div>
      <p>{itemCount} items</p>
      <p>Total: ${total}</p>
    </div>
  );
}
```

Example: Filtered Lists
```javascript
function TodoList({ todos, filter }) {
  // ✅ Derived: Filtered list
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });
  
  return (
    <ul>
      {filteredTodos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

Example: Formatted Values
```javascript
function PriceDisplay({ amount, currency }) {
  // ✅ Derived: Formatted value
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
  
  return <div>{formatted}</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ WHEN TO USE STORED STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Use Stored State When:
• Can't be computed from other state
• Needs independent updates
• Expensive to compute (memoize)
• User can modify it independently

Example: User Input
```javascript
function SearchBox({ onSearch }) {
  // ✅ Stored: User input, can't be derived
  const [query, setQuery] = useState('');
  
  return (
    <input
      value={query}
      onChange={e => setQuery(e.target.value)}
      onKeyPress={e => e.key === 'Enter' && onSearch(query)}
    />
  );
}
```

Example: Independent Toggle
```javascript
function Component({ items }) {
  // ✅ Stored: Independent of items
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div>
      <button onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>
      {isExpanded && <ItemsList items={items} />}
    </div>
  );
}
```

Example: Expensive Computation (Memoized)
```javascript
function Component({ data }) {
  // ✅ Stored (memoized): Expensive computation
  const processed = useMemo(
    () => expensiveProcessing(data),
    [data]
  );
  
  return <div>{processed.result}</div>;
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ COMMON ANTI-PATTERN: REDUNDANT STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Storing state that can be derived causes bugs:

```javascript
// ❌ Anti-pattern: Redundant state
function Component({ items }) {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    setCount(items.length);  // Can get out of sync!
  }, [items]);
  
  // Problem: If items change outside useEffect, count is wrong
  return <div>Count: {count}</div>;
}

// ✅ Correct: Derived state
function Component({ items }) {
  const count = items.length;  // Always correct
  return <div>Count: {count}</div>;
}
```

Another Example:
```javascript
// ❌ Anti-pattern: Storing derived value
function TodoList({ todos }) {
  const [completedCount, setCompletedCount] = useState(0);
  
  useEffect(() => {
    setCompletedCount(todos.filter(t => t.completed).length);
  }, [todos]);
  
  // Can get out of sync if todos updated directly
}

// ✅ Correct: Derived
function TodoList({ todos }) {
  const completedCount = todos.filter(t => t.completed).length;
  // Always in sync
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ USE MEMO FOR EXPENSIVE DERIVATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For expensive derivations, use useMemo:

```javascript
function Component({ items }) {
  // ❌ Problem: Recomputes every render
  const sorted = items.sort((a, b) => b.price - a.price);
  const filtered = sorted.filter(item => item.inStock);
  
  // ✅ Solution: Memoize expensive computation
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.price - a.price),
    [items]
  );
  
  const filtered = useMemo(
    () => sorted.filter(item => item.inStock),
    [sorted]
  );
  
  return <div>{filtered.length} items</div>;
}
```

When to Memoize:
• Expensive computations (sorting, filtering large arrays)
• Complex calculations
• Creating objects/arrays for props
• Preventing unnecessary recalculations

When Not to Memoize:
• Simple calculations (a + b)
• Already fast operations
• Overhead exceeds benefit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ DECISION GUIDE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ask These Questions:

**1. Can it be computed from other state/props?**
• Yes → Derived state
• No → Stored state

**2. Does it need independent updates?**
• Yes → Stored state
• No → Derived state

**3. Is computation expensive?**
• Yes → Derived with useMemo
• No → Simple derived

**4. Can it get out of sync?**
• Yes → Derived state (always in sync)
• No → Either works

Examples:
```javascript
// items.length → Derived (can compute)
// User input → Stored (can't compute)
// Filtered list → Derived (can compute, memoize if expensive)
// Toggle state → Stored (independent)
// Formatted date → Derived (can compute)
// Selected item → Stored (user choice)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ PRACTICAL EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Example 1: Shopping Cart
```javascript
function Cart({ items }) {
  // ✅ Derived: Can compute from items
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  
  // ✅ Stored: User choice
  const [shipping, setShipping] = useState('standard');
  
  const shippingCost = shipping === 'express' ? 10 : 5;
  const finalTotal = total + shippingCost;
  
  return (
    <div>
      <p>Subtotal: ${subtotal}</p>
      <p>Tax: ${tax}</p>
      <select value={shipping} onChange={e => setShipping(e.target.value)}>
        <option value="standard">Standard ($5)</option>
        <option value="express">Express ($10)</option>
      </select>
      <p>Total: ${finalTotal}</p>
    </div>
  );
}
```

Example 2: Search and Filter
```javascript
function ProductList({ products }) {
  // ✅ Stored: User input
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  
  // ✅ Derived: Filtered list (memoized if expensive)
  const filtered = useMemo(
    () => products.filter(product => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory = category === 'all' || product.category === category;
      return matchesSearch && matchesCategory;
    }),
    [products, searchQuery, category]
  );
  
  return (
    <div>
      <input
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
      />
      <select value={category} onChange={e => setCategory(e.target.value)}>
        <option value="all">All</option>
        <option value="electronics">Electronics</option>
      </select>
      <ul>
        {filtered.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Derived state: Computed from other state/props
2. Stored state: Explicitly stored, independent
3. Prefer derived state when possible (always in sync)
4. Use stored state for user input or independent values
5. Memoize expensive derivations with useMemo
6. Avoid redundant state (can get out of sync)
7. Single source of truth: Derive when possible
8. Ask: Can it be computed? Does it need independence?
9. Derived state prevents sync bugs
10. Balance: Derived for correctness, stored for independence

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "I'll store it to avoid recomputation"
✅ Only store if it needs independence; use useMemo for expensive computations

❌ "Derived state is always better"
✅ Use stored state when values need independent updates

❌ "I'll use useEffect to sync derived state"
✅ Just compute it directly; useEffect can cause sync issues

❌ "Storing is simpler"
✅ Derived state is simpler and prevents bugs

❌ "I need to store everything"
✅ Most values can be derived; only store what's necessary

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "When would you use derived vs stored state?":

✅ DO Explain:
• "Derived: Can be computed from other state/props"
• "Stored: Needs independent updates or can't be computed"
• "Prefer derived when possible (always in sync)"
• "Use useMemo for expensive derivations"
• "Avoid redundant state that can get out of sync"

When asked "What's the problem with storing derived state?":

✅ DO Explain:
• "Can get out of sync with source"
• "Requires useEffect to keep in sync"
• "More code to maintain"
• "Potential for bugs"
• "Better to just compute it"

Advanced Answer:
"Derived state is computed from other state or props, while stored state is explicitly
stored. Prefer derived state when values can be computed, as it's always in sync and
prevents bugs. Use stored state when values need independent updates or can't be computed
(such as user input). For expensive derivations, use useMemo. Avoid storing redundant
state that can be derived, as it can get out of sync and requires additional code to
maintain. The key is to ask: can it be computed? Does it need independence?"
