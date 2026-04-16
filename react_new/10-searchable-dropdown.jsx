import { useState, useRef, useEffect, useCallback } from "react";

// 10. Build a Searchable Dropdown (Autocomplete)

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Argentina","Australia","Austria","Bangladesh",
  "Belgium","Brazil","Canada","Chile","China","Colombia","Croatia","Czech Republic",
  "Denmark","Egypt","Ethiopia","Finland","France","Germany","Ghana","Greece",
  "Hungary","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Japan",
  "Kenya","Malaysia","Mexico","Morocco","Netherlands","New Zealand","Nigeria",
  "Norway","Pakistan","Peru","Philippines","Poland","Portugal","Romania","Russia",
  "Saudi Arabia","South Africa","South Korea","Spain","Sri Lanka","Sweden",
  "Switzerland","Taiwan","Thailand","Turkey","Ukraine","United Kingdom",
  "United States","Venezuela","Vietnam",
];

export default function SearchableDropdown() {
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState(null);
  const [open, setOpen]         = useState(false);
  const [focused, setFocused]   = useState(-1);
  const inputRef                = useRef(null);
  const listRef                 = useRef(null);

  const filtered = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 12);

  const select = useCallback((country) => {
    setSelected(country);
    setQuery(country);
    setOpen(false);
    setFocused(-1);
  }, []);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown")
      setFocused((f) => Math.min(f + 1, filtered.length - 1));
    else if (e.key === "ArrowUp")
      setFocused((f) => Math.max(f - 1, 0));
    else if (e.key === "Enter" && focused >= 0)
      select(filtered[focused]);
    else if (e.key === "Escape")
      setOpen(false);
  };

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (!inputRef.current?.closest(".dropdown-root")?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll focused item into view
  useEffect(() => {
    if (focused >= 0 && listRef.current) {
      const item = listRef.current.children[focused];
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [focused]);

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 340 }}>
      <h2>Searchable Dropdown</h2>
      {selected && <p style={{ color: "#4caf50" }}>Selected: <strong>{selected}</strong></p>}

      <div className="dropdown-root" style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setFocused(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search country…"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />

        {open && filtered.length > 0 && (
          <ul
            ref={listRef}
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              border: "1px solid #ccc",
              borderTop: "none",
              borderRadius: "0 0 6px 6px",
              background: "#fff",
              maxHeight: 240,
              overflowY: "auto",
              listStyle: "none",
              margin: 0,
              padding: 0,
              zIndex: 100,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            {filtered.map((c, i) => (
              <li
                key={c}
                onMouseDown={() => select(c)}
                onMouseEnter={() => setFocused(i)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  background: i === focused ? "#e3f2fd" : "#fff",
                  fontSize: 14,
                }}
              >
                {c}
              </li>
            ))}
          </ul>
        )}

        {open && filtered.length === 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              border: "1px solid #ccc",
              borderTop: "none",
              padding: "10px 14px",
              background: "#fff",
              color: "#999",
              fontSize: 14,
            }}
          >
            No results found
          </div>
        )}
      </div>
    </div>
  );
}
