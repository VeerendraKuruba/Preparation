/**
 * Passport validation (interview-friendly: passport number + expiry only).
 * - Passport number: 6–9 alphanumeric, required.
 * - Expiry: required, valid date, in the future.
 */

const NUM_MIN = 6;
const NUM_MAX = 9;
const NUM_REGEX = /^[A-Za-z0-9]+$/;

export function validatePassportNumber(value) {
  const s = (value || '').trim();
  if (!s) return 'Passport number is required';
  if (!NUM_REGEX.test(s)) return 'Passport number must contain only letters and numbers';
  if (s.length < NUM_MIN) return `Passport number must be at least ${NUM_MIN} characters`;
  if (s.length > NUM_MAX) return `Passport number must be at most ${NUM_MAX} characters`;
  return '';
}

function parseDate(value) {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

export function validatePassportExpiry(value) {
  const s = (value || '').trim();
  if (!s) return 'Expiry date is required';
  const date = parseDate(s);
  if (!date) return 'Enter a valid date';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(date);
  expiry.setHours(0, 0, 0, 0);
  if (expiry < today) return 'Passport has expired';
  return '';
}

export function validatePassport(values) {
  const errors = {};
  const n = validatePassportNumber(values.passportNumber);
  if (n) errors.passportNumber = n;
  const e = validatePassportExpiry(values.expiryDate);
  if (e) errors.expiryDate = e;
  return errors;
}
