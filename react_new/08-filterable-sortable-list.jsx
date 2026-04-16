import { useState, useMemo } from "react";

// 8. Build a Filterable & Sortable List

const PRODUCTS = [
  { id: 1, name: "MacBook Pro",   category: "Laptop",  price: 1999 },
  { id: 2, name: "iPhone 16",     category: "Phone",   price: 999  },
  { id: 3, name: "iPad Air",      category: "Tablet",  price: 699  },
  { id: 4, name: "Dell XPS 15",   category: "Laptop",  price: 1499 },
  { id: 5, name: "Samsung S25",   category: "Phone",   price: 849  },
  { id: 6, name: "Surface Pro",   category: "Tablet",  price: 1199 },
  { id: 7, name: "ThinkPad X1",   category: "Laptop",  price: 1349 },
  { id: 8, name: "Pixel 9",       category: "Phone",   price: 799  },
];

const ALL = "All";

export default function FilterableSortableList() {
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState(ALL);
  const [sortKey, setSortKey]     = useState("name");
  const [sortDir, setSortDir]     = useState("asc");

  const categories = [ALL, ...new Set(PRODUCTS.map((p) => p.category))];

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const items = useMemo(() => {
    return PRODUCTS
      .filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchCat    = category === ALL || p.category === category;
        return matchSearch && matchCat;
      })
      .sort((a, b) => {
        let diff = a[sortKey] < b[sortKey] ? -1 : a[sortKey] > b[sortKey] ? 1 : 0;
        return sortDir === "asc" ? diff : -diff;
      });
  }, [search, category, sortKey, sortDir]);

  const arrow = (key) => sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 640 }}>
      <h2>Filterable & Sortable List</h2>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc", flex: 1, minWidth: 160 }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
        >
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            {[["name", "Name"], ["category", "Category"], ["price", "Price"]].map(([key, label]) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                style={{ padding: "10px 12px", textAlign: "left", cursor: "pointer", userSelect: "none", borderBottom: "2px solid #ddd" }}
              >
                {label}{arrow(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={3} style={{ padding: 16, color: "#999" }}>No results found.</td></tr>
          ) : (
            items.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "10px 12px" }}>{p.name}</td>
                <td style={{ padding: "10px 12px" }}>{p.category}</td>
                <td style={{ padding: "10px 12px" }}>${p.price}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <p style={{ fontSize: 13, color: "#888", marginTop: 8 }}>{items.length} result(s)</p>
    </div>
  );
}
