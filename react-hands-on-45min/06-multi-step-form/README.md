# 06 - Multi-Step Form

## What to Build

A form broken into multiple sequential steps — like a signup wizard. The user fills in one screen of fields at a time and clicks **Next** to advance. A **Back** button lets them return to a previous step. On the final step the button says **Submit** and the collected data is shown as JSON.

---

## State

| State variable | Type | Purpose |
|---|---|---|
| `stepIndex` | `number` | Which step (0-based) is currently visible |
| `data` | `object` | Flat object accumulating all field values across all steps |
| `errors` | `object` | Validation errors for the current step keyed by field name |
| `donePayload` | `string \| null` | JSON string shown after final submission; null while in-progress |

---

## Key Trick: Spread Operator Preserves Previous Step Data

When the user types in a field the handler is:

```js
setData((prev) => ({ ...prev, [field.name]: e.target.value }))
```

`...prev` copies every field already in the object. `[field.name]: newValue` adds or overwrites just that one field. So when you move from step 1 to step 2 and come back, the step 1 answers are still in `data` — they were never cleared.

---

## Step Config Pattern

Steps are defined in a `STEPS` array:

```js
const STEPS = [
  { title: 'Account', fields: [{ name: 'email', ... }, { name: 'password', ... }] },
  { title: 'Profile', fields: [{ name: 'name',  ... }, { name: 'city',    ... }] },
];
```

The renderer just reads `STEPS[stepIndex]` — adding a new step means adding one object to the array with no changes to the rendering logic.

---

## Validation

`validateStep(step, data)` loops over the current step's fields, checks if required ones are blank, and returns `{ fieldName: 'Required' }` for each problem. If the returned object is non-empty, `next()` sets errors and returns early without advancing.

---

## Final Step: Show JSON Output

When the user submits the last step and validation passes:

```js
setDonePayload(JSON.stringify(data, null, 2));
```

This renders the entire `data` object as formatted JSON — proving all steps' answers were collected into one place.

---

## Interview Questions

**Q: How do you keep data from step 1 when you move to step 2?**

A: All field values live in a single `data` object in state. The `onChange` handler spreads the existing object and adds only the changed field: `{ ...prev, [name]: value }`. Moving between steps only changes `stepIndex` — `data` is never cleared, so every step's answers survive.

**Q: Why use a numeric index rather than a step name (like `'account'`, `'profile'`)?**

A: An index lets you use it directly to slice into the `STEPS` array (`STEPS[stepIndex]`) and for arithmetic (`stepIndex === STEPS.length - 1` to detect the last step, `stepIndex + 1` / `Math.max(0, stepIndex - 1)` to move forward or back). A string name would require a separate lookup to find the step object and extra logic to find the next/previous step in order.

**Q: How do you go back without losing data?**

A: The `back` function only decrements `stepIndex` — it never touches `data`. Since all values are stored in the same flat object, going back just re-renders the previous step's fields using the values that are already there.

**Q: Why use `useMemo` for the progress string?**

A: The progress string is derived from `stepIndex` and `step.title`. Without `useMemo` it would be recomputed on every render, including renders caused by typing (which changes `data`). `useMemo` with `[stepIndex, step.title]` as dependencies ensures the string is only recomputed when the step actually changes.
