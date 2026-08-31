import { useEffect, useRef, useState } from 'react';

export function ProgressBar({ value, min = 0, max = 100, label = 'Progress' }) {
  const span = max - min;
  const pct = span === 0 ? 0 : Math.round(((value - min) / span) * 100);
  const clamped = Math.min(max, Math.max(min, value));

  return (
    <div
      role="progressbar"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={clamped}
      aria-label={label}
      style={{
        width: '100%',
        maxWidth: 360,
        borderRadius: 6,
        border: '1px solid #ccc',
        padding: 2,
        background: '#f4f4f4',
      }}
    >
      <div
        style={{
          height: 14,
          borderRadius: 4,
          width: `${pct}%`,
          background: '#2a6df4',
          transition: 'width 0.25s ease',
        }}
      />
      <div style={{ fontSize: 12, marginTop: 4, textAlign: 'right' }}>{pct}%</div>
    </div>
  );
}

/**
 * Advances progress every `interval` ms and reaches 100% at `total_time`.
 *
 * @example total_time={5000} interval={500} → 10 steps, +10% each 500ms
 */
export function TimedProgressBar({ total_time, interval, label = 'Progress' }) {
  const [progress, setProgress] = useState(0);
  const stepRef = useRef(0);

  useEffect(() => {
    if (total_time <= 0 || interval <= 0) return;

    setProgress(0);
    stepRef.current = 0;

    const totalSteps = total_time / interval;

    const timerId = setInterval(() => {
      stepRef.current += 1;

      if (stepRef.current >= totalSteps) {
        setProgress(100);
        clearInterval(timerId);
        return;
      }

      setProgress((stepRef.current / totalSteps) * 100);
    }, interval);

    return () => clearInterval(timerId);
  }, [total_time, interval]);

  const pct = Math.round(progress);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      style={{
        width: '100%',
        maxWidth: 360,
        borderRadius: 6,
        border: '1px solid #ccc',
        padding: 2,
        background: '#f4f4f4',
      }}
    >
      <div
        style={{
          height: 14,
          borderRadius: 4,
          width: `${pct}%`,
          background: '#2a6df4',
          transition: 'width 0.25s ease',
        }}
      />
      <div style={{ fontSize: 12, marginTop: 4, textAlign: 'right' }}>{pct}%</div>
    </div>
  );
}
