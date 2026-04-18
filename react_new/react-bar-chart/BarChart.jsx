import { useState } from 'react';
import './BarChart.css';

export default function BarChart({ data, keys, colors, title }) {
  const [tooltip, setTooltip] = useState(null);

  const yMax = Math.max(...data.flatMap((item) => keys.map((k) => item[k])));

  return (
    <div className="chart-wrapper">

      <p className="chart-title">{title}</p>

      {/* Bars */}
      <div className="bars">
        {data.map((item) => (
          <div key={item.month} className="bar-group">
            <div className="bar-row">
              {keys.map((key) => (
                <div
                  key={key}
                  className="bar"
                  style={{
                    height: `${(item[key] / yMax) * 100}%`,
                    background: colors[key],
                  }}
                  onMouseEnter={(e) =>
                    setTooltip({
                      label: `${item.month} · ${key}: $${item[key].toLocaleString()}`,
                      x: e.currentTarget.getBoundingClientRect().left,
                      y: e.currentTarget.getBoundingClientRect().top,
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
            <span className="bar-label">{item.month}</span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="legend">
        {keys.map((key) => (
          <div key={key} className="legend-item">
            <div className="legend-dot" style={{ background: colors[key] }} />
            <span>{key}</span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="tooltip" style={{ top: tooltip.y - 48, left: tooltip.x }}>
          {tooltip.label}
        </div>
      )}

    </div>
  );
}
