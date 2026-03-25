import { useState } from 'react';

function reorder(list, from, to) {
  if (from === to) return list;
  const next = list.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

export function DragReorderList({ initial: initialItems }) {
  const [items, setItems] = useState(initialItems);
  const [dragIndex, setDragIndex] = useState(null);

  return (
    <ul style={{ listStyle: 'none', padding: 0, maxWidth: 320 }}>
      {items.map((label, index) => (
        <li
          key={label}
          draggable
          onDragStart={(e) => {
            setDragIndex(index);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(index));
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'));
            const to = index;
            if (!Number.isFinite(from)) return;
            setItems((prev) => reorder(prev, from, to));
            setDragIndex(null);
          }}
          onDragEnd={() => setDragIndex(null)}
          style={{
            padding: '10px 12px',
            marginBottom: 6,
            border: '1px solid #ccc',
            borderRadius: 6,
            cursor: 'grab',
            background: dragIndex === index ? '#f0f4ff' : '#fff',
          }}
        >
          {label}
        </li>
      ))}
    </ul>
  );
}
