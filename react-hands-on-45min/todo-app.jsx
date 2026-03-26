import { useMemo, useState } from 'react';

export function TodoApp() {
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const visible = useMemo(
    () =>
      items.filter((t) =>
        filter === 'all' ? true : filter === 'active' ? !t.done : t.done
      ),
    [items, filter]
  );

  const add = () => {
    const t = text.trim();
    if (!t) return;
    setItems((prev) => [...prev, { id: crypto.randomUUID(), text: t, done: false }]);
    setText('');
  };

  const toggle = (id) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  };

  const remove = (id) => setItems((prev) => prev.filter((x) => x.id !== id));

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

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
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="New task"
          aria-label="New task"
          style={{ flex: 1 }}
        />
        <button type="button" onClick={add}>
          Add
        </button>
      </div>
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
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {visible.map((item) => (
          <li
            key={item.id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => toggle(item.id)}
              aria-label={`Done: ${item.text}`}
            />
            {editingId === item.id ? (
              <>
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && commitEdit()}
                  aria-label="Edit task"
                />
                <button type="button" onClick={commitEdit}>
                  Save
                </button>
              </>
            ) : (
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
