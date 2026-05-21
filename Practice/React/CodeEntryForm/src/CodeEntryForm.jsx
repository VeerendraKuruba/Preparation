import React, { useState, useRef, useCallback } from 'react';
import './CodeEntryForm.css';

const DIGITS = 4;

const digitsOnly = (s) => s.replace(/\D/g, '');

const CodeEntryForm = ({ onComplete }) => {
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [values, setValues] = useState(Array(DIGITS).fill(''));
  const inputRefs = useRef([]);

  const validatePhone = useCallback((value) => {
    const digits = digitsOnly(value);
    if (digits.length === 0) return 'Phone number is required';
    if (digits.length < 10) return 'Enter at least 10 digits';
    if (digits.length > 15) return 'Phone number is too long';
    return '';
  }, []);

  const handlePhoneChange = useCallback(
    (e) => {
      const raw = e.target.value;
      setPhone(raw);
      if (phoneError) setPhoneError(validatePhone(raw));
    },
    [phoneError, validatePhone]
  );

  const handlePhoneBlur = useCallback(() => {
    setPhoneError(validatePhone(phone));
  }, [phone, validatePhone]);

  const focusInput = useCallback((index) => {
    const i = Math.max(0, Math.min(index, DIGITS - 1));
    inputRefs.current[i]?.focus();
  }, []);

  const setValueAt = useCallback(
    (index, value) => {
      if (value !== '' && !/^\d$/.test(value)) return;
      const next = [...values];
      next[index] = value;
      setValues(next);
      if (value !== '') {
        if (index < DIGITS - 1) focusInput(index + 1);
        else if (next.every((v) => v !== '')) {
          const err = validatePhone(phone);
          if (err) {
            setPhoneError(err);
            return;
          }
          onComplete?.({ phone: digitsOnly(phone), code: next.join('') });
        }
      }
    },
    [values, focusInput, onComplete, phone, validatePhone]
  );

  const handleKeyDown = useCallback(
    (e, index) => {
      if (e.key === 'Backspace' && values[index] === '') {
        e.preventDefault();
        focusInput(index - 1);
        setValueAt(index - 1, '');
      }
    },
    [values, focusInput, setValueAt]
  );

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData('text')
        .replace(/\D/g, '')
        .slice(0, DIGITS)
        .split('');
      if (pasted.length === 0) return;
      const next = [...values];
      pasted.forEach((char, i) => {
        if (i < DIGITS) next[i] = char;
      });
      setValues(next);
      const nextEmpty = next.findIndex((v) => v === '');
      focusInput(nextEmpty === -1 ? DIGITS - 1 : nextEmpty);
      if (next.every((v) => v !== '')) {
        const err = validatePhone(phone);
        if (!err) onComplete?.({ phone: digitsOnly(phone), code: next.join('') });
      }
    },
    [values, phone, focusInput, onComplete, validatePhone]
  );

  return (
    <div className="code-entry-form">
      <div className="code-entry-form__field">
        <label className="code-entry-form__label" htmlFor="code-entry-phone">
          Phone number
        </label>
        <input
          id="code-entry-phone"
          type="tel"
          inputMode="tel"
          placeholder="e.g. (555) 123-4567"
          className={`code-entry-form__phone ${phoneError ? 'code-entry-form__phone--error' : ''}`}
          value={phone}
          onChange={handlePhoneChange}
          onBlur={handlePhoneBlur}
          autoComplete="tel"
        />
        {phoneError && (
          <span className="code-entry-form__error" role="alert">
            {phoneError}
          </span>
        )}
      </div>
      <div className="code-entry-form__field">
        <label className="code-entry-form__label">Enter 4-digit code</label>
      <div className="code-entry-form__inputs" onPaste={handlePaste}>
        {values.map((value, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            className="code-entry-form__input"
            value={value}
            onChange={(e) => setValueAt(index, e.target.value.slice(-1))}
            onKeyDown={(e) => handleKeyDown(e, index)}
          />
        ))}
      </div>
      </div>
    </div>
  );
};

export default CodeEntryForm;
