import { useMemo, useState } from 'react';

// Step definitions — the single source of truth for form structure.
// Each step has a title and a list of field descriptors.
const STEPS = [
  {
    title: 'Account',
    fields: [
      { name: 'email',    label: 'Email',    type: 'text', required: true },
      { name: 'password', label: 'Password', type: 'text', required: true },
    ],
  },
  {
    title: 'Profile',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text', required: false },
    ],
  },
];

// Validates all required fields for a single step.
// Returns an errors object: { fieldName: 'Required' } for any missing required field.
// Empty object means the step is valid.
function validateStep(step, data) {
  const errors = {};
  for (const field of step.fields) {
    if (!field.required) continue;
    if (!data[field.name]?.trim()) errors[field.name] = 'Required';
  }
  return errors;
}

export function MultiStepForm() {
  // stepIndex — which step (0-based) is currently visible
  const [stepIndex, setStepIndex] = useState(0);

  // data — a flat object accumulating all field values across all steps.
  // The spread operator on each onChange merges new values without losing
  // data from steps already completed.
  const [data, setData] = useState({});

  // errors — validation result for the current step; keyed by field name
  const [errors, setErrors] = useState({});

  // donePayload — set only after the final step passes validation;
  // signals that the form is complete and shows the collected data
  const [donePayload, setDonePayload] = useState(null);

  const step   = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  // progress — derived display string; memoized to avoid recreating on every render
  const progress = useMemo(
    () => `${stepIndex + 1} / ${STEPS.length}: ${step.title}`,
    [step.title, stepIndex]
  );

  // next — validates the current step, then either advances or submits
  const next = () => {
    const e = validateStep(step, data);
    setErrors(e);
    if (Object.keys(e).length) return; // stop if there are errors

    if (isLast) {
      // Final step: show collected data as formatted JSON
      setDonePayload(JSON.stringify(data, null, 2));
      return;
    }
    setStepIndex((i) => i + 1);
    setErrors({});
  };

  // back — move to the previous step (clamped at 0, can never go below first step)
  const back = () => {
    setStepIndex((i) => Math.max(0, i - 1));
    setErrors({});
  };

  return (
    <div style={{ maxWidth: 400 }}>
      {/* Completed state: show the collected form data as JSON */}
      {donePayload && (
        <pre style={{ background: '#f6f6f6', padding: 12, borderRadius: 6 }}>
          {donePayload}
        </pre>
      )}

      {/* Step progress indicator */}
      <div aria-current="step" style={{ marginBottom: 12, fontWeight: 600 }}>
        {progress}
      </div>

      {/* Render fields for the current step only */}
      {step.fields.map((field) => (
        <div key={field.name} style={{ marginBottom: 12 }}>
          <label htmlFor={field.name} style={{ display: 'block', marginBottom: 4 }}>
            {field.label}
          </label>
          <input
            id={field.name}
            type="text"
            value={data[field.name] ?? ''}
            // Spread operator: merges updated field into all existing data.
            // This is what keeps step 1 answers alive when we move to step 2.
            onChange={(e) =>
              setData((prev) => ({ ...prev, [field.name]: e.target.value }))
            }
          />
          {errors[field.name] && (
            <div style={{ color: 'crimson', fontSize: 12 }}>{errors[field.name]}</div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button type="button" onClick={back} disabled={stepIndex === 0}>
          Back
        </button>
        <button type="button" onClick={next}>
          {isLast ? 'Submit' : 'Next'}
        </button>
      </div>
    </div>
  );
}
