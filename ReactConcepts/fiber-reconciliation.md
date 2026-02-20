🔹 FIBER RECONCILIATION: STEP-BY-STEP FLOW

Fiber is React's reconciliation engine introduced in React 16. It enables
incremental rendering, interruption, and resumption of work. Understanding the
step-by-step flow is crucial for debugging performance issues and understanding
Concurrent React features.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣ WHAT IS A FIBER?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A Fiber is a JavaScript object that represents a unit of work. Each React element
has a corresponding Fiber node that contains:

```javascript
// Simplified Fiber structure
const fiber = {
  // Identity
  type: '''div''',              // Component type or HTML tag
  key: null,                // Key for reconciliation
  props: { children: [...] }, // Props
  
  // Tree structure
  child: fiberChild,        // First child
  sibling: fiberSibling,    // Next sibling
  return: fiberParent,      // Parent fiber
  
  // Work tracking
  alternate: alternateFiber, // Previous/current fiber (double buffering)
  effectTag: '''UPDATE''',      // What needs to be done (UPDATE, PLACEMENT, DELETION)
  updateQueue: [...],       // State updates to process
  
  // Priority
  lanes: DefaultLane,        // Priority lane
  childLanes: NoLanes,      // Child priorities
  
  // State
  memoizedState: {...},     // Current state
  memoizedProps: {...},     // Current props
  pendingProps: {...},      // Props to apply
};
```

Key Properties:
• **child/sibling/return**: Forms a linked list tree structure
• **alternate**: Points to the other fiber tree (double buffering)
• **effectTag**: Marks what DOM operation is needed
• **lanes**: Priority of this fiber's work

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣ FIBER TREE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React maintains two Fiber trees:

**Current Tree** (what's on screen):
• Represents the committed UI
• Points to actual DOM nodes
• Used for reading during render

**Work-In-Progress (WIP) Tree** (what's being built):
• Represents the next UI state
• Being constructed during render phase
• Will become the new current tree after commit

```javascript
// Component structure
function App() {
  return (
    <div>
      <Header />
      <Content />
    </div>
  );
}

// Fiber tree structure (simplified)
// Current Tree          Work-In-Progress Tree
// ┌─────────┐           ┌─────────┐
// │   App   │           │   App   │ (alternate)
// └────┬────┘           └────┬────┘
//      │                     │
//   ┌──┴──┐               ┌──┴──┐
//   │ div │               │ div │ (alternate)
//   └──┬──┘               └──┬──┘
//      │                     │
//   ┌──┴────┐            ┌──┴────┐
//   │Header │            │Header │ (alternate)
//   └───┬───┘            └───┬───┘
//       │                    │
//   ┌───┴───┐            ┌───┴───┐
//   │Content│            │Content│ (alternate)
//   └───────┘            └───────┘
```

Double Buffering:
• Allows React to work on new tree without discarding old one
• If work is interrupted, can throw away WIP tree
• After commit, WIP becomes current, current becomes WIP

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3️⃣ THE RECONCILIATION FLOW: OVERVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
State Update Triggered
        ↓
Schedule Update (assign to lane)
        ↓
┌─────────────────────────────────────┐
│   RENDER PHASE (can be interrupted) │
├─────────────────────────────────────┤
│ 1. Begin Work (create WIP tree)    │
│ 2. Complete Work (process fiber)   │
│ 3. Commit Root (prepare changes)   │
└─────────────────────────────────────┘
        ↓
┌─────────────────────────────────────┐
│   COMMIT PHASE (synchronous)        │
├─────────────────────────────────────┤
│ 4. Commit Before Mutation           │
│ 5. Commit Mutation (DOM updates)    │
│ 6. Commit Layout (read layout)      │
└─────────────────────────────────────┘
        ↓
WIP Tree becomes Current Tree
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4️⃣ STEP 1: BEGIN WORK (RENDER PHASE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When React starts rendering, it begins at the root and works down the tree:

```javascript
function beginWork(currentFiber, workInProgressFiber) {
  // currentFiber: fiber from current tree (or null if new)
  // workInProgressFiber: fiber being worked on
  
  if (currentFiber === null) {
    // New component - mount
    return mountComponent(workInProgressFiber);
  } else {
    // Existing component - update
    return updateComponent(currentFiber, workInProgressFiber);
  }
}
```

What Happens:
1. **Compare fibers**: Check if type/key changed
2. **Reuse or recreate**: If same type, reuse; if different, recreate
3. **Process updates**: Apply state updates from updateQueue
4. **Call render**: Execute component function or render method
5. **Reconcile children**: Compare old children with new children

Example:
```javascript
// Before update
function Counter() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

// After setCount(1)
// beginWork on Counter fiber:
// 1. currentFiber exists (not null) → update path
// 2. Type is same (Counter) → reuse
// 3. Process updateQueue: count = 1
// 4. Call Counter() → returns <div>1</div>
// 5. Reconcile children: old <div>0</div> vs new <div>1</div>
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5️⃣ STEP 2: RECONCILE CHILDREN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After a component renders, React reconciles its children:

```javascript
function reconcileChildren(currentFiber, workInProgressFiber, newChildren) {
  // Compare old children (currentFiber.child) with new children
  // Create/update/delete fibers as needed
  
  if (currentFiber === null) {
    // Mounting - create all children
    workInProgressFiber.child = mountChildFibers(workInProgressFiber, newChildren);
  } else {
    // Updating - reconcile with existing children
    workInProgressFiber.child = reconcileChildFibers(
      workInProgressFiber,
      currentFiber.child,  // old children
      newChildren           // new children
    );
  }
}
```

Reconciliation Algorithm:
1. **Iterate through children**: Compare old and new children
2. **Match by key**: If keys match, reuse fiber; if not, create new
3. **Same type**: If type matches, update props; if different, replace
4. **Mark effects**: Set effectTag (UPDATE, PLACEMENT, DELETION)

Example:
```javascript
// Old children
<ul>
  <li key="1">A</li>
  <li key="2">B</li>
  <li key="3">C</li>
</ul>

// New children
<ul>
  <li key="1">A</li>
  <li key="3">C</li>
  <li key="2">B Updated</li>
</ul>

// Reconciliation:
// 1. key="1": Same key, same type → UPDATE (text: "A" → "A")
// 2. key="2": Not found in new → DELETION
// 3. key="3": Same key, same type → UPDATE (text: "C" → "C")
// 4. key="2": New key → PLACEMENT (new fiber)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6️⃣ STEP 3: COMPLETE WORK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After processing a fiber and its children, React "completes" the work:

```javascript
function completeWork(currentFiber, workInProgressFiber) {
  const newProps = workInProgressFiber.pendingProps;
  const type = workInProgressFiber.type;
  
  switch (type) {
    case '''div''':
    case '''span''':
    case '''p''':
      // Host component (DOM element)
      if (currentFiber === null) {
        // Mounting - create DOM node
        const domNode = document.createElement(type);
        // Set props (className, style, etc.)
        updateDOMProperties(domNode, {}, newProps);
        // Store reference
        workInProgressFiber.stateNode = domNode;
      } else {
        // Updating - update DOM properties
        updateDOMProperties(currentFiber.stateNode, currentFiber.memoizedProps, newProps);
      }
      break;
      
    case FunctionComponent:
    case ClassComponent:
      // Component - nothing to do here
      break;
  }
  
  // Collect effects from children
  return workInProgressFiber;
}
```

What Happens:
1. **Create/update DOM nodes**: For host components (div, span, etc.)
2. **Set properties**: Apply className, style, event handlers
3. **Collect effects**: Gather effectTags from children
4. **Build effect list**: Create linked list of fibers with effects

Effect List:
```javascript
// After completeWork, fibers with effects are linked:
// Root → FiberA (UPDATE) → FiberB (PLACEMENT) → FiberC (DELETION)
// This list is used in commit phase for efficient DOM updates
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7️⃣ STEP 4: WORK LOOP AND INTERRUPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React processes fibers in a work loop that can be interrupted:

```javascript
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(fiber) {
  // 1. Begin work on this fiber
  const next = beginWork(fiber.alternate, fiber);
  
  if (next === null) {
    // No children - complete this fiber
    completeUnitOfWork(fiber);
  }
  
  return next; // Return next fiber to work on
}

function completeUnitOfWork(fiber) {
  let completedWork = fiber;
  
  do {
    // Complete current fiber
    const next = completeWork(completedWork.alternate, completedWork);
    
    // Move to sibling or parent
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      return siblingFiber; // Work on sibling next
    }
    
    completedWork = completedWork.return; // Move to parent
  } while (completedWork !== null);
}
```

Traversal Order (Depth-First):
```
     App
     /    div  div
   / \     H1  P   Span

Traversal: App → div → H1 → (complete) → P → (complete) → div (complete) → div → Span
```

Interruption:
```javascript
function shouldYield() {
  // Check if there'''s higher priority work
  // Check if time slice expired
  return (
    (executionContext & RenderContext) === NoContext &&
    (workInProgressRootRenderLanes & workInProgressRootSuspendedLanes) === NoLanes
  );
}

// If shouldYield() returns true:
// 1. Save current progress
// 2. Return control to browser
// 3. Resume later from where we left off
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8️⃣ STEP 5: COMMIT PHASE - BEFORE MUTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After render phase completes, commit phase begins (synchronous, cannot interrupt):

```javascript
function commitRoot(root) {
  const finishedWork = root.finishedWork;
  const effectList = finishedWork.firstEffect; // Linked list of effects
  
  // Phase 1: Before Mutation
  commitBeforeMutationEffects(finishedWork);
  
  // Phase 2: Mutation
  commitMutationEffects(finishedWork);
  
  // Phase 3: Layout
  commitLayoutEffects(finishedWork);
}
```

Before Mutation Phase:
```javascript
function commitBeforeMutationEffects(finishedWork) {
  // Run getSnapshotBeforeUpdate (class components)
  // Schedule passive effects (useEffect)
  // Read DOM before mutations (for animations, etc.)
  
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;
    
    if (effectTag & Snapshot) {
      // Class component: getSnapshotBeforeUpdate
      const current = nextEffect.alternate;
      const snapshot = instance.getSnapshotBeforeUpdate(
        current.memoizedProps,
        current.memoizedState
      );
      instance.__reactInternalSnapshotBeforeUpdate = snapshot;
    }
    
    nextEffect = nextEffect.nextEffect;
  }
}
```

What Happens:
• **getSnapshotBeforeUpdate**: Class component lifecycle (read DOM before changes)
• **Schedule passive effects**: Queue useEffect callbacks
• **Read layout**: Capture scroll position, dimensions (before they change)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9️⃣ STEP 6: COMMIT PHASE - MUTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is where DOM actually changes:

```javascript
function commitMutationEffects(finishedWork) {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;
    
    if (effectTag & Placement) {
      // Insert new node
      commitPlacement(nextEffect);
      nextEffect.effectTag &= ~Placement; // Remove flag
    }
    
    if (effectTag & Update) {
      // Update existing node
      commitWork(nextEffect.alternate, nextEffect);
    }
    
    if (effectTag & Deletion) {
      // Delete node
      commitDeletion(nextEffect);
    }
    
    nextEffect = nextEffect.nextEffect;
  }
}
```

Placement (Mounting):
```javascript
function commitPlacement(finishedWork) {
  const parentFiber = getHostParentFiber(finishedWork);
  const parentDOM = parentFiber.stateNode;
  const before = getHostSibling(finishedWork); // Find insertion point
  
  if (before !== null) {
    parentDOM.insertBefore(finishedWork.stateNode, before);
  } else {
    parentDOM.appendChild(finishedWork.stateNode);
  }
}
```

Update:
```javascript
function commitWork(current, workInProgress) {
  const domNode = workInProgress.stateNode;
  const newProps = workInProgress.memoizedProps;
  const oldProps = current !== null ? current.memoizedProps : {};
  
  // Update DOM properties
  updateDOMProperties(domNode, oldProps, newProps);
  
  // Update text content if needed
  if (workInProgress.type === '''TEXT_NODE''') {
    domNode.textContent = newProps;
  }
}
```

Deletion:
```javascript
function commitDeletion(finishedWork) {
  // Unmount component (run cleanup)
  unmountComponent(finishedWork);
  
  // Remove from DOM
  const parentDOM = getHostParent(finishedWork).stateNode;
  parentDOM.removeChild(finishedWork.stateNode);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔟 STEP 7: COMMIT PHASE - LAYOUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After DOM mutations, React runs layout effects:

```javascript
function commitLayoutEffects(finishedWork) {
  while (nextEffect !== null) {
    const effectTag = nextEffect.effectTag;
    
    if (effectTag & (Update | Callback)) {
      const current = nextEffect.alternate;
      
      // Class component: componentDidMount/Update
      if (effectTag & Update) {
        const instance = nextEffect.stateNode;
        if (current === null) {
          instance.componentDidMount();
        } else {
          instance.componentDidUpdate(
            current.memoizedProps,
            current.memoizedState,
            instance.__reactInternalSnapshotBeforeUpdate
          );
        }
      }
      
      // useLayoutEffect callbacks
      commitHookEffectListMount(HookLayout, nextEffect);
    }
    
    // Ref callbacks
    if (effectTag & Ref) {
      commitAttachRef(nextEffect);
    }
    
    nextEffect = nextEffect.nextEffect;
  }
}
```

What Happens:
• **componentDidMount/Update**: Class component lifecycle
• **useLayoutEffect**: Synchronous effect (runs after DOM updates, before paint)
• **Ref callbacks**: Attach refs to DOM nodes
• **Read layout**: Safe to read DOM dimensions now

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣1️⃣ COMPLETE EXAMPLE: COUNTER UPDATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Let's trace a complete update:

```javascript
function Counter() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}

// User clicks button → setCount(1)
```

**Step 1: Schedule Update**
```javascript
// Update scheduled to DefaultLane
// Added to root's updateQueue
```

**Step 2: Render Phase - Begin Work**
```javascript
// beginWork on Counter fiber
// 1. currentFiber exists → update path
// 2. Type is same (Counter) → reuse
// 3. Process updateQueue: count = 1
// 4. Call Counter() → returns <div>1</div>
// 5. Reconcile children: old <div>0</div> vs new <div>1</div>
```

**Step 3: Render Phase - Reconcile Children**
```javascript
// div fiber: same type → UPDATE
// Text node: "0" → "1" → UPDATE
```

**Step 4: Render Phase - Complete Work**
```javascript
// Complete div fiber
// 1. Update DOM properties (if changed)
// 2. Collect effects: UPDATE flag set
// Complete text fiber
// 1. Mark for text content update
```

**Step 5: Commit Phase - Before Mutation**
```javascript
// No getSnapshotBeforeUpdate (function component)
// Schedule useEffect (if any)
```

**Step 6: Commit Phase - Mutation**
```javascript
// div fiber: effectTag & Update → commitWork
// Update textContent: "0" → "1"
// DOM now shows "1"
```

**Step 7: Commit Phase - Layout**
```javascript
// useLayoutEffect runs (if any)
// Ref callbacks (if any)
```

**Step 8: Switch Trees**
```javascript
// WIP tree becomes current tree
// Current tree becomes WIP tree (for next update)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣2️⃣ EFFECT TAGS AND OPERATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Effect tags mark what needs to be done:

```javascript
// Effect tags (bitmask)
const Placement = 0b000000000000000000000000000010;  // 2
const Update = 0b000000000000000000000000000100;     // 4
const Deletion = 0b000000000000000000000000001000;   // 8
const ContentReset = 0b000000000000000000000000010000; // 16
const Ref = 0b000000000000000000000000100000;        // 32
const Snapshot = 0b000000000000000000000001000000;   // 64
const Passive = 0b000000000000000000000010000000;    // 128
```

How Tags Are Set:
```javascript
// During reconciliation
if (currentFiber === null) {
  // New fiber → PLACEMENT
  newFiber.effectTag = Placement;
} else if (currentFiber.type !== newFiber.type) {
  // Type changed → DELETION + PLACEMENT
  deletions.push(currentFiber);
  newFiber.effectTag = Placement;
} else {
  // Same type → UPDATE
  newFiber.effectTag = Update;
}
```

Multiple Tags:
```javascript
// A fiber can have multiple tags
fiber.effectTag = Placement | Update | Ref;
// Means: insert, update props, and attach ref
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣3️⃣ KEY TAKEAWAYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Fiber is a unit of work representing a React element
2. React maintains two Fiber trees (current and WIP) for double buffering
3. Render phase (beginWork → completeWork) can be interrupted
4. Commit phase (beforeMutation → mutation → layout) is synchronous
5. Reconciliation compares fibers by type and key
6. Effect tags mark what DOM operations are needed
7. Work loop processes fibers depth-first
8. Interruption enables Concurrent React features
9. Effect list links fibers with changes for efficient commit
10. Understanding Fiber helps debug performance and understand Concurrent Mode

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ COMMON MISTAKES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Fiber is the Virtual DOM"
✅ Fiber is the reconciliation engine; Virtual DOM is the tree structure

❌ "React renders the entire tree every time"
✅ React only processes changed fibers (with some caveats)

❌ "Commit phase can be interrupted"
✅ Commit phase is synchronous and atomic

❌ "Fiber makes React faster"
✅ Fiber enables incremental rendering and interruption, not just speed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 INTERVIEW TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When asked "How does React reconciliation work?":

✅ DO Explain:
• "React uses Fiber nodes to represent work units"
• "Two trees: current (committed) and WIP (being built)"
• "Render phase: beginWork → reconcile children → completeWork"
• "Commit phase: beforeMutation → mutation → layout"
• "Work can be interrupted in render phase, not commit phase"

Advanced Answer:
"React's Fiber reconciliation works in two phases. The render phase creates a
Work-In-Progress tree by processing fibers: beginWork processes each fiber and
reconciles children, completeWork creates/updates DOM nodes and collects effects.
This phase can be interrupted for higher priority work. The commit phase is
synchronous and applies changes: beforeMutation runs getSnapshotBeforeUpdate and
schedules effects, mutation updates the DOM, and layout runs componentDidMount/Update
and useLayoutEffect. After commit, the WIP tree becomes the current tree."
