import { useState, useMemo } from "react";

// 9. Build a Pagination Component

const TOTAL_ITEMS = 87;
const PAGE_SIZES  = [5, 10, 20];

function generateItems(total) {
  return Array.from({ length: total }, (_, i) => ({
    id: i + 1,
    name: `Item #${String(i + 1).padStart(3, "0")}`,
    value: Math.floor(Math.random() * 1000),
  }));
}

const ALL_ITEMS = generateItems(TOTAL_ITEMS);

function Pagination({ page, totalPages, onPageChange }) {
  const pages = useMemo(() => {
    const range = [];
    const delta = 2;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - page) <= delta) {
        range.push(i);
      } else if (range[range.length - 1] !== "…") {
        range.push("…");
      }
    }
    return range;
  }, [page, totalPages]);

  const btnStyle = (active) => ({
    padding: "6px 12px",
    margin: "0 2px",
    border: "1px solid #ddd",
    borderRadius: 4,
    background: active ? "#2196f3" : "#fff",
    color: active ? "#fff" : "#333",
    cursor: active ? "default" : "pointer",
    fontWeight: active ? "bold" : "normal",
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 16, flexWrap: "wrap" }}>
      <button
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        style={{ ...btnStyle(false), opacity: page === 1 ? 0.4 : 1 }}
      >
        ‹ Prev
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} style={{ padding: "0 6px" }}>…</span>
        ) : (
          <button key={p} onClick={() => onPageChange(p)} style={btnStyle(p === page)}>
            {p}
          </button>
        )
      )}

      <button
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        style={{ ...btnStyle(false), opacity: page === totalPages ? 0.4 : 1 }}
      >
        Next ›
      </button>
    </div>
  );
}

export default function PaginationDemo() {
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(ALL_ITEMS.length / pageSize);
  const currentItems = ALL_ITEMS.slice((page - 1) * pageSize, page * pageSize);

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 500 }}>
      <h2>Pagination</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 14, color: "#666" }}>
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, ALL_ITEMS.length)} of {ALL_ITEMS.length}
        </span>
        <label style={{ fontSize: 14 }}>
          Per page:{" "}
          <select value={pageSize} onChange={handlePageSizeChange}>
            {PAGE_SIZES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>ID</th>
            <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid #ddd" }}>Name</th>
            <th style={{ padding: "8px 12px", textAlign: "right", borderBottom: "2px solid #ddd" }}>Value</th>
          </tr>
        </thead>
        <tbody>
          {currentItems.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "8px 12px" }}>{item.id}</td>
              <td style={{ padding: "8px 12px" }}>{item.name}</td>
              <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
