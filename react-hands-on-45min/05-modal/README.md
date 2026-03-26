# Modal

## What to build
An accessible dialog overlay that appears above all other page content.
Key behaviours:
- Renders into `document.body` via a **React Portal** to escape CSS stacking contexts
- Pressing **Escape** closes it
- Clicking the **backdrop** (outside the dialog) closes it
- **Scroll lock**: prevents the page behind from scrolling
- **Focus management**: moves focus in on open, restores it to the triggering element on close

## Think before coding (30 sec)
- Use `createPortal` — parent `overflow:hidden` or `transform` can clip a normally rendered modal
- 3 things every modal must do: trap focus, lock scroll, close on Escape/backdrop
- Save `document.activeElement` before opening so focus can be restored on close
- Use `useRef` (not `useState`) for `lastActive` — restoring focus must not trigger a re-render

## State design

```js
// No modal-internal state — open/close is controlled by the parent via props
const panelRef   = useRef(null); // DOM ref for querying focusable children
const lastActive = useRef(null); // mutable value; changing it must NOT re-render
```

All state (`open`) lives in the parent. The modal only manages side effects.

## Core logic explained

```js
useEffect(() => {
  if (!open) return;

  lastActive.current = document.activeElement; // save focus position

  const onKey = (e) => { if (e.key === 'Escape') onClose(); };
  document.addEventListener('keydown', onKey);  // document-level, not modal div

  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';       // lock scroll

  // Focus first interactive element inside dialog (WCAG SC 2.4.3)
  panelRef.current?.querySelector('button, [href], input, ...')?.focus();

  return () => {
    document.removeEventListener('keydown', onKey); // prevent stale duplicate listeners
    document.body.style.overflow = prevOverflow;    // restore scroll
    lastActive.current?.focus?.();                  // restore focus
  };
}, [open, onClose]);
```

## Why Portal?

```
Without Portal:                    With createPortal:
<App>                              <App>
  <div style="overflow:hidden">      <div style="overflow:hidden">
    <Modal>  ← clipped!               (modal NOT here in DOM)
    </Modal>                        </div>
  </div>                           </App>
</App>                             <body>
                                     <Modal>  ← safe, on body
                                     </Modal>
                                   </body>
```

`createPortal` keeps the modal in the React component tree (context, event bubbling work normally) but mounts its DOM node on `document.body`, bypassing any parent CSS stacking context.

## Key concepts
- **Portal**: DOM node lives on `document.body`; React tree position is unchanged — context providers and event bubbling still work
- **Focus management**: save → move in → restore. Required by WCAG 2.4.3 so keyboard/screen reader users don't lose their place
- **`useRef` for `lastActive`**: storing the element in a ref means updating it does not trigger a re-render — it's a mutable side-channel value
- **`useEffect` cleanup**: removes the keydown listener and restores scroll. Without cleanup, each open adds a new listener — after 10 opens you'd have 10 listeners all calling `onClose`

## Interview follow-ups

**Q: Why use a Portal instead of rendering the modal inline?**
A: Portals let the modal's DOM node live on `document.body` while the React component stays in the tree. This bypasses any parent CSS that could clip or hide the modal (`overflow:hidden`, stacking contexts from `transform`/`filter`/`will-change`). Events still bubble through the React component tree as if it were inline, so context and error boundaries still work.

**Q: What is a focus trap and why does a modal need one?**
A: A focus trap confines keyboard Tab navigation within the modal while it is open. Without it, pressing Tab can move focus to elements behind the backdrop — users can interact with content that's visually blocked. A full implementation cycles focus through all focusable elements within the dialog and wraps from last back to first.

**Q: Why use `useRef` not `useState` for `lastActive`?**
A: `lastActive` is a mutable side-channel value used only in the cleanup function. Storing it in state would trigger a re-render every time the modal opens, which is unnecessary. `useRef` gives a stable container whose `.current` can be written without scheduling any renders.

**Q: Why `onMouseDown` not `onClick` for the backdrop close?**
A: With `onClick`, there's a timing issue: mousedown inside the dialog, drag to backdrop, mouseup fires a backdrop `click`. `onMouseDown` + checking `e.target === e.currentTarget` handles intent precisely — only a direct press on the backdrop closes the modal, not an accidental drag from inside the dialog.
