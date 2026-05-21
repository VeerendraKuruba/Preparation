import React, { useState, useRef, useEffect } from 'react';
import './Autocomplete.css';

/**
 * Simple Autocomplete with debounce.
 * - Waits debounceMs after user stops typing before calling fetchResults.
 * - Shows dropdown, loading state, keyboard (arrows + Enter), click outside to close.
 */
function Autocomplete({ fetchResults, onSelect, placeholder = 'Search...', debounceMs = 300 }) {
  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  // Debounce: run search only after user stops typing for debounceMs
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchResults(value.trim());
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
        setHighlighted(-1);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, debounceMs, fetchResults]);

  const select = (item) => {
    setValue(item);
    setOpen(false);
    setResults([]);
    onSelect?.(item);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => (i < results.length - 1 ? i + 1 : i));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => (i > 0 ? i - 1 : -1));
    } else if (e.key === 'Enter' && highlighted >= 0 && results[highlighted]) {
      e.preventDefault();
      select(results[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlighted(-1);
    }
  };

  useEffect(() => {
    const fn = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div className="autocomplete" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="autocomplete-input"
      />
      {loading && <span className="autocomplete-loading">...</span>}
      {open && (
        <ul className="autocomplete-list">
          {results.length === 0 && !loading ? (
            <li className="autocomplete-empty">No results</li>
          ) : (
            results.map((item, i) => (
              <li
                key={item}
                className={i === highlighted ? 'autocomplete-item highlighted' : 'autocomplete-item'}
                onClick={() => select(item)}
                onMouseEnter={() => setHighlighted(i)}
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
