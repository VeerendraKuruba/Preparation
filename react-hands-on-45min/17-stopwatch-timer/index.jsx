import { useEffect, useMemo, useRef, useState } from 'react';

// Converts raw milliseconds to "M:SS.f" or "H:MM:SS.f"
function formatMs(ms) {
  const s    = Math.floor(ms / 1000);
  const m    = Math.floor(s / 60);
  const h    = Math.floor(m / 60);
  const mm   = m % 60;
  const ss   = s % 60;
  const frac = Math.floor((ms % 1000) / 100); // tenths of a second

  if (h > 0)
    return `${h}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${frac}`;

  return `${mm}:${String(ss).padStart(2, '0')}.${frac}`;
}

// ---------------------------------------------------------------------------
// Stopwatch — counts up with Start / Stop / Lap / Reset
// ---------------------------------------------------------------------------
export function Stopwatch() {
  const [running, setRunning]     = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [laps, setLaps]           = useState([]);

  // startRef: performance.now() when the CURRENT session began.
  // baseRef:  total ms accumulated from all PREVIOUS sessions.
  // Both are useRef — writes don't trigger re-renders and don't
  // restart the rAF loop.
  const startRef = useRef(null);
  const baseRef  = useRef(0);

  // rAF loop — only active while running === true.
  // requestAnimationFrame syncs with the browser's paint cycle (~60 fps),
  // avoiding the drift that setInterval accumulates under CPU load.
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
    return () => cancelAnimationFrame(id); // cancel on stop or unmount
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
    baseRef.current  = 0;
    startRef.current = null;
    setElapsedMs(0);
    setLaps([]);
    setRunning(false);
  };

  const lap = () => setLaps((p) => [...p, elapsedMs]);

  // useMemo avoids calling formatMs on every unrelated re-render
  const display = useMemo(() => formatMs(elapsedMs), [elapsedMs]);

  return (
    <div>
      {/* tabular-nums keeps digit widths equal so the display doesn't jitter */}
      <div style={{ fontSize: '1.75rem', fontVariantNumeric: 'tabular-nums' }}>{display}</div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        {!running ? (
          <button type="button" onClick={start}>Start</button>
        ) : (
          <button type="button" onClick={stop}>Stop</button>
        )}
        <button type="button" onClick={lap} disabled={!running}>Lap</button>
        <button type="button" onClick={reset}>Reset</button>
      </div>

      <ol>
        {laps.map((t, idx) => (
          // Index as key is safe here — laps are only ever appended, never reordered
          <li key={idx}>{formatMs(t)}</li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CountdownTimer — counts down from initialSeconds
// ---------------------------------------------------------------------------
export function CountdownTimer({ initialSeconds }) {
  // targetMs: the absolute future performance.now() value when countdown ends.
  // Storing an absolute target (not a decrement) means the countdown stays
  // accurate even if the tab is hidden and rAF frames are skipped.
  const [targetMs, setTargetMs]       = useState(null);
  const [remainingMs, setRemainingMs] = useState(initialSeconds * 1000);
  const [running, setRunning]         = useState(false);

  useEffect(() => {
    if (!running || targetMs == null) return;

    let id = 0;
    const tick = () => {
      const next = Math.max(0, targetMs - performance.now());
      setRemainingMs(next);

      if (next <= 0) {
        setRunning(false);
        setTargetMs(null);
        return; // stop the loop
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
          <button type="button" onClick={start}>Start</button>
        ) : (
          <button type="button" onClick={pause}>Pause</button>
        )}
        <button type="button" onClick={reset}>Reset</button>
      </div>
    </div>
  );
}
