/**
 * Simple phone validation for interview.
 * - Country code: required, must be from list.
 * - Phone number: required, 10 digits only.
 */

export const COUNTRY_OPTIONS = [
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'JP', name: 'Japan', dial: '+81' },
];

const VALID_DIALS = new Set(COUNTRY_OPTIONS.map((o) => o.dial));
const PHONE_LEN = 10;

export function validateCountryCode(value) {
  if (!value || !VALID_DIALS.has(value.trim())) return 'Select a valid country code';
  return '';
}

export function validatePhoneNumber(value) {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return 'Phone number is required';
  if (digits.length !== PHONE_LEN) return `Must be ${PHONE_LEN} digits`;
  return '';
}

export function validatePhoneForm(values) {
  const errors = {};
  const e1 = validateCountryCode(values.countryCode);
  if (e1) errors.countryCode = e1;
  const e2 = validatePhoneNumber(values.phoneNumber);
  if (e2) errors.phoneNumber = e2;
  return errors;
}
