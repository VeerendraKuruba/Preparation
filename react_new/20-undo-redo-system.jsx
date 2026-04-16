import { useReducer, useCallback, useEffect } from "react";

// 20. Build an Undo / Redo System
// Generic useUndoRedo hook that wraps any state with full undo/redo support.

// ─── Hook ─────────────────────────────────────────────────────────────────────
function useUndoRedo(initialState) {
  const initialHistory = {
    past:    [],       // stack of previous states
    present: initialState,
    future:  [],       // stack of undone states
  };

  const reducer = (history, action) => {
    const { past, present, future } = history;

    switch (action.type) {
      case "SET": {
        if (action.payload === present) return history; // no-op on same value
        return {
          past:    [...past, present],
          present: action.payload,
          future:  [],              // new action clears redo stack
        };
      }
      case "UNDO": {
        if (past.length === 0) return history;
        const previous = past[past.length - 1];
        return {
          past:    past.slice(0, -1),
          present: previous,
          future:  [present, ...future],
        };
      }
      case "REDO": {
        if (future.length === 0) return history;
        const next = future[0];
        return {
          past:    [...past, present],
          present: next,
          future:  future.slice(1),
        };
      }
      case "CLEAR":
        return initialHistory;
      default:
        return history;
    }
  };

  const [history, dispatch] = useReducer(reducer, initialHistory);

  const set    = useCallback((payload)  => dispatch({ type: "SET", payload }), []);
  const undo   = useCallback(()         => dispatch({ type: "UNDO" }),          []);
  const redo   = useCallback(()         => dispatch({ type: "REDO" }),          []);
  const clear  = useCallback(()         => dispatch({ type: "CLEAR" }),         []);

  return {
    state:      history.present,
    set,
    undo,
    redo,
    clear,
    canUndo:    history.past.length > 0,
    canRedo:    history.future.length > 0,
    pastCount:  history.past.length,
    futureCount: history.future.length,
    history,
  };
}

// ─── Demo: Drawing canvas with undo/redo ──────────────────────────────────────
const COLORS  = ["#2196f3","#f44336","#4caf50","#ff9800","#9c27b0","#000000"];
const SIZES   = [3, 6, 12, 20];

const EMPTY_CANVAS = [];

export default function UndoRedoSystem() {
  const {
    state: strokes,
    set,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    pastCount,
    futureCount,
  } = useUndoRedo(EMPTY_CANVAS);

  const drawing       = { current: false };
  const currentStroke = { current: [] };
  const color         = { current: "#2196f3" };
  const lineWidth     = { current: 6 };

  const canvasRef = { current: null };
  const ctxRef    = { current: null };

  // Re-draw whenever strokes change
  const redraw = useCallback((canvas, ctx, allStrokes) => {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    allStrokes.forEach((stroke) => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke[0].color;
      ctx.lineWidth   = stroke[0].size;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      ctx.moveTo(stroke[0].x, stroke[0].y);
      stroke.forEach((pt) => ctx.lineTo(pt.x, pt.y));
      ctx.stroke();
    });
  }, []);

  // Use a real ref via callback ref pattern
  const setCanvas = useCallback((canvas) => {
    if (!canvas) return;
    canvasRef.current = canvas;
    ctxRef.current = canvas.getContext("2d");
    redraw(canvas, ctxRef.current, strokes);
  }, []); // eslint-disable-line

  // Redraw on strokes change
  useEffect(() => {
    redraw(canvasRef.current, ctxRef.current, strokes);
  }, [strokes, redraw]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches?.[0] ?? e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top, color: color.current, size: lineWidth.current };
  };

  const onDown = (e) => {
    drawing.current = true;
    const pt = getPos(e, canvasRef.current);
    currentStroke.current = [pt];
  };

  const onMove = (e) => {
    if (!drawing.current) return;
    const pt  = getPos(e, canvasRef.current);
    const ctx = ctxRef.current;
    currentStroke.current.push(pt);

    // Live draw (uncommitted)
    const prev = currentStroke.current[currentStroke.current.length - 2];
    ctx.beginPath();
    ctx.strokeStyle = pt.color;
    ctx.lineWidth   = pt.size;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const onUp = () => {
    if (!drawing.current || currentStroke.current.length === 0) return;
    drawing.current = false;
    // Commit stroke to history
    set([...strokes, [...currentStroke.current]]);
    currentStroke.current = [];
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", userSelect: "none" }}>
      <h2>Undo / Redo System — Drawing Canvas</h2>
      <p style={{ color: "#888", fontSize: 13, marginTop: -8 }}>
        Draw on the canvas. Use Ctrl+Z / Ctrl+Y (or ⌘Z / ⌘⇧Z) to undo/redo.
      </p>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          style={{ padding: "6px 14px", opacity: canUndo ? 1 : 0.4 }}
        >
          ↩ Undo ({pastCount})
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          style={{ padding: "6px 14px", opacity: canRedo ? 1 : 0.4 }}
        >
          ↪ Redo ({futureCount})
        </button>
        <button
          onClick={clear}
          disabled={strokes.length === 0}
          style={{ padding: "6px 14px", color: "#f44336", opacity: strokes.length ? 1 : 0.4 }}
        >
          Clear All
        </button>

        <div style={{ width: 1, height: 28, background: "#ddd", margin: "0 4px" }} />

        {/* Colors */}
        {COLORS.map((c) => (
          <div
            key={c}
            onClick={() => (color.current = c)}
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: c,
              cursor: "pointer",
              border: "2px solid #fff",
              boxShadow: "0 0 0 1px #ccc",
            }}
          />
        ))}

        <div style={{ width: 1, height: 28, background: "#ddd", margin: "0 4px" }} />

        {/* Sizes */}
        {SIZES.map((s) => (
          <div
            key={s}
            onClick={() => (lineWidth.current = s)}
            style={{
              width: s + 10,
              height: s + 10,
              borderRadius: "50%",
              background: "#333",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        ))}
      </div>

      {/* Canvas */}
      <canvas
        ref={setCanvas}
        width={700}
        height={420}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          cursor: "crosshair",
          display: "block",
          maxWidth: "100%",
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          touchAction: "none",
        }}
      />
      <p style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>
        {strokes.length} stroke(s) in history
      </p>
    </div>
  );
}
