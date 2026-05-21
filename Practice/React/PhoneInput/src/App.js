import React from 'react';
import PhoneInput from './PhoneInput';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>PhoneInput</h1>
      </header>
      <main className="App-main">
        <PhoneInput />
        <ul className="App-rules">
          <li>Disallow invalid characters</li>
          <li>Formatting characters only inserted preceding digits</li>
          <li>Deleting a digit also removes any immediately preceding formatting characters</li>
          <li>Pasting a full/partial number works</li>
        </ul>
      </main>
    </div>
  );
}

export default App;
