# Virtualized product catalog

Small Create React App demo of **list virtualization** with [`react-window`](https://github.com/bvaughn/react-window).

- Renders **50,000** logical rows but only mounts DOM for rows near the viewport.
- Uses `react-window` v2 `List` with `rowComponent` + `rowProps` (fixed `rowHeight`).

## Run

```bash
cd React/VirtualizedProductCatalog
npm install
npm start
```

## Ideas to try next

- Swap in `VariableSizeList` if row heights differ.
- Use `FixedSizeGrid` for a 2D product grid.
- Add `react-window-infinite-loader` if rows come from paginated APIs.
