import React from 'react';
import ReactDOM from 'react-dom/client';
import Solution from './Solution';

const search = (value: string) => {
  return Promise.resolve(console.log('Search query:', value));
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{ padding: 16, fontFamily: 'sans-serif' }}>
      <h2 style={{ marginTop: 0 }}>Search Component</h2>
      <Solution search={search} />
    </div>
  </React.StrictMode>
);
