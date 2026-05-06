# Frontend System Design — Detailed Answers

> Framework: **RADIO** — Requirements → Architecture → Data model → Interface definition → Optimizations
> Always drive the conversation. State assumptions. Present options with trade-offs before recommending.

---

## How to Approach a System Design Interview

**Opening move (first 2 minutes):**
> "Before I start designing, I want to clarify requirements to make sure I'm solving the right problem. Can I ask a few questions?"

Then ask:
1. Scale — DAU, concurrent users, data volume?
2. Real-time requirements — latency expectations?
3. Platforms — web only, or mobile too?
4. Offline support needed?
5. Authentication model — single tenant or multi-tenant?
6. Accessibility requirements?
7. What does success look like — what metrics matter?

---

## 1. Design a Real-Time Backup Job Dashboard

**The prompt:** Design a UI where IT admins monitor thousands of backup jobs in real-time, filter, search, and take actions (retry, cancel, pause).

---

### R — Requirements

**Functional:**
- View list of all backup jobs with status, progress, size, client name, timestamps
- Real-time status updates — changes visible within 2–5 seconds
- Filter by: status (running/failed/success/queued), date range, client, job type
- Bulk actions: retry all failed, cancel selected
- Drill-down: click job → see full logs, error details
- Export: CSV/JSON of filtered results

**Non-functional:**
- 10,000+ concurrent jobs in the system; 500 concurrent users
- Dashboard must load within 2 seconds (LCP)
- Real-time updates must not block user interactions
- WCAG 2.1 AA accessibility
- Works on 1280px+ screens (IT admin workstation)

---

### A — Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Browser Client                             │
│                                                                   │
│  ┌──────────────┐    ┌───────────────────┐    ┌──────────────┐   │
│  │  React UI     │    │  State Layer       │    │  WS Client   │   │
│  │  (Next.js)    │    │  React Query +     │    │  (auto-      │   │
│  │  Virt. List   │    │  Zustand (UI state)│    │  reconnect)  │   │
│  └──────┬───────┘    └────────┬──────────┘    └──────┬───────┘   │
│         │ render               │ cache update          │ push      │
└─────────┼─────────────────────┼───────────────────────┼──────────┘
          │ HTTP/2 REST          │                       │ WSS
          ▼                      │                       ▼
  ┌───────────────┐              │           ┌───────────────────┐
  │  BFF / API    │              │           │  WebSocket Gateway │
  │  Gateway      │◄─────────────┘           │  (job event stream)│
  │  (Node.js)    │                          └─────────┬─────────┘
  └───────┬───────┘                                    │
          │                                            │ job updates
  ┌───────▼───────────────────────────────────────────▼─────┐
  │               Backend Services                            │
  │  Jobs REST API        Message Broker (Kafka)              │
  │  (pagination,         (job status events published        │
  │   filtering)           by backup engine)                  │
  └─────────────────────────────────────────────────────────┘
```

**Architecture decisions:**
- **Next.js** — SSR for initial page load (fast LCP), client-side after that
- **BFF (Backend for Frontend)** — aggregates multiple microservices, formats data for UI, handles auth
- **WebSocket for real-time** — bidirectional (needed for actions), persistent, lower overhead than polling
- **React Query** — server state management with caching, deduplication, background sync
- **Zustand** — client UI state (selected rows, filter panel open/closed, bulk action queue)
- **react-window** — virtualized rendering for 10,000+ jobs

---

### D — Data Model

```typescript
// Core job entity
interface BackupJob {
  id: string;
  clientName: string;
  clientId: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'paused';
  progress: number;            // 0–100
  startedAt: string;           // ISO 8601
  completedAt: string | null;
  estimatedCompletionAt: string | null;
  sizeBytes: number;
  transferredBytes: number;
  errorCode: string | null;
  errorMessage: string | null;
  type: 'full' | 'incremental' | 'differential' | 'synthetic-full';
  source: { type: 'vm' | 'database' | 'nas' | 'saas'; path: string; };
  retryCount: number;
  tags: string[];
}

// WebSocket event — partial update (don't re-send entire job)
interface JobUpdateEvent {
  type: 'job_status_change' | 'job_progress' | 'job_error';
  jobId: string;
  changes: Partial<BackupJob>;
  timestamp: string;
}

// API paginated response
interface JobListResponse {
  jobs: BackupJob[];
  total: number;
  cursor: string | null;  // cursor-based pagination (better than offset for real-time data)
  filters: AppliedFilters;
}
```

**Why cursor-based pagination over offset:**
> With offset pagination, if a new job is inserted between page 1 and page 2 fetch, you miss a job or see a duplicate. Cursor pagination uses a stable position marker (usually the last item's ID + timestamp) that isn't affected by insertions.

---

### I — Interface Definition

**Component hierarchy:**
```
<DashboardPage>
  <PageHeader title="Backup Jobs" />
  <JobFiltersBar>              ← filter controls (status, date range, search)
    <FilterChips />            ← active filters as dismissible chips
  </JobFiltersBar>
  <JobListToolbar>             ← bulk actions, export, column toggle
    <BulkActionMenu />
    <ExportButton />
  </JobListToolbar>
  <JobListVirtualized>         ← react-window FixedSizeList
    <JobRow />                 ← memoized, re-renders only when own data changes
  </JobListVirtualized>
  <JobDetailDrawer />          ← slide-in panel on row click
    <JobLogViewer />           ← virtualized log lines
    <JobTimeline />            ← event history
  </JobDetailDrawer>
  <StatusAnnouncer />          ← aria-live region for screen readers
</DashboardPage>
```

**Key interaction flows:**

```tsx
// 1. Real-time update — merge WebSocket event into React Query cache
const wsSubscription = useJobWebSocket((event: JobUpdateEvent) => {
  queryClient.setQueryData(
    ['jobs', activeFilter],
    (old: JobListResponse | undefined) => {
      if (!old) return old;
      return {
        ...old,
        jobs: old.jobs.map(job =>
          job.id === event.jobId ? { ...job, ...event.changes } : job
        ),
      };
    }
  );
  // Announce critical changes to screen readers
  if (event.type === 'job_error') {
    announceToScreenReader(`Job ${event.jobId} failed: ${event.changes.errorMessage}`);
  }
});

// 2. Optimistic retry action
const retryMutation = useMutation({
  mutationFn: (jobIds: string[]) => bulkRetryJobs(jobIds),
  onMutate: (jobIds) => {
    const prev = queryClient.getQueryData(['jobs', activeFilter]);
    // Optimistically update status to 'queued'
    queryClient.setQueryData(['jobs', activeFilter], (old: JobListResponse) => ({
      ...old,
      jobs: old.jobs.map(job =>
        jobIds.includes(job.id) ? { ...job, status: 'queued', errorMessage: null } : job
      ),
    }));
    return { prev };
  },
  onError: (_, __, ctx) => {
    queryClient.setQueryData(['jobs', activeFilter], ctx?.prev);
    toast.error('Retry failed. Please try again.');
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
});

// 3. Search with debounce + URL sync
const [searchParams, setSearchParams] = useSearchParams();
const debouncedSetSearch = useMemo(
  () => debounce((q: string) => setSearchParams(p => ({ ...p, q })), 300),
  [setSearchParams]
);
```

---

### O — Optimizations

| Problem | Solution | Impact |
|---------|---------|--------|
| 10,000 rows in DOM | react-window virtualization | From 3s render to 16ms |
| Filter change causes full refetch | Prefetch next likely filter | Perceived instant |
| WebSocket reconnect during poor network | Exponential backoff + polling fallback | Resilience |
| Large initial bundle | Code split job detail drawer | -40KB initial JS |
| Real-time update on focused row | Smooth CSS transition on changed cells | No content jump |
| Too many WS events per second | Client-side event batching (100ms) | Fewer renders |

```js
// Event batching — coalesce rapid job updates
function createUpdateBatcher(applyUpdates: (events: JobUpdateEvent[]) => void) {
  let buffer: JobUpdateEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  return function enqueue(event: JobUpdateEvent) {
    buffer.push(event);
    if (!timer) {
      timer = setTimeout(() => {
        applyUpdates(buffer);
        buffer = [];
        timer = null;
      }, 100); // batch 100ms of events
    }
  };
}
```

---

## 2. Design a Component Library / Design System

**The prompt:** Design a shared component library used by 15 engineering teams across Commvault products.

---

### Key Decisions

**1. Unstyled primitives + design tokens (recommended)**
```
Foundation layer: Radix UI primitives (accessible behavior, no styles)
  ↓
Token layer: Commvault design tokens (color, spacing, typography)
  ↓
Component layer: Styled components (Button, Input, Table, Modal, etc.)
  ↓
Pattern layer: Composed patterns (DataTable, FilterBar, StatusCard)
```

**Why Radix UI as foundation:**
- All WAI-ARIA patterns implemented correctly (dialog, select, tooltip, popover, etc.)
- Zero base styles — you apply your own design
- Actively maintained by WorkOS team
- Each primitive ships independently (tree-shakeable)

```tsx
// Button built on Radix primitives + design tokens
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { cva } from 'class-variance-authority'; // variant management

const buttonVariants = cva(
  // base classes
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-cv-interactive text-white hover:bg-cv-interactive-hover',
        secondary: 'border border-cv-border bg-transparent hover:bg-cv-bg-secondary',
        danger: 'bg-cv-danger text-white hover:bg-red-600',
        ghost: 'hover:bg-cv-bg-secondary',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, isLoading, leftIcon, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={buttonVariants({ variant, size })}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? <Spinner size="sm" aria-hidden /> : leftIcon}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
```

**2. Monorepo package structure:**
```
packages/
  @cv/tokens/         → npm: CSS custom props + JS tokens object
  @cv/icons/          → npm: SVG icon components
  @cv/components/     → npm: React component library
  @cv/hooks/          → npm: shared React hooks
  @cv/utils/          → npm: shared utilities
  
apps/
  storybook/          → component documentation + visual tests
  docs/               → usage documentation site
```

**3. Release and versioning:**
```
Developer changes component
  ↓
Runs: npx changeset (adds .changeset file describing the change)
  ↓
PR merged to main
  ↓
GitHub Action: npx changeset version (bumps package.json versions)
  ↓
GitHub Action: npm publish to internal registry
  ↓
Dependabot PRs raised in consumer repos
```

---

## 3. Design Micro-Frontend Architecture

**The prompt:** 8 teams need to ship independently. Design the frontend architecture.

---

### When Micro-Frontends Make Sense
✅ Multiple large teams with different deployment cadences
✅ Different parts of the app have very different tech requirements
✅ You need to migrate incrementally from a legacy app

❌ Small team (< 5 engineers) — overhead not worth it
❌ Tight UI coupling between features
❌ MVP stage

### Module Federation (Webpack 5) — Detailed Setup

```
Shell App (host)
├── route: /backup  → BackupModule remote (Team A)
├── route: /recovery → RecoveryModule remote (Team B)
├── route: /reports  → ReportsModule remote (Team C)
└── route: /settings → SettingsModule remote (Team D)

Each remote:
- Has own CI/CD pipeline
- Deploys to own CDN path
- Exposes only its public surface via remoteEntry.js
```

```js
// Shell app — webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    // Runtime URL — can be env var, feature flag, or API-driven
    backup: `backup@${process.env.BACKUP_REMOTE_URL}/remoteEntry.js`,
    recovery: `recovery@${process.env.RECOVERY_REMOTE_URL}/remoteEntry.js`,
  },
  shared: {
    react: { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
    'react-query': { singleton: true }, // ONE query client
    '@cv/components': { singleton: true }, // ONE design system
  },
});

// Backup remote — webpack.config.js
new ModuleFederationPlugin({
  name: 'backup',
  filename: 'remoteEntry.js',
  exposes: {
    './BackupDashboard': './src/BackupDashboard', // ONLY expose public API
    './BackupJobDetail': './src/BackupJobDetail',
    // Don't expose: internals, utils, types
  },
  shared: { /* same shared config */ },
});
```

```tsx
// Shell app — lazy loading remotes
const BackupDashboard = lazy(() => import('backup/BackupDashboard'));
const RecoveryModule = lazy(() => import('recovery/RecoveryDashboard'));

function App() {
  return (
    <Router>
      <Suspense fallback={<ModuleLoadingSkeleton />}>
        <ErrorBoundary fallback={<RemoteLoadError />}>
          <Routes>
            <Route path="/backup/*" element={<BackupDashboard />} />
            <Route path="/recovery/*" element={<RecoveryModule />} />
          </Routes>
        </ErrorBoundary>
      </Suspense>
    </Router>
  );
}
```

**Cross-module communication patterns:**
```ts
// Pattern 1: Custom events (decoupled)
// Module A emits
window.dispatchEvent(new CustomEvent('cv:job-completed', {
  detail: { jobId: '123', status: 'success' }
}));
// Module B listens
window.addEventListener('cv:job-completed', (e: CustomEvent) => {
  refreshReportsCache();
});

// Pattern 2: Shared Zustand store (in @cv/hooks package)
// Both modules import the SAME singleton store (shared via Module Federation)
const useGlobalNotifications = create<NotificationStore>(...);

// Pattern 3: URL/query params (for navigation state)
navigate('/reports?jobId=123'); // recovery module navigates to reports module
```

---

## 4. Design a Frontend for Real-Time Log Viewer

**The prompt:** Users need to view live logs from running backup jobs — potentially thousands of lines per second.

```
Key challenges:
1. DOM can't handle millions of nodes
2. Streaming data needs backpressure handling
3. Searching through live data
4. User may want to pause live scroll to read
```

```tsx
function LiveLogViewer({ jobId }: { jobId: string }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef<VariableSizeList>(null);
  const pendingBuffer = useRef<LogLine[]>([]);

  // Batch incoming log lines to avoid excessive re-renders
  useEffect(() => {
    const eventSource = new EventSource(`/api/jobs/${jobId}/logs/stream`);

    const flushBuffer = () => {
      if (pendingBuffer.current.length === 0) return;
      const newLines = pendingBuffer.current.splice(0); // drain buffer

      setLines(prev => {
        const updated = [...prev, ...newLines];
        // Keep max 50,000 lines in memory — drop oldest
        return updated.length > 50_000 ? updated.slice(-50_000) : updated;
      });

      // Auto-scroll to bottom if not paused
      if (!isPaused) {
        listRef.current?.scrollToItem(lines.length - 1, 'end');
      }
    };

    // Buffer incoming events, flush every 100ms
    const flushInterval = setInterval(flushBuffer, 100);

    eventSource.addEventListener('log', (e) => {
      pendingBuffer.current.push(JSON.parse(e.data));
    });

    return () => {
      eventSource.close();
      clearInterval(flushInterval);
    };
  }, [jobId, isPaused]);

  // Filter by search — useDeferredValue keeps input responsive
  const deferredSearch = useDeferredValue(searchQuery);
  const filteredLines = useMemo(() =>
    deferredSearch
      ? lines.filter(l => l.message.toLowerCase().includes(deferredSearch.toLowerCase()))
      : lines,
    [lines, deferredSearch]
  );

  return (
    <div className="log-viewer">
      <LogViewerToolbar
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(p => !p)}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        lineCount={filteredLines.length}
      />
      <AutoSizer>
        {({ height, width }) => (
          <VariableSizeList
            ref={listRef}
            height={height - 48} // minus toolbar
            width={width}
            itemCount={filteredLines.length}
            itemSize={(i) => getLogLineHeight(filteredLines[i])}
            itemData={filteredLines}
          >
            {LogLineRenderer}
          </VariableSizeList>
        )}
      </AutoSizer>
    </div>
  );
}
```

---

## 5. Performance Optimization Deep Dive

**Q: A dashboard takes 8 seconds to load. Walk me through your investigation and fix process.**

**Verbal answer:**
> "I approach this systematically, not with guesses. First I measure — run Lighthouse, look at the waterfall in DevTools Network tab, check the Performance tab for long tasks. The 8 seconds will tell a story: is it TTFB (server slow), is it JS parse time (bundle too large), is it render-blocking CSS, or is it render time (too much DOM work)?"

**Step 1: Diagnose with Lighthouse + Chrome DevTools**
```
Common findings and fixes:

1. Large JS bundle (>500KB)
   → Code split with React.lazy()
   → Analyze with webpack-bundle-analyzer — find duplicates, huge deps
   → Replace moment.js → date-fns (tree-shakeable)
   → Replace lodash → specific lodash/{function} imports

2. Render-blocking resources
   → Move non-critical CSS to async: <link rel="preload" as="style">
   → Defer non-critical JS: <script defer>
   → Inline critical CSS in <head>

3. Many API calls in sequence (waterfall)
   → Move data fetching to loader (Next.js, React Router v6)
   → Parallel fetching with Promise.all
   → API aggregation in BFF layer

4. Large DOM (>1500 nodes)
   → Virtualization with react-window
   → Pagination

5. Unoptimized images
   → WebP format, responsive sizes, lazy loading
   → next/image or <img loading="lazy" decoding="async">
```

**Step 2: Implement and verify**
```js
// Bundle analysis
// package.json
"analyze": "ANALYZE=true next build"

// webpack.config.js
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
plugins: [new BundleAnalyzerPlugin()];

// Measure before and after with web-vitals in production
import { onLCP, onINP, onCLS, onTTFB, onFCP } from 'web-vitals';
const sendMetric = ({ name, value }) => {
  // Send to analytics — track percentile improvements (p75, p95)
  analytics.track('web_vital', { name, value, page: location.pathname });
};
[onLCP, onINP, onCLS, onTTFB, onFCP].forEach(fn => fn(sendMetric));
```

---

## RADIO Framework — Cheat Sheet for Any Design Problem

```
R — Requirements (5–7 min)
  Functional: what must it do?
  Non-functional: scale, latency, offline, a11y, i18n?
  Constraints: existing tech stack, team size?

A — Architecture (10 min)
  Rendering strategy: SSR / CSR / SSG / ISR — and why?
  Real-time: WebSocket / SSE / polling — trade-offs?
  State: server state (React Query) + client state (Zustand/Context)?
  Module boundary: monolith vs micro-frontends?

D — Data Model (5 min)
  Key entities and their shapes
  API contract (REST vs GraphQL)
  Pagination strategy (offset vs cursor)
  Caching and invalidation

I — Interface (10 min)
  Component hierarchy (draw it)
  Key interactions — happy path + error + loading + empty states
  Accessibility hooks (live regions, focus management)

O — Optimizations (5 min)
  Virtualization for large lists
  Code splitting for routes/features
  Memoization for expensive computation
  CDN / edge caching for static assets
  Bundle size budget (JS < 200KB gzipped for initial load)
```
