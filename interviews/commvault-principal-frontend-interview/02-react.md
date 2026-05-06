# React — Internals, Hooks, Performance, Patterns (Detailed)

> Principal level: know the "why" behind every API, the performance cost of every abstraction, and when NOT to use each pattern.

---

## 1. React Reconciliation & Fiber Architecture

**Q: How does React's reconciliation algorithm work? Walk me through Fiber from scratch.**

**Verbal answer:**
> "Before Fiber (React 15 and earlier), reconciliation was a recursive synchronous algorithm — it would start at the root and walk the entire tree in one go, blocking the main thread until done. For large trees this caused janky animations. React Fiber (React 16) rewrote this by making rendering work interruptible. It represents each component as a 'fiber' node — a JavaScript object that contains the component type, props, state, effect list, and links to parent/child/sibling fibers. Work is broken into units that can be paused and resumed using the scheduler. The render phase builds a 'work-in-progress' fiber tree that mirrors the current tree but with new updates applied. The commit phase then synchronously flushes the minimal DOM mutations."

```
Fiber node structure (simplified):
{
  type: FunctionComponent | HostComponent | ...,
  key: null | string,
  stateNode: DOM node | class instance,
  return: parent fiber,
  child: first child fiber,
  sibling: next sibling fiber,
  pendingProps: {},
  memoizedProps: {},
  memoizedState: hooks linked list,
  effectTag: 'Placement' | 'Update' | 'Deletion',
  lanes: priority bitmask,
}
```

**Two-phase rendering:**
```
RENDER PHASE (interruptible, async-friendly):
  - Calls render/function body
  - Diffs new vdom vs current fiber tree
  - Builds work-in-progress fiber tree
  - Marks effects (insertions, updates, deletions)
  - Can be paused, abandoned, restarted
  - PURE — no side effects allowed here

COMMIT PHASE (synchronous, uninterruptible):
  - BeforeMutation: calls getSnapshotBeforeUpdate
  - Mutation: applies DOM changes (insertions, updates, deletions)
  - Layout: runs useLayoutEffect, componentDidMount/Update
  - After browser paint: runs useEffect
```

**Why Strict Mode double-invokes render:**
> Strict Mode calls render functions twice (in development only) to detect side effects accidentally placed in render. Since render phase is interruptible, it can theoretically run multiple times — side effects there would cause bugs.

**Reconciliation algorithm (diffing rules):**
1. Elements of different types → tear down old, build new from scratch
2. Same type → update props; recurse into children
3. Lists with `key` → match by key for minimal mutations

```jsx
// Without key — React re-renders ALL items if list changes
<ul>{items.map(item => <li>{item.name}</li>)}</ul>

// With key — React can identify which item moved/added/removed
<ul>{items.map(item => <li key={item.id}>{item.name}</li>)}</ul>

// BAD KEY: index — breaks for sorted/filtered lists
// React thinks item 0 is "the same" even after reordering
<ul>{items.map((item, i) => <li key={i}>{item.name}</li>)}</ul>
```

---

## 2. React 18 Concurrent Features — Deep Dive

**Q: What is Concurrent Mode? Explain useTransition, useDeferredValue, and Suspense with real use cases.**

**Verbal answer:**
> "Concurrent rendering doesn't mean multi-threading. It means React can work on multiple versions of the UI simultaneously — a 'current' committed version shown to the user, and an 'in-progress' version being prepared. If something more urgent arrives (like user input), React can abandon the in-progress work, handle the urgent update, and resume. This is what makes React 18's automatic batching and the Transition APIs possible."

```jsx
// --- useTransition: mark state updates as non-urgent ---
function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleInput = (e) => {
    const value = e.target.value;

    // URGENT: keep input responsive — always runs immediately
    setQuery(value);

    // NON-URGENT: search results can render when the browser is free
    startTransition(() => {
      setResults(performHeavySearch(value)); // can be interrupted by user typing
    });
  };

  return (
    <>
      <input value={query} onChange={handleInput} />
      {isPending && <LoadingSpinner />}
      <ResultsList results={results} />
    </>
  );
}

// WHY THIS MATTERS: Without startTransition, every keystroke triggers
// a full synchronous re-render of <ResultsList> which could be 10,000 items.
// With startTransition, React can re-render the input immediately, keep it
// responding to keystrokes, and batch/delay the expensive results render.

// --- useDeferredValue: when you receive value as a prop, not own the setter ---
function ParentThatOwnsSetter({ onSearch }) {
  const [query, setQuery] = useState('');
  return <ChildComponent query={query} onChange={setQuery} />;
}

function ChildComponent({ query, onChange }) {
  // Can't use useTransition here — we don't own the setter
  const deferredQuery = useDeferredValue(query);
  // deferredQuery lags behind query during high-priority renders
  // Component re-renders twice: once with old deferredQuery (snappy), once with new

  const isStale = query !== deferredQuery; // useful for showing loading state

  return (
    <>
      <input value={query} onChange={e => onChange(e.target.value)} />
      <div style={{ opacity: isStale ? 0.6 : 1 }}>
        <ExpensiveList query={deferredQuery} />
      </div>
    </>
  );
}
```

**Suspense with data fetching (React 18+):**
```jsx
// Suspense boundary — shows fallback while any descendant is "suspended"
function Dashboard() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<DashboardSkeleton />}>
        <BackupStatusWidget />    {/* fetches data, can suspend */}
        <RecentJobsWidget />      {/* fetches data, can suspend */}
      </Suspense>
    </ErrorBoundary>
  );
}

// Component that suspends using React Query (uses Suspense mode)
function BackupStatusWidget() {
  // suspense: true — throws a Promise if data not ready (Suspense catches it)
  const { data } = useSuspenseQuery({
    queryKey: ['backup-status'],
    queryFn: fetchBackupStatus,
  });
  return <StatusCard status={data} />; // guaranteed to have data here
}
```

---

## 3. Hooks — Complete Deep Dive

**Q: Explain the rules of hooks and WHY they are rules (not arbitrary).**

**Verbal answer:**
> "Hooks are stored as a linked list on the fiber node. On mount, React creates the list. On every re-render, it traverses the SAME list in the same order. If you call a hook conditionally, the list gets out of sync — React reads the wrong state for the wrong hook. That's why the rules exist: they're a guarantee that the list order is stable."

```js
// WRONG — conditional hook
function Component({ isLoggedIn }) {
  if (isLoggedIn) {
    const [user, setUser] = useState(null); // ❌ conditional hook
  }
  const [count, setCount] = useState(0);
}
// On first render (isLoggedIn=true):  hooks = [useState(null), useState(0)]
// On re-render (isLoggedIn=false): hooks = [useState(0)]
// React reads 'count' as 'user' → CRASH or silent bug

// RIGHT — condition inside the hook
function Component({ isLoggedIn }) {
  const [user, setUser] = useState(null);   // always called
  const [count, setCount] = useState(0);    // always called
  useEffect(() => {
    if (isLoggedIn) fetchUser().then(setUser); // condition inside
  }, [isLoggedIn]);
}
```

**useState — batching behavior:**
```jsx
// React 18: ALL setState calls are batched (even in async callbacks)
async function handleClick() {
  setLoading(true);
  const data = await fetch('/api/data');
  setData(data);
  setLoading(false);
  // ONE re-render, not three — React 18 auto-batches async updates
}

// React 17 and earlier: only batches synchronous React event handlers
// async callbacks caused individual re-renders per setState

// Force immediate update (React 18 escape hatch)
import { flushSync } from 'react-dom';
flushSync(() => setCount(1)); // DOM updated synchronously after this
flushSync(() => setColor('red'));
```

**useEffect — dependency array pitfalls:**
```jsx
// PROBLEM: object/function created in render is a new reference each time
function Component({ userId }) {
  const config = { headers: { 'X-User': userId } }; // new object every render

  useEffect(() => {
    fetch('/api/data', config); // effect re-runs every render (config always "changed")
  }, [config]); // ❌ referential equality fails

  // FIX 1: include only primitives
  useEffect(() => {
    fetch('/api/data', { headers: { 'X-User': userId } });
  }, [userId]); // ✅ string — stable identity

  // FIX 2: useMemo for objects
  const config = useMemo(() => ({ headers: { 'X-User': userId } }), [userId]);
  useEffect(() => { fetch('/api/data', config); }, [config]); // ✅
}

// PROBLEM: stale closure
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCount(count + 1); // ❌ 'count' is stale — always 0
    }, 1000);
    return () => clearInterval(id);
  }, []); // empty deps — closure captures initial count=0 forever

  // FIX: functional update — don't read count from closure
  useEffect(() => {
    const id = setInterval(() => {
      setCount(c => c + 1); // ✅ always uses latest count
    }, 1000);
    return () => clearInterval(id);
  }, []);
}
```

**useReducer — when to prefer over useState:**
```tsx
// Good for: complex state with multiple sub-values, state transitions that depend on previous state
type JobState = {
  jobs: Job[];
  selected: string[];
  filter: FilterConfig;
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Job[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'TOGGLE_SELECT'; id: string }
  | { type: 'SET_FILTER'; filter: FilterConfig };

function jobReducer(state: JobState, action: Action): JobState {
  switch (action.type) {
    case 'FETCH_START': return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS': return { ...state, loading: false, jobs: action.payload };
    case 'FETCH_ERROR': return { ...state, loading: false, error: action.payload };
    case 'TOGGLE_SELECT':
      const isSelected = state.selected.includes(action.id);
      return {
        ...state,
        selected: isSelected
          ? state.selected.filter(id => id !== action.id)
          : [...state.selected, action.id],
      };
    default: return state;
  }
}
```

---

## 4. Performance Optimization — Complete Toolkit

**Q: Walk me through every performance optimization you'd apply to a React dashboard with 10,000 items.**

**Verbal answer:**
> "I approach React performance in layers. First, measure — don't optimize blindly. Use React DevTools Profiler to find what's actually slow. Then address in order: unnecessary re-renders, expensive renders, and finally load time. Most performance issues are 'why did this render?' not 'why is this render slow?'."

```jsx
// --- Layer 1: Prevent unnecessary re-renders ---

// React.memo — shallow props comparison
const JobRow = React.memo(
  ({ job, onSelect, onRetry }: JobRowProps) => {
    console.log('render'); // should only render when job data changes
    return (
      <tr>
        <td>{job.clientName}</td>
        <td>{job.status}</td>
        <td>
          <button onClick={() => onSelect(job.id)}>Select</button>
          <button onClick={() => onRetry(job.id)}>Retry</button>
        </td>
      </tr>
    );
  },
  // Custom comparator — only re-render if relevant fields change
  (prev, next) =>
    prev.job.id === next.job.id &&
    prev.job.status === next.job.status &&
    prev.job.progress === next.job.progress
);

// useCallback — stable function reference so JobRow doesn't re-render on parent re-render
const handleSelect = useCallback((id: string) => {
  dispatch({ type: 'TOGGLE_SELECT', id });
}, [dispatch]); // dispatch from useReducer is stable

// useMemo — expensive derivation
const filteredJobs = useMemo(() =>
  jobs
    .filter(j => j.status === activeFilter || activeFilter === 'all')
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
  [jobs, activeFilter]
);

// --- Layer 2: Virtualization for large lists ---
import { VariableSizeList } from 'react-window';

const ROW_HEIGHTS = { compact: 40, expanded: 120 };

function JobList({ jobs }: { jobs: Job[] }) {
  const listRef = useRef<VariableSizeList>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const getItemSize = (index: number) =>
    expandedIds.has(jobs[index].id) ? ROW_HEIGHTS.expanded : ROW_HEIGHTS.compact;

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      listRef.current?.resetAfterIndex(jobs.findIndex(j => j.id === id));
      return next;
    });
  }, [jobs]);

  return (
    <AutoSizer>
      {({ height, width }) => (
        <VariableSizeList
          ref={listRef}
          height={height}
          width={width}
          itemCount={jobs.length}
          itemSize={getItemSize}
          itemData={{ jobs, expandedIds, onToggle: toggleExpand }}
        >
          {JobRowRenderer}
        </VariableSizeList>
      )}
    </AutoSizer>
  );
}

// --- Layer 3: Context optimization (common re-render source) ---

// BAD: all consumers re-render when ANY part of context changes
const AppContext = createContext({ user: null, theme: 'light', jobs: [] });

// GOOD: split by update frequency
const UserContext = createContext<User | null>(null);
const ThemeContext = createContext<Theme>('light');
const JobsContext = createContext<Job[]>([]);

// GOOD alternative: Zustand with selectors (only re-renders on subscribed slice)
const useJobsStore = create<JobStore>((set) => ({
  jobs: [],
  filter: 'all',
  setFilter: (filter) => set({ filter }),
  setJobs: (jobs) => set({ jobs }),
}));

// Only re-renders when filter changes, not when jobs array changes
const filter = useJobsStore(state => state.filter);
const setFilter = useJobsStore(state => state.setFilter);
```

**React DevTools Profiler workflow:**
```
1. Open React DevTools → Profiler tab
2. Click Record
3. Perform the slow interaction
4. Stop recording
5. Flame chart: tall bars = slow; wide bars = re-renders many children
6. "Why did this render?" button → shows which prop/state changed
7. Look for grey bars = renders that could be memoized away
```

---

## 5. State Management Architecture

**Q: You have a React app with complex server + client state. How do you architect state management?**

**Verbal answer:**
> "The first thing I do is separate server state from client state. They have fundamentally different concerns. Server state is async, needs caching, can go stale, needs refetching. Client state is synchronous, owned by the app, never stale. Mixing them in Redux creates a lot of unnecessary boilerplate. I use React Query or TanStack Query for all server state — it handles caching, deduplication, background refetch, optimistic updates. Then for client state, I choose based on complexity: Context for low-frequency globals, Zustand for medium complexity with performance needs."

```tsx
// --- React Query: complete server state setup ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,      // data is fresh for 30s — no background refetch
      gcTime: 5 * 60_000,     // keep in cache for 5min after unmount
      retry: 2,               // retry failed requests twice
      refetchOnWindowFocus: true,  // refresh when user returns to tab
    },
  },
});

// Query with transformation and caching
function useBackupJobs(filter: JobFilter) {
  return useQuery({
    queryKey: ['jobs', filter],        // cache key — different filters = different cache entries
    queryFn: () => fetchJobs(filter),
    select: (data) => ({              // transform before returning (doesn't affect cache)
      jobs: data.jobs,
      totalCount: data.total,
      failedCount: data.jobs.filter(j => j.status === 'failed').length,
    }),
    placeholderData: keepPreviousData, // show previous results while fetching new filter
  });
}

// Mutation with optimistic updates
function useRetryJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => retryJob(jobId),
    onMutate: async (jobId) => {
      // Cancel outgoing refetches (avoid overwriting optimistic update)
      await queryClient.cancelQueries({ queryKey: ['jobs'] });

      // Snapshot current state for rollback
      const previous = queryClient.getQueryData(['jobs']);

      // Optimistically update
      queryClient.setQueryData(['jobs'], (old: JobList) => ({
        ...old,
        jobs: old.jobs.map(j =>
          j.id === jobId ? { ...j, status: 'queued', error: null } : j
        ),
      }));

      return { previous }; // passed to onError as context
    },
    onError: (err, jobId, context) => {
      // Rollback optimistic update on failure
      queryClient.setQueryData(['jobs'], context?.previous);
      toast.error(`Failed to retry job: ${err.message}`);
    },
    onSettled: () => {
      // Refetch to sync with server (optimistic update may differ from actual)
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}
```

---

## 6. Custom Hooks — Advanced Patterns

**Q: Design custom hooks for: (1) form handling, (2) WebSocket subscription, (3) media query.**

```tsx
// --- 1: useForm — controlled form with validation ---
function useForm<T extends Record<string, any>>(
  initialValues: T,
  validate: (values: T) => Partial<Record<keyof T, string>>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const handleChange = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  }, [errors]);

  const handleBlur = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const fieldErrors = validate({ ...values });
    setErrors(prev => ({ ...prev, [name]: fieldErrors[name] }));
  }, [values, validate]);

  const handleSubmit = (onSubmit: (values: T) => void) => (e: React.FormEvent) => {
    e.preventDefault();
    const allErrors = validate(values);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setTouched(Object.fromEntries(Object.keys(values).map(k => [k, true])) as any);
      return;
    }
    onSubmit(values);
  };

  return { values, errors, touched, handleChange, handleBlur, handleSubmit };
}

// --- 2: useWebSocket — auto-reconnect WebSocket ---
function useWebSocket<T>(url: string, options = { reconnectDelay: 3000 }) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setStatus('open');
    ws.onmessage = (e) => setData(JSON.parse(e.data));
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      setStatus('closed');
      // Auto-reconnect after delay
      reconnectTimer.current = setTimeout(connect, options.reconnectDelay);
    };
  }, [url, options.reconnectDelay]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { data, status, send };
}

// --- 3: useMediaQuery ---
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches // synchronous initial value (no flicker)
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches); // sync in case query changed
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Usage
const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
```

---

## 7. Error Boundaries — Complete Implementation

**Q: Implement a full production-ready Error Boundary with retry and Sentry integration.**

```tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorCount: number; // track retry attempts
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, errorCount: 0 };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Called during render phase (synchronous) — must be pure
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Called after commit phase — safe for side effects
    console.error('Uncaught error:', error, info.componentStack);
    this.props.onError?.(error, info);

    // Sentry integration
    Sentry.withScope(scope => {
      scope.setExtra('componentStack', info.componentStack);
      scope.setTag('errorBoundary', 'true');
      Sentry.captureException(error);
    });
  }

  retry = () => {
    this.setState(prev => ({
      error: null,
      errorCount: prev.errorCount + 1,
    }));
    // 'errorCount' as key on children forces React to remount them
  };

  render() {
    const { error, errorCount } = this.state;
    const { children, fallback: Fallback } = this.props;

    if (error) {
      if (Fallback) return <Fallback error={error} retry={this.retry} />;
      return (
        <div role="alert">
          <h2>Something went wrong</h2>
          <pre>{error.message}</pre>
          <button onClick={this.retry}>Try again</button>
        </div>
      );
    }

    // Key on children forces remount on retry — clears stale component state
    return (
      <React.Fragment key={errorCount}>
        {children}
      </React.Fragment>
    );
  }
}

// Usage
<ErrorBoundary
  fallback={({ error, retry }) => (
    <ErrorCard message={error.message} onRetry={retry} />
  )}
  onError={(err, info) => analyticsTrack('component_error', { err, stack: info.componentStack })}
>
  <BackupDashboard />
</ErrorBoundary>
```

---

## 8. React with TypeScript — Advanced Patterns

```tsx
// --- Discriminated union for async state (exhaustive) ---
type AsyncState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

function JobStatus({ state }: { state: AsyncState<Job[]> }) {
  switch (state.status) {
    case 'idle': return <EmptyState />;
    case 'loading': return <Skeleton />;
    case 'success': return <JobTable jobs={state.data} />;    // data is typed as Job[]
    case 'error': return <ErrorCard error={state.error} />;   // error is typed as Error
    // No default needed — TypeScript knows all cases are covered
  }
}

// --- Polymorphic 'as' component (typed) ---
type PolymorphicProps<C extends React.ElementType, P = {}> = P & {
  as?: C;
} & Omit<React.ComponentPropsWithoutRef<C>, keyof P | 'as'>;

function Text<C extends React.ElementType = 'span'>({
  as,
  children,
  ...rest
}: PolymorphicProps<C, { children: React.ReactNode }>) {
  const Component = as ?? 'span';
  return <Component {...rest}>{children}</Component>;
}

<Text as="h1" className="title">Heading</Text>    // h1 props available
<Text as="a" href="/about">Link</Text>             // anchor props available
<Text>Default span</Text>

// --- Generic data table ---
interface DataTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    header: string;
    render?: (value: T[keyof T], row: T) => React.ReactNode;
  }>;
  getRowKey: (row: T) => string;
}

function DataTable<T>({ data, columns, getRowKey }: DataTableProps<T>) {
  return (
    <table>
      <thead>
        <tr>{columns.map(col => <th key={String(col.key)}>{col.header}</th>)}</tr>
      </thead>
      <tbody>
        {data.map(row => (
          <tr key={getRowKey(row)}>
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
```

---

## 9. Testing React Components

**Q: How do you test React components at different levels?**

```tsx
// --- Unit test: isolated component with RTL ---
import { render, screen, userEvent, waitFor } from '@testing-library/react';

describe('JobRetryButton', () => {
  it('calls onRetry with job id when clicked', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();

    render(<JobRetryButton jobId="job-123" onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(onRetry).toHaveBeenCalledWith('job-123');
  });

  it('shows confirmation dialog for running jobs', async () => {
    const user = userEvent.setup();
    render(<JobRetryButton jobId="job-123" onRetry={jest.fn()} status="running" />);

    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/are you sure/i)).toBeVisible();
  });
});

// --- Integration test: with React Query + MSW ---
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

describe('BackupJobList integration', () => {
  it('displays jobs and handles filter change', async () => {
    server.use(
      http.get('/api/jobs', () =>
        HttpResponse.json({ jobs: mockJobs, total: 5 })
      )
    );

    render(
      <QueryClientProvider client={new QueryClient()}>
        <BackupJobList />
      </QueryClientProvider>
    );

    // Wait for async data
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(6)); // 5 + header

    // Test filter interaction
    await userEvent.click(screen.getByRole('button', { name: /failed/i }));

    server.use(
      http.get('/api/jobs', ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('status')).toBe('failed');
        return HttpResponse.json({ jobs: failedJobs, total: 2 });
      })
    );

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3));
  });
});
```

---

## Quick-Fire Q&A (Detailed)

| Question | Detailed Answer |
|----------|----------------|
| What triggers a re-render? | State change (useState/useReducer), prop change from parent render, context value change, parent re-render (even with same props — unless React.memo). |
| `React.memo` deep comparison? | Shallow by default. Passes custom `areEqual` as 2nd arg for deep. But deep comparison has its own cost — profile first. |
| `useRef` vs `useState`? | `useRef` mutates `.current` without triggering re-render. Use for DOM refs, interval IDs, previous values, and any mutable value that shouldn't drive UI. |
| When does `useEffect` cleanup run? | Before the effect runs again (deps changed) AND when the component unmounts. Order: mount effect → deps change → cleanup → new effect → unmount cleanup. |
| `useId`? | Generates a stable, unique ID that's consistent between SSR and client hydration. Use for accessible `htmlFor`/`aria-labelledby`. |
| `startTransition` vs `setTimeout`? | Both defer work but startTransition is React-aware — React knows the update is non-urgent and can be interrupted. setTimeout just delays scheduling. |
| React 19 new features? | `use()` hook for promises/context, Actions for form mutations, `useOptimistic`, `useFormStatus`, improved Server Components support, ref as prop (no forwardRef needed). |
