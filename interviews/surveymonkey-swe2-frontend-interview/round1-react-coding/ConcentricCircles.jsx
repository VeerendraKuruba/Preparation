import React, { useEffect, useRef, useState } from "react";

const CANVAS_SIZE = 400;
const PADDING = 20; // px gap between outermost circle edge and canvas edge

export default function ConcentricCircles() {
  const [input, setInput] = useState("5");
  const canvasRef = useRef(null);

  const count = Math.max(1, Math.min(20, parseInt(input) || 0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const maxRadius = CANVAS_SIZE / 2 - PADDING;

    // Equal gap between every ring so they all fit inside the canvas
    const gap = maxRadius / count;

    for (let i = count; i >= 1; i--) {
      const radius = i * gap;

      // Interpolate color: outermost → light indigo, innermost → deep indigo
      const t = (count - i) / (count - 1 || 1); // 0 = outermost, 1 = innermost
      const color = interpolateColor("#c7d2fe", "#3730a3", t);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }, [count]);

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.heading}>Concentric Circles</h2>

      <div style={styles.inputRow}>
        <label htmlFor="circle-count" style={styles.label}>
          Number of circles
        </label>
        <input
          id="circle-count"
          type="number"
          min={1}
          max={20}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={styles.input}
        />
        <span style={styles.hint}>(1 – 20)</span>
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={styles.canvas}
        aria-label={`${count} concentric circles`}
      />
    </div>
  );
}

// ── color helpers ──────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const full =
    hex.length === 4
      ? "#" + [...hex.slice(1)].map((c) => c + c).join("")
      : hex;
  const int = parseInt(full.slice(1), 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function interpolateColor(hexA, hexB, t) {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

// ── styles ─────────────────────────────────────────────────────────────────────

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
    padding: 32,
    fontFamily: "sans-serif",
  },
  heading: {
    margin: 0,
    fontSize: 22,
    fontWeight: 600,
    color: "#1e1b4b",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  label: {
    fontSize: 15,
    color: "#374151",
  },
  input: {
    width: 70,
    padding: "6px 10px",
    fontSize: 16,
    border: "1.5px solid #6366f1",
    borderRadius: 6,
    outline: "none",
    textAlign: "center",
  },
  hint: {
    fontSize: 13,
    color: "#9ca3af",
  },
  canvas: {
    borderRadius: 12,
    boxShadow: "0 4px 24px rgba(99,102,241,0.15)",
    background: "#f5f3ff",
  },
};
