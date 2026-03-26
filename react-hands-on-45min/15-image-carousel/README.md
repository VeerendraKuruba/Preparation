# 15 — Image Carousel

## What to Build

An image slider that shows one image at a time from an array of slides.

Features:
- Prev / Next buttons for linear navigation
- Dot indicators that also act as direct-navigation buttons
- Circular wrapping — going past the last slide wraps back to the first, and vice versa
- ARIA live region that announces the current slide to screen readers on every change

---

## State

| Variable | Type | Purpose |
|---|---|---|
| `i` | `number` | Zero-based index of the currently displayed slide |

That is the only state. Everything else is derived from it.

---

## Key Trick: Circular Navigation with Modulo

```js
// Next: advance by 1, wrap last → first
const next = () => setI((x) => (x + 1) % len);

// Prev: go back 1, wrap first → last
const prev = () => setI((x) => (x - 1 + len) % len);
```

**Why `(x - 1 + len) % len` instead of just `(x - 1) % len`?**

JavaScript's `%` operator returns negative results when the left operand is negative.

```
(0 - 1) % 5  →  -1   ← invalid array index, breaks everything
(0 - 1 + 5) % 5  →  4  ← correct, wraps to the last slide
```

The `+ len` before the `%` guarantees the intermediate value is always non-negative, so `%` always returns a clean index in range `[0, len - 1]`.

---

## ARIA: Live Region for Screen Readers

```jsx
<div
  aria-live="polite"
  style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
>
  Slide {i + 1} of {len}
</div>
```

**What is an ARIA live region?**

A DOM element marked with `aria-live` is monitored by screen readers. When its text content changes, the reader announces the new text. This lets a blind user hear "Slide 3 of 5" every time the slide changes — without them having to move focus manually.

**`"polite"` vs `"assertive"`:**
- `"polite"` — waits for the user to finish their current action (e.g., after the button click is announced) before reading the update. Right for status updates.
- `"assertive"` — interrupts whatever is being read immediately. Reserved for critical alerts like "Session expiring in 30 seconds."

**Visually-hidden pattern (`sr-only`):**
The CSS (`position: absolute`, `width/height: 1px`, `overflow: hidden`, `clip`) hides the element visually while keeping it in the accessibility tree. Screen readers still see it; sighted users never do.

---

## How to Add Autoplay

```jsx
useEffect(() => {
  if (!autoplay) return;
  const id = setInterval(next, 3000);
  return () => clearInterval(id); // clean up on unmount
}, [autoplay]);
```

Pass an `autoplay` prop. On mount, start a 3-second interval that calls `next()`. The cleanup function cancels it on unmount or when autoplay is disabled.

---

## Interview Questions

**Q: Why `(index - 1 + length) % length` instead of just `(index - 1) % length`?**

A: JavaScript's `%` can return negative numbers. `(-1 % 5)` is `-1`, not `4`. Adding `length` first ensures the value going into `%` is always positive, giving a clean circular result. Without the `+ length`, clicking Prev on the first slide would produce index `-1`, which is not a valid array index.

**Q: What is an ARIA live region?**

A: A DOM element with `aria-live` is monitored by screen readers. Any time its text content changes, the reader queues an announcement of the new text. It is how you communicate dynamic changes (status messages, slide number, search result count) to users who cannot see the visual update.

**Q: How to add autoplay?**

A: Add a `useEffect` that calls `setInterval(next, intervalMs)` when autoplay is enabled, and returns `clearInterval` as the cleanup. Also pause on hover (`onMouseEnter` / `onMouseLeave`) and when the tab is hidden (`document.visibilityState`) for good UX.
