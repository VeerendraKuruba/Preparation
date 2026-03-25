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
