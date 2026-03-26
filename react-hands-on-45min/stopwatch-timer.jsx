import { useEffect, useMemo, useRef, useState } from 'react';

function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ss = s % 60;
  const frac = Math.floor((ms % 1000) / 100);
  if (h > 0)
    return `${h}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${frac}`;
  return `${mm}:${String(ss).padStart(2, '0')}.${frac}`;
}

export function Stopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef(null);
  const baseRef = useRef(0);
  const [laps, setLaps] = useState([]);

  useEffect(() => {
    if (!running) return;
    let id = 0;
    const tick = (t) => {
      if (startRef.current != null) {
        setElapsedMs(baseRef.current + (t - startRef.current));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [running]);

  const start = () => {
    if (running) return;
    startRef.current = performance.now();
    setRunning(true);
  };

  const stop = () => {
    if (!running || startRef.current == null) return;
    baseRef.current += performance.now() - startRef.current;
    startRef.current = null;
    setElapsedMs(baseRef.current);
    setRunning(false);
  };

  const reset = () => {
    baseRef.current = 0;
    startRef.current = null;
    setElapsedMs(0);
    setLaps([]);
    setRunning(false);
  };

  const lap = () => setLaps((p) => [...p, elapsedMs]);

  const display = useMemo(() => formatMs(elapsedMs), [elapsedMs]);

  return (
    <div>
      <div style={{ fontSize: '1.75rem', fontVariantNumeric: 'tabular-nums' }}>{display}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        {!running ? (
          <button type="button" onClick={start}>
            Start
          </button>
        ) : (
          <button type="button" onClick={stop}>
            Stop
          </button>
        )}
        <button type="button" onClick={lap} disabled={!running}>
          Lap
        </button>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
      <ol>
        {laps.map((t, i) => (
          <li key={i}>{formatMs(t)}</li>
        ))}
      </ol>
    </div>
  );
}

export function CountdownTimer({ initialSeconds }) {
  const [targetMs, setTargetMs] = useState(null);
  const [remainingMs, setRemainingMs] = useState(initialSeconds * 1000);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || targetMs == null) return;
    let id = 0;
    const tick = () => {
      const next = Math.max(0, targetMs - performance.now());
      setRemainingMs(next);
      if (next <= 0) {
        setRunning(false);
        setTargetMs(null);
        return;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [running, targetMs]);

  const start = () => {
    if (running) return;
    setTargetMs(performance.now() + remainingMs);
    setRunning(true);
  };

  const pause = () => {
    if (!running || targetMs == null) return;
    setRemainingMs(Math.max(0, targetMs - performance.now()));
    setTargetMs(null);
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setTargetMs(null);
    setRemainingMs(initialSeconds * 1000);
  };

  const display = useMemo(() => formatMs(remainingMs), [remainingMs]);

  return (
    <div>
      <div style={{ fontSize: '1.75rem', fontVariantNumeric: 'tabular-nums' }}>{display}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        {!running ? (
          <button type="button" onClick={start}>
            Start
          </button>
        ) : (
          <button type="button" onClick={pause}>
            Pause
          </button>
        )}
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
