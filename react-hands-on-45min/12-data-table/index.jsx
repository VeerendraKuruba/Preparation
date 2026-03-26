import { useMemo, useState } from 'react';

// DataTable — a generic, reusable table with sortable columns and pagination.
//
// Props:
//   rows       — full data array
//   columns    — array of { id, header, accessor, cell? }
//   pageSize   — rows per page (default 5)
//   getRowId   — (row) => stable unique key

export function DataTable({ rows, columns, pageSize = 5, getRowId }) {
  // sortCol — which column id is the current sort key (defaults to first column)
  const [sortCol, setSortCol] = useState(columns[0]?.id ?? null);

  // sortDir — 'asc' or 'desc'
  const [sortDir, setSortDir] = useState('asc');

  // page — zero-based current page index
  const [page, setPage] = useState(0);

  // sorted — memoized sort result.
  // useMemo: only recomputes when rows/columns/sortCol/sortDir change.
  // Without memoization, O(n log n) sort runs on EVERY render.
  const sorted = useMemo(() => {
    if (!sortCol) return rows;

    const col = columns.find((c) => c.id === sortCol);
    if (!col) return rows;

    const dir = sortDir === 'asc' ? 1 : -1;

    // IMPORTANT: spread [...rows] first — Array.sort() mutates in-place.
    // Never mutate the prop; callers expect it to remain stable.
    return [...rows].sort((a, b) => {
      const va = col.accessor(a);
      const vb = col.accessor(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [rows, columns, sortCol, sortDir]);

  // Pagination — pure derived values, no extra useState needed.
  // Math.max(1, …) ensures totalPages is never 0 for an empty table.
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));

  // safePage — clamps page so it never exceeds the last valid index.
  // Protects against data shrinking (e.g. upstream filter) while on a later page.
  const safePage = Math.min(page, totalPages - 1);

  // pageRows — the exact slice to render for the current page
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  // toggleSort — clicking the same column flips direction; a new column resets to asc.
  // Always resets to page 0 so users see the sorted list from the beginning.
  const toggleSort = (id) => {
    if (sortCol === id) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(id);
      setSortDir('asc');
    }
    setPage(0);
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 480 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              // <button> inside <th> keeps column headers keyboard-accessible
              <th key={c.id} style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
                <button
                  type="button"
                  onClick={() => toggleSort(c.id)}
                  style={{ font: 'inherit', border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  {c.header}
                  {/* Direction arrow only shown on active sort column */}
                  {sortCol === c.id ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row) => (
            // getRowId gives a stable key — never use array index for sortable lists
            <tr key={getRowId(row)}>
              {columns.map((c) => (
                <td key={c.id} style={{ borderBottom: '1px solid #eee', padding: '8px 4px' }}>
                  {/* c.cell is an optional custom renderer; fall back to accessor */}
                  {c.cell ? c.cell(row) : String(c.accessor(row))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={safePage === 0}
        >
          Prev
        </button>

        {/* Display 1-based page number to users (zero-based internally) */}
        <span style={{ fontSize: 13 }}>
          Page {safePage + 1} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={safePage >= totalPages - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
