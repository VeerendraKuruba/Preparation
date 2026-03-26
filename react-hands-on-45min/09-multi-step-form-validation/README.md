# 09 - Multi-Step Form with Validation

## What to Build

A multi-step form (like a signup wizard) that adds **per-field validation** to the basic multi-step pattern. Fields are validated before the user can advance to the next step. Crucially, error messages only appear **after the user has interacted with a field** — not before — using the "touched" pattern.

---

## State

| State variable | Type | Purpose |
|---|---|---|
| `idx` | `number` | Which step (0-based) is currently visible |
| `values` | `object` | Flat object accumulating all field values across all steps |
| `errors` | `object` | Validation errors for the current step, keyed by field name |
| `touched` | `object` | Tracks which fields the user has blurred at least once |

---

## The Touched Pattern

`touched` is a plain object: `{ fieldName: true }`. A field gets added to it when the user leaves it (`onBlur`).

Error display condition:

```jsx
{touched[f.name] && errors[f.name] && (
  <div>{errors[f.name]}</div>
)}
```

**Both** conditions must be true. This means:

- On first render: no fields are touched, no errors shown even if all fields are empty.
- After the user types in field A and tabs away: field A is now touched. If it fails validation, its error appears.
- If the user clicks **Next** without touching anything: `goNext` force-marks all current-step fields as touched, so all errors become visible immediately.

---

## Key Trick: Force-Touch on Next

When the user clicks Next:

```js
setTouched((t) => {
  const n = { ...t };
  for (const f of step.fields) n[f.name] = true;
  return n;
});
```

This spreads the existing touched state (preserving other steps' touched fields) and marks every current-step field as touched. Any validation errors that were suppressed (because the fields were pristine) now display.

---

## Validate Only the Current Step

```js
function validateStep(step, values) {
  const e = {};
  for (const f of step.fields) {
    const v = values[f.name]?.trim() ?? '';
    if (!v) { e[f.name] = 'Required'; continue; }
    if (f.type === 'email' && !validateEmail(v)) e[f.name] = 'Invalid email';
  }
  return e;
}
```

Only `step.fields` is looped — fields from other steps are never checked. The user can't be blocked by errors on a step they haven't reached yet.

---

## noValidate and ARIA

```jsx
<form noValidate>
```

`noValidate` disables the browser's built-in validation tooltips. Without it, the browser might show its own "Please fill in this field" popup on submit, which conflicts with our custom error display.

Accessibility is restored manually:

```jsx
<input
  aria-invalid={Boolean(errors[f.name])}
  aria-describedby={errors[f.name] ? `${f.name}-err` : undefined}
/>
<div id={`${f.name}-err`}>{errors[f.name]}</div>
```

- `aria-invalid` — tells screen readers the field is in an error state
- `aria-describedby` — links the input to its error message so screen readers read it aloud when the field is focused

---

## Data Preservation Across Steps

Same spread operator pattern as the simple multi-step form:

```js
setValues((p) => ({ ...p, [f.name]: e.target.value }))
```

All field values live in one flat `values` object. Changing steps never resets this object — only `idx` changes.

---

## Interview Questions

**Q: What is the "touched" pattern and why use it?**

A: The `touched` object tracks which fields the user has explicitly interacted with (blurred). Errors are only displayed for touched fields. Without it, a fresh form would immediately show "Required" on every empty field before the user has typed anything — which is jarring and unhelpful. The pattern gives the user a clean start and only shows errors after they have had a chance to interact with a field. Clicking Next force-marks all fields as touched so errors for skipped fields still appear.

**Q: Why validate only the current step on Next, not the entire form?**

A: The user hasn't seen future steps yet, so they cannot have filled them in. Running full-form validation on step 1 would surface "Required" errors for fields on steps 2 and 3 that the user hasn't encountered — blocking them for no good reason. Each step is its own validation boundary: validate when the user tries to leave it, not before.

**Q: Why add noValidate to the form element?**

A: Without `noValidate`, when the user submits the form the browser fires its own HTML5 validation checks (based on `type="email"`, `required` attributes etc.) and shows its own styled tooltips. These tooltips vary across browsers, cannot be styled consistently, and fire before our `onSubmit` handler. `noValidate` suppresses all of that so our custom logic has full control over validation timing and error display. We then replicate the accessibility signals manually with `aria-invalid` and `aria-describedby`.

**Q: How does the touched state survive moving between steps?**

A: `setTouched` always spreads the existing touched object: `{ ...t, [f.name]: true }`. Moving between steps only changes `idx`. The `touched` object is never reset, so fields the user touched on step 1 remain marked as touched when they go back to step 1 — their errors stay visible if the fields are still invalid.

**Q: Why use functional updates like setIdx((i) => i + 1) instead of setIdx(idx + 1)?**

A: Functional updates read the **latest** state value at the time React processes the update, not the `idx` value captured in the closure at the time the handler was created. In most cases they are equivalent, but using functional updates is a good habit for state transitions that depend on the current value — it avoids stale closure bugs in scenarios with batched updates or concurrent rendering.
