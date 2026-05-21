import React, { useState } from 'react';
import { COUNTRY_OPTIONS, validatePhoneForm } from './phoneValidation';
import './PhoneForm.css';

const PhoneForm = ({ onSubmit }) => {
  const [values, setValues] = useState({ countryCode: '+1', phoneNumber: '' });
  const [errors, setErrors] = useState({});

  const handleChange = (name, value) => {
    const next = name === 'phoneNumber' ? value.replace(/\D/g, '') : value;
    setValues((prev) => ({ ...prev, [name]: next }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validatePhoneForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit?.({ countryCode: values.countryCode, phoneNumber: values.phoneNumber });
  };

  return (
    <form className="phone-form" onSubmit={handleSubmit} noValidate>
      <div className="phone-form__field">
        <label className="phone-form__label" htmlFor="country">Country *</label>
        <select
          id="country"
          value={values.countryCode}
          onChange={(e) => handleChange('countryCode', e.target.value)}
          className={`phone-form__select ${errors.countryCode ? 'phone-form__select--error' : ''}`}
        >
          {COUNTRY_OPTIONS.map((o) => (
            <option key={o.code} value={o.dial}>{o.dial} {o.name}</option>
          ))}
        </select>
        {errors.countryCode && <span className="phone-form__error">{errors.countryCode}</span>}
      </div>

      <div className="phone-form__field">
        <label className="phone-form__label" htmlFor="phone">Phone number *</label>
        <input
          id="phone"
          type="tel"
          inputMode="numeric"
          placeholder="10 digits"
          value={values.phoneNumber}
          onChange={(e) => handleChange('phoneNumber', e.target.value)}
          className={`phone-form__input ${errors.phoneNumber ? 'phone-form__input--error' : ''}`}
        />
        {errors.phoneNumber && <span className="phone-form__error">{errors.phoneNumber}</span>}
      </div>

      <button type="submit" className="phone-form__submit">Submit</button>
    </form>
  );
};

export default PhoneForm;
