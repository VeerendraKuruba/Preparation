import { useState, useEffect, useRef } from 'react';

const TOTAL = 5;

export default function Rating({
  value: valueProp,
  emptyIcon = 'empty.svg',
  halfFilledIcon = 'half.svg',
  filledIcon = 'filled.svg',
  steps = 1,
}) {
  const [committed, setCommitted] = useState(valueProp ?? 0);
  const [hovered, setHovered] = useState(null); // null | number
  const containerRef = useRef(null);

  // Sync when parent changes value prop (optimistic toggle)
  useEffect(() => {
    if (valueProp !== undefined) setCommitted(valueProp);
  }, [valueProp]);

  const halfMode = steps === 0.5;
  const display = hovered !== null ? hovered : committed;

  function iconFor(starIndex) {
    const starNumber = starIndex + 1; // 1-based
    if (display >= starNumber) return filledIcon;
    if (halfMode && display >= starNumber - 0.5) return halfFilledIcon;
    return emptyIcon;
  }

  function valueFromEvent(e, starNumber) {
    if (!halfMode) return starNumber;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return x / rect.width <= 0.5 ? starNumber - 0.5 : starNumber;
  }

  function handleClick(e, starNumber) {
    const newVal = valueFromEvent(e, starNumber);
    setCommitted(prev => (prev === newVal ? 0 : newVal));
  }

  function handleMouseMove(e, starNumber) {
    setHovered(valueFromEvent(e, starNumber));
  }

  function handleMouseLeave() {
    setHovered(null);
  }

  function handleKeyDown(e) {
    const key = e.key;
    if (key === 'ArrowRight') {
      setCommitted(prev => Math.min(TOTAL, +(prev + steps).toFixed(1)));
    } else if (key === 'ArrowLeft') {
      setCommitted(prev => Math.max(0, +(prev - steps).toFixed(1)));
    } else if (key >= '1' && key <= '5') {
      setCommitted(Number(key));
    }
  }

  return (
    <div
      data-testid="star-rating-container"
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'inline-flex', outline: 'none' }}
    >
      {Array.from({ length: TOTAL }, (_, i) => (
        <img
          key={i}
          data-testid="rating-icon"
          src={iconFor(i)}
          alt={`${i + 1} star`}
          onClick={e => handleClick(e, i + 1)}
          onMouseMove={e => handleMouseMove(e, i + 1)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        />
      ))}
    </div>
  );
}
