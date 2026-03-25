import { useMemo, useState } from 'react';

const STEPS = [
  {
    title: 'Account',
    fields: [
      { name: 'email', label: 'Email', type: 'text', required: true },
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

function validateStep(step, data) {
  const err = {};
  for (const f of step.fields) {
    if (!f.required) continue;
    if (!data[f.name]?.trim()) err[f.name] = 'Required';
  }
  return err;
}

export function MultiStepForm() {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});
  const [donePayload, setDonePayload] = useState(null);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const progress = useMemo(
    () => `${stepIndex + 1} / ${STEPS.length}: ${step.title}`,
    [step.title, stepIndex]
  );

  const next = () => {
    const e = validateStep(step, data);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (isLast) {
      setDonePayload(JSON.stringify(data, null, 2));
      return;
    }
    setStepIndex((i) => i + 1);
    setErrors({});
  };

  const back = () => {
    setStepIndex((i) => Math.max(0, i - 1));
    setErrors({});
  };

  return (
    <div style={{ maxWidth: 400 }}>
      {donePayload && (
        <pre style={{ background: '#f6f6f6', padding: 12, borderRadius: 6 }}>{donePayload}</pre>
      )}
      <div aria-current="step" style={{ marginBottom: 12, fontWeight: 600 }}>
        {progress}
      </div>
      {step.fields.map((f) => (
        <div key={f.name} style={{ marginBottom: 12 }}>
          <label htmlFor={f.name} style={{ display: 'block', marginBottom: 4 }}>
            {f.label}
          </label>
          <input
            id={f.name}
            type="text"
            value={data[f.name] ?? ''}
            onChange={(e) => setData((d) => ({ ...d, [f.name]: e.target.value }))}
          />
          {errors[f.name] && (
            <div style={{ color: 'crimson', fontSize: 12 }}>{errors[f.name]}</div>
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
