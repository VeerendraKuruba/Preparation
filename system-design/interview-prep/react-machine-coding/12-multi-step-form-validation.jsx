import { useMemo, useState } from 'react';

const steps = [
  {
    id: 'account',
    title: 'Account',
    fields: [
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'password', label: 'Password', type: 'text' },
    ],
  },
  {
    id: 'profile',
    title: 'Profile',
    fields: [
      { name: 'fullName', label: 'Full name', type: 'text' },
      { name: 'company', label: 'Company', type: 'text' },
    ],
  },
];

function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validateStep(step, values) {
  const e = {};
  for (const f of step.fields) {
    const v = values[f.name]?.trim() ?? '';
    if (!v) {
      e[f.name] = 'Required';
      continue;
    }
    if (f.type === 'email' && !validateEmail(v)) e[f.name] = 'Invalid email';
  }
  return e;
}

export function MultiStepFormValidated({ onComplete }) {
  const [idx, setIdx] = useState(0);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const step = steps[idx];
  const isLast = idx === steps.length - 1;

  const progress = useMemo(() => ({ current: idx + 1, total: steps.length }), [idx]);

  const goNext = () => {
    const v = validateStep(step, values);
    setErrors(v);
    setTouched((t) => {
      const n = { ...t };
      for (const f of step.fields) n[f.name] = true;
      return n;
    });
    if (Object.keys(v).length) return;
    if (isLast) onComplete?.(values);
    else setIdx((i) => i + 1);
  };

  const goBack = () => setIdx((i) => Math.max(0, i - 1));

  const onSubmit = (e) => {
    e.preventDefault();
    goNext();
  };

  return (
    <form onSubmit={onSubmit} style={{ maxWidth: 420 }} noValidate>
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
            value={values[f.name] ?? ''}
            onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))}
            onBlur={() => setTouched((t) => ({ ...t, [f.name]: true }))}
            aria-invalid={Boolean(errors[f.name])}
            aria-describedby={errors[f.name] ? `${f.name}-err` : undefined}
          />
          {touched[f.name] && errors[f.name] && (
            <div id={`${f.name}-err`} style={{ color: 'crimson', fontSize: 12 }}>
              {errors[f.name]}
            </div>
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={goBack} disabled={idx === 0}>
          Back
        </button>
        <button type="submit">{isLast ? 'Finish' : 'Next'}</button>
      </div>
    </form>
  );
}
