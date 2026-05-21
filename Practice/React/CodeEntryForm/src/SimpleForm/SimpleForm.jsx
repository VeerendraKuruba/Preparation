import React, { useState, useCallback } from 'react';
import './SimpleForm.css';

// Mock form configuration (drives the native selector and input)
const MOCK_FORM_CONFIG = {
  select: {
    name: 'category',
    label: 'Category',
    options: [
      { value: '', label: 'Select a category...' },
      { value: 'work', label: 'Work' },
      { value: 'personal', label: 'Personal' },
      { value: 'shopping', label: 'Shopping' },
    ],
    required: true,
  },
  input: {
    name: 'title',
    label: 'Title',
    type: 'text',
    placeholder: 'Enter a title',
    required: true,
    minLength: 3,
    maxLength: 50,
  },
};

const SimpleForm = ({ onSubmit }) => {
  const [values, setValues] = useState({
    [MOCK_FORM_CONFIG.select.name]: '',
    [MOCK_FORM_CONFIG.input.name]: '',
  });
  const [errors, setErrors] = useState({});

  const validate = useCallback(() => {
    const nextErrors = {};
    const { select, input } = MOCK_FORM_CONFIG;

    // Select validation
    if (select.required && !values[select.name]?.trim()) {
      nextErrors[select.name] = `${select.label} is required`;
    }

    // Input validation
    const inputVal = values[input.name]?.trim() ?? '';
    if (input.required && !inputVal) {
      nextErrors[input.name] = `${input.label} is required`;
    } else if (inputVal && input.minLength && inputVal.length < input.minLength) {
      nextErrors[input.name] = `${input.label} must be at least ${input.minLength} characters`;
    } else if (inputVal && input.maxLength && inputVal.length > input.maxLength) {
      nextErrors[input.name] = `${input.label} must be at most ${input.maxLength} characters`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [values]);

  const handleChange = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!validate()) return;
      onSubmit?.(values);
    },
    [values, validate, onSubmit]
  );

  const { select, input } = MOCK_FORM_CONFIG;

  return (
    <form className="simple-form" onSubmit={handleSubmit} noValidate>
      <div className="simple-form__field">
        <label className="simple-form__label" htmlFor={select.name}>
          {select.label}
          {select.required && <span className="simple-form__required"> *</span>}
        </label>
        <select
          id={select.name}
          name={select.name}
          className={`simple-form__select ${errors[select.name] ? 'simple-form__select--error' : ''}`}
          value={values[select.name]}
          onChange={(e) => handleChange(select.name, e.target.value)}
          onBlur={() => validate()}
          aria-invalid={!!errors[select.name]}
          aria-describedby={errors[select.name] ? `${select.name}-error` : undefined}
        >
          {select.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors[select.name] && (
          <span id={`${select.name}-error`} className="simple-form__error" role="alert">
            {errors[select.name]}
          </span>
        )}
      </div>

      <div className="simple-form__field">
        <label className="simple-form__label" htmlFor={input.name}>
          {input.label}
          {input.required && <span className="simple-form__required"> *</span>}
        </label>
        <input
          id={input.name}
          name={input.name}
          type={input.type}
          placeholder={input.placeholder}
          className={`simple-form__input ${errors[input.name] ? 'simple-form__input--error' : ''}`}
          value={values[input.name]}
          onChange={(e) => handleChange(input.name, e.target.value)}
          onBlur={() => validate()}
          minLength={input.minLength}
          maxLength={input.maxLength}
          aria-invalid={!!errors[input.name]}
          aria-describedby={errors[input.name] ? `${input.name}-error` : undefined}
        />
        {errors[input.name] && (
          <span id={`${input.name}-error`} className="simple-form__error" role="alert">
            {errors[input.name]}
          </span>
        )}
      </div>

      <button type="submit" className="simple-form__submit">
        Submit
      </button>
    </form>
  );
};

export default SimpleForm;
