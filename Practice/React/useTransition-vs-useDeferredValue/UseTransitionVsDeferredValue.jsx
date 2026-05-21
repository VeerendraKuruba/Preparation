import React, { useState, useTransition, useDeferredValue } from 'react';

// ============================================================
// useTransition() - You control WHEN to mark updates as low-priority
// Use when: YOU trigger the state update (e.g. typing, clicking)
// ============================================================

function SearchWithTransition() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState([]);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value); // Update input immediately (high priority)

    startTransition(() => {
      // This update is deferred (low priority)
      setResults(filterItems(value));
    });
  };

  return (
    <div className="demo">
      <h3>useTransition()</h3>
      <p>You wrap the state update in startTransition(). Input stays responsive.</p>
      <input value={query} onChange={handleChange} placeholder="Search..." />
      {isPending && <span className="badge">Updating list...</span>}
      <ul>
        {results.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// useDeferredValue() - React defers a VALUE that comes from elsewhere
// Use when: The value is from props/context, you can't wrap the setter
// ============================================================

function SearchWithDeferredValue() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query); // Lags behind query

  const results = filterItems(deferredQuery); // Expensive list uses deferred value

  return (
    <div className="demo">
      <h3>useDeferredValue()</h3>
      <p>You pass the value; React gives you a version that lags. Same effect, different API.</p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />
      <ul>
        {results.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// When to use which?
// ============================================================
// useTransition:  You call startTransition( () => setState(...) )
// useDeferredValue: You have a value and want deferredQuery = useDeferredValue(value)
// Both keep the UI responsive by deferring heavy work.

function filterItems(query) {
  const all = Array.from({ length: 5000 }, (_, i) => `Item ${i + 1}`);
  if (!query.trim()) return all.slice(0, 20);
  return all.filter((item) => item.toLowerCase().includes(query.toLowerCase())).slice(0, 50);
}

export default function UseTransitionVsDeferredValue() {
  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>useTransition() vs useDeferredValue()</h1>
      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
        <SearchWithTransition />
        <SearchWithDeferredValue />
      </div>
      <div style={{ marginTop: 24, padding: 16, background: '#f0f0f0', borderRadius: 8 }}>
        <strong>Summary:</strong>
        <ul>
          <li><code>useTransition</code>: You control the update — wrap it in <code>startTransition()</code>. You get <code>isPending</code> for loading UI.</li>
          <li><code>useDeferredValue</code>: You have a value (e.g. from state) — pass it in, get a deferred copy. Use that for expensive children.</li>
        </ul>
      </div>
    </div>
  );
}
