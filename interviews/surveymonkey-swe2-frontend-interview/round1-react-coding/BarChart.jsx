import React, { useMemo } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MARGIN = { top: 40, right: 30, bottom: 60, left: 60 };
const Y_TICK_COUNT = 5;

// ─── Sub-components ───────────────────────────────────────────────────────────

function GridLines({ innerWidth, innerHeight, yScale, tickValues }) {
  return (
    <g>
      {tickValues.map((val) => {
        const y = innerHeight - yScale(val);
        return (
          <line
            key={val}
            x1={0}
            x2={innerWidth}
            y1={y}
            y2={y}
            stroke="#e5e7eb"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        );
      })}
    </g>
  );
}

function YAxis({ innerHeight, yScale, tickValues }) {
  return (
    <g>
      {/* Axis line */}
      <line x1={0} x2={0} y1={0} y2={innerHeight} stroke="#9ca3af" strokeWidth={1} />

      {tickValues.map((val) => {
        const y = innerHeight - yScale(val);
        return (
          <g key={val} transform={`translate(0, ${y})`}>
            <line x1={-5} x2={0} stroke="#9ca3af" strokeWidth={1} />
            <text
              x={-10}
              dy="0.35em"
              textAnchor="end"
              fontSize={12}
              fill="#6b7280"
            >
              {val}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function XAxis({ innerHeight, data, bandWidth, gap }) {
  return (
    <g transform={`translate(0, ${innerHeight})`}>
      {/* Axis line */}
      <line x1={0} x2={(bandWidth + gap) * data.length} stroke="#9ca3af" strokeWidth={1} />

      {data.map((d, i) => {
        const x = i * (bandWidth + gap) + bandWidth / 2;
        return (
          <g key={d.label} transform={`translate(${x}, 0)`}>
            <line y1={0} y2={5} stroke="#9ca3af" strokeWidth={1} />
            <text
              y={20}
              textAnchor="middle"
              fontSize={12}
              fill="#374151"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Bar({ x, y, width, height, color, value, animate }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        rx={4}
        style={
          animate
            ? {
                transformOrigin: `${x + width / 2}px bottom`,
                animation: "growUp 0.5s ease-out",
              }
            : {}
        }
      />
      {/* Value label on top of bar */}
      <text
        x={x + width / 2}
        y={y - 6}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill="#374151"
      >
        {value}
      </text>
    </g>
  );
}

function ChartTitle({ innerWidth, title }) {
  if (!title) return null;
  return (
    <text
      x={innerWidth / 2}
      y={-16}
      textAnchor="middle"
      fontSize={16}
      fontWeight={700}
      fill="#111827"
    >
      {title}
    </text>
  );
}

// ─── Scale helpers ────────────────────────────────────────────────────────────

function computeYScale(maxValue, innerHeight) {
  // Returns a function: value → pixel height
  const niceMax = niceNumber(maxValue);
  return {
    scale: (val) => (val / niceMax) * innerHeight,
    niceMax,
  };
}

function computeTickValues(niceMax) {
  const step = niceMax / Y_TICK_COUNT;
  return Array.from({ length: Y_TICK_COUNT + 1 }, (_, i) => i * step);
}

/** Round up to a "nice" number for the Y-axis ceiling */
function niceNumber(value) {
  if (value === 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const fraction = value / magnitude;
  let nice;
  if (fraction <= 1) nice = 1;
  else if (fraction <= 2) nice = 2;
  else if (fraction <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * BarChart
 *
 * Props:
 *   data    — array of { label: string, value: number }
 *   width   — total SVG width  (default 600)
 *   height  — total SVG height (default 400)
 *   title   — optional chart title
 *   color   — bar fill color   (default "#6366f1")
 *   animate — grow-up animation on mount (default true)
 */
export default function BarChart({
  data = [],
  width = 600,
  height = 400,
  title = "",
  color = "#6366f1",
  animate = true,
}) {
  const innerWidth  = width  - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top  - MARGIN.bottom;

  const gap       = 16;
  const bandWidth = (innerWidth - gap * (data.length - 1)) / data.length;
  const maxValue  = Math.max(...data.map((d) => d.value), 0);

  const { scale: yScale, niceMax } = useMemo(
    () => computeYScale(maxValue, innerHeight),
    [maxValue, innerHeight]
  );

  const tickValues = useMemo(() => computeTickValues(niceMax), [niceMax]);

  if (data.length === 0) {
    return (
      <div style={styles.empty}>No data to display.</div>
    );
  }

  return (
    <>
      <style>{keyframes}</style>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={title || "Bar chart"}
        style={styles.svg}
      >
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          <ChartTitle innerWidth={innerWidth} title={title} />

          <GridLines
            innerWidth={innerWidth}
            innerHeight={innerHeight}
            yScale={yScale}
            tickValues={tickValues}
          />

          <YAxis
            innerHeight={innerHeight}
            yScale={yScale}
            tickValues={tickValues}
          />

          {data.map((d, i) => {
            const barHeight = yScale(d.value);
            const x = i * (bandWidth + gap);
            const y = innerHeight - barHeight;
            return (
              <Bar
                key={d.label}
                x={x}
                y={y}
                width={bandWidth}
                height={barHeight}
                color={color}
                value={d.value}
                animate={animate}
              />
            );
          })}

          <XAxis
            innerHeight={innerHeight}
            data={data}
            bandWidth={bandWidth}
            gap={gap}
          />
        </g>
      </svg>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  svg: {
    display: "block",
    overflow: "visible",
  },
  empty: {
    padding: 24,
    color: "#9ca3af",
    fontSize: 14,
  },
};

const keyframes = `
  @keyframes growUp {
    from { transform: scaleY(0); }
    to   { transform: scaleY(1); }
  }
`;
