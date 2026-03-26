# 16 — Drag and Drop

## What to Build

A vertical list of items that the user can reorder by dragging and dropping — using the browser's built-in HTML5 Drag and Drop API, no external library.

Features:
- Drag any item and drop it on any other item to reorder
- The dragged item gets a blue highlight so the user can see what is in flight
- The list order is tracked in React state and updated immutably on each drop

---

## State

| Variable | Type | Purpose |
|---|---|---|
| `items` | `string[]` | The ordered list — single source of truth |
| `dragIndex` | `number \| null` | Index of the item currently being dragged; `null` when idle |

---

## HTML5 Native Drag API — Four Events

| Event | Where it fires | What to do |
|---|---|---|
| `onDragStart` | On the element you start dragging | Record which item is being dragged (`setDragIndex(index)`) |
| `onDragOver` | On any element you hover over while dragging | **MUST call `e.preventDefault()`** to allow dropping |
| `onDrop` | On the element you release over | Reorder the list |
| `onDragEnd` | Back on the original source element | Clean up `dragIndex` (handles cancelled drags too) |

---

## Key Trick: `onDragOver` MUST Call `e.preventDefault()`

```js
onDragOver={(e) => e.preventDefault()}
```

This is the single most common gotcha with the HTML5 drag API.

**Why is it required?**

The browser's default behaviour for `dragover` is to signal "this element is NOT a drop target." If you do not call `e.preventDefault()`, the browser never fires the `onDrop` event on that element. The drag appears broken — you can drag items around but releasing them does nothing.

`e.preventDefault()` overrides this default and signals "yes, this element accepts drops."

---

## Reorder Function: Immutable Array Surgery

```js
function reorder(list, from, to) {
  if (from === to) return list;      // nothing to do

  const next = list.slice();         // shallow copy — NEVER mutate state directly
  const [x] = next.splice(from, 1); // remove the item from its old position
  next.splice(to, 0, x);            // insert it at the new position
  return next;
}
```

**Why copy before splicing?**

`splice()` mutates the array in place. If called directly on the state array, you mutate React state, which breaks the rendering model. `slice()` gives us a copy we own, so `splice()` only touches the copy. The new array is then passed to `setItems()`.

**Step-by-step for dragging item 0 to position 2 in `['A','B','C','D']`:**
1. `slice()` → `['A','B','C','D']` (copy)
2. `splice(0, 1)` → removes `'A'`, copy is now `['B','C','D']`
3. `splice(2, 0, 'A')` → inserts `'A'` at index 2, copy is now `['B','C','A','D']`

---

## Interview Questions

**Q: Why must `onDragOver` call `e.preventDefault()`?**

A: The browser defaults to blocking drops on most elements. `preventDefault()` overrides that default, telling the browser "this is a valid drop target." Without it, the `onDrop` event never fires — the drag looks broken even though your handler is correctly wired up. It is the most common drag-and-drop bug.

**Q: Why copy the array with `slice()` before calling `splice()`?**

A: `splice()` mutates its array in place. Mutating the state array directly breaks React's rendering model — React detects changes by reference comparison, and a mutated array is the same reference. Always create a copy first (`slice()` or spread `[...arr]`), then mutate the copy, then pass the copy to the state setter.

**Q: When would you use a library like `@dnd-kit` instead of the native API?**

A: The native HTML5 API has real limitations: (1) touch devices (iOS/Android) do not support it at all; (2) you cannot style the drag ghost image reliably across browsers; (3) there is no built-in auto-scroll when dragging near a scrollable container edge; (4) complex scenarios like dragging between multiple lists get very verbose. Libraries like `@dnd-kit` or `react-beautiful-dnd` handle all of these. For interviews and simple prototypes, the native API is clean and dependency-free.
