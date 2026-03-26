# Tabs

## What to build
A row of tab buttons with corresponding content panels.
Only one panel is visible at a time. The active tab is tracked by index.
Keyboard navigation (ArrowLeft / ArrowRight) cycles through tabs following the ARIA APG pattern.

## Think before coding (30 sec)
- State: just one number — `activeTab` index
- Roving tabIndex: active tab = `tabIndex=0`, all others = `tabIndex=-1`
- Arrow key navigation with modular wrap-around arithmetic
- Use `useId` for stable ARIA IDs linking tabs to panels
- Panels: use `hidden` attribute (not conditional render) to preserve panel state

## State design

```js
const [i, setI] = useState(0); // index of the active tab
```

Single integer — simple and sufficient. No need for IDs or strings.

## Core logic explained

```js
// Roving tabIndex: only the active tab is Tab-reachable
tabIndex={i === idx ? 0 : -1}

// Modular wrap-around — +len prevents negative results on ArrowLeft
// e.g. with len=3: (0 - 1 + 3) % 3 = 2  (wraps to last tab)
if (e.key === 'ArrowRight') return (cur + 1) % len;
return (cur - 1 + len) % len;
```

## Key concepts
- **Roving tabIndex**: one element in a group has `tabIndex=0` (in natural Tab order); all others have `tabIndex=-1`. Users Tab into the group, then use Arrow keys within it — matches ARIA APG composite widget spec
- **`useId`**: generates a unique prefix per Tabs instance — prevents ID collisions if `<Tabs>` renders twice on the same page
- **`hidden` not conditional render**: tab panels should preserve their internal state (partially filled form, scroll position) when inactive. `hidden` keeps the DOM node alive but removes it from the accessibility tree
- **`useCallback`**: memoises the keyboard handler — stable reference avoids unnecessary child re-renders if child components are wrapped in `React.memo`

## ARIA wiring

| Element | Role | Key attributes |
|---|---|---|
| Container | `role="tablist"` | `aria-label` |
| Button | `role="tab"` | `aria-selected`, `aria-controls`, `tabIndex` |
| Panel | `role="tabpanel"` | `aria-labelledby`, `hidden` |

## Interview follow-ups

**Q: What is the roving tabIndex pattern?**
A: Only ONE element in a group has `tabIndex=0` at any time; all others have `tabIndex=-1`. This means one Tab keypress gets you into the group, then Arrow keys navigate within it. Without it, users would need to Tab through every single tab button — slow and unexpected.

**Q: Why use `hidden` instead of conditional rendering for panels?**
A: Tab panels are expected to preserve their internal state (partially filled form, scroll position, focused sub-element). Conditional rendering unmounts the component and destroys all local state. `hidden` keeps the DOM node alive but removes it from the accessibility tree — which is exactly correct ARIA behaviour for tab panels.

**Q: How would you add keyboard focus-following after Arrow key navigation?**
A: Store refs for each tab button in a ref array, then call `tabRefs.current[newIndex]?.focus()` inside the `onKeyDown` handler after computing the new index. React doesn't auto-focus on state changes, so manual focus management is required.

**Q: How does `useCallback` help here?**
A: Without it, every render creates a new `onKeyDown` function reference. If the tablist is inside a `React.memo`-wrapped component, a new function reference on every render defeats the memoization. `useCallback([labels.length])` means the function only re-creates when the number of tabs changes.
