# Todo App

## What to Build

A full CRUD todo list with filters. Features:

- Add tasks with an input + Enter key or button click
- Toggle completion with a checkbox (strikethrough text)
- Double-click a task label to enter inline edit mode, Enter or Save to commit
- Delete individual tasks
- Filter tabs: All / Active / Done

---

## State

| State variable | Type            | Purpose                                             |
|----------------|-----------------|-----------------------------------------------------|
| `items`        | array           | Master list of all todos                            |
| `text`         | string          | Controlled value of the "new task" input            |
| `filter`       | `'all'`\|`'active'`\|`'done'` | Which tab is active                |
| `editingId`    | string\|null    | ID of the item currently in edit mode, or null      |
| `editText`     | string          | Controlled value of the inline edit input           |

Each item object: `{ id: string, text: string, done: boolean }`

---

## Key Tricks

### crypto.randomUUID() for IDs

```js
{ id: crypto.randomUUID(), text: t, done: false }
```

Generates a cryptographically random UUID like `"110e8400-e29b-41d4-a716-446655440000"`. Stable and globally unique across all adds, removes, and reorders. Never use array index as a key.

### Double-click to edit

```jsx
// VIEW MODE
<span onDoubleClick={() => startEdit(item)}>{item.text}</span>

// EDIT MODE (rendered when editingId === item.id)
<input value={editText} onKeyDown={(e) => e.key === 'Enter' && commitEdit()} />
```

`startEdit` sets `editingId` and pre-populates `editText` with the current text so the user edits from the existing value, not a blank field.

### Filtered list is DERIVED (useMemo)

```js
const visible = useMemo(
  () => items.filter((t) =>
    filter === 'all'    ? true
    : filter === 'active' ? !t.done
    : t.done
  ),
  [items, filter]
);
```

`visible` is never stored in state. It recomputes only when `items` or `filter` changes. Storing it separately would require updating it in `add`, `toggle`, and `remove` — all places where it could diverge.

---

## CRUD Operations

| Operation     | Code pattern                                                   |
|---------------|----------------------------------------------------------------|
| Add           | `[...prev, { id: crypto.randomUUID(), text, done: false }]`   |
| Toggle done   | `prev.map(x => x.id === id ? { ...x, done: !x.done } : x)`   |
| Edit text     | `prev.map(x => x.id === id ? { ...x, text: t } : x)`         |
| Delete        | `prev.filter(x => x.id !== id)`                               |

All use functional setState (`prev => ...`) to safely compose with React's batching.

---

## Interview Questions

**Q: Why not use array index as key?**

React uses `key` to identify which DOM node maps to which list item during reconciliation. If you use array index as key, deleting item at index 0 shifts every other item's index down by 1 — React reuses the wrong DOM nodes, leaving stale state (e.g. a checked checkbox) on the wrong item. A stable UUID is unique regardless of the list's order or length.

---

**Q: How does the double-click edit pattern work?**

The `<span>` has `onDoubleClick={() => startEdit(item)}`. `startEdit` sets `editingId = item.id` and pre-fills `editText`. The list renders: `if (editingId === item.id)` show `<input + Save>`, else show `<span>`. Only one item can be in edit mode at a time because `editingId` is a single value. `commitEdit` clears `editingId`, reverting all rows to view mode.

---

**Q: Why is the filtered list derived and not stored?**

If `visibleItems` were stored in state, every operation that modifies `items` (`add`, `toggle`, `remove`) would also need to update `visibleItems`. That is three extra `setState` calls that could fall out of sync. A pure function of `items + filter` is always correct by definition, and `useMemo` means it is only recomputed when those two inputs actually change.
