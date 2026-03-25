import { useState } from 'react';

export function StarRating({ max = 5, value, onChange }) {
  const [hover, setHover] = useState(null);
  const display = hover ?? value;

  return (
    <div role="group" aria-label="Rating">
      {Array.from({ length: max }, (_, idx) => {
        const n = idx + 1;
        const active = n <= display;
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            aria-pressed={n <= value}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            onClick={() => onChange(n)}
            style={{
              fontSize: '1.5rem',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {active ? '★' : '☆'}
          </button>
        );
      })}
    </div>
  );
}
