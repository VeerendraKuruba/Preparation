import React from 'react';
import SimpleForm from './SimpleForm';
import CodeEntryForm from './CodeEntryForm';
import SecureCodeInput from './SecureCodeInput';
import PassportForm from './PassportForm';
import PhoneForm from './PhoneForm';
import './App.css';

function App() {
  const handleSubmit = (values) => {
    console.log('Form submitted:', values);
  };

  const handlePinComplete = (pin) => {
    console.log('PIN entered:', pin);
  };

  const handleCodeComplete = ({ phone, code }) => {
    console.log('Code entry complete:', { phone, code });
  };

  const handlePassportSubmit = (values) => {
    console.log('Passport form submitted:', values);
  };

  const handlePhoneSubmit = (values) => {
    console.log('Phone form submitted:', values);
  };

  return (
    <div className="App">
      {/* <SimpleForm onSubmit={handleSubmit} />
      <CodeEntryForm onComplete={handleCodeComplete} /> */}
      {/* <PassportForm onSubmit={handlePassportSubmit} /> */}
      <PhoneForm onSubmit={handlePhoneSubmit} />
      {/* <SecureCodeInput /> */}

    </div>
  );
}

export default App;
