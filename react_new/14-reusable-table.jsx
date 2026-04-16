import { useState, useMemo } from "react";

// 14. Build a Reusable Table Component (Sorting, Filtering)

// ─── Generic Table ────────────────────────────────────────────────────────────
// columns: [{ key, label, sortable?, render?(value, row) }]
function Table({ columns, data, pageSize = 8 }) {
  const [sortKey, setSortKey]   = useState(null);
  const [sortDir, setSortDir]   = useState("asc");
  const [filter, setFilter]     = useState("");
  const [page, setPage]         = useState(1);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const processed = useMemo(() => {
    let rows = data.filter((row) =>
      Object.values(row).some((v) =>
        String(v).toLowerCase().includes(filter.toLowerCase())
      )
    );
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        const diff = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? diff : -diff;
      });
    }
    return rows;
  }, [data, filter, sortKey, sortDir]);

  const totalPages  = Math.ceil(processed.length / pageSize) || 1;
  const paginated   = processed.slice((page - 1) * pageSize, page * pageSize);

  const arrow = (key) => {
    if (sortKey !== key) return " ↕";
    return sortDir === "asc" ? " ▲" : " ▼";
  };

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      {/* Global filter */}
      <input
        value={filter}
        onChange={(e) => { setFilter(e.target.value); setPage(1); }}
        placeholder="Filter rows…"
        style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc", marginBottom: 12, width: 240, fontSize: 14 }}
      />

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f0f4ff" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    borderBottom: "2px solid #d0d8f0",
                    cursor: col.sortable !== false ? "pointer" : "default",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.label}
                  {col.sortable !== false && (
                    <span style={{ opacity: 0.5, fontSize: 12 }}>{arrow(col.key)}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: 16, color: "#999", textAlign: "center" }}>
                  No records found.
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr key={row.id ?? i} style={{ borderBottom: "1px solid #eee", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  {columns.map((col) => (
                    <td key={col.key} style={{ padding: "10px 14px" }}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 13, color: "#666" }}>
        <span>
          {processed.length === 0
            ? "No results"
            : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, processed.length)} of ${processed.length}`}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ padding: "4px 10px" }}>‹</button>
          <span style={{ padding: "4px 8px" }}>Page {page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} style={{ padding: "4px 10px" }}>›</button>
        </div>
      </div>
    </div>
  );
}

// ─── Demo ─────────────────────────────────────────────────────────────────────
const EMPLOYEES = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  name: ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank"][i % 8] + ` ${i + 1}`,
  department: ["Engineering", "Design", "Marketing", "Sales", "HR"][i % 5],
  salary: 50000 + (i * 1753) % 80000,
  status: i % 3 === 0 ? "Inactive" : "Active",
}));

const COLUMNS = [
  { key: "id",         label: "ID",         sortable: false },
  { key: "name",       label: "Name" },
  { key: "department", label: "Department" },
  { key: "salary",     label: "Salary",     render: (v) => `$${v.toLocaleString()}` },
  {
    key: "status",
    label: "Status",
    sortable: false,
    render: (v) => (
      <span
        style={{
          padding: "2px 10px",
          borderRadius: 12,
          fontSize: 12,
          fontWeight: "bold",
          background: v === "Active" ? "#e8f5e9" : "#ffebee",
          color: v === "Active" ? "#2e7d32" : "#c62828",
        }}
      >
        {v}
      </span>
    ),
  },
];

export default function TableDemo() {
  return (
    <div style={{ padding: 40, maxWidth: 800 }}>
      <h2>Reusable Table (Sorting & Filtering)</h2>
      <Table columns={COLUMNS} data={EMPLOYEES} pageSize={8} />
    </div>
  );
}
