# Accordion

## What to build
A list of collapsible sections. Clicking a header toggles its content panel open or closed.
Two modes:
- **single-open** (default): only one panel open at a time — opening a new one closes the previous
- **multi-open**: any number of panels can be open simultaneously

## Think before coding (30 sec)
- Single mode: one state variable holding the open ID (or null)
- Multi mode: a `Set` of open IDs — `Set` gives O(1) lookup vs O(n) array `.includes()`
- Never mutate a Set in place — copy it first (`new Set(prev)`) or React skips the re-render
- Use `aria-expanded`, `aria-controls`, `role="region"`, `aria-labelledby` for accessibility

## State design

| Mode | State type | Why |
|---|---|---|
| `singleOpen` | `string \| null` | Simple — exactly zero or one ID is open |
| multi-open | `Set<id>` | O(1) has/add/delete; reflects "bag of open IDs" clearly |

```js
const [openSingle, setOpenSingle] = useState(singleOpen ? initial : null);
const [openMany, setOpenMany]     = useState(() => new Set(...)); // lazy init
```

Lazy initializer `() => new Set(...)` runs only on mount — avoids re-creating the Set on every render.

## Core logic explained

```js
const toggle = (id) => {
  if (singleOpen) {
    setOpenSingle((cur) => (cur === id ? null : id)); // toggle: close if already open
    return;
  }
  setOpenMany((prev) => {
    const next = new Set(prev); // COPY first — mutating prev directly skips re-render
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};
```

## Key concepts
- **Set for O(1) lookups**: `set.has(id)` is O(1); `array.includes(id)` is O(n)
- **Never mutate state directly**: React uses reference equality — returning the same Set reference means no re-render
- **Functional state update**: `setOpenMany(prev => ...)` — use when next state depends on previous, avoids stale closures
- **Conditional render vs CSS hide**: `{open ? item.content : null}` unmounts the DOM entirely — heavy sub-trees (tables, charts) aren't kept alive when closed

## Interview follow-ups

**Q: Why use a Set instead of an array for multi-open?**
A: `set.has(id)` is O(1); `array.includes(id)` is O(n). More importantly, Set's API (`add`, `delete`, `has`) matches the "bag of open IDs" mental model perfectly. With an array you'd need to filter/push which is more code.

**Q: Why copy the Set (`new Set(prev)`) before modifying it?**
A: React uses reference equality to detect state changes. If you mutate the existing Set and return the same reference, React sees `oldState === newState` and skips the re-render entirely. Always return a NEW object/array/Set from state updater functions.

**Q: Why use conditional rendering instead of `display:none`?**
A: Conditional rendering removes the DOM node entirely. CSS hide keeps it in the DOM but invisible. For accordion panels that may contain heavy components (data tables, charts), unmounting saves memory. The trade-off: local state inside the panel (scroll position, form input) resets every time it closes.

**Q: How would you animate the expand/collapse?**
A: CSS `max-height` transition: animate from `max-height: 0` to a large value (e.g., `500px`). Remove the `hidden` attribute and use `max-height + overflow: hidden` instead. Or use Framer Motion's `AnimatePresence` for more control.
