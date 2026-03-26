# Star Rating

## What to build
A row of clickable star buttons (★/☆) that let users select a numeric rating.
Features:
- **Hover preview**: stars light up as the mouse moves, showing what the rating *would* be
- **Committed value**: the actual selected rating — owned by the parent (controlled component)
- **Accessible**: each button has `aria-label` and `aria-pressed`

## Think before coding (30 sec)
- I need two values: `hover` (ephemeral, local) and `value` (committed, from parent)
- Display = `hover ?? value` — show hover while hovering, fall back to committed on mouse leave
- Use `Array.from({ length: max }, ...)` to generate N stars without a pre-built array
- Each star needs `aria-label="N star(s)"` and `aria-pressed` for accessibility

## State design

| State | Where it lives | Why |
|---|---|---|
| `hover` | Local `useState` | Parent doesn't need it — pure UI preview |
| `value` | Parent (prop) | Committed rating — parent must own it |

Two separate values because display and committed are different concerns.

## Core logic explained

```js
const [hover, setHover] = useState(null);

// ?? not || because value=0 is a valid falsy number
// || would incorrectly skip 0; ?? only falls through for null/undefined
const display = hover ?? value;

// A star is filled if its 1-based number is within the display range
const active = n <= display;
```

## Key concepts
- **Controlled component**: `value` and `onChange` are owned by the parent; this component only owns `hover`
- **Nullish coalescing (`??`)**: safer than `||` for numeric values — only falls through on `null`/`undefined`
- **`Array.from({ length: max }, mapper)`**: creates and maps N elements in one step — cleaner than `[...Array(max)].map(...)`
- **ARIA**: `role="group"` + `aria-label="Rating"` groups stars; `aria-pressed` reflects the committed selection

## Interview follow-ups

**Q: Why `??` instead of `||` for `hover ?? value`?**
A: `||` treats any falsy value (including `0`) as "use the right side". If `value=0` were valid, `|| 0` would be skipped. `??` only falls through for `null` or `undefined`, making it semantically correct here.

**Q: Why two state values (hover + value)?**
A: They represent different things — hover is ephemeral UI feedback (resets on mouse leave), value is the committed selection that persists. Mixing them would mean you'd need to track "last committed" separately anyway.

**Q: How would you make it read-only?**
A: Remove the `onClick` and `onMouseEnter`/`onMouseLeave` handlers, or add a `readOnly` prop that conditionally skips them. Derive display directly from `value` with no hover logic.

**Q: How would you add keyboard support?**
A: The buttons already handle Enter/Space natively. For Arrow key navigation (radio-group pattern), apply the roving tabIndex technique: only the selected star has `tabIndex=0`, and ArrowLeft/ArrowRight move selection and focus.
