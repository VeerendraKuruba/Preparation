import React from 'react';
import InfiniteScrollMessageList from './InfiniteScrollMessageList';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Infinite Scroll Messages</h1>
        <p className="App-subtitle">
          IntersectionObserver sentinel · cursor pagination · mock API
        </p>
      </header>
      <InfiniteScrollMessageList />
    </div>
  );
}

export default App;
