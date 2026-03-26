# Data Table — Sort + Pagination

## What to Build

A generic, reusable table component that supports:

- Click-to-sort on any column header (toggles asc/desc on the same column)
- Client-side pagination with a configurable page size
- Fully driven by `rows` and `columns` config props — no hardcoded schema

---

## Props

| Prop       | Type     | Description                                    |
|------------|----------|------------------------------------------------|
| `rows`     | array    | Full data array                                |
| `columns`  | array    | `[{ id, header, accessor, cell? }]`            |
| `pageSize` | number   | Rows per page (default `5`)                    |
| `getRowId` | function | `(row) => stable unique key`                   |

---

## State

| State variable | Type              | Purpose                             |
|----------------|-------------------|-------------------------------------|
| `sortCol`      | string\|null      | Which column id is the sort key     |
| `sortDir`      | `'asc'`\|`'desc'` | Sort direction                      |
| `page`         | number            | Zero-based current page index       |

---

## Key Trick: useMemo for Sorted Data

```js
const sorted = useMemo(() => {
  if (!sortCol) return rows;
  const col = columns.find((c) => c.id === sortCol);
  const dir = sortDir === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {   // <-- spread FIRST
    const va = col.accessor(a);
    const vb = col.accessor(b);
    if (va < vb) return -1 * dir;
    if (va > vb) return 1 * dir;
    return 0;
  });
}, [rows, columns, sortCol, sortDir]);
```

Sorting is O(n log n). Without `useMemo` it runs on every render — including parent re-renders that have nothing to do with the table. `useMemo` caches the result and only recomputes when the listed dependencies actually change.

---

## NEVER Sort the Original Array — Use Spread First

`Array.prototype.sort()` mutates in-place. If you sort `rows` directly you mutate the prop that was passed in from the parent, breaking React's unidirectional data flow. `[...rows]` creates a new array you own; the parent's data is untouched.

---

## Reset Page to 0 When Sort Changes

```js
const toggleSort = (id) => {
  // ... update sortCol / sortDir ...
  setPage(0); // always reset
};
```

After a sort the rows are in a completely different order. Staying on page 3 would show a confusing jump. Resetting gives users a predictable "start from the top" experience.

---

## Pagination Math

```js
const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
const safePage   = Math.min(page, totalPages - 1);   // clamp on data shrink
const pageRows   = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);
```

`safePage` guards against the case where the parent passes in fewer rows (e.g. after an upstream filter). Without clamping, `page` could point past the last valid index and `slice` would return an empty array — a blank table with no error.

---

## Interview Questions

**Q: Why use useMemo for sorted data?**

Sorting is O(n log n). Without memoization it runs on every render, including renders triggered by unrelated state changes in a parent. `useMemo` caches the sorted array and only recomputes when `rows`, `columns`, `sortCol`, or `sortDir` actually change. For 10,000 rows the difference between sorting on every keystroke in a parent form vs. only on column-click is very noticeable.

---

**Q: Why spread before sort?**

`Array.prototype.sort()` is an in-place mutation. Sorting `rows` directly would mutate the prop that came from the parent, silently reordering the parent's data. The parent would not know its array changed because it is the same reference. `[...rows]` creates a new array we own and are free to rearrange.

---

**Q: How would you handle 100,000 rows?**

Client-side sorting and pagination stop working well around 10k–50k rows (sort time, memory). For 100k+ rows:

1. Move sort and pagination to the server — pass `sortCol`, `sortDir`, and `page` as query parameters; the server returns only the requested page.
2. If the data must be client-side, use a Web Worker to sort off the main thread so the UI stays responsive.
3. Combine with virtualization (only render visible rows) for the display layer.
