# Machine Coding & LLD — Postman

> Round 3. **File Directory Manager is a confirmed LLD question.** Additional machine coding: API Request Builder component, Collection Tree, Key-Value Editor, Environment Variables panel. You have 90 minutes. Talk while coding.

---

## 1. File Directory Manager (Confirmed LLD)

**The prompt:** Implement a file directory manager with the ability to create files/folders, navigate the tree, and display the hierarchy.

### OOP Design First

```typescript
// Data model
interface TreeNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  parentId: string | null;
  children?: string[];   // only for folders — child IDs
  createdAt: number;
  modifiedAt: number;
}

// FileSystem class — manages the tree
class FileSystem {
  private nodes: Map<string, TreeNode> = new Map();
  private rootId: string;

  constructor() {
    const root: TreeNode = {
      id: 'root',
      name: '/',
      type: 'folder',
      parentId: null,
      children: [],
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    this.nodes.set('root', root);
    this.rootId = 'root';
  }

  private generateId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createFolder(name: string, parentId: string = this.rootId): TreeNode {
    const parent = this.nodes.get(parentId);
    if (!parent || parent.type !== 'folder') {
      throw new Error('Parent not found or is not a folder');
    }
    if (this.hasChildWithName(parentId, name)) {
      throw new Error(`Folder "${name}" already exists`);
    }

    const node: TreeNode = {
      id: this.generateId(),
      name,
      type: 'folder',
      parentId,
      children: [],
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    this.nodes.set(node.id, node);
    parent.children!.push(node.id);
    parent.modifiedAt = Date.now();
    return node;
  }

  createFile(name: string, parentId: string = this.rootId): TreeNode {
    const parent = this.nodes.get(parentId);
    if (!parent || parent.type !== 'folder') {
      throw new Error('Parent not found or is not a folder');
    }
    if (this.hasChildWithName(parentId, name)) {
      throw new Error(`File "${name}" already exists`);
    }

    const node: TreeNode = {
      id: this.generateId(),
      name,
      type: 'file',
      parentId,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };
    this.nodes.set(node.id, node);
    parent.children!.push(node.id);
    parent.modifiedAt = Date.now();
    return node;
  }

  delete(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error('Node not found');
    if (nodeId === this.rootId) throw new Error('Cannot delete root');

    // Recursively delete children
    if (node.type === 'folder' && node.children) {
      [...node.children].forEach(childId => this.delete(childId));
    }

    // Remove from parent's children
    const parent = this.nodes.get(node.parentId!);
    if (parent?.children) {
      parent.children = parent.children.filter(id => id !== nodeId);
      parent.modifiedAt = Date.now();
    }

    this.nodes.delete(nodeId);
  }

  rename(nodeId: string, newName: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) throw new Error('Node not found');

    if (node.parentId && this.hasChildWithName(node.parentId, newName, nodeId)) {
      throw new Error(`"${newName}" already exists in this location`);
    }

    node.name = newName;
    node.modifiedAt = Date.now();
  }

  move(nodeId: string, newParentId: string): void {
    const node = this.nodes.get(nodeId);
    const newParent = this.nodes.get(newParentId);
    if (!node || !newParent) throw new Error('Node or new parent not found');
    if (newParent.type !== 'folder') throw new Error('Target must be a folder');
    if (this.isAncestor(nodeId, newParentId)) throw new Error('Cannot move folder into its descendant');

    // Remove from current parent
    const oldParent = this.nodes.get(node.parentId!);
    if (oldParent?.children) {
      oldParent.children = oldParent.children.filter(id => id !== nodeId);
      oldParent.modifiedAt = Date.now();
    }

    // Add to new parent
    newParent.children!.push(nodeId);
    newParent.modifiedAt = Date.now();
    node.parentId = newParentId;
    node.modifiedAt = Date.now();
  }

  getNode(nodeId: string): TreeNode | undefined {
    return this.nodes.get(nodeId);
  }

  getChildren(folderId: string): TreeNode[] {
    const folder = this.nodes.get(folderId);
    if (!folder?.children) return [];
    return folder.children
      .map(id => this.nodes.get(id))
      .filter(Boolean) as TreeNode[];
  }

  // Get full path: /projects/postman/api-tests
  getPath(nodeId: string): string {
    const parts: string[] = [];
    let current = this.nodes.get(nodeId);
    while (current && current.parentId !== null) {
      parts.unshift(current.name);
      current = this.nodes.get(current.parentId);
    }
    return '/' + parts.join('/');
  }

  // Search by name (DFS)
  search(query: string): TreeNode[] {
    const results: TreeNode[] = [];
    const lower = query.toLowerCase();
    this.nodes.forEach(node => {
      if (node.name.toLowerCase().includes(lower) && node.id !== this.rootId) {
        results.push(node);
      }
    });
    return results;
  }

  private hasChildWithName(parentId: string, name: string, excludeId?: string): boolean {
    return this.getChildren(parentId).some(
      child => child.name === name && child.id !== excludeId
    );
  }

  private isAncestor(potentialAncestor: string, nodeId: string): boolean {
    let current = this.nodes.get(nodeId);
    while (current) {
      if (current.id === potentialAncestor) return true;
      if (!current.parentId) break;
      current = this.nodes.get(current.parentId);
    }
    return false;
  }
}
```

### React UI Component

```tsx
interface FileDirectoryManagerProps {
  fs: FileSystem;
}

function FileDirectoryManager({ fs }: FileDirectoryManagerProps) {
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['root']));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const refresh = () => forceUpdate();

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = (type: 'file' | 'folder', parentId: string) => {
    const name = prompt(`New ${type} name:`);
    if (!name?.trim()) return;
    try {
      if (type === 'folder') fs.createFolder(name.trim(), parentId);
      else fs.createFile(name.trim(), parentId);
      setExpandedIds(prev => new Set([...prev, parentId]));
      refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleRename = (nodeId: string) => {
    const node = fs.getNode(nodeId);
    if (!node) return;
    setEditingId(nodeId);
    setEditingName(node.name);
  };

  const commitRename = (nodeId: string) => {
    try {
      fs.rename(nodeId, editingName.trim());
      setEditingId(null);
      refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleDelete = (nodeId: string) => {
    if (!confirm('Delete this item and all its contents?')) return;
    fs.delete(nodeId);
    if (selectedId === nodeId) setSelectedId(null);
    refresh();
  };

  const renderNode = (nodeId: string, depth: number = 0): React.ReactNode => {
    const node = fs.getNode(nodeId);
    if (!node) return null;

    const isExpanded = expandedIds.has(nodeId);
    const isSelected = selectedId === nodeId;
    const isEditing = editingId === nodeId;
    const children = node.type === 'folder' ? fs.getChildren(nodeId) : [];

    return (
      <div key={nodeId}>
        <div
          role="treeitem"
          aria-selected={isSelected}
          aria-expanded={node.type === 'folder' ? isExpanded : undefined}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          className={`tree-node ${isSelected ? 'selected' : ''}`}
          onClick={() => setSelectedId(nodeId)}
        >
          {node.type === 'folder' && (
            <button
              className="expand-toggle"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
              onClick={(e) => { e.stopPropagation(); toggleExpand(nodeId); }}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          <span className={`icon ${node.type}`}>
            {node.type === 'folder' ? '📁' : '📄'}
          </span>

          {isEditing ? (
            <input
              autoFocus
              value={editingName}
              onChange={e => setEditingName(e.target.value)}
              onBlur={() => commitRename(nodeId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename(nodeId);
                if (e.key === 'Escape') setEditingId(null);
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="node-name">{node.name}</span>
          )}

          {nodeId !== 'root' && (
            <div className="node-actions" onClick={e => e.stopPropagation()}>
              <button onClick={() => handleRename(nodeId)} aria-label="Rename">✏️</button>
              <button onClick={() => handleDelete(nodeId)} aria-label="Delete">🗑️</button>
            </div>
          )}

          {node.type === 'folder' && (
            <div className="create-actions" onClick={e => e.stopPropagation()}>
              <button onClick={() => handleCreate('folder', nodeId)} aria-label="New folder">📁+</button>
              <button onClick={() => handleCreate('file', nodeId)} aria-label="New file">📄+</button>
            </div>
          )}
        </div>

        {node.type === 'folder' && isExpanded && (
          <div role="group">
            {children
              .sort((a, b) => {
                // Folders before files, then alphabetical
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
              })
              .map(child => renderNode(child.id, depth + 1))
            }
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-directory-manager">
      <div className="toolbar">
        <h2>File Manager</h2>
        <button onClick={() => handleCreate('folder', selectedId ?? 'root')}>New Folder</button>
        <button onClick={() => handleCreate('file', selectedId ?? 'root')}>New File</button>
      </div>
      <div role="tree" aria-label="File system">
        {renderNode('root')}
      </div>
      {selectedId && (
        <div className="status-bar">
          Path: {fs.getPath(selectedId)}
        </div>
      )}
    </div>
  );
}
```

---

## 2. Key-Value Editor (Postman Params/Headers Panel)

**The prompt:** Build the headers/query params editor — a table where users can add/edit/remove key-value pairs, toggle them on/off, and bulk import from raw text.

```tsx
interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description: string;
}

function KeyValueEditor({
  pairs,
  onChange,
  placeholder = { key: 'Key', value: 'Value' },
}: {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  placeholder?: { key: string; value: string };
}) {
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const addRow = () => {
    onChange([...pairs, { id: crypto.randomUUID(), key: '', value: '', enabled: true, description: '' }]);
  };

  const updateRow = (id: string, field: keyof KeyValuePair, value: string | boolean) => {
    onChange(pairs.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const deleteRow = (id: string) => {
    onChange(pairs.filter(p => p.id !== id));
  };

  const parseBulkText = (text: string): KeyValuePair[] => {
    return text.split('\n')
      .filter(line => line.includes(':'))
      .map(line => {
        const colonIdx = line.indexOf(':');
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        return { id: crypto.randomUUID(), key, value, enabled: true, description: '' };
      });
  };

  const applyBulkEdit = () => {
    const parsed = parseBulkText(bulkText);
    onChange([...pairs, ...parsed]);
    setShowBulkEdit(false);
    setBulkText('');
  };

  return (
    <div className="key-value-editor">
      <div className="kv-header">
        <button onClick={() => setShowBulkEdit(!showBulkEdit)}>
          {showBulkEdit ? 'Close Bulk Edit' : 'Bulk Edit'}
        </button>
      </div>

      {showBulkEdit ? (
        <div className="bulk-edit">
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder="Authorization: Bearer token&#10;Content-Type: application/json"
            rows={8}
          />
          <button onClick={applyBulkEdit}>Apply</button>
        </div>
      ) : (
        <table className="kv-table" role="grid">
          <thead>
            <tr>
              <th scope="col" style={{ width: 24 }}><span className="sr-only">Enabled</span></th>
              <th scope="col">{placeholder.key}</th>
              <th scope="col">{placeholder.value}</th>
              <th scope="col">Description</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => (
              <tr key={pair.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={pair.enabled}
                    onChange={e => updateRow(pair.id, 'enabled', e.target.checked)}
                    aria-label={`Enable ${pair.key || 'row'}`}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={pair.key}
                    onChange={e => updateRow(pair.id, 'key', e.target.value)}
                    placeholder={placeholder.key}
                    aria-label="Key"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={pair.value}
                    onChange={e => updateRow(pair.id, 'value', e.target.value)}
                    placeholder={placeholder.value}
                    aria-label="Value"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={pair.description}
                    onChange={e => updateRow(pair.id, 'description', e.target.value)}
                    placeholder="Description (optional)"
                    aria-label="Description"
                  />
                </td>
                <td>
                  <button
                    onClick={() => deleteRow(pair.id)}
                    aria-label={`Delete ${pair.key || 'row'}`}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {/* Empty row for adding new entries */}
            <tr>
              <td colSpan={5}>
                <button onClick={addRow} className="add-row-btn">+ Add Row</button>
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
```

---

## 3. Environment Variable Selector

**The prompt:** Build a component that shows the current environment and allows switching between environments, with variable value preview.

```tsx
interface Environment {
  id: string;
  name: string;
  variables: Record<string, { current: string; initial: string; type: 'default' | 'secret' }>;
}

function EnvironmentSelector({
  environments,
  activeId,
  onSelect,
}: {
  environments: Environment[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const activeEnv = environments.find(e => e.id === activeId);

  const handleSelect = (id: string | null) => {
    onSelect(id);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="env-selector">
      <button
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen(o => !o)}
        className="env-trigger"
      >
        <span className="env-indicator" />
        {activeEnv?.name ?? 'No Environment'}
        <span aria-hidden>▾</span>
      </button>

      {isOpen && (
        <ul
          id={menuId}
          role="listbox"
          aria-label="Select environment"
          className="env-dropdown"
        >
          <li
            role="option"
            aria-selected={activeId === null}
            onClick={() => handleSelect(null)}
          >
            No Environment
          </li>
          {environments.map(env => (
            <li
              key={env.id}
              role="option"
              aria-selected={env.id === activeId}
              onClick={() => handleSelect(env.id)}
            >
              {env.name}
            </li>
          ))}
        </ul>
      )}

      {activeEnv && (
        <button
          className="env-preview-btn"
          onClick={() => setShowPreview(true)}
          aria-label={`Preview ${activeEnv.name} variables`}
        >
          👁
        </button>
      )}

      {showPreview && activeEnv && (
        <EnvVariablesPreview
          environment={activeEnv}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function EnvVariablesPreview({ environment, onClose }: { environment: Environment; onClose: () => void }) {
  const variables = Object.entries(environment.variables);

  return (
    <div role="dialog" aria-modal aria-label={`${environment.name} Variables`} className="env-preview">
      <div className="env-preview-header">
        <h2>{environment.name}</h2>
        <button onClick={onClose} aria-label="Close">✕</button>
      </div>
      <table>
        <thead>
          <tr><th>Variable</th><th>Current Value</th><th>Initial Value</th></tr>
        </thead>
        <tbody>
          {variables.map(([key, val]) => (
            <tr key={key}>
              <td><code>{'{{' + key + '}}'}</code></td>
              <td>{val.type === 'secret' ? '••••••••' : val.current || <em>(empty)</em>}</td>
              <td>{val.type === 'secret' ? '••••••••' : val.initial || <em>(empty)</em>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## LLD Verbal Framework (speak while coding)

> "Let me start by identifying the core data structures. For a file directory manager, I need to represent a tree. I'll use a flat map of nodes keyed by ID — this gives O(1) lookup vs walking the tree.
>
> The node has: id, name, type (file/folder), parentId (for walking up to get path), and children array (for folders, to walk down).
>
> Key operations I need: create, delete (recursive for folders), rename, move, getPath. Let me start with the class skeleton, then flesh out the methods one by one. I'll flag the tricky ones — move needs to check for cycles (can't move a folder into its own descendant).
>
> For the React UI: I'll represent open/collapsed folders with a Set of IDs. I'll render recursively. I'll need to handle editing in-place (double-click to rename).
>
> Time: I'll implement the core data model first (10 min), then the React component (20 min), then edge cases (5 min)."
