# Progress Bar

## What to build
A progress bar component that shows how far along a process is (0–100%).
It accepts `value`, `min`, and `max` as props.

## Think before coding (30 sec)
- I need to calculate percentage: `(value - min) / (max - min) * 100`
- Clamp between 0–100 so invalid values don't break the UI
- Use ARIA `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

## State design
No state needed — this is a pure display component (no interactivity).
All values come from props.

## Core logic explained

```js
const span = max - min;

// Guard divide-by-zero when min === max; normalise → percentage
const pct = span === 0 ? 0 : Math.round(((value - min) / span) * 100);

// ARIA spec: aria-valuenow must be within [aria-valuemin, aria-valuemax]
const clamped = Math.min(max, Math.max(min, value));
```

## Key concepts
- **Stateless/Pure component**: no useState, just takes props and renders
- **Derived value**: percentage is computed from props, not stored
- **ARIA**: `role="progressbar"` makes it accessible to screen readers
- **CSS transition**: `transition: width 0.25s ease` — the browser animates the width change automatically, no JS animation logic needed

## Interview follow-ups

**Q: What if value goes above max?**
A: Clamp it — `Math.min(100, Math.max(0, pct))` so the bar never overflows.

**Q: How would you make it animated?**
A: Add `transition: width 0.3s ease` in CSS — the width change animates automatically when the `value` prop updates.

**Q: What's the difference between a controlled and uncontrolled progress bar?**
A: This is always controlled — the parent drives the value. No internal state.

**Q: Why use `clamped` for aria-valuenow instead of the raw value prop?**
A: The ARIA spec requires `aria-valuenow` to be within `[aria-valuemin, aria-valuemax]`. Passing `value=150` with `max=100` would violate the spec and screen readers may behave unpredictably.

**Q: Why is this a stateless component? Could it have state?**
A: Progress is driven entirely by the parent (e.g., a file upload tracking bytes transferred). Having internal state would mean the bar could get out of sync with actual progress. Stateless is simpler and easier to test.
