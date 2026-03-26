# 20 - Modal System

## What to Build

A **global modal system** where any component in the app can open or close a modal — no prop drilling required.

- `ModalProvider` wraps the app and stores all modal state in React Context.
- Any component calls `useModal()` to get `openModal(title, renderFn)` and `closeModal()`.
- Modals render via **React Portal** directly into `document.body`, outside the component tree.
- Supports **stacked/nested modals** — e.g. a confirmation dialog opened from inside a form modal.

---

## Core Pattern

```
ModalProvider (Context)
  └── Any component: openModal('Title', ({ close }) => <form>...)
        └── ModalLayer renders via createPortal into document.body
```

**Key building blocks:**

| Concept | Why |
|---|---|
| `Context API` | Distribute `openModal`/`closeModal` globally without prop drilling |
| `Stack (array)` | `stack.push()` = open, `stack.pop()` = close — enables nested modals |
| `createPortal` | Renders outside parent's DOM, avoiding CSS `overflow:hidden` and z-index bugs |
| `useRef` (seq counter) | Increment ID without triggering re-render |
| `useCallback + useMemo` | Stabilise context value — consumers don't re-render unnecessarily |
| `useId()` | Generates stable ID to wire `aria-labelledby` to the dialog title |

---

## Why Array (Stack), Not a Single Modal

A single boolean/object can only represent **one modal at a time**.

A stack (array) lets you do:
```
openModal('Settings', ...)  →  stack = [settings]
openModal('Confirm Delete', ...)  →  stack = [settings, confirm]
closeModal()  →  stack = [settings]   ← settings is still there!
```

Each entry is independent. Closing always removes the **last** item (pop).

---

## Escape Key — Only Closes the Top Modal

```jsx
// In ModalProvider:
{stack.map((entry, i) => (
  <ModalLayer
    closeOnEscape={i === stack.length - 1}  // only the LAST modal gets this
    ...
  />
))}
```

`useCloseOnEscape` conditionally registers a `keydown` listener. Only one listener exists at any time — the topmost modal's. One `Escape` = one close.

**The "ref trick"** — the event listener references `ref.current` (not a closure over `onClose`), so it always calls the latest version of the function without re-registering on every render.

---

## Backdrop Click to Close

```jsx
onMouseDown={(e) => e.target === e.currentTarget && onClose()}
```

`e.target === e.currentTarget` is only true when the user clicked the **backdrop div itself**, not something inside it. Clicks inside the modal card call `e.stopPropagation()` to prevent bubbling up to the backdrop.

---

## ARIA Accessibility

```jsx
<div role="dialog" aria-modal="true" aria-labelledby={titleId}>
  <h2 id={titleId}>{entry.title}</h2>
```

- `role="dialog"` — ARIA landmark for screen readers
- `aria-modal="true"` — tells screen readers to trap focus inside
- `aria-labelledby` — announces the dialog title when it opens

---

## Interview Questions

**Q: How is this different from a single modal component?**
A: A single modal only handles one modal at a time and requires the parent to manage open/close state explicitly. This system is global (any component can trigger it via context) and uses a stack so multiple modals can be open simultaneously — each one independent.

**Q: Why use a stack (array) instead of a single state object?**
A: So nested modals work correctly. If you open a "Settings" modal then trigger a "Confirm Delete" dialog from inside it, both need to exist simultaneously. A stack naturally supports this — `closeModal()` always removes the topmost one, revealing the one below.

**Q: Why does the modal render via `createPortal` into `document.body`?**
A: To escape the parent component's CSS context. A parent with `overflow: hidden` would clip the modal. A parent with a lower `z-index` stacking context would make the modal appear behind other elements. Portaling to `document.body` bypasses both problems.

**Q: How would you add modal animations?**
A: Wrap `ModalLayer` in a transition component (e.g. Framer Motion's `AnimatePresence`, or a CSS transition on mount/unmount). The `key={entry.id}` prop on each layer already enables React to track enter/exit transitions correctly.

**Q: What is the "ref trick" in `useCloseOnEscape`?**
A: The `useEffect` only re-runs when `enabled` changes (not every render), keeping the listener stable. But `onClose` is stored in `ref.current` which updates every render — so the listener always calls the latest `onClose` without needing to re-register. This avoids stale closures while keeping the listener stable.
