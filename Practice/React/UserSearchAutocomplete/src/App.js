import React from 'react';
import UserSearchAutocomplete from './UserSearchAutocomplete';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>User Search</h1>
        <p className="App-subtitle">Debounced autocomplete · DummyJSON API</p>
      </header>
      <UserSearchAutocomplete />
    </div>
  );
}

export default App;
