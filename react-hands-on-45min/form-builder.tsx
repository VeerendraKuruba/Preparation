import { useMemo, useState, type FormEvent } from 'react';

export type FieldType = 'text' | 'number' | 'select' | 'checkbox';

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
};

function FieldInput({
  def,
  value,
  error,
  onChange,
}: {
  def: FieldDef;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
}) {
  const id = `field-${def.name}`;
  if (def.type === 'checkbox') {
    const checked = Boolean(value);
    return (
      <div style={{ marginBottom: 12 }}>
        <label htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />{' '}
          {def.label}
        </label>
        {error && <div style={{ color: 'crimson', fontSize: 12 }}>{error}</div>}
      </div>
    );
  }

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
          {(def.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {error && <div style={{ color: 'crimson', fontSize: 12 }}>{error}</div>}
      </div>
    );
  }

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
          onChange(def.type === 'number' ? Number(e.target.value) : e.target.value)
        }
      />
      {error && <div style={{ color: 'crimson', fontSize: 12 }}>{error}</div>}
    </div>
  );
}

type FormBuilderProps = {
  fields: FieldDef[];
  onSubmit: (values: Record<string, unknown>) => void;
};

export function FormBuilder({ fields, onSubmit }: FormBuilderProps) {
  const initial = useMemo(() => {
    const o: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === 'checkbox') o[f.name] = false;
      else if (f.type === 'number') o[f.name] = 0;
      else o[f.name] = f.options?.[0] ?? '';
    }
    return o;
  }, [fields]);

  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (name: string, v: unknown) =>
    setValues((prev) => ({ ...prev, [name]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const nextErr: Record<string, string> = {};
    for (const f of fields) {
      if (!f.required) continue;
      const val = values[f.name];
      if (val === '' || val === null || val === undefined || val === false)
        nextErr[f.name] = 'Required';
    }
    setErrors(nextErr);
    if (Object.keys(nextErr).length) return;
    onSubmit(values);
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 400 }}>
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
