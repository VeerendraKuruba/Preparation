import React, { useState } from 'react';
import './FileExplorer.css';

const SAMPLE_TREE = {
  id: 'root',
  name: 'project',
  type: 'folder',
  children: [
    {
      id: '1',
      name: 'src',
      type: 'folder',
      children: [
        {
          id: '2',
          name: 'components',
          type: 'folder',
          children: [
            { id: '3', name: 'Header.jsx', type: 'file' },
            { id: '4', name: 'Footer.jsx', type: 'file' },
          ],
        },
        { id: '5', name: 'App.js', type: 'file' },
        { id: '6', name: 'index.js', type: 'file' },
      ],
    },
    {
      id: '7',
      name: 'public',
      type: 'folder',
      children: [{ id: '8', name: 'index.html', type: 'file' }],
    },
    { id: '9', name: 'package.json', type: 'file' },
  ],
};

function FileNode({ node, selectedId, onSelect, depth = 0 }) {
  const [open, setOpen] = useState(false);
  const isFolder = node.type === 'folder';
  const kids = node.children ?? [];
  const expandable = isFolder && kids.length > 0;

  return (
    <div className="file-node">
      <div
        className={`node-row ${isFolder ? 'folder' : 'file'} ${selectedId === node.id ? 'selected' : ''}`}
        style={{ paddingLeft: `${10 + depth * 20}px` }}
        onClick={() => onSelect(node.id)}
      >
        {expandable ? (
          <button
            type="button"
            className="node-chevron"
            title={open ? 'Collapse' : 'Expand'}
            aria-label={open ? 'Collapse folder' : 'Expand folder'}
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
          >
            {open ? '▼' : '▶'}
          </button>
        ) : (
          <span className="node-chevron-spacer" aria-hidden />
        )}
        <span className="node-type-icon" aria-hidden>
          {isFolder ? (open ? '📂' : '📁') : '📄'}
        </span>
        <span className="name">{node.name}</span>
      </div>

      {expandable && open && (
        <div className="children">
          {kids.map((child) => (
            <FileNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileExplorer() {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className="file-explorer">
      <h2>File Explorer</h2>
      <div className="tree">
        <FileNode node={SAMPLE_TREE} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
    </div>
  );
}
