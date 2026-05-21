import React, { useState, useRef, useEffect } from 'react';
import './Autocomplete.css';

function Autocomplete({ fetchResults, onSelect, placeholder = 'Search...', debounceMs = 300 }) {
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const latestQueryRef = useRef('');

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const query = value.trim();
    latestQueryRef.current = query;
    timerRef.current = setTimeout(() => {
      fetchResults(query)
        .then((data) => {
          if (latestQueryRef.current !== query) return;
          setResults(Array.isArray(data) ? data : []);
          setOpen(true);
        })
        .catch(() => {
          if (latestQueryRef.current !== query) return;
          setResults([]);
        });
    }, debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [value, debounceMs, fetchResults]);

  const select = (item) => {
    setValue(item);
    setOpen(false);
    setResults([]);
    onSelect?.(item);
  };

  return (
    <div className="autocomplete">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="autocomplete-input"
      />
      {open && (
        <ul className="autocomplete-list">
          {results.length === 0 ? (
            <li className="autocomplete-empty">No results</li>
          ) : (
            results.map((item) => (
              <li
                key={item}
                className="autocomplete-item"
                onClick={() => select(item)}
              >
                {item}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default Autocomplete;
