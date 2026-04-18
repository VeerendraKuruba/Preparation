import { useEffect, useRef, useState } from "react";

const CANVAS_SIZE = 400;

export default function ConcentricCircles() {
  const [count, setCount] = useState(5);
  const canvasRef = useRef(null);

  useEffect(() => {
    drawCircles(canvasRef.current, count);
  }, [count]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: 32, fontFamily: "sans-serif" }}>
      <h2>Concentric Circles</h2>

      <div>
        <label>How many circles? </label>
        <input
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
      </div>

      <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} style={{ background: "#f9f9f9", borderRadius: 12 }} />
    </div>
  );
}

function drawCircles(canvas, count) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  const centerX = CANVAS_SIZE / 2;
  const centerY = CANVAS_SIZE / 2;
  const maxRadius = CANVAS_SIZE / 2 - 20;
  const radiusStep = maxRadius / count;

  // Draw largest → smallest so inner circles paint over outer ones
  for (let i = count; i >= 1; i--) {
    const radius = i * radiusStep;

    // Hue 0–360° walks the color wheel; i/count maps outer→inner rings across that range.
    const hue = (i / count) * 360;
    // hsl(h, s%, l%): hue (which color), saturation (vividness), lightness (mix with white/black).
    // Next ctx.fill() uses this as the solid color for the current circle path.
    ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();
  }
}
