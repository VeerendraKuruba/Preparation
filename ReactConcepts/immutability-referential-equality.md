🔹 IMMUTABILITY AND REFERENTIAL EQUALITY

React relies on immutability and referential equality for efficient updates. Understanding
these concepts is crucial for writing correct and performant React code.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS IMMUTABILITY?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Immutability means not modifying existing data. Instead, create new data with changes.

Mutable (❌):
```javascript
const user = { name: 'John', age: 30 };
user.age = 31;  // Modifies existing object
```

Immutable (✅):
```javascript
const user = { name: 'John', age: 30 };
const updatedUser = { ...user, age: 31 };  // New object
```

Why Immutability in React:
• React uses referential equality to detect changes
• Enables efficient reconciliation
• Prevents bugs from accidental mutations
• Enables time-travel debugging

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ REFERENTIAL EQUALITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Referential equality compares object references, not values:

```javascript
const obj1 = { name: 'John' };
const obj2 = { name: 'John' };
const obj3 = obj1;

obj1 === obj2;  // false (different references)
obj1 === obj3;  // true (same reference)
```

React Uses Referential Equality:
```javascript
// React compares by reference
const prevProps = { user: { name: 'John' } };
const nextProps = { user: { name: 'John' } };

prevProps.user === nextProps.user;  // false (different references)
// React thinks: "Props changed!" (even though values are same)
```

Why This Matters:
• React.memo compares props by reference
• useEffect dependencies compared by reference
• useMemo/useCallback compare dependencies by reference
• State updates detected by reference

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ STATE UPDATES MUST BE IMMUTABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

State updates must create new objects/arrays:

```javascript
function Component() {
  const [user, setUser] = useState({ name: 'John', age: 30 });
  
  // ❌ Wrong: Mutates state
  function updateAge() {
    user.age = 31;  // Mutates!
    setUser(user);  // React doesn't detect change (same reference)
  }
  
  // ✅ Correct: Creates new object
  function updateAge() {
    setUser({ ...user, age: 31 });  // New object
  }
}
```

Arrays:
```javascript
function Component() {
  const [items, setItems] = useState([1, 2, 3]);
  
  // ❌ Wrong: Mutates array
  function addItem() {
    items.push(4);  // Mutates!
    setItems(items);  // React doesn't detect change
  }
  
  // ✅ Correct: Creates new array
  function addItem() {
    setItems([...items, 4]);  // New array
  }
  
  // ✅ Correct: Using functional update
  function addItem() {
    setItems(prev => [...prev, 4]);
  }
}
```

Nested Objects:
```javascript
function Component() {
  const [user, setUser] = useState({
    name: 'John',
    address: { city: 'NYC', zip: '10001' }
  });
  
  // ❌ Wrong: Mutates nested object
  function updateCity() {
    user.address.city = 'LA';  // Mutates!
    setUser(user);  // React doesn't detect change
  }
  
  // ✅ Correct: Creates new nested structure
  function updateCity() {
    setUser({
      ...user,
      address: { ...user.address, city: 'LA' }
    });
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ IMMUTABLE UPDATE PATTERNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Objects:
```javascript
// Update property
const updated = { ...obj, property: newValue };

// Add property
const updated = { ...obj, newProperty: value };

// Remove property
const { removed, ...rest } = obj;
```

Arrays:
```javascript
// Add item
const updated = [...array, newItem];

// Remove item
const updated = array.filter(item => item.id !== idToRemove);

// Update item
const updated = array.map(item =>
  item.id === idToUpdate ? { ...item, ...updates } : item
);

// Insert at index
const updated = [
  ...array.slice(0, index),
  newItem,
  ...array.slice(index)
];
```

Nested Updates:
```javascript
// Update nested object
const updated = {
  ...obj,
  nested: { ...obj.nested, property: newValue }
};

// Update nested array
const updated = {
  ...obj,
  items: obj.items.map(item => /* update */)
};
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ WHY IMMUTABILITY MATTERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1. React Detects Changes:**
```javascript
// ❌ Mutation: React doesn't detect change
const [user, setUser] = useState({ name: 'John' });
user.name = 'Jane';
setUser(user);  // Same reference, React thinks nothing changed

// ✅ Immutability: React detects change
setUser({ ...user, name: 'Jane' });  // New reference, React detects change
```

**2. Memoization Works:**
```javascript
const Child = React.memo(function Child({ user }) {
  return <div>{user.name}</div>;
});

// ❌ Mutation: Memoization fails
user.name = 'Jane';
<Child user={user} />  // Same reference, memo doesn't help

// ✅ Immutability: Memoization works
<Child user={{ ...user, name: 'Jane' }} />  // New reference, memo works
```

**3. useEffect Dependencies:**
```javascript
useEffect(() => {
  // Uses user
}, [user]);

// ❌ Mutation: Effect doesn't re-run
user.name = 'Jane';
setUser(user);  // Same reference, effect doesn't run

// ✅ Immutability: Effect re-runs
setUser({ ...user, name: 'Jane' });  // New reference, effect runs
```

**4. Time-Travel Debugging:**
```javascript
// Immutability enables Redux DevTools time-travel
// Can go back to previous states
// States are snapshots, not modified
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ IMMUTABLE LIBRARIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For complex nested updates, use immutable libraries:

**Immer:**
```javascript
import produce from 'immer';

const updated = produce(state, draft => {
  draft.user.name = 'Jane';  // Write like mutation
  draft.items.push(newItem);  // But creates new state
});
```

**Immutable.js:**
```javascript
import { Map, List } from 'immutable';

const state = Map({ user: Map({ name: 'John' }) });
const updated = state.setIn(['user', 'name'], 'Jane');
```

Native Approach:
```javascript
// For simple cases, native spread is fine
const updated = { ...state, user: { ...state.user, name: 'Jane' } };
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mistake 1: Mutating State
```javascript
// ❌ Wrong
const [items, setItems] = useState([1, 2, 3]);
items.push(4);
setItems(items);

// ✅ Correct
setItems([...items, 4]);
```

Mistake 2: Shallow Copy of Nested Objects
```javascript
// ❌ Wrong: Only shallow copy
const updated = { ...user };
updated.address.city = 'LA';  // Mutates original!

// ✅ Correct: Deep copy needed
const updated = {
  ...user,
  address: { ...user.address, city: 'LA' }
};
```

Mistake 3: Array Methods That Mutate
```javascript
// ❌ Wrong: Mutating methods
items.push(4);
items.pop();
items.sort();
items.reverse();

// ✅ Correct: Non-mutating methods
[...items, 4];
items.filter(/* ... */);
[...items].sort();
[...items].reverse();
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ PERFORMANCE CONSIDERATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Immutability has overhead:
• Creates new objects/arrays
• More memory usage
• More garbage collection

But Benefits Outweigh Costs:
• Enables efficient reconciliation
• Prevents bugs
• Enables optimizations (memoization)
• Better developer experience

Optimization: Structural Sharing
```javascript
// Libraries like Immutable.js use structural sharing
// Only changed parts are copied
// Unchanged parts are shared
```

For Large Updates:
```javascript
// Consider libraries for complex nested updates
// Or use Immer for easier syntax
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Immutability: Don't modify, create new data
2. React uses referential equality to detect changes
3. State updates must be immutable
4. Use spread operator for objects/arrays
5. Nested updates need nested spreading
6. Immutability enables memoization and effects
7. Use libraries (Immer) for complex updates
8. Avoid mutating methods (push, sort, etc.)
9. Benefits outweigh performance costs
10. Essential for correct React behavior

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "I can mutate state if I'm careful"
✅ Always create new objects/arrays for state updates

❌ "Spread operator does deep copy"
✅ Spread only does shallow copy; nested objects need nested spreading

❌ "Immutability is just for performance"
✅ Also enables React to detect changes correctly

❌ "I can use mutating array methods"
✅ Use non-mutating methods or create new arrays

❌ "Immutability is too slow"
✅ Benefits outweigh costs; use libraries for complex cases

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "Why is immutability important in React?":

✅ DO Explain:
• "React uses referential equality to detect changes"
• "State updates must create new objects/arrays"
• "Enables memoization and effects to work correctly"
• "Prevents bugs from accidental mutations"
• "Enables time-travel debugging"

When asked "How do you update nested state immutably?":

✅ DO Explain:
• "Use nested spread operators"
• "Create new objects at each level"
• "Or use libraries like Immer for easier syntax"
• "Example: { ...obj, nested: { ...obj.nested, prop: value } }"

Advanced Answer:
"Immutability is crucial in React because React uses referential equality to detect
changes. When state updates, we must create new objects or arrays rather than mutating
existing ones. This enables React to efficiently detect changes, allows memoization to
work correctly, and prevents bugs. For nested updates, we use nested spread operators
to create new objects at each level, or use libraries like Immer for more intuitive
syntax. While immutability has some overhead, the benefits in terms of correctness,
performance optimizations, and developer experience far outweigh the costs."
