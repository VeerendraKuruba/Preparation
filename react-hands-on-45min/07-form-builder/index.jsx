import { useMemo, useState } from 'react';

// FieldInput — renders the correct input element for one field definition.
//
// Props:
//   def      — field definition: { name, label, type, options?, required? }
//   value    — current value from parent state
//   error    — error string for this field, or undefined
//   onChange — (newValue) => void — tells parent to update values[name]
function FieldInput({ def, value, error, onChange }) {
  const id = `field-${def.name}`; // unique DOM id for label association

  // ── CHECKBOX ────────────────────────────────────────────────────────────
  if (def.type === 'checkbox') {
    return (
      <div style={{ marginBottom: 12 }}>
        <label htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            // e.target.checked is a boolean — pass it directly
            onChange={(e) => onChange(e.target.checked)}
          />{' '}
          {def.label}
        </label>
        {error && <div style={{ color: 'crimson', fontSize: 12 }}>{error}</div>}
      </div>
    );
  }

  // ── SELECT ───────────────────────────────────────────────────────────────
  if (def.type === 'select') {
    return (
      <div style={{ marginBottom: 12 }}>
        <label htmlFor={id} style={{ display: 'block', marginBottom: 4 }}>
          {def.label}
        </label>
        <select
          id={id}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
        >
          {(def.options ?? []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {error && <div style={{ color: 'crimson', fontSize: 12 }}>{error}</div>}
      </div>
    );
  }

  // ── TEXT or NUMBER ───────────────────────────────────────────────────────
  // Anything that is not checkbox or select falls through here.
  const inputType = def.type === 'number' ? 'number' : 'text';

  return (
    <div style={{ marginBottom: 12 }}>
      <label htmlFor={id} style={{ display: 'block', marginBottom: 4 }}>
        {def.label}
      </label>
      <input
        id={id}
        type={inputType}
        value={value == null ? '' : String(value)}
        onChange={(e) =>
          // Convert back to a number for number fields; keep as string for text
          onChange(def.type === 'number' ? Number(e.target.value) : e.target.value)
        }
      />
      {error && <div style={{ color: 'crimson', fontSize: 12 }}>{error}</div>}
    </div>
  );
}

// FormBuilder — the main component.
//
// Props:
//   fields   — array of field definition objects
//   onSubmit — (values: Record<string, any>) => void
//
// Field definition shape:
//   { name, label, type: 'text' | 'number' | 'checkbox' | 'select',
//     required?: boolean, options?: string[] }
export function FormBuilder({ fields, onSubmit }) {
  // Compute initial values from field definitions once (useMemo).
  // Rule: checkbox → false (boolean), number → 0, text/select → first option or ''
  // This ensures every input starts as a CONTROLLED input (value is never undefined).
  const initial = useMemo(() => {
    const o = {};
    for (const f of fields) {
      if (f.type === 'checkbox')    o[f.name] = false;
      else if (f.type === 'number') o[f.name] = 0;
      else                          o[f.name] = f.options?.[0] ?? '';
    }
    return o;
  }, [fields]);

  // values — the form's current state: { [fieldName]: value }
  const [values, setValues] = useState(initial);

  // errors — validation results: { [fieldName]: 'Required' } or empty object
  const [errors, setErrors] = useState({});

  // set — immutably updates a single field's value in the values object
  const set = (name, v) => setValues((prev) => ({ ...prev, [name]: v }));

  // submit — validates required fields on form submit, then calls onSubmit if valid.
  // Errors are collected into a local object first so we set state only once.
  const submit = (e) => {
    e.preventDefault();

    const nextErr = {};
    for (const f of fields) {
      if (!f.required) continue;
      const val = values[f.name];
      if (val === '' || val === null || val === undefined || val === false) {
        nextErr[f.name] = 'Required';
      }
    }

    setErrors(nextErr); // apply all errors in a single re-render

    if (Object.keys(nextErr).length) return; // stop if any errors exist

    onSubmit(values);
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 400 }}>
      {/* Map each field definition to a FieldInput.
          key={f.name} is stable so React does not unmount/remount fields on re-render. */}
      {fields.map((f) => (
        <FieldInput
          key={f.name}
          def={f}
          value={values[f.name]}
          error={errors[f.name]}
          onChange={(v) => set(f.name, v)}
        />
      ))}
      <button type="submit">Submit</button>
    </form>
  );
}
