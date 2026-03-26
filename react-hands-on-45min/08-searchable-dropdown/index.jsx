import { useEffect, useId, useMemo, useState } from 'react';

// SearchableDropdown — a fully accessible, keyboard-navigable combobox.
//
// Props:
//   options     — array of { value, label } objects
//   value       — currently selected value (controlled by parent)
//   onChange    — called with new value string, or null when search clears selection
//   placeholder — input placeholder text
//   label       — visible label text above the input
export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  label = 'Select',
}) {
  // useId gives a stable unique string per component instance.
  // Used to wire ARIA attributes: aria-controls and aria-activedescendant.
  const listId = useId();

  // open — whether the dropdown list is currently visible
  const [open, setOpen] = useState(false);

  // q — the current search query typed by the user (controlled input value)
  const [q, setQ] = useState('');

  // hi — highlight index: which option in the filtered list is active.
  // Drives keyboard navigation and aria-activedescendant.
  const [hi, setHi] = useState(0);

  // selected — the full option object for the currently selected value.
  // Memoized so we don't re-scan options on every render.
  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  // filtered — subset of options matching the current query (case-insensitive).
  // Recalculated only when options or q changes.
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [options, q]);

  // Reset highlight to the first item whenever the list opens or the query changes.
  useEffect(() => {
    if (open) setHi(0);
  }, [open, q]);

  // commit — finalise the selection of an option.
  const commit = (opt) => {
    onChange(opt.value); // lift selected value up to parent
    setQ(opt.label);     // show selected label in the input field
    setOpen(false);      // close the list
  };

  // onKeyDown — handles all keyboard interactions for the combobox.
  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'Escape') { setOpen(false); return; }

    if (e.key === 'ArrowDown') {
      // e.preventDefault() stops the browser from scrolling the page down —
      // the default action of ArrowDown outside a textarea.
      e.preventDefault();
      setHi((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); // same reason — prevent page scroll
      setHi((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && open) {
      const opt = filtered[hi];
      if (opt) commit(opt);
    }
  };

  return (
    <div style={{ position: 'relative', maxWidth: 320 }}>
      <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>{label}</label>

      <input
        // ARIA combobox pattern: the input IS the combobox widget.
        role="combobox"
        aria-expanded={open}           // tells screen readers if the list is open
        aria-controls={listId}         // links this input to the listbox by id
        // aria-activedescendant: id of the highlighted option.
        // Screen readers announce it without moving DOM focus away from the input.
        aria-activedescendant={open && filtered[hi] ? `${listId}-opt-${hi}` : undefined}
        aria-autocomplete="list"       // signals that typing filters the list

        // When open: show what the user is typing (q).
        // When closed: show the selected option's label (or empty string).
        value={open ? q : selected?.label ?? ''}
        placeholder={placeholder}

        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          onChange(null); // clear parent selection when user starts a new search
        }}

        onFocus={() => setOpen(true)}

        onBlur={() => {
          // We delay closing by 100ms because browsers fire blur BEFORE click.
          // Closing synchronously here would destroy the list before the click
          // on a list item could register, making option clicks appear broken.
          window.setTimeout(() => setOpen(false), 100);
        }}

        onKeyDown={onKeyDown}
      />

      {open && (
        <ul
          id={listId}      // matched by aria-controls on the input
          role="listbox"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            maxHeight: 220,
            overflow: 'auto',
            border: '1px solid #ccc',
            background: '#fff',
            zIndex: 10,
          }}
        >
          {filtered.map((opt, idx) => (
            <li
              key={opt.value}
              id={`${listId}-opt-${idx}`}  // referenced by aria-activedescendant
              role="option"
              aria-selected={idx === hi}   // true for the currently highlighted item

              // onMouseDown preventDefault is the critical fix for blur-before-click.
              // Browser event order: mousedown → blur → mouseup → click.
              // preventDefault on mousedown keeps focus on the input so onBlur
              // never fires during an option click — the click lands cleanly.
              onMouseDown={(e) => e.preventDefault()}

              // Keep keyboard and mouse highlight in sync
              onMouseEnter={() => setHi(idx)}

              onClick={() => commit(opt)}

              style={{
                padding: '8px 10px',
                background: idx === hi ? '#e8f0fe' : undefined,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
