import { useMemo, useState } from 'react';

export function DataTable({ rows, columns, pageSize = 5, getRowId }) {
  const [sortCol, setSortCol] = useState(columns[0]?.id ?? null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortCol) return rows;
    const col = columns.find((c) => c.id === sortCol);
    if (!col) return rows;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.accessor(a);
      const vb = col.accessor(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [rows, columns, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (id) => {
    if (sortCol === id) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
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
              <th key={c.id} style={{ textAlign: 'left', borderBottom: '2px solid #ccc' }}>
                <button
                  type="button"
                  onClick={() => toggleSort(c.id)}
                  style={{ font: 'inherit', border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  {c.header}
                  {sortCol === c.id ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row) => (
            <tr key={getRowId(row)}>
              {columns.map((c) => (
                <td key={c.id} style={{ borderBottom: '1px solid #eee', padding: '8px 4px' }}>
                  {c.cell ? c.cell(row) : String(c.accessor(row))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={safePage === 0}
        >
          Prev
        </button>
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
