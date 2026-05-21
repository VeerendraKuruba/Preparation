import { useState, useEffect } from 'react';

/**
 * Debounces a value by the given delay.
 * @param {*} value - The value to debounce
 * @param {number} delayMs - Delay in milliseconds (e.g. 500)
 * @returns {*} - The debounced value (updates after delayMs of no changes)
 */
export function useDebounce(value, delayMs) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
