import { useMemo, useState } from 'react';

export function TodoApp() {
  // items — master list. Each item: { id: string, text: string, done: boolean }
  const [items, setItems] = useState([]);

  // text — controlled value of the "new task" input
  const [text, setText] = useState('');

  // filter — active tab: 'all' | 'active' | 'done'
  const [filter, setFilter] = useState('all');

  // editingId — id of the item currently in edit mode, or null if none.
  // Only one item can be edited at a time.
  const [editingId, setEditingId] = useState(null);

  // editText — controlled value of the inline edit input
  const [editText, setEditText] = useState('');

  // visible — DERIVED from items + filter.
  // useMemo recomputes only when items or filter changes — never stored separately.
  const visible = useMemo(
    () =>
      items.filter((t) =>
        filter === 'all'    ? true
        : filter === 'active' ? !t.done
        : t.done
      ),
    [items, filter]
  );

  // add — CREATE: trim whitespace, reject blanks, append with a stable UUID.
  // crypto.randomUUID() — never use array index as key for dynamic lists.
  const add = () => {
    const t = text.trim();
    if (!t) return;
    setItems((prev) => [...prev, { id: crypto.randomUUID(), text: t, done: false }]);
    setText('');
  };

  // toggle — UPDATE: flip done on the matching id.
  // Spread ensures immutability — never mutate the existing object.
  const toggle = (id) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));

  // remove — DELETE: filter out the item with matching id.
  const remove = (id) => setItems((prev) => prev.filter((x) => x.id !== id));

  // startEdit — enter edit mode for a specific item.
  // Sets editingId so the list renders an <input> for that row,
  // and pre-fills editText so the user edits from the current value.
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  // commitEdit — UPDATE: validate, apply new text, exit edit mode.
  const commitEdit = () => {
    if (!editingId) return;
    const t = editText.trim();
    if (!t) return;
    setItems((prev) =>
      prev.map((x) => (x.id === editingId ? { ...x, text: t } : x))
    );
    setEditingId(null);
  };

  return (
    <div style={{ maxWidth: 420 }}>

      {/* Add task row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="New task"
          aria-label="New task"
          style={{ flex: 1 }}
        />
        <button type="button" onClick={add}>Add</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        {['all', 'active', 'done'].map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Todo list */}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {visible.map((item) => (
          // Stable UUID key — React correctly identifies each row on add/remove/reorder
          <li
            key={item.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
          >
            {/* Completion checkbox */}
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggle(item.id)}
              aria-label={`Done: ${item.text}`}
            />

            {/* Conditional render: edit mode vs view mode */}
            {editingId === item.id ? (
              // Edit mode — shown after double-click
              <>
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                  aria-label="Edit task"
                />
                <button type="button" onClick={commitEdit}>Save</button>
              </>
            ) : (
              // View mode — double-click to enter edit mode
              <span
                style={{
                  flex: 1,
                  textDecoration: item.done ? 'line-through' : undefined,
                  cursor: 'pointer',
                }}
                onDoubleClick={() => startEdit(item)}
              >
                {item.text}
              </span>
            )}

            <button type="button" onClick={() => remove(item.id)} aria-label="Delete">
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
