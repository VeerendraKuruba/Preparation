import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

export type SearchableDropdownOption = { value: string; label: string };

type Props = {
  options: SearchableDropdownOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  label?: string;
};

/** Combobox-style dropdown: type to filter, ↑↓ to move, Enter to select, Esc closes. */

export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  label = 'Select',
}: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter((o) => o.label.toLowerCase().includes(s));
  }, [options, q]);

  useEffect(() => {
    if (open) setHi(0);
  }, [open, q]);

  const commit = (opt: SearchableDropdownOption) => {
    onChange(opt.value);
    setQ(opt.label);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
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
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && filtered[hi] ? `${listId}-opt-${hi}` : undefined}
        aria-autocomplete="list"
        value={open ? q : selected?.label ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          onChange(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 100);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul
          id={listId}
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
              id={`${listId}-opt-${idx}`}
              role="option"
              aria-selected={idx === hi}
              onMouseDown={(e) => e.preventDefault()}
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
