import { useState, useEffect } from 'react';

const EMPTY =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='40' height='40'%3E%3Cpath fill='none' stroke='%23f5a623' stroke-width='2' d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'/%3E%3C/svg%3E";

const HALF =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='40' height='40'%3E%3Cdefs%3E%3ClinearGradient id='h'%3E%3Cstop offset='50%25' stop-color='%23f5a623'/%3E%3Cstop offset='50%25' stop-color='transparent'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23h)' stroke='%23f5a623' stroke-width='2' d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'/%3E%3C/svg%3E";

const FILLED =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='40' height='40'%3E%3Cpath fill='%23f5a623' stroke='%23f5a623' stroke-width='2' d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'/%3E%3C/svg%3E";

export default function Rating({ value: valueProp, onChange }) {
  const [committed, setCommitted] = useState(valueProp ?? 0);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    if (valueProp !== undefined) setCommitted(valueProp);
  }, [valueProp]);

  const display = hovered ?? committed;

  function iconFor(i) {
    const n = i + 1;
    if (display >= n) return FILLED;
    if (display >= n - 0.5) return HALF;
    return EMPTY;
  }

  function valueAt(e, n) {
    const { left, width } = e.currentTarget.getBoundingClientRect();
    return (e.clientX - left) / width <= 0.5 ? n - 0.5 : n;
  }

  function handleClick(e, n) {
    const next = committed === valueAt(e, n) ? 0 : valueAt(e, n);
    setCommitted(next);
    onChange?.(next);
  }

  return (
    <div
      data-testid="star-rating-container"
      onMouseLeave={() => setHovered(null)}
      style={{ display: 'inline-flex' }}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <img
          key={i}
          data-testid="rating-icon"
          src={iconFor(i)}
          alt={`${i + 1} star`}
          onClick={e => handleClick(e, i + 1)}
          onMouseMove={e => setHovered(valueAt(e, i + 1))}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        />
      ))}
    </div>
  );
}
