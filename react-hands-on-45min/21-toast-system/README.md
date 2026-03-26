# 21 - Toast System

## What to Build

A **global notification toast system** — success/error/info banners that appear in the corner of the screen and auto-dismiss after a few seconds.

- `ToastProvider` wraps the app and exposes `show(opts)` and `dismiss(id)` via Context.
- Any component calls `useToast()` and fires `show({ message, variant, durationMs })`.
- Toasts render in a fixed overlay at the bottom-right, via a **React Portal**.
- Each toast auto-dismisses after its duration (default 3500ms). Manual close (×) also works.

---

## Core Pattern

```
ToastProvider (Context + state)
  └── show({ message, variant }) → push to toasts array + schedule setTimeout
  └── dismiss(id) → clearTimeout + remove from array
  └── ToastViewport → createPortal → document.body (fixed overlay)
```

**Key building blocks:**

| Concept | Why |
|---|---|
| `Context API` | Global `show`/`dismiss` without prop drilling |
| `toasts` array in state | Each toast is independent; array enables stacking |
| `useRef` for timers Map | Timer IDs are bookkeeping, not visual state — no re-render needed |
| `clearTimeout` before dismiss | Prevents the timer firing after the toast is already gone |
| `crypto.randomUUID()` | Collision-free IDs; callers can supply stable IDs for deduplication |
| `createPortal` | Fixed overlay is never broken by parent CSS `transform`/`filter` |
| `aria-live="polite"` | Screen readers announce new toasts without interrupting current speech |

---

## Auto-Dismiss Flow

```
show({ message: 'Saved!', variant: 'success' })
  1. Push toast into state array → renders on screen
  2. setTimeout(() => dismiss(id), 3500) → store timer ID in timers Map (ref)

dismiss(id) called (by timer OR by user clicking ×):
  1. clearTimeout(timers.get(id)) → cancel the pending timer
  2. timers.delete(id) → clean up the Map
  3. setToasts(list => list.filter(x => x.id !== id)) → remove from render
```

---

## Why `useRef` for Timers, Not `useState`

```jsx
const timers = useRef(new Map());   // correct
// vs
const [timers, setTimers] = useState(new Map());  // wrong
```

Timer IDs have **no visual impact**. Storing them in state would cause a re-render every time `setTimeout` or `clearTimeout` is called — for no reason. A ref mutates without triggering a render, making it the right tool for side-effect bookkeeping.

---

## Why `clearTimeout` Before Removing the Toast

If you skip `clearTimeout`, the original `setTimeout` callback still fires after its delay, even though the toast is already gone. It calls `dismiss(id)` again — which is harmless here (filtering a missing ID is a no-op), but it still calls `setToasts` unnecessarily and signals incorrect intent. Always clear timers you no longer need.

---

## Support for Variants

```jsx
show({ message: 'File saved', variant: 'success', durationMs: 2000 })
show({ message: 'Upload failed', variant: 'error', durationMs: 5000 })
show({ message: 'Loading...', variant: 'info', durationMs: 0 })  // sticky
```

`durationMs: 0` = sticky toast, only dismissible manually.

---

## Deduplication via Caller-Supplied ID

```jsx
show({ id: 'save-error', message: 'Could not save', variant: 'error' })
```

If the same ID is shown while a toast with that ID already exists, you can extend this to replace or skip it. Without a caller-supplied ID, `crypto.randomUUID()` ensures every toast is unique.

---

## Interview Questions

**Q: Why use `useRef` for timers instead of `useState`?**
A: Timer IDs are purely internal bookkeeping — we only need them to call `clearTimeout`. They have no visual impact, so storing them in state would cause unnecessary re-renders every time a timer is set or cleared. A ref mutates without triggering a render, which is exactly what we want.

**Q: Why call `clearTimeout` before removing a toast from state?**
A: If you don't clear the timer, it will still fire after the toast is gone and call `dismiss(id)` again. While harmless here (filter on missing ID is a no-op), it's still an unnecessary `setState` call and signals incorrect intent. Clearing the timer is the correct cleanup.

**Q: How do you stack vs replace toasts?**
A: Stack (current behaviour): every `show()` call pushes a new entry. Replace: check if a toast with the same ID already exists; if so, update it in-place instead of pushing. For deduplication, the caller passes a stable `id` string (e.g. `'save-error'`). The `show` function can check and bail early.

**Q: Why does `ToastViewport` render via `createPortal`?**
A: `position: fixed` should be viewport-relative, but a parent element with a CSS `transform`, `filter`, or `will-change` creates a new containing block, breaking fixed positioning. By portaling to `document.body`, the viewport is a direct child of `<body>`, which has no transform, so fixed positioning always works correctly.

**Q: What does `aria-live="polite"` do?**
A: It marks the container as a live region. When new content is added, screen readers queue the announcement to play after the current speech finishes — so it doesn't interrupt what the user is reading. `aria-relevant="additions text"` tells screen readers to only announce when items are added, not when they are removed.
