import React from 'react';
import VirtualizedProductCatalog from './VirtualizedProductCatalog';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Virtualized product catalog</h1>
        <p className="App-subtitle">
          <code>react-window</code> renders only rows in (or near) the viewport
        </p>
      </header>
      <VirtualizedProductCatalog />
    </div>
  );
}

export default App;
