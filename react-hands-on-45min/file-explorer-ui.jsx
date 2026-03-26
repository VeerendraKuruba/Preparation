import { useState } from 'react';

function TreeNode({ node, depth, expanded, toggle, selectedId, onSelect }) {
  const isFolder = node.kind === 'folder';
  const open = expanded.has(node.id);
  const selected = selectedId === node.id;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingLeft: depth * 16,
          background: selected ? '#e8f0fe' : undefined,
        }}
      >
        {isFolder ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => toggle(node.id)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            {open ? '▼' : '▶'}
          </button>
        ) : (
          <span style={{ width: 22 }} />
        )}
        <button
          type="button"
          onClick={() => (isFolder ? toggle(node.id) : onSelect(node.id))}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            textAlign: 'left',
            flex: 1,
            padding: '4px 0',
          }}
        >
          {isFolder ? '📁' : '📄'} {node.name}
        </button>
      </div>
      {isFolder &&
        open &&
        node.children?.map((c) => (
          <TreeNode
            key={c.id}
            node={c}
            depth={depth + 1}
            expanded={expanded}
            toggle={toggle}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

const SAMPLE = [
  {
    id: 'root-src',
    name: 'src',
    kind: 'folder',
    children: [
      { id: 'f-app', name: 'App.jsx', kind: 'file' },
      {
        id: 'f-components',
        name: 'components',
        kind: 'folder',
        children: [
          { id: 'f-header', name: 'Header.jsx', kind: 'file' },
          { id: 'f-footer', name: 'Footer.jsx', kind: 'file' },
        ],
      },
    ],
  },
  { id: 'f-pkg', name: 'package.json', kind: 'file' },
];

export function FileExplorer({ roots = SAMPLE }) {
  const [expanded, setExpanded] = useState(() => new Set(['root-src']));
  const [selectedId, setSelectedId] = useState(null);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 6, maxWidth: 360 }}>
      {roots.map((n) => (
        <TreeNode
          key={n.id}
          node={n}
          depth={0}
          expanded={expanded}
          toggle={toggle}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      ))}
      <div style={{ padding: 8, fontSize: 12, color: '#444' }}>
        Selected: {selectedId ?? '—'}
      </div>
    </div>
  );
}
