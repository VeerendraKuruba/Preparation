# 07 - Form Builder (Data-Driven Dynamic Form)

## What to Build

A form that renders itself from a **config array** rather than hardcoded JSX. You define what fields exist, what type each one is, and whether it is required — the component renders the right input element automatically. Adding a new field to the form means adding one object to the array, not writing new JSX or new state.

---

## The Core Idea: Data-Driven UI

The `fields` array is the single source of truth:

```js
const fields = [
  { name: 'username', label: 'Username',  type: 'text',     required: true  },
  { name: 'age',      label: 'Age',       type: 'number',   required: false },
  { name: 'role',     label: 'Role',      type: 'select',   options: ['admin', 'user'] },
  { name: 'agree',    label: 'I agree',   type: 'checkbox', required: true  },
];
```

`FormBuilder` maps over this array and passes each definition to `FieldInput`, which decides what element to render.

---

## Field Definition Shape

```ts
{
  name:     string          // unique key, used as HTML id and state key
  label:    string          // visible label text
  type:     'text' | 'number' | 'checkbox' | 'select'
  required?: boolean        // validated on submit
  options?:  string[]       // only for type: 'select'
}
```

---

## Initial Values: Computed from Field Type

```js
const initial = useMemo(() => {
  const o = {};
  for (const f of fields) {
    if (f.type === 'checkbox')    o[f.name] = false;
    else if (f.type === 'number') o[f.name] = 0;
    else                          o[f.name] = f.options?.[0] ?? '';
  }
  return o;
}, [fields]);
```

Why this matters: React requires controlled inputs to always have a **defined** value. If a checkbox received `value={undefined}` React would warn about switching from uncontrolled to controlled. Starting with `false` for checkboxes and `0` for numbers prevents this.

---

## Validation: Only on Submit

Errors are collected into a local object first and applied with a single `setErrors` call — one re-render instead of one per field:

```js
const nextErr = {};
for (const f of fields) {
  if (!f.required) continue;
  const val = values[f.name];
  if (val === '' || val === null || val === undefined || val === false) {
    nextErr[f.name] = 'Required';
  }
}
setErrors(nextErr);
if (Object.keys(nextErr).length) return;
onSubmit(values);
```

---

## FieldInput: The Dispatcher Component

`FieldInput` acts as a polymorphic renderer. It reads `def.type` and returns the right JSX:

- `checkbox` — `<input type="checkbox" checked={Boolean(value)} />`
- `select` — `<select>` with mapped `<option>` elements
- `text` / `number` — `<input type="text|number" value={...} />`

Each branch sets up the correct `onChange` value (boolean for checkbox, number for number inputs, string for everything else).

---

## Interview Questions

**Q: What does "data-driven UI" mean and what are its benefits?**

A: The form's structure is described by data (the `fields` array) rather than hardcoded in JSX. Adding a field means adding one object to the array — no new JSX, no new `useState`, no new event handler. The form can also be configured from outside (e.g. from an API response), making it reusable across different forms without changing the component code.

**Q: How do you add a new field type, say `textarea`?**

A: Add a new branch in `FieldInput`: `if (def.type === 'textarea') { return <textarea ... /> }`. The initial value in `FormBuilder` would default to `''` (the else branch already handles it). Everything else stays the same — the fields array drives the rest.

**Q: What is a controlled form / controlled input?**

A: A controlled input is one where React state is the single source of truth for the input's value. The input reads `value={values[f.name]}` from state and writes back via `onChange`. The DOM never holds its own copy of the value — React always wins. The opposite is an uncontrolled input, where a `ref` reads the DOM's own value. Controlled inputs are preferred because you can validate, format, or derive values synchronously on every keystroke.

**Q: Why validate on submit rather than on every keystroke?**

A: Showing "Required" the moment a user focuses an empty field is jarring UX — they haven't had a chance to type yet. Validating on submit shows errors only after the user has expressed intent to finish. A common middle ground is validating on blur (when the field loses focus), which the multi-step form with validation component (09) demonstrates with the "touched" pattern.
