import { useState } from 'react';

export function StarRating({ max = 5, value, onChange }) {
  // Local UI state only — the parent doesn't need to know which star is hovered
  const [hover, setHover] = useState(null);

  // ?? not || : value=0 is falsy, || would skip it; ?? only falls through for null/undefined
  const display = hover ?? value;

  return (
    <div role="group" aria-label="Rating">
      {Array.from({ length: max }, (_, idx) => {
        const n = idx + 1;           // 1-based: ratings are "1 star", not "0 stars"
        const active = n <= display;

        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            aria-pressed={n <= value}     // reflects COMMITTED value, not hover
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(n)}   // tell parent; parent re-renders with new value
            style={{ fontSize: '1.5rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            {active ? '★' : '☆'}
          </button>
        );
      })}
    </div>
  );
}
