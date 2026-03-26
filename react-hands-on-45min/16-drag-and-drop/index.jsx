import { useState } from 'react';

// Pure helper — moves item from `from` index to `to` index.
// Returns a NEW array; never mutates the original (safe for React state).
function reorder(list, from, to) {
  if (from === to) return list;

  const next = list.slice();          // shallow copy — we must NOT mutate state directly
  const [x] = next.splice(from, 1);  // remove the dragged item from its old position
  next.splice(to, 0, x);             // insert it at the drop target position
  return next;
}

export function DragReorderList({ initial: initialItems }) {
  const [items, setItems] = useState(initialItems);

  // dragIndex: index of the item currently in flight, or null when idle.
  // Used for the visual highlight and as primary source in onDrop.
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
            // Write to dataTransfer as a fallback for cross-component or cross-tab drags
            e.dataTransfer.setData('text/plain', String(index));
          }}
          // CRITICAL: onDragOver MUST call e.preventDefault().
          // The browser's default is to block drops on most elements.
          // preventDefault signals "this is a valid drop target" and enables onDrop.
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const from = dragIndex ?? Number(e.dataTransfer.getData('text/plain'));
            const to = index;
            if (!Number.isFinite(from)) return;
            setItems((prev) => reorder(prev, from, to));
            setDragIndex(null);
          }}
          // onDragEnd fires on the SOURCE element whether the drop succeeded or was cancelled.
          // Always reset dragIndex here so the highlight never gets stuck.
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
