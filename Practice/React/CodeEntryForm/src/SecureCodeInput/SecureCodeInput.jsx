import React, { useState, useRef } from 'react';
import './SecureCodeInput.css';

/**
 * Secure code input: multiple single-digit boxes (e.g. OTP/PIN).
 * Accepts only digits and supports paste.
 */
const SecureCodeInput = ({
  length = 4,
  label = 'Enter code',
  autoComplete = 'one-time-code',
  error = '',
}) => {
  // Current code as a string (one char per box).
  const [value, setValue] = useState('');
  // Refs for each input so we can move focus between boxes.
  const refs = useRef([]);

  /**
   * Handle typing in box at index i.
   * @param {number} i - Index of the box (0 to length - 1).
   * @param {string} char - The character entered (last char of input, or '' when clearing).
   */
  const change = (i, char) => {
    // Allow only a single digit (0-9); ignore letters/symbols. Empty char is allowed (for clearing).
    if (char && !/^\d$/.test(char)) return;
    // Replace digit at position i, strip any non-digits, then cap at `length` chars.
    const next = (value.slice(0, i) + char + value.slice(i + 1)).replace(/\D/g, '').slice(0, length);
    setValue(next);
    // After typing a digit, focus the next box if there is one.
    if (char && i < length - 1) refs.current[i + 1]?.focus();
  };

  /**
   * Handle Backspace: when current box is empty, clear previous digit and focus previous box.
   */
  const onKeyDown = (e, i) => {
    // Backspace on an empty box: don't do nothing — clear the previous box and move focus there.
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      e.preventDefault(); // Stop default so we handle clearing the previous digit ourselves.
      // Remove the digit at position i - 1.
      setValue((v) => v.slice(0, i - 1) + v.slice(i));
      refs.current[i - 1]?.focus();
    }
  };

  /**
   * Handle paste: take only digits from clipboard, fill boxes, then focus last filled box.
   */
  const onPaste = (e) => {
    e.preventDefault();
    // Get pasted text, keep only digits, take at most `length` digits.
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!digits) return;
    setValue(digits);
    // Focus the last filled box (or last box if we pasted full length).
    refs.current[Math.min(digits.length, length) - 1]?.focus();
  };

  const inputs = [];
  for (let i = 0; i < length; i++) {
    inputs.push(
      <input
        key={i}
        ref={(el) => (refs.current[i] = el)}
        type="password"
        autoComplete={i === 0 ? autoComplete : 'off'}
        className="secure-code-input__input"
        value={value[i] ?? ''}
        maxLength={1}
        onChange={(e) => change(i, e.target.value)}
        onKeyDown={(e) => onKeyDown(e, i)}
      />
    );
  }

  return (
    <div className="secure-code-input">
      <label className="secure-code-input__label">{label}</label>
      {/* Paste is handled at container level so pasting in any box fills all. */}
      <div className="secure-code-input__inputs" onPaste={onPaste}>
        {inputs}
      </div>
      {error && (
        <span className="secure-code-input__error">{error}</span>
      )}
    </div>
  );
};

export default SecureCodeInput;
