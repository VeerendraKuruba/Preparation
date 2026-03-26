# 08 - Searchable Dropdown

## What to Build

A dropdown where the user can **type to filter options** — like a native `<select>` combined with a search input. The user clicks or tabs into the input, the option list appears, they type to narrow it down, and select with a click or keyboard. It is fully keyboard-navigable and accessible to screen readers.

---

## State

| State variable | Type | Purpose |
|---|---|---|
| `open` | `boolean` | Whether the option list is currently visible |
| `q` | `string` | The search text the user is typing (controlled input value when open) |
| `hi` | `number` | Highlight index — which option in the filtered list is active (keyboard nav) |

The **selected value** is owned by the parent (controlled component pattern) — passed in as `value` and reported back via `onChange`.

---

## Filtered Options with useMemo

```js
const filtered = useMemo(() => {
  const s = q.trim().toLowerCase();
  if (!s) return options;
  return options.filter((o) => o.label.toLowerCase().includes(s));
}, [options, q]);
```

Recomputed only when `options` or `q` changes — not on every render.

---

## Key Trick: onMouseDown preventDefault

Browser event order when clicking a list item:

```
mousedown  →  blur (on the input)  →  mouseup  →  click
```

Without the fix: `mousedown` on the option would blur the input, the `onBlur` handler would close the list (even with a 100ms delay the state would eventually update), and the `click` might land on a closed list.

**The fix:**

```jsx
onMouseDown={(e) => e.preventDefault()}
```

`preventDefault` on `mousedown` stops the browser from shifting focus away from the input. The input never fires `onBlur`, so the list stays open and the `click` fires cleanly.

---

## Keyboard Navigation

All handled in `onKeyDown`:

| Key | Action |
|---|---|
| `ArrowDown` | Open list (if closed) or move highlight down (clamped at last item) |
| `ArrowUp` | Move highlight up (clamped at first item) |
| `Enter` | Confirm the highlighted option (`commit(filtered[hi])`) |
| `Escape` | Close the list |

`e.preventDefault()` is called on `ArrowDown` and `ArrowUp` to stop the browser from scrolling the page — the default action of arrow keys in most contexts.

---

## ARIA: Combobox Pattern

```jsx
<input
  role="combobox"
  aria-expanded={open}
  aria-controls={listId}
  aria-activedescendant={open && filtered[hi] ? `${listId}-opt-${hi}` : undefined}
  aria-autocomplete="list"
/>
<ul id={listId} role="listbox">
  <li role="option" aria-selected={idx === hi} id={`${listId}-opt-${idx}`}>...</li>
</ul>
```

- `aria-expanded` — screen reader announces whether the list is open
- `aria-controls` — links the input to its listbox by ID
- `aria-activedescendant` — tells screen readers which option is highlighted WITHOUT moving DOM focus away from the input. The user can keep typing while the screen reader announces the highlighted item.
- `useId()` — generates stable unique IDs per component instance so multiple dropdowns on the same page don't collide.

---

## Input Value: Two Modes

```js
value={open ? q : selected?.label ?? ''}
```

- **Open** — show the raw search query so the user sees what they typed
- **Closed** — show the selected option's human-readable label (or empty if nothing is selected)

---

## Interview Questions

**Q: Why call e.preventDefault() on option mousedown?**

A: Browsers fire events in this order: `mousedown` → `blur` → `mouseup` → `click`. When the user clicks a list item, `mousedown` on the option triggers a focus change away from the input, which fires the input's `onBlur`. Our blur handler closes the list, so by the time `click` fires the list is gone. `preventDefault` on `mousedown` stops the browser from moving focus, so the input never blurs and the click lands on the visible option.

**Q: What is aria-activedescendant and why use it instead of moving focus to each list item?**

A: `aria-activedescendant` is set on the focused element (the input) and points to the ID of the "logically active" child element (the highlighted option). Screen readers announce that option as if it were focused — without actually moving DOM focus away from the input. This is the correct combobox pattern: focus stays in the input so the user can keep typing; the screen reader tracks the highlighted option via the attribute.

**Q: How would you handle a list of 1000+ options without performance problems?**

A: Three approaches. First, keep the `useMemo` filtering so the full list isn't re-filtered on every render that doesn't change `q`. Second, add debouncing to `q` updates so filtering runs less frequently during fast typing. Third, for very large lists use **virtualisation** — only render the DOM nodes for the ~10 visible items using a windowing library like `react-window`, regardless of how many items are in the filtered array. The scroll position and `hi` index still reference the full filtered list; only the rendered `<li>` elements change.

**Q: Why use useId() instead of a hardcoded string for the list ID?**

A: If you hardcode `id="dropdown-list"` and render this component twice on the same page, both instances share the same ID, which breaks the ARIA relationship and is invalid HTML. `useId()` generates a unique ID per component instance, so each dropdown's input and list are correctly linked regardless of how many instances exist.
