import { useState, useRef, useCallback, useMemo } from "react";

// 15. Build Virtualized List (Performance Focus)
// Pure CSS/JS virtualization — no external lib required.
// Renders only visible rows + a small overscan buffer.

const ITEM_HEIGHT = 48;      // fixed row height in px
const OVERSCAN    = 5;       // extra rows rendered above/below viewport

function generateItems(count) {
  const categories = ["Electronics", "Clothing", "Books", "Food", "Sports"];
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Product #${String(i + 1).padStart(5, "0")}`,
    category: categories[i % categories.length],
    price: +(Math.random() * 500 + 10).toFixed(2),
  }));
}

const ALL_ITEMS = generateItems(100_000); // 100 k rows

function VirtualList({ items, height = 480 }) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const totalHeight = items.length * ITEM_HEIGHT;

  const { startIndex, endIndex } = useMemo(() => {
    const visibleCount = Math.ceil(height / ITEM_HEIGHT);
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
    const end   = Math.min(items.length - 1, start + visibleCount + OVERSCAN * 2);
    return { startIndex: start, endIndex: end };
  }, [scrollTop, height, items.length]);

  const visibleItems = items.slice(startIndex, endIndex + 1);

  const onScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{
        height,
        overflowY: "auto",
        border: "1px solid #ddd",
        borderRadius: 6,
        position: "relative",
      }}
    >
      {/* Spacer that gives the scrollbar the full height */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map((item, localIdx) => {
          const absoluteIdx = startIndex + localIdx;
          return (
            <div
              key={item.id}
              style={{
                position: "absolute",
                top: absoluteIdx * ITEM_HEIGHT,
                left: 0,
                right: 0,
                height: ITEM_HEIGHT,
                display: "flex",
                alignItems: "center",
                padding: "0 16px",
                borderBottom: "1px solid #f0f0f0",
                background: absoluteIdx % 2 === 0 ? "#fff" : "#fafafa",
                fontSize: 14,
                gap: 16,
              }}
            >
              <span style={{ width: 70, color: "#999", fontSize: 12 }}>#{item.id}</span>
              <span style={{ flex: 1, fontWeight: 500 }}>{item.name}</span>
              <span style={{ width: 110, color: "#555" }}>{item.category}</span>
              <span style={{ width: 80, textAlign: "right", color: "#2196f3", fontWeight: "bold" }}>
                ${item.price}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function VirtualizedListDemo() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      search
        ? ALL_ITEMS.filter((i) =>
            i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.category.toLowerCase().includes(search.toLowerCase())
          )
        : ALL_ITEMS,
    [search]
  );

  return (
    <div style={{ padding: 40, maxWidth: 680, fontFamily: "sans-serif" }}>
      <h2>Virtualized List</h2>
      <p style={{ color: "#666", marginTop: -8, fontSize: 14 }}>
        Rendering {ALL_ITEMS.toLocaleString()} rows — only visible rows are in the DOM.
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter by name or category…"
        style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc", width: 280, marginBottom: 12, fontSize: 14 }}
      />
      <p style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>{filtered.length.toLocaleString()} results</p>

      {/* Header */}
      <div
        style={{
          display: "flex",
          padding: "8px 16px",
          background: "#f0f4ff",
          borderRadius: "6px 6px 0 0",
          border: "1px solid #ddd",
          borderBottom: "none",
          fontSize: 13,
          fontWeight: "bold",
          gap: 16,
        }}
      >
        <span style={{ width: 70 }}>ID</span>
        <span style={{ flex: 1 }}>Name</span>
        <span style={{ width: 110 }}>Category</span>
        <span style={{ width: 80, textAlign: "right" }}>Price</span>
      </div>

      <VirtualList items={filtered} height={400} />
    </div>
  );
}
