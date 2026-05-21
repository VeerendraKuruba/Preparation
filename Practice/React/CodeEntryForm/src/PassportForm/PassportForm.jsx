import React, { useState } from 'react';
import { validatePassportNumber, validatePassportExpiry, validatePassport } from './passportValidation';
import './PassportForm.css';

const PassportForm = () => {
  const [values, setValues] = useState({ passportNumber: '', expiryDate: '' });
  const [errors, setErrors] = useState({});

  const getFieldError = (name) => {
    if (name === 'passportNumber') return validatePassportNumber(values.passportNumber);
    if (name === 'expiryDate') return validatePassportExpiry(values.expiryDate);
    return '';
  };

  const handleChange = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleBlur = (name) => {
    setErrors((prev) => ({ ...prev, [name]: getFieldError(name) || undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validatePassport(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
  };

  return (
    <form className="passport-form" onSubmit={handleSubmit} noValidate>
      <div className="passport-form__field">
        <label className="passport-form__label" htmlFor="passport-number">
          Passport number <span className="passport-form__required">*</span>
        </label>
        <input
          id="passport-number"
          name="passportNumber"
          type="text"
          placeholder="e.g. AB123456"
          maxLength={9}
          className={`passport-form__input ${errors.passportNumber ? 'passport-form__input--error' : ''}`}
          value={values.passportNumber}
          onChange={(e) => handleChange('passportNumber', e.target.value.toUpperCase())}
          onBlur={() => handleBlur('passportNumber')}
        />
        {errors.passportNumber && (
          <span className="passport-form__error">
            {errors.passportNumber}
          </span>
        )}
      </div>

      <div className="passport-form__field">
        <label className="passport-form__label" htmlFor="passport-expiry">
          Expiry date <span className="passport-form__required">*</span>
        </label>
        <input
          id="passport-expiry"
          name="expiryDate"
          type="date"
          className={`passport-form__input passport-form__input--date ${errors.expiryDate ? 'passport-form__input--error' : ''}`}
          value={values.expiryDate}
          onChange={(e) => handleChange('expiryDate', e.target.value)}
          onBlur={() => handleBlur('expiryDate')}
        />
        {errors.expiryDate && (
          <span className="passport-form__error">
            {errors.expiryDate}
          </span>
        )}
      </div>

      <button type="submit" className="passport-form__submit">
        Submit
      </button>
    </form>
  );
};

export default PassportForm;
