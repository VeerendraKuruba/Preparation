🔹 THE 3 CONSEQUENCES OF USING INDEX AS A KEY

Using array index as a key in React lists can cause serious bugs. Understanding the
three main consequences helps you write correct React code and debug issues.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS A KEY?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Keys help React identify which items have changed, been added, or removed. They
should be stable, predictable, and unique.

```javascript
// ✅ Good: Unique, stable key
{todos.map(todo => (
  <TodoItem key={todo.id} todo={todo} />
))}

// ❌ Bad: Index as key
{todos.map((todo, index) => (
  <TodoItem key={index} todo={todo} />
))}
```

Why Keys Matter:
• React uses keys to match items between renders
• Keys determine which components to reuse
• Wrong keys cause incorrect component reuse
• Can lead to state bugs and performance issues

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ CONSEQUENCE 1: STATE BUGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When items are reordered or removed, index keys cause React to associate state
with the wrong component.

Example: Input with Index Key
```javascript
function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'First' },
    { id: 2, text: 'Second' },
    { id: 3, text: 'Third' },
  ]);
  
  return (
    <ul>
      {todos.map((todo, index) => (
        <TodoItem key={index} todo={todo} />
      ))}
    </ul>
  );
}

function TodoItem({ todo }) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(todo.text);
  
  return (
    <li>
      {isEditing ? (
        <input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
        />
      ) : (
        <span>{todo.text}</span>
      )}
    </li>
  );
}
```

The Bug:
```javascript
// Initial state:
// Index 0: TodoItem with state { isEditing: false, inputValue: 'First' }
// Index 1: TodoItem with state { isEditing: false, inputValue: 'Second' }
// Index 2: TodoItem with state { isEditing: false, inputValue: 'Third' }

// User deletes first item:
// New todos: [{ id: 2, text: 'Second' }, { id: 3, text: 'Third' }]

// React sees:
// Index 0: key=0 → Reuse component from old index 0
//          But now shows 'Second' (wrong state!)
// Index 1: key=1 → Reuse component from old index 1
//          But now shows 'Third' (wrong state!)

// Result: State from deleted item appears in wrong component!
```

Fix: Use Unique ID
```javascript
// ✅ Fix: Use unique ID
{todos.map(todo => (
  <TodoItem key={todo.id} todo={todo} />
))}

// Now React correctly identifies:
// key=2 → Component for 'Second' (correct)
// key=3 → Component for 'Third' (correct)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ CONSEQUENCE 2: PERFORMANCE ISSUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Index keys cause React to unnecessarily recreate components when list order changes.

Example: Reordering List
```javascript
function ItemList({ items }) {
  return (
    <ul>
      {items.map((item, index) => (
        <ExpensiveItem key={index} item={item} />
      ))}
    </ul>
  );
}

// Initial: ['A', 'B', 'C']
// Keys: 0, 1, 2

// Reordered: ['C', 'A', 'B']
// Keys: 0, 1, 2 (same keys!)

// React thinks:
// key=0: Was 'A', now 'C' → Different content, recreate component
// key=1: Was 'B', now 'A' → Different content, recreate component
// key=2: Was 'C', now 'B' → Different content, recreate component

// Result: All 3 components recreated! (Wasteful)
```

With Unique Keys:
```javascript
// ✅ Fix: Use unique IDs
{items.map(item => (
  <ExpensiveItem key={item.id} item={item} />
))}

// Initial: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }, { id: 'c', text: 'C' }]
// Keys: 'a', 'b', 'c'

// Reordered: [{ id: 'c', text: 'C' }, { id: 'a', text: 'A' }, { id: 'b', text: 'B' }]
// Keys: 'c', 'a', 'b'

// React thinks:
// key='c': Was at end, now at start → Move component (efficient)
// key='a': Was at start, now in middle → Move component (efficient)
// key='b': Was in middle, now at end → Move component (efficient)

// Result: Components moved, not recreated! (Efficient)
```

Performance Impact:
• Index keys: O(n) recreations on reorder
• Unique keys: O(n) moves (much faster)
• Especially bad for expensive components

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ CONSEQUENCE 3: INCORRECT COMPONENT REUSE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React reuses components based on keys. With index keys, wrong components get reused.

Example: Checkbox State
```javascript
function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Buy milk', completed: false },
    { id: 2, text: 'Walk dog', completed: false },
    { id: 3, text: 'Write code', completed: false },
  ]);
  
  return (
    <ul>
      {todos.map((todo, index) => (
        <TodoItem key={index} todo={todo} />
      ))}
    </ul>
  );
}

function TodoItem({ todo }) {
  const [checked, setChecked] = useState(todo.completed);
  
  return (
    <li>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => setChecked(e.target.checked)}
      />
      {todo.text}
    </li>
  );
}
```

The Bug:
```javascript
// User checks "Buy milk" (index 0)
// State: key=0 has checked=true

// User deletes "Buy milk"
// New list: [{ id: 2, text: 'Walk dog' }, { id: 3, text: 'Write code' }]

// React reuses:
// key=0: Component that had "Buy milk" checked
//        Now shows "Walk dog" but checkbox is checked! (Wrong!)

// Result: Wrong item appears checked!
```

Visual Example:
```
Before deletion:
[✓] Buy milk      (key=0, checked=true)
[ ] Walk dog      (key=1, checked=false)
[ ] Write code    (key=2, checked=false)

After deletion:
[✓] Walk dog      (key=0, checked=true) ← Wrong! Should be unchecked
[ ] Write code    (key=1, checked=false)
```

Fix:
```javascript
// ✅ Fix: Use unique ID
{todos.map(todo => (
  <TodoItem key={todo.id} todo={todo} />
))}

// Now React correctly:
// key=2: Component for "Walk dog" (unchecked, correct)
// key=3: Component for "Write code" (unchecked, correct)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ WHEN IS INDEX KEY OKAY?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Index key is acceptable only when ALL of these are true:
1. List is static (never reordered, added, or removed)
2. Items have no internal state
3. Items are simple/pure components
4. Performance is not a concern

Example: Static List
```javascript
// ✅ Okay: Static list, no state, simple items
const COLORS = ['red', 'green', 'blue'];

function ColorList() {
  return (
    <ul>
      {COLORS.map((color, index) => (
        <li key={index}>{color}</li>  // Static, no state, simple
      ))}
    </ul>
  );
}
```

When NOT to Use Index:
```javascript
// ❌ Bad: Items can be reordered
function SortableList({ items }) {
  return items.map((item, index) => (
    <Item key={index} item={item} />  // Will break on reorder
  ));
}

// ❌ Bad: Items have state
function TodoList({ todos }) {
  return todos.map((todo, index) => (
    <TodoItem key={index} todo={todo} />  // Has internal state
  ));
}

// ❌ Bad: Items can be removed
function RemovableList({ items }) {
  return items.map((item, index) => (
    <Item key={index} item={item} />  // Will break on removal
  ));
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ GENERATING UNIQUE KEYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Best: Use Existing Unique ID
```javascript
// ✅ Best: Use ID from data
{todos.map(todo => (
  <TodoItem key={todo.id} todo={todo} />
))}
```

If No ID: Generate Stable Key
```javascript
// ✅ Good: Generate stable key
function generateKey(item, index) {
  return item.id || `item-${index}`;
}

{items.map((item, index) => (
  <Item key={generateKey(item, index)} item={item} />
))}
```

Avoid: Unstable Keys
```javascript
// ❌ Bad: Key changes every render
{items.map(item => (
  <Item key={Math.random()} item={item} />  // New key every render!
))}

// ❌ Bad: Key based on content that might change
{items.map(item => (
  <Item key={item.text} item={item} />  // Breaks if text changes
))}
```

Composite Keys (When Needed):
```javascript
// ✅ Good: Composite key for multiple fields
{items.map(item => (
  <Item key={`${item.category}-${item.id}`} item={item} />
))}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ DEBUGGING KEY ISSUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Signs of Key Problems:
1. State appears in wrong component after reorder/delete
2. Checkboxes/inputs show wrong values
3. Components re-render unnecessarily
4. Console warnings about keys

React DevTools:
• Check which components are being reused
• See if keys match correctly
• Identify unnecessary re-renders

Example Debugging:
```javascript
function TodoList() {
  const [todos, setTodos] = useState([...]);
  
  return (
    <ul>
      {todos.map((todo, index) => (
        <TodoItem
          key={index}  // ❌ Problem: Index key
          todo={todo}
          // Add logging to see key issues
          debugKey={`index-${index}-id-${todo.id}`}
        />
      ))}
    </ul>
  );
}

// Check React DevTools:
// - Are components being reused incorrectly?
// - Is state associated with wrong component?
// - Are unnecessary re-renders happening?
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ REAL-WORLD EXAMPLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Example 1: Todo List with Delete
```javascript
// ❌ Bug: Index key
function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'A' },
    { id: 2, text: 'B' },
    { id: 3, text: 'C' },
  ]);
  
  function deleteTodo(id) {
    setTodos(todos.filter(t => t.id !== id));
  }
  
  return (
    <ul>
      {todos.map((todo, index) => (
        <TodoItem
          key={index}  // ❌ Bug: State will be wrong after delete
          todo={todo}
          onDelete={() => deleteTodo(todo.id)}
        />
      ))}
    </ul>
  );
}

// ✅ Fix: Use ID
{todos.map(todo => (
  <TodoItem key={todo.id} todo={todo} onDelete={() => deleteTodo(todo.id)} />
))}
```

Example 2: Sortable Table
```javascript
// ❌ Bug: Index key
function SortableTable({ data }) {
  const [sortBy, setSortBy] = useState(null);
  const sorted = sortData(data, sortBy);
  
  return (
    <table>
      <tbody>
        {sorted.map((row, index) => (
          <TableRow key={index} row={row} />  // ❌ Bug: Breaks on sort
        ))}
      </tbody>
    </table>
  );
}

// ✅ Fix: Use row ID
{sorted.map(row => (
  <TableRow key={row.id} row={row} />
))}
```

Example 3: Form with Dynamic Fields
```javascript
// ❌ Bug: Index key
function DynamicForm() {
  const [fields, setFields] = useState([{ id: 1, value: '' }]);
  
  function addField() {
    setFields([...fields, { id: Date.now(), value: '' }]);
  }
  
  return (
    <form>
      {fields.map((field, index) => (
        <Input
          key={index}  // ❌ Bug: Input values will be wrong
          value={field.value}
          onChange={e => updateField(index, e.target.value)}
        />
      ))}
    </form>
  );
}

// ✅ Fix: Use field ID
{fields.map(field => (
  <Input
    key={field.id}
    value={field.value}
    onChange={e => updateField(field.id, e.target.value)}
  />
))}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **Consequence 1: State Bugs** - State associated with wrong component
2. **Consequence 2: Performance Issues** - Unnecessary component recreation
3. **Consequence 3: Incorrect Reuse** - Wrong components get reused
4. Index key is only okay for static, stateless, simple lists
5. Always use unique, stable keys when possible
6. Use IDs from data when available
7. Generate stable keys if no ID exists
8. Avoid keys that change (Math.random, content-based)
9. Key issues cause hard-to-debug state bugs
10. React DevTools helps identify key problems

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Index key is fine if list doesn't change"
✅ Only if list is truly static AND items have no state

❌ "I can use index if I'm careful"
✅ Index keys cause bugs even with careful code

❌ "Performance doesn't matter for small lists"
✅ State bugs happen regardless of list size

❌ "I'll use index and fix issues later"
✅ Fix keys from the start; bugs are hard to debug

❌ "Math.random() is a unique key"
✅ Keys must be stable; random keys cause recreation every render

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "Why shouldn't you use index as key?":

✅ DO Explain:
• "State bugs: State gets associated with wrong component"
• "Performance: Components unnecessarily recreated on reorder"
• "Incorrect reuse: Wrong components get reused"
• "Only okay for static, stateless, simple lists"
• "Always use unique, stable keys when possible"

When asked "What are the consequences?":

✅ DO Explain:
• "State from one item appears in another after reorder/delete"
• "Performance issues from unnecessary recreations"
• "Components reused incorrectly, causing UI bugs"
• "Hard to debug issues"

Advanced Answer:
"Using index as key causes three main problems. First, state bugs: when items are
reordered or removed, React associates state with the wrong component because it
matches by key. Second, performance issues: React recreates components unnecessarily
because it thinks content changed when keys stayed the same but items moved. Third,
incorrect component reuse: components get reused for wrong items, causing UI bugs
like checkboxes being checked on wrong items. Index keys are only acceptable for
truly static lists with no internal state. Always use unique, stable keys from
your data when possible."
