# 24 - File Explorer (Recursive Tree)

## What to Build

A **collapsible file tree** like the VSCode sidebar — folders can be expanded/collapsed, files can be selected, and the tree can be arbitrarily deep.

- `FileExplorer` is the root component. It owns all expansion and selection state.
- `TreeNode` is a **recursive component** — it renders itself for each child.
- Folders toggle open/closed. Files become "selected" (highlighted).
- No depth limit — the recursion mirrors the tree data structure naturally.

---

## Core Pattern

```
FileExplorer (owns state)
  expanded: Set<id>   — which folder IDs are open
  selectedId: string  — which file is selected
  toggle(id)          — flips a folder open/closed
        ↓ props
  TreeNode (recursive)
    renders children by calling itself: <TreeNode node={c} ... />
    recursion stops when a node has no children (kind === 'file')
```

---

## Key Concepts

### 1. Recursive Component

`TreeNode` calls itself for each child:

```jsx
{isFolder && open && node.children?.map((c) => (
  <TreeNode
    key={c.id}
    node={c}
    depth={depth + 1}  // indent one level further
    {...rest}
  />
))}
```

Recursion terminates naturally because `files` have no `children` — the short-circuit `isFolder && open && node.children?.map(...)` evaluates to `false/undefined` and never calls `TreeNode` recursively.

### 2. State Lives at the Top Level

The `expanded` Set and `selectedId` live in `FileExplorer`, NOT inside each `TreeNode`.

If each `TreeNode` managed its own `isOpen` boolean, you would have **no way to**:
- "Collapse All" — you'd need to reach into every child instance (not how React works)
- "Expand All" — same problem
- Persist expansion state to a URL or `localStorage`
- Programmatically expand to a specific path

Centralising state in the parent solves all of this.

### 3. Immutable Set Updates

React uses **reference equality** to detect state changes. The same Set reference = no re-render.

```jsx
// WRONG — mutates in place, same reference, React skips re-render:
prev.add(id);
return prev;

// CORRECT — new reference, React detects change and re-renders:
const next = new Set(prev);  // shallow copy
next.add(id);
return next;
```

### 4. Derived State, Not Local State

Inside `TreeNode`, `isFolder`, `open`, and `selected` are **derived from props** — not stored as local `useState`. They recalculate on every render from the canonical parent state. This keeps `TreeNode` stateless and eliminates sync bugs.

---

## Data Shape

```js
{
  id: string,           // unique, stable ID for React keys + Set membership
  name: string,         // display name
  kind: 'file' | 'folder',
  children?: Node[]     // only present on folders
}
```

---

## Indentation

```jsx
paddingLeft: depth * 16
```

Each level of nesting adds 16px of left padding. `depth` starts at 0 for root nodes and increments by 1 for each recursive call.

---

## Prop Drilling vs Context

Currently `toggle`, `expanded`, `selectedId`, and `onSelect` are passed as props through every level. For a shallow tree this is explicit and easy to follow.

For a **deep tree** (10+ levels), every intermediate `TreeNode` must forward props it doesn't use. A `FileExplorerContext` would let any node at any depth access these values directly with `useContext`, removing the boilerplate.

---

## Interview Questions

**Q: What is a recursive component?**
A: A component that renders itself as part of its own output. `TreeNode` renders `<TreeNode>` for each of its children. This mirrors the recursive nature of the tree data structure — you don't need to know the depth in advance. The recursion terminates when a node has no children (a file).

**Q: Why keep expansion state at the top level instead of inside each `TreeNode`?**
A: Centralising state in `FileExplorer` enables global operations: "Collapse All" (clear the Set), "Expand All" (add all folder IDs), persisting state to a URL, or programmatically expanding to a path. If each `TreeNode` owned its own `isOpen` boolean, you'd have no way to read or change those values from outside — React has no direct instance access without refs.

**Q: Why create a new Set (`new Set(prev)`) instead of mutating the existing one?**
A: React uses `Object.is` (reference equality) to detect state changes. If you mutate the existing Set and return the same reference, React sees no change and skips the re-render — the UI never updates. Returning a new Set object gives React a new reference, triggering a re-render.

**Q: How does the recursion know when to stop?**
A: Files (`kind === 'file'`) have no `children` array. The rendering code uses short-circuit evaluation: `isFolder && open && node.children?.map(...)`. For a file, `isFolder` is `false`, so the entire expression evaluates to `false` and `TreeNode` is never called recursively. Even for folders, we only recurse when `open` is `true`, so collapsed subtrees are never rendered.

**Q: How would you add drag-to-reorder?**
A: Attach `draggable`, `onDragStart`, `onDragOver`, and `onDrop` handlers to each node row. Track the dragged node ID in state. On `drop`, reorder the `children` array of the parent node (requires the parent's data to be in state, not a static constant). For a production implementation, a library like `dnd-kit` handles all the edge cases.
