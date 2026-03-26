import { useMemo, useState } from 'react';

// Steps configuration — the single source of truth for form structure.
// Adding a new step only requires adding an entry here.
const steps = [
  {
    id: 'account',
    title: 'Account',
    fields: [
      { name: 'email',    label: 'Email',    type: 'email' },
      { name: 'password', label: 'Password', type: 'text'  },
    ],
  },
  {
    id: 'profile',
    title: 'Profile',
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text' },
      { name: 'company',  label: 'Company',   type: 'text' },
    ],
  },
];

// Simple email format check. Intentionally lenient for interview purposes.
function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// validateStep — runs validation for ONE step's fields against current values.
// Returns { fieldName: 'Error message' } for each invalid field.
// An empty object means the step is valid.
//
// Only the current step is validated — we never block the user on fields from
// a step they haven't seen yet.
function validateStep(step, values) {
  const e = {};
  for (const f of step.fields) {
    const v = values[f.name]?.trim() ?? '';
    if (!v) { e[f.name] = 'Required'; continue; }
    if (f.type === 'email' && !validateEmail(v)) e[f.name] = 'Invalid email';
  }
  return e;
}

// MultiStepFormValidated — the main component.
//
// Props:
//   onComplete — (values) => void — called when the final step passes validation
export function MultiStepFormValidated({ onComplete }) {
  // idx — 0-based index into the steps array
  const [idx, setIdx] = useState(0);

  // values — a single flat object holding ALL field values across ALL steps.
  // The spread operator on each onChange merges without overwriting other steps.
  const [values, setValues] = useState({});

  // errors — validation errors for the CURRENT step, keyed by field name
  const [errors, setErrors] = useState({});

  // touched — tracks which fields the user has blurred at least once.
  // Errors are only DISPLAYED when touched[fieldName] is true.
  // This is the "touched pattern": show errors only after the user has left a field,
  // not before they have had a chance to fill it in.
  const [touched, setTouched] = useState({});

  const step   = steps[idx];
  const isLast = idx === steps.length - 1;

  // progress — memoized derived state used in the step indicator UI
  const progress = useMemo(() => ({ current: idx + 1, total: steps.length }), [idx]);

  // goNext — validates the current step and either shows errors or advances.
  const goNext = () => {
    // 1. Validate only the current step
    const v = validateStep(step, values);
    setErrors(v);

    // 2. Force-touch ALL fields in the current step so errors become visible
    //    even if the user never blurred a field (e.g. clicked Next immediately).
    setTouched((t) => {
      const n = { ...t };
      for (const f of step.fields) n[f.name] = true;
      return n;
    });

    // 3. Stop if there are any errors
    if (Object.keys(v).length) return;

    // 4. Submit on last step; otherwise advance
    if (isLast) onComplete?.(values);
    else setIdx((i) => i + 1);
  };

  // goBack — move to the previous step. No re-validation on back.
  const goBack = () => setIdx((i) => Math.max(0, i - 1));

  // onSubmit — prevents native browser form submission, then delegates to goNext
  const onSubmit = (e) => {
    e.preventDefault();
    goNext();
  };

  return (
    // noValidate — disables browser HTML5 validation tooltips.
    // We take full control of when and how errors are displayed.
    <form onSubmit={onSubmit} style={{ maxWidth: 420 }} noValidate>

      {/* Step indicator */}
      <div style={{ marginBottom: 12, fontSize: 13, color: '#444' }}>
        Step {progress.current} of {progress.total}: <strong>{step.title}</strong>
      </div>

      {step.fields.map((f) => (
        <div key={f.name} style={{ marginBottom: 12 }}>
          <label htmlFor={f.name} style={{ display: 'block', marginBottom: 4 }}>
            {f.label}
          </label>

          <input
            id={f.name}
            name={f.name}
            type={f.type === 'email' ? 'email' : 'text'}

            // Controlled input — value driven by React state.
            // Nullish coalescing ensures unset fields default to '' to avoid
            // the "uncontrolled → controlled" React warning.
            value={values[f.name] ?? ''}

            onChange={(e) =>
              // Spread operator merges the updated field without losing other steps' data.
              setValues((p) => ({ ...p, [f.name]: e.target.value }))
            }

            onBlur={() =>
              // Mark this field as touched when the user leaves it.
              // From this point on, any error for this field will be visible.
              setTouched((t) => ({ ...t, [f.name]: true }))
            }

            // aria-invalid — signals to screen readers that this field is in error
            aria-invalid={Boolean(errors[f.name])}

            // aria-describedby — links to the error message element.
            // Screen readers read the error when the user focuses this input.
            aria-describedby={errors[f.name] ? `${f.name}-err` : undefined}
          />

          {/* Touched pattern: show error ONLY if BOTH conditions are true:
              1. The user has blurred this field (touched) OR clicked Next (force-touched)
              2. Validation found an error for this field */}
          {touched[f.name] && errors[f.name] && (
            <div id={`${f.name}-err`} style={{ color: 'crimson', fontSize: 12 }}>
              {errors[f.name]}
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {/* type="button" prevents Back from triggering form submit */}
        <button type="button" onClick={goBack} disabled={idx === 0}>
          Back
        </button>
        {/* type="submit" triggers form onSubmit → goNext */}
        <button type="submit">{isLast ? 'Finish' : 'Next'}</button>
      </div>
    </form>
  );
}
