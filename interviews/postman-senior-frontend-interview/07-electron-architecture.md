# Electron Architecture & Offline-First — Postman

> Postman's desktop app runs on Electron. Understanding the main/renderer split, IPC, and IndexedDB offline storage is essential for this role. Expect architecture questions and "how would you solve X in Electron" problems.

---

## 1. Electron Architecture Fundamentals

### Main vs Renderer Process

**Q: Explain Electron's process architecture.**

**Verbal answer:**
> "Electron runs two types of processes. The main process is a Node.js process — it has access to the full Node.js API, can read files, access the network at the OS level, and manages application lifecycle (menus, windows, tray). There's exactly one main process.
>
> Renderer processes are Chromium browser windows — each `BrowserWindow` is a separate renderer process with its own JavaScript context, DOM, and memory. They run browser JavaScript (no direct Node.js access by default). Postman has one renderer for the main app window and potentially others for background workers.
>
> They communicate via IPC — Inter-Process Communication. This is important because renderer processes are sandboxed; if a renderer is compromised by a malicious website, it can't directly access the filesystem or native OS APIs."

```
┌─────────────────────────────────────────────────────────────────┐
│  Main Process (Node.js)                                          │
│  - app lifecycle, menus, protocol handlers                      │
│  - file system, native dialogs, system notifications            │
│  - postman-runtime (executes actual API requests via Node.js)   │
│  - manages BrowserWindows                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ IPC
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐  ┌───────────────┐  ┌──────────────────┐
│ Renderer        │  │ Renderer      │  │ Renderer         │
│ (Main Window)   │  │ (Proxy Tab)   │  │ (Background)     │
│ React + Redux   │  │ Hidden window │  │ Worker tasks     │
│ MobX stores     │  │ for intercept │  │                  │
└─────────────────┘  └───────────────┘  └──────────────────┘
```

---

### IPC Communication Patterns

```javascript
// preload.js — bridge between renderer and main (contextBridge)
// runs in renderer context but has access to specific Node APIs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('postmanBridge', {
  // Request execution — renderer asks main to execute (Node.js has better network access)
  executeRequest: (requestConfig) => ipcRenderer.invoke('request:execute', requestConfig),

  // File operations — only main can access filesystem
  readFile: (filePath) => ipcRenderer.invoke('fs:read', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:write', filePath, content),
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),

  // Receive events from main
  onRequestProgress: (callback) => {
    ipcRenderer.on('request:progress', (event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('request:progress');
  },
});

// main.js — handle IPC calls from renderer
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const postmanRuntime = require('postman-runtime');

ipcMain.handle('request:execute', async (event, requestConfig) => {
  return new Promise((resolve, reject) => {
    const runner = new postmanRuntime.Runner();
    runner.run(requestConfig, {
      iterationCount: 1,
    }, (err, run) => {
      if (err) return reject(err);
      run.start({
        request: (err, cursor, response, request) => {
          // Send progress events back to renderer
          event.sender.send('request:progress', {
            status: response.code,
            statusText: response.status,
          });
        },
        done: (err, summary) => {
          if (err) return reject(err);
          resolve(summary);
        },
      });
    });
  });
});

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

// renderer.js — usage
async function sendRequest(requestConfig) {
  try {
    const result = await window.postmanBridge.executeRequest(requestConfig);
    setResponse(result);
  } catch (err) {
    setError(err.message);
  }
}
```

---

### React Hook for IPC

```typescript
// Custom hook to invoke IPC and track state
function useIpcRequest<TResult, TArgs = void>(channel: string) {
  const [state, dispatch] = useReducer(
    (state: { data: TResult | null; loading: boolean; error: string | null }, action: any) => {
      switch (action.type) {
        case 'LOADING': return { ...state, loading: true, error: null };
        case 'SUCCESS': return { data: action.payload, loading: false, error: null };
        case 'ERROR': return { ...state, loading: false, error: action.error };
        default: return state;
      }
    },
    { data: null, loading: false, error: null }
  );

  const invoke = useCallback(async (args: TArgs) => {
    dispatch({ type: 'LOADING' });
    try {
      const result = await (window as any).postmanBridge[channel](args);
      dispatch({ type: 'SUCCESS', payload: result });
      return result;
    } catch (err) {
      dispatch({ type: 'ERROR', error: (err as Error).message });
      throw err;
    }
  }, [channel]);

  return { ...state, invoke };
}

// Usage
function RequestRunner() {
  const { data: response, loading, error, invoke } = useIpcRequest<Response>('executeRequest');

  const handleRun = async () => {
    await invoke(buildRequestConfig());
  };

  return (
    <div>
      <button onClick={handleRun} disabled={loading}>
        {loading ? 'Running...' : 'Send'}
      </button>
      {response && <ResponseViewer response={response} />}
      {error && <ErrorDisplay message={error} />}
    </div>
  );
}
```

---

## 2. IndexedDB for Offline Storage

**Q: How does Postman use IndexedDB?**

```typescript
// Dexie.js — IndexedDB wrapper with cleaner API
import Dexie, { Table } from 'dexie';

interface Collection {
  id: string;
  name: string;
  workspaceId: string;
  requests: string[]; // request IDs
  updatedAt: number;
  syncedAt: number | null; // null = not yet synced
}

interface Request {
  id: string;
  collectionId: string;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  updatedAt: number;
}

interface Environment {
  id: string;
  name: string;
  variables: Record<string, string>;
  workspaceId: string;
}

interface RequestHistory {
  id: string;
  requestId: string;
  method: string;
  url: string;
  responseStatus: number;
  responseTime: number;
  executedAt: number;
}

class PostmanDatabase extends Dexie {
  collections!: Table<Collection, string>;
  requests!: Table<Request, string>;
  environments!: Table<Environment, string>;
  history!: Table<RequestHistory, string>;
  outbox!: Table<OutboxEntry, string>; // pending sync queue

  constructor() {
    super('PostmanDB');

    this.version(1).stores({
      collections: 'id, workspaceId, updatedAt, syncedAt',
      requests: 'id, collectionId, updatedAt',
      environments: 'id, workspaceId',
      history: 'id, requestId, executedAt',
      outbox: 'id, entityType, createdAt',
    });
  }
}

const db = new PostmanDatabase();

// Usage patterns
async function getCollectionWithRequests(collectionId: string) {
  const [collection, requests] = await Promise.all([
    db.collections.get(collectionId),
    db.requests.where('collectionId').equals(collectionId).toArray(),
  ]);
  return { ...collection, requests };
}

async function searchRequests(query: string) {
  // IndexedDB doesn't have full-text search — do client-side filtering
  const all = await db.requests.toArray();
  const lower = query.toLowerCase();
  return all.filter(r =>
    r.name.toLowerCase().includes(lower) ||
    r.url.toLowerCase().includes(lower)
  );
}

// Transaction — atomic update (rename collection + update timestamp)
async function renameCollection(id: string, newName: string) {
  await db.transaction('rw', db.collections, db.outbox, async () => {
    await db.collections.update(id, { name: newName, updatedAt: Date.now(), syncedAt: null });
    await db.outbox.add({
      id: crypto.randomUUID(),
      entityType: 'collection',
      entityId: id,
      operation: 'update',
      payload: { name: newName },
      createdAt: Date.now(),
      retries: 0,
    });
  });
  // Both writes succeed or both fail — no partial state
}
```

---

## 3. Performance in Electron

### Avoiding Main/Renderer Bottlenecks

```javascript
// DON'T: send large response bodies over IPC — causes serialization overhead
ipcMain.handle('request:execute', async (event, config) => {
  const response = await executeRequest(config);
  return response; // ← if response.body is 50MB, this is slow
});

// DO: store large data in a shared temp file, send path
ipcMain.handle('request:execute', async (event, config) => {
  const response = await executeRequest(config);
  const tempPath = path.join(app.getPath('temp'), `response_${Date.now()}.bin`);
  await fs.writeFile(tempPath, response.body);
  return {
    ...response,
    bodyPath: tempPath, // renderer reads body from file as needed
    body: undefined,
  };
});

// Or use SharedArrayBuffer for binary data
```

### Memory Management for Long-Running Apps

```javascript
// Postman runs for hours — manage memory carefully

// Clear request history beyond threshold
async function pruneHistory(maxEntries = 500) {
  const count = await db.history.count();
  if (count > maxEntries) {
    const oldest = await db.history
      .orderBy('executedAt')
      .limit(count - maxEntries)
      .primaryKeys();
    await db.history.bulkDelete(oldest);
  }
}

// Remove stale BrowserWindows
function cleanupDetachedWindows() {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(win => {
    if (win.isDestroyed()) return;
    if (win.webContents.getURL() === '') {
      win.close(); // close empty/orphaned windows
    }
  });
}
```

---

## 4. Security in Electron

**Q: What security concerns are unique to Electron?**

**Verbal answer:**
> "Electron apps have a larger attack surface than pure web apps because compromising the renderer gives access to Node.js APIs that can read the filesystem, execute processes, and access sensitive OS resources. The key security practices:
>
> 1. Enable context isolation — the renderer's JavaScript runs in a separate context from the preload script. You can't access Node APIs from window unless explicitly exposed via `contextBridge`.
>
> 2. Disable `nodeIntegration` — the renderer should NOT have direct access to `require('fs')` or other Node modules. Only expose what's needed via the bridge.
>
> 3. Validate all IPC inputs — treat IPC like an HTTP endpoint. The renderer could be compromised; don't trust its input blindly.
>
> 4. Content Security Policy — prevent XSS attacks in the renderer from escalating to Node access."

```javascript
// Secure BrowserWindow configuration
const win = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,          // ❌ no direct node access in renderer
    contextIsolation: true,          // ✅ separate JS contexts
    sandbox: true,                   // ✅ OS-level sandbox
    preload: path.join(__dirname, 'preload.js'), // explicit bridge
    webSecurity: true,               // ✅ same-origin policy
    allowRunningInsecureContent: false,
  },
});

// CSP header for the renderer
win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; script-src 'self'; connect-src https: wss: http://localhost:*"
      ],
    },
  });
});

// Validate IPC input
ipcMain.handle('fs:read', async (event, filePath) => {
  // Only allow reading from specific directories
  const allowedPaths = [
    app.getPath('userData'),
    app.getPath('documents'),
  ];

  const resolved = path.resolve(filePath);
  const isAllowed = allowedPaths.some(allowed => resolved.startsWith(allowed));

  if (!isAllowed) {
    throw new Error('Access denied: file path not in allowed directories');
  }

  return fs.readFile(resolved, 'utf-8');
});
```

---

## 5. Auto-Update Pattern (Postman ships updates frequently)

```javascript
// main.js — using electron-updater
const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = false; // don't download without asking

autoUpdater.on('update-available', (info) => {
  // Notify renderer
  BrowserWindow.getAllWindows()[0]?.webContents.send('update:available', {
    version: info.version,
    releaseNotes: info.releaseNotes,
  });
});

autoUpdater.on('download-progress', (progress) => {
  BrowserWindow.getAllWindows()[0]?.webContents.send('update:progress', {
    percent: progress.percent,
  });
});

autoUpdater.on('update-downloaded', () => {
  BrowserWindow.getAllWindows()[0]?.webContents.send('update:ready');
});

// Renderer — show update banner
ipcRenderer.on('update:available', (event, { version, releaseNotes }) => {
  showUpdateBanner({ version, releaseNotes });
});

ipcRenderer.on('update:ready', () => {
  showRestartPrompt();
});

function installUpdate() {
  ipcRenderer.invoke('update:install');
}

// main.js
ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall();
});
```

---

## Quick-Fire Electron Questions

| Question | Answer |
|----------|--------|
| How does a renderer access the clipboard? | Via `contextBridge` exposing `clipboard.writeText/readText` from the main process |
| How do you open a native file dialog? | `dialog.showOpenDialog()` in main, called via IPC from renderer |
| What is a WebContents? | Represents the contents of a BrowserWindow — provides `executeJavaScript`, event listeners, etc. |
| How to prevent window close? | `win.on('close', (e) => { e.preventDefault(); showSavePrompt(); })` |
| SharedArrayBuffer in Electron? | Needs COOP/COEP headers: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp` |
| How to detect if running in Electron? | `process.versions['electron']` in Node context. In renderer: expose via bridge. |
