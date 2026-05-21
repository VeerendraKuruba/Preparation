import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const GRID_SIZE = 3;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const AUTO_DESELECT_MS = 5000;

const SelectionGrid = () => {
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const timeouts = useRef({});

  // Clears the auto-deselect timeout for a given cell so it stays selected.
  // Called when the user manually deselects a cell (click again) before the timer fires.
  const clearTimer = (id) => {
    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id]);
      delete timeouts.current[id];
    }
  };

  // Handles click on a cell: toggle selection and manage the 5s auto-deselect timer (FIFO).
  const handleCellClick = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Cell was selected → deselect it and cancel its auto-deselect timer.
        next.delete(id);
        clearTimer(id);
      } else {
        // Cell was not selected → select it and schedule auto-deselect after 5 seconds.
        next.add(id);
        timeouts.current[id] = setTimeout(() => {
          setSelectedIds((p) => {
            const n = new Set(p);
            n.delete(id);
            return n;
          });
          delete timeouts.current[id];
        }, AUTO_DESELECT_MS);
      }
      return next;
    });
  };

  useEffect(() => {
    return () => Object.values(timeouts.current).forEach(clearTimeout);
  }, []);

  return (
    <div className="app">
      <h1>Selection Grid</h1>
      <p className="hint">Click cells to select. They auto-deselect after 5 seconds (FIFO).</p>
      <div
        className="grid"
        role="grid"
        aria-label="3 by 3 selection grid"
        style={{ '--size': GRID_SIZE }}
      >
        {Array.from({ length: TOTAL_CELLS }, (_, i) => (
          <button
            key={i}
            type="button"
            role="gridcell"
            aria-selected={selectedIds.has(i)}
            className={`cell ${selectedIds.has(i) ? 'cell--selected' : ''}`}
            onClick={() => handleCellClick(i)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SelectionGrid;
