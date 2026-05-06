# Frontend System Design — Adobe

> Adobe Round 3. Confirmed questions: Design a file system UI, rich text editor, asset manager, real-time collaboration. Use the RADIO framework. Lead the conversation.

---

## 1. Design a File System UI (Confirmed at Adobe)

**The prompt:** Design a file manager UI — browse folders, upload, preview files, search.

---

### R — Requirements

**Functional:**
- Browse folder hierarchy (tree + list views)
- Upload files (drag-drop + file picker)
- Preview: images, PDFs, videos
- Search: by name, file type, date
- Actions: rename, move, copy, delete, share
- Multi-select + bulk operations

**Non-functional:**
- Handle millions of files per user
- Preview loading < 1 second for images
- WCAG 2.1 AA accessibility
- Works offline for cached content

---

### A — Architecture

```
┌──────────────────────────────────────────────────┐
│                   Browser                         │
│  ┌────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │ File Tree  │  │  File Grid  │  │ Preview   │  │
│  │ (sidebar)  │  │  / List     │  │  Panel    │  │
│  └─────┬──────┘  └──────┬──────┘  └─────┬─────┘  │
│        │                │               │         │
│  ┌─────▼────────────────▼───────────────▼──────┐  │
│  │   React Query (server state) +               │  │
│  │   Zustand (selected items, view mode, path) │  │
│  └──────────────────────┬───────────────────────┘  │
│                         │ REST / GraphQL             │
└─────────────────────────┼────────────────────────── ┘
                          ▼
                   File Storage API
                   (S3, Azure Blob, or Adobe CC storage)
```

### D — Data Model

```typescript
interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;       // 'image/jpeg', 'application/pdf', etc.
  size?: number;           // bytes, null for folders
  modifiedAt: string;
  createdAt: string;
  parentId: string | null; // null for root
  thumbnailUrl?: string;
  downloadUrl?: string;
  isShared?: boolean;
  permissions: ('read' | 'write' | 'delete')[];
}

interface FileListResponse {
  items: FileNode[];
  totalCount: number;
  nextCursor: string | null;
}
```

### I — Interface

```tsx
function FileManager() {
  const [currentPath, setCurrentPath] = useState<string[]>([]); // breadcrumb path
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'list'>('fileViewMode', 'grid');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const { data, isLoading } = useQuery({
    queryKey: ['files', currentPath, sortConfig],
    queryFn: () => fetchFiles(currentPath, sortConfig),
  });

  // Multi-select with shift-click range selection
  const handleItemSelect = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey && selectedIds.size > 0) {
      const items = data?.items ?? [];
      const lastSelected = [...selectedIds][selectedIds.size - 1];
      const lastIdx = items.findIndex(i => i.id === lastSelected);
      const currIdx = items.findIndex(i => i.id === id);
      const [start, end] = [Math.min(lastIdx, currIdx), Math.max(lastIdx, currIdx)];
      setSelectedIds(new Set(items.slice(start, end + 1).map(i => i.id)));
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    } else {
      setSelectedIds(new Set([id]));
    }
  };

  return (
    <div className="file-manager">
      <FileManagerToolbar
        selectedCount={selectedIds.size}
        viewMode={viewMode}
        onViewChange={setViewMode}
        onUpload={() => {/* open file picker */}}
        onBulkDelete={() => {/* confirm + delete */}}
      />
      <Breadcrumb path={currentPath} onNavigate={setCurrentPath} />
      <div className="file-manager__content">
        <FolderTree onNavigate={setCurrentPath} activePath={currentPath} />
        {viewMode === 'grid'
          ? <FileGrid items={data?.items ?? []} selectedIds={selectedIds} onSelect={handleItemSelect} isLoading={isLoading} />
          : <FileList items={data?.items ?? []} selectedIds={selectedIds} onSelect={handleItemSelect} sortConfig={sortConfig} onSort={setSortConfig} isLoading={isLoading} />
        }
        <FilePreviewPanel selectedIds={selectedIds} items={data?.items ?? []} />
      </div>
    </div>
  );
}
```

### O — Optimizations

| Problem | Solution |
|---------|---------|
| Millions of files | Cursor-based pagination, virtual scroll |
| Slow image previews | Lazy loading with IntersectionObserver, WebP thumbnails from CDN |
| Re-fetch on every folder change | React Query caches each folder's result for 60s |
| Drag-drop on mobile | Touch events + pointer events polyfill |
| Search latency | Debounce 300ms, client-side filter on cached data, server search fallback |

---

## 2. Design a Rich Text Editor (Adobe Relevant)

**The prompt:** Design a rich text editor — bold, italic, links, images, undo/redo, collaboration.

---

### Key Architecture Decision: Build vs Library

**Build from scratch:** Full control — required if you need custom block types, real-time collaboration, or AI-assisted writing (like Adobe GenStudio).

**Use Tiptap/ProseMirror:** Open-source, battle-tested, collaborative-ready. 80% of the functionality free.

**Use Draft.js or Quill:** Older but widely used. Less maintained.

**Recommendation for Adobe interview:** "I'd build on top of ProseMirror/Tiptap — they expose the full editor state as an immutable document model which I can extend with custom nodes and marks. Building the core editor primitives from scratch would take months; the value is in the product features on top."

---

### Document Model

```typescript
// ProseMirror-inspired document structure (simplified)
interface EditorNode {
  type: 'doc' | 'paragraph' | 'heading' | 'image' | 'codeBlock' | 'bulletList' | 'listItem';
  attrs?: Record<string, unknown>;
  content?: EditorNode[];
  marks?: Mark[];
  text?: string;
}

interface Mark {
  type: 'bold' | 'italic' | 'underline' | 'link' | 'highlight';
  attrs?: { href?: string; color?: string };
}

// Example document:
const doc: EditorNode = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'My Document' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'This is ' },
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' text.' },
      ],
    },
  ],
};
```

### Undo/Redo — Command Pattern

```typescript
interface Command {
  execute(): void;
  undo(): void;
}

class EditorHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private readonly MAX_HISTORY = 100;

  execute(command: Command) {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // clear redo on new action
    if (this.undoStack.length > this.MAX_HISTORY) {
      this.undoStack.shift(); // drop oldest
    }
  }

  undo() {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
    }
  }

  redo() {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
    }
  }

  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }
}

// Example command
class InsertTextCommand implements Command {
  constructor(
    private editor: Editor,
    private position: number,
    private text: string
  ) {}

  execute() { this.editor.insertAt(this.position, this.text); }
  undo() { this.editor.deleteAt(this.position, this.text.length); }
}
```

### Real-Time Collaboration (if asked)

```
Two approaches:

1. Operational Transformation (OT) — Google Docs approach
   - Server serializes operations and transforms concurrent edits
   - Mature, battle-tested, but complex to implement
   - Libraries: ShareDB, OT.js

2. CRDT (Conflict-free Replicated Data Types) — Figma/Notion approach
   - Peers can merge operations without coordination
   - No central server needed for conflict resolution
   - Libraries: Yjs (most popular for collaborative editors)

For the interview:
"I'd use Yjs with a WebSocket provider. Yjs uses a CRDT called YATA
which handles concurrent edits without conflicts. It integrates directly
with Tiptap/ProseMirror, so the collaboration layer drops in cleanly
without rewriting the editor."
```

---

## 3. Design an Asset Manager (Adobe Stock / Creative Cloud)

**The prompt:** Design a UI for browsing, searching, and managing millions of creative assets.

---

### Key Challenges
1. **Scale:** Millions of assets; search must be fast and relevant
2. **Previews:** Images, videos, fonts all preview differently
3. **Filtering:** Type, color, orientation, license, date, AI-generated
4. **Performance:** Thumbnails load fast; full asset loads on demand

### Search Architecture

```
User types query
  ↓ debounce 300ms
Client → Search API (Elasticsearch / Algolia)
  ↓
Results with:
  - Ranked by relevance + personalization
  - Facets for filters (type, color, license)
  - Pagination cursor
  ↓
React Query caches by (query + filters + cursor)
  ↓
Virtualized grid renders only visible thumbnails
  ↓
IntersectionObserver triggers loadMore
```

### Color-Based Search (Adobe-specific)

```tsx
// Color filter — generate dominant colors from image and allow filtering by color
function ColorFilterPicker({ onChange }: { onChange: (color: string) => void }) {
  const swatches = [
    { label: 'Red', value: '#FF0000' },
    { label: 'Blue', value: '#0000FF' },
    // ...
  ];

  return (
    <fieldset>
      <legend>Filter by color</legend>
      {swatches.map(swatch => (
        <button
          key={swatch.value}
          style={{ backgroundColor: swatch.value }}
          aria-label={`Filter by ${swatch.label}`}
          onClick={() => onChange(swatch.value)}
        />
      ))}
    </fieldset>
  );
}
```

---

## 4. Design a Collaborative Whiteboard (Figma-style)

**The prompt:** Design a collaborative, real-time whiteboard where multiple users can draw, add shapes, and move objects simultaneously.

### Core Challenges

```
1. Real-time sync (CRDT / OT)
2. Canvas rendering (SVG vs Canvas vs WebGL)
3. Selection and manipulation of objects
4. Cursor presence for other users
5. Viewport synchronization (panning, zooming)
6. Offline support
```

### Rendering Strategy Decision

| | SVG | Canvas 2D | WebGL |
|--|-----|-----------|-------|
| Objects | DOM elements | Pixel buffer | GPU geometry |
| Accessibility | Native | Manual | None |
| Performance | ~1000 objects | ~10,000 objects | 100,000+ objects |
| Adobe's choice | Simple UI | Medium complexity | Creative Cloud |

```tsx
// Canvas 2D approach for interview
class Whiteboard {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private objects: WhiteboardObject[] = [];
  private selectedId: string | null = null;
  private viewport = { x: 0, y: 0, zoom: 1 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.setupEvents();
  }

  addObject(obj: WhiteboardObject) {
    this.objects.push(obj);
    this.render();
    // Broadcast via WebSocket (CRDT merge)
    this.sync({ type: 'ADD_OBJECT', obj });
  }

  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(this.viewport.x, this.viewport.y);
    ctx.scale(this.viewport.zoom, this.viewport.zoom);

    for (const obj of this.objects) {
      this.drawObject(obj);
    }

    ctx.restore();
  }

  // Hit testing for object selection
  getObjectAtPoint(x: number, y: number): WhiteboardObject | null {
    // Check in reverse (top object first)
    for (let i = this.objects.length - 1; i >= 0; i--) {
      if (this.isPointInObject(x, y, this.objects[i])) {
        return this.objects[i];
      }
    }
    return null;
  }
}
```

---

## RADIO Cheat Sheet for Adobe

```
R — Requirements (3–5 min)
  "Before designing, let me understand the scope..."
  - Scale (users, data volume, concurrent editors?)
  - Real-time needs? (collaboration, notifications?)
  - Offline support? (Creative Cloud works offline)
  - Accessibility? (Adobe is a11y-first)
  - Mobile? (tablet? stylus input?)

A — Architecture
  - Rendering: DOM/SVG vs Canvas (performance threshold ~1000 elements)
  - State: React Query (server) + Zustand (local UI state)
  - Real-time: WebSocket + Yjs (CRDT) for collaboration
  - Build: Next.js for SSR perf, or Vite SPA for tool-like apps

D — Data model
  - Entity shapes, relationships, cursor/pagination strategy
  - CRDT document model (for collaboration)

I — Interface
  - Component hierarchy, key interactions, loading/error/empty states
  - Accessibility: keyboard, ARIA, focus management

O — Optimizations
  - Virtual rendering (react-window / canvas)
  - Lazy loading, code splitting
  - CDN for assets (Adobe uses CloudFront)
  - Optimistic updates for real-time feel
```
