import { useState } from 'react';

// ── TreeNode (recursive component) ────────────────────────────────────────────
// Props:
//   node       — { id, name, kind: 'file'|'folder', children?: Node[] }
//   depth      — nesting depth (0 = root); drives left padding
//   expanded   — Set of folder IDs that are currently open (read-only here)
//   toggle     — (id) => void — mutates the Set in the parent
//   selectedId — id of the currently selected node, or null
//   onSelect   — (id) => void — called when a file is clicked
function TreeNode({ node, depth, expanded, toggle, selectedId, onSelect }) {
  // Derived from props — NOT stored as local state.
  // These recalculate on every render from the canonical parent state.
  const isFolder = node.kind === 'folder';
  const open     = expanded.has(node.id);
  const selected = selectedId === node.id;

  return (
    <div>
      {/* Node row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingLeft: depth * 16,   // indent by 16px per nesting level
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
          // Spacer keeps file names aligned with folder names
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

      {/*
       * Recursive children — only rendered when this IS a folder AND is open.
       * Short-circuit: isFolder false → never calls .map → no error on files.
       * Recursion terminates naturally when a node has no children.
       */}
      {isFolder &&
        open &&
        node.children?.map((c) => (
          <TreeNode
            key={c.id}          // stable unique ID — not index — for correct reconciliation
            node={c}
            depth={depth + 1}   // children are indented one level further
            expanded={expanded} // same Set reference passed down (read-only)
            toggle={toggle}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

// ── Sample data ────────────────────────────────────────────────────────────────
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

// ── FileExplorer (root component — owns all state) ─────────────────────────────
// Props:
//   roots — array of top-level nodes (defaults to SAMPLE)
export function FileExplorer({ roots = SAMPLE }) {
  // expanded: Set of node IDs for open folders.
  // Lives HERE (not in each TreeNode) so the whole tree's expansion state is
  // centralised — enables "Collapse All", URL serialisation, programmatic expansion.
  // Lazy initialiser (() => new Set([...])) runs ONCE on mount.
  const [expanded, setExpanded] = useState(() => new Set(['root-src']));

  // selectedId: the id of the currently selected file, or null.
  const [selectedId, setSelectedId] = useState(null);

  // toggle: flips a folder open/closed.
  // CRITICAL: never mutate the existing Set. Create a copy (new Set(prev)),
  // mutate the copy, return it. React detects the new reference and re-renders.
  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else              next.add(id);
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
