import { useId, useState, useCallback } from 'react';

export function Tabs({ labels, children }) {
  // useId: unique prefix per instance — prevents ID collisions if Tabs renders twice
  const baseId = useId();
  const [i, setI] = useState(0);

  // Memoised so the tablist's onKeyDown reference stays stable across renders
  const onKeyDown = useCallback(
    (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const len = labels.length;
      if (len === 0) return;
      setI((cur) => {
        // Modular wrap: +len before % prevents negative results on ArrowLeft
        if (e.key === 'ArrowRight') return (cur + 1) % len;
        return (cur - 1 + len) % len;
      });
    },
    [labels.length]
  );

  return (
    <div>
      <div role="tablist" aria-label="Tabs" onKeyDown={onKeyDown}>
        {labels.map((label, idx) => (
          <button
            key={label}
            type="button"
            role="tab"
            id={`${baseId}-tab-${idx}`}
            aria-selected={i === idx}
            aria-controls={`${baseId}-panel-${idx}`}
            // Roving tabIndex: only the active tab is Tab-reachable; others use Arrow keys
            tabIndex={i === idx ? 0 : -1}
            onClick={() => setI(idx)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* hidden (not conditional render): panels keep their internal state when inactive */}
      {children.map((panel, idx) => (
        <div
          key={idx}
          role="tabpanel"
          id={`${baseId}-panel-${idx}`}
          aria-labelledby={`${baseId}-tab-${idx}`}
          hidden={i !== idx}
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
