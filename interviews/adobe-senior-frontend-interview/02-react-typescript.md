# React + TypeScript — Adobe Interview Deep Dive

> Adobe Round 2: skeleton files provided in React + TypeScript. Focus on controlled components, custom hooks, and TypeScript patterns. Interviewers confirmed: "using controlled components instead of forms saves you a lot of time."

---

## 1. Controlled vs Uncontrolled Components

**Q: What is the difference? When do you use each?**

**Verbal answer:**
> "Controlled components keep form state in React — every keystroke updates state, every render reflects that state. The form is the single source of truth. Uncontrolled components use DOM refs to read values only when needed (on submit). Adobe's interviewer tip: use controlled — it's easier to test, validate, and integrate with React state patterns."

```tsx
// === CONTROLLED — React owns the state ===
function ControlledForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'viewer',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    // Validate on change
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: validate(field, value) || '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    Object.entries(formData).forEach(([field, value]) => {
      const error = validate(field, value);
      if (error) newErrors[field] = error;
    });
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          value={formData.name}
          onChange={handleChange('name')}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <span id="name-error" role="alert">{errors.name}</span>
        )}
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}

// === UNCONTROLLED — DOM owns the state ===
function UncontrolledForm() {
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: nameRef.current?.value ?? '',
      email: emailRef.current?.value ?? '',
    };
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={nameRef} defaultValue="" />
      <input ref={emailRef} defaultValue="" />
      <button type="submit">Submit</button>
    </form>
  );
}

// When to use uncontrolled: file inputs (<input type="file">), integrating with
// non-React libraries, or when you genuinely don't need intermediate state
```

---

## 2. Hooks — Deep Internals & Custom Patterns

### useReducer — complex state machine

```tsx
// Asset upload state machine — real Adobe use case
type UploadStatus = 'idle' | 'selecting' | 'uploading' | 'processing' | 'success' | 'error';

interface UploadState {
  status: UploadStatus;
  files: File[];
  progress: number;
  error: string | null;
  uploadedUrls: string[];
}

type UploadAction =
  | { type: 'SELECT_FILES'; files: File[] }
  | { type: 'START_UPLOAD' }
  | { type: 'SET_PROGRESS'; progress: number }
  | { type: 'UPLOAD_SUCCESS'; urls: string[] }
  | { type: 'UPLOAD_ERROR'; error: string }
  | { type: 'RESET' };

const initialState: UploadState = {
  status: 'idle',
  files: [],
  progress: 0,
  error: null,
  uploadedUrls: [],
};

function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case 'SELECT_FILES':
      return { ...state, status: 'selecting', files: action.files, error: null };
    case 'START_UPLOAD':
      return { ...state, status: 'uploading', progress: 0 };
    case 'SET_PROGRESS':
      return { ...state, progress: action.progress };
    case 'UPLOAD_SUCCESS':
      return { ...state, status: 'success', uploadedUrls: action.urls, progress: 100 };
    case 'UPLOAD_ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

function AssetUploader() {
  const [state, dispatch] = useReducer(uploadReducer, initialState);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    dispatch({ type: 'SELECT_FILES', files });
  };

  const handleUpload = async () => {
    dispatch({ type: 'START_UPLOAD' });
    try {
      const urls = await uploadFiles(state.files, (progress) => {
        dispatch({ type: 'SET_PROGRESS', progress });
      });
      dispatch({ type: 'UPLOAD_SUCCESS', urls });
    } catch (err) {
      dispatch({ type: 'UPLOAD_ERROR', error: (err as Error).message });
    }
  };

  // State-driven rendering — exhaustive switch on status
  const renderContent = () => {
    switch (state.status) {
      case 'idle': return <FileDropzone onSelect={handleFileSelect} />;
      case 'selecting': return <FilePreview files={state.files} onUpload={handleUpload} />;
      case 'uploading': return <ProgressBar value={state.progress} />;
      case 'success': return <SuccessView urls={state.uploadedUrls} onReset={() => dispatch({ type: 'RESET' })} />;
      case 'error': return <ErrorView message={state.error!} onRetry={handleUpload} />;
    }
  };

  return <div className="uploader">{renderContent()}</div>;
}
```

---

### useContext — avoid prop drilling with split contexts

```tsx
// Split contexts by update frequency — avoids unnecessary re-renders
interface User { id: string; name: string; role: 'admin' | 'editor' | 'viewer'; }
interface Theme { mode: 'light' | 'dark'; primaryColor: string; }

const UserContext = createContext<User | null>(null);
const ThemeContext = createContext<Theme>({ mode: 'light', primaryColor: '#1473e6' });
const ThemeUpdateContext = createContext<(t: Partial<Theme>) => void>(() => {});

function AppProvider({ children }: { children: React.ReactNode }) {
  const [user] = useState<User>({ id: '1', name: 'Veerendra', role: 'admin' });
  const [theme, setTheme] = useState<Theme>({ mode: 'light', primaryColor: '#1473e6' });

  const updateTheme = useCallback((partial: Partial<Theme>) => {
    setTheme(prev => ({ ...prev, ...partial }));
  }, []);

  return (
    <UserContext.Provider value={user}>
      <ThemeContext.Provider value={theme}>
        <ThemeUpdateContext.Provider value={updateTheme}>
          {children}
        </ThemeUpdateContext.Provider>
      </ThemeContext.Provider>
    </UserContext.Provider>
  );
}

// Typed hooks — no null checks needed at call site
function useUser(): User {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within AppProvider');
  return ctx;
}

function useTheme() {
  return useContext(ThemeContext);
}
```

---

## 3. Performance Optimization

**Q: How do you find and fix performance issues in a React component?**

```tsx
// === Problem: parent re-render causes children to re-render unnecessarily ===

// BEFORE — every parent render causes ALL items to re-render
function AssetGrid({ assets, onSelect }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = assets.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      {filtered.map(asset => (
        <AssetCard key={asset.id} asset={asset} onSelect={onSelect} />
      ))}
    </>
  );
}

// AFTER — optimized
function AssetGridOptimized({ assets, onSelect }) {
  const [searchQuery, setSearchQuery] = useState('');

  // 1. useMemo: only recompute when assets or query change
  const filtered = useMemo(() =>
    assets.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [assets, searchQuery]
  );

  // 2. useCallback: stable reference so AssetCard.memo comparison works
  const handleSelect = useCallback((id: string) => {
    onSelect(id);
  }, [onSelect]);

  return (
    <>
      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      {filtered.map(asset => (
        <AssetCard key={asset.id} asset={asset} onSelect={handleSelect} />
      ))}
    </>
  );
}

// 3. React.memo: skip re-render if props haven't changed (shallow comparison)
const AssetCard = React.memo(
  ({ asset, onSelect }: { asset: Asset; onSelect: (id: string) => void }) => {
    return (
      <div onClick={() => onSelect(asset.id)} className="asset-card">
        <img src={asset.thumbnailUrl} alt={asset.name} loading="lazy" />
        <span>{asset.name}</span>
      </div>
    );
  }
);

// 4. useTransition for search (non-urgent update)
function AssetGridWithTransition({ assets, onSelect }) {
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);           // urgent: update input immediately
    startTransition(() => {
      setSearchQuery(e.target.value);        // non-urgent: filter large list
    });
  };

  const filtered = useMemo(() =>
    assets.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [assets, searchQuery]
  );

  return (
    <>
      <input value={inputValue} onChange={handleInput} />
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        {filtered.map(asset => <AssetCard key={asset.id} asset={asset} onSelect={onSelect} />)}
      </div>
    </>
  );
}
```

---

## 4. TypeScript Patterns — Adobe Specific

```tsx
// === 1. Discriminated union for component variants ===
type ButtonProps =
  | { variant: 'primary'; onClick: () => void; children: React.ReactNode }
  | { variant: 'link'; href: string; children: React.ReactNode }
  | { variant: 'icon'; icon: React.ReactNode; ariaLabel: string };

function Button(props: ButtonProps) {
  if (props.variant === 'primary') {
    return <button onClick={props.onClick}>{props.children}</button>;
  }
  if (props.variant === 'link') {
    return <a href={props.href}>{props.children}</a>;
  }
  // variant === 'icon'
  return <button aria-label={props.ariaLabel}>{props.icon}</button>;
}

// === 2. Generic data table ===
interface Column<T> {
  key: keyof T;
  header: string;
  width?: number;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
}

function DataTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  isLoading,
}: DataTableProps<T>) {
  if (isLoading) return <TableSkeleton columns={columns.length} rows={5} />;

  return (
    <table role="grid">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={String(col.key)} style={{ width: col.width }}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr
            key={row.id}
            onClick={() => onRowClick?.(row)}
            style={{ cursor: onRowClick ? 'pointer' : undefined }}
          >
            {columns.map(col => (
              <td key={String(col.key)}>
                {col.render ? col.render(row[col.key], row) : String(row[col.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Usage
<DataTable
  data={assets}
  columns={[
    { key: 'name', header: 'Name', sortable: true },
    { key: 'size', header: 'Size', render: (v) => formatBytes(v as number) },
    { key: 'createdAt', header: 'Created', render: (v) => formatDate(v as string) },
  ]}
  onRowClick={(asset) => openAsset(asset.id)}
/>

// === 3. Utility types used frequently ===
// Partial: all props optional
type AssetUpdate = Partial<Asset>;

// Required: all props required
type CompleteConfig = Required<Partial<Config>>;

// Pick / Omit
type AssetPreview = Pick<Asset, 'id' | 'name' | 'thumbnailUrl'>;
type AssetWithoutId = Omit<Asset, 'id'>;

// Record
type StatusMap = Record<AssetStatus, { label: string; color: string }>;

// ReturnType
type FetchResult = ReturnType<typeof fetchAssets>;

// Parameters
type FetchParams = Parameters<typeof fetchAssets>[0];

// === 4. Type guards ===
function isErrorResponse(response: SuccessResponse | ErrorResponse): response is ErrorResponse {
  return 'error' in response && typeof response.error === 'string';
}

const result = await apiCall();
if (isErrorResponse(result)) {
  toast.error(result.error); // TypeScript knows result.error is string here
} else {
  processSuccess(result.data); // TypeScript knows result.data is available
}
```

---

## 5. Custom Hooks — Adobe Context

```tsx
// === useAssetUpload — manages file upload lifecycle ===
interface UseAssetUploadOptions {
  maxFileSizeMB?: number;
  allowedTypes?: string[];
  onSuccess?: (urls: string[]) => void;
}

function useAssetUpload({ maxFileSizeMB = 50, allowedTypes, onSuccess }: UseAssetUploadOptions = {}) {
  const [state, dispatch] = useReducer(uploadReducer, initialState);

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      return `File too large. Max ${maxFileSizeMB}MB.`;
    }
    if (allowedTypes && !allowedTypes.includes(file.type)) {
      return `File type ${file.type} not allowed.`;
    }
    return null;
  }, [maxFileSizeMB, allowedTypes]);

  const selectFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const errors = fileArray.map(validateFile).filter(Boolean);
    if (errors.length) {
      dispatch({ type: 'UPLOAD_ERROR', error: errors[0]! });
      return;
    }
    dispatch({ type: 'SELECT_FILES', files: fileArray });
  }, [validateFile]);

  const upload = useCallback(async () => {
    if (!state.files.length) return;
    dispatch({ type: 'START_UPLOAD' });
    try {
      const urls = await uploadToAdobeStorage(state.files, progress => {
        dispatch({ type: 'SET_PROGRESS', progress });
      });
      dispatch({ type: 'UPLOAD_SUCCESS', urls });
      onSuccess?.(urls);
    } catch (err) {
      dispatch({ type: 'UPLOAD_ERROR', error: (err as Error).message });
    }
  }, [state.files, onSuccess]);

  return {
    ...state,
    selectFiles,
    upload,
    reset: () => dispatch({ type: 'RESET' }),
    isIdle: state.status === 'idle',
    isUploading: state.status === 'uploading',
  };
}

// === useLocalStorage — persist state across sessions ===
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (err) {
      console.error(`Failed to save ${key} to localStorage`, err);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}

// === useIntersectionObserver — lazy loading, infinite scroll ===
function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [ref, options.threshold, options.root, options.rootMargin]);

  return isIntersecting;
}

// Usage — trigger load more when sentinel comes into view
function AssetFeed() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(sentinelRef, { threshold: 0.1 });

  useEffect(() => {
    if (isVisible && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isVisible]);

  return (
    <>
      {assets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
      <div ref={sentinelRef} aria-hidden="true" />
    </>
  );
}
```

---

## 6. Error Handling Patterns

```tsx
// === Async error handling in event handlers (not caught by Error Boundary) ===
function UploadButton({ file }: { file: File }) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpload = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await uploadAsset(file);
      toast.success('Upload successful!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      // Don't re-throw — event handlers aren't caught by Error Boundaries
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleUpload} disabled={isLoading} aria-busy={isLoading}>
        {isLoading ? 'Uploading...' : 'Upload'}
      </button>
      {error && <p role="alert" className="error">{error}</p>}
    </>
  );
}
```

---

## Quick-Fire Q&A

| Question | Answer |
|----------|--------|
| `useEffect` vs `useLayoutEffect`? | `useEffect` runs after paint (async). `useLayoutEffect` runs before paint (sync) — use for DOM measurements. |
| When to use `useMemo`? | When computation is expensive AND dependencies are stable. Not every calculation needs it — measure first. |
| Can you call hooks inside conditions? | No — hooks must be called in same order every render (linked list in fiber). Put conditions inside hooks. |
| What is `React.StrictMode`? | Development-only. Double-invokes renders/effects to detect side effects. Does NOT double-invoke in production. |
| `useState` vs `useRef`? | `useState` triggers re-render on change. `useRef` is a mutable box — changing `.current` does NOT trigger re-render. |
| `useId` hook? | Generates stable unique ID consistent between SSR and client — use for `htmlFor` and `aria-labelledby`. |
| `flushSync`? | Force synchronous React update, bypassing batching. Rare — needed when reading DOM after state change. |
| React 19 `use()` hook? | Unwrap a Promise or context in render. With Suspense, can replace `useEffect` data fetching pattern. |
