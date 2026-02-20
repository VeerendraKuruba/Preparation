🔹 HOW REACT MANAGES MEMORY (FIBER DOUBLE BUFFERING)

React uses double buffering with Fiber trees to manage memory efficiently and enable
interruptible rendering. Understanding this mechanism is crucial for understanding
Concurrent React.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS DOUBLE BUFFERING?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Double buffering maintains two versions of data: one currently in use (current) and
one being prepared (work-in-progress). React uses this for Fiber trees.

Concept:
```
Current Tree (what's on screen)
    ↕ (alternate pointers)
Work-In-Progress Tree (being built)
```

Why Double Buffering:
• Can discard WIP tree if interrupted
• Current tree remains stable
• Enables interruption and resumption
• Prevents partial UI updates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ TWO FIBER TREES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React maintains two Fiber trees simultaneously:

**Current Tree:**
• Represents what's currently on screen
• Points to actual DOM nodes
• Used for reading during render
• Stable and committed

**Work-In-Progress (WIP) Tree:**
• Represents the next UI state
• Being constructed during render phase
• Can be discarded if interrupted
• Will become current after commit

Visual Representation:
```
Component Structure:
  App
   └─ div
      ├─ Header
      └─ Content

Current Tree:          WIP Tree:
  App (current)          App (wip)
   └─ div (current)       └─ div (wip)
      ├─ Header (current)    ├─ Header (wip)
      └─ Content (current)   └─ Content (wip)

Each fiber has alternate pointer:
App.current.alternate → App.wip
App.wip.alternate → App.current
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ HOW IT WORKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step-by-Step Flow:

**1. Initial Render:**
```javascript
// Start: No current tree
// Create WIP tree
const wipRoot = createFiberRoot();
beginWork(wipRoot);

// After commit: WIP becomes current
currentRoot = wipRoot;
wipRoot = null;
```

**2. Update:**
```javascript
// State changes
setState(newValue);

// Create new WIP tree from current
const newWipRoot = currentRoot.alternate || createFiber();
newWipRoot.alternate = currentRoot;
currentRoot.alternate = newWipRoot;

// Work on WIP tree
beginWork(newWipRoot);

// After commit: Switch trees
const temp = currentRoot;
currentRoot = newWipRoot;
newWipRoot = temp;
```

**3. Interruption:**
```javascript
// High priority update interrupts
// Discard WIP tree (can recreate)
wipRoot = null;

// Start new WIP tree for high priority update
const highPriorityWip = createFiber();
beginWork(highPriorityWip);
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ ALTERNATE POINTERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each fiber has an `alternate` pointer to its counterpart:

```javascript
// Fiber structure
const fiber = {
  type: 'div',
  alternate: alternateFiber,  // Points to other tree's fiber
  // ... other properties
};

// Current tree fiber
const currentFiber = {
  type: 'div',
  alternate: wipFiber,  // Points to WIP
};

// WIP tree fiber
const wipFiber = {
  type: 'div',
  alternate: currentFiber,  // Points to current
};
```

How React Uses Alternates:
```javascript
function beginWork(currentFiber, wipFiber) {
  // Compare current with WIP
  if (currentFiber === null) {
    // New component - mount
    return mountComponent(wipFiber);
  } else {
    // Existing - update
    // currentFiber.alternate === wipFiber
    return updateComponent(currentFiber, wipFiber);
  }
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ MEMORY MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Double buffering enables efficient memory management:

**Reusing Fibers:**
```javascript
// Instead of creating new fibers, reuse from current tree
function reconcileChildren(currentFiber, wipFiber, newChildren) {
  if (currentFiber !== null) {
    // Reuse fiber from current tree
    wipFiber.child = reuseFiber(
      currentFiber.child,  // From current tree
      newChildren
    );
  } else {
    // Mount: create new fibers
    wipFiber.child = mountChildFibers(wipFiber, newChildren);
  }
}
```

**Discarding WIP:**
```javascript
// If interrupted, can discard WIP tree
function interruptWork() {
  // Discard WIP tree
  wipRoot = null;
  
  // Current tree remains intact
  // Can start new WIP tree later
}
```

**Memory Efficiency:**
• Reuses fibers when possible
• Only creates new fibers when needed
• Can discard WIP without affecting current
• Prevents memory leaks from abandoned work

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ ENABLING INTERRUPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Double buffering enables interruption:

```javascript
// Low priority work starts
const lowPriorityWip = createFiber();
beginWork(lowPriorityWip);

// High priority update arrives
// Can interrupt low priority work
interruptWork(lowPriorityWip);  // Discard WIP

// Start high priority work
const highPriorityWip = createFiber();
beginWork(highPriorityWip);
commitWork(highPriorityWip);

// Resume low priority work later
const resumedWip = createFiber();
beginWork(resumedWip);
```

Why This Works:
• Current tree is untouched
• WIP can be discarded safely
• No partial updates to DOM
• Can resume from where we left off

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ COMMIT PHASE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After render phase completes, commit phase switches trees:

```javascript
function commitRoot(wipRoot) {
  // Commit phase: Apply changes to DOM
  commitMutationEffects(wipRoot);
  commitLayoutEffects(wipRoot);
  
  // Switch trees
  const currentRoot = wipRoot.alternate;
  wipRoot.alternate = currentRoot;
  currentRoot.alternate = wipRoot;
  
  // WIP becomes current
  root.current = wipRoot;
  
  // Clear WIP
  wipRoot = null;
}
```

Tree Switch:
```
Before commit:
Current: App → div → Header
WIP:     App → div → Header (updated)

After commit:
Current: App → div → Header (updated)  (was WIP)
WIP:     null (will be created for next update)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ PRACTICAL EXAMPLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Complete Update Flow:

```javascript
function Component() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

// Initial render:
// 1. Create WIP tree
// 2. Render component
// 3. Commit: WIP → Current

// Update (setCount(1)):
// 1. Create new WIP from current.alternate
// 2. Work on WIP tree
// 3. Compare with current (via alternate)
// 4. Mark changes
// 5. Commit: Apply changes, switch trees
```

Interruption Example:
```javascript
// Low priority: Render large list
const listWip = createFiber();
beginWork(listWip);  // Working on item 1000/10000

// High priority: User clicks button
interruptWork(listWip);  // Discard WIP

// High priority: Render button click
const buttonWip = createFiber();
beginWork(buttonWip);
commitWork(buttonWip);

// Resume list later
const resumedListWip = createFiber();
beginWork(resumedListWip);  // Continue from where we left off
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ BENEFITS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Benefits of Double Buffering:

**1. Interruption Safety:**
• Can discard WIP without affecting current
• No partial updates
• Can resume work later

**2. Memory Efficiency:**
• Reuses fibers when possible
• Only creates new fibers when needed
• Prevents memory leaks

**3. Consistency:**
• Current tree always represents committed state
• WIP tree represents work in progress
• Clear separation

**4. Performance:**
• Efficient fiber reuse
• Minimal memory allocation
• Fast tree switching

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Double buffering maintains two Fiber trees: current and WIP
2. Current tree represents committed UI; WIP represents work in progress
3. Alternate pointers link corresponding fibers between trees
4. Enables interruption: can discard WIP without affecting current
5. After commit, WIP becomes current and trees switch
6. Memory efficient: reuses fibers when possible
7. Essential for Concurrent React features
8. Prevents partial UI updates
9. Allows work to be paused and resumed
10. Foundation for time-slicing and priority updates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Double buffering is just for performance"
✅ Also enables interruption and Concurrent React

❌ "WIP tree is always created from scratch"
✅ Reuses fibers from current tree when possible

❌ "Current and WIP trees are independent"
✅ Linked via alternate pointers

❌ "Double buffering doubles memory usage"
✅ Reuses fibers efficiently; minimal overhead

❌ "WIP tree is always discarded"
✅ Becomes current after commit

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "How does React manage memory with Fiber?":

✅ DO Explain:
• "Double buffering: maintains current and WIP trees"
• "Current tree represents committed UI"
• "WIP tree represents work in progress"
• "Alternate pointers link corresponding fibers"
• "Enables interruption and efficient memory management"

When asked "Why double buffering?":

✅ DO Explain:
• "Enables interruption: can discard WIP safely"
• "Memory efficient: reuses fibers"
• "Prevents partial updates"
• "Foundation for Concurrent React"
• "Allows work to be paused and resumed"

Advanced Answer:
"React uses double buffering with Fiber trees to manage memory efficiently. It maintains
two trees: the current tree representing the committed UI, and the work-in-progress (WIP)
tree representing ongoing work. Fibers in each tree are linked via alternate pointers.
This enables React to interrupt work safely by discarding the WIP tree without affecting
the current tree, reuse fibers efficiently to minimize memory allocation, and prevent
partial UI updates. After commit, the WIP tree becomes the current tree. This mechanism
is essential for Concurrent React features like time-slicing and priority updates."
