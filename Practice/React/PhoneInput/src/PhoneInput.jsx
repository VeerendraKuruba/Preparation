import React, { useState, useRef, useEffect } from 'react';
import './PhoneInput.css';

const MAX = 10;
const getDigits = (s) => (s || '').replace(/\D/g, '');
const format = (d) =>
  !d.length ? '' : d.length <= 3 ? `(${d}` : d.length <= 6 ? `(${d.slice(0, 3)}) ${d.slice(3)}` : `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, MAX)}`;
const digitsBefore = (str, pos) => getDigits(str.slice(0, pos)).length;

export default function PhoneInput() {
  const [digits, setDigits] = useState('');
  const [cursor, setCursor] = useState(null);
  const ref = useRef(null);
  const display = format(digits);

  useEffect(() => {
    if (cursor != null && ref.current) {
      ref.current.setSelectionRange(cursor, cursor);
      setCursor(null);
    }
  }, [digits, cursor]);

  const update = (d) => setDigits(d.slice(0, MAX));

  const onKeyDown = (e) => {
    if (e.key === 'Backspace' && digits.length > 0) {
      // Cursor position in the display (0 = at start). Only delete when something is to the left.
      const pos = e.target.selectionStart;
      if (pos > 0) {
        e.preventDefault();
        const prev = display[pos - 1];
        const i = (/\d/.test(prev) ? digitsBefore(display, pos) : digitsBefore(display, pos - 1)) - 1;
        if (i >= 0) {
          const next = digits.slice(0, i) + digits.slice(i + 1);
          setCursor(format(next.slice(0, i)).length);
          update(next);
        }
      }
      return;
    }
    if (e.key.length === 1 && !/\d/.test(e.key)) e.preventDefault();
  };

  return (
    <input
      ref={ref}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      value={display}
      onChange={(e) => update(getDigits(e.target.value))}
      onPaste={(e) => { e.preventDefault(); update(getDigits(e.clipboardData.getData('text/plain'))); }}
      onKeyDown={onKeyDown}
      placeholder="(555) 000-0000"
      className="phone-input"
    />
  );
}
