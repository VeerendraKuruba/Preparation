import React, { useState } from 'react';
import Autocomplete from './Autocomplete';
import './App.css';

const OPTIONS = [
  'Apple', 'Banana', 'Cherry', 'Date', 'Elderberry',
  'Fig', 'Grape', 'Honeydew', 'Kiwi', 'Lemon', 'Mango',
  'Orange', 'Papaya', 'Quince', 'Raspberry', 'Strawberry',
];

function App() {
  const [selected, setSelected] = useState('');

  const search = (query) => {
    const filtered = OPTIONS.filter((item) =>
      item.toLowerCase().includes(query.toLowerCase())
    );
    return Promise.resolve(filtered);
  };

  return (
    <div className="app">
      <h1>Autocomplete (with debounce)</h1>
      <Autocomplete
        fetchResults={search}
        onSelect={setSelected}
        placeholder="Type to search..."
        debounceMs={300}
      />
      {selected && <p className="selected">Selected: {selected}</p>}
    </div>
  );
}

export default App;
