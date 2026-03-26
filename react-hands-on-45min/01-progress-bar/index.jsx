export function ProgressBar({ value, min = 0, max = 100, label = 'Progress' }) {
  const span = max - min;

  // Guard divide-by-zero; (value - min) / span normalises to 0..1 → ×100 gives %
  const pct = span === 0 ? 0 : Math.round(((value - min) / span) * 100);

  // ARIA requires aria-valuenow to be within the declared min/max range
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
          width: `${pct}%`,      // template literal: number → CSS percentage string
          background: '#2a6df4',
          transition: 'width 0.25s ease', // CSS handles animation; no JS needed
        }}
      />
      <div style={{ fontSize: 12, marginTop: 4, textAlign: 'right' }}>{pct}%</div>
    </div>
  );
}
